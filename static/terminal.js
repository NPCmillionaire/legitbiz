(function () {
  var output = document.getElementById("term-output");
  var input = document.getElementById("term-input");
  var promptEl = document.getElementById("term-prompt");
  var history = [];
  var historyIndex = -1;
  var sessionStart = Date.now();

  var HISTORY_KEY = "term_history";
  try {
    var saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    if (Array.isArray(saved)) {
      history = saved;
    }
  } catch (e) {}
  historyIndex = history.length;

  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-200)));
    } catch (e) {}
  }

  // ---------------------------------------------------------------------
  // output ordering: newest command block goes on top, like scrolling a
  // real terminal up to see the past. Lines *within* one command's output
  // still need to read top-to-bottom, so each command's lines are built
  // into a detached "block" first, and the whole block is prepended once
  // the command finishes -- only whole blocks reorder, not individual
  // lines inside them.
  // ---------------------------------------------------------------------
  var currentBlock = null;

  function beginBlock() {
    var block = document.createElement("div");
    currentBlock = block;
    return block;
  }

  function endBlock(block) {
    output.insertBefore(block, output.firstChild);
    currentBlock = null;
  }

  function appendLine(line) {
    if (currentBlock) {
      currentBlock.appendChild(line);
    } else {
      output.insertBefore(line, output.firstChild);
    }
  }

  function println(text) {
    var line = document.createElement("div");
    line.textContent = text;
    appendLine(line);
  }

  function printEcho(cmd) {
    var line = document.createElement("div");
    line.textContent = "$ " + cmd;
    line.className = "term-echo";
    appendLine(line);
  }

  // clickable file-path line, used by ls/find/grep/tree so clicking a
  // listed file types+runs "cat <path>" instead of requiring it be typed.
  function printFileLink(prefix, name, fullPath, suffix) {
    var line = document.createElement("div");
    if (prefix) line.appendChild(document.createTextNode(prefix));
    var span = document.createElement("span");
    span.className = "term-file";
    span.textContent = name;
    span.tabIndex = 0;
    span.setAttribute("role", "button");
    span.addEventListener("click", function () {
      typeAndRun("cat " + fullPath);
    });
    span.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        typeAndRun("cat " + fullPath);
      }
    });
    line.appendChild(span);
    if (suffix) line.appendChild(document.createTextNode(suffix));
    appendLine(line);
  }

  // clickable external link line, used by pastebin's result -- opens in a
  // new tab instead of running a fake-fs command, since the target isn't
  // part of this site.
  function printExternalLink(prefix, url) {
    var line = document.createElement("div");
    if (prefix) line.appendChild(document.createTextNode(prefix));
    var a = document.createElement("a");
    a.href = url;
    a.textContent = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "term-file";
    line.appendChild(a);
    appendLine(line);
  }

  // clickable directory line, used by ls -- clicking a listed directory
  // cd's into it and lists it, mirroring printFileLink's cat-on-click.
  function printDirLink(prefix, name, fullPath, suffix) {
    var line = document.createElement("div");
    if (prefix) line.appendChild(document.createTextNode(prefix));
    var span = document.createElement("span");
    span.className = "term-file";
    span.textContent = name;
    span.tabIndex = 0;
    span.setAttribute("role", "button");
    span.addEventListener("click", function () {
      typeAndRun("cd " + fullPath + " && ls");
    });
    span.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        typeAndRun("cd " + fullPath + " && ls");
      }
    });
    line.appendChild(span);
    if (suffix) line.appendChild(document.createTextNode(suffix));
    appendLine(line);
  }

  function scrollToLatest() {
    window.scrollTo(0, 0);
  }

  // derives the site root from terminal.js's own script tag rather than
  // hardcoding a path, so internal nav commands still resolve correctly
  // under the GitHub Pages mirror's /legitbiz/ subpath.
  function siteRoot() {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src;
      if (src && /terminal\.js(\?.*)?$/.test(src)) {
        return src.replace(/terminal\.js(\?.*)?$/, "");
      }
    }
    return "/";
  }

  // ---------------------------------------------------------------------
  // pager: full-screen "less"-style viewer for file contents. q/Escape
  // returns to the terminal exactly as it was, like a real pager's
  // alternate-screen restore.
  // ---------------------------------------------------------------------
  var pagerMode = false;
  var pagerEl = document.createElement("div");
  pagerEl.className = "pager";
  pagerEl.tabIndex = -1;
  var pagerBody = document.createElement("div");
  pagerBody.className = "pager-body";
  var pagerStatus = document.createElement("div");
  pagerStatus.className = "pager-status";
  pagerEl.appendChild(pagerBody);
  pagerEl.appendChild(pagerStatus);
  document.body.appendChild(pagerEl);

  function updatePagerStatus(label) {
    var max = pagerBody.scrollHeight - pagerBody.clientHeight;
    var pct = max <= 0 ? 100 : Math.round((pagerBody.scrollTop / max) * 100);
    pagerStatus.textContent = label + " -- " + (max <= 0 ? "ALL" : pct + "%") + " -- q/esc to quit --";
  }

  function openPager(label, text) {
    pagerBody.textContent = text;
    pagerBody.scrollTop = 0;
    pagerMode = true;
    pagerEl.style.display = "flex";
    updatePagerStatus(label);
    pagerEl.focus();
    pagerEl.__label = label;
  }

  // like openPager, but for the one view (whoami) that needs an actual
  // <img> and a real link instead of plain text -- buildFn appends
  // whatever DOM it needs directly into the (cleared) pager body.
  function openPagerRich(label, buildFn) {
    pagerBody.textContent = "";
    buildFn(pagerBody);
    pagerBody.scrollTop = 0;
    pagerMode = true;
    pagerEl.style.display = "flex";
    updatePagerStatus(label);
    pagerEl.focus();
    pagerEl.__label = label;
  }

  function showAbout() {
    openPagerRich("whoami", function (body) {
      var flex = document.createElement("div");
      flex.className = "bio-flex";
      if (window.__ABOUT_IMG__) {
        var img = document.createElement("img");
        img.className = "avatar";
        img.src = window.__ABOUT_IMG__;
        img.alt = "cam";
        flex.appendChild(img);
      }
      var copy = document.createElement("div");
      copy.className = "bio-copy";
      copy.textContent = window.__ABOUT_BODY__ || "(empty)";
      flex.appendChild(copy);
      body.appendChild(flex);

      var cvLine = document.createElement("div");
      cvLine.className = "pager-cv-line";
      cvLine.appendChild(document.createTextNode("Full work history: "));
      var cvLink = document.createElement("a");
      cvLink.className = "term-file";
      cvLink.href = window.__CV_URL__ || "/cv/";
      cvLink.textContent = window.__CV_URL__ || "/cv/";
      cvLine.appendChild(cvLink);
      body.appendChild(cvLine);
    });
  }

  function closePager() {
    pagerMode = false;
    pagerEl.style.display = "none";
    input.focus();
  }

  pagerBody.addEventListener("scroll", function () {
    updatePagerStatus(pagerEl.__label);
  });

  pagerEl.addEventListener("keydown", function (e) {
    var line = 24;
    var page = pagerBody.clientHeight - line;
    switch (e.key) {
      case "q":
      case "Escape":
        e.preventDefault();
        closePager();
        break;
      case "ArrowDown":
      case "j":
        e.preventDefault();
        pagerBody.scrollTop += line;
        break;
      case "ArrowUp":
      case "k":
        e.preventDefault();
        pagerBody.scrollTop -= line;
        break;
      case " ":
      case "PageDown":
      case "f":
        e.preventDefault();
        pagerBody.scrollTop += page;
        break;
      case "b":
      case "PageUp":
        e.preventDefault();
        pagerBody.scrollTop -= page;
        break;
      case "g":
      case "Home":
        e.preventDefault();
        pagerBody.scrollTop = 0;
        break;
      case "G":
      case "End":
        e.preventDefault();
        pagerBody.scrollTop = pagerBody.scrollHeight;
        break;
    }
  });

  // ---------------------------------------------------------------------
  // virtual filesystem: pure data (files/folders), no command logic here.
  // ---------------------------------------------------------------------
  var fs = { type: "dir", children: {} };

  fs.children[".bash_history"] = {
    type: "file",
    title: ".bash_history",
    body:
      "cd /srv/http\n" +
      "zola build\n" +
      "vim config.toml\n" +
      ":wq\n" +
      "rsync -av public/ /srv/http\n" +
      "sudo make me a sandwich\n" +
      "man sudo\n" +
      "rm -rf node_modules\n" +
      "ping legitbiz.xyz\n" +
      "history | grep sudo\n" +
      "# note to self: stop committing at 2am\n",
  };

  fs.children["posts"] = { type: "dir", children: {} };
  window.__POSTS__.forEach(function (p) {
    fs.children["posts"].children[p.slug + ".md"] = {
      type: "file",
      title: p.title,
      date: p.date,
      url: p.permalink,
      body: p.body || "",
    };
  });

  fs.children["whoami"] = {
    type: "dir",
    children: {
      "about.md": {
        type: "file",
        title: "whoami",
        url: window.__ABOUT_URL__,
        body: window.__ABOUT_BODY__ || "",
      },
      "resume.md": {
        type: "file",
        title: "cv",
        url: window.__CV_URL__,
        body: window.__CV_BODY__ || "",
      },
      ".plan": {
        type: "file",
        title: ".plan",
        body:
          "finger(1) is dead but this file doesn't know that yet.\n\n" +
          "current status: still trying to figure out if the terminal or the\n" +
          "blog posts are the actual point of this site.\n\n" +
          "you found this by either guessing the filename or running `ls -a`.\n" +
          "either way, well done.",
      },
    },
  };

  fs.children["music"] = {
    type: "dir",
    children: {
      "playlist.md": {
        type: "file",
        title: "music",
        url: window.__MUSIC_URL__,
        body: window.__MUSIC_BODY__ || "",
      },
    },
  };

  // tools/pastebin/otherStuff are real top-level pages (their own URLs,
  // linked absolutely from the nav bar and from thingsAndStuff's own
  // copy), so they're defined as top-level fs entries and then reused
  // by reference inside thingsAndStuff -- letting both `cd /tools` and
  // `cd thingsAndStuff && cd tools` resolve to the same directory.
  fs.children["tools"] = {
    type: "dir",
    children: {
      "readme.md": {
        type: "file",
        title: "tools",
        url: window.__TOOLS_URL__,
        body: window.__TOOLS_BODY__ || "",
      },
    },
  };

  fs.children["pastebin"] = {
    type: "dir",
    children: {
      "readme.md": {
        type: "file",
        title: "pastebin",
        url: window.__PASTEBIN_URL__,
        body: window.__PASTEBIN_BODY__ || "",
      },
    },
  };

  fs.children["otherStuff"] = {
    type: "dir",
    children: {
      "readme.md": {
        type: "file",
        title: "otherStuff",
        url: window.__OTHERSTUFF_URL__,
        body: window.__OTHERSTUFF_BODY__ || "",
      },
    },
  };

  fs.children["thingsAndStuff"] = {
    type: "dir",
    children: {
      "notes.md": {
        type: "file",
        title: "thingsAndStuff",
        url: window.__THINGS_URL__,
        body: window.__THINGS_BODY__ || "",
      },
      "tools": fs.children["tools"],
      "pastebin": fs.children["pastebin"],
      "otherStuff": fs.children["otherStuff"],
    },
  };

  fs.children["contact"] = {
    type: "dir",
    children: {
      "email.md": {
        type: "file",
        title: "contact",
        url: window.__CONTACT_URL__,
        body: window.__CONTACT_BODY__ || "",
      },
    },
  };

  var cwdPath = [];

  function resolvePath(pathStr, base) {
    if (!pathStr || pathStr === ".") return base.slice();
    if (pathStr === "~" || pathStr === "/") return [];
    var parts;
    if (pathStr.charAt(0) === "/") {
      parts = pathStr.split("/").filter(Boolean);
    } else {
      parts = base.concat(pathStr.split("/").filter(Boolean));
    }
    var resolved = [];
    parts.forEach(function (part) {
      if (part === ".") return;
      if (part === "..") {
        resolved.pop();
        return;
      }
      resolved.push(part);
    });
    return resolved;
  }

  function getNode(pathArr) {
    var node = fs;
    for (var i = 0; i < pathArr.length; i++) {
      if (!node || node.type !== "dir" || !node.children[pathArr[i]]) return null;
      node = node.children[pathArr[i]];
    }
    return node;
  }

  function basename(pathArr) {
    return pathArr.length ? pathArr[pathArr.length - 1] : ".";
  }

  function pathToString(pathArr) {
    return "/srv/http" + (pathArr.length ? "/" + pathArr.join("/") : "");
  }

  function displayPath(pathArr) {
    return "~" + (pathArr.length ? "/" + pathArr.join("/") : "");
  }

  function updatePrompt() {
    if (!promptEl) return;
    promptEl.innerHTML =
      '<span class="prompt-user">cam@arch</span> ' +
      '<span class="prompt-path">' + displayPath(cwdPath) + "</span> " +
      '<span class="prompt-arrow">$</span>';
  }

  function walk(node, pathArr, cb) {
    if (node.type === "file") {
      cb(pathArr, node);
      return;
    }
    Object.keys(node.children)
      .sort()
      .forEach(function (name) {
        walk(node.children[name], pathArr.concat(name), cb);
      });
  }

  // ---------------------------------------------------------------------
  // tab completion
  // ---------------------------------------------------------------------
  var FILE_ARG_COMMANDS = ["cat", "head", "tail", "wc", "cd", "ls"];

  function fileCandidates(partial) {
    var dirPart = "";
    var slashIdx = partial.lastIndexOf("/");
    if (slashIdx !== -1) {
      dirPart = partial.slice(0, slashIdx);
    }
    var dirPath = resolvePath(dirPart, cwdPath);
    var node = getNode(dirPath);
    if (!node || node.type !== "dir") return [];
    return Object.keys(node.children).map(function (name) {
      var prefix = dirPart ? dirPart + "/" : "";
      return prefix + name + (node.children[name].type === "dir" ? "/" : "");
    });
  }

  function handleTabComplete() {
    var value = input.value;
    var endsWithSpace = /\s$/.test(value);
    var tokens = value.split(/\s+/).filter(Boolean);
    var candidates, prefix, isFirstToken;

    if (tokens.length === 0 || (tokens.length === 1 && !endsWithSpace)) {
      prefix = tokens[0] || "";
      candidates = Object.keys(commands).filter(function (c) {
        return c.indexOf(prefix) === 0;
      });
      isFirstToken = true;
    } else {
      var cmdName = tokens[0];
      if (FILE_ARG_COMMANDS.indexOf(cmdName) === -1) {
        return;
      }
      prefix = endsWithSpace ? "" : tokens[tokens.length - 1];
      candidates = fileCandidates(prefix).filter(function (f) {
        return f.indexOf(prefix) === 0;
      });
      isFirstToken = false;
    }

    if (candidates.length === 0) {
      return;
    }
    if (candidates.length === 1) {
      if (isFirstToken) {
        input.value = candidates[0] + " ";
      } else {
        tokens[tokens.length - 1] = candidates[0];
        input.value = tokens.join(" ") + (candidates[0].charAt(candidates[0].length - 1) === "/" ? "" : " ");
      }
    } else {
      var block = beginBlock();
      printEcho(value);
      println(candidates.join("  "));
      endBlock(block);
      scrollToLatest();
    }
  }

  // ---------------------------------------------------------------------
  // commands: verbs that operate on the filesystem above via
  // resolvePath/getNode/walk -- no command hardcodes "posts" or
  // "about.md" directly.
  // ---------------------------------------------------------------------
  var manual = {
    help: "help - show available commands",
    ls: "ls [dir] - list a directory",
    cat: "cat <file> - print/open a file",
    whoami: "whoami - print info about the current user",
    pwd: "pwd - print working directory",
    cd: "cd <dir> - change working directory",
    echo: "echo <text> - display a line of text",
    date: "date - display the current date and time",
    neofetch: "neofetch - display system information",
    history: "history - show command history",
    pastebin: "pastebin - open the pastebin",
    github: "github - open my GitHub profile",
    guestbook: "guestbook - sign the guestbook",
    "bin-lookup": "bin-lookup - open the BIN/IIN lookup tool",
    find: "find <keyword> - search for files by name",
    grep: "grep <keyword> - search file contents for a keyword",
    tree: "tree - list contents of the site in a tree-like format",
    head: "head <file> [n] - output the first n words of a file",
    tail: "tail <file> [n] - output the last n words of a file",
    wc: "wc <file> - print word, line, and character counts",
    stats: "stats - show site statistics",
    uname: "uname [-a] - print system information",
    uptime: "uptime - show how long this session has been running",
    which: "which <command> - locate a command",
    env: "env - print environment variables",
    alias: "alias - list defined aliases",
    contact: "contact - write me a message from right here",
    mail: "mail - alias for contact",
    exit: "exit - close the session",
    clear: "clear - clear the terminal screen",
    man: "man <command> - show the manual page for a command",
  };

  var commands = {
    help: function () {
      println("available commands:");
      println("  ls [dir]      list a directory");
      println("  cat <file>    open a file");
      println("  whoami        about this site");
      println("  pwd           print working directory");
      println("  cd <dir>      change working directory");
      println("  echo <text>   print text back");
      println("  date          show the current date/time");
      println("  neofetch      show fake system info");
      println("  history       show command history");
      println("  pastebin      open the pastebin");
      println("  github        open my GitHub profile");
      println("  guestbook     sign the guestbook");
      println("  bin-lookup    open the BIN/IIN lookup tool");
      println("  find <text>   search for files by name");
      println("  grep <text>   search file contents");
      println("  tree          show site structure");
      println("  head <file>   show the start of a file");
      println("  tail <file>   show the end of a file");
      println("  wc <file>     word/line/char counts");
      println("  stats         site statistics");
      println("  uname         system info");
      println("  uptime        session uptime");
      println("  which <cmd>   locate a command");
      println("  env           print environment variables");
      println("  alias         list aliases");
      println("  contact       write me a message from right here");
      println("  man <cmd>     show manual page for a command");
      println("  exit          close the session");
      println("  clear         clear the screen");
      println("  help          show this message");
      println("");
      println("tips: Tab completes commands/paths, ctrl+r searches history, && chains commands");
    },
    ls: function (args) {
      var showAll = args.indexOf("-a") !== -1;
      var pathArgs = args.filter(function (a) {
        return a.charAt(0) !== "-";
      });
      var target = pathArgs[0] ? resolvePath(pathArgs[0], cwdPath) : cwdPath;
      var node = getNode(target);
      if (!node) {
        println("ls: cannot access '" + (pathArgs[0] || ".") + "': No such file or directory");
        return;
      }
      if (node.type === "file") {
        println(basename(target));
        return;
      }
      var names = Object.keys(node.children)
        .filter(function (name) {
          return showAll || name.charAt(0) !== ".";
        })
        .sort();
      if (names.length === 0) {
        println("(empty)");
        return;
      }
      names.forEach(function (name) {
        var child = node.children[name];
        var fullPath = "/" + target.concat(name).join("/");
        if (child.type === "dir") {
          printDirLink("drwxr-xr-x  ", name, fullPath, "/");
        } else {
          printFileLink("-rw-r--r--  " + (child.date || "----------") + "  ", name, fullPath);
        }
      });
    },
    cat: function (args) {
      var name = args[0];
      if (!name) {
        println("usage: cat <file>");
        return;
      }
      if (/^\/?etc\/passwd\/?$/.test(name)) {
        println("root:x:0:0:root:/root:/bin/bash");
        println("cam:x:1000:1000::/home/cam:/bin/zsh");
        println("");
        println("nice try.");
        return;
      }
      var resolved = resolvePath(name, cwdPath);
      var node = getNode(resolved);
      if (!node) {
        println("cat: " + name + ": No such file or directory");
        return;
      }
      if (node.type === "dir") {
        println("cat: " + name + ": Is a directory");
        return;
      }
      if (resolved.join("/") === "whoami/about.md") {
        showAbout();
        return;
      }
      openPager(node.title || basename(resolved), node.body || "(empty)");
    },
    whoami: function () {
      showAbout();
    },
    pwd: function () {
      println(pathToString(cwdPath));
    },
    cd: function (args) {
      var target = args[0] || "~";
      var resolved = resolvePath(target, cwdPath);
      var node = getNode(resolved);
      if (!node) {
        println("cd: " + target + ": No such file or directory");
        return;
      }
      if (node.type !== "dir") {
        println("cd: " + target + ": Not a directory");
        return;
      }
      cwdPath = resolved;
      updatePrompt();
    },
    echo: function (args) {
      println(args.join(" "));
    },
    date: function () {
      println(new Date().toString());
    },
    neofetch: function () {
      println("cam@arch");
      println("--------");
      println("OS: Arch Linux x86_64");
      println("Host: homelab");
      println("Shell: terminal.js");
      println("Theme: catppuccin-mocha (terminal)");
      println("Terminal: this very box you are looking at");
    },
    history: function () {
      if (history.length === 0) {
        println("(no history yet)");
        return;
      }
      history.forEach(function (cmd, i) {
        println("  " + (i + 1) + "  " + cmd);
      });
    },
    pastebin: function () {
      enterPasteMode();
    },
    github: function () {
      window.location.href = "https://github.com/npcmillionaire";
    },
    guestbook: function () {
      window.location.href = "http://100.111.221.80:8833/guestbook";
    },
    "bin-lookup": function () {
      window.location.href = siteRoot() + "tools/";
    },
    contact: function () {
      enterComposeMode();
    },
    mail: function () {
      enterComposeMode();
    },
    find: function (args) {
      var q = (args[0] || "").toLowerCase();
      if (!q) {
        println("usage: find <keyword>");
        return;
      }
      var matches = [];
      walk(fs, [], function (pathArr) {
        var full = "./" + pathArr.join("/");
        if (full.toLowerCase().indexOf(q) !== -1) matches.push(pathArr);
      });
      if (matches.length === 0) {
        println("find: no matches for '" + q + "'");
        return;
      }
      matches.forEach(function (pathArr) {
        printFileLink("./" + pathArr.slice(0, -1).join("/") + (pathArr.length > 1 ? "/" : ""), basename(pathArr), "/" + pathArr.join("/"));
      });
    },
    grep: function (args) {
      var q = (args[0] || "").toLowerCase();
      if (!q) {
        println("usage: grep <keyword>");
        return;
      }
      var matches = [];
      walk(fs, [], function (pathArr, node) {
        var haystack = ((node.title || "") + " " + (node.body || "")).toLowerCase();
        if (haystack.indexOf(q) !== -1) matches.push(pathArr);
      });
      if (matches.length === 0) {
        println("grep: no matches for '" + q + "'");
        return;
      }
      matches.forEach(function (pathArr) {
        printFileLink("", pathArr.join("/"), "/" + pathArr.join("/"), ": match");
      });
    },
    tree: function () {
      println(".");
      (function printTree(node, prefix, pathArr) {
        var names = Object.keys(node.children)
          .filter(function (name) {
            return name.charAt(0) !== ".";
          })
          .sort();
        names.forEach(function (name, i) {
          var last = i === names.length - 1;
          var branch = last ? "└── " : "├── ";
          var child = node.children[name];
          var childPath = pathArr.concat(name);
          if (child.type === "dir") {
            println(prefix + branch + name + "/");
            printTree(child, prefix + (last ? "    " : "│   "), childPath);
          } else {
            printFileLink(prefix + branch, name, "/" + childPath.join("/"));
          }
        });
      })(fs, "", []);
    },
    head: function (args) {
      var name = args[0];
      if (!name) {
        println("usage: head <file> [n]");
        return;
      }
      var node = getNode(resolvePath(name, cwdPath));
      if (!node || node.type !== "file") {
        println("head: " + name + ": No such file or directory");
        return;
      }
      var n = parseInt(args[1], 10);
      if (isNaN(n) || n <= 0) n = 20;
      var words = node.body.split(/\s+/).filter(Boolean);
      println(words.slice(0, n).join(" ") + (words.length > n ? " ..." : ""));
    },
    tail: function (args) {
      var name = args[0];
      if (!name) {
        println("usage: tail <file> [n]");
        return;
      }
      var node = getNode(resolvePath(name, cwdPath));
      if (!node || node.type !== "file") {
        println("tail: " + name + ": No such file or directory");
        return;
      }
      var n = parseInt(args[1], 10);
      if (isNaN(n) || n <= 0) n = 20;
      var words = node.body.split(/\s+/).filter(Boolean);
      println((words.length > n ? "... " : "") + words.slice(Math.max(0, words.length - n)).join(" "));
    },
    wc: function (args) {
      var name = args[0];
      if (!name) {
        println("usage: wc <file>");
        return;
      }
      var node = getNode(resolvePath(name, cwdPath));
      if (!node || node.type !== "file") {
        println("wc: " + name + ": No such file or directory");
        return;
      }
      var lines = node.body.split("\n").filter(function (l) {
        return l.trim().length > 0;
      }).length;
      var words = node.body.split(/\s+/).filter(Boolean).length;
      var chars = node.body.length;
      println("  " + lines + "  " + words + "  " + chars + "  " + name);
    },
    stats: function () {
      var fileCount = 0;
      var totalWords = 0;
      walk(fs, [], function (pathArr, node) {
        fileCount += 1;
        totalWords += (node.body || "").split(/\s+/).filter(Boolean).length;
      });
      println(fileCount + " files, " + totalWords + " words total");
    },
    uname: function (args) {
      if (args[0] === "-a") {
        println("Linux arch 7.1.6-arch1-1 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux");
      } else {
        println("Linux");
      }
    },
    uptime: function () {
      var seconds = Math.floor((Date.now() - sessionStart) / 1000);
      var m = Math.floor(seconds / 60);
      var s = seconds % 60;
      println("up " + m + " min " + s + " sec (this session)");
    },
    which: function (args) {
      var name = args[0];
      if (!name) {
        println("usage: which <command>");
        return;
      }
      if (Object.prototype.hasOwnProperty.call(commands, name)) {
        println("/usr/bin/" + name);
      } else {
        println(name + ": not found");
      }
    },
    env: function () {
      println("USER=cam");
      println("SHELL=/bin/zsh");
      println("HOME=/home/cam");
      println("HOSTNAME=arch");
      println("TERM=xterm-256color");
    },
    alias: function () {
      println("no aliases defined");
    },
    man: function (args) {
      var name = args[0];
      if (!name) {
        println("what manual page do you want?");
        return;
      }
      if (manual[name]) {
        println(manual[name]);
      } else {
        println("No manual entry for " + name);
      }
    },
    exit: function () {
      println("goodbye.");
      window.close();
      setTimeout(function () {
        println("(can't close this tab automatically -- close it yourself)");
      }, 300);
    },
    sudo: function (args) {
      if (args.join(" ") === "make me a sandwich") {
        println("okay.");
        return;
      }
      println("cam is not in the sudoers file. This incident will be reported.");
    },
    clear: function () {
      output.innerHTML = "";
      if (currentBlock) currentBlock.innerHTML = "";
    },
    rm: function (args) {
      var flags = args
        .filter(function (a) {
          return a.charAt(0) === "-";
        })
        .join("");
      var targets = args.filter(function (a) {
        return a.charAt(0) !== "-";
      });
      var wantsForce = /r/.test(flags) && /f/.test(flags);
      var targetsRoot = targets.some(function (t) {
        return t === "/" || t === "/*" || t === "~" || t === "*";
      });
      if (wantsForce && targetsRoot) {
        println("deleting /...");
        var steps = ["/bin", "/etc", "/home", "/usr", "/var"];
        steps.forEach(function (s, i) {
          setTimeout(function () {
            println("rm: removing " + s);
            scrollToLatest();
          }, (i + 1) * 350);
        });
        setTimeout(function () {
          println("...just kidding. nice try though.");
          scrollToLatest();
        }, (steps.length + 1) * 350);
        return;
      }
      println("rm: this is a static site. there is nothing to remove.");
    },
    xyzzy: function () {
      println("Nothing happens.");
    },
    fortune: function () {
      var quotes = [
        "There are only two hard problems in computer science: cache invalidation and naming things.",
        "It's not a bug, it's an undocumented feature.",
        "The S in IoT stands for Security.",
        "99 little bugs in the code, 99 little bugs. take one down, patch it around, 127 little bugs in the code.",
        "There is no cloud, just someone else's computer.",
        "chmod -R 777 has never once solved the actual problem.",
        "weeks of coding can save you hours of planning.",
        "the only secure system is one that's powered off, unplugged, and buried in a field.",
      ];
      println(quotes[Math.floor(Math.random() * quotes.length)]);
    },
    cowsay: function (args) {
      var text = args.join(" ") || "moo";
      var repeat = function (ch, n) {
        return new Array(n + 1).join(ch);
      };
      println(" " + repeat("_", text.length + 2));
      println("< " + text + " >");
      println(" " + repeat("-", text.length + 2));
      println("        \\   ^__^");
      println("         \\  (oo)\\_______");
      println("            (__)\\       )\\/\\");
      println("                ||----w |");
      println("                ||     ||");
    },
    "42": function () {
      println("the answer to life, the universe, and everything.");
    },
    vim: function () {
      println("entering vim...");
      println("type :wq to exit (you can't, there's no vim here)");
    },
    id: function () {
      println("uid=1000(cam) gid=1000(cam) groups=1000(cam),998(wheel),100(users)");
      println("mostly harmless.");
    },
    hunter2: function () {
      println("look, all I see is *******");
    },
    hack: function () {
      var block = beginBlock();
      var lines = [
        "initializing exploit framework...",
        "scanning ports on 127.0.0.1...",
        "bypassing firewall...",
        "cracking encryption (AES-256, this may take a while)...",
        "decrypting mainframe...",
        "rerouting through 3 proxies...",
        "uploading virus...",
        "ACCESS GRANTED",
      ];
      lines.forEach(function (line, i) {
        setTimeout(function () {
          println(line);
          scrollToLatest();
        }, i * 350);
      });
      setTimeout(function () {
        println("");
        println("(not really. this is a static site with no backend to hack.)");
        scrollToLatest();
      }, lines.length * 350 + 200);
      endBlock(block);
    },
    matrix: function () {
      var canvas = document.createElement("canvas");
      canvas.className = "matrix-rain";
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      document.body.appendChild(canvas);
      var ctx = canvas.getContext("2d");

      var chars = "アイウエオカキクケコサシスセソタチツテト0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      var fontSize = 16;
      var columns = Math.floor(canvas.width / fontSize);
      var drops = [];
      for (var i = 0; i < columns; i++) {
        drops[i] = Math.random() * -50;
      }

      function draw() {
        ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#3f3";
        ctx.font = fontSize + "px monospace";
        for (var i = 0; i < drops.length; i++) {
          var ch = chars.charAt(Math.floor(Math.random() * chars.length));
          ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
          if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i] += 1;
        }
      }

      var timer = setInterval(draw, 40);
      println("wake up, cam...");
      setTimeout(function () {
        clearInterval(timer);
        canvas.parentNode.removeChild(canvas);
      }, 5000);
    },
    fingerprint: function () {
      function canvasHash() {
        try {
          var canvas = document.createElement("canvas");
          var ctx = canvas.getContext("2d");
          ctx.textBaseline = "top";
          ctx.font = "14px 'Arial'";
          ctx.fillStyle = "#f60";
          ctx.fillRect(0, 0, 100, 20);
          ctx.fillStyle = "#069";
          ctx.fillText("fingerprint", 2, 2);
          var data = canvas.toDataURL();
          var hash = 0;
          for (var i = 0; i < data.length; i++) {
            hash = (hash << 5) - hash + data.charCodeAt(i);
            hash |= 0;
          }
          return (hash >>> 0).toString(16);
        } catch (e) {
          return "unavailable";
        }
      }
      var langs = navigator.languages ? navigator.languages.join(", ") : navigator.language;
      var tz = "unknown";
      try {
        tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch (e) {}
      println("browser fingerprint (client-side only -- nothing leaves this page):");
      println("  user agent     " + navigator.userAgent);
      println("  platform       " + (navigator.platform || "unknown"));
      println("  language(s)    " + langs);
      println("  screen         " + screen.width + "x" + screen.height + " @ " + (window.devicePixelRatio || 1) + "x, " + screen.colorDepth + "-bit");
      println("  viewport       " + window.innerWidth + "x" + window.innerHeight);
      println("  timezone       " + tz + " (UTC" + (-new Date().getTimezoneOffset() / 60) + ")");
      println("  cpu cores      " + (navigator.hardwareConcurrency || "unknown"));
      println("  device memory  " + (navigator.deviceMemory ? navigator.deviceMemory + "GB" : "unknown"));
      println("  cookies        " + (navigator.cookieEnabled ? "enabled" : "disabled"));
      println("  do-not-track   " + (navigator.doNotTrack || "unspecified"));
      println("  canvas hash    " + canvasHash());
      println("");
      println("this is roughly what every ad network already knows about you.");
    },
    noemie: function () {
      println("                __");
      println("             .-'  |");
      println("            /   <\\|");
      println("           /     \\'");
      println("           |_.- o-o");
      println("           / C  -._)\\");
      println("          /',        |");
      println("         |   `-,_,__,'");
      println("         (,,)====[_]=|");
      println("           '.   ____/");
      println("            | -|-|_");
      println("            |____)_)    [daddy loves you forever]");
      println("");
      println("daddy luvs u gnome!");
    },
  };

  // ---------------------------------------------------------------------
  // live autosuggest: a dropdown of matching commands shown while typing
  // the first token, ranked by how often *you've* used them (falling back
  // to a curated "popular first" order for anything unused this session).
  // Mouse click fills the command in -- it doesn't run it, since most of
  // these still need an argument (cat <file>, cd <dir>, ...).
  // ---------------------------------------------------------------------
  var POPULAR_ORDER = ["ls", "cat", "cd", "help", "whoami", "tree", "find", "grep", "contact", "github", "pastebin", "guestbook", "history", "man", "clear"];

  var suggestEl = document.createElement("div");
  suggestEl.className = "term-suggest";
  var inputLine = document.querySelector(".term-input-line");
  if (inputLine) inputLine.appendChild(suggestEl);

  var suggestItems = [];
  var suggestIndex = -1;

  function highlightSuggestion(index) {
    suggestItems.forEach(function (it, i) {
      if (i === index) {
        it.el.classList.add("term-suggest-item-active");
        it.el.scrollIntoView({ block: "nearest" });
      } else {
        it.el.classList.remove("term-suggest-item-active");
      }
    });
  }

  function rankedCommandNames() {
    var freqMap = {};
    history.forEach(function (h) {
      var n = h.trim().split(/\s+/)[0];
      if (n) freqMap[n] = (freqMap[n] || 0) + 1;
    });
    return Object.keys(commands).sort(function (a, b) {
      var fa = freqMap[a] || 0;
      var fb = freqMap[b] || 0;
      if (fa !== fb) return fb - fa;
      var ia = POPULAR_ORDER.indexOf(a);
      var ib = POPULAR_ORDER.indexOf(b);
      if (ia === -1) ia = POPULAR_ORDER.length;
      if (ib === -1) ib = POPULAR_ORDER.length;
      if (ia !== ib) return ia - ib;
      return a < b ? -1 : a > b ? 1 : 0;
    });
  }

  function hideSuggestions() {
    suggestEl.style.display = "none";
    suggestEl.innerHTML = "";
    suggestItems = [];
    suggestIndex = -1;
  }

  function updateSuggestions() {
    var value = input.value;
    if (value.length === 0 || /\s/.test(value)) {
      hideSuggestions();
      return;
    }
    var matches = rankedCommandNames()
      .filter(function (name) {
        return name.indexOf(value) === 0 && name !== value;
      })
      .slice(0, 6);
    if (matches.length === 0) {
      hideSuggestions();
      return;
    }
    suggestEl.innerHTML = "";
    suggestItems = [];
    suggestIndex = -1;
    matches.forEach(function (name) {
      var item = document.createElement("div");
      item.className = "term-suggest-item";
      var matched = document.createElement("span");
      matched.className = "term-suggest-match";
      matched.textContent = value;
      var rest = document.createElement("span");
      rest.className = "term-suggest-rest";
      rest.textContent = name.slice(value.length);
      item.appendChild(matched);
      item.appendChild(rest);
      if (manual[name]) {
        var descEl = document.createElement("span");
        descEl.className = "term-suggest-desc";
        var dashIdx = manual[name].indexOf("-");
        descEl.textContent = " " + (dashIdx !== -1 ? manual[name].slice(dashIdx) : manual[name]);
        item.appendChild(descEl);
      }
      // mousedown (not click) fires before the input blurs, so the fill
      // happens before focus would otherwise move away.
      item.addEventListener("mousedown", function (e) {
        e.preventDefault();
        input.value = name + " ";
        hideSuggestions();
        input.focus();
      });
      suggestEl.appendChild(item);
      suggestItems.push({ el: item, name: name });
    });
    suggestEl.style.display = "block";
  }

  // Tab (and Shift+Tab) cycles the highlighted suggestion and fills it into
  // the input, like a real shell's menu-complete -- repeated Tab presses
  // step through candidates instead of just completing a single match.
  function cycleSuggestion(backward) {
    if (suggestItems.length === 0) return false;
    if (backward) {
      suggestIndex = suggestIndex <= 0 ? suggestItems.length - 1 : suggestIndex - 1;
    } else {
      suggestIndex = (suggestIndex + 1) % suggestItems.length;
    }
    highlightSuggestion(suggestIndex);
    input.value = suggestItems[suggestIndex].name + " ";
    return true;
  }

  function runSingle(cmdline) {
    var parts = cmdline.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return;
    var name = parts[0];
    var args = parts.slice(1);
    if (Object.prototype.hasOwnProperty.call(commands, name)) {
      commands[name](args);
    } else {
      println(name + ": command not found");
    }
  }

  function run(cmdline) {
    var segments = cmdline.split(/\s*&&\s*/);
    for (var i = 0; i < segments.length; i++) {
      if (segments[i].trim().length > 0) {
        runSingle(segments[i]);
      }
    }
  }

  // ---------------------------------------------------------------------
  // ctrl+r reverse history search
  // ---------------------------------------------------------------------
  var searchMode = false;
  var searchQuery = "";
  var searchMatch = "";
  var searchFromIndex = history.length;
  var preSearchValue = "";

  function updateSearchPrompt() {
    if (promptEl) {
      promptEl.textContent = "(reverse-i-search)'" + searchQuery + "': " + searchMatch;
    }
  }

  function findMatch(query, fromIndex) {
    if (!query) return "";
    for (var i = fromIndex - 1; i >= 0; i--) {
      if (history[i].indexOf(query) !== -1) {
        searchFromIndex = i;
        return history[i];
      }
    }
    return "";
  }

  function enterSearchMode() {
    searchMode = true;
    searchQuery = "";
    searchMatch = "";
    searchFromIndex = history.length;
    preSearchValue = input.value;
    input.value = "";
    updateSearchPrompt();
  }

  function exitSearchMode(restore) {
    searchMode = false;
    updatePrompt();
    if (restore) {
      input.value = preSearchValue;
    }
  }

  // ---------------------------------------------------------------------
  // contact: two-step compose mode (reply-to email, then message) that
  // hijacks the input line the same way ctrl+r search does below, then
  // ships the message via EmailJS straight from the browser -- no
  // backend on this box handles mail, so the send call is client-side.
  // ---------------------------------------------------------------------
  var composeMode = null; // null | "email" | "message"
  var composeEmail = "";

  function enterComposeMode() {
    hideSuggestions();
    composeMode = "email";
    composeEmail = "";
    input.value = "";
    if (promptEl) promptEl.textContent = "your email (optional, enter to skip) ▸";
  }

  function exitComposeMode() {
    composeMode = null;
    input.value = "";
    updatePrompt();
  }

  function sendContactMessage(email, message) {
    var block = beginBlock();
    println("sending...");
    endBlock(block);
    scrollToLatest();

    if (typeof emailjs === "undefined") {
      var failBlock = beginBlock();
      println("mail client didn't load -- email me directly at npcmillionaire@pm.me");
      endBlock(failBlock);
      scrollToLatest();
      return;
    }

    emailjs.send("service_27aacyq", "template_erogod8", {
      reply_to: email || "(none given)",
      message: message,
    }).then(
      function () {
        var okBlock = beginBlock();
        println("sent -- thanks, I'll get back to you.");
        endBlock(okBlock);
        scrollToLatest();
      },
      function () {
        var errBlock = beginBlock();
        println("send failed -- email me directly at npcmillionaire@pm.me");
        endBlock(errBlock);
        scrollToLatest();
      }
    );
  }

  // ---------------------------------------------------------------------
  // pastebin: drops an actual <textarea> into the output (the single-line
  // #term-input can't hold newlines, which is also why pasting a big
  // block into it gets redirected here -- see the "paste" listener
  // below), then posts it same-origin through /paste-api/ (Apache
  // reverse-proxies that to rustypaste on :8822 so the browser fetch
  // isn't cross-origin) and drops focus back on the real prompt either
  // way, success or cancel.
  // ---------------------------------------------------------------------
  var pasteMode = false;
  var pasteTextarea = null;

  function exitPasteModeUI() {
    pasteMode = false;
    pasteTextarea = null;
    input.disabled = false;
    updatePrompt();
    input.focus();
  }

  function cancelPaste() {
    if (!pasteMode) return;
    var block = beginBlock();
    println("cancelled.");
    endBlock(block);
    exitPasteModeUI();
    scrollToLatest();
  }

  function submitPaste() {
    if (!pasteMode || !pasteTextarea) return;
    var text = pasteTextarea.value;
    if (!text.trim()) {
      var emptyBlock = beginBlock();
      println("nothing to paste.");
      endBlock(emptyBlock);
      exitPasteModeUI();
      scrollToLatest();
      return;
    }

    exitPasteModeUI();

    var block = beginBlock();
    println("uploading...");
    endBlock(block);
    scrollToLatest();

    var blob = new Blob([text], { type: "text/plain" });
    var form = new FormData();
    form.append("file", blob, "paste.txt");

    fetch("/paste-api/", { method: "POST", body: form })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (url) {
        var okBlock = beginBlock();
        printExternalLink("posted: ", url.trim());
        endBlock(okBlock);
        scrollToLatest();
      })
      .catch(function () {
        var errBlock = beginBlock();
        println("upload failed -- try again in a bit.");
        endBlock(errBlock);
        scrollToLatest();
      });
  }

  function enterPasteMode() {
    hideSuggestions();
    pasteMode = true;

    var wrap = document.createElement("div");
    wrap.className = "term-paste";

    var ta = document.createElement("textarea");
    ta.className = "term-paste-box";
    ta.placeholder = "paste or type text here...";
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelPaste();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        submitPaste();
      }
      e.stopPropagation();
    });
    wrap.appendChild(ta);

    var actions = document.createElement("div");
    actions.className = "term-paste-actions";

    var postBtn = document.createElement("span");
    postBtn.className = "term-file";
    postBtn.tabIndex = 0;
    postBtn.setAttribute("role", "button");
    postBtn.textContent = "[ ctrl+enter to post ]";
    postBtn.addEventListener("click", function () { submitPaste(); });
    postBtn.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); submitPaste(); }
    });
    actions.appendChild(postBtn);
    actions.appendChild(document.createTextNode("  "));

    var cancelBtn = document.createElement("span");
    cancelBtn.className = "term-file";
    cancelBtn.tabIndex = 0;
    cancelBtn.setAttribute("role", "button");
    cancelBtn.textContent = "[ esc to cancel ]";
    cancelBtn.addEventListener("click", function () { cancelPaste(); });
    cancelBtn.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cancelPaste(); }
    });
    actions.appendChild(cancelBtn);

    wrap.appendChild(actions);
    appendLine(wrap);

    pasteTextarea = ta;
    input.disabled = true;
    if (promptEl) promptEl.textContent = "pastebin -- ctrl+enter to post, esc to cancel";
    setTimeout(function () { ta.focus(); }, 0);
    scrollToLatest();
  }

  input.addEventListener("keydown", function (e) {
    if (pasteMode) return;
    if (composeMode) {
      if (e.key === "Escape" || (e.ctrlKey && (e.key === "c" || e.key === "C"))) {
        e.preventDefault();
        var cancelBlock = beginBlock();
        println("cancelled.");
        endBlock(cancelBlock);
        exitComposeMode();
        scrollToLatest();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (composeMode === "email") {
          composeEmail = input.value.trim();
          var emailBlock = beginBlock();
          println("> " + (composeEmail || "(skipped)"));
          endBlock(emailBlock);
          composeMode = "message";
          input.value = "";
          if (promptEl) promptEl.textContent = "message (enter to send, ctrl+c to cancel) ▸";
          scrollToLatest();
        } else if (composeMode === "message") {
          var msg = input.value.trim();
          var msgBlock = beginBlock();
          println("> " + (msg || "(empty)"));
          endBlock(msgBlock);
          if (!msg) {
            var emptyBlock = beginBlock();
            println("nothing to send -- cancelled.");
            endBlock(emptyBlock);
            exitComposeMode();
          } else {
            var email = composeEmail;
            exitComposeMode();
            sendContactMessage(email, msg);
          }
          scrollToLatest();
        }
        return;
      }
      return;
    }

    if (e.ctrlKey && (e.key === "r" || e.key === "R")) {
      e.preventDefault();
      if (!searchMode) {
        hideSuggestions();
        enterSearchMode();
      } else {
        searchMatch = findMatch(searchQuery, searchFromIndex);
        updateSearchPrompt();
      }
      return;
    }

    if (searchMode) {
      if (e.key === "Enter") {
        e.preventDefault();
        var toRun = searchMatch || searchQuery;
        exitSearchMode(false);
        input.value = "";
        if (toRun.trim().length > 0) {
          var searchBlock = beginBlock();
          printEcho(toRun);
          history.push(toRun);
          saveHistory();
          historyIndex = history.length;
          run(toRun);
          endBlock(searchBlock);
          scrollToLatest();
        }
        return;
      } else if (e.key === "Escape" || (e.ctrlKey && e.key === "g")) {
        e.preventDefault();
        exitSearchMode(true);
        return;
      }
      return;
    }

    if (e.key === "Enter") {
      var cmdline = input.value;
      var block = beginBlock();
      printEcho(cmdline);
      if (cmdline.trim().length > 0) {
        history.push(cmdline);
        saveHistory();
      }
      historyIndex = history.length;
      run(cmdline);
      endBlock(block);
      input.value = "";
      hideSuggestions();
      scrollToLatest();
    } else if (e.key === "ArrowUp") {
      if (historyIndex > 0) {
        historyIndex -= 1;
        input.value = history[historyIndex];
      }
      hideSuggestions();
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      if (historyIndex < history.length - 1) {
        historyIndex += 1;
        input.value = history[historyIndex];
      } else {
        historyIndex = history.length;
        input.value = "";
      }
      hideSuggestions();
      e.preventDefault();
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (cycleSuggestion(e.shiftKey)) {
        return;
      }
      handleTabComplete();
    } else if (e.key === "Escape") {
      hideSuggestions();
    }
  });

  input.addEventListener("input", function () {
    if (searchMode) {
      searchQuery = input.value;
      searchFromIndex = history.length;
      searchMatch = findMatch(searchQuery, searchFromIndex);
      updateSearchPrompt();
      return;
    }
    updateSuggestions();
  });

  input.addEventListener("paste", function (e) {
    var clipboard = e.clipboardData || window.clipboardData;
    var text = clipboard ? clipboard.getData("text") : "";
    if (text && (text.length > 300 || text.indexOf("\n") !== -1)) {
      e.preventDefault();
      println("that's a lot of text -- try 'pastebin' instead of pasting it here.");
      scrollToLatest();
    }
  });

  function greeting() {
    var hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "good morning.";
    if (hour >= 12 && hour < 18) return "good afternoon.";
    if (hour >= 18 && hour < 23) return "good evening.";
    return "3am and you're reading a homelab blog? respect.";
  }

  function printWelcome() {
    var block = beginBlock();
    println(greeting() + " welcome to cam@arch -- this is a fake but functional terminal.");
    println("type a command and press enter. a few to start with:");
    println("  ls            see what's here");
    println("  cd <dir>      move into whoami/, posts/, music/, contact/, ...");
    println("  cat <file>    open a file");
    println("  help          full command list");
    println("");
    println("tab completes commands/paths, up/down cycles history, ctrl+r searches it, && chains commands.");
    endBlock(block);
  }

  var KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  var konamiProgress = 0;

  function triggerKonami() {
    document.body.classList.add("konami-flash");
    println("↑↑↓↓←→←→ba -- you found it. respect.");
    scrollToLatest();
    setTimeout(function () {
      document.body.classList.remove("konami-flash");
    }, 1200);
  }

  document.addEventListener("keydown", function (e) {
    if (pagerMode) return;
    var expected = KONAMI[konamiProgress];
    if (e.key === expected) {
      konamiProgress += 1;
      if (konamiProgress === KONAMI.length) {
        konamiProgress = 0;
        triggerKonami();
      }
    } else {
      konamiProgress = e.key === KONAMI[0] ? 1 : 0;
    }
  });

  // ---------------------------------------------------------------------
  // header nav: clicking a link types its command into the terminal
  // and runs it, instead of doing a normal navigation.
  // ---------------------------------------------------------------------
  function typeAndRun(cmdline, opts) {
    opts = opts || {};
    if (pagerMode) closePager();
    if (opts.reset) {
      output.innerHTML = "";
    }
    hideSuggestions();
    input.value = "";
    input.focus();
    var i = 0;
    var typer = setInterval(function () {
      input.value += cmdline.charAt(i);
      i += 1;
      if (i >= cmdline.length) {
        clearInterval(typer);
        setTimeout(function () {
          var block = beginBlock();
          printEcho(cmdline);
          history.push(cmdline);
          saveHistory();
          historyIndex = history.length;
          run(cmdline);
          endBlock(block);
          input.value = "";
          scrollToLatest();
        }, 150);
      }
    }, 35);
  }

  Array.prototype.forEach.call(document.querySelectorAll(".site-nav a[data-cmd], .prompt[data-cmd]"), function (link) {
    link.style.cursor = "pointer";
    link.addEventListener("click", function (e) {
      var cmd = link.getAttribute("data-cmd");
      if (!cmd) return;
      e.preventDefault();
      typeAndRun(cmd, { reset: true });
    });
  });

  document.getElementById("terminal").addEventListener("click", function () {
    if (pagerMode) return;
    input.focus();
  });

  updatePrompt();
  printWelcome();
  input.focus();

  // pages like /contact set this before loading terminal.js so landing
  // there drops you straight into the command instead of an empty prompt.
  if (window.__AUTORUN__) {
    setTimeout(function () {
      typeAndRun(window.__AUTORUN__, { reset: false });
    }, 200);
  }
})();
