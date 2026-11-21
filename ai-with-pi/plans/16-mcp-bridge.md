# 16. MCP Bridge
Version: Pi 1.6.0 + Node.js 26.13.1 LTS + MCP SDK 1.32.2 + server-filesystem 2.4.0
Prerequisites: 15-planning

Gate 1 decision: hand-built bridge first (learn the protocol), then Pi's built-in MCP (`mcp.json`) as the production option. Note: the source spec says "Pi has no MCP built in" — outdated; Pi 1.6.0 ships built-in MCP support (`builtin:mcp`). Build `~/pi-lab/.pi/extensions/mcp-bridge.ts`; install in pi-lab: `npm install @modelcontextprotocol/sdk zod`. Server target: `@modelcontextprotocol/server-filesystem` (needs Node 24+), limited to `~/pi-lab/docs`.

## Learning goals
- Learner can explain MCP: JSON-RPC messages between a client and a server over stdio.
- Learner can connect to an MCP server with the TypeScript SDK client and list its tools.
- Learner can launch server-filesystem correctly on Windows.
- Learner can register each MCP tool as a Pi tool.
- Learner can forward results and errors back to the model, and close the server on shutdown.
- Learner can configure the same server with Pi's built-in `mcp.json`.

## Sub-topics
### What MCP is (JSON-RPC, client & server, stdio)
- Concept: MCP (Model Context Protocol) = open standard so any agent (client) can use tools/resources from any server. Messages are JSON-RPC 2.0: request `{ "jsonrpc": "2.0", "id": 1, "method": "tools/list" }`, response with same `id` and `result`. stdio transport: client starts server as a child process, writes JSON to its stdin, reads stdout. Main methods: `initialize`, `tools/list`, `tools/call`. Server tools carry `name`, `description`, `inputSchema` (JSON Schema).
- Analogy: USB for AI tools: one plug shape; any device (server) works with any laptop (client).
- Code example: show request/response pair for `tools/call`: request `{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_directory","arguments":{"path":"C:\\Users\\you\\pi-lab\\docs"}}}` → response `{"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"[FILE] billing.md\n[FILE] faq.md\n[FILE] setup.md"}]}}` (illustrative text format).
- Production use: connect GitHub, Jira, databases without writing each integration.
- Common mistakes: logging to stdout in a stdio server (corrupts protocol); confusing MCP tools with Pi tools (bridge maps them).
- Sources: https://modelcontextprotocol.io/specification/2025-11-25 ; https://www.jsonrpc.org/specification

