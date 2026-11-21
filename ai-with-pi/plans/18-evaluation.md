# 18. Evaluation
Version: Pi 1.6.0 + Node.js 26.13.1 LTS
Prerequisites: 17-multi-step-recovery

Week 5 checkpoint: prove a change helped with numbers. Folder `~/pi-lab/evals/`: `tasks.json`, `run.ts`, `results/`. Each task runs in a fresh copy of a fixture folder `evals/fixture/` (copy of src/, test/, docs/) so repo state is identical every run.

## Learning goals
- Learner can explain why fixed evals beat judging by feel.
- Learner can write a fixed task set of 10 tasks (3 easy, 4 medium, 3 hard).
- Learner can define automatic scoring rubrics per task.
- Learner can run tasks headless and capture events.
- Learner can log pass rate, tokens, cost and latency.
- Learner can change one thing, re-run, and compare results.

## Sub-topics
### Why evals beat vibes
- Concept: eval = same tasks, same starting state, same scoring, every change. Models are non-deterministic → one good run proves nothing; run each task ≥2 times. Measure before/after; one variable at a time. Ties back to bad-description experiment (09) and doc checkpoint (13).
- Analogy: weighing yourself on the same scale every morning vs guessing from the mirror.
- Code example: none runnable; table "change | felt better? | measured pass rate" showing a change that felt better but scored lower (illustrative numbers clearly labelled made-up).
- Production use: regression testing for prompts, tools, models.
- Common mistakes: changing model and prompt together; tiny sample, big claims.
- Sources: https://www.anthropic.com/engineering/building-effective-agents ; https://platform.openai.com/docs/guides/evals

### A fixed task set (3 easy, 4 medium, 3 hard)
- Concept: `tasks.json` array of `{ id, level: "easy"|"medium"|"hard", prompt, check }`. Easy: answer questions (e.g. "Which functions does src/math.ts export?"); medium: small edits with tests (add `multiply`, fix `average([])`); hard: multi-file (add `median` + tests + doc update in docs/), triage via `/triage`. Prompts plain text (no `"`, `&`, `%`, `^` — Windows shell quoting, see runner).
- Analogy: a fixed exam paper reused every term so scores are comparable.
- Code example: 2 entries: `{ "id": "e1", "level": "easy", "prompt": "Which functions does src/math.ts export? Answer with names only.", "check": { "type": "answerIncludes", "values": ["add", "divide"] } }`, `{ "id": "m1", "level": "medium", "prompt": "Add export function multiply(a, b) to src/math.ts and a test in test/math.test.ts, then run the tests.", "check": { "type": "command", "cmd": "node --test test/" } }`. Author lists all 10 briefly.
- Production use: grows from real failures (failure cases → new tasks, topic 23).
- Common mistakes: all easy tasks (100% tells nothing); tasks depending on internet.
- Sources: https://nodejs.org/docs/latest-v26.x/api/test.html

### Scoring rubrics
- Concept: prefer automatic checks: `answerIncludes` (all values appear, case-insensitive), `fileIncludes` (file contains text), `command` (exit code 0). Partial credit optional; LLM-as-judge only for fuzzy quality (mention, not built). Score = pass/fail per run.
- Analogy: multiple-choice answer key vs essay marking — key is fast and fair.
- Code example: `score.ts`: `type Check = { type: "answerIncludes"; values: string[] }; export function scoreAnswer(answer: string, c: Check): boolean { const a = answer.toLowerCase(); return c.values.every((v) => a.includes(v.toLowerCase())); } console.log(scoreAnswer("add, divide", { type: "answerIncludes", values: ["add", "divide"] }), scoreAnswer("add only", { type: "answerIncludes", values: ["add", "divide"] }));` → `true false`.
- Production use: CI gate on pass rate.
- Common mistakes: checks too loose ("add" matches "address"); checks the model can game (only checking file exists).
- Sources: https://nodejs.org/docs/latest-v26.x/api/child_process.html#child_processspawnsynccommand-args-options

