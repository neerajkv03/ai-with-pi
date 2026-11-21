# 21. Pi SDK & Packages
Version: Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2
Prerequisites: 20-cost-control

Scripts in `~/pi-lab/sdk/` (needs `npm install @earendil-works/pi-coding-agent typebox` in pi-lab — standalone scripts, unlike extensions, do not get Pi's mapped imports). Package folder `~/pi-lab/pi-lab-tools/`.

## Learning goals
- Learner can create an agent session in TypeScript, prompt it and read the answer.
- Learner can subscribe to session events to stream text and count tools.
- Learner can add custom tools to an SDK session.
- Learner can rewrite the eval runner with the SDK (no shell quoting).
- Learner can bundle extensions, skills and prompts as a Pi package and install it.

## Sub-topics
### createAgentSession & prompt
- Concept: SDK = Pi embedded in your Node process. `const { session } = await createAgentSession(options)`; `await session.prompt(text)` resolves when the run finishes; `session.getLastAssistantText()`; always `session.dispose()` in `finally`. Defaults: cwd, discovered resources, stored settings and credentials (same `OPENCODE_API_KEY`/auth.json). `SessionManager.inMemory()` → no session files. Options: `cwd`, `tools` (e.g. `["read", "grep", "find", "ls"]` read-only), `model`, `thinkingLevel`.
- Analogy: CLI = renting the whole workshop; SDK = installing the same workbench inside your own garage.
- Code example: `sdk/hello.ts`: `import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent"; const { session } = await createAgentSession({ sessionManager: SessionManager.inMemory(), tools: ["read", "grep", "find", "ls"] }); try { await session.prompt("Which functions does src/math.ts export? Names only."); console.log(session.getLastAssistantText()); } finally { session.dispose(); }` → run from pi-lab `node sdk/hello.ts` → sample `add, divide, multiply`.
- Production use: bots, CI jobs, web backends (portfolio option 2).
- Common mistakes: forgetting dispose (process hangs); prompting while streaming without steer/followUp.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/sdk/05-tools.ts

### Subscribing to events
- Concept: `const unsubscribe = session.subscribe((event) => {...})` before prompting. Text stream: `event.type === "message_update" && event.assistantMessageEvent.type === "text_delta"` → `event.assistantMessageEvent.delta`. Tool events `tool_execution_start/end`; `message_end` authoritative message (has `usage`); `agent_settled` = no more automatic work.
- Analogy: radio scanner tuned to the agent's channel.
- Code example: `let tools = 0; session.subscribe((e) => { if (e.type === "message_update" && e.assistantMessageEvent.type === "text_delta") process.stdout.write(e.assistantMessageEvent.delta); if (e.type === "tool_execution_end") tools++; }); await session.prompt("List the files in src"); console.log(\`\ntools used: ${tools}\`);` → streamed answer then `tools used: 1` (sample).
- Production use: live UIs, metrics.
- Common mistakes: subscribing after prompt (miss events); treating agent_end as final.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md#subscribing-to-events ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/json.md

### Custom tools via the SDK
- Concept: register tools through inline extension factories: `new DefaultResourceLoader({ cwd: process.cwd(), agentDir: getAgentDir(), extensionFactories: [(pi) => { pi.registerTool({...}) }] })`, `await resourceLoader.reload()`, pass `resourceLoader` to `createAgentSession`. Same `registerTool` shape as topic 08; file extensions via `additionalExtensionPaths: ["./.pi/extensions/weather.ts"]`. (`customTools` option exists; its shape is in exported types — not taught.) SDK sessions do not load built-in MCP/codemode extensions automatically.
- Analogy: bringing your own power tool to the borrowed workbench.
- Code example: inline `word_count` from topic 08 inside `extensionFactories`; prompt `How many words: the agent loop is the loop` → tool result `6 words` (exact), final text sample.
- Production use: reuse the same tool code in CLI and SDK.
- Common mistakes: forgetting `await resourceLoader.reload()`; importing `typebox` without installing it.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/sdk/06-extensions.ts ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md#configuring-a-session

### Scripted runs for evals
- Concept: replace topic 18's `spawnSync("pi", ..., { shell: true })` with SDK: per task, copy fixture to temp dir, `createAgentSession({ cwd: tmp, sessionManager: SessionManager.inMemory(tmp), model })`, collect `message_end` usage, measure time, score. No shell quoting, typed events, easy model sweep (loop over models).
- Analogy: moving from mailing exam papers to running the exam in your own building.
- Code example: `sdk/run-task.ts` core: `const t0 = Date.now(); let tokens = 0; session.subscribe((e) => { if (e.type === "message_end" && e.message.role === "assistant") tokens += e.message.usage.totalTokens; }); await session.prompt(task.prompt); const row = { id: task.id, pass: scoreAnswer(session.getLastAssistantText() ?? "", task.check), tokens, ms: Date.now() - t0 };` → printed row sample `{ id: 'e1', pass: true, tokens: 1530, ms: 6400 }`.
- Production use: CI eval gate.
- Common mistakes: sharing one session across tasks (history leaks); not disposing per task.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md#session-storage ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/message-types.md#usage

### Bundling extensions & skills as a package
- Concept: Pi package = folder/npm package with `extensions/`, `skills/`, `prompts/`, `themes/` (auto-discovered) or a `pi` manifest in package.json. Keyword `pi-package` lists it in the gallery. Install: `pi install ./pi-lab-tools` (local, no copy), `pi install git:github.com/you/pi-lab-tools@v1`, `pi install npm:@you/pi-lab-tools@1.0.0`; `-l` writes project settings; try once with `pi -e ./pi-lab-tools`. Runtime deps in `dependencies`; never list host packages (`@earendil-works/*`, `typebox`).
- Analogy: packing your tools into a labelled toolbox so a teammate gets the whole kit in one go.
- Code example: `pi-lab-tools/package.json`: `{ "name": "pi-lab-tools", "version": "1.0.0", "keywords": ["pi-package"], "pi": { "extensions": ["./extensions/weather.ts", "./extensions/permission-gate.ts"], "skills": ["./skills"], "prompts": ["./prompts/*.md"] } }` → `pi install ./pi-lab-tools` then `pi list` shows it.
- Production use: share the portfolio agent (topic 23).
- Common mistakes: secrets in the package; host packages in dependencies.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md

## Quiz
1. What must you always call when done with a session? — tests dispose
2. Which event carries streamed text? — tests subscribe
3. How do you add a custom tool in the SDK? — tests resource loader
4. Why is the SDK runner better on Windows than spawning `pi`? — tests evals via SDK
5. Which manifest key lists package extensions? — tests packages
