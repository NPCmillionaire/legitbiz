(function () {
  var output = document.getElementById("term-output");
  var input = document.getElementById("term-input");
  var history = [];
  var historyIndex = -1;

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

  var commands = {
    help: function () {
      println("available commands:");
      println("  ls            list posts");
      println("  cat <file>    open a post (or about.md)");
      println("  whoami        about this site");
      println("  pwd           print working directory");
      println("  echo <text>   print text back");
      println("  date          show the current date/time");
      println("  neofetch      show fake system info");
      println("  history       show command history");
      println("  clear         clear the screen");
      println("  help          show this message");
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
      println("/srv/http");
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
    sudo: function (args) {
      println("cam is not in the sudoers file. This incident will be reported.");
    },
    clear: function () {
      output.innerHTML = "";
    },
  };

  function run(cmdline) {
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

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      var cmdline = input.value;
      printEcho(cmdline);
      if (cmdline.trim().length > 0) {
        history.push(cmdline);
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
    }
  });

  document.getElementById("terminal").addEventListener("click", function () {
    input.focus();
  });

  input.focus();
})();
