# 05. Prompts & Messages
Version: Pi 1.6.0 + Node.js 26.13.1 LTS
Prerequisites: 04-llm-fundamentals

Lab: `~/pi-lab`. Add `src/math.ts` here (used by later topics): `export function add(a: number, b: number): number { return a + b; } export function divide(a: number, b: number): number { if (b === 0) throw new Error("Cannot divide by zero"); return a / b; }`.

## Learning goals
- Learner can tell system, user, assistant and tool-result messages apart.
- Learner can write prompts with role, constraints and examples.
- Learner can ask for JSON output and validate it in TypeScript.
- Learner can steer Pi with AGENTS.md, and know when SYSTEM.md / APPEND_SYSTEM.md apply.
- Learner can change the thinking level and explain the cost trade-off.

## Sub-topics
### System vs user vs assistant messages
- Concept: chat models take a list of messages with roles: system (standing rules from the harness), user (your request), assistant (model replies, may contain tool calls), toolResult (output Pi sends back after running a tool). Pi builds its system prompt from base instructions + context files + tool list + skill descriptions; under ~1,000 tokens base.
- Analogy: theatre: system = director's notes before the show; user = audience question; assistant = actor's line; tool result = stagehand bringing the prop asked for.
- Code example: `messages.ts` (plain data, no API): `type Msg = { role: "system" | "user" | "assistant"; content: string }; const convo: Msg[] = [{ role: "system", content: "You are a terse coding assistant." }, { role: "user", content: "What does divide do?" }, { role: "assistant", content: "Divides a by b; throws on b = 0." }]; for (const m of convo) console.log(\`${m.role}: ${m.content}\`);` → three lines `system: You are a terse coding assistant.` / `user: What does divide do?` / `assistant: Divides a by b; throws on b = 0.`
- Production use: reading traces (topic 07) means reading these roles.
- Common mistakes: putting standing rules in each user message; thinking the model remembers across sessions.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/message-types.md ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/how-pi-works.md#context

### Prompt patterns (role, constraints, examples)
- Concept: good prompt = role/goal + context + constraints (format, length, what not to do) + examples (few-shot) + success criteria. Specific beats vague.
- Analogy: briefing a new contractor: who they are, what job, rules of the site, a photo of the finished result.
- Code example: in Pi, vague `fix math` vs precise `In src/math.ts, make divide return NaN instead of throwing when b is 0? No — keep the throw. Add a JSDoc comment above divide describing the throw. Change nothing else.` → observe precise prompt yields one targeted edit (sample, varies). Show `git diff` to check.
- Production use: prompt templates (topic 10) and skills (13) are saved prompts.
- Common mistakes: no constraints → agent edits extra files; contradictory instructions.
- Sources: https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview ; https://platform.openai.com/docs/guides/prompt-engineering

### Structured output (JSON)
- Concept: ask for JSON only with an exact shape; parse with `JSON.parse`; validate fields; models may wrap in ``` fences → strip; retry on failure. Pi headless: `pi -p "..."` prints final text. Later: Pi tools can declare `outputSchema` (topic 22).
- Analogy: asking a clerk to fill a printed form instead of writing a letter — easy to check each box.
- Code example: `parse-review.ts`: `const raw = '\`\`\`json\n{"file":"src/math.ts","issues":1}\n\`\`\`'; const cleaned = raw.replace(/^\`\`\`(json)?\n?|\n?\`\`\`$/g, ""); const data = JSON.parse(cleaned) as { file: string; issues: number }; if (typeof data.issues !== "number") throw new Error("bad shape"); console.log(data.file, data.issues);` → `src/math.ts 1`. Live: `pi -p 'Reply ONLY with JSON {"file": string, "functions": string[]} for src/math.ts'` → sample `{"file":"src/math.ts","functions":["add","divide"]}` (varies).
- Production use: code-review agent findings as JSON (topic 22); eval scoring (18).
- Common mistakes: trusting output without validation; `JSON.parse` on text with prose around it.
- Sources: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md#invocation-and-output

### AGENTS.md, SYSTEM.md & APPEND_SYSTEM.md
- Concept: AGENTS.md (or CLAUDE.md) = project instructions Pi loads every session from agent dir, cwd and parents; no trust needed (so treat others' repos' AGENTS.md as untrusted). `AGENTS.override.md` replaces in its dir. `SYSTEM.md` replaces Pi's default system prompt; `APPEND_SYSTEM.md` appends; in `~/.pi/agent/` or `.pi/` (project ones need trust). Prefer AGENTS.md; rarely SYSTEM.md.
- Analogy: AGENTS.md = house rules taped on the fridge — every visitor reads them; SYSTEM.md = rewriting the whole employee contract.
- Code example: `~/pi-lab/AGENTS.md`: `# pi-lab rules\n- TypeScript only, no enums.\n- Run node --test before saying done.\n- Never edit files outside src/ and test/.` Restart Pi → startup header lists AGENTS.md; ask `What are this repo's rules?` → model restates 3 rules (sample).
- Production use: repo conventions for the code-review agent (topic 22).
- Common mistakes: huge AGENTS.md eating context; putting secrets in it.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/configuration.md ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/security.md#understand-project-trust

### Thinking levels
- Concept: reasoning models can "think" (hidden reasoning tokens) before answering. Pi levels: off, minimal, low, medium, high, xhigh, max; default `medium` (`defaultThinkingLevel`). `/thinking` or Shift+Tab cycles; `--thinking <level>` or `--model <pattern>:high`. Ctrl+T shows/hides thinking blocks. More thinking = more output tokens = more cost/latency. Not all models support all levels.
- Analogy: asking someone to "think out loud on scrap paper" first: better on hard puzzles, wasteful for "what's 2+2".
- Code example: `pi --thinking off -p "What is 17*23?"` vs `pi --thinking high -p "..."`; compare token counts in `/session` of interactive runs (sample, varies). Expected answer `391` both.
- Production use: per-task thinking (low for exploration, high for tricky fixes; topic 20).
- Common mistakes: max thinking everywhere; assuming thinking text is shown to users.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/settings.md#model-and-thinking ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/usage.md

## Quiz
1. Which role carries Pi's standing rules? — tests roles
2. Rewrite a vague prompt with a constraint — tests prompt patterns
3. Why validate parsed JSON? — tests structured output
4. AGENTS.md vs SYSTEM.md — tests context files
5. Cost effect of a higher thinking level — tests thinking
