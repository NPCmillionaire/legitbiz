+++
title = "Building Targeted Wordlists with Crunch, Then Feeding Them to Hydra"
date = 2026-08-26
+++

Most password attacks don't win because of some clever exploit --
they win because the wordlist was better than the defense. A generic
list like `rockyou.txt` is fine for catching lazy passwords, but it
says nothing about a specific target: a company's naming convention,
a device's default password pattern, a person's known habits. Crunch
exists to build the list that *does* say something about the target,
and Hydra exists to burn through it against a live service. Neither
tool is exotic -- they're standard kit in any pentest lab, and they're
exactly as effective as the thinking that goes into the wordlist
before you run either one.

Everything below assumes you're testing a system you own or have
explicit written authorization to test -- a home lab VM, a CTF box, or
an engagement with signed scope. Running this against anything else is
illegal in most jurisdictions, full stop.

## What Crunch actually does

Crunch generates every possible string that fits a pattern you give
it. It doesn't guess intelligently and it doesn't know anything about
the target -- it just enumerates a character space, which is exactly
what makes it predictable and scriptable. The basic form is:

```
crunch <min-len> <max-len> [charset] -o output.txt
```

- **`min-len` / `max-len`** -- the shortest and longest password
  length to generate. Setting both to the same number locks the
  output to a fixed length, which matters a lot for output size (see
  below).
- **`charset`** -- the pool of characters to draw from. Omit it and
  Crunch defaults to lowercase `a-z`. You can hand it an explicit
  string (`crunch 4 4 0123456789`) or use one of the built-in sets in
  `/usr/share/crunch/charset.lst` (`-f charset.lst mixalpha-numeric`,
  for example).
- **`-o output.txt`** -- write to a file instead of standard output.
  For anything past a few thousand words, always write to a file --
  see the piping section for why.

A concrete example: every 4-digit numeric PIN --

```
crunch 4 4 0123456789 -o pins.txt
```

That's 10,000 lines, instantly. Bump it to 6 digits and it's a
million lines. The output grows combinatorially with length and
charset size, so before generating anything, run the numbers with
`-c` (line count estimate) or just `crunch <min> <max> <charset>` with
no `-o`, which prints the count and size before generating:

```
crunch 8 8 abcdefghijklmnopqrstuvwxyz
```

An 8-character all-lowercase list is already over 200 billion lines
and would eat terabytes of disk. This is the single most common way
people misuse Crunch -- setting a length and charset without checking
the size first, and filling a disk or waiting hours for a file they
didn't need.

## Making it targeted instead of exhaustive

Brute-forcing the entire keyspace is rarely the point -- most real
passwords follow a pattern, and Crunch's `-t` flag lets you encode
that pattern directly instead of generating everything and filtering
after.

`-t` takes a template using placeholders:

- `@` -- lowercase letter
- `,` -- uppercase letter
- `%` -- digit
- `^` -- symbol

So if recon on a target company shows their password policy is
"capitalized word + two digits + symbol" -- a pattern you'd get from a
leaked credential, a policy document, or just observing one password
in the wild -- you encode it directly:

```
crunch 8 8 -t ,@@@@@%%^ -o targeted.txt
```

That collapses a search space that would otherwise be effectively
infinite down to something that finishes in minutes. This is the real
skill in using Crunch: the tool is dumb enumeration, so all the value
comes from constraining it with something you actually know about the
target -- a naming scheme, a known base word, a seasonal pattern
("Summer2026!"-style corporate resets are still extremely common).

You can also seed permutations of specific words instead of a full
character-space pattern, which is closer to what real password
attacks against humans look like:

```
crunch 6 10 -p password123 companyname admin
```

`-p` (permute) generates every ordering of the given words instead of
a range of lengths, which is useful when you have a short list of
known-relevant terms (company name, product name, common defaults)
and want every combination rather than every possible string.

## Piping directly into Hydra

Writing a multi-gigabyte wordlist to disk and then pointing Hydra at
the file works, but it's often unnecessary -- Crunch can stream
output straight into Hydra's stdin, which skips the disk write
entirely and starts the attack as soon as the first candidates exist
instead of waiting for generation to finish:

```
crunch 8 8 -t ,@@@@@%%^ | hydra -l admin -P - ssh://192.168.1.50
```

The pieces:

- **`-l admin`** -- the known or assumed username. Use `-L users.txt`
  instead to test a list of usernames.
- **`-P -`** -- tells Hydra to read the password list from stdin
  (the `-` is the placeholder for "standard input") rather than a
  file path.
- **`ssh://192.168.1.50`** -- the target service and host. Hydra
  supports dozens of protocols this way (`ftp://`, `http-post-form://`,
  `rdp://`, `smb://`, etc.), each with its own syntax for the target
  string.

For a web login form instead of SSH, the target syntax gets more
specific, since Hydra needs to know the form fields and what a failed
attempt looks like:

```
crunch 6 8 -t @@@@@@%% | hydra -l admin -P - target.local http-post-form \
  "/login:username=^USER^&password=^PASS^:Invalid credentials"
```

That last string has three colon-separated parts: the login path, the
POST body with `^USER^`/`^PASS^` as substitution markers, and a
string that appears in the response only on failure -- Hydra uses
that to distinguish a rejected attempt from a successful one.

## Where this goes wrong in practice

- **Throttling and lockouts.** Most real services rate-limit or
  lock accounts after N failed attempts, which a raw Hydra run will
  trip almost immediately. `-t` on Hydra (unrelated to Crunch's `-t`)
  controls parallel connections -- turning it down (`-t 4` instead of
  the default 16) and adding `-W` for a wait interval keeps an
  engagement from just generating a wall of lockout alerts instead of
  useful results.
- **Piping vs. pre-generating.** Streaming is convenient, but if
  Hydra crashes or the connection drops mid-run, you lose your place
  in the sequence with no way to resume -- Crunch doesn't checkpoint
  a live stream. For long-running jobs, generating to a file (using
  `crunch ... -o file.txt` and optionally `split` to chunk it) is
  worth the disk space, since Hydra can resume against a file-backed
  list.
- **Charset assumptions.** A list built purely from `charset.lst`
  guesses will almost always underperform a list built from the
  target's own leaked data, breach corpora, or observed naming
  conventions -- combining Crunch's pattern generation with
  target-specific words (via `-p`) consistently beats either approach
  alone.
- **Verify scope before every run, not just once.** It's easy to
  reuse a Hydra one-liner from a previous engagement and point it at
  a new IP out of habit. The host in the command line is the entire
  blast radius of a mistake here -- treat it with the same care as a
  `rm -rf` target.