### MCP TypeScript SDK client
- Concept: v1 package `@modelcontextprotocol/sdk` (v1.x maintained; v2 split packages exist — course pins v1.32.2). Imports: `Client` from `@modelcontextprotocol/sdk/client/index.js`, `StdioClientTransport` from `@modelcontextprotocol/sdk/client/stdio.js`. `new Client({ name, version })`, `await client.connect(transport)` (spawns server, runs initialize), `await client.listTools()` → `{ tools: [...] }`, `await client.callTool({ name, arguments })` → `{ content, isError? }`, `await client.close()`.
- Analogy: SDK = phrasebook so you don't hand-write every JSON-RPC sentence.
- Code example: `mcp-list.ts` (standalone script, run `node mcp-list.ts`): connect, `const { tools } = await client.listTools(); console.log(tools.map((t) => t.name).slice(0, 3)); await client.close();` → e.g. `[ 'read_text_file', 'read_media_file', 'read_multiple_files' ]` (sample order; server's README lists read_text_file, read_media_file, read_multiple_files, write_file, ... list_allowed_directories).
- Production use: same client code works for any MCP server.
- Common mistakes: forgetting `.js` suffix in SDK subpath imports; not closing (orphan processes).
- Sources: https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/docs/client.md ; https://github.com/modelcontextprotocol/typescript-sdk

### Launching server-filesystem on Windows
- Concept: launch `npx -y @modelcontextprotocol/server-filesystem <allowed dir...>`; allowed dirs are positional args, server refuses paths outside them. On Windows spawn through `cmd`: `command: "cmd", args: ["/c", "npx", "-y", "@modelcontextprotocol/server-filesystem", "C:\\Users\\you\\pi-lab\\docs"]` (npx is a .cmd shim). Option `--read-only` exists (README) — use it for docs. stderr defaults to inherit (shows server logs).
- Analogy: hiring a contractor through an agency (`cmd`) because they don't take direct calls.
- Code example: `const transport = new StdioClientTransport({ command: "cmd", args: ["/c", "npx", "-y", "@modelcontextprotocol/server-filesystem", "--read-only", docsDir] });` where `docsDir = path.resolve("docs")`. Call `list_allowed_directories` → text containing the docs path (sample).
- Production use: least privilege — expose only one folder.
- Common mistakes: `command: "npx"` on Windows → spawn error (ENOENT/EINVAL); allowing whole home folder.
- Sources: https://github.com/modelcontextprotocol/servers/blob/main/src/filesystem/README.md ; https://nodejs.org/docs/latest-v26.x/api/child_process.html#spawning-bat-and-cmd-files-on-windows

### Turning MCP tools into Pi tools
- Concept: async factory: connect once, `listTools()`, for each allowed tool `pi.registerTool({ name: \`fs_${t.name}\`, label: t.name, description: t.description ?? t.name, parameters: t.inputSchema as any, execute })`. Pi validates arguments as JSON Schema whatever built them, so MCP `inputSchema` works directly. Allowlist read tools only: `["read_text_file", "list_directory", "search_files"]`. Prefix avoids name clashes with built-ins.
- Analogy: interpreter at a conference relabels each foreign speaker's badge in the local language.
- Code example: `const ALLOW = new Set(["read_text_file", "list_directory", "search_files"]); for (const t of tools.filter((t) => ALLOW.has(t.name))) pi.registerTool({ ... });` → startup shows 3 new tools; prompt `List the docs folder using the fs tools` → trace `CALL fs_list_directory {"path":"..."}` (sample).
- Production use: generic bridge for any server.
- Common mistakes: registering write tools without a guard; schema `as any` hiding type errors (comment why).
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#tool-parameter-schemas-and-typebox ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#async-factory-functions

### Forwarding results & errors
- Concept: execute → `const r = await client.callTool({ name: t.name, arguments: params })`; map `r.content` items of `type: "text"` to Pi text content; if `r.isError` → `throw new Error(text)` so model sees an error; network/protocol exceptions propagate. Truncate large text. On `session_shutdown` → `await client.close()`. Then production option: Pi built-in MCP: `.pi/mcp.json` `{ "mcpServers": { "docs": { "command": "cmd", "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-filesystem", "--read-only", "./docs"], "exposure": "direct" } } }` → tools `mcp__docs__read_text_file` etc.; `pi mcp list` checks; `/mcp` inspects. Default exposure is `codemode` (not direct). tool_call guards apply to MCP tools too.
- Analogy: courier returns the parcel or the "address unknown" slip — both must reach the sender.
- Code example: `const text = (r.content as { type: string; text?: string }[]).filter((c) => c.type === "text").map((c) => c.text).join("\n"); if (r.isError) throw new Error(text || "MCP tool failed"); return { content: [{ type: "text", text }], details: undefined };` Ask for `../.env` → server refuses (outside allowed dir) → model sees error (sample message).
- Production use: compare hand-built vs built-in: built-in wins for real use (reconnects, OAuth, exposure control); hand-built teaches the protocol.
- Common mistakes: swallowing `isError`; leaving server processes running; project `mcp.json` without trust.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/mcp.md ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/mcp.md#control-tool-exposure

## Quiz
1. What carries an MCP message over stdio? — tests transport
2. Which SDK method spawns the server? — tests client
3. Why `cmd /c npx` on Windows? — tests launching
4. Why prefix bridged tool names? — tests mapping
5. Built-in MCP default exposure — tests mcp.json (codemode)