### Running tasks headless
- Concept: per task: `fs.cp("evals/fixture", tmpDir, { recursive: true })` (tmp via `fs.mkdtemp(path.join(os.tmpdir(), "pi-eval-"))`), `git init` not needed; run `pi --no-session --mode json "<prompt>"` with `cwd: tmpDir`; on Windows npm installs `pi` as a `.cmd` shim → use `spawnSync("pi", args, { cwd, shell: true, encoding: "utf8" })` and quote the prompt with `JSON.stringify(prompt)` (why prompts avoid special chars). Parse stdout by splitting on `\n` (strip `\r`). Final answer = text of last `message_end` with `role: "assistant"`. Topic 21 replaces this with the SDK.
- Analogy: each exam taken in a fresh, identical exam room.
- Code example: `parseEvents(stdout)` returning `{ answer, toolCalls, usage }` — test on a 3-line sample string (author writes it) → e.g. `{ answer: 'add, divide', toolCalls: 1, totalTokens: 1530 }`.
- Production use: nightly eval job.
- Common mistakes: running in the real repo (state drift); reading stderr as events.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/json.md ; https://nodejs.org/docs/latest-v26.x/api/fs.html#fspromisescpsrc-dest-options ; https://nodejs.org/docs/latest-v26.x/api/child_process.html#spawning-bat-and-cmd-files-on-windows

### Logging pass rate, tokens & latency
- Concept: per run record `{ label, taskId, pass, tokens, cost, ms, toolCalls }` appended to `results/<label>.jsonl`. Tokens/cost: sum `usage.totalTokens` and `usage.cost.total` from assistant `message_end` messages. Latency: `Date.now()` before/after spawn. Summary: pass rate %, avg tokens, total cost, median latency.
- Analogy: fitness tracker logging distance, heart rate and time for every run.
- Code example: `summary.ts`: `const rows = [{ pass: true, tokens: 1200, cost: 0.004, ms: 8000 }, { pass: false, tokens: 3000, cost: 0.011, ms: 20000 }, { pass: true, tokens: 1800, cost: 0.006, ms: 12000 }]; const rate = rows.filter((r) => r.pass).length / rows.length; const avgTok = rows.reduce((s, r) => s + r.tokens, 0) / rows.length; const cost = rows.reduce((s, r) => s + r.cost, 0); console.log(\`pass ${(rate * 100).toFixed(0)}% | avg tokens ${avgTok} | cost $${cost.toFixed(3)}\`);` → `pass 67% | avg tokens 2000 | cost $0.021`.
- Production use: README eval table (topic 23).
- Common mistakes: reporting pass rate without cost; ignoring variance.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/message-types.md#usage

### Change one thing, compare (checkpoint)
- Concept: baseline run label `base` (10 tasks × 2 runs). Change ONE thing (e.g. add AGENTS.md rule "always run node --test test/ after edits", or switch model, or improve a tool description). Run label `v2`. Compare table: pass rate, avg tokens, cost, latency. Conclude only if difference is clear; note noise.
- Analogy: A/B test in a shop: change only the window display, compare sales.
- Code example: comparison output sample: `| label | pass | avg tokens | cost |` / `| base | 60% | 2400 | $0.21 |` / `| v2 | 80% | 2600 | $0.24 |` (illustrative numbers, labelled).
- Production use: every prompt/tool/model change in the portfolio (topic 22).
- Common mistakes: different fixture state; rerunning only failed tasks.
- Sources: https://www.anthropic.com/engineering/building-effective-agents

## Quiz
1. Why run each task more than once? — tests non-determinism
2. Why a fresh fixture copy per task? — tests isolation
3. Write an `answerIncludes` check — tests rubrics
4. Where do token counts come from in the event stream? — tests logging
5. What makes a fair before/after comparison? — tests experiment design
