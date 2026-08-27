+++
title = "Capturing and Cracking a WPA2 Handshake with Aircrack-ng"
date = 2026-08-26
+++

You just stood up a new AP -- a spare router for a guest network, a
lab bench box, whatever -- and picked a passphrase for it. The only
honest way to find out whether that passphrase is any good is to
attack it the same way anyone else would. That's the whole job of
`aircrack-ng`: not one tool but a suite, covering monitor mode setup,
packet capture, and the offline crack, all built around one weakness
in WPA2 -- the 4-way handshake that happens every time a client
associates.

Everything below assumes you're testing a network you own or have
explicit written authorization to test -- a home lab AP, a CTF
range, or an engagement with signed scope. Capturing handshakes or
deauthing clients on a network that isn't yours is a computer crime
in most jurisdictions (CFAA in the US), full stop.

## What you need

- A wireless adapter that supports **monitor mode** and **packet
  injection**. Most laptop-internal cards don't -- an external USB
  adapter with a known-good chipset (Atheros AR9271, Realtek
  RTL8812AU) is the usual recommendation.
- `aircrack-ng` installed (`apt install aircrack-ng` on Debian/Kali,
  `pacman -S aircrack-ng` on Arch).
- A wordlist. `rockyou.txt` is the standard starting point -- fine
  for proving a passphrase is *weak*, useless against anything that
  isn't.

## Putting the interface into monitor mode

NetworkManager and friends will fight you for the interface, so kill
them first:

```
airmon-ng check kill
```

Then find the interface and switch it into monitor mode:

```
iwconfig
airmon-ng start wlan0
```

This usually renames the interface to something like `wlan0mon`.
Confirm with `iwconfig` that it shows `Mode:Monitor`.

## Surveying the airspace

```
airodump-ng wlan0mon
```

This lists every AP in range -- BSSID, channel, encryption, and the
clients (STATIONs) associated with each one. Find the target AP's
BSSID and channel and note them; the next command needs both.

## Capturing the handshake

Lock onto the target and start writing packets to disk:

```
airodump-ng -c <channel> --bssid <BSSID> -w capture wlan0mon
```

The goal is a WPA 4-way handshake, which fires whenever a client
associates with the AP. If a client is already connected, there's no
need to wait for a natural reconnect -- a deauth forces one on your
schedule instead of whenever someone happens to rejoin:

```
aireplay-ng -0 5 -a <BSSID> -c <client MAC> wlan0mon
```

`-0 5` sends 5 deauth packets. Watch the `airodump-ng` window -- when
it shows `WPA handshake: <BSSID>` in the top right corner, the
capture has what it needs. Stop it with Ctrl-C.

An AP that supports **PMKID** will hand over enough to attack without
any client interaction at all -- a known weakness in a lot of
consumer router firmware, and worth knowing about since it skips the
deauth step entirely. That's `hcxdumptool` territory rather than the
airodump-ng/aireplay-ng flow above, but it's the quieter alternative
when one applies.

## Cracking it

Point `aircrack-ng` at the `.cap` file and a wordlist:

```
aircrack-ng -w /usr/share/wordlists/rockyou.txt -b <BSSID> capture-01.cap
```

If the passphrase is in the wordlist, this finds it. Under the hood
it's just hashing candidate passwords through PBKDF2 and comparing
against the handshake, so it's bottlenecked on CPU -- for anything
past a quick sanity check, `hashcat -m 22000` on a GPU (after
converting the capture with `hcxpcapngtool`) does the same attack an
order of magnitude faster.

## Where this goes wrong in practice

- **Wordlist mismatch.** `rockyou.txt` catches short, common,
  human-guessable passphrases and nothing else -- it says nothing
  about a specific target the way a `crunch`-generated or
  target-aware list does (see the [Crunch/Hydra
  post](/posts/crunch-hydra-wordlists) for building one).
- **No handshake, no attack.** Everything here depends on capturing
  a full 4-way handshake or a PMKID. Miss it -- wrong channel, client
  never reconnects, deauth packets dropped -- and there's nothing to
  crack offline no matter how good the wordlist is.
- **WPA3 breaks this entirely.** The handshake-capture-and-crack
  model above is a WPA2 story. WPA3's SAE handshake is resistant to
  offline dictionary attack by design -- if the AP under test
  supports WPA3, turning it on is a better fix than a longer
  passphrase.
- **Deauth has a blast radius.** `aireplay-ng -0` knocks every
  targeted client offline, not just the one you're trying to force a
  handshake from. On a live network -- even one you're authorized to
  test -- that's a disruption worth scoping and timing deliberately,
  not firing off by habit.
