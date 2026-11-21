window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "23-shipping",
  "order": 23,
  "title": "Shipping the Portfolio",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "You turn the code review agent into something other people can understand, install and trust. You draw its architecture, write a README, report eval results and cost honestly, document where it fails, and publish it on GitHub as an installable Pi package with a demo trace.",
  "prerequisites": [
    "22-code-review-agent"
  ],
  "subtopics": [
    {
      "id": "architecture-diagram",
      "title": "Architecture diagram",
      "explanation": "An architecture diagram is a picture of the main parts of your system and how they connect. For the review agent the parts are: the user, the `/review` command (the slash command from topic 22), the review skill, the model (reached through OpenCode Zen), the tools (`get_diff`, `run_tests`, `submit_review`, plus Pi's built-in `read`), the things the tools touch (git, `node --test`, the output file `review.json`), and the guards that block dangerous tool calls (the permission gate and protected paths from topic 19).\n\nA diagram is only useful if the reader grasps it in about 30 seconds. So you show the loop and the boundaries, not every function. The key idea to draw: the model and the tools talk back and forth (the agent loop from topic 6), and the guards sit between the model's tool calls and the real world.\n\nYou do not need a drawing program. Mermaid is a small text language that turns a few lines of text into a diagram. GitHub renders Mermaid automatically when you put it in a Markdown file (Markdown is the plain-text format with `#` headings and `-` bullet lists that README files use) inside a fenced block that starts with three backticks followed by the word `mermaid`. Because the diagram is text, it lives in git next to your code and shows up in diffs.\n\nA Mermaid `flowchart` is made of nodes (boxes) and edges (arrows). `flowchart LR` means the layout flows left to right. A node is written `ID[Label text]`. An arrow `A --> B` is solid, `A -.-> B` is dotted (good for a guard that influences something without being part of the main flow), and `A -->|text| B` puts a label on the arrow.\n\nKeep the diagram in your README and update it in the same commit whenever you change the design. A diagram that no longer matches the code is worse than no diagram.",
      "analogy": "A subway map. It does not show every street and building. It shows only the lines, the stations and the transfers, because that is all a traveller needs to plan a trip. Your diagram does the same for the agent: lines (the main flow), stations (components) and transfers (where the model hands over to a tool and back). A street map with every function drawn on it would be as unreadable as a subway map with every house.",
      "code": [
        {
          "language": "markdown",
          "filename": "README.md",
          "source": "## Architecture\n\n```mermaid\nflowchart LR\n  U[User /review] --> S[code-review skill]\n  S --> M[Model via OpenCode Zen]\n  M -->|tool calls| T[get_diff / run_tests / submit_review]\n  T --> G[git + node --test]\n  T --> R[review.json]\n  Guard[permission-gate + protected-paths] -.-> T\n```",
          "output": "",
          "explanation": "Paste this into README.md and push it. GitHub draws a left-to-right diagram with 7 nodes: User, skill, Model, the tools box, git + node --test, review.json and the Guard box. The dotted arrow from Guard to the tools shows that the guards check tool calls without being a step in the main flow. The code prints nothing in a terminal, the result is the picture GitHub renders."
        }
      ],
      "productionNote": "Reviewers and interviewers often look at the README for under a minute. A clear diagram lets them understand the design (command, skill, model, tools, guards, output) before reading any code. Preview the diagram on GitHub after pushing, because a typo in Mermaid shows an error box instead of the picture.",
      "commonMistakes": [
        "Drawing every function and file. The reader cannot see the design any more. Show components and boundaries only.",
        "Letting the diagram go out of date. If you add a tool or a guard, update the diagram in the same commit.",
        "Forgetting the guards. The safety boundary is the most interesting part for a reviewer, so draw it.",
        "Wrapping the diagram in a normal code fence (without the word `mermaid`). GitHub then shows the raw text instead of a picture."
      ],
      "sources": [
        {
          "title": "GitHub Docs: Creating diagrams",
          "url": "https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams"
        },
        {
          "title": "Mermaid: Flowcharts syntax",
          "url": "https://mermaid.js.org/syntax/flowchart.html"
        }
      ]
    },
    {
      "id": "tool-list-and-readme",
      "title": "Tool list and README",
      "explanation": "A README is the file named `README.md` at the top of a repository (a repository, or repo, is the project folder tracked by git). GitHub shows it on the repository's front page, so it is the first thing anyone sees. Write it for a stranger who has never heard of your project.\n\nUse these sections, in this order: a one-line description of what the agent does; a link to the demo; install instructions; requirements; usage; a tools table; safety notes; evals; costs; failure cases; license.\n\nThe install section is one command: `pi install git:github.com/<you>/pi-review-agent@v1.0.0` (replace `<you>` with your GitHub user name). The requirements section lists everything a newcomer needs before that works: Node 26 LTS, Pi 1.6.0, Git Bash on Windows, and the `OPENCODE_API_KEY` environment variable (the API key for OpenCode Zen). The usage section shows the one command to try, such as `/review main`.\n\nThe tools table is the most important part for trust. For each tool list its name, its purpose and its side effects. A side effect is anything a tool changes outside itself, such as running code or writing a file. Be exact. A reader deciding whether to run your agent on their repository wants to know that `get_diff` only reads, that `run_tests` executes code, and that `submit_review` writes one file.\n\nFinish with a license (a short statement of what others may do with your code; the MIT license is a common simple choice) and a safety note. State plainly that Pi has no permission system of its own and runs with your user's rights, so your guards are guardrails, not a sandbox.\n\nNever put real secrets in examples. Write `OPENCODE_API_KEY=your-key-here`, never your actual key.",
      "analogy": "The box a product comes in. The front says what it is in one line. The side lists what is inside, which batteries you need, how to switch it on, and the warnings (do not use in the bath). A README lists the same things: what it does, what you must install first, how to start it, and what is risky.",
      "code": [
        {
          "language": "markdown",
          "filename": "README.md",
          "source": "## Tools\n\n| Tool | Purpose | Side effects |\n| --- | --- | --- |\n| get_diff | branch diff vs base | read-only |\n| run_tests | node --test (120 s timeout) | runs code |\n| submit_review | writes review.json, ends run | writes 1 file |\n\n## Requirements\n\n- Node.js 26 LTS\n- Pi 1.6.0\n- Git Bash (Windows)\n- `OPENCODE_API_KEY` set in your environment",
          "output": "",
          "explanation": "A Markdown table uses `|` to separate columns, and the second row of dashes marks the header. GitHub renders it as a real table. The Side effects column is the honest part: it tells a reader which tools only read, which run code, and which write a file. Nothing is printed in a terminal, the result is the rendered README."
        }
      ],
      "productionNote": "A README is the first impression of the project. A reader who cannot get it running in five minutes usually moves on. Test your own setup steps in a fresh folder (see the publishing sub-topic) so they are complete, and list every requirement, including environment variables.",
      "commonMistakes": [
        "Missing setup steps, such as forgetting to say that an API key is required or which Node version to use.",
        "Putting a real API key or token in an example command. Always use a placeholder.",
        "A tools table without the side effects column. Readers cannot judge the risk.",
        "Describing safety as a guarantee. Say that the guards reduce risk but Pi is not a sandbox."
      ],
      "sources": [
        {
          "title": "GitHub Docs: About READMEs",
          "url": "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes"
        },
        {
          "title": "Pi docs: Packages",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md"
        }
      ]
    },
    {
      "id": "eval-results-and-cost",
      "title": "Eval results and cost per task",
      "explanation": "In topics 18 and 22 you built evals (fixed sets of tasks scored automatically) and logged results as JSONL (one JSON object per line). Now you present those results in the README so a reader can judge your agent without running it.\n\nBuild a table from your logs with these columns: a label for the version (such as `base` and `v2`), the number of cases, recall (the share of seeded bugs the agent found), precision (the share of reported findings that were real), average tokens, median cost per review, median latency, the model and thinking level, and the date. The median is the middle value after sorting the runs. It is better than the average for cost and time because one unusually expensive run does not distort it.\n\nAlways state the sample size: how many cases you ran and how many times you ran each case. Eight cases run once each is a small sample. Say so, because model output varies between runs.\n\nShow the before and after of the one change you made, as you learned in topic 18 (change one variable at a time). The table must include the cost column. A review agent that gains 20 points of recall but costs five times as much is a different trade-off from one that costs the same.\n\nNever cherry-pick, which means showing only the runs that look good. Publish the full table, including cases that failed. If you hide failures, a reader who finds one will stop trusting everything else.\n\nYou can generate the Markdown rows with a few lines of TypeScript instead of typing them by hand. Run it with `node table.ts`, which works because Node 26 strips TypeScript types and runs `.ts` files directly. The example uses illustrative numbers. Use your own from your results file.",
      "analogy": "A nutrition label on food. Every product shows the same standard fields (calories, fat, sugar) with real measured values, so you can compare two products fairly. Your eval table does the same: standard columns, real numbers, the same layout for every version, so a reader can compare `base` and `v2` at a glance.",
      "code": [
        {
          "language": "typescript",
          "filename": "table.ts",
          "source": "const rows = [\n  { label: \"base\", recall: 0.6, cost: 0.031 },\n  { label: \"v2\", recall: 0.8, cost: 0.034 },\n];\n\nfor (const r of rows) {\n  console.log(`| ${r.label} | ${(r.recall * 100).toFixed(0)}% | $${r.cost.toFixed(3)} |`);\n}",
          "output": "| base | 60% | $0.031 |\n| v2 | 80% | $0.034 |",
          "explanation": "`rows` is an array of objects, one per version. The loop prints one Markdown table row for each. `(r.recall * 100).toFixed(0)` turns 0.6 into the text `60`, and `toFixed(3)` keeps three decimals for the cost. In the template string, `$` followed by `${...}` prints a literal dollar sign and then the value. The numbers are made up for teaching. Paste the printed rows under a header row in your README."
        },
        {
          "language": "markdown",
          "filename": "README.md",
          "source": "## Evals\n\n8 cases, 3 runs per case. Model: your chosen OpenCode Zen model, thinking level medium. Date: 2026-11-21.\n\n| Version | Recall | Precision | Median cost | Median latency |\n| --- | --- | --- | --- | --- |\n| base | 60% | 75% | $0.031 | 41 s |\n| v2 (added repo conventions to skill) | 80% | 78% | $0.034 | 45 s |\n\nCases still failing in v2: big-diff, generated-file. See FAILURES.md.",
          "output": "",
          "explanation": "The sample size and run count come first. One change is named in the label. Cost and latency sit next to recall. The last line points to the failures instead of hiding them. All numbers here are illustrative; replace them with measurements from your own logs."
        }
      ],
      "productionNote": "Eval tables show engineering judgment: you measured, changed one thing, measured again, and counted the cost. Teams choosing a model or prompt make the same trade-off between quality, cost and speed, so a candidate who reports all three honestly stands out.",
      "commonMistakes": [
        "No cost column. Quality gains mean little without knowing what they cost per review.",
        "Hiding failures or reporting only the best run. Show every case and the sample size.",
        "Changing several things at once between base and v2, so nobody knows what helped.",
        "Reporting averages that one expensive outlier run can distort. Prefer the median."
      ],
      "sources": [
        {
          "title": "Anthropic: Building effective agents",
          "url": "https://www.anthropic.com/engineering/building-effective-agents"
        }
      ]
    },
    {
      "id": "documenting-failure-cases",
      "title": "Documenting failure cases",
      "explanation": "Every agent fails somewhere. A good portfolio project says where, instead of hoping nobody notices. Keep a file named `FAILURES.md` in the repository and add one entry for each failure you find.\n\nTypical failures for the review agent: a huge diff that gets truncated (cut short) so the model never sees the part with the bug; flaky tests (tests that sometimes pass and sometimes fail with no code change) that make `run_tests` misleading; generated files that flood the diff with noise; and comments or code in a language the model handles poorly.\n\nEach entry has four parts: what you saw, a trace, a mitigation (a change that reduces the problem) and an eval case. For the trace, run `/export` in Pi to write the session as an HTML file (a web page you open in a browser) (topic 7) and save it in a `traces/` folder. Open the file and check it for secrets such as API keys or private code before you commit it.\n\nThe last part is the most valuable: turn each failure into a new eval case, a fixture plus a score rule in your eval set. Then fix the problem and re-run the evals. The failure is now a permanent test, so it cannot silently come back.\n\nEnd the README or FAILURES.md with an honest limits section. For example: this is not a security tool, it can miss bugs, and Pi is not a sandbox, because it has no permission system and runs with your user's rights.",
      "analogy": "Aircraft incident reports. After every incident investigators write down what happened, the evidence, the cause and what changes. Each report makes the next flight safer, and the industry is trusted because it publishes them. Your FAILURES.md works the same way, and each entry also becomes a test.",
      "code": [
        {
          "language": "markdown",
          "filename": "FAILURES.md",
          "source": "## F1: diff over 2000 lines\n- Seen: review missed bug in truncated part\n- Trace: traces/f1.html\n- Mitigation: review per file\n- Eval case: evals/cases/big-diff",
          "output": "",
          "explanation": "One entry in the template. `Seen` says what went wrong in one line. `Trace` links the exported session that proves it. `Mitigation` is the planned or applied fix. `Eval case` points to the new fixture so the failure becomes a regression test (a test that stops an old bug from returning). Copy this block for F2, F3 and so on."
        }
      ],
      "productionNote": "Users and interviewers trust a project more when its limits are written down. A failure log with traces, fixes and new tests shows how you debug, which is exactly what teams want to see in an agent engineer.",
      "commonMistakes": [
        "No failure section at all. It looks like you never tested hard cases.",
        "Listing failures without a follow-up: no mitigation and no new eval case.",
        "Committing an exported trace without reading it first. It may contain keys, private paths or code you did not mean to share.",
        "Claiming the agent is safe. State that it is not a security tool and Pi is not a sandbox."
      ],
      "sources": [
        {
          "title": "Pi docs: Sessions (export or share a session)",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sessions.md#export-or-share-a-session"
        }
      ]
    },
    {
      "id": "publishing-a-demo",
      "title": "Publishing a demo",
      "explanation": "For this course, a deployed demo means four things: a public GitHub repository, an installable Pi package (topic 21), an exported HTML trace of a real review, and a short screen recording (a GIF or video) embedded in the README. GitHub is a website that hosts git repositories. Public means anyone can read the repository.\n\nFirst, make sure the repository is clean. In the project folder, create a `.gitignore`, a file listing paths git must never track. Put in `node_modules/` (downloaded packages), `.env` (secrets) and `review.json` (generated output). Never commit `auth.json` or `.env`. Then run `git init` if you have not yet, `git add .` and `git commit` as in topic 1.\n\nNext, create the GitHub repository from the terminal with the GitHub CLI, called `gh` (a separate command-line tool you install and sign in to with `gh auth login`). The command `gh repo create pi-review-agent --public --source . --push` creates a public repository from the current folder and pushes your commits to it.\n\nThen tag a release. A tag is a permanent name for one commit. `git tag v1.0.0` creates it and `git push --tags` uploads it. Users can now install exactly that version with `pi install git:github.com/<you>/pi-review-agent@v1.0.0`. Without a tag, an install follows the latest code, so what a stranger gets can change under them (this is called drift) and your README steps may stop working.\n\nFinally, test as a stranger would. Open a new empty folder and install from GitHub, not from your local copy. Run `pi list` to confirm the package is installed, and run `/review main` inside the `pi-lab` repository from topic 1. If it works there, your README is complete.\n\nOptionally, you can publish to npm (the public package registry) with `npm publish` and add the `pi-package` keyword to `package.json` (topic 21) so the package appears in Pi's package gallery. This is not required for the portfolio.",
      "analogy": "Opening night of a play. The theatre is open to the public (the public repository), tickets are printed (the install command with a version tag), and programmes are handed out (the README). You also do a dress rehearsal as a stranger, sitting in a seat in the audience, to check that the doors really open.",
      "code": [
        {
          "language": "plaintext",
          "filename": ".gitignore",
          "source": "node_modules/\n.env\nreview.json",
          "output": "",
          "explanation": "Each line is a path git will skip. This keeps downloaded packages, secrets and generated output out of the public repository. If you already committed a secret earlier, ignoring it later does not remove it from history, so rotate (replace) that key."
        },
        {
          "language": "bash",
          "filename": "publish.sh",
          "source": "git init\ngit add .\ngit commit -m \"Initial release of pi-review-agent\"\ngh repo create pi-review-agent --public --source . --push\ngit tag v1.0.0\ngit push --tags",
          "output": "",
          "explanation": "Run these in Git Bash, inside the project folder (skip `git init` if the folder is already a repository). The first three lines save your work, line four creates the public repository and uploads it, and the last two publish the tag `v1.0.0`. Output from gh depends on your account, so it is not shown."
        },
        {
          "language": "bash",
          "filename": "verify-install.sh",
          "source": "mkdir stranger-test\ncd stranger-test\npi install git:github.com/<you>/pi-review-agent@v1.0.0\npi list",
          "output": "",
          "explanation": "Replace `<you>` with your GitHub user name. `pi list` should show the package you installed. Then start `pi` inside the pi-lab repository and run `/review main`. If any step fails, fix the README and repeat until a clean folder works."
        }
      ],
      "productionNote": "The repository link is what you put on a CV or send to an interviewer. Pinning a tag means the version they test is the version you tested. Before exporting a demo trace with `/export`, read it for secrets, and make sure `auth.json` and `.env` are never committed.",
      "commonMistakes": [
        "Committing `auth.json` or `.env`, which exposes your keys. Add them to `.gitignore` before the first commit and rotate any key that leaked.",
        "Telling people to install without a tag, so installs drift as you change the code.",
        "Never testing the install in a clean folder, so the README misses a required step.",
        "Publishing an HTML trace without reading it for secrets or private paths."
      ],
      "sources": [
        {
          "title": "GitHub CLI manual: gh repo create",
          "url": "https://cli.github.com/manual/gh_repo_create"
        },
        {
          "title": "Pi docs: Packages (install and manage packages)",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md#install-and-manage-packages"
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "What should an architecture diagram of the review agent show?",
      "options": [
        "Every function and file in the repository, so nothing is missing",
        "Only the model's name and price",
        "The main components and boundaries: command, skill, model, tools, what the tools touch, and the guards",
        "Only the folder structure of the repository"
      ],
      "answerIndex": 2,
      "explanation": "Like a subway map, the diagram shows the lines, stations and transfers: the flow from user to model to tools to output, and where the guards sit. Drawing every function makes it unreadable, and a folder listing does not show the loop or the safety boundary."
    },
    {
      "question": "Which sections must the README include?",
      "options": [
        "Install command, requirements and usage",
        "A list of every commit and the author's biography",
        "Only a screenshot and a license",
        "The full source code of every file pasted in"
      ],
      "answerIndex": 0,
      "explanation": "A stranger needs to know how to install, what they need first (Node, Pi, Git Bash, the API key) and how to use it. The tools table with side effects and the safety notes tell them what is risky. Commit history, a bare screenshot or pasted source do not help someone get started."
    },
    {
      "question": "Why report cost next to recall in your eval table?",
      "options": [
        "Because recall is always the same for every version",
        "Because cost is the only number that matters",
        "Because GitHub requires a cost column",
        "Because a gain in recall may come with a much higher cost, and the reader needs both to judge the trade-off"
      ],
      "answerIndex": 3,
      "explanation": "Quality and cost trade off against each other. A version with 20 points more recall at five times the price is a different choice from one at the same price. Recall does change between versions, cost is not the only number, and GitHub has no such rule."
    },
    {
      "question": "What do you do with each failure case you find?",
      "options": [
        "Delete it from the logs so the results look better",
        "Document it with a trace and mitigation, then turn it into a new eval case",
        "Mention it only in a private note",
        "Ignore it unless it happens twice in a row"
      ],
      "answerIndex": 1,
      "explanation": "Each failure goes into FAILURES.md with what you saw, a trace and a mitigation, and becomes an eval case so it is tested from then on. Hiding, privately noting or ignoring failures removes the trust and the learning."
    },
    {
      "question": "Why tag a version (for example v1.0.0) before sharing the install command?",
      "options": [
        "A tag makes the package install faster",
        "Pi refuses to install any package that has no tag",
        "A tag pins the install to one exact commit, so users get the version you tested and not whatever code you pushed later",
        "A tag hides the repository from search engines"
      ],
      "answerIndex": 2,
      "explanation": "Installing `git:github.com/<you>/pi-review-agent@v1.0.0` fetches exactly that tagged commit. Without a tag, installs follow the latest code and can drift away from what your README describes. Tags do not change speed, Pi does not require them, and they have nothing to do with search visibility."
    }
  ]
});
