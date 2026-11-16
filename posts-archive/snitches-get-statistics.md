+++
title = "Snitches Get Statistics: Why (Almost) Nobody Goes to Trial"
date = 2026-08-27
+++

Every fraud case you've ever read about ends the same way in the last
paragraph of the press release: "pleaded guilty." Not "was convicted
at trial by a jury of their peers," which is the version everyone's
mental model of the justice system is still running on. Pleaded
guilty. Almost always. Almost immediately. And in a multi-defendant
fraud ring -- which is most of them, because fraud this size takes
more than one person -- almost always in a specific, predictable
order, driven by a dynamic that never makes it into the press release
at all: somebody flipped, and once they did, the math for everyone
else still holding out got a lot worse.

## The trial is basically theater at this point

Start with the baseline, because it's more extreme than most people
guess. In fiscal year 2024, 97% of sentenced federal defendants got
there by pleading guilty -- meaning roughly 3% of cases went to trial
at all. That's not a fraud-specific number, that's everything, and
it's been trending that direction for decades: thirty years ago,
about 20% of people who got arrested chose trial. Today it's under
3%, and has been for most of the last decade. Fraud and financial
crime cases track this closely or run a little higher, because
they're document-heavy, paper-trail-heavy, and about the least
sympathetic thing you can put in front of a jury next to "I panicked."

None of this means everyone pleading guilty actually did it, and
that's the part that should bother you more than it probably does.
It means the system built a machine that is extremely good at
extracting a guilty plea and only incidentally good at extracting the
truth. Those turned out not to be the same design goal.

## The number that actually explains it

The mechanism doing most of the work here isn't complicated, it's
just rarely said out loud: pleading guilty is *cheaper*, and the
discount is enormous. The National Association of Criminal Defense
Lawyers spent years documenting this in a 2018 report bluntly titled
"The Trial Penalty," and the numbers are not subtle -- federal
sentences after a trial conviction run, on average, roughly three
times longer than the sentence the same person could have gotten by
pleading, and in some case types the gap runs eight to ten times.
Averaged across federal felonies generally, that's something like a
seven-year difference in sentence length for exercising a
constitutional right instead of waiving it.

Nobody calls this a penalty for going to trial, officially. Officially
it's "acceptance of responsibility" credit you forfeit, and mandatory
minimums you're no longer shielded from once a jury -- rather than a
plea agreement -- decides your fate. Functionally, it's a tax on
making the government prove its case, and it's steep enough that
plenty of innocent people do the math and plead anyway, because losing
at trial doesn't cost you a little more than pleading guilty, it costs
you years more. This is the pressure sitting on every defendant before
a single codefendant has said a word to a prosecutor.

## Where the codefendant comes in

Add a second, third, or fifteenth defendant to the same indictment,
and you've built a prisoner's dilemma with a first-mover bonus
attached. The prosecutor doesn't need all of them to cooperate. They
need one -- ideally the one closest to the middle of the conspiracy,
with documents and a working memory of who did what. Once that person
signs a cooperation agreement, the value of a second cooperator drops,
and the value of a third drops close to zero, because the government
already has an insider witness and doesn't need to trade a sentence
reduction for information it can already prove. Defense attorneys who
work multi-defendant fraud cases describe it, without much
disagreement, as a literal race: timing matters more than how guilty
you actually are relative to your codefendants, because the reward is
almost entirely a function of arrival order.

The going rate for winning that race is visible in U.S. Sentencing
Commission data on "substantial assistance" departures under
guideline section 5K1.1 -- the formal mechanism for rewarding
cooperation with a lighter sentence. Nationally, fraud offenders make
up roughly 13.5% of everyone who gets one, and the departure itself
isn't symbolic: it knocks an average of 52.6% off the bottom of the
defendant's sentencing guideline range. That's the size of the prize
for being the one who talks. It's also not guaranteed money in the
bank -- cooperation agreements get revoked for breach in something
like 11% of cases, which is prosecutor-speak for "we decided you
weren't actually being straight with us," and at that point you've
already confessed on the record with nothing to show for it.

## What this looks like in an actual ring

The COVID-era PPP loan fraud cases are a good place to watch this play
out in public, because there were so many of them and DOJ press
releases are unusually specific about the sequence. In one Houston
ring, Amir Aqeel was sentenced to 15 years for leading a scheme that
helped at least 14 other people file more than 75 fraudulent PPP loan
applications worth roughly $20 million. All six charged codefendants
in that case pleaded guilty -- nobody went to trial, and the sentences
scaled down sharply the further you were from the center of the
conspiracy, from Aqeel's 15 years down to 18-month terms for people
who submitted fewer applications and cooperated earlier. In a separate
Atlanta-based PPP ring, by the time the twelfth and final defendant
was charged, all eleven people charged before him -- nine of them
business owners -- had already pleaded guilty or been convicted. At
that point, defendant twelve isn't deciding whether to fight a case.
He's deciding how much cooperation credit is still on the table after
eleven other people already told the government everything it needed
to know.

## The honest answer: nobody actually publishes this number

Here's the part I'd be lying if I dressed up as more solid than it
is: there is no government agency, and no dataset I could find, that
tracks "percentage of guilty pleas caused by a codefendant flipping"
as its own tidy statistic. It's not that anyone's hiding it -- it's
that a guilty plea doesn't record its own motive. The plea agreement
says the defendant did it and is accepting responsibility; it doesn't
say "and also my co-conspirator cut a deal eight weeks ago and gutted
my leverage." Prosecutors have zero incentive to spell that out in a
press release when "pleaded guilty following an investigation" does
the job just as well from their side.

What you get instead, and what this whole post has been assembling,
is a stack of adjacent numbers that all point the same direction: a
97% overall plea rate, a trial penalty steep enough to make pleading
rational even for people who might win, a cooperation-reward system
that pays out real time off a sentence and is disproportionately used
in fraud cases, and real multi-defendant fraud rings where the guilty
pleas visibly cascade in order once the first person talks. Stack
those up and the missing number -- how much of the 97% is specifically
downstream of a codefendant's decision to cooperate -- is clearly
large. It's just not a number anyone was ever going to publish,
because nobody involved benefits from saying it plainly.

## Where it breaks

- **The penalty doesn't discriminate by guilt.** A trial penalty that
  can add years to a sentence pressures innocent and guilty defendants
  identically -- it's a function of what you're risking by making the
  government work for a conviction, not a function of what you
  actually did. Multiple exoneration studies have flagged false guilty
  pleas as a real, non-trivial category specifically because of this
  math, not as an edge case.
- **"Substantial assistance" is a bet, not a receipt.** Roughly 1 in 9
  cooperation agreements gets revoked for an alleged breach, and a
  defendant who's already confessed on the record has very little
  leverage left to argue about it once that happens.
- **Timing beats accuracy.** The reward structure pays out based on
  who reaches the prosecutor's office first, not who was most
  culpable or whose information is most reliable -- which means the
  first cooperator's version of events often becomes the government's
  working theory of the whole case before anyone can meaningfully
  challenge it.
- **This dynamic is federal-strength by design.** Mandatory minimums
  and sentencing guidelines are what make the trial penalty large
  enough to force the decision; state-level fraud prosecutions, with
  generally lighter and more judge-discretionary sentencing, produce
  the same race-to-cooperate incentive but with a smaller prize
  attached, which is part of why federal prosecutors are the ones who
  get first pick of multi-defendant financial crime cases whenever
  jurisdiction is contested.
