# 23. Shipping the Portfolio
Version: Pi 1.6.0 + Node.js 26.13.1 LTS
Prerequisites: 22-code-review-agent

Week 6 checkpoint: deployed demo + README with architecture and evals. Repo `~/pi-review-agent/` pushed to GitHub, installable as a Pi package.

## Learning goals
- Learner can draw the agent's architecture as a Mermaid diagram.
- Learner can write a README with tool list, setup and usage.
- Learner can present eval results and cost per task honestly.
- Learner can document failure cases and turn them into new eval tasks.
- Learner can publish the agent so others can install and see a demo.

## Sub-topics
### Architecture diagram
- Concept: show the loop and boundaries: user → `/review` command → skill → model (OpenCode Zen) ↔ tools (`get_diff`, `run_tests`, `submit_review`, read) → git/node → `review.json`; guards on tool_call; evals via SDK. Mermaid (`flowchart LR`) renders on GitHub inside a ```mermaid block.
- Analogy: subway map: not every street, just lines, stations and transfers.
- Code example: README block: ```mermaid\nflowchart LR\n  U[User /review] --> S[code-review skill]\n  S --> M[Model via OpenCode Zen]\n  M -->|tool calls| T[get_diff / run_tests / submit_review]\n  T --> G[git + node --test]\n  T --> R[review.json]\n  Guard[permission-gate + protected-paths] -.-> T\n``` → renders 7 nodes on GitHub.
- Production use: reviewers/interviewers grasp the design in 30 seconds.
- Common mistakes: diagram of every function; diagram out of sync with code.
- Sources: https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams ; https://mermaid.js.org/syntax/flowchart.html

### Tool list & README
- Concept: README sections: what it does (1 line), demo link, install (`pi install git:github.com/<you>/pi-review-agent`), requirements (Node 26 LTS, Pi 1.6.0, Git Bash, `OPENCODE_API_KEY`), usage (`/review main`), tools table (name | purpose | side effects), safety notes, evals, costs, failure cases, license.
- Analogy: product box: what's inside, batteries needed, how to switch on, warnings.
- Code example: tools table rows: `| get_diff | branch diff vs base | read-only |` / `| run_tests | node --test test/ (120 s timeout) | runs code |` / `| submit_review | writes review.json, ends run | writes 1 file |`.
- Production use: README = first impression.
- Common mistakes: missing setup steps; secrets in examples.
- Sources: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md

### Eval results & cost per task
- Concept: table from topic 22 logs: label, cases, recall, precision, avg tokens, median cost per review, median latency, model + thinking level, date. State sample size and runs per case; show before/after the one change; never cherry-pick.
- Analogy: nutrition label: standard fields, real measured values.
- Code example: `table.ts`: `const rows = [{ label: "base", recall: 0.6, cost: 0.031 }, { label: "v2", recall: 0.8, cost: 0.034 }]; for (const r of rows) console.log(\`| ${r.label} | ${(r.recall * 100).toFixed(0)}% | $${r.cost.toFixed(3)} |\`);` → `| base | 60% | $0.031 |` / `| v2 | 80% | $0.034 |` (illustrative numbers).
- Production use: proof of engineering judgment.
- Common mistakes: no cost column; hiding failures.
- Sources: https://www.anthropic.com/engineering/building-effective-agents

### Documenting failure cases
- Concept: list where the agent fails (huge diffs truncated, flaky tests, generated files, non-English comments), with trace excerpt (exported via `/export`), cause guess, mitigation; each becomes an eval case. Honest limits section ("not a security tool; Pi is not a sandbox").
- Analogy: aircraft incident reports — each one makes the next flight safer.
- Code example: `FAILURES.md` entry template: `## F1: diff over 2000 lines\n- Seen: review missed bug in truncated part\n- Trace: traces/f1.html\n- Mitigation: review per file\n- Eval case: evals/cases/big-diff`.
- Production use: trust from users and interviewers.
- Common mistakes: no failure section; failures without follow-up.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sessions.md#export-or-share-a-session

### Publishing a demo
- Concept: "deployed demo" here = public GitHub repo + installable Pi package + exported HTML trace of a real review (`/export`, reviewed for secrets first) + short screen recording (GIF/video) in README. Steps: `git init`, `.gitignore` (`node_modules/`, `.env`, `review.json`), `gh repo create pi-review-agent --public --source . --push`, tag `v1.0.0` (`git tag v1.0.0 && git push --tags`) so users pin `git:github.com/<you>/pi-review-agent@v1.0.0`. Optional: `npm publish` with `pi-package` keyword for the gallery.
- Analogy: opening night: the stage is public, tickets (install command) printed, programme (README) handed out.
- Code example: verify install as a stranger: new folder → `pi install git:github.com/<you>/pi-review-agent@v1.0.0` → `pi list` shows it → `/review main` works on pi-lab.
- Production use: portfolio link on CV.
- Common mistakes: committing `auth.json`/`.env`; untagged installs drifting.
- Sources: https://cli.github.com/manual/gh_repo_create ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md#install-and-manage-packages

## Quiz
1. What must the diagram show? — tests architecture
2. Three README sections you must include — tests README
3. Why report cost next to recall? — tests eval reporting
4. What do you do with each failure case? — tests failure docs
5. Why tag a version before sharing the install command? — tests publishing
