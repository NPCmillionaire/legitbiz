+++
title = "work"
template = "term_page.html"
path = "work"
description = "Selected work from Legit Biz Consulting: file-leak scanning, public-records lead engines, FOIA automation, fraud research, and test automation."

[extra]
cmd = "work"
+++

Client case studies are on the way. Until then, this is what we've built
in the open. It's the same code and thinking that go into client work,
and you can run most of it yourself today.

## unredact.tools -- what do your files give away?

**Problem:** photos, PDFs and Office files carry far more than what's on
screen: GPS coordinates, device serials, author names, text left under
black-box redactions, printer tracking dots.

**Built:** a free, open-source scanner that explains what a file leaks in
plain English, then hands back a clean copy and re-scans it to prove
nothing survived. Runs in the browser or from the command line.

**For your business:** catch what's hiding in the files you send to
customers, post online, or hand to the press.

<p class="tool-demo"><img src="/images/demos/unredact-tools.gif" alt="unredact.tools scanning a file in a terminal" loading="lazy"><span hidden>demo: /images/demos/unredact-tools.gif</span></p>

try it: <https://unredact.tools>

source: <https://github.com/NPCmillionaire/unredact.tools>

## govint -- leads and due diligence from public records

**Problem:** the useful facts about a company are spread across a dozen
government databases, each with its own search and its own format.

**Built:** a command-line tool that searches 20 public data sources at
once (SEC filings and insider trades, federal contracts, sanctions and
export lists, the FAA aircraft registry, lobbying, PPP loans, court
records and more), links the results, and writes a sourced report.

**For your business:** it's the engine behind our
[lead generation](/services/), and a fast background check on a vendor,
partner or competitor.

<p class="tool-demo"><img src="/images/demos/govint.gif" alt="govint screening a company, looking up an aircraft, and pulling insider trades and federal contracts" loading="lazy"><span hidden>demo: /images/demos/govint.gif</span></p>

source: <https://github.com/NPCmillionaire/govint>

## unredact.gov -- make the government write back

**Problem:** FOIA requests and letters to Congress are slow, manual
paperwork, and agencies count on you losing track of the deadline.

**Built:** a tool that drafts the request with the right legal language,
sends it, tracks the deadline in business days, reads the agency's
replies, and writes the follow-up or appeal when they go quiet.

**For your business:** the same pattern -- draft, send, track, chase --
is how we automate quotes, intake and follow-ups.

source: <https://github.com/NPCmillionaire/unredact.gov>

## fraud-score-engine -- how processors judge your transactions

**Problem:** every card payment gets a hidden fraud score, and merchants
rarely see why a good customer gets declined.

**Built:** design research on how those scores are put together: the
signals processors weigh and how they combine into a decline.

**For your business:** fewer mystery declines, and a clearer picture of
what your checkout looks like to a payment processor.

source: <https://github.com/NPCmillionaire/fraud-score-engine>

## test automation and hardware simulators

**Problem:** testing a connected product is slow when the hardware isn't
on hand.

**Built:** automation for a web and mobile app, plus a simulator that
stands in for the hardware. This was a QA role at Pentair, so the code
isn't ours to share, but the approach is.

---

More, including a court-records search and an in-browser security
toolbox, is on [tools](/tools/). Want something like this for your
business? [Tell us what's going on](/contact/), or type `hire` in the
terminal on the [home page](/).
