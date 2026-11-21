# Version notes — ai-with-pi (fetched 2026-11-21)

## Pi 1.6.0
- Pi = "a minimal, extensible agent harness"; no sub-agents or plan mode built in; no permission system, runs with launching user's rights. https://github.com/earendil-works/pi
- Install (Windows): `powershell -c "irm https://pi.dev/install.ps1 | iex"` https://github.com/earendil-works/pi
- Install (npm): `npm install -g --ignore-scripts @earendil-works/pi-coding-agent` https://github.com/earendil-works/pi
- Requires Node.js 22.19 or newer. https://github.com/earendil-works/pi
- Packages: pi-ai (LLM API), pi-agent-core (agent runtime, tool calling), pi-coding-agent (CLI), pi-tui. https://github.com/earendil-works/pi
- Modes: interactive, print/JSON, RPC, TypeScript SDK. https://github.com/earendil-works/pi
- 1.6.0 (2026-11-20): GPT-6.2 Astra/Sol on openai/azure/openai-codex, Sol default there. BREAKING: `render()` returns read-only string array. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/CHANGELOG.md
- 1.5.0 BREAKING: tool argument validation moved to `@earendil-works/pi-schema`; some TypeBox-only features no longer apply to tool args. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/CHANGELOG.md
- 1.5.1: `pi auth` login/logout, idle prompt cache warming. 1.3.0: `sessionShareDestination` for `/share`. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/CHANGELOG.md
- Built-in tools: read, bash, powershell (Windows only), edit, write, grep, find, ls. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/cli.md
- Default-enabled: read, bash, edit, write (changeable via `defaultTools`); `codemode`, `tool_search` off by default. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/cli.md
- CLI: `pi --print "msg"` / `-p`; `pi --mode json "msg" > events.jsonl` (JSONL events); `--model <pattern>[:thinking]`; `-t/--tools a,b` allowlist; `-e/--extension <path>` repeatable; `-ne/--no-extensions`; `--session-dir`. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/cli.md
- Extension locations: `~/.pi/agent/extensions/*.ts` or `*/index.ts`; project `.pi/extensions/...` (loads only after project trusted); extra paths via `extensions` array in settings.json. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/extensions.md
- Extensions load via jiti: TypeScript runs without compilation. `/reload` hot-reloads auto-discovered ones; `pi -e ./x.ts` for quick tests. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/extensions.md
- Extensions have full system permissions; load only trusted ones. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/extensions.md
- Factory: `export default function (pi: ExtensionAPI) { }` (may be async; awaited before `session_start`). https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/extensions.md
- `pi.registerTool({ name, label, description, parameters, promptSnippet?, promptGuidelines?, defaultActive?, execute, renderCall?, renderResult? })`. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/extensions.md
- Schema: docs say TypeBox (`typebox`), e.g. `Type.Object({ name: Type.String({ description }) })`; validated as JSON Schema (see 1.5.0 note) (partial). https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/extensions.md
- `execute(toolCallId, params, signal, onUpdate, ctx)` returns `{ content: [{ type: "text", text }], details: {} }`; may add `terminate: true`. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/extensions.md
- `pi.registerCommand(name, { description, handler(args, ctx), getArgumentCompletions? })`. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/extensions.md
- Events: session_start, session_shutdown, before_agent_start, agent_start, agent_end, agent_settled, turn_start, turn_end, message_start/update/end, tool_call, tool_result, tool_execution_start/update/end, input, user_bash, context, model_select, project_trust, resources_discover. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/extensions.md
- Importable in extensions: `@earendil-works/pi-coding-agent`, `@earendil-works/pi-agent-core`, `typebox`, `@earendil-works/pi-ai` (e.g. `StringEnum`), `@earendil-works/pi-tui`, node built-ins. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/extensions.md
- Only the first 100000 chars of extensions.md (158k) were read; ctx fields not verified (partial). https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/extensions.md
- SKILL.md frontmatter: `name` (lowercase/digits/hyphens, max 64), `description` (max 1024; skills without it not loaded), optional license, compatibility, metadata, `allowed-tools` (experimental), `disable-model-invocation`. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/skills.md
- Skill locations: `~/.agents/skills/` (global), `.agents/skills/` (project, cwd up to repo root); other locations via settings/packages (partial). https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/skills.md
- Skills: only name/description/path go into system prompt; model loads SKILL.md on match; `/skill:name` forces load; `/reload` picks up edits. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/skills.md
- Prompt templates: `~/.pi/agent/prompts/*.md` (direct children only); project ones load only after trust; filename = command name; frontmatter `description`, `argument-hint`. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/prompt-templates.md
- Template args: `$1 $2`, `$@`/`$ARGUMENTS`, `${1:-default}`, `${@:N}`, `${@:N:L}`; shell-like quoting. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/prompt-templates.md
- Agent dir default `~/.pi/agent` (override `PI_CODING_AGENT_DIR`); user settings `<agent-dir>/settings.json`, project `.pi/settings.json` (project wins); `/reload` after manual edits. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/configuration.md
- AGENTS.md or CLAUDE.md loaded from agent dir, cwd and parents; `AGENTS.override.md` replaces in its own dir; no trust needed. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/configuration.md
- `SYSTEM.md` replaces default system prompt; `APPEND_SYSTEM.md` appends (agent dir or `.pi/`). https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/configuration.md
- Settings keys: defaultProvider, defaultModel, extensions[], skills[], prompts[], enableSkillCommands (default true), defaultTools, shellPath, sessionDir; `"$schema": "https://pi.dev/schemas/settings.schema.json"`. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/settings.md
- models.json: `{ "providers": { "<name>": { baseUrl, api (e.g. "openai-completions"), apiKey ($ENV / literal / !command), models:[{id}] } } }`; `/model` reloads it. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/models.md
- models.json file path not stated on that page (partial; likely agent dir). https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/models.md
- Sessions: `~/.pi/agent/sessions/` grouped by cwd; `/session` shows file, tokens, cost; `/export` writes HTML/JSONL; `--no-session` disables. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/sessions.md
- Session file = JSONL; line 1 `{"type":"session","version":3,"id","timestamp","cwd"}`; entries have id/parentId tree; types message, model_change, compaction, custom, etc. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/session-format.md
- Tool calls: assistant content block `{type:"toolCall", id, name, arguments}`; results are separate `role:"toolResult"` messages with toolCallId, toolName, content, isError. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/message-types.md
- `/debug` writes `pi-debug.log` in agent dir; Ctrl+O expands tool output. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/usage.md
- SDK: `import { createAgentSession } from "@earendil-works/pi-coding-agent"`; `const { session } = await createAgentSession(); await session.prompt(...); session.getLastAssistantText(); session.dispose()`. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/sdk.md
- SDK also: `session.subscribe(cb)` (events message_update/text_delta, message_end, agent_end, agent_settled), `SessionManager.inMemory()`, `DefaultResourceLoader`, options `customTools`, `tools`, `noTools`, `excludeTools`; custom-tool definition shape not on that page (partial). https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/sdk.md
- Windows: bash tool needs a Bash; lookup order: `shellPath` in `~/.pi/agent/settings.json`, `%ProgramFiles%\Git\bin\bash.exe`, x86 Git path, `bash.exe` on PATH. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/windows.md
- Windows: Git for Windows is usually sufficient; verify with `!printf 'Bash is working\n'`. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/windows.md
- Windows: `powershell` tool optional (native Windows only); swap via `"defaultTools": ["read","powershell","edit","write"]` or `["-bash","+powershell"]`; `!` commands still use Bash. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/windows.md
- Other docs exist: mcp.md, codemode.md, packages.md, providers.md, rpc.md (not read). https://api.github.com/repos/earendil-works/pi/contents/packages/coding-agent/docs

