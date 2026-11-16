+++
title = "Getting Started with bettercap: A Home-Lab Tutorial"
date = 2026-10-04
+++

[bettercap](https://www.bettercap.org/) is an open-source network reconnaissance
and security-testing framework written in Go. It bundles tools for scanning and
attacking Ethernet LANs, Wi-Fi networks, Bluetooth Low Energy devices, and
wireless HID devices into one interactive console. This tutorial walks you
through setting up a safe lab and using bettercap's core features: wired recon, a
man-in-the-middle attack, Wi-Fi scanning, and WPA handshake capture. Every
exercise runs against hardware and networks you own, inside your own home lab.
And to keep the workflow fast, we'll drive bettercap through
[bettercaptui](https://github.com/NPCmillionaire/bettercaptui), a terminal
frontend that puts bettercap's modules behind a live, keyboard-driven interface.

## Before you start: stay legal

bettercap's recon features are harmless, but its attack features (ARP spoofing,
DNS spoofing, deauthentication, handshake capture) are only legal against
networks and devices you own or have explicit written permission to test.
Running them against someone else's network is a crime in most jurisdictions,
including under the U.S. Computer Fraud and Abuse Act, regardless of intent.

This tutorial keeps everything inside a self-contained lab:

- The wired exercises target a VM you created on your own machine.
- The Wi-Fi exercises target a spare access point you set up yourself (an old
  router or a phone hotspot works).

Don't point any attack module at your household's main network or any device you
don't control. A deauth, for example, will knock real devices offline.

## How bettercap is organized

bettercap is a single console that loads **modules**, each owning a namespace of
commands. You turn a module on, configure it with `set`, and read its output.
The ones this tutorial uses:

| Module      | Namespace               | What it does                                    |
| ----------- | ----------------------- | ----------------------------------------------- |
| Net recon   | `net.*`                 | Discover and probe hosts on the LAN             |
| Sniffer     | `net.sniff`             | Capture and parse packets                       |
| ARP spoofer | `arp.spoof`             | Redirect a target's traffic through you         |
| DNS spoofer | `dns.spoof`             | Answer DNS queries with addresses you choose    |
| Wi-Fi       | `wifi.*`                | Scan APs and clients, deauth, capture handshakes|
| Web UI      | `api.rest`, `http.server` | Serve the browser dashboard                   |

Two conventions make the console quick to use. Commands separated by `;` run in
sequence, so you can configure and launch in one line. And a **caplet** is just a
`.cap` file of these commands that bettercap replays, which is how you save a
setup you use often. Tab completion works for every command.

## Driving bettercap with bettercaptui

The raw console is powerful but spartan: you type a command, read a wall of text,
type another. [bettercaptui](https://github.com/NPCmillionaire/bettercaptui)
wraps that same session in a terminal UI, so the things you'd otherwise juggle by
hand happen in panels that update on their own:

- Live host and AP tables that refresh as recon runs, instead of re-typing
  `net.show` or `wifi.show`.
- Modules you toggle with a keystroke rather than `module on` / `module off`.
- The event and capture stream in its own pane, so a handshake or a sniffed
  credential doesn't scroll away.

It talks to bettercap over the same REST API the web UI uses, so everything in
this tutorial works identically whether you type the commands or trigger them
from the TUI. Install it from the repo:

```bash
git clone https://github.com/NPCmillionaire/bettercaptui
cd bettercaptui
# follow the README to build and run
```

For each exercise below, the console commands are shown so you understand what's
happening underneath; in bettercaptui you'll find the same actions on screen.
Start bettercap's API, then point the TUI at it.

## Setting up the lab

**Your machine.** Kali or Parrot OS ship bettercap and the supporting tools, so
they're the easiest starting point. On Arch it's a single package (`sudo pacman
-S bettercap`). On Debian/Ubuntu: `sudo apt install bettercap`.

**A target for the wired exercises.** Create one VM (any Linux is fine) on the
same host-only or NAT network as your bettercap machine. This is the "victim"
you'll safely spoof. Note its IP.

**Hardware for the Wi-Fi exercises.** You need a wireless adapter that supports
**monitor mode** and packet injection. The built-in card on most laptops does
not. Common lab choices use the Atheros AR9271 or Ralink RT3070 chipsets. Confirm
your interface name with `iw dev` (often `wlan0`).

**A target AP for the Wi-Fi exercises.** Set up a spare router or a phone hotspot
with a WPA2 password you choose. This is the only Wi-Fi network you'll attack.

Verify the install before moving on:

```bash
sudo bettercap -version
```

## Starting the console

Launch bettercap on your LAN interface (use `ip addr` to find it, often `eth0` or
`enp0s3`):

```bash
sudo bettercap -iface eth0
```

You land at an interactive prompt showing your network and IP. A few orientation
commands:

```
help              # list all modules and their on/off state
help net.recon    # show one module's commands and options
active            # show which modules are currently running
```

To configure a module you `set` one of its parameters; to see a parameter's
current value, type its name alone. Type `quit` to exit, which also cleanly stops
any running module (important, since a spoofer leaves the target's network
settings changed until it restores them on exit).

## Part 1: Recon on your own LAN

Start by mapping the network. `net.probe` sends probe packets to every address in
your subnet; `net.show` prints what answered.

```
net.probe on
net.show
```

`net.show` lists each host's IP, MAC, hardware vendor, and the traffic bettercap
has seen. Find your target VM in the list.

Now watch live traffic with the sniffer. Left wide open it captures everything on
your segment, so scope it to your VM:

```
set net.sniff.filter "host 192.168.56.20"
net.sniff on
```

The `filter` takes standard BPF syntax (the same as tcpdump). bettercap parses
common protocols as they pass and prints a readable line per packet: DNS lookups,
HTTP requests, and any plaintext credentials crossing the wire. Generate some
traffic on the VM and watch it appear. Turn it off with `net.sniff off`.

## Part 2: A man-in-the-middle attack on your VM

ARP spoofing tells your target VM that *you* are the router, so its traffic flows
through your machine first. This is the classic MITM, and here it runs only
against the VM you own.

First enable IP forwarding so the VM keeps working while you're in the middle
(otherwise you black-hole its traffic):

```bash
sudo sysctl -w net.ipv4.ip_forward=1
```

Then, in bettercap, point the spoofer at the VM and turn it on:

```
set arp.spoof.targets 192.168.56.20
arp.spoof on
net.sniff on
```

With traffic now passing through you, the sniffer sees the VM's unencrypted
requests.

To show why DNS matters, add DNS spoofing. This answers the VM's lookups for a
chosen domain with your own IP:

```
set dns.spoof.domains example.com
set dns.spoof.address 192.168.56.10
dns.spoof on
```

Browse to `example.com` on the VM and it resolves to your machine. When you're
done, stop cleanly so bettercap restores the VM's real ARP entries:

```
arp.spoof off
dns.spoof off
```

**The lesson:** this is why HTTPS and DNSSEC exist. Modern sites use HSTS, so the
browser refuses the downgrade, which is the defense working as designed.

## Part 3: Wi-Fi recon

Switch to your monitor-mode adapter. bettercap will put the interface into
monitor mode for you when you start it on a wireless interface:

```bash
sudo bettercap -iface wlan0
```

Start scanning and show what's around:

```
wifi.recon on
wifi.show
```

`wifi.show` lists access points with their BSSID, SSID, channel, encryption, and
signal strength, plus the clients seen talking to each one. Because scanning hops
across channels, you'll see the list grow over a few seconds.

A couple of controls make the output manageable:

```
set wifi.show.sort rssi asc      # strongest signal last
wifi.recon.channel 1,6,11        # lock to common 2.4GHz channels
```

Find your own test AP in the list and note its **BSSID** and **channel**. That's
your only target for the next part.

## Part 4: Capturing a WPA handshake from your own AP

A WPA/WPA2 handshake is the four-message exchange a client and AP perform when
the client joins. Capturing it lets you later test your own password's strength
offline. bettercap writes captures to `~/bettercap-wifi-handshakes.pcap` by
default.

Lock onto your test AP's channel so you don't miss frames while hopping:

```
wifi.recon.channel 6
```

**Option A, no client needed (PMKID).** Many APs leak a PMKID that yields the
same crackable material without any client. Associate with your AP and bettercap
grabs it:

```
wifi.assoc AA:BB:CC:DD:EE:FF
```

**Option B, deauth to force a reconnect.** If a device of yours is connected,
briefly deauthenticate it; when it automatically rejoins, you capture the
handshake:

```
wifi.deauth AA:BB:CC:DD:EE:FF
```

Use `AA:BB:CC:DD:EE:FF` as your AP's real BSSID. Only deauth your own AP and your
own client, this is the one command most likely to disrupt real devices if aimed
wrong.

bettercap prints a line when it captures a handshake or PMKID. From there you'd
run the `.pcap` through a cracker like hashcat against a wordlist, purely to
confirm your own passphrase isn't weak. (Cracking is a separate topic and outside
this tutorial.)

## Caplets, the ticker, and the web UI

**Caplets** save a workflow. List and update the bundled ones:

```
caplets.show
caplets.update
```

Write your own by putting commands in a `.cap` file and loading it at launch. A
lab recon caplet, `lanscan.cap`:

```
net.probe on
set net.sniff.filter "not arp"
net.sniff on
```

```bash
sudo bettercap -iface eth0 -caplet lanscan.cap
```

**The ticker** re-runs commands on a timer, handy for a live view:

```
set ticker.commands "clear; wifi.show"
ticker on
```

**The web UI** gives you all of this in a browser. Launch the bundled caplet:

```bash
sudo bettercap -iface eth0 -caplet http-ui
```

Then open `http://127.0.0.1:80` and log in with the credentials the console
prints. Change the default `user/pass` before using it anywhere but localhost.

The web UI is handy, but it means leaving the terminal and running a browser. If
you live in a terminal, **bettercaptui** gives you the same live dashboard
without either, pointed at the very same API this caplet exposes.

## Where to go next

- **BLE:** `ble.recon` scans Bluetooth Low Energy devices, and `ble.enum` reads
  their characteristics. A good exercise against a smart bulb or fitness band you
  own.
- **HID:** the `hid` module scans 2.4GHz wireless keyboards and mice and can
  inject keystrokes (MouseJacking) with DuckyScript.
- **Scripting:** beyond caplets, the JavaScript proxy scripts let you rewrite
  HTTP traffic on the fly, and the REST API lets you drive bettercap from your own
  tools.
- **Reading:** the [official module reference](https://www.bettercap.org/modules/)
  documents every command, and `help <module>` is the same material in the
  console.

The through-line: every attack here has a defense, and running them against your
own lab is how you learn both halves. Keep it inside that lab.

And if the console's firehose of text wore thin anywhere in this walkthrough,
that's exactly the itch
[bettercaptui](https://github.com/NPCmillionaire/bettercaptui) scratches. Clone
it, point it at your lab, and run the same exercises with live panels instead of
scrollback. Stars, issues, and PRs welcome.

<hr>

**Source code:** [bettercaptui on GitHub](https://github.com/NPCmillionaire/bettercaptui)
