# 22. Portfolio: Code Review Agent
Version: Pi 1.6.0 + Node.js 26.13.1 LTS
Prerequisites: 21-sdk-packages

Week 6 build (portfolio option 1). New repo/package `~/pi-review-agent/`: `extensions/review.ts` (tools `get_diff`, `run_tests`, `submit_review`; command `/review`), `skills/code-review/SKILL.md`, `evals/`. Reviews pi-lab branches. Reuses guards (19), eval runner (18/21).

## Learning goals
- Learner can expose a PR diff to the agent with a `get_diff` tool.
- Learner can make the agent check changes against AGENTS.md conventions.
- Learner can build a `run_tests` tool with timeout and truncated output.
- Learner can force structured JSON findings with a `submit_review` tool.
- Learner can combine skill + extension into one review workflow.
- Learner can measure the agent with an eval before and after a change.

## Sub-topics
### Reading a PR diff with git
- Concept: PR (pull request) = proposed branch changes; diff = lines added (`+`) / removed (`-`) per file with hunk headers `@@ -a,b +c,d @@`. `git diff main...HEAD` = changes on this branch since it left main. Tool `get_diff` params `{ base?: string (default "main") }`; execute `pi.exec("git", ["diff", "--unified=3", \`${base}...HEAD\`], { signal, cwd: ctx.cwd })`; error if `code !== 0`; truncate with `truncateHead` (50KB/2000 lines). Reject `base` not matching `/^[\w./-]+$/` (input validation).
- Analogy: diff = tracked-changes view in a document: red strikethrough and green insertions.
- Code example: seed branch in pi-lab: `git switch -c feature/median`, add `median` with a bug (no sort) and no test, commit. `git diff main...HEAD --stat` → ` src/stats.ts | 5 +++++` / ` 1 file changed, 5 insertions(+)` (exact for the 5-line function author defines).
- Production use: same tool works in CI on PR branches.
- Common mistakes: `main..HEAD` vs `main...HEAD` confusion; passing user text into a shell string (use `pi.exec` arg arrays — no shell).
- Sources: https://git-scm.com/docs/git-diff ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#piexeccommand-args-options

### Checking repo conventions (AGENTS.md)
- Concept: conventions = repo rules (naming, tests required, no enums...). Pi loads AGENTS.md automatically → reviewer compares diff to them. Make rules checkable: "Every new exported function needs a test in test/". Finding must quote the rule.
- Analogy: building inspector with the city code book open.
- Code example: pi-lab AGENTS.md adds `- Every new exported function in src/ needs a test in test/.` → expected finding for the seeded branch: `{ file: "src/stats.ts", severity: "medium", message: "median has no test (AGENTS.md: every new exported function needs a test)" }` (sample wording).
- Production use: consistent reviews across a team.
- Common mistakes: vague rules ("write clean code"); conflicting rules.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/configuration.md ; https://agents.md/

### A run-tests tool
- Concept: `run_tests` (no params) → `pi.exec("node", ["--test", "test/"], { signal, cwd: ctx.cwd, timeout: 120_000 })`; return `code`, `killed`, last 100 lines via `truncateTail`; `isError` not set for failing tests (a failing test is a review finding, not a tool failure) — explain choice; set `details: { code }`.
- Analogy: reviewer actually test-drives the car instead of only reading the spec sheet.
- Code example: summarize helper: `const summary = (code: number, killed: boolean) => killed ? "tests timed out" : code === 0 ? "tests passed" : \`tests failed (exit ${code})\`; console.log(summary(0, false), "|", summary(1, false), "|", summary(143, true));` → `tests passed | tests failed (exit 1) | tests timed out`.
- Production use: evidence-based reviews.
- Common mistakes: no timeout; dumping full logs into context.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#output-truncation ; https://nodejs.org/docs/latest-v26.x/api/test.html

### Structured findings (JSON)
- Concept: final tool `submit_review` params `{ summary: string, findings: Array<{ file, line (number ≥1), severity: StringEnum(["high","medium","low"]), message, suggestion? }> }`; execute writes `review.json` (`JSON.stringify(params, null, 2)`) and returns `terminate: true` so the run ends on the structured result. Schema = format guarantee; Pi validates. Prompt guideline: "Use submit_review exactly once at the end of a review."
- Analogy: standardized inspection form, filed once at the end.
- Code example: `const review = { summary: "1 bug, 1 missing test", findings: [{ file: "src/stats.ts", line: 2, severity: "high", message: "median does not sort input" }, { file: "src/stats.ts", line: 1, severity: "medium", message: "no test for median" }] }; const high = review.findings.filter((f) => f.severity === "high").length; console.log(\`${review.findings.length} findings, ${high} high\`);` → `2 findings, 1 high`.
- Production use: post findings as PR comments (e.g. `gh pr review` / API) — mention as extension point.
- Common mistakes: free-text reviews impossible to score; forgetting `terminate`.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#tool-definition ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/structured-output.ts

### Review skill + extension together
- Concept: skill `code-review/SKILL.md` = procedure: 1 `get_diff`, 2 read changed files around hunks, 3 check AGENTS.md rules, 4 `run_tests`, 5 `submit_review` with file+line evidence; no style nitpicks; severity guide. Extension = tools + `/review [base]` command calling `pi.sendUserMessage(\`/skill:code-review Review the diff against ${args || "main"}\`, { expandPromptTemplates: true })`. Guards from topic 19 loaded too; reviewer read-only: `pi.setActiveTools(["read", "grep", "find", "ls", "get_diff", "run_tests", "submit_review"])`.
- Analogy: skill = inspection checklist; extension = inspector's instruments.
- Code example: `/review main` on feature/median → trace: get_diff → read src/stats.ts → run_tests → submit_review; `review.json` has ≥1 high finding about sorting (sample).
- Production use: package it (21) so others `pi install` it.
- Common mistakes: reviewer with write tools enabled; skill duplicating tool descriptions.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#pisendusermessagecontent-options

### Eval before & after a change
- Concept: 5 seeded-bug branches (fixtures) each with known expected findings `{ file, line }`; score = expected finding matched (same file, |line diff| ≤ 3) → recall; false findings count → precision. Run baseline, change ONE thing (e.g. add severity guide to skill), re-run with SDK runner (21); log pass rate, tokens, cost, latency.
- Analogy: planting known defects on a test track to see if the inspector finds them.
- Code example: `const match = (exp: { file: string; line: number }, got: { file: string; line: number }[]) => got.some((g) => g.file === exp.file && Math.abs(g.line - exp.line) <= 3); console.log(match({ file: "src/stats.ts", line: 2 }, [{ file: "src/stats.ts", line: 4 }]), match({ file: "src/stats.ts", line: 2 }, [{ file: "src/math.ts", line: 2 }]));` → `true false`.
- Production use: numbers for the README (23).
- Common mistakes: tuning on the same 5 cases forever (overfitting); ignoring false positives.
- Sources: https://www.anthropic.com/engineering/building-effective-agents

## Quiz
1. `main...HEAD` shows what? — tests diffs
2. Why `pi.exec` arrays instead of a shell string? — tests safety
3. Should failing tests mark the tool as error? — tests run_tests design
4. What does `terminate: true` do in submit_review? — tests structured output
5. Recall vs precision for review evals — tests scoring
