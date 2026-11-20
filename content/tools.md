+++
title = "tools"
template = "term_page.html"
path = "tools"
description = "Free tools from Legit Biz Consulting: open-source projects, custom builds, and an in-browser security toolbox."

# The terminal's `tools`, `toolbox` and `demo` commands and the plain page
# (partials/tools_list.html) both render from the data below.
[extra]
cmd = "tools"
toolbox = true

[[extra.oss]]
id = "unredact"
name = "unredact.tools"
desc = "see what a photo, PDF or Office file gives away, then get a clean copy"
web = "https://unredact.tools"
source = "https://github.com/NPCmillionaire/unredact.tools"
install = 'pipx install "unredact-tools[all]"'
demo = "/images/demos/unredact-tools.gif"

[[extra.oss]]
id = "govint"
name = "govint"
desc = "pull and search public government records: licenses, permits, filings"
source = "https://github.com/NPCmillionaire/govint"
demo = "/images/demos/govint.gif"

[[extra.oss]]
id = "bettertui"
name = "bettertui"
desc = "a friendlier terminal UI for bettercap, for networks you're allowed to test"
source = "https://github.com/NPCmillionaire/bettertui"
demo = "/images/demos/bettertui.gif"

[[extra.oss]]
id = "openpacer"
name = "openpacer"
desc = "search federal court records without paying per page"
source = "https://github.com/NPCmillionaire/openpacer"

[[extra.oss]]
id = "foiatool"
name = "foiatool"
desc = "write and track FOIA requests without the paperwork"
source = "https://github.com/NPCmillionaire/foiatool"

[[extra.oss]]
id = "unredact.me"
name = "unredact.me"
desc = "see what can be gathered about you online, then clean it up"
source = "https://github.com/NPCmillionaire/unredact.me"

[[extra.oss]]
id = "fraud-score"
name = "fraud-score-engine"
desc = "an open re-creation of how card processors score fraud"
source = "https://github.com/NPCmillionaire/fraud-score-engine"

[[extra.builds]]
name = "content autopilot"
desc = "write once; it posts to your site and every social account"
[[extra.builds]]
name = "lead engine"
desc = "warm leads from permits, filings and new registrations"
[[extra.builds]]
name = "reputation monitor"
desc = "alerts on new reviews, with replies for you to approve"
[[extra.builds]]
name = "competitor watch"
desc = "a weekly digest of what your competitors changed"
[[extra.builds]]
name = "exposure audit"
desc = "what an attacker can learn about your business, and how to fix it"
[[extra.builds]]
name = "ops dashboard"
desc = "sales, traffic and leads from your tools on one screen"
[[extra.builds]]
name = "intake and booking"
desc = "forms that route, book, confirm and follow up"
[[extra.builds]]
name = "integrations"
desc = "connect two systems that don't talk to each other"
[[extra.builds]]
name = "lite CMS"
desc = "edit your own site without a developer or WordPress"
[[extra.builds]]
name = "lite EMS"
desc = "schedules, time clock and staff paperwork in one place"

[[extra.kit]]
id = "encode"
name = "encoder / decoder"
desc = "base64, base32, URL, HTML, hex, binary, rot13"
[[extra.kit]]
id = "hash"
name = "hash generator"
desc = "MD5, SHA-1 and SHA-256 of any text"
[[extra.kit]]
id = "hmac"
name = "HMAC generator"
desc = "sign a message with a secret key"
[[extra.kit]]
id = "hashid"
name = "hash identifier"
desc = "guess which algorithm made a hash"
[[extra.kit]]
id = "jwt"
name = "JWT decoder"
desc = "read a token's header and payload"
[[extra.kit]]
id = "xor"
name = "XOR cipher"
desc = "XOR text with a key, either way"
[[extra.kit]]
id = "regex"
name = "regex tester"
desc = "try a pattern against sample text"
[[extra.kit]]
id = "cidr"
name = "subnet calculator"
desc = "network, broadcast and host range for a CIDR"
[[extra.kit]]
id = "ip"
name = "IP converter"
desc = "dotted, decimal and hex forms of an address"
[[extra.kit]]
id = "ua"
name = "user-agent parser"
desc = "what a browser's User-Agent string says"
[[extra.kit]]
id = "revshell"
name = "reverse shell generator"
desc = "one-liners for authorized testing"
[[extra.kit]]
id = "payload"
name = "payload encoder"
desc = "encode a test payload several ways at once"
[[extra.kit]]
id = "password"
name = "password strength"
desc = "how long a password would hold up"
[[extra.kit]]
id = "wordlist"
name = "wordlist mutator"
desc = "variations of base words for testing"
[[extra.kit]]
id = "ports"
name = "port lookup"
desc = "what usually runs on a port"
[[extra.kit]]
id = "buster"
name = "path brute-forcer"
desc = "look for hidden paths on a site you're allowed to test"
[[extra.kit]]
id = "headers"
name = "header analyzer"
desc = "check HTTP response headers for security gaps"
+++

Free tools we've released, custom builds we do for clients, and an
in-browser security toolbox. For the bigger things we've built, see
[work](/work/); more at [github.com/npcmillionaire](https://github.com/npcmillionaire).
