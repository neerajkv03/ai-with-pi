# 07. Reading Pi Traces
Version: Pi 1.6.0 + Node.js 26.13.1 LTS
Prerequisites: 06-agent-loop

Week 1 checkpoint: explain one full Pi trace tool by tool. Script lives in `~/pi-lab/traces/trace.ts`. Author must include a small hand-written sample session file `sample.jsonl` (5 lines) so trace.ts output is exact.

## Learning goals
- Learner can find a session file and read `/session` stats.
- Learner can identify `toolCall` blocks and `toolResult` messages in JSONL.
- Learner can run Pi headless with `-p` and `--mode json` and save the event stream.
- Learner can use `/export` and `/debug` for deeper inspection.
- Learner can write a TS script that prints a trace tool by tool.
- Learner can ask Pi why it chose a tool and judge the answer.

## Sub-topics
### Session files (JSONL) & /session
- Concept: JSONL = one JSON object per line. Pi saves each session at `~/.pi/agent/sessions/--<path>--/<timestamp>_<session-id>.jsonl` (Windows: `C:\Users\you\.pi\agent\sessions\...`; path separators and `:` become `-`). Line 1 header `{"type":"session","version":3,"id","timestamp","cwd"}`; entries have `id`/`parentId` (tree for branches). `/session` shows file, id, message count, tokens, cost. `--no-session` = no file.
- Analogy: session file = flight recorder (black box): every message and tool use written line by line, readable after landing.
- Code example: in Pi `/session` → shows path and totals (sample). Git Bash: `ls ~/.pi/agent/sessions/` → folder like `--C--Users-you-pi-lab--` (sample, exact name derived from path rule).
- Production use: debugging, audits, eval logs.
- Common mistakes: sharing sessions with secrets/file contents; editing session files by hand.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/session-format.md#file-location ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sessions.md#control-session-storage

### toolCall & toolResult entries
- Concept: entry `{"type":"message","id","parentId","timestamp","message":{...}}`. Assistant message `content` array: `text`, `thinking`, `toolCall` {id, name, arguments}. Tool result = separate message `role:"toolResult"`, `toolCallId` matches the call `id`, `toolName`, `content`, `isError`. Assistant messages carry `usage` (input, output, cacheRead, cacheWrite, totalTokens, cost.total).
- Analogy: matching order tickets: each kitchen ticket (toolResult) carries the order number (toolCallId) of the order it answers.
- Code example: sample.jsonl lines (author writes exactly): header; user "What does divide do?"; assistant with toolCall id `call_1` read {path:"src/math.ts"}; toolResult call_1 read isError false; assistant text "divide throws when b is 0.". Explain each line.
- Production use: correlating calls/results is how eval and guard logs work.
- Common mistakes: assuming result sits inside the assistant message; ignoring `isError`.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/message-types.md ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/session-format.md#sessionmessageentry

### Headless runs with --print & --mode json
- Concept: `pi -p "msg"` prints final answer and exits (scripts). `pi --mode json "msg" > events.jsonl` streams events: session header, agent_start, turn_start, message_*, tool_execution_start {toolCallId, toolName, args}, tool_execution_end {result, isError, durationMs}, turn_end, agent_end, agent_settled. Stdout JSONL only; logs on stderr. Use `--no-session` for throwaway runs.
- Analogy: `-p` = getting only the final receipt; `--mode json` = live CCTV feed of the whole shop.
- Code example: `pi --mode json --no-session "List files in src" > events.jsonl`; then `grep tool_execution_end events.jsonl | head -1` → one line with `"toolName":"ls"` or `"bash"` (sample, model chooses).
- Production use: eval runner (topic 18) parses this stream.
- Common mistakes: parsing with Node `readline` (splits on Unicode separators — docs say split on LF); mixing stderr into the file.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/json.md ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md#invocation-and-output

### /export & /debug
- Concept: `/export` writes the session as HTML (readable) or JSONL; `/share` uploads (review first: contains file contents). `/debug` writes `pi-debug.log` in the agent dir (`~/.pi/agent/`). Ctrl+O expands tool output, Ctrl+T toggles thinking.
- Analogy: `/export` = printing the flight log as a booklet; `/debug` = mechanic's engine readout.
- Code example: in Pi `/export` → choose HTML → open the file in a browser; `/debug` → `ls ~/.pi/agent/pi-debug.log` → file exists.
- Production use: attaching traces to bug reports.
- Common mistakes: sharing exports that include `.env` contents read by a tool.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sessions.md#export-or-share-a-session ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/usage.md

### Explaining a trace tool by tool
- Concept: method: for each turn note (1) why the model called the tool (its text/thinking), (2) arguments, (3) result/error, (4) what it did next. Write a reader script.
- Analogy: replaying a chess game move by move with commentary.
- Code example: `trace.ts`: `import { readFileSync } from "node:fs"; const lines = readFileSync(process.argv[2], "utf8").split("\n").map((l) => l.replace(/\r$/, "")).filter(Boolean); for (const line of lines) { const e = JSON.parse(line); if (e.type !== "message") continue; const m = e.message; if (m.role === "assistant") { for (const b of m.content) { if (b.type === "toolCall") console.log(\`CALL ${b.name} ${JSON.stringify(b.arguments)}\`); if (b.type === "text") console.log(\`SAY  ${b.text}\`); } } if (m.role === "toolResult") console.log(\`RESULT ${m.toolName} error=${m.isError}\`); }` ; `node trace.ts sample.jsonl` → `CALL read {"path":"src/math.ts"}` / `RESULT read error=false` / `SAY  divide throws when b is 0.` (exact for sample file).
- Production use: checkpoint: run on a real session of a small refactor in pi-lab and write 1 line per tool.
- Common mistakes: forgetting header/non-message lines; Windows `\r` line endings.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/session-format.md#parsing-example ; https://nodejs.org/docs/latest-v26.x/api/fs.html#fsreadfilesyncpath-options

### Asking Pi why it chose a tool
- Concept: daily drill: after a run ask `Why did you call bash instead of read for that step?`. Answer is a post-hoc explanation (model re-reads history), not a true record of internal reasoning; compare with thinking blocks (Ctrl+T) and tool descriptions. Use answers to improve prompts/tool descriptions.
- Analogy: asking a footballer after the match why they passed left — useful, but memory is a reconstruction.
- Code example: in pi-lab: `Find where divide is defined` → model may use `bash` with grep (sample); then `Why bash and not read?` → sample reply "needed to search across files first"; note it.
- Production use: tool-description tuning (topic 09).
- Common mistakes: treating the explanation as ground truth.
- Sources: https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/usage.md

## Quiz
1. Which field links a toolResult to its call? — tests toolCallId
2. `-p` vs `--mode json` — tests headless modes
3. Where is `pi-debug.log` written? — tests /debug
4. Why strip `\r` when splitting lines on Windows? — tests parsing
5. Is "why did you call X" a reliable record? — tests post-hoc explanations
