# 15. Planning Agents
Version: Pi 1.6.0 + Node.js 26.13.1 LTS
Prerequisites: 14-agent-memory

Week 4 start. Pi has no built-in plan mode; build `~/pi-lab/.pi/extensions/planner.ts` with `/plan <goal>` and `/approve`, plan file `~/pi-lab/PLAN.md`. Task used throughout: "Add a `percent(part, whole)` function to src/math.ts with tests".

## Learning goals
- Learner can explain the plan-first pattern and when it helps.
- Learner can build a `/plan` command that makes the agent write PLAN.md only, and an `/approve` command.
- Learner can make the agent execute one step at a time and tick steps off.
- Learner can make the agent replan after a failed step.
- Learner can enforce max turns, timeouts and a clear stop condition.

## Sub-topics
### Plan-first pattern
- Concept: separate thinking from doing: (1) agent writes a numbered plan, (2) human approves/edits, (3) agent executes. Benefits: catch wrong direction early, cheap review, resumable. Cost: extra turn. Use for multi-file or risky tasks; skip for one-line fixes.
- Analogy: architect's drawing approved before builders pour concrete.
- Code example: plan format (Markdown checklist): `# Plan: add percent()\n- [ ] 1. Read src/math.ts\n- [ ] 2. Add percent(part, whole) throwing on whole = 0\n- [ ] 3. Add test/percent.test.ts\n- [ ] 4. Run node --test`.
- Production use: Claude Code/Codex-style plan modes are this pattern.
- Common mistakes: plans too vague ("fix stuff"); approving without reading.
- Sources: https://github.com/earendil-works/pi ; https://www.anthropic.com/engineering/building-effective-agents

### Writing a plan file & an approval command
- Concept: state variable `mode: "idle" | "planning" | "executing"`. `/plan <goal>`: set planning, `pi.setActiveTools(["read", "grep", "find", "ls", "write"])`, `pi.sendUserMessage(\`Write a numbered checklist plan for: ${args}. Save it to PLAN.md. Do not change any other file.\`)`. `tool_call` guard while planning: block `write`/`edit` whose path is not `PLAN.md` (`{ block: true, reason: "Planning mode: only PLAN.md may be written" }`). `/approve`: set executing, restore tools (save `pi.getActiveTools()` before), send execute message.
- Analogy: drafting room with only pencils allowed; the stamp `/approve` unlocks the tool shed.
- Code example: guard snippet: `pi.on("tool_call", async (event) => { if (mode !== "planning") return; if ((event.toolName === "write" || event.toolName === "edit") && !String((event.input as { path?: string }).path).endsWith("PLAN.md")) return { block: true, reason: "Planning mode: only PLAN.md may be written" }; });` Run `/plan add percent() with tests` → PLAN.md created, no other diff (`git status` shows only `PLAN.md`) (sample plan text).
- Production use: human-in-the-loop approval gates.
- Common mistakes: forgetting to restore tools; path check bypass via `./PLAN.md` vs `PLAN.md` (use `endsWith` or resolve with `node:path`).
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#pisendusermessagecontent-options ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#pigetactivetools--pigetalltools--pisetactivetoolsnames

### Executing step by step
- Concept: execute message: "Execute PLAN.md one step at a time. After each step, mark it `[x]` in PLAN.md and say which step is done. Stop when all are checked." Progress check by parsing PLAN.md in `turn_end` and showing `ctx.ui.setStatus("plan", "2/4")`.
- Analogy: recipe card with tick boxes; cook ticks each step before the next.
- Code example: `progress.ts`: `export function progress(md: string) { const done = (md.match(/^- \[x\]/gim) ?? []).length; const total = (md.match(/^- \[[ x]\]/gim) ?? []).length; return \`${done}/${total}\`; } console.log(progress("- [x] 1. Read\n- [x] 2. Add\n- [ ] 3. Test\n- [ ] 4. Run"));` → `2/4`.
- Production use: visible progress for long tasks.
- Common mistakes: agent skipping ticks (re-prompt); parsing with wrong regex flags.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#widgets-status-and-footer

### Replanning after observations
- Concept: observation can invalidate the plan (test fails, file missing). Instruction: "If a step fails, do not retry blindly: add a `## Replan` section explaining what you observed and the new steps, then continue." Optionally require `/approve` again for big changes (mode back to planning).
- Analogy: GPS rerouting after a closed road — tells you why and the new route.
- Code example: full sample PLAN.md after failure: steps 1–3 `- [x]`, then `- [x] 4. Run node --test (FAILED: percent(1, 0) returned Infinity)`, `## Replan`, `Observed: no check for whole = 0.`, `- [ ] 5. Throw on whole = 0`, `- [ ] 6. Re-run node --test` → `progress(md)` = `4/6`.
- Production use: robust agents adapt instead of looping.
- Common mistakes: infinite replans (cap them: max 2 replans).
- Sources: https://arxiv.org/abs/2210.03629 ; https://www.anthropic.com/engineering/building-effective-agents

### Max steps, timeouts & stop conditions
- Concept: guards: max turns per run (count `turn_end`, at `MAX_TURNS = 15` call `ctx.abort()` and notify); wall-clock timeout (record `Date.now()` on `agent_start`, check in `turn_end`, e.g. 10 minutes); tool timeouts (`bash` accepts `timeout`; your tools use `AbortSignal.timeout`); clear success condition (all steps `[x]` and tests pass) → reset `mode = "idle"`. Pi's own `retry.maxRetries` (3) covers provider errors only.
- Analogy: chess clock + move limit: game ends at checkmate, flag fall, or move cap.
- Code example: `let turns = 0; pi.on("agent_start", async () => { turns = 0; }); pi.on("turn_end", async (_e, ctx) => { turns++; if (turns >= 15) { ctx.ui.notify("Stopped: 15 turns reached", "warning"); ctx.abort(); } });` → in a runaway run, notice `Stopped: 15 turns reached` (sample).
- Production use: cost and safety ceilings for unattended agents.
- Common mistakes: counting tool calls instead of turns (or vice versa) without saying which; caps so low agents never finish.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#ctxisidle--ctxabort--ctxhaspendingmessages ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/settings.md

## Quiz
1. When is plan-first worth the extra turn? — tests pattern
2. How does the guard stop edits outside PLAN.md? — tests tool_call blocking
3. progress("- [x] a\n- [ ] b") → ? — tests parsing (1/2)
4. What should the agent do when a step fails? — tests replanning
5. Name three stop guards — tests limits
