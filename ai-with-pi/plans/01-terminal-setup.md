# 01. Terminal & Setup on Windows
Version: Pi 1.6.0 + Node.js 26.13.1 LTS + Git for Windows (latest)
Prerequisites: none

Course-wide lab: one folder `pi-lab` at `C:\Users\<you>\pi-lab` (Git Bash: `~/pi-lab`). Every later topic adds to it. Windows only; show PowerShell AND Git Bash where they differ.

## Learning goals
- Learner can open PowerShell and Git Bash, and tell which one is running from the prompt.
- Learner can move between folders with `cd`, list with `ls`, and read Windows vs Bash paths.
- Learner can install Node.js 26.13.1 LTS and check `node --version` / `npm --version`.
- Learner can install Git for Windows, create `pi-lab` as a git repo, and commit.
- Learner can install Pi and start it inside `pi-lab`.
- Learner can connect OpenCode Zen with `/login` or `OPENCODE_API_KEY`.

## Sub-topics
### What a terminal is (PowerShell vs Git Bash)
- Concept: terminal = text window where you type commands; shell = program reading them. Windows ships PowerShell; Git for Windows adds Git Bash. Pi's bash tool needs Git Bash on Windows. Prompt look: `PS C:\Users\you>` vs `you@PC MINGW64 ~ $`.
- Analogy: terminal = phone handset; shell = person on the line. PowerShell and Bash = two people who speak different dialects; same handset.
- Code example: `which-shell` — PowerShell: `$PSVersionTable.PSVersion.Major` → `5` (Windows PowerShell 5.1) ; Git Bash: `echo $SHELL` → `/usr/bin/bash`.
- Production use: every agent harness runs shell commands; knowing which shell runs them avoids "command not found".
- Common mistakes: typing Bash syntax (`export X=1`) in PowerShell; closing terminal and losing session-only env vars.
- Sources: https://learn.microsoft.com/en-us/powershell/scripting/overview ; https://gitforwindows.org/

### Files, folders & paths on Windows
- Concept: path = address of a file. Windows `C:\Users\you\pi-lab\notes.txt`; Git Bash `/c/Users/you/pi-lab/notes.txt` or `~/pi-lab/notes.txt`. Absolute vs relative; `.` current, `..` parent; `cd`, `ls`, `mkdir`, `pwd`.
- Analogy: path = postal address: country (drive `C:`), city (`Users`), street (`you`), house (`pi-lab`), room (file). Relative path = "two doors down from here".
- Code example: Git Bash: `cd ~ && mkdir pi-lab && cd pi-lab && pwd` → `/c/Users/you/pi-lab`. PowerShell `cd $HOME; mkdir pi-lab; cd pi-lab; pwd` → `Path` header then `C:\Users\you\pi-lab`.
- Production use: tool calls pass paths; wrong separator or relative base = file not found.
- Common mistakes: spaces in paths without quotes; mixing `\` inside Bash (escape char there).
- Sources: https://learn.microsoft.com/en-us/dotnet/standard/io/file-path-formats

### Installing Node.js LTS & npm
- Concept: Node.js runs JavaScript/TypeScript outside a browser; Pi is built on it. npm = package manager shipped with Node. LTS = long-term support line; course uses 26.13.1. Pi needs ≥22.19.
- Analogy: Node = engine; npm = parts store that delivers parts (packages) to your garage (`node_modules`).
- Code example: install via Windows installer (.msi) from nodejs.org, reopen terminal; `node --version` → `v26.13.1`; `npm --version` → prints a version (do not state exact npm number).
- Production use: same runtime in CI and laptops; pin LTS.
- Common mistakes: old terminal window still sees old PATH (reopen); installing "Current" instead of LTS.
- Sources: https://nodejs.org/en/download ; https://nodejs.org/en/blog/release/v26.13.1

### Git for Windows & a scratch git repo
- Concept: git records snapshots (commits) so any change can be undone. Pi edits files and runs commands on your real machine (not a sandbox) → always work in a git repo, commit often. Git for Windows also installs Git Bash (at `C:\Program Files\Git\bin\bash.exe`, which Pi finds automatically).
- Analogy: git commit = save point in a video game; agent mistakes → reload the save.
- Code example: in `~/pi-lab`: `git init` → `Initialized empty Git repository in .../pi-lab/.git/`; `echo "# pi lab" > README.md`; `git add README.md`; `git commit -m "start lab"` → line containing `1 file changed, 1 insertion(+)`. Undo demo: `git restore README.md` after a bad edit.
- Production use: review agent diffs with `git diff` before committing.
- Common mistakes: no `user.name`/`user.email` set → commit fails (show `git config --global user.name "Your Name"`); running Pi in home folder instead of the lab.
- Sources: https://git-scm.com/docs/git-init ; https://git-scm.com/docs/git-restore ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/windows.md

### Installing Pi
- Concept: Pi = minimal terminal coding-agent harness (npm package `@earendil-works/pi-coding-agent`, command `pi`). Two install ways. Start with `pi` in `pi-lab`. Check Bash works inside Pi: `!printf 'Bash is working\n'`.
- Analogy: Pi = workshop bench: model is the worker, bench supplies tools (read, write, edit, bash).
- Code example: PowerShell `powershell -c "irm https://pi.dev/install.ps1 | iex"` OR `npm install -g --ignore-scripts @earendil-works/pi-coding-agent`; then `pi --version` → `1.6.0`; inside Pi `!printf 'Bash is working\n'` → `Bash is working`.
- Production use: same CLI used for interactive work, scripts (`-p`) and JSON mode later.
- Common mistakes: Git Bash not installed → bash tool fails (fix: install Git or set `shellPath` in `~/.pi/agent/settings.json`); running untrusted project extensions (project trust prompt — say no unless you know the repo).
- Sources: https://github.com/earendil-works/pi ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/quickstart.md ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/windows.md

### Connecting OpenCode Zen (/login, OPENCODE_API_KEY, credits)
- Concept: provider = company serving models over the internet; API key = password for your account. OpenCode Zen = pay-as-you-go credits, one key for Claude, GPT, Gemini and open models (GLM, Kimi, Qwen, DeepSeek, MiniMax). Pi built-in provider ids `opencode` (Zen) and `opencode-go` (Go flat-rate plan, $10/month, only mention). Two ways: `/login` (stores in `~/.pi/agent/auth.json`) or env var `OPENCODE_API_KEY`. `/model` picks model; `pi --list-models opencode` lists ids. Do not hardcode specific model ids as facts; tell learner to pick from the list.
- Analogy: Zen = prepaid transit card valid on every bus company; each ride (token) deducts by that company's fare.
- Code example: PowerShell session-only `$env:OPENCODE_API_KEY = "sk-..."` then `pi`; Git Bash `export OPENCODE_API_KEY=sk-...`. Inside Pi: type `Say hi in 3 words` → sample reply (varies), footer shows tokens/cost.
- Production use: keys in env vars or secret stores, never in git; `auth.json` must never be committed.
- Common mistakes: pasting key into a file inside the repo; zero credits → error; free-tier Zen models only work in OpenCode's own client (403 in Pi).
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/providers.md#use-an-api-key-from-the-environment ; https://opencode.ai/docs/console/models ; https://opencode.ai/docs/console/go

## Quiz
1. Which shell does Pi's bash tool need on Windows? — tests shells
2. Translate `C:\Users\you\pi-lab` to Git Bash form — tests paths
3. Why work inside a git repo with Pi? — tests safety/commits
4. Two ways to give Pi your Zen key — tests provider setup
5. What does `..` mean in a path? — tests relative paths
