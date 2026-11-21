# 06. The Agent Loop
Version: Pi 1.6.0 + Node.js 26.13.1 LTS
Prerequisites: 05-prompts-messages

Core idea of the course. Build a toy loop with a scripted fake model (no API, deterministic) in `~/pi-lab/loop/toy-agent.ts`, then watch the same loop in Pi.

## Learning goals
- Learner can describe the ReAct loop: reason, act (tool call), observe (tool result), repeat.
- Learner can explain that the model only requests a tool; the harness runs it.
- Learner can name Pi's default tools and their main parameters.
- Learner can list what goes into the context on each turn.
- Learner can name the conditions that stop the loop.

## Sub-topics
### Reason, act, observe (ReAct)
- Concept: ReAct = model reasons, chooses an action (tool call), observes result, reasons again until done. Every agent (Pi, LangGraph, others) is this loop + helpers. Turn = one model response + its tool calls.
- Analogy: detective: think ("check the kitchen"), act (walk there), observe (muddy boots), think again — until case closed.
- Code example: `toy-agent.ts`: scripted model returns steps from an array: step1 `{ tool: "read", args: { path: "src/math.ts" } }`, step2 `{ answer: "divide throws on 0" }`. Loop: `const tools = { read: (a: { path: string }) => \`contents of ${a.path}\` }; const script = [...]; let turn = 0; for (const step of script) { turn++; if ("answer" in step) { console.log(\`turn ${turn}: answer -> ${step.answer}\`); break; } console.log(\`turn ${turn}: call ${step.tool}(${JSON.stringify(step.args)})\`); console.log(\`  observe: ${tools[step.tool](step.args)}\`); }` → `turn 1: call read({"path":"src/math.ts"})` / `  observe: contents of src/math.ts` / `turn 2: answer -> divide throws on 0`. (Author: keep TS valid; type `step` as union.)
- Production use: debugging any agent = finding which loop step went wrong.
- Common mistakes: thinking the model runs code itself; thinking one prompt = one model call.
- Sources: https://arxiv.org/abs/2210.03629 ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/how-pi-works.md

### Tool calling: model asks, harness runs
- Concept: tools are described to the model (name, description, JSON parameter schema). Model replies with a tool-call block `{type:"toolCall", id, name, arguments}`; Pi validates args, runs the tool on your machine, sends back a `toolResult` message (`toolCallId`, `toolName`, `content`, `isError`). Multiple calls in one response run in parallel by default.
- Analogy: restaurant: customer (model) orders from the menu (tool list); kitchen (harness) cooks; waiter brings the plate (tool result). Customer never enters the kitchen.
- Code example: show JSON pair (illustrative): assistant `{"type":"toolCall","id":"call_1","name":"read","arguments":{"path":"src/math.ts"}}` → toolResult `{"role":"toolResult","toolCallId":"call_1","toolName":"read","content":[{"type":"text","text":"export function add..."}],"isError":false}`.
- Production use: everything in topics 08–22 is defining tools and handling results.
- Common mistakes: vague tool descriptions (topic 09); ignoring `isError`.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/message-types.md ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#tool_call

### Pi's default tools (read, write, edit, bash)
- Concept: default-enabled: `read` {path, offset?, limit?}, `bash` {command, timeout?}, `edit` (exact text replacement: path + edits [{oldText,newText}]), `write` (create/overwrite file). Also available: grep, find, ls, powershell (Windows only). Change with `defaultTools` setting or `pi -t read,bash`. They run with your user's permissions — no sandbox.
- Analogy: four basic workshop tools: magnifier (read), pen (write), correction tape (edit), power drill (bash — most powerful, most dangerous).
- Code example: in `pi-lab`: prompt `Add a multiply function to src/math.ts like add` → trace shows `read src/math.ts` then `edit src/math.ts` (sample). Ctrl+O expands tool output. Then `git diff` shows `+export function multiply(a: number, b: number): number {` (sample).
- Production use: read-only sessions (`pi -t read,grep,find,ls`) for safe exploration.
- Common mistakes: letting bash run in a folder with important files; not checking `git diff`.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md#tools ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/windows.md

### What goes into context each turn
- Concept: each model call sends: system prompt (base + AGENTS.md + tool snippets + skill names/descriptions), all prior messages on the active branch (user, assistant, tool results), tool definitions. Context grows every turn → cost grows; Pi compacts near the limit (topic 14). Extensions can change it (`context` event, topic 10).
- Analogy: re-briefing a forgetful expert every call: you hand over the whole case file each time, and the file gets thicker.
- Code example: `growth.ts`: `const sys = 900; const perTurn = [300, 1200, 400]; let ctx = sys; perTurn.forEach((t, i) => { ctx += t; console.log(\`turn ${i + 1}: ~${ctx} tokens sent\`); });` → `turn 1: ~1200 tokens sent` / `turn 2: ~2400 tokens sent` / `turn 3: ~2800 tokens sent`.
- Production use: keep tool outputs small; summarize; prompt caching (topic 20).
- Common mistakes: reading entire large files; long sessions without `/compact` or `/new`.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/how-pi-works.md#context ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sessions.md#manage-conversation-context

### Stop conditions
- Concept: loop ends when model replies with no tool calls (final answer); or user aborts (Esc); or an error that retries cannot fix (Pi auto-retries transient failures, `retry.maxRetries` default 3); or a tool returns `terminate: true` (whole batch). Harness-level guards you add later: max steps, timeouts (topic 15). `agent_end` vs `agent_settled` (settled = Pi will not continue automatically).
- Analogy: a taxi ride ends when passenger says "here is fine", or passenger jumps out (Esc), or car breaks down after 3 restart tries.
- Code example: extend toy loop with `const MAX_STEPS = 3;` and a script of 5 tool steps → prints 3 calls then `stopped: max steps (3) reached`.
- Production use: runaway loops burn money; every production agent needs a hard cap.
- Common mistakes: no max steps; treating `agent_end` as final.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/json.md#agent-and-turn-events ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/settings.md

## Quiz
1. Order the ReAct steps — tests loop
2. Who executes a tool call? — tests harness role
3. Which default tool is most dangerous and why? — tests tools
4. Why does cost grow each turn? — tests context
5. Name two loop stop conditions — tests stopping
