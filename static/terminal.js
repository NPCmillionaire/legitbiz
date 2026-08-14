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

  function println(text) {
    var line = document.createElement("div");
    line.textContent = text;
    output.appendChild(line);
  }

  function printEcho(cmd) {
    var line = document.createElement("div");
    line.textContent = "$ " + cmd;
    line.className = "term-echo";
    output.appendChild(line);
  }

  function scrollToBottom() {
    output.scrollTop = output.scrollHeight;
  }

  // ---------------------------------------------------------------------
  // virtual filesystem: pure data (files/folders), no command logic here.
  // ---------------------------------------------------------------------
  var fs = { type: "dir", children: {} };

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

  fs.children["thingsAndStuff"] = {
    type: "dir",
    children: {
      "notes.md": {
        type: "file",
        title: "thingsAndStuff",
        url: window.__THINGS_URL__,
        body: window.__THINGS_BODY__ || "",
      },
    },
  };

  fs.children["cv"] = {
    type: "dir",
    children: {
      "resume.md": {
        type: "file",
        title: "cv",
        url: window.__CV_URL__,
        body: window.__CV_BODY__ || "",
      },
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
      printEcho(value);
      println(candidates.join("  "));
      scrollToBottom();
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
      println("  man <cmd>     show manual page for a command");
      println("  exit          close the session");
      println("  clear         clear the screen");
      println("  help          show this message");
      println("");
      println("tips: Tab completes commands/paths, ctrl+r searches history, && chains commands");
    },
    ls: function (args) {
      var target = args[0] ? resolvePath(args[0], cwdPath) : cwdPath;
      var node = getNode(target);
      if (!node) {
        println("ls: cannot access '" + (args[0] || ".") + "': No such file or directory");
        return;
      }
      if (node.type === "file") {
        println(basename(target));
        return;
      }
      var names = Object.keys(node.children).sort();
      if (names.length === 0) {
        println("(empty)");
        return;
      }
      names.forEach(function (name) {
        var child = node.children[name];
        if (child.type === "dir") {
          println("drwxr-xr-x  " + name + "/");
        } else {
          println("-rw-r--r--  " + (child.date || "----------") + "  " + name);
        }
      });
    },
    cat: function (args) {
      var name = args[0];
      if (!name) {
        println("usage: cat <file>");
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
      window.location.href = node.url;
    },
    whoami: function () {
      window.location.href = window.__ABOUT_URL__;
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
      window.location.href = "http://100.111.221.80:8822/";
    },
    github: function () {
      window.location.href = "https://github.com/npcmillionaire";
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
        if (full.toLowerCase().indexOf(q) !== -1) matches.push(full);
      });
      if (matches.length === 0) {
        println("find: no matches for '" + q + "'");
        return;
      }
      matches.forEach(function (m) {
        println(m);
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
        if (haystack.indexOf(q) !== -1) matches.push(pathArr.join("/"));
      });
      if (matches.length === 0) {
        println("grep: no matches for '" + q + "'");
        return;
      }
      matches.forEach(function (m) {
        println(m + ": match");
      });
    },
    tree: function () {
      println(".");
      (function printTree(node, prefix) {
        var names = Object.keys(node.children).sort();
        names.forEach(function (name, i) {
          var last = i === names.length - 1;
          var branch = last ? "└── " : "├── ";
          var child = node.children[name];
          println(prefix + branch + name + (child.type === "dir" ? "/" : ""));
          if (child.type === "dir") {
            printTree(child, prefix + (last ? "    " : "│   "));
          }
        });
      })(fs, "");
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
      println("cam is not in the sudoers file. This incident will be reported.");
    },
    clear: function () {
      output.innerHTML = "";
    },
  };

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
    if (promptEl) {
      promptEl.textContent = "$";
    }
    if (restore) {
      input.value = preSearchValue;
    }
  }

  input.addEventListener("keydown", function (e) {
    if (e.ctrlKey && (e.key === "r" || e.key === "R")) {
      e.preventDefault();
      if (!searchMode) {
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
          printEcho(toRun);
          history.push(toRun);
          saveHistory();
          historyIndex = history.length;
          run(toRun);
          scrollToBottom();
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
      printEcho(cmdline);
      if (cmdline.trim().length > 0) {
        history.push(cmdline);
        saveHistory();
      }
      historyIndex = history.length;
      run(cmdline);
      input.value = "";
      scrollToBottom();
    } else if (e.key === "ArrowUp") {
      if (historyIndex > 0) {
        historyIndex -= 1;
        input.value = history[historyIndex];
      }
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      if (historyIndex < history.length - 1) {
        historyIndex += 1;
        input.value = history[historyIndex];
      } else {
        historyIndex = history.length;
        input.value = "";
      }
      e.preventDefault();
    } else if (e.key === "Tab") {
      e.preventDefault();
      handleTabComplete();
    }
  });

  input.addEventListener("input", function () {
    if (searchMode) {
      searchQuery = input.value;
      searchFromIndex = history.length;
      searchMatch = findMatch(searchQuery, searchFromIndex);
      updateSearchPrompt();
    }
  });

  input.addEventListener("paste", function (e) {
    var clipboard = e.clipboardData || window.clipboardData;
    var text = clipboard ? clipboard.getData("text") : "";
    if (text && (text.length > 300 || text.indexOf("\n") !== -1)) {
      e.preventDefault();
      println("that's a lot of text -- try 'pastebin' instead of pasting it here.");
      scrollToBottom();
    }
  });

  document.getElementById("terminal").addEventListener("click", function () {
    input.focus();
  });

  input.focus();
})();
