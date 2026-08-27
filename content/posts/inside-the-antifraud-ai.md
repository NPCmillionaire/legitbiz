+++
title = "Inside the Antifraud AI: FICO Falcon, Visa VAA, and Mastercard's Decision Intelligence"
date = 2026-08-27
+++

Every card swipe, tap, or checkout gets scored by a fraud model before
it's approved -- usually in under 300 milliseconds. Three systems
handle the overwhelming majority of that scoring worldwide: **FICO
Falcon Fraud Manager**, licensed by most issuing banks; **Visa
Advanced Authorization**, run at the network level on every Visa
transaction; and **Mastercard Decision Intelligence** (built on the
acquired Brighterion stack). [[the-fraud-score]] covered the score
itself and what feeds it from a merchant/processor angle -- this is
about the specific models sitting upstream of that, at the issuer and
network level, and how they're actually built.

## The three-layer stack

- **Rules engines** -- the oldest, still-running layer. Hard blocks:
  certain countries, dollar ceilings, blacklisted merchant category
  codes. Fast and explainable, but static -- anyone who sees a decline
  reason enough times can map the rule.
- **Supervised models** -- gradient-boosted trees and neural nets
  trained on billions of transactions labeled fraud/not-fraud after
  the fact (via chargebacks and confirmed fraud reports). Output is a
  continuous score, not a yes/no, which is what lets an issuer route
  a mid-range score to a step-up challenge (OTP, 3DS) instead of an
  outright decline.
- **Unsupervised/graph models** -- anomaly detection and network
  analysis that don't need a labeled fraud example to work. This is
  the layer that catches new patterns before enough chargebacks exist
  to train a supervised model on them, and it's the layer that links
  a fraud ring together by shared device IDs, IPs, or shipping
  addresses across accounts that look unrelated transaction-by-
  transaction.

Mastercard's Decision Intelligence leans hardest on the graph layer --
its whole pitch is modeling relationships between accounts, not just
scoring accounts individually. Visa's VAA runs network-wide, so it
sees patterns no single issuing bank could: a BIN range or device
fingerprint showing up in confirmed fraud at one bank gets weighted
into risk scores at every other bank on the network within the same
scoring cycle.

## What actually feeds the model

Same categories regardless of vendor:

- **Identity/device age and stability** -- how long has this card,
  email, phone, or device been seen, and how consistently.
- **Velocity** -- transaction count and dollar volume per card,
  device, IP, or shipping address in a rolling window. The strongest
  single signal, because compartmentalizing every session across
  fake identities is expensive to do perfectly.
- **Network reputation** -- has this card BIN, device fingerprint, or
  IP shown up in confirmed fraud anywhere else in the cross-issuer
  dataset. This is the entire value proposition of a network-level
  system like VAA over a single bank's in-house model: one bank sees
  its own fraud, the network sees everyone's.
- **Behavioral biometrics** -- typing cadence, swipe pressure, how a
  phone is held during a mobile-app session. Newer signal, harder to
  fake at scale than a device ID.

Every signal is individually noisy -- a VPN, a shared family card, a
person traveling all trip flags that mean nothing on their own. The
model's entire job is combining weak signals into something with
better precision than any single one.

## Where it breaks

None of this is secret from the people trying to beat it, and the
patterns below are exactly why issuers treat model thresholds as
closely guarded and rotate them on a schedule rather than a fixed
config:

- **Velocity smoothing** -- instead of many fast small charges (an
  obvious spike), spreading test transactions across time and
  merchants keeps every individual window under the threshold.
- **Identity aging** -- synthetic or warmed-up identities built weeks
  or months ahead of use have no anomaly to detect against, because
  the model is looking for deviation from a baseline that was
  deliberately built to look normal.
- **Device/location normalization** -- matching a transaction's
  apparent IP and device fingerprint to the cardholder's usual
  geography defeats the network-reputation signal specifically,
  since that signal depends on the fingerprint looking foreign or
  previously flagged.
- **Targeting the human layer instead of the model** -- SIM-swaps,
  phishing, and call-center pretexting produce a session that's
  cryptographically and behaviorally identical to the real
  cardholder, which is precisely the case none of the transaction-
  level signals above are built to catch. This is why account
  takeover, not card-present fraud, is the fastest-growing category
  issuers report.
- **Threshold probing** -- running small transactions specifically to
  map where a given issuer's decline line sits, then staying just
  under it. Organized rings do this systematically; it's the reason
  issuers now rotate thresholds and blend in randomized manual review
  even for scores that would otherwise auto-clear.

The practical upshot: none of these systems are a wall, they're a
tuned filter balancing fraud losses against false declines, and any
filter with a threshold can eventually be mapped by someone patient
enough to probe it. The industry's current bet on staying ahead is
leaning harder on the signals that are actually expensive to fake --
graph relationships across accounts, and behavioral biometrics -- over
any single transaction-level data point.