## Node.js 26 LTS
- 26.13.1 is "Latest LTS" (Lithium), security release 2026-11-11 (http2/tls CVEs); upgrade recommended. https://nodejs.org/en/blog/release/v26.13.1
- Bundled: undici 8.12.4, sqlite 3.54.1. https://nodejs.org/en/blog/release/v26.13.1
- 26.0.0 released 2026-05-05; Temporal API enabled by default. https://nodejs.org/en/blog/release/v26.0.0
- 26.0.0: V8 14.6 (`Map.prototype.getOrInsert`, `getOrInsertComputed`, `Iterator.concat()`); undici 8.0.2 behind `fetch`. https://nodejs.org/en/blog/release/v26.0.0
- 26.0.0 removals: `http.Server.prototype.writeHeader()`, legacy `_stream_*` modules, `--experimental-transform-types`. https://nodejs.org/en/blog/release/v26.0.0
- 26.0.0 deprecations: `module.register()`, DEP0201/0203/0204. https://nodejs.org/en/blog/release/v26.0.0
- Type stripping: stable, on by default; runs `.ts` with erasable syntax only; no type checking; disable `--no-strip-types`. https://nodejs.org/docs/latest-v26.x/api/typescript.html
- Unsupported (ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX): enum, runtime namespace, parameter properties, `import x =`; decorators. https://nodejs.org/docs/latest-v26.x/api/typescript.html
- Imports need explicit `.ts` extension; type imports need `import type`/inline `type`; `tsconfig.json` ignored; `.tsx` unsupported. https://nodejs.org/docs/latest-v26.x/api/typescript.html
- TS under `node_modules` refused. Recommended tsconfig: noEmit, target esnext, module nodenext, rewriteRelativeImportExtensions, erasableSyntaxOnly, verbatimModuleSyntax. https://nodejs.org/docs/latest-v26.x/api/typescript.html
- fetch, test runner, `--env-file` status in 26: not verified (release notes did not describe them) (partial). https://nodejs.org/en/blog/release/v26.0.0

