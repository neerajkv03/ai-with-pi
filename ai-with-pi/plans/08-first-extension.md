# 08. Your First Extension
Version: Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2
Prerequisites: 07-reading-traces

Build `~/pi-lab/.pi/extensions/word-count.ts`: tool `word_count` counting words in text. Deterministic tool output.

## Learning goals
- Learner can place an extension file in a global or project location and grant project trust.
- Learner can write the default-exported factory function receiving `ExtensionAPI`.
- Learner can register a tool with `name`, `label`, `description`.
- Learner can define parameters with TypeBox.
- Learner can write `execute` and return `{ content, details }`.
- Learner can load changes with `/reload` and test quickly with `pi -e`.

## Sub-topics
### Extension files, locations & project trust
- Concept: extension = TypeScript module Pi loads to add tools, commands, event handlers. Locations: global `~/.pi/agent/extensions/*.ts` or `*/index.ts`; project `.pi/extensions/` (same layouts); extra paths via `extensions` in settings.json. Project resources load only after project trust (Pi asks; `--approve` overrides). Extensions run with full system permissions — only load trusted code. Loaded via jiti: no compile step.
- Analogy: extension = plug-in power tool attachment; project trust = site manager checking an unknown attachment before plugging it in.
- Code example: Git Bash `mkdir -p ~/pi-lab/.pi/extensions`; start `pi` in pi-lab → trust prompt → accept (your own repo).
- Production use: team extensions committed in `.pi/extensions/`; personal ones global.
- Common mistakes: nesting more than one level (discovery is one level deep); trusting cloned repos blindly.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#extension-locations ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/security.md#understand-project-trust

### The factory function & ExtensionAPI
- Concept: file `export default function (pi: ExtensionAPI) { ... }`; may be async (awaited before `session_start`). `pi` object = API: `registerTool`, `registerCommand`, `on(event)`, `exec`, etc. Import types: `import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";` — Pi maps this import to its own copy (no npm install needed to run). Optional editor types: `npm install -D @earendil-works/pi-coding-agent typebox typescript` in pi-lab.
- Analogy: factory = new employee's first-day setup: Pi hands over a toolbox (`pi`) and the employee registers what they can do.
- Code example: minimal `hello.ts`: `import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"; export default function (pi: ExtensionAPI) { pi.on("session_start", async (_event, ctx) => { ctx.ui.notify("hello extension loaded", "info"); }); }` → on start Pi shows notice `hello extension loaded`.
- Production use: one extension per concern (weather, guard, memory).
- Common mistakes: named export instead of default; heavy work at load time slowing startup.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#writing-an-extension ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#available-imports

### registerTool: name, label, description
- Concept: `pi.registerTool({ name, label, description, parameters, execute })`. `name` = id the model calls (snake_case, e.g. `word_count`); `label` = human name in UI; `description` = what the model reads to decide when to call it. Registering activates the tool (unless `defaultActive: false`). Same name as a built-in replaces it silently.
- Analogy: tool registration = adding an item to a restaurant menu: code name for the kitchen, display name for the menu, description that makes customers order it.
- Code example: (inside factory) `name: "word_count", label: "Word Count", description: "Count the words in a piece of text. Use when the user asks how many words something has."`
- Production use: descriptions drive reliability (topic 09).
- Common mistakes: overriding `read`/`bash` by accident; vague description.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#piregistertooldefinition ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#overriding-built-in-tools

### Parameters with TypeBox
- Concept: parameters = JSON Schema describing the tool's input. TypeBox builds it in TS: `import { Type } from "typebox"; Type.Object({ text: Type.String({ description: "Text to count" }) })`; `Type.Optional`, `Type.Number`, `StringEnum` from `@earendil-works/pi-ai` for string choices. Pi validates args (pi-schema) and coerces loose types ("5" → 5). Bad args → model sees errors like `- text: missing`.
- Analogy: schema = order form with required boxes; the clerk (validator) rejects forms with empty required boxes before the kitchen sees them.
- Code example: `parameters: Type.Object({ text: Type.String({ description: "Text to count" }), unique: Type.Optional(Type.Boolean({ description: "Count distinct words only" })) })`.
- Production use: typed inputs = fewer broken tool calls.
- Common mistakes: no `description` on fields; using `Type.Refine` (not run by Pi; check in execute).
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#tool-parameter-schemas-and-typebox ; https://github.com/sinclairzx81/typebox

### execute & its return shape
- Concept: `async execute(toolCallId, params, signal, onUpdate, ctx)` returns `{ content: [{ type: "text", text }], details: {...} }`. `content` goes to the model; `details` stored for UI/state (must have a value; `undefined` allowed). Throw an Error to signal failure (model sees error result). `signal` for cancel; `onUpdate` for progress.
- Analogy: execute = kitchen cooking the order; `content` = plate to the customer; `details` = kitchen's own notes on the ticket.
- Code example: full `word-count.ts`: `import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"; import { Type } from "typebox"; export default function (pi: ExtensionAPI) { pi.registerTool({ name: "word_count", label: "Word Count", description: "...", parameters: Type.Object({ text: Type.String({ description: "Text to count" }), unique: Type.Optional(Type.Boolean()) }), async execute(_id, params) { const words = params.text.trim().split(/\s+/).filter(Boolean); const n = params.unique ? new Set(words.map((w) => w.toLowerCase())).size : words.length; return { content: [{ type: "text", text: \`${n} words\` }], details: { n } }; } }); }`. Input text `"the agent loop is the loop"` → `6 words`; with unique true → `4 words`.
- Production use: every custom tool follows this shape.
- Common mistakes: returning a plain string; forgetting `details`; huge output (must truncate; 50KB/2000 lines built-in limit).
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#tool-definition ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#output-truncation

### Loading with /reload & pi -e
- Concept: auto-discovered extensions hot-reload with `/reload`; `pi -e ./path.ts` loads one file for a single run (repeatable); `-ne`/`--no-extensions` disables discovery. Extension errors are logged and the agent continues.
- Analogy: `/reload` = restarting a song from the same playlist after editing it; `-e` = playing a single track without adding it to the playlist.
- Code example: `pi -e ./.pi/extensions/word-count.ts -p "How many words are in: the agent loop is the loop"` → sample final text containing `6` (tool output exactly `6 words`). Edit description, `/reload`, re-ask.
- Production use: fast iteration loop: edit → /reload → prompt → read trace.
- Common mistakes: editing but not reloading; loading the same file twice (global + -e).
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#quick-start ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md#resources

## Quiz
1. Where do project extensions live and what must you grant? — tests locations/trust
2. What does the model read to decide to call a tool? — tests description
3. Write a TypeBox schema with one required string — tests parameters
4. What goes in `content` vs `details`? — tests return shape
5. How to test one extension without installing it? — tests pi -e
