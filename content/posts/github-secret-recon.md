+++
title = "GitHub as a Recon Target: How Keys and Passwords End Up Public"
date = 2026-08-15
+++

Secrets end up in public GitHub repos constantly, and almost none of
it is the result of some elite hack. It's normal developer workflow,
at scale, with a `git push` that happens a fraction of a second before
anyone remembers what was in the file. Finding those secrets
afterward isn't hard either -- it's one of the most automatable forms
of reconnaissance there is, which is exactly why it stays effective
year after year.

## How the secrets get there

The same handful of mistakes account for most of it:

- **`.env` files committed before `.gitignore` catches up.** A new
  project gets `git init`'d, a `.env` with real database credentials
  or API keys gets created for local dev, and the first commit --
  before anyone's added `.env` to `.gitignore` -- ships it straight
  into history.
- **"Quick fix" hardcoded credentials.** A key gets pasted directly
  into a config file or a script to get something working under
  deadline pressure, with every intention of moving it to an
  environment variable later. Later doesn't always come before the
  push does.
- **CI/CD config files.** GitHub Actions workflows, Jenkinsfiles, and
  Docker Compose files are magnets for this -- they're exactly the
  place a database password or a cloud key needs to exist in plain
  text for the pipeline to run, and they're routinely committed
  alongside application code instead of pulled from a secrets
  manager.
- **Secrets that survive their own deletion.** Removing a secret in a
  later commit does not remove it from the repository -- it's still
  sitting in the commit history, reachable by anyone who checks out
  an earlier ref or runs `git log -p`. A surprising number of "we
  fixed it" commits are actually just adding a second copy of the
  exposure.
- **Forks and mirrors.** If a secret was ever public, even briefly,
  a fork or a clone made in that window can preserve it independently
  of what the original repo does afterward -- deleting the original
  repo, or making it private, doesn't touch copies that already exist
  elsewhere.

## Real exposures, not hypotheticals

This isn't a theoretical risk. Toyota disclosed in 2022 that a GitHub
access key had been left in a public repository for almost five
years, granting access to a server holding data tied to roughly
296,000 customers -- the key was live the entire time, nobody was
looking. Mercedes-Benz had a similar incident surface in early 2024:
a GitHub token, exposed for about four years, that granted access to
the company's internal source code and infrastructure. In both cases
the failure wasn't sophisticated -- it was a credential in a public
repo that nobody noticed until someone went looking.

## Why it's so easy to find

GitHub's own code search indexes the full text of public repositories,
and it's usable by anyone with an account. Searching for a filename
like `.env` or `credentials.json` combined with a term like
`DB_PASSWORD` or `SECRET_KEY` turns up a meaningful hit rate on its
own, with zero tooling required -- this is often called "GitHub
dorking," the same idea as a Google dork, applied to code search.

Beyond manual searching, purpose-built scanners exist specifically to
automate this at scale. Tools like TruffleHog, Gitleaks, and Gitrob
work by pulling repositories (including their full commit history,
not just the current state) and running them through regex and
entropy-based detectors -- patterns that recognize the shape of an
AWS key (`AKIA` followed by 16 characters), a private key block
(`-----BEGIN RSA PRIVATE KEY-----`), or a Slack webhook URL, plus a
Shannon-entropy check that flags high-randomness strings likely to be
a token or password even without a recognizable prefix. These tools
were built for defenders auditing their own history, but the same
scan runs the same way against anyone else's public repo. Some of
them, along with dedicated projects like Shhgit, run continuously
against GitHub's public event stream, so a secret can be flagged
within seconds of the push that introduced it -- often faster than
the developer who committed it notices what they did.

## Where it breaks

- **Push protection.** GitHub's own secret scanning now blocks known
  credential patterns (cloud provider keys, common API token formats)
  at push time by default on public repos, rejecting the push before
  the secret ever becomes visible -- the single most effective fix,
  because it acts before exposure rather than after.
- **Pre-commit hooks.** Running a scanner like Gitleaks locally as a
  pre-commit hook catches the mistake before it ever leaves the
  developer's machine, which matters because once something is
  pushed to a public remote, the exposure window is effectively
  permanent regardless of what happens next.
- **Treat any pushed secret as compromised, immediately.** Deleting
  the file, force-pushing over the commit, or rewriting history does
  not undo the exposure -- if it was public even briefly, assume it
  was seen, and rotate the credential rather than just removing it.
  History rewrites clean up the repo; they don't un-ring the bell.
  Automated scanners are frequently faster than the response time of
  the person who made the mistake.
- **Short-lived, scoped credentials.** A key that expires in hours
  instead of never, and that can only touch one resource instead of
  an entire account, turns a catastrophic leak into a minor one. This
  is the same logic as least-privilege access anywhere else -- assume
  leakage will happen occasionally, and design the blast radius down.
- **Secrets managers over config files, as a default habit.** Vault,
  AWS Secrets Manager, and equivalents exist specifically so a
  credential never has to live in a file that could plausibly end up
  in a commit. The fix that scales isn't "be more careful" -- it's
  removing the opportunity for the mistake to happen at all.
