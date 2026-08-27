+++
title = "RDP Shops and the Geography Problem in Card Fraud"
date = 2026-08-14
+++

Card networks and processors lean hard on geography as a fraud
signal: does the IP address, the billing address, and the issuing
bank's country all roughly agree? A mismatch is one of the cheapest,
highest-signal checks in the whole risk stack. Which is why a
specific piece of infrastructure -- the compromised RDP box -- has
stayed valuable to card fraud for over a decade, long after most of
the rest of the tooling around it has changed.

## Why RDP specifically

A stolen card has an issuing bank, and that bank has a country, often
down to a metro area. A transaction placed from an IP in that same
metro area looks nothing like one placed from a datacenter halfway
around the world. Renting -- or more often, buying access to an
already-compromised -- residential or small-business Windows machine
in the right city gives a fraudster a local IP, a local system clock,
and a local browser fingerprint for the price of a remote desktop
session.

This is different from a residential proxy, which routes traffic
through someone's connection but still runs the fraudster's own
browser and OS. RDP hands over an entire real machine: real installed
fonts, a real hardware ID, a browser profile with actual history in
it. Fingerprinting systems built to catch proxies frequently wave
this straight through, because by every signal they check, it *is* a
real consumer machine -- it just has two people using it.

## How the access gets sold

RDP access is commoditized on dedicated marketplaces, priced by
country, city, and sometimes by the specific bank whose cardholders
live nearby. Machines are sourced from mass credential-stuffing
against exposed RDP ports (3389 left open to the internet is still
astonishingly common), and turnover is high -- a box gets used for
card testing until its IP is burned, then abandoned for the next one.

Card testing itself -- running small, fast transactions across many
stolen card numbers to find which ones are still live -- is usually
the first thing to happen on a freshly acquired box, before it gets
used for anything larger. That testing traffic has its own shape:
short session, narrow range of merchant categories, high transaction
velocity, low individual amounts.

## Where it breaks

- **Flag datacenter and known-RDP-provider ASNs outright**, and treat
  "clean" residential ASNs with sudden unfamiliar login patterns
  (new device, new user-agent, odd hours) as elevated risk rather
  than trusted by default.
- **Look past IP geography to session behavior.** RDP sessions often
  have telltale latency and input-timing signatures -- mouse movement
  and keystroke timing over a remote session differs measurably from
  local input, even when every other fingerprint matches.
- **Rate-limit and pattern-match card testing specifically**: many
  small authorizations across many card numbers in a short window,
  from one session or device, is a distinct signature from normal
  shopping behavior and is cheap to detect independent of geography.
- **3-D Secure (3DS2)** shifts liability and adds a real-time bank-side
  challenge that a hijacked RDP session usually can't complete,
  since it doesn't grant access to the cardholder's phone or bank
  app.
- **Close exposed RDP ports.** The supply side of this entire market
  is machines with 3389 open to the internet and weak or reused
  credentials. This is the cheapest fix in the chain and the one most
  consistently skipped.
