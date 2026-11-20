+++
title = "work"
template = "term_page.html"
path = "work"
description = "Selected work from Legit Biz Consulting: public-records lead engines, OPSEC tooling, fraud research, and test automation."

[extra]
cmd = "work"
+++

Client case studies are on the way. Until then, here's what we've built
in the open -- the same tools and thinking that go into client work.

## govint -- leads from public records

**Problem:** the best leads are sitting in public records (licenses,
permits, filings), but digging them out by hand takes forever.
**Built:** a command-line tool that pulls and searches public government
records. **Why it matters:** it's the engine behind our
[lead generation](/services/).
[github &rarr;](https://github.com/NPCmillionaire/govint)

## openpacer + foiatool -- public records without the busywork

**Problem:** federal court records cost money per page, and FOIA
requests are slow, manual paperwork. **Built:**
[openpacer](https://github.com/NPCmillionaire/openpacer), for searching
court records for free, and
[foiatool](https://github.com/NPCmillionaire/foiatool), which automates
writing and tracking FOIA requests.

## unredact.tools -- what do your files give away?

**Problem:** photos, PDFs and Office files carry far more than what's on
screen: GPS coordinates, device serials, author names, text left under
black-box redactions, printer tracking dots. **Built:** a free,
open-source scanner that shows what a file leaks in plain English, then
hands back a clean copy, re-scanned to prove nothing survived.
[try it &rarr;](https://unredact.tools) &middot;
[github &rarr;](https://github.com/NPCmillionaire/unredact.tools)

## unredact.me -- what can someone find about you?

**Problem:** most people and small businesses have no idea how much
about them is already out there. **Built:** an OPSEC tool that shows
you what can be gathered about you, so you can clean it up before
someone uses it.
[github &rarr;](https://github.com/NPCmillionaire/unredact.me)

## fraud-score-engine -- how processors judge your transactions

**Problem:** every card payment gets a hidden fraud score, and merchants
rarely see why a good customer gets declined. **Built:** an open
re-creation of how those scores are put together. Background in
[the fraud score](/posts/the-fraud-score/).
[github &rarr;](https://github.com/NPCmillionaire/fraud-score-engine)

## test automation and hardware simulators

**Problem:** testing a connected product is slow when the hardware isn't
on hand. **Built:** automation for a web and mobile app, plus a
simulator that stands in for the hardware. Built in a QA role at
Pentair, so the code isn't ours to share -- but the approach is.

---

Want something like this for your business? [Tell us what's going
on](/contact/), or type `hire` in the terminal on the [home page](/).
