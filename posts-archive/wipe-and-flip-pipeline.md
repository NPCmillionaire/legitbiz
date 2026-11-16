+++
title = "The Wipe-and-Flip Pipeline"
date = 2026-08-14
+++

Notes on a fraud pattern that's common enough to have a shape: a
laptop gets stolen, wiped, and relisted as clean secondhand hardware,
often within 48 hours. The interesting part isn't the theft -- it's
where the pipeline actually breaks.

## The take

Most stolen laptops don't come from break-ins. They come from
unattended bags -- a coffee shop table, a rideshare back seat, a
conference badge line. Opportunistic theft outnumbers targeted
burglary by a wide margin because it scales: one person working a
busy cafe for an afternoon walks away with more inventory than a
night spent on a residential break-in, for a fraction of the risk.

The second-largest source is quieter: assets that never get returned.
An employee leaves a company, a rental laptop doesn't come back, a
"lost" device gets reported once and never chased. Orgs without real
asset tracking absorb this as background loss, which is exactly what
makes it attractive to insiders.

## The wipe

This stage decides whether the device is worth anything. A laptop
with an active account-level lock -- tied to the owner's cloud
account rather than to the hardware -- is close to worthless on the
resale market, because the lock survives a factory reset, an OS
reinstall, and usually a full drive swap.

The lock isn't on the drive. That's the detail most attempts get
wrong, and it's why wipe-and-flip operations increasingly skip recent
flagship laptops and focus on older or enterprise-fleet hardware
where the lock was never enabled, was tied to an MDM system that got
deprovisioned wrong, or never existed. Asset tags and BIOS labels get
removed or sanded off; serials get left out of listings entirely.

## The channel

Wiped inventory moves through three channels, in order of preference:
peer-to-peer marketplaces with no ID or serial verification, pawn
shops in jurisdictions with weak reporting requirements, and bulk
wholesale export -- pallets of "used electronics, untested" sold by
weight to overseas resellers who have no practical way to check a
serial against a theft report even if they wanted to.

Cash-only, local-pickup listings are the default, since they skip
payment processor identity checks and shipping labels -- both of
which leave a paper trail. Listings often describe a fully functional
device as "for parts," a small hedge that lets the seller claim
ignorance later.

## Where it breaks

Two structural weak points, and defenses aimed at them do more work
than anything aimed at preventing the theft itself:

- **Account-bound remote lock, enabled by default.** Find My /
  Activation Lock on Apple hardware, Find Hub on Chromebooks, and
  Windows Find My Device all survive a wipe if they were turned on
  before the theft. The gap is almost always "never enabled," not
  "defeated."
- **Firmware-level persistence agents.** Tools like Absolute
  Persistence live in UEFI/BIOS, not the OS, and reinstall themselves
  after a factory reset or drive swap -- pinging the owner the moment
  the device touches the internet again.
- **Serial / IMEI blacklist registries.** CTIA/GSMA's device registry
  and similar theft-report databases let a buyer check a serial
  before paying. The channel only works because most secondhand
  buyers never check.
- **Real offboarding for org-owned hardware.** MDM tools (Jamf,
  Intune) can flip a device to lost mode the moment it isn't returned
  on schedule -- but only if offboarding actually triggers that,
  instead of a spreadsheet update nobody acts on.
- **Buyer-side verification before cash changes hands.** Checking a
  serial against a loss registry and confirming a device isn't
  locked takes under two minutes and kills the resale value of stolen
  inventory at the point of sale. Cheapest intervention in the whole
  chain.