## TypeScript 7.0
- Native port written in Go; typical full builds 8x-12x faster; multithreaded. https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- Install: `npm install -D typescript`; executable still `tsc` (`npx tsc`). https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- `@typescript/native-preview`/`tsgo` was the preview name; nightlies now `typescript@next`. https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- 6.0 side by side: `@typescript/typescript6` provides `tsc6`. https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- No programmatic API in 7.0 (expected 7.1, different from 6.0's). https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- New flags: `--checkers` (default 4), `--builders`, `--singleThreaded`. https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- New defaults: strict true, module esnext, noUncheckedSideEffectImports true, rootDir `./`, types `[]`, libReplacement false. https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- Removed (errors): target es5, downlevelIteration, moduleResolution node/node10/classic, module amd/umd/systemjs/none, baseUrl, esModuleInterop=false, import `asserts` (use `with`). https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- `tsc file.ts` with a tsconfig.json in cwd now fails unless `--ignoreConfig`. https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/

## MCP TypeScript SDK 1.32 + server-filesystem 2.4
- v1.x line = package `@modelcontextprotocol/sdk`; main branch is v2 (`@modelcontextprotocol/client`/`server`), v1 gets fixes 6+ months after v2 (2026-07-27). https://github.com/modelcontextprotocol/typescript-sdk
- v1 install: `npm install @modelcontextprotocol/sdk zod`; implements MCP spec up to 2025-11-25. https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/v1.x/README.md
- v1 imports: `import { Client } from '@modelcontextprotocol/sdk/client/index.js'`; `import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'`. https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/v1.x/docs/client.md
- Flow: `new StdioClientTransport({command, args, env?, cwd?})`, `new Client({name, version})`, `await client.connect(transport)` (spawns process), then `client.listTools()` / `client.callTool(...)`; stderr default 'inherit' (partial: exact callTool args not seen). https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/v1.x/docs/client.md
- server-filesystem launch: `npx -y @modelcontextprotocol/server-filesystem <dir1> <dir2>`; dirs are positional args. https://raw.githubusercontent.com/modelcontextprotocol/servers/main/src/filesystem/README.md
- On Windows config uses `"command": "cmd", "args": ["/c","npx","-y","@modelcontextprotocol/server-filesystem", ...]`. https://raw.githubusercontent.com/modelcontextprotocol/servers/main/src/filesystem/README.md
- Requires Node.js 24+ for npx/source; options `--read-only`, `--read-only-dir <path>`, `--confine-roots`; HTTP via `--transport streamable-http` (127.0.0.1:3001). https://raw.githubusercontent.com/modelcontextprotocol/servers/main/src/filesystem/README.md
- Roots deprecated as of protocol 2026-07-28. https://raw.githubusercontent.com/modelcontextprotocol/servers/main/src/filesystem/README.md
- Tools: read_text_file, read_media_file, read_multiple_files, write_file, append_file, edit_file, create_directory, list_directory, list_directory_with_sizes, move_file, copy_file, search_files, directory_tree, get_file_info, list_allowed_directories; `read_file` deprecated alias. https://raw.githubusercontent.com/modelcontextprotocol/servers/main/src/filesystem/README.md
- Exact version 2.4.0 of server-filesystem NOT verified (npm page 403); README is from main (partial). https://www.npmjs.com/package/@modelcontextprotocol/server-filesystem

## Voyage AI
- Endpoint: `POST https://api.voyageai.com/v1/embeddings`. https://docs.voyageai.com/docs/embeddings
- Auth: `Authorization: Bearer $VOYAGE_API_KEY`, `Content-Type: application/json`. https://docs.voyageai.com/docs/embeddings
- Body: `input` (string or array, max 1000 items), `model` (e.g. "voyage-4"), `input_type` ("query"|"document"|null). https://docs.voyageai.com/reference/embeddings-api
- Body also: `truncation` (bool, default true), `output_dimension` (2048/1024/512/256), `output_dtype` (float default, int8, uint8, binary, ubinary), `encoding_format` (null|"base64"). https://docs.voyageai.com/reference/embeddings-api
- voyage-4: 32,000-token context; dims 1024 (default), 256, 512, 2048; 4-series embeddings are mutually compatible. https://docs.voyageai.com/docs/embeddings
- input_type prepends a prompt: query "Represent the query for retrieving supporting documents: ", document "Represent the document for retrieval: "; mixing with/without input_type is compatible. https://docs.voyageai.com/docs/embeddings
- Response JSON shape NOT verified (docs show only Python `embeddings`, `total_tokens`); do not assert `data[].embedding` as fact (partial). https://docs.voyageai.com/docs/embeddings

## OpenCode Zen (provider, fetched 2026-11-21)
- Pi built-in key env var: "OpenCode Zen and Go | `OPENCODE_API_KEY`"; `/login` stores credentials in auth.json. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/providers.md
- Pi provider id for Zen chat models not verified; models.md classifier table uses `opencode` (partial). https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/models.md
- Zen = pay-as-you-go credits, priced per 1M tokens (e.g. GLM 5.3 $1.40 in/$4.40 out, Kimi K3 $3/$15, MiniMax M3 $0.30/$1.20); Claude/GPT prices not captured (partial). https://opencode.ai/docs/console/models
- Zen models: Claude Opus 5.5/5, Sonnet 5.5/5, Haiku 5.5/4.5; GPT 6.2 Astra/Sol, GPT 5.x; Gemini 4; Grok 4.x; Qwen 3.x; DeepSeek V4.x; MiniMax M3; GLM 5.x; Kimi K2.x/K3; Mistral Large 4. https://opencode.ai/docs/console/models
- Base URLs: Zen `https://opencode.ai/inference`; Go `https://opencode.ai/inference/go`. https://opencode.ai/docs/console/harnesses#base-urls
- Endpoints: Anthropic Messages `/inference/anthropic/v1/messages`; OpenAI Responses `/inference/openai/v1/responses`; text models usable via Chat Completions/Responses/Messages/Gemini APIs. https://opencode.ai/docs/console/api/inference
- Go plan: $10/month (Go Plus $40, Teams $20/member); 5-hour limit = 20% of monthly allowance, weekly = 50%; needs client user agent + session header. https://opencode.ai/docs/console/go
- Free-tier models OpenCode-client only (403 elsewhere). No embeddings API documented: RAG keeps Voyage. https://opencode.ai/docs/console/api/inference
- Tool-calling support per model not stated (partial). https://opencode.ai/docs/console/models

## Phase 2 gap fills (fetched 2026-11-21)
- Pi 1.6.0 HAS built-in MCP (`builtin:mcp`): `~/.pi/agent/mcp.json`, project `.pi/mcp.json` (trust); `pi mcp add|list`; `/mcp`; tools `mcp__<server>__<tool>`; default exposure `codemode` (also deferred/direct/hidden). Source spec "no MCP built in" is outdated. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/mcp.md
- Extension ctx: `ctx.mode` ("tui"|"rpc"|"json"|"print"), `ctx.hasUI`, `ctx.cwd`, `ctx.sessionManager.getEntries()/getBranch()`, `ctx.modelRegistry.find(provider, id)`, `ctx.signal`, `ctx.abort()`, `ctx.getContextUsage()`, `ctx.compact()`; `pi.setModel(model)` → false without auth; `pi.exec(cmd, args, {signal, timeout, cwd})` → {stdout, stderr, code, killed, truncated}, no shell. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/extensions.md
- Tool errors: throw or return `isError: true`; `tool_call` handler error blocks tool; `tool_result` returns partial patch. `withFileMutationQueue`, `truncateHead/Tail`, `DEFAULT_MAX_BYTES` 50KB, `DEFAULT_MAX_LINES` 2000 exported. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/extensions.md
- Pi validates tool params as JSON Schema whatever built them (MCP inputSchema usable directly); coerces "5"→5, "true"→true; `Type.Refine` not run. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/extensions.md
- `--mode json` runs prompts and exits (no `-p` needed); events usage shape `{input, output, cacheRead, cacheWrite, totalTokens, cost:{...,total}}`; `tool_execution_end` has `durationMs`. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/json.md
- Compaction: `compaction.reserveTokens` 16384, `compaction.keepRecentTokens` 20000; triggers when contextTokens > contextWindow - reserveTokens. `retry.maxRetries` 3. Thinking levels off|minimal|low|medium|high|xhigh|max, default medium. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/settings.md
- Skill locations also `~/.pi/agent/skills/` and `.pi/skills/` (trust). Session path `~/.pi/agent/sessions/--<path>--/<timestamp>_<id>.jsonl`. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/session-format.md
- SDK custom tools: `DefaultResourceLoader({ cwd, agentDir: getAgentDir(), extensionFactories: [(pi) => pi.registerTool(...)] })`, `await resourceLoader.reload()`; SDK does not load built-in MCP. https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/examples/sdk/06-extensions.ts
- Pi provider ids: `opencode` (Zen), `opencode-go` (Go). Exact model ids: use `pi --list-models opencode`. https://raw.githubusercontent.com/earendil-works/pi/main/packages/ai/src/models.generated.ts
- Voyage response: `{ data: [{ object: "embedding", embedding: number[], index }], model, usage: { total_tokens } }` (now verified). https://docs.voyageai.com/reference/embeddings-api
- MCP v1 client: `client.callTool({ name, arguments })` → `{ content, isError? }` (wraps `tools/call`). https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/v1.x/src/examples/client/simpleStreamableHttp.ts
