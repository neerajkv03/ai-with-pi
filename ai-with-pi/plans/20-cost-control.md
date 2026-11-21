# 20. Cost Control
Version: Pi 1.6.0 + Node.js 26.13.1 LTS
Prerequisites: 19-guardrails

Build `~/pi-lab/.pi/extensions/cost-meter.ts` (shows run cost) and a `/cheap` + `/strong` command pair. Use OpenCode Zen. Never assert specific Zen model ids; learner picks from `pi --list-models opencode` and stores them in constants `CHEAP` / `STRONG` (`provider/id` strings).

## Learning goals
- Learner can compute agent cost per run from usage numbers.
- Learner can explore with a cheap model and finish with a strong one, switching in Pi.
- Learner can choose thinking levels and benefit from prompt caching.
- Learner can measure cost per task and report it.

## Sub-topics
### Token cost math
- Concept: run cost = Σ over model calls (input × in price + output × out price) / 1M, plus cache reads/writes at their own rates. Agent input grows every turn (history resent). Pi reports per assistant message `usage` {input, output, cacheRead, cacheWrite, totalTokens, cost: {input, output, cacheRead, cacheWrite, total}}; `/session` totals.
- Analogy: phone bill: each call charged by minutes, and an agent keeps redialing with the whole conversation read out again.
- Code example: `run-cost.ts`: `const turns = [{ in: 3000, out: 400 }, { in: 4200, out: 300 }, { in: 5000, out: 600 }]; const IN = 3, OUT = 15; const total = turns.reduce((s, t) => s + (t.in * IN + t.out * OUT) / 1_000_000, 0); console.log(total.toFixed(4));` → `0.0561` (per turn: 15000 + 17100 + 24000 = 56100 → /1e6).
- Production use: budgets per task/user.
- Common mistakes: counting only the last turn; ignoring output price.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/message-types.md#usage ; https://opencode.ai/docs/console/models

### Cheap model to explore, strong model to finish (switching models in Zen)
- Concept: exploration (search, read, summarize) needs less intelligence → cheap model (Haiku or open model like MiniMax/GLM); final code/fix → strong (Sonnet/Opus/GPT). Switch: `/model` interactively; `pi --model <pattern>` at start; extension `pi.setModel(model)` with model from `ctx.modelRegistry`. Scope a short list with `--models` / `enabledModels`. Verify with evals: cheaper must not drop pass rate much.
- Analogy: junior researcher gathers the files, senior engineer writes the fix.
- Code example: `const CHEAP = "opencode/<cheap-id>"; const STRONG = "opencode/<strong-id>"; const switchTo = (target: string) => async (_args: string, ctx: ExtensionCommandContext) => { const [prov, id] = target.split("/"); const model = ctx.modelRegistry.find(prov, id); if (!model) { ctx.ui.notify(\`Unknown model ${target}\`, "error"); return; } if (!(await pi.setModel(model))) ctx.ui.notify("No API key for this model", "error"); else ctx.ui.notify(\`Model: ${target}\`, "info"); }; pi.registerCommand("cheap", { description: "Switch to the cheap model", handler: switchTo(CHEAP) }); pi.registerCommand("strong", { description: "Switch to the strong model", handler: switchTo(STRONG) });` (`ctx.modelRegistry.find(provider, id)` and `pi.setModel` returning false without auth are documented). Flow demo: `pi --model <CHEAP>` → `Find where average is defined and summarize` → `/model` → STRONG → `Now fix it with a test` → compare `/session` cost (sample).
- Production use: routing cuts bills a lot when most turns are exploration.
- Common mistakes: switching mid-edit and confusing the trace; cheap model for tasks it fails (wasted retries cost more).
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md#models ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#ctxmodelregistry--ctxmodel--ctxthinkinglevel--ctxscopedmodels ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#pisetmodelmodel

### Thinking levels & prompt caching
- Concept: thinking tokens are output tokens (priced high); use `low`/`off` for exploration, `high` for hard fixes; `modelThinkingLevels` per model in settings. Prompt caching: provider stores a repeated prefix (system prompt + early history); later calls read it cheaply (`cacheRead`). Keep prefix stable: don't edit AGENTS.md mid-session, avoid changing tools often. Pi `cacheWarming` setting (default `"idle"`) keeps caches warm between runs when estimated savings ≥ $0.05; `showCacheMissNotices` shows misses.
- Analogy: caching = reusing a printed handout instead of retyping it for every meeting.
- Code example: `cache.ts`: `const prefix = 8000, fresh = 1000, IN = 3, CACHE_READ = 0.3; const noCache = (prefix + fresh) * IN / 1e6; const withCache = (prefix * CACHE_READ + fresh * IN) / 1e6; console.log(noCache.toFixed(4), withCache.toFixed(4));` → `0.0270 0.0054` (state cache price is illustrative; real rates per model).
- Production use: long agent sessions benefit most.
- Common mistakes: frequent `before_agent_start` system-prompt rewrites (cache misses); max thinking by default.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/settings.md#model-and-thinking ; https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching

### Measuring cost per task
- Concept: per task cost = sum of `usage.cost.total` across its assistant messages (+ tool `usage` for nested model calls). Extension `cost-meter.ts`: on `agent_start` remember entry count; on `agent_settled` sum new assistant message costs from `ctx.sessionManager.getBranch()` and `ctx.ui.notify(\`run cost $${x.toFixed(4)}\`)`. Eval runner (18) logs cost per task; report median and max.
- Analogy: itemised receipt per order, not just the monthly total.
- Code example: pure sum: `const msgs = [{ role: "assistant", usage: { cost: { total: 0.012 } } }, { role: "toolResult" }, { role: "assistant", usage: { cost: { total: 0.008 } } }]; const cost = msgs.reduce((s, m) => s + ((m as any).usage?.cost?.total ?? 0), 0); console.log(cost.toFixed(3));` → `0.020`.
- Production use: README "cost per task" (23).
- Common mistakes: forgetting failed/retried runs in cost; reading all branches instead of active branch.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#ctxsessionmanager ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/session-format.md

## Quiz
1. Why does agent cost grow faster than turn count? — tests history resend
2. When use cheap vs strong models? — tests routing
3. What breaks prompt caching? — tests caching
4. Which usage field gives cost? — tests measurement
5. How to prove a cheaper setup is good enough? — tests evals link
