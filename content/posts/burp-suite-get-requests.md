+++
title = "Burp Suite 101: Reading and Manipulating GET Requests"
date = 2026-08-27
+++

Every button click, page load, and "view profile" link on the web
boils down to a plain-text request your browser builds and fires at a
server. Most people never see that text -- the browser assembles it,
sends it, and renders whatever comes back, all invisibly. Burp Suite's
entire value proposition is removing that invisibility: it sits
between your browser and the internet, shows you the exact request
before it leaves your machine, and lets you change any part of it
before it goes. Once you can see and edit that layer, "the app decided
what to show you" quietly becomes "you decided what to ask for."

## What a GET request actually is

A GET request is one of the HTTP methods browsers use to ask a server
for something, and it's the one doing the work every time you load a
page, click a link, or follow a bookmark. Stripped down, it looks like
this:

```
GET /account/profile?user_id=4471&view=summary HTTP/1.1
Host: example.com
User-Agent: Mozilla/5.0 (...)
Cookie: session=a93f...c02e
Referer: https://example.com/dashboard
Accept: text/html
```

Three parts matter most. The **path** (`/account/profile`) tells the
server which resource you want. The **query string** (everything
after the `?`) passes parameters as plain key-value pairs --
`user_id=4471` and `view=summary` here -- and it's fully visible in
the URL bar, browser history, and server access logs, which is exactly
why it's a bad place for anything sensitive. The **headers** carry
metadata about the request: `Cookie` for session state, `Referer` for
where you came from, `User-Agent` for what client you're claiming to
be. Unlike POST, a GET request has no body -- everything it sends has
to fit in the path, the query string, or the headers, which is part of
why so much application state ends up sitting in a URL where anyone
looking over your shoulder, or your ISP, or a browser history sync
service, can see it.

## Getting Burp in the middle

Burp Suite (the Community edition is free and enough for all of this)
works as an intercepting proxy: your browser sends traffic to Burp
instead of directly to the internet, Burp shows it to you, and only
then forwards it on. Setting that up is three steps:

1. **Point your browser at Burp's proxy listener.** By default Burp
   listens on `127.0.0.1:8080`. Set that as your browser's HTTP/HTTPS
   proxy -- directly in browser settings, or with an extension like
   FoxyProxy if you want to flip it on and off without digging through
   menus every time.
2. **Install Burp's CA certificate.** HTTPS traffic is encrypted
   between your browser and the server, so to read it Burp has to
   terminate the TLS connection itself and re-encrypt it with its own
   certificate -- a deliberate, visible man-in-the-middle that you're
   installing on your own machine, not doing to someone else. Visit
   `http://burpsuite` while proxied through Burp, download the CA
   cert, and add it to your browser or OS trust store. Skip this and
   every HTTPS site just throws certificate warnings at you.
3. **Turn on Intercept.** In the Proxy tab, "Intercept is on" pauses
   every request before it leaves your browser, showing you the raw
   text and giving you a chance to edit it. Turn it off once you're
   done actively tampering -- left on, it pauses every request on
   every site you visit, which gets old fast.

## Reading live traffic

With Intercept off but the proxy still running, browse normally and
watch the **Proxy > HTTP History** tab fill up with every request your
browser made -- every image, script, API call, and page load, each one
inspectable after the fact. This alone is worth the setup: it's the
fastest way to see what a page is actually doing under the hood,
including requests to endpoints that never show up in the page source
because JavaScript fired them dynamically. Click any entry and you get
the full raw request on one side, the full raw response on the other.

## Manipulating the request

This is where Burp stops being a packet sniffer and starts being a
testing tool. Right-click any request in the history and send it to
**Repeater**, which lets you edit and resend it as many times as you
want, watching the response change with every tweak -- no need to
re-trigger the action in the browser each time.

A few of the most common things worth trying against a GET request,
assuming you have permission to test the target:

- **Parameter tampering.** If a request reads
  `?user_id=4471&view=summary`, what happens if you change it to
  `4470`? Or `4472`? If the server returns someone else's account
  summary without checking that the logged-in session actually owns
  that `user_id`, you've found an IDOR (Insecure Direct Object
  Reference) -- one of the most common and most consequential bugs in
  real applications, because it usually takes nothing but changing one
  number.
- **Path and value fuzzing.** Try unexpected values in numeric fields
  (negative numbers, zero, absurdly large numbers, non-numeric
  strings), path traversal sequences like `../../etc/passwd` in any
  parameter that looks like it might reference a filename, and
  boolean-ish values (`true`/`false`, `0`/`1`) in flags you weren't
  meant to control.
- **Header manipulation.** The `Referer` and `User-Agent` headers are
  entirely client-supplied and trivially fake -- if an application
  makes an access decision based on either one ("only allow this if
  they came from our own site"), that check is worth pressure-testing.
  Editing the `Cookie` header directly lets you test session handling
  without touching browser dev tools at all.
- **Batch testing with Intruder.** Once you've found one parameter
  worth poking, Intruder automates sending the same request with a
  list of substituted values -- a range of IDs, a wordlist, a set of
  payloads -- and tables the responses so you can spot the one that
  behaved differently (a different status code, a different response
  length, a different piece of data that shouldn't be there).

None of this requires writing code. It requires noticing that a
request is just text, and that the server has no way of knowing
whether that text came from your browser doing what it was told or
from you doing something else with the same shape.

## Where it breaks

- **Client-supplied values are not access control.** Any check based
  on a `user_id` in the query string, a `Referer` header, or a hidden
  form field is a check the client controls entirely -- the fix is
  verifying on the server, against the authenticated session, that the
  requester is actually allowed to see the resource being asked for,
  every time, not just when the request "looks normal."
- **Sensitive data doesn't belong in a GET request at all.** Query
  strings get logged by servers, proxies, and browser history, and
  cached by browsers and CDNs, all by design. Anything that
  identifies a user or authorizes an action should ride in a POST body
  or a header, not a URL parameter, regardless of how convenient the
  URL parameter is to implement.
- **Rate limiting turns manual tampering into an actual barrier
  against Intruder.** A handful of requests per second per session or
  IP doesn't slow down a real user, but it makes automated parameter
  sweeps take long enough, and generate enough log noise, to be
  noticed and stopped before they finish.
- **Input validation belongs on the server, as an allowlist, not a
  denylist.** Blocking known-bad patterns (`../`, `<script>`) only
  ever covers the patterns someone thought of in advance. Defining
  what a valid `user_id` or `view` value looks like and rejecting
  everything else closes the door on the payloads nobody's tried yet
  too.
- **TLS termination in the middle is detectable, and that's the
  point.** Certificate pinning and HSTS exist specifically so a
  Burp-style proxy can't silently sit between a real user and your
  application without the client noticing something's wrong --
  because the same technique that makes testing your own app
  possible is exactly what an attacker needs on someone else's
  network.
