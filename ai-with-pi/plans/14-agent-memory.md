# 14. Agent Memory
Version: Pi 1.6.0 + Node.js 26.13.1 LTS
Prerequisites: 13-retrieval-skill

Build `~/pi-lab/.pi/extensions/memory.ts`: tools `remember` / `recall`, file `~/pi-lab/.pi/memory.jsonl`. Simple keyword recall (embeddings optional upgrade, mention only).

## Learning goals
- Learner can explain short-term memory (session context) and how Pi compaction works.
- Learner can store long-term memories in a file.
- Learner can build `remember` and `recall` tools.
- Learner can decide what is worth remembering.
- Learner can check context usage and keep memory injection within a budget.

## Sub-topics
### Short-term memory: session context & compaction
- Concept: short-term memory = messages on the active session branch sent every turn. Near the limit Pi auto-compacts when `contextTokens > contextWindow - reserveTokens` (`compaction.reserveTokens` default 16384); keeps recent `compaction.keepRecentTokens` (default 20000) and replaces older messages with an LLM summary (`CompactionEntry`). Originals stay in the file. Manual `/compact [instructions]`. `/new` = fresh session; `/tree` branches.
- Analogy: meeting minutes: after a long meeting, older discussion is condensed into a summary paragraph; last few minutes kept word for word.
- Code example: `should-compact.ts`: `const contextWindow = 200_000, reserve = 16_384; for (const used of [150_000, 190_000]) console.log(used, used > contextWindow - reserve ? "compact" : "ok");` → `150000 ok` / `190000 compact`.
- Production use: long agent tasks survive beyond one window.
- Common mistakes: expecting perfect recall after compaction (summary loses detail); never using `/new` between unrelated tasks.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/compaction.md ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/settings.md

### Long-term memory in files
- Concept: long-term = survives sessions: files (AGENTS.md for rules, a memory file for facts), or vector store. JSONL append-only: one `{ date, text, tags }` per line; `appendFile`. Human-readable, git-diffable. Never store secrets.
- Analogy: a notebook you keep between meetings vs the whiteboard wiped each day.
- Code example: `import { appendFile, readFile } from "node:fs/promises"; await appendFile("mem.jsonl", JSON.stringify({ date: "2026-11-21", text: "User prefers PowerShell examples", tags: ["prefs"] }) + "\n"); const lines = (await readFile("mem.jsonl", "utf8")).trim().split("\n"); console.log(lines.length, JSON.parse(lines[0]).text);` → on a fresh file: `1 User prefers PowerShell examples`.
- Production use: per-project preferences, decisions log.
- Common mistakes: storing everything; writing secrets.
- Sources: https://nodejs.org/docs/latest-v26.x/api/fs.html#fspromisesappendfilepath-data-options

### A remember/recall tool
- Concept: `remember` params `{ text: string (≤300 chars), tags?: string[] }` appends; `recall` params `{ query: string, limit?: number default 5 }` returns entries whose text/tags contain any query word (case-insensitive), newest first. Resolve file from `ctx.cwd`. Use `withFileMutationQueue(path, fn)` since tools run in parallel. Add `promptGuidelines`: "Use recall at the start of a task about user preferences; use remember only for durable facts the user states."
- Analogy: personal assistant with a card box: "note this" (remember) and "what do we know about X?" (recall).
- Code example: deterministic matcher: `type Mem = { date: string; text: string; tags: string[] }; export function match(mems: Mem[], query: string, limit = 5): Mem[] { const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2); return mems.filter((m) => words.some((w) => m.text.toLowerCase().includes(w) || m.tags.includes(w))).reverse().slice(0, limit); } const mems = [{ date: "2026-11-20", text: "Project uses node:test", tags: ["testing"] }, { date: "2026-11-21", text: "User prefers PowerShell examples", tags: ["prefs"] }]; console.log(match(mems, "which shell examples").map((m) => m.text));` → `[ 'User prefers PowerShell examples' ]`.
- Production use: assistants that improve over sessions.
- Common mistakes: no size limit (memory file explodes); recall that returns everything.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#custom-tools ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#state-management

### Deciding what is worth remembering
- Concept: remember durable, reusable, user-confirmed facts (preferences, project conventions, decisions + why). Skip: transient task state, secrets, guesses, anything already in code/git/AGENTS.md. Allow forgetting (`/forget` command or manual file edit). Memory can be poisoned by prompt injection → review the file.
- Analogy: what goes into a family recipe book: proven recipes, not today's shopping list.
- Code example: checklist table 6 rows → keep/skip (e.g. "API key is sk-..." → skip (secret); "tests use node:test" → keep; "currently editing math.ts" → skip).
- Production use: memory hygiene keeps agents accurate.
- Common mistakes: auto-remembering every turn; trusting stored memories blindly.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/security.md

### Context budget
- Concept: every injected memory costs tokens each turn. `ctx.getContextUsage()` → `{ tokens, ... }` for active model. Budget rule: recall ≤5 items, ≤300 chars each; inject via tool on demand (not every prompt). Optional `before_agent_start` returning `message` to add a short "Known preferences" note — show tradeoff.
- Analogy: suitcase weight limit: pack only what you'll wear.
- Code example: `budget.ts`: `const items = ["a".repeat(300), "b".repeat(300), "c".repeat(300)]; const tokens = Math.ceil(items.join("\n").length / 4); console.log(tokens);` → `226` (902 chars / 4 → 225.5 → 226).
- Production use: cost and quality both drop when context bloats.
- Common mistakes: injecting the whole memory file every turn.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#ctxgetcontextusage ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#before_agent_start

## Quiz
1. When does Pi auto-compact? — tests compaction
2. Short-term vs long-term memory — tests concepts
3. Why `withFileMutationQueue` in remember? — tests parallel tools
4. Should an API key be remembered? — tests memory hygiene
5. Why recall on demand instead of injecting everything? — tests budget
