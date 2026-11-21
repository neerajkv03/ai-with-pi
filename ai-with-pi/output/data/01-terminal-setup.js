window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "01-terminal-setup",
  "order": 1,
  "title": "Terminal & Setup on Windows",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "You learn what a terminal and a shell are, how to move around folders by typing, and how to install Node.js, Git and Pi on Windows. You finish by creating the `pi-lab` practice folder as a git repository and connecting Pi to a model provider (a company that serves AI models over the internet), so Pi can answer your first message.",
  "prerequisites": [],
  "subtopics": [
    {
      "id": "what-a-terminal-is",
      "title": "What a terminal is (PowerShell vs Git Bash)",
      "explanation": "A terminal is a window where you type text commands instead of clicking buttons. A shell is the program inside that window that reads what you type, runs it, and prints the result. The terminal is only the window; the shell does the work.\n\nWindows ships with a shell called PowerShell. Git for Windows (installed later in this topic) adds a second shell called Git Bash. Bash is the shell used on Linux and Mac, and Git Bash is a copy of it for Windows. Both shells run in a terminal window, but they speak different command dialects. For example, a command that sets a variable (a named container for a value) in Bash does not work in PowerShell.\n\nYou can tell which shell you are in from the prompt, the text printed before your cursor. PowerShell shows something like `PS C:\\Users\\you>`. Git Bash shows something like `you@PC MINGW64 ~ $`. Always glance at the prompt before typing a command.\n\nThis matters for Pi, the coding agent you will install. An agent harness (a program that lets an AI model use tools on your machine) runs shell commands for the model. On Windows, Pi's bash tool needs Git Bash. Knowing which shell runs a command helps you avoid errors such as 'command not found'.\n\nTo open PowerShell: press the Windows key, type `PowerShell`, press Enter. To open Git Bash (after installing Git for Windows): press the Windows key, type `Git Bash`, press Enter.",
      "analogy": "The terminal is a phone handset. The shell is the person on the other end of the line who listens and does what you ask. PowerShell and Bash are two different people who speak different dialects. You use the same handset to call either of them, but you must speak the dialect of the one who picked up.",
      "code": [
        {
          "language": "powershell",
          "filename": "which-shell.ps1",
          "source": "$PSVersionTable.PSVersion.Major",
          "output": "5",
          "explanation": "Type this in PowerShell. `$PSVersionTable` is a built-in variable holding version details, and `.PSVersion.Major` picks the major version number. A default Windows 11 PowerShell is Windows PowerShell 5.1, so it prints 5. If you installed the newer PowerShell 7 separately, you would see 7."
        },
        {
          "language": "bash",
          "filename": "which-shell.sh",
          "source": "echo $SHELL",
          "output": "/usr/bin/bash",
          "explanation": "Type this in Git Bash. `echo` prints text, and `$SHELL` is an environment variable (a named setting the shell keeps) holding the path of the shell program. Git Bash shows `/usr/bin/bash`. In PowerShell this command would not print that, which is one quick way to tell the shells apart."
        }
      ],
      "productionNote": "Every agent harness runs shell commands on the model's behalf. When something fails with 'command not found', the first question is which shell ran it. Always know whether a command was meant for PowerShell or Bash before copying it into a script or a tool call.",
      "commonMistakes": [
        "Typing Bash syntax such as `export X=1` in PowerShell. PowerShell does not understand `export`; it uses `$env:X = \"1\"` instead.",
        "Closing the terminal and losing session-only environment variables (settings you set by typing a command in that window). They vanish when the window closes, so set them again in the new window.",
        "Ignoring the prompt. `PS C:\\...>` means PowerShell and `MINGW64` means Git Bash; check it before pasting commands."
      ],
      "sources": [
        { "title": "PowerShell overview (Microsoft Learn)", "url": "https://learn.microsoft.com/en-us/powershell/scripting/overview" },
        { "title": "Git for Windows", "url": "https://gitforwindows.org/" }
      ]
    },
    {
      "id": "files-folders-paths",
      "title": "Files, folders & paths on Windows",
      "explanation": "A path is the address of a file or folder. On Windows a full path looks like `C:\\Users\\you\\pi-lab\\notes.txt`. In Git Bash the same file is written with forward slashes and the drive letter becomes a folder: `/c/Users/you/pi-lab/notes.txt`. Both shells also accept `~` (Bash) or `$HOME` (PowerShell) as a shortcut for your home folder, `C:\\Users\\you`.\n\nAn absolute path starts from the very top (the drive) and works from anywhere. A relative path starts from the folder you are currently in, called the current directory. Two special names help with relative paths: `.` means the current folder and `..` means the parent folder, the one directly above it.\n\nFour commands cover most navigation. `pwd` prints the current directory. `ls` lists what is inside it. `cd <folder>` changes the current directory (`cd ..` goes up one level). `mkdir <name>` makes a new folder.\n\nIn this course you will create one folder called `pi-lab` in your home folder. It is the lab where every later topic adds files. The examples below create it and move into it.",
      "analogy": "A path is a postal address: country is the drive `C:`, city is `Users`, street is `you`, house is `pi-lab`, room is the file. An absolute path is the full address that works from anywhere. A relative path is a direction such as 'two doors down from here', which only makes sense from where you stand. `..` is 'go back out one door'.",
      "code": [
        {
          "language": "bash",
          "filename": "make-lab.sh",
          "source": "cd ~ && mkdir pi-lab && cd pi-lab && pwd",
          "output": "/c/Users/you/pi-lab",
          "explanation": "Run in Git Bash. `&&` means 'run the next command only if the previous one worked'. The line goes to your home folder, creates `pi-lab`, enters it, and prints where you are. Your output shows your own user name instead of `you`."
        },
        {
          "language": "powershell",
          "filename": "make-lab.ps1",
          "source": "cd $HOME\nmkdir pi-lab | Out-Null\ncd pi-lab\npwd",
          "output": "Path\n----\nC:\\Users\\you\\pi-lab",
          "explanation": "The PowerShell version, one command per line. `| Out-Null` hides the table that `mkdir` normally prints. PowerShell's `pwd` prints a small table with a `Path` header. If `pi-lab` already exists, `mkdir` reports an error; skip that line and just `cd pi-lab`."
        }
      ],
      "productionNote": "Agent tool calls pass file paths as text. A wrong separator or a wrong starting folder produces 'file not found'. When an agent cannot find a file, check the current directory and whether the path is absolute or relative.",
      "commonMistakes": [
        "Forgetting quotes around a path that contains spaces. `cd C:\\Program Files` fails because the shell sees two words; write `cd \"C:\\Program Files\"`.",
        "Using backslashes inside Git Bash. In Bash the backslash is an escape character (it changes the meaning of the next character), so use forward slashes there.",
        "Running `mkdir pi-lab` twice and thinking something broke. The second run only reports that the folder already exists."
      ],
      "sources": [
        { "title": "File path formats on Windows systems (Microsoft Learn)", "url": "https://learn.microsoft.com/en-us/dotnet/standard/io/file-path-formats" }
      ]
    },
    {
      "id": "installing-node-npm",
      "title": "Installing Node.js LTS & npm",
      "explanation": "Node.js is a program that runs JavaScript (the language of web pages) and TypeScript (JavaScript with type labels, topic 02) outside a web browser. Pi is built on Node.js, so you must install it first. Pi requires Node.js 22.19 or newer; this course uses Node.js 26.13.1.\n\nNode.js ships in two kinds of release. LTS means long-term support: a version that receives bug and security fixes for a long time, which makes it the safe choice. 'Current' is the newest line, with a shorter support period. Choose LTS.\n\nnpm is the package manager that comes with Node.js. A package is a bundle of code someone else wrote, and npm downloads packages for you. Packages are stored in a `node_modules` folder, or installed globally so that a command such as `pi` works from any folder.\n\nInstall steps: go to nodejs.org/en/download, pick the Windows installer (the `.msi` file) for the LTS version, run it and accept the defaults. Then close every open terminal and open a new one. A terminal remembers the PATH (the list of folders Windows searches for programs) from when it opened, so an old window cannot see the new install.\n\nVerify the install with the two commands below.",
      "analogy": "Node.js is the engine and npm is the parts store. The engine runs your programs. When a program needs a part, npm delivers the packages to your garage, the `node_modules` folder.",
      "code": [
        {
          "language": "bash",
          "filename": "check-node.sh",
          "source": "node --version\nnpm --version",
          "output": "v26.13.1\n11.6.2",
          "explanation": "Works the same in PowerShell and Git Bash. The first line must print `v26.13.1`. The second prints some npm version; the exact number depends on the Node.js release, Node 26 bundles npm 11, so expect a number starting with `11.`; the exact digits (`11.6.2` here) may differ on your machine. If you see 'command not found' or 'not recognized', reopen the terminal."
        }
      ],
      "productionNote": "Teams use the same Node.js runtime on laptops and in CI (automated build and test servers) so code behaves the same everywhere. Pin to an LTS version and upgrade deliberately. Release 26.13.1 is also a security release, so being on it matters.",
      "commonMistakes": [
        "Keeping an old terminal window open after installing. It still has the old PATH, so `node` is not found. Close it and open a new one.",
        "Installing the 'Current' release instead of LTS. Current is not the version this course is tested against.",
        "Running `node --version` and seeing a version below 22.19. Pi will not install or run correctly on it; reinstall the LTS version."
      ],
      "sources": [
        { "title": "Download Node.js", "url": "https://nodejs.org/en/download" },
        { "title": "Node.js 26.13.1 release notes", "url": "https://nodejs.org/en/blog/release/v26.13.1" }
      ]
    },
    {
      "id": "git-and-scratch-repo",
      "title": "Git for Windows & a scratch git repo",
      "explanation": "Git is a tool that records snapshots of your project. Each snapshot is called a commit. A folder tracked by git is a repository, or repo. With commits you can compare versions and undo changes.\n\nThis matters for Pi. Pi edits files and runs commands on your real machine. It is not a sandbox (an isolated safe box), and it has no permission system, so it acts with your own rights. Always work inside a git repo and commit often, so you can reverse an agent's mistake.\n\nInstall Git for Windows from gitforwindows.org with the default options. It also installs Git Bash at `C:\\Program Files\\Git\\bin\\bash.exe`, which is where Pi looks for a Bash automatically.\n\nBefore your first commit, tell git who you are, once per computer. Open Git Bash and run the commands below. Then, inside `~/pi-lab`, `git init` turns the folder into a repo, `git add <file>` chooses what goes into the next snapshot, and `git commit -m \"message\"` saves it with a short description.\n\nTwo more commands you will use constantly: `git diff` shows what changed since the last commit, and `git restore <file>` throws away uncommitted changes to a file and brings back the last committed version.",
      "analogy": "A git commit is a save point in a video game. You play on (let the agent edit files), and if something goes wrong you reload the last save. The more often you save, the less you lose.",
      "code": [
        {
          "language": "bash",
          "filename": "first-commit.sh",
          "source": "git config --global user.name \"Your Name\"\ngit config --global user.email \"you@example.com\"\ncd ~/pi-lab\ngit init\necho \"# pi lab\" > README.md\ngit add README.md\ngit commit -m \"start lab\"",
          "output": "Initialized empty Git repository in C:/Users/you/pi-lab/.git/\n[main (root-commit) 3f2a1bc] start lab\n 1 file changed, 1 insertion(+)\n create mode 100644 README.md",
          "explanation": "Run in Git Bash. The two `git config` lines print nothing; use your own name and email. `echo \"# pi lab\" > README.md` creates the file with one line of text. In the output, the short code `3f2a1bc` is the commit's id and will differ on your machine, and the branch may be called `master` instead of `main` (a branch is a named line of commits). The line `1 file changed, 1 insertion(+)` is the one to look for."
        },
        {
          "language": "bash",
          "filename": "undo-demo.sh",
          "source": "echo \"oops\" >> README.md\ngit diff --stat\ngit restore README.md\ncat README.md",
          "output": " README.md | 1 +\n 1 file changed, 1 insertion(+)\n# pi lab",
          "explanation": "`>>` appends a line to the file, simulating a bad edit. `git diff --stat` summarises the change. `git restore README.md` reloads the saved version, and `cat` prints the file, showing only the original line. Git on Windows may also print a warning about line endings; it is harmless."
        }
      ],
      "productionNote": "Review everything an agent changed with `git diff` before you commit it. Commit before each larger task, so one `git restore` or revert returns you to a known good state.",
      "commonMistakes": [
        "Committing without `user.name` and `user.email` set. Git refuses with an 'Author identity unknown' message; run the two `git config --global` commands.",
        "Running Pi in your home folder instead of `pi-lab`. The agent could then read and change files across your whole profile, with no repo to undo it.",
        "Forgetting `git add`. A commit only contains files you added; `git commit` alone will say there is nothing to commit."
      ],
      "sources": [
        { "title": "git-init documentation", "url": "https://git-scm.com/docs/git-init" },
        { "title": "git-restore documentation", "url": "https://git-scm.com/docs/git-restore" },
        { "title": "Pi on Windows", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/windows.md" }
      ]
    },
    {
      "id": "installing-pi",
      "title": "Installing Pi",
      "explanation": "Pi is a minimal terminal coding-agent harness. A harness is the program around an AI model that gives it tools such as reading files, writing files, editing files and running shell commands, and that feeds the results back to the model. Pi is distributed as the npm package `@earendil-works/pi-coding-agent`, and the command it installs is `pi`.\n\nThere are two ways to install it. Option one, in PowerShell, uses Pi's own install script. Option two uses npm. `--ignore-scripts` tells npm not to run extra scripts during installation, and `-g` installs globally so `pi` works in any folder. Use one option, not both.\n\nAfter installing, open a new terminal, check the version, go to the lab folder and start Pi by typing `pi`. Pi opens a full-screen chat interface in the terminal.\n\nPi may ask whether you trust the project folder. This project trust prompt exists because a project can ship its own extensions (add-on code that Pi would run). Answer no unless you know and trust the repo. Your own empty `pi-lab` is fine.\n\nInside Pi, a line that starts with `!` runs as a shell command instead of going to the model. Use it to check that Pi found Bash: type `!printf 'Bash is working\\n'` and press Enter. `printf` is a Bash command that prints text.",
      "analogy": "Pi is a workshop bench. The model is the worker and the bench supplies the tools: read, write, edit and bash. The worker is only as useful as the tools within reach, and everything the worker does happens on your real workbench, which is why the bench stands in a repo.",
      "code": [
        {
          "language": "powershell",
          "filename": "install-pi.ps1",
          "source": "powershell -c \"irm https://pi.dev/install.ps1 | iex\"",
          "output": "",
          "explanation": "Option one. `irm` downloads the install script and `iex` runs it. The script's own messages vary, so no output is shown. Run this in PowerShell, not Git Bash."
        },
        {
          "language": "bash",
          "filename": "install-pi-npm.sh",
          "source": "npm install -g --ignore-scripts @earendil-works/pi-coding-agent",
          "output": "",
          "explanation": "Option two, in either shell. npm prints a short summary of what it added; the exact text varies by npm version."
        },
        {
          "language": "bash",
          "filename": "start-pi.sh",
          "source": "pi --version\ncd ~/pi-lab\npi",
          "output": "1.6.0",
          "explanation": "`pi --version` prints `1.6.0`. After `cd ~/pi-lab`, `pi` opens the interactive interface (no printed output to show). Inside it, type `!printf 'Bash is working\\n'`; the result line is `Bash is working`. Press Ctrl+C twice (or Ctrl+D with an empty input) to leave."
        }
      ],
      "productionNote": "The same `pi` command serves interactive work, scripts (print mode, `pi -p`, which prints one answer and exits; topic 05) and machine-readable JSON mode (`--mode json`, topic 07). Pi runs with your user's rights and has no permission system, so install only extensions you trust.",
      "commonMistakes": [
        "Git Bash is not installed, so the bash tool fails. Install Git for Windows, or set `shellPath` (the setting that points to a bash.exe) in `~/.pi/agent/settings.json`.",
        "Accepting the project trust prompt for a repo you do not know. Trusting it lets that project's extensions run on your machine; answer no unless you know the repo.",
        "Running `pi` right after installing in an old terminal window. Open a new terminal so PATH includes the new command."
      ],
      "sources": [
        { "title": "Pi repository", "url": "https://github.com/earendil-works/pi" },
        { "title": "Pi quickstart", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/quickstart.md" },
        { "title": "Pi on Windows", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/windows.md" }
      ]
    },
    {
      "id": "connecting-opencode-zen",
      "title": "Connecting OpenCode Zen (/login, OPENCODE_API_KEY, credits)",
      "explanation": "Pi is only the harness; it needs a model to think. A provider is a company that serves models over the internet. To use one you need an API key, a long secret string that works like a password for your account.\n\nThis course uses OpenCode Zen. Zen is pay-as-you-go: you add credits to your account and each request uses some of them. One Zen key reaches many models, including Claude, GPT, Gemini and open models such as GLM, Kimi, Qwen, DeepSeek and MiniMax. Create an account and key in the OpenCode console at opencode.ai, and add a small amount of credit. Pi's built-in provider id for Zen is `opencode`. A separate flat-rate plan called Go (`opencode-go`, $10 per month) exists; this course does not use it.\n\nThere are two ways to give Pi your key. Way one: start Pi and type `/login`, a slash command (a command typed inside Pi that starts with `/`), and follow the prompts. Pi stores the key in `~/.pi/agent/auth.json`. Way two: set the environment variable `OPENCODE_API_KEY` before starting Pi. An environment variable is a named setting that programs started from that terminal can read.\n\nOnce connected, `/model` inside Pi lets you pick a model. To see model ids, run `pi --list-models opencode` in your terminal. Pick one from that list; ids change over time, so do not copy them from a book.\n\nAfter you send a message, Pi's footer shows tokens used and cost. A token is a small chunk of text, and it is what you are billed for.",
      "analogy": "Zen is a prepaid transit card valid on every bus company in town. You load credit once, and each ride (each token of text you send or receive) deducts the fare of whichever company's bus you took. Cheaper buses cost less per ride, premium ones cost more.",
      "code": [
        {
          "language": "powershell",
          "filename": "set-key.ps1",
          "source": "$env:OPENCODE_API_KEY = \"sk-your-key-here\"\ncd $HOME\\pi-lab\npi",
          "output": "",
          "explanation": "PowerShell. `$env:NAME = \"value\"` sets an environment variable for this window only. Replace `sk-your-key-here` with your real key (it is a placeholder). Inside Pi, type `Say hi in 3 words`. The reply varies each time (for example 'Hello, friendly human!'), and the footer shows tokens and cost."
        },
        {
          "language": "bash",
          "filename": "set-key.sh",
          "source": "export OPENCODE_API_KEY=sk-your-key-here\ncd ~/pi-lab\npi",
          "output": "",
          "explanation": "Git Bash equivalent. `export` makes the variable visible to programs you start from this window, and it is also lost when you close the window. If you used `/login` instead, you do not need either snippet."
        }
      ],
      "productionNote": "Keep keys in environment variables or a secret store, never in files inside a git repo. `auth.json` lives in your home folder, outside `pi-lab`, and must never be committed or shared.",
      "commonMistakes": [
        "Pasting the key into a file inside the repo and committing it. Anyone who sees the repo can then spend your credits.",
        "Having zero credits. Requests then fail with an error about balance; add credit in the OpenCode console.",
        "Picking a free-tier Zen model. Those work only in OpenCode's own client and return a 403 error (HTTP code for 'forbidden') in Pi.",
        "Using Bash `export` syntax in PowerShell or `$env:` syntax in Git Bash. Use the line that matches your shell."
      ],
      "sources": [
        { "title": "Pi providers: use an API key from the environment", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/providers.md#use-an-api-key-from-the-environment" },
        { "title": "OpenCode Zen models", "url": "https://opencode.ai/docs/console/models" },
        { "title": "OpenCode Go", "url": "https://opencode.ai/docs/console/go" }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Which shell does Pi's bash tool need on Windows?",
      "options": [
        "Git Bash, installed with Git for Windows",
        "Windows Command Prompt only",
        "A web browser console",
        "Node.js itself, with no shell"
      ],
      "answerIndex": 0,
      "explanation": "Pi's bash tool needs a Bash. On Windows it finds the one that comes with Git for Windows (`C:\\Program Files\\Git\\bin\\bash.exe`)."
    },
    {
      "question": "How is the Windows path `C:\\Users\\you\\pi-lab` written in Git Bash?",
      "options": [
        "C:\\Users\\you\\pi-lab",
        "/c/Users/you/pi-lab",
        "c:Users:you:pi-lab",
        "//Users/you/pi-lab/C"
      ],
      "answerIndex": 1,
      "explanation": "Git Bash uses forward slashes and turns the drive letter into a folder, so `C:` becomes `/c`. `~/pi-lab` is a shorter form."
    },
    {
      "question": "Why should you work inside a git repo when using Pi?",
      "options": [
        "Pi refuses to start outside a repo",
        "Git makes the model answer faster",
        "Pi runs in a sandbox that git controls",
        "Pi changes real files on your machine, and commits let you undo its mistakes"
      ],
      "answerIndex": 3,
      "explanation": "Pi is not a sandbox and has no permission system. It edits real files with your rights, so commits give you save points to return to."
    },
    {
      "question": "Which are two ways to give Pi your OpenCode Zen key?",
      "options": [
        "Email the key to Pi, or put it in README.md",
        "Run `/login` inside Pi, or set the `OPENCODE_API_KEY` environment variable",
        "Run `git config user.name`, or run `npm init`",
        "Run `node --version`, or run `pi --version`"
      ],
      "answerIndex": 1,
      "explanation": "`/login` stores the key in `~/.pi/agent/auth.json`; the environment variable `OPENCODE_API_KEY` supplies it for that terminal session."
    },
    {
      "question": "What does `..` mean in a path?",
      "options": [
        "The current folder",
        "The home folder",
        "The parent folder, one level up",
        "Every folder on the drive"
      ],
      "answerIndex": 2,
      "explanation": "`.` is the current folder and `..` is the folder directly above it. So `cd ..` moves up one level."
    }
  ]
});
