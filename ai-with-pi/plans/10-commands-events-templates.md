# 10. Commands, Events & Prompt Templates
Version: Pi 1.6.0 + Node.js 26.13.1 LTS
Prerequisites: 09-tool-design

Build `~/pi-lab/.pi/extensions/logger.ts` (command + events) and `~/pi-lab/.pi/prompts/explain.md`.

## Learning goals
- Learner can add a slash command with `pi.registerCommand`.
- Learner can react to lifecycle events (`session_start`, `turn_end`, `agent_end`).
- Learner can inspect, block or patch tool calls in `tool_call` and change results in `tool_result`.
- Learner can write a prompt template with arguments.
- Learner can choose between an extension, a skill and a prompt template.

## Sub-topics
### registerCommand
- Concept: `pi.registerCommand("name", { description, handler: async (args, ctx) => {} })` → user types `/name args`. Commands run in the harness, not the model (no tokens). `ctx.ui.notify(text, "info")`. Command ctx extends normal ctx with session control (`waitForIdle`, `newSession`...). Same name in two extensions → `/name:1`, `/name:2`.
- Analogy: command = button on the workshop wall you press yourself; tool = job you let the worker decide to do.
- Code example: `pi.registerCommand("stats", { description: "Show session entry count", handler: async (_args, ctx) => { const n = ctx.sessionManager.getEntries().length; ctx.ui.notify(\`${n} entries\`, "info"); } });` → `/stats` shows e.g. `12 entries` (sample count).
- Production use: `/approve` for plans (topic 15), `/remember` (14), `/eval` helpers.
- Common mistakes: doing slow work without feedback; calling session-control methods from event handlers (only commands; can deadlock).
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#piregistercommandname-options ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#extensioncommandcontext

### Lifecycle events (session_start, turn_end, agent_end)
- Concept: `pi.on(event, async (event, ctx) => {})`. Order: input → before_agent_start → agent_start → turns (turn_start, message_*, tool_* , turn_end) → agent_end → (maybe more runs) → agent_settled. `session_start` reason: startup/reload/new/resume/fork. `turn_end` has `turnIndex`, `message`, `toolResults`. `agent_end` has `messages` but Pi may still retry; use `agent_settled` for "really done".
- Analogy: events = doorbells wired around the house: front door (session_start), each room you leave (turn_end), leaving the house (agent_end), locking up for the night (agent_settled).
- Code example: `logger.ts`: `let calls = 0; pi.on("turn_end", async (event) => { calls += event.toolResults.length; }); pi.on("agent_settled", async (_e, ctx) => { ctx.ui.notify(\`run finished, ${calls} tool calls so far\`, "info"); });` → after a 2-tool run: `run finished, 2 tool calls so far` (sample).
- Production use: metrics, cost tracking, audit logs.
- Common mistakes: assuming agent_end is final; heavy sync work blocking the loop.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#lifecycle-overview ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#turn_start--turn_end

### Intercepting tool_call & tool_result
- Concept: `tool_call` fires before a tool runs; can block (`return { block: true, reason }`) or mutate `event.input` in place (no re-validation after). `isToolCallEventType("bash", event)` narrows types (`event.input.command`). Handler error blocks the tool (fail-safe). `tool_result` fires after; may return partial patch (`content`, `details`, `isError`); handlers chain in load order.
- Analogy: tool_call = security checkpoint before the factory floor; tool_result = quality inspector at the exit who can stamp or relabel the product.
- Code example: `import { isToolCallEventType } from "@earendil-works/pi-coding-agent"; pi.on("tool_call", async (event) => { if (isToolCallEventType("bash", event) && event.input.command.includes("git push")) return { block: true, reason: "git push is disabled in pi-lab" }; }); pi.on("tool_result", async (event) => { if (event.toolName === "read" && !event.isError) return { content: [...event.content, { type: "text", text: "[logged by logger.ts]" }] }; });` Prompt `Push my changes` → trace shows blocked result with reason `git push is disabled in pi-lab` (sample).
- Production use: guardrails (topic 19), redaction, logging.
- Common mistakes: forgetting a handler throwing blocks everything; replacing `content` drops `structuredContent`.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#tool_call ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#tool_result

### Prompt templates & argument expansion
- Concept: Markdown file → `/filename` command. Locations `~/.pi/agent/prompts/*.md` (direct children only), project `.pi/prompts/` (needs trust). Frontmatter `description`, `argument-hint`. Args: `$1`, `$2`, `$@`/`$ARGUMENTS`, `${1:-default}`, `${@:N}`, `${@:N:L}`; shell-like quoting. `/reload` after edits. Expands before the agent sees text.
- Analogy: template = rubber stamp with blanks you fill in each time.
- Code example: `.pi/prompts/explain.md`: `---\ndescription: Explain a file for a beginner\nargument-hint: "<file> [level]"\n---\nExplain $1 to a ${2:-beginner}. List each function with one sentence.` → `/explain src/math.ts` expands to `Explain src/math.ts to a beginner. List each function with one sentence.`; `/explain src/math.ts expert` → `... to a expert. ...` (show grammar quirk as lesson: template text is literal).
- Production use: team-standard prompts (review, release notes).
- Common mistakes: putting templates in nested folders (not discovered); expecting templates to run code.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/prompt-templates.md

### Extensions vs skills vs templates
- Concept: template = reusable text (no code). Skill = SKILL.md instructions (+ scripts/references) loaded on demand when task matches (topic 13). Extension = TypeScript with programmatic control (tools, events, commands). Pick the lightest that works. Packages bundle all (topic 21).
- Analogy: template = sticky note; skill = manual on the shelf, opened when needed; extension = new machine installed in the workshop.
- Code example: decision table, 3 rows: "same review prompt daily" → template; "how to cite docs" → skill; "call weather API / block commands" → extension.
- Production use: avoid code where instructions suffice.
- Common mistakes: writing an extension for what a template does; giant skills.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md

## Quiz
1. Do commands cost model tokens? — tests registerCommand
2. agent_end vs agent_settled — tests lifecycle
3. How to block a bash command in tool_call? — tests interception
4. Expand `${1:-beginner}` with no args — tests templates
5. Which mechanism for "always cite sources"? — tests choosing mechanism
