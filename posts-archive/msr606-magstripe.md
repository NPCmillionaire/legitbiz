+++
title = "The MSR606: What a $30 Magstripe Reader/Writer Actually Does"
date = 2026-08-26
+++

The MSR606 is a small USB device, widely sold on general electronics
marketplaces for well under $50, that reads and writes the magnetic
stripe on the back of a card. It shows up constantly in two very
different contexts: hobbyists and access-control installers using it
for exactly what it's built for, and card fraud, where it's the last
step that turns stolen card data into a physical, swipeable card. The
device itself is completely agnostic to which of those it's doing --
it just moves bytes onto a stripe. The legality and harm live entirely
in what data goes in and whose card it ends up on.

## What's actually on a magnetic stripe

A card's stripe holds up to three parallel tracks of data, a format
standardized decades ago (ISO/IEC 7811) and still what nearly every
swipe-capable reader in the world expects:

- **Track 1** -- up to 79 alphanumeric characters, holding the
  cardholder's name plus the same account number and expiration data
  as Track 2. This is the track airline boarding-pass-style systems
  and some access badges use, since it can carry a name and more
  free-form data.
- **Track 2** -- up to 40 numeric characters, holding the primary
  account number, expiration date, and service code. This is the
  track that actually matters for a financial transaction -- most
  payment terminals only read Track 2, and it's the track skimmers
  are built specifically to capture.
- **Track 3** -- rarely used today, originally intended for
  read-write applications like transit fare cards.

None of this is encrypted or signed. A magstripe is a passive analog
recording -- whatever pattern of magnetic flux transitions is on the
tape gets read back as a fixed string of digits, with no
cryptographic check that the string came from a real, un-tampered
card. This is the entire reason chip cards (EMV) exist: a chip can
run a cryptographic challenge-response per transaction, while a
stripe just plays back the same static data every time, forever.
Anything that can read that static string can write it onto another
card.

## What the device does, mechanically

The MSR606 (and its more common sibling, the MSR605X) connects over
USB and ships with Windows software that talks to it over a simple
serial protocol. In practice, using it involves three separate
operations:

- **Read** -- swipe a card through the reader slot, and the software
  decodes the raw flux transitions into the track strings and
  displays them as text (the account number, expiration, and service
  code on Track 2, for example).
- **Write** -- paste or type track data into the software, swipe a
  blank magstripe card (sold in bulk, in the same aisle as the reader
  itself, explicitly for this purpose -- hotel key stock, loyalty
  card blanks, access badges), and the device re-encodes those exact
  bytes onto the new card's stripe.
- **Erase** -- wipe a stripe back to blank, which is mostly useful for
  reusing test cards during legitimate encoding work.

The coercivity setting (Hi-Co vs. Lo-Co) has to match the blank
card's stripe material or the write will fail to hold -- Hi-Co
stripes (the black ones, used on most bank cards) need a stronger
field than Lo-Co (the brown ones, common on hotel keys and gift
cards). This is the most common reason a first attempt at using one
of these devices doesn't work: wrong coercivity setting for the card
stock in hand.

## Where this is legitimate

- **Access control and hotel systems.** Most hotel key encoders and a
  fair number of building badge systems are, underneath the branded
  housing, functionally identical hardware to a bare MSR605X --
  installers and security integrators use standalone units like it
  routinely to provision and test badges.
- **Point-of-sale and payment testing.** Developers and QA teams
  building or certifying POS software need a way to generate known,
  reproducible test card data without touching a real account -- an
  encoder loaded with test-issuer data (the card networks publish
  ranges specifically reserved for this) is standard lab equipment.
- **Loyalty and gift card programs.** Small businesses running their
  own loyalty stripe cards use exactly this class of device to encode
  new cards in-house instead of paying a vendor per batch.
- **Personal and hobbyist projects.** Encoding a personal library
  card, an old transit card, or a DIY access system onto blank stock
  you own is a long-running hobbyist niche with no card-network data
  or another person's account involved anywhere in it.

The common thread: the data being written either belongs to the
person doing the writing, or was generated specifically as test data
that was never live in the first place.

## Where this becomes fraud

The device doesn't change at all -- what changes is the source of the
Track 2 data being fed into the "write" step. Two supply chains feed
that step almost universally:

- **Skimmers.** A physical skimmer (a false front over an ATM or gas
  pump card slot, or a compromised standalone reader) captures Track
  1/2 data off real cards as they're swiped, often paired with a
  hidden camera or a fake keypad overlay to grab the PIN separately.
  That captured data gets pulled off the skimmer later and is now
  identical in form to anything a legitimate operator would encode.
- **Carded data from breaches.** Track data harvested from
  point-of-sale malware (memory-scraping malware reading card data
  out of a terminal's RAM before it's encrypted -- the Target and
  Home Depot breaches both worked this way) gets sold on card shops
  in bulk, priced by issuing bank and country, exactly like the
  account-number-only data sold for card-not-present fraud, but
  formatted as full track dumps specifically because a buyer intends
  to write it onto plastic and use it in person.

Once a buyer has Track 2 data from either source, an encoder and a
box of blank Hi-Co cards is the entire remaining toolchain to produce
a working physical clone -- no different mechanically from the
legitimate hotel-key use case above, just with someone else's account
number in the write buffer.

## Where it breaks

- **EMV chip liability shift.** Since 2015 in the US (earlier
  elsewhere), a merchant that accepts a chip card via magstripe swipe
  instead of dipping the chip eats the fraud loss instead of the
  issuing bank. This single policy change is the reason cloned-card
  fraud at physical registers has dropped sharply compared to a
  decade ago -- it didn't stop cloning, it made merchants stop
  accepting the clone's swipe.
- **Chip cryptograms can't be cloned this way.** The chip generates a
  unique cryptographic value per transaction; copying the static data
  visible on the stripe (which most chip cards still carry, for
  fallback compatibility) does not let an attacker reproduce that
  value, so a cloned stripe from a chip card fails the moment it hits
  a chip-reading terminal.
- **Tap-to-pay (NFC) has the same protection as chip**, using a
  per-transaction cryptogram rather than replayable static data, and
  is increasingly the default even at swipe-capable terminals.
- **Card-present anomaly detection.** Issuers flag a card used
  in-person in a location inconsistent with its recent transaction
  history or its cardholder's typical geography -- a cloned card
  showing up hundreds of miles from the last legitimate swipe is a
  strong, cheap signal independent of anything on the stripe itself.
- **Skimmer detection at the point of capture** is the actual
  upstream fix: tamper-evident seals on ATMs and pumps, Bluetooth/RF
  scanning for skimmer transmitters, and simply wiggling the card
  reader before use, since most skimmers are shells that sit loosely
  over the real slot.
