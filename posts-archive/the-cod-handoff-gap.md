+++
title = "The COD Handoff Gap"
date = 2026-08-14
+++

A case study in what happens when two systems each assume the other
one is tracking payment state, and neither one actually is. This
described a real class of bug in food-delivery integrations; the
specific gap here has since been closed by tightening how orders get
handed off to third-party couriers.

## The setup

Plenty of restaurants run delivery in-house during normal hours and
outsource to a gig courier platform (DoorDash, Uber Eats, etc.) after
their own drivers go home. The restaurant's own ordering site
supported cash-on-delivery as a payment option -- a reasonable thing
to offer when the restaurant's own driver collects payment at the
door.

## The gap

The order-routing logic didn't distinguish payment method when
deciding whether to outsource a late order to a courier platform. An
order marked "cash on delivery" got dispatched to the courier the
same way a prepaid order would. The courier platform's side of the
integration had no concept of cash orders at all -- its whole model
assumes the platform processed payment, so it treated every
handed-off order as already paid, and the courier had no prompt to
collect anything at the door.

The result: an order placed after normal delivery hours, marked cash,
routed automatically to a courier who believed (correctly, from their
side of the integration) that payment was already settled. Nobody in
the chain was lying to their own system -- both systems were correct
about their own state and wrong about each other's.

## Why this shape of bug is common

This is a classic boundary failure between two systems that don't
share a payment-state field. The restaurant's POS knows "unpaid,
collect cash." The courier dispatch API has no field for that,
because it was designed around a single assumption: if an order
reaches the courier, Stripe or the platform's own processor already
settled it. Neither system was broken in isolation. The bug only
existed in the handoff, which is exactly why it's easy to miss in
testing -- most QA exercises each system against its own happy path,
not the seam between two vendors' assumptions about each other.

## Where it got fixed

- **Payment status became a required field in the dispatch payload**,
  not an assumed constant. A courier API that can't represent "unpaid,
  collect on delivery" will eventually be handed one anyway.
- **COD orders got excluded from auto-outsourcing** rather than
  patched to carry payment state through -- the simpler fix, and the
  one most integrations of this kind land on, since teaching a
  third-party courier platform to collect cash reliably is a bigger
  lift than just not outsourcing those orders.
- **Order routing logic got a payment-method check before the
  after-hours outsourcing decision**, closing the specific timing
  window (after in-house delivery cutoff, before the courier
  integration's own hours logic kicked in) where the mismatch used to
  slip through.

The general lesson outlives this specific fix: any time an order,
payment, or identity handoff crosses a vendor boundary, check what
each side assumes the other one already verified. That assumption gap
is where this entire category of bug lives.
