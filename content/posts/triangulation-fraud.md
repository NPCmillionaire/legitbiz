+++
title = "Triangulation Fraud"
date = 2026-08-14
+++

A pattern where the seller never owns any inventory, and the buyer
often never realizes anything was wrong -- the item shows up, on
time, as described. The fraud is invisible to the one person it looks
like it should hurt most.

## The mechanics

A seller lists a product on Marketplace A at a normal or slightly
below-market price and takes a legitimate payment from a real buyer.
Instead of shipping anything they own, the seller turns around and
buys the same item from Marketplace B or a retailer's own site, using
a stolen card, and enters the real buyer's address as the shipping
destination. The item ships direct from Marketplace B to the buyer.
The buyer gets exactly what they ordered, on a normal timeline, and
has no reason to suspect anything.

The seller's payout from Marketplace A is now pure profit -- they
spent nothing, since the stolen card covered the actual purchase.
The loss lands entirely on Marketplace B (or its payment processor)
and the cardholder whose card was used without authorization, once
the chargeback comes in weeks later. By the time it does, the seller
has moved on to the next order, and the connection between "stolen
card used on Marketplace B" and "seller account on Marketplace A" is
not something either marketplace can see on their own -- they're
different companies with no shared view of the transaction.

## Why it works

The scheme survives specifically because it splits a single fraud
across two unrelated systems, each of which only sees half the
picture. Marketplace A sees a normal completed sale with a happy
buyer and no chargeback on their books -- there's nothing for their
fraud systems to flag. Marketplace B sees an order paid with a stolen
card shipped to a third-party address, which does look like fraud to
them individually, but by the time the chargeback resolves, it's
processed as an isolated stolen-card incident, not connected back to
a seller pattern on a completely different platform.

The seller's real exposure is entirely on the Marketplace B side, and
even that takes time to catch up with them, since a chargeback
investigation is slower than the sell-ship-profit cycle it's chasing.

## Where it breaks

- **Billing-address / shipping-address mismatch, treated as high risk
  rather than routine.** A huge share of legitimate e-commerce ships
  to a different address than billing (gifts, offices), so this alone
  is weak -- but combined with a brand-new account or a shipping
  address that's never been used on that card before, it's one of the
  strongest available signals.
- **Cross-marketplace pattern matching.** Fraud-prevention vendors
  (Forter, Riskified, Signifyd) sit across many merchants at once
  specifically to catch this seam -- a card used fraudulently on
  Marketplace B and a seller account with unusual fulfillment timing
  on Marketplace A are invisible to each platform alone, but visible
  to a network that sees both.
- **Fulfillment-source verification.** Marketplaces that require
  sellers to prove they hold inventory, or that flag sellers whose
  shipments consistently originate from a different retailer's
  packaging or return address, catch this at the seller-account level
  rather than the transaction level.
- **Velocity on new seller accounts.** A brand-new seller account
  doing high-value, high-volume, drop-ship-pattern sales in its first
  days is a strong prior on its own, independent of any single
  transaction looking clean.
- **Faster chargeback signal loops.** The core weakness of the scheme
  is the lag between "card gets used" and "chargeback lands and gets
  attributed." Shortening that loop, and sharing the attribution back
  to the originating seller account rather than treating it as an
  isolated card incident, is what actually closes the gap -- not any
  single transaction-level check.
