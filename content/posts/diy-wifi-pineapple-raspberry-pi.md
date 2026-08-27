+++
title = "Building a DIY WiFi Pineapple Out of a Raspberry Pi"
date = 2026-08-27
+++

The WiFi Pineapple is Hak5's commercial rogue-AP platform -- a small
box with two radios and a web dashboard for running evil-twin APs,
Karma/MANA attacks, deauth, and captive portals. Almost all of that
is just Linux plumbing: `hostapd`, `dnsmasq`, `iptables`, and the
aircrack-ng suite, wired together. A Raspberry Pi with the right USB
WiFi adapter reproduces the core functionality for the cost of the
hardware, and building it by hand instead of flashing someone else's
firmware means you actually understand what each piece is doing.

Everything below is for testing your own network, an isolated lab, or
an engagement with signed, scoped authorization. A rogue AP that
intercepts or manipulates traffic from devices that aren't yours --
or people who haven't agreed to it -- crosses into wiretapping and
CFAA territory immediately. This is the same category as lockpicks:
legal to own and practice with, illegal to point at a lock that isn't
yours.

## What you need

- **Raspberry Pi 4B or 5** (2GB+). Running `hostapd`, `dnsmasq`, and
  packet capture at once wants the extra headroom over a Pi Zero.
- **A USB WiFi adapter with monitor mode and packet injection
  support.** The Pi's onboard radio doesn't do injection -- this is
  non-negotiable. Atheros AR9271 and Realtek RTL8812AU chipsets
  (Alfa AWUS036NHA, AWUS036ACH) are the known-good picks, same as in
  the [aircrack-ng post](/posts/aircrack-ng-wpa2-handshake).
- A second radio -- either the Pi's built-in WiFi or a second USB
  adapter -- so one interface can serve the rogue AP while the other
  stays free for scanning or injection.
- microSD card (32GB+), a powered USB hub if you're running a
  high-gain adapter (they brown out the Pi's ports), and a battery
  pack for field use.

## Flashing and base setup

Raspberry Pi OS Lite (64-bit) or Kali ARM both work; Kali ships most
of the wireless tooling preinstalled. Enable SSH before first boot so
you can work headless, then:

```
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y hostapd dnsmasq aircrack-ng iptables-persistent \
                     dhcpcd5 bridge-utils tcpdump macchanger
```

Confirm the USB adapter actually supports monitor mode:

```
sudo airmon-ng
iw list | grep -A 10 "Supported interface modes"
```

## Standing up the rogue AP

Identify interfaces with `iwconfig` -- typically `wlan0` (onboard)
and `wlan1` (USB adapter) -- then stop the services so you can
hand-configure them:

```
sudo systemctl stop hostapd dnsmasq
sudo rfkill unblock wifi
```

`/etc/hostapd/hostapd.conf`:

```
interface=wlan1
driver=nl80211
ssid=Free_Public_WiFi
hw_mode=g
channel=6
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
```

```
sudo sed -i 's/#DAEMON_CONF=.*/DAEMON_CONF="\/etc\/hostapd\/hostapd.conf"/' /etc/default/hostapd
```

`/etc/dnsmasq.conf`:

```
interface=wlan1
dhcp-range=10.0.0.10,10.0.0.250,255.255.255.0,12h
dhcp-option=3,10.0.0.1
dhcp-option=6,10.0.0.1
server=8.8.8.8
log-queries
log-dhcp
```

```
sudo ip addr add 10.0.0.1/24 dev wlan1
```

## Routing it to the internet

If you want connected clients to get real internet (useful for
credential-harvesting or MITM audits where a dead-end AP would tip
off the target), NAT `wlan1` out through `wlan0`:

```
sudo sysctl -w net.ipv4.ip_forward=1
sudo iptables -t nat -A POSTROUTING -o wlan0 -j MASQUERADE
sudo iptables -A FORWARD -i wlan0 -o wlan1 -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i wlan1 -o wlan0 -j ACCEPT
sudo netfilter-persistent save
```

Then bring the AP up:

```
sudo systemctl unmask hostapd
sudo systemctl start hostapd dnsmasq
```

At this point `wlan1` is an open AP handing out DHCP leases and
routing clients through `wlan0` -- the evil-twin core of what a
Pineapple does out of the box.

## Layering on the actual Pineapple-style attacks

- **Karma/MANA** (auto-responding to client probe requests so nearby
  devices connect without a prompt) -- the [mana
  toolkit](https://github.com/sensepost/mana) is the standard
  implementation.
- **Handshake capture** for auditing your own network's passphrase
  strength -- `airodump-ng` and `aireplay-ng`, covered in detail in
  the [aircrack-ng post](/posts/aircrack-ng-wpa2-handshake).
- **Captive-portal credential audits** -- `wifiphisher` automates a
  fake login page; legitimate use here is limited to authorized
  phishing-awareness testing with a signed scope.
- **A web dashboard instead of raw config files** --
  [FruityWiFi](https://github.com/xtr4nge/FruityWiFi) is an
  open-source project explicitly modeled on the Pineapple's plugin
  architecture, and drops on top of everything above.

## Where this goes wrong in practice

- **The onboard radio can't inject.** The single most common failure
  mode for people following Pineapple tutorials on a Pi is trying to
  do all of this with the built-in WiFi chip. It'll join networks
  fine and it'll even host an AP, but it silently can't do
  monitor-mode packet injection -- you need the external adapter for
  anything beyond serving a plain rogue AP.
- **Signal bleed outside the intended range.** An open "Free_Public_
  WiFi" SSID doesn't respect your test boundary -- it advertises to
  every device in radio range, not just the ones you meant to test.
  Testing in a Faraday bag or a shielded room is the only way to keep
  an authorized test from touching networks and devices it wasn't
  scoped for.
- **DHCP/DNS collisions on a live network.** Running `dnsmasq` on a
  network segment that already has a DHCP server produces a race
  between the two -- clients get inconsistent leases and legitimate
  users notice connectivity breaking. This is a real risk during an
  engagement and a good way to turn an authorized test into an
  unplanned outage.
- **Karma-style auto-connect is exactly what modern OSes try to
  block.** iOS, Android, and recent Windows/macOS builds increasingly
  randomize MAC addresses and refuse to auto-join open networks by
  SSID alone, which is why Karma-era attacks work less reliably than
  they did five years ago -- a captive portal with a plausible pretext
  does more work now than the auto-connect trick by itself.
- **No authorization, no defense.** None of the mitigations above
  change the legal exposure of running this against a network or
  people who haven't consented. Written scope, a defined time window,
  and logging (`tcpdump -w capture.pcap` for the whole session) are
  what separates a pentest from a crime with the exact same packet
  capture.
