+++
title = "The Fraud Score"
date = 2026-08-14
+++

Almost every online transaction gets a number attached to it before
it's approved, and almost no consumer ever sees it. Processors call
it a risk score, a trust score, a fraud score depending on the
vendor -- Stripe Radar, Sift, card-network tools like Visa Advanced
Authorization all produce some version of the same thing: a
0-to-100-ish estimate of how likely this specific transaction is to
get charged back.

## What actually feeds it

The score isn't one signal, it's a blend, and the blend is the whole
value of the product:

- **Identity age and stability** -- how long has this email, phone
  number, device, or card been seen before, and has it been
  consistent. A card first seen ten minutes ago, paired with an email
  created yesterday, is a very different prior than a card with two
  years of clean history.
- **Velocity** -- how many transactions, on how many cards, from this
  device or IP or shipping address, in how short a window. Velocity
  across seemingly unrelated accounts is one of the strongest signals
  there is, because it's expensive for a fraudster to fully
  compartmentalize every session.
- **Network reputation** -- has this IP, device fingerprint, or card
  BIN shown up attached to confirmed fraud anywhere else in the
  processor's cross-customer data. This is why a single processor
  like Stripe or a card network can catch patterns an individual
  merchant never could: they see fraud reported across thousands of
  unrelated businesses.
- **Behavioral and environmental noise** -- mismatched timezone vs.
  billing address, browser languages that don't match geography,
  autofill patterns that look scripted rather than typed, checkout
  speed that's inhumanly fast.

Each signal alone is weak and full of false positives. A VPN user, a
shared family card, someone shopping while traveling -- all trip
individual flags constantly. The score's entire job is combining
weak, noisy signals into something with better precision than any one
of them.

## How it gets used

Most systems reduce the score to three buckets: allow, block, or
send to manual/step-up review (OTP, 3DS challenge, human look).
Merchants tune the thresholds against their own risk tolerance --
tighter thresholds cut fraud losses but also decline legitimate
customers, and that false-decline cost is often larger than the fraud
it prevents, which is why thresholds are a business decision as much
as a security one.

## Where fraud tries to hide under the line

None of this is secret from the people trying to beat it, which is
why the more sophisticated fraud rings optimize for staying under
the threshold rather than avoiding detection outright: smaller
transaction amounts, warmed-up accounts aged for weeks before use,
one card per session instead of testing many, deliberately slow and
human-paced checkout flows. This is the actual arms race -- not
"detect fraud" vs. "hide from detection," but a threshold-tuning
contest on both sides.

The practical takeaway for anyone building or buying this kind of
system: a fraud score is a probability estimate, not a verdict, and
treating it as binary (block everything under 40, allow everything
above) throws away the information in *why* a transaction scored the
way it did. The reason code behind the score is usually more useful
for a human reviewer than the number itself.
