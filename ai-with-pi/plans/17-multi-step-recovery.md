# 17. Multi-Step Agents & Recovery
Version: Pi 1.6.0 + Node.js 26.13.1 LTS
Prerequisites: 16-mcp-bridge

Week 4 checkpoint: agent recovers from a failed tool call. Lab additions: `src/stats.ts` with a bug: `export function average(xs: number[]): number { return xs.reduce((a, b) => a + b, 0) / xs.length; }` (empty list → NaN); issue file `issues/42.md`: "average([]) returns NaN. It should throw an Error with message 'average of empty list'." Extension `~/pi-lab/.pi/extensions/recovery.ts`. Template `.pi/prompts/triage.md`.

## Learning goals
- Learner can run an issue-triage workflow end to end: read issue, find code, fix, test, summarize.
- Learner can guide the agent to find relevant code with search tools.
- Learner can write a `node:test` test and have the agent run it.
- Learner can detect failed tool calls in an extension.
- Learner can add retry, fallback and clean give-up behaviour.
- Learner can demonstrate recovery from a failed tool call.

## Sub-topics
### Issue-triage workflow end to end
- Concept: workflow = fixed sequence of agent stages: 1 read issue, 2 locate code, 3 reproduce with a failing test, 4 fix, 5 run tests, 6 summarize (what, why, files, test result). Encode as a prompt template; reuse planning guards (15). GitHub option: `gh issue view 42` output piped in (`gh issue view 42 | pi -p "Triage this issue"`), course uses local file (no account needed).
- Analogy: hospital triage: assess, locate the problem, test, treat, write the discharge note.
- Code example: `.pi/prompts/triage.md`: `---\ndescription: Triage and fix an issue file\nargument-hint: "<issue-file>"\n---\nRead $1. Find the relevant code with grep/find. Write a failing test first, then fix the code, run node --test test/, and finish with a summary: cause, fix, files changed, test result.` → `/triage issues/42.md` (sample trace: read issues/42.md → bash grep average → read src/stats.ts → write test → edit src/stats.ts → bash node --test).
- Production use: issue bots, on-call helpers.
- Common mistakes: fixing before reproducing; summary without test evidence.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/prompt-templates.md ; https://cli.github.com/manual/gh_issue_view

### Finding relevant code
- Concept: search before reading: `grep -rn "average" src` (bash) or Pi's `grep`/`find` tools (enable with `-t` or `defaultTools`); read only matching files; ask for file:line evidence. Saves context vs reading whole repo.
- Analogy: using the book index before reading chapters.
- Code example: Git Bash in pi-lab: `grep -rn "function average" src` → `src/stats.ts:1:export function average(xs: number[]): number {`.
- Production use: big repos make search-first mandatory.
- Common mistakes: reading node_modules; regex too broad.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md#tools ; https://www.gnu.org/software/grep/manual/grep.html

### Proposing a fix & running tests (node:test)
- Concept: `node:test` built-in runner: `import { test } from "node:test"; import assert from "node:assert/strict";` run `node --test test/stats.test.ts` (TS via type stripping). Failing test first proves the bug; fix makes it pass. Exit code 0 = pass.
- Analogy: smoke alarm test: press the button (failing test) before trusting it.
- Code example: `test/stats.test.ts`: `import { test } from "node:test"; import assert from "node:assert/strict"; import { average } from "../src/stats.ts"; test("average of numbers", () => { assert.equal(average([2, 4]), 3); }); test("average of empty list throws", () => { assert.throws(() => average([]), /average of empty list/); });` Before fix: second test fails (`# fail 1`). Fix: `if (xs.length === 0) throw new Error("average of empty list");` → `# pass 2` / `# fail 0`.
- Production use: agents must prove fixes with tests.
- Common mistakes: agent editing the test to pass; forgetting `.ts` in import.
- Sources: https://nodejs.org/docs/latest-v26.x/api/test.html ; https://nodejs.org/docs/latest-v26.x/api/assert.html#assertthrowsfn-error-message

### Detecting failed tool calls
- Concept: signals: `tool_result` event `event.isError === true` (thrown errors, blocked calls, validation failures); `tool_execution_end` `isError`; for bash, a non-zero exit is reported in the result (check text). Track per tool name in a `Map<string, number>` of consecutive failures; reset on success.
- Analogy: car dashboard warning lights counted per system.
- Code example: `const fails = new Map<string, number>(); pi.on("tool_result", async (event) => { const n = event.isError ? (fails.get(event.toolName) ?? 0) + 1 : 0; fails.set(event.toolName, n); });` Pure helper test: `function bump(m: Map<string, number>, tool: string, err: boolean) { const n = err ? (m.get(tool) ?? 0) + 1 : 0; m.set(tool, n); return n; } const m = new Map(); console.log(bump(m, "bash", true), bump(m, "bash", true), bump(m, "bash", false));` → `1 2 0`.
- Production use: alerting, auto-recovery.
- Common mistakes: counting all tools together; never resetting.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#tool_result ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/json.md#tool-execution-events

### Retry, fallback & giving up cleanly
- Concept: policy: 1st failure → model retries itself (error text says how); 2nd consecutive failure of same tool → steer message suggesting a fallback (`pi.sendMessage({ customType: "recovery", content: "<tool> failed twice. Try a different approach (another tool or smaller input) or ask the user.", display: true }, { deliverAs: "steer" })`); 3rd → give up: `ctx.abort()` + notify summary of what failed. Exponential backoff only for transient errors (HTTP 429/5xx) inside your own tool. Pi already retries provider errors (`retry.maxRetries` 3).
- Analogy: phone call: redial once, then try email, then leave a clear voicemail and stop.
- Code example: `backoff.ts`: `const delays = [0, 1, 2].map((i) => 500 * 2 ** i); console.log(delays);` → `[ 500, 1000, 2000 ]`.
- Production use: unattended agents must fail loudly, not loop.
- Common mistakes: infinite retry; retrying non-transient errors (404, validation).
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#pisendmessagemessage-options ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/settings.md

### Checkpoint: recovery from a failed tool call
- Concept: deterministic failure: tool `flaky_status` fails on its first call per session, succeeds after. Prompt `Check the status with flaky_status`. Pass = trace shows error result then a successful retry and a correct final answer; recovery extension notice not triggered (only 1 failure). Second run: make it fail 3 times → pass = clean give-up notice, no loop.
- Analogy: fire drill — the alarm is fake, the response must be real.
- Code example: `let calls = 0; pi.registerTool({ name: "flaky_status", label: "Flaky Status", description: "Return service status. May fail temporarily; retry once if it does.", parameters: Type.Object({}), async execute() { calls++; if (calls === 1) throw new Error("Temporary failure: service warming up, retry once."); return { content: [{ type: "text", text: "status: ok" }], details: { calls } }; } });` → trace: `RESULT flaky_status error=true` then `RESULT flaky_status error=false`, final text mentions `status: ok` (sample wording).
- Production use: chaos testing for agents.
- Common mistakes: tool error text not suggesting retry; testing only happy path.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#tool-definition

## Quiz
1. Why write a failing test before the fix? — tests workflow
2. Which event field marks a failed tool? — tests detection
3. Consecutive-failure counter after error, error, success? — tests counter (0)
4. When should you NOT retry? — tests retry policy
5. What proves the checkpoint passed? — tests recovery evidence
