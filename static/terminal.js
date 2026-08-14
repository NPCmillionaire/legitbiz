(function () {
  var output = document.getElementById("term-output");
  var input = document.getElementById("term-input");
  var promptEl = document.getElementById("term-prompt");
  var history = [];
  var historyIndex = -1;
  var sessionStart = Date.now();
  var cwd = "/srv/http";

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

  function findPost(name) {
    name = name.replace(/\.md$/, "");
    return window.__POSTS__.find(function (p) {
      return p.slug === name;
    });
  }

  function resolveFile(name) {
    name = name.replace(/\.md$/, "");
    if (name === "about") {
      return { title: "whoami", body: window.__ABOUT_BODY__ || "" };
    }
    var p = findPost(name);
    if (p) {
      return { title: p.title, body: p.body || "" };
    }
    return null;
  }

  var FILE_ARG_COMMANDS = ["cat", "head", "tail", "wc"];

  function fileCandidates() {
    var list = window.__POSTS__.map(function (p) {
      return p.slug + ".md";
    });
    list.push("about.md");
    return list;
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
      candidates = fileCandidates().filter(function (f) {
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
        input.value = tokens.join(" ") + " ";
      }
    } else {
      printEcho(value);
      println(candidates.join("  "));
      scrollToBottom();
    }
  }

  var manual = {
    help: "help - show available commands",
    ls: "ls - list posts",
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
      println("  ls            list posts");
      println("  cat <file>    open a post (or about.md)");
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
      println("tips: Tab completes commands/files, ctrl+r searches history, && chains commands");
    },
    ls: function () {
      window.__POSTS__.forEach(function (p) {
        println("-rw-r--r--  " + p.date + "  " + p.slug + ".md");
      });
      println("-rw-r--r--  ----------  about.md");
    },
    cat: function (args) {
      var name = args[0];
      if (!name) {
        println("usage: cat <file>");
        return;
      }
      if (name === "about.md" || name === "about") {
        window.location.href = window.__ABOUT_URL__;
        return;
      }
      var post = findPost(name);
      if (post) {
        window.location.href = post.permalink;
        return;
      }
      println("cat: " + name + ": No such file or directory");
    },
    whoami: function () {
      window.location.href = window.__ABOUT_URL__;
    },
    pwd: function () {
      println(cwd);
    },
    cd: function (args) {
      var target = args[0] || "/srv/http";
      if (target === "posts" && cwd === "/srv/http") {
        cwd = "/srv/http/posts";
        return;
      }
      if (target === ".." && cwd === "/srv/http/posts") {
        cwd = "/srv/http";
        return;
      }
      if (target === "/" || target === "~" || target === "/srv/http") {
        cwd = "/srv/http";
        return;
      }
      println("cd: " + target + ": No such file or directory");
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
      window.__POSTS__.forEach(function (p) {
        if ((p.slug + ".md").toLowerCase().indexOf(q) !== -1) {
          matches.push("./posts/" + p.slug + ".md");
        }
      });
      if ("about.md".indexOf(q) !== -1) {
        matches.push("./about.md");
      }
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
      window.__POSTS__.forEach(function (p) {
        if (
          p.title.toLowerCase().indexOf(q) !== -1 ||
          (p.body || "").toLowerCase().indexOf(q) !== -1
        ) {
          matches.push(p.slug + ".md");
        }
      });
      if ((window.__ABOUT_BODY__ || "").toLowerCase().indexOf(q) !== -1) {
        matches.push("about.md");
      }
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
      println("├── about.md");
      println("└── posts/");
      window.__POSTS__.forEach(function (p, i) {
        var last = i === window.__POSTS__.length - 1;
        println("    " + (last ? "└── " : "├── ") + p.slug + ".md");
      });
    },
    head: function (args) {
      var name = args[0];
      if (!name) {
        println("usage: head <file> [n]");
        return;
      }
      var n = parseInt(args[1], 10);
      if (isNaN(n) || n <= 0) n = 20;
      var f = resolveFile(name);
      if (!f) {
        println("head: " + name + ": No such file or directory");
        return;
      }
      var words = f.body.split(/\s+/).filter(Boolean);
      println(words.slice(0, n).join(" ") + (words.length > n ? " ..." : ""));
    },
    tail: function (args) {
      var name = args[0];
      if (!name) {
        println("usage: tail <file> [n]");
        return;
      }
      var n = parseInt(args[1], 10);
      if (isNaN(n) || n <= 0) n = 20;
      var f = resolveFile(name);
      if (!f) {
        println("tail: " + name + ": No such file or directory");
        return;
      }
      var words = f.body.split(/\s+/).filter(Boolean);
      println((words.length > n ? "... " : "") + words.slice(Math.max(0, words.length - n)).join(" "));
    },
    wc: function (args) {
      var name = args[0];
      if (!name) {
        println("usage: wc <file>");
        return;
      }
      var f = resolveFile(name);
      if (!f) {
        println("wc: " + name + ": No such file or directory");
        return;
      }
      var lines = f.body.split("\n").filter(function (l) {
        return l.trim().length > 0;
      }).length;
      var words = f.body.split(/\s+/).filter(Boolean).length;
      var chars = f.body.length;
      println("  " + lines + "  " + words + "  " + chars + "  " + name);
    },
    stats: function () {
      var totalWords = 0;
      window.__POSTS__.forEach(function (p) {
        totalWords += (p.body || "").split(/\s+/).filter(Boolean).length;
      });
      println(window.__POSTS__.length + " posts, " + totalWords + " words total");
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
