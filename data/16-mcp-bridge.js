window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "16-mcp-bridge",
  "order": 16,
  "title": "MCP Bridge",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "MCP (Model Context Protocol) is an open standard that lets any agent use tools offered by any separate server program. You first learn the protocol by building a small bridge extension that starts a filesystem server, lists its tools and registers them as Pi tools. Then you replace the hand-built bridge with Pi's built-in MCP support, configured in an mcp.json file.",
  "prerequisites": ["15-planning"],
  "subtopics": [
    {
      "id": "what-mcp-is",
      "title": "What MCP is (JSON-RPC, client and server, stdio)",
      "explanation": "So far every tool your agent has was written by you, inside a Pi extension. That does not scale: a company may want the agent to reach GitHub, Jira (a ticket tracker) and a database, and writing each integration by hand is slow. MCP solves this. MCP stands for Model Context Protocol. A protocol is an agreed set of rules for how two programs talk to each other. MCP is an open standard (published openly, anyone can implement it), so any agent can use the tools of any server that follows the rules.\n\nTwo roles exist. The server is a program that offers tools (and other things such as resources, which are readable data). The client is the program that uses them. In this topic your agent side (a Pi extension) is the client, and a ready-made filesystem server is the server.\n\nThe messages are written in JSON-RPC 2.0, a message format built on JSON. JSON is the text data format you met in topic 03. RPC means remote procedure call: one program asks another to run a named operation and send back the answer. In JSON-RPC every message is a JSON object with the field \"jsonrpc\": \"2.0\".\n\nA request has an \"id\" (a number you choose), a \"method\" (the operation name) and optional \"params\" (the arguments). The response repeats the same \"id\", so you can match answer to question, and carries either a \"result\" or an \"error\".\n\nThe transport is how the messages travel. With the stdio transport the client starts the server as a child process (a program launched by another program) and writes JSON to the server's stdin (its input channel). The server answers on its stdout (its normal output channel, which you met in topic 07). Each message is one line of JSON.\n\nThree methods cover most of what you need. initialize is the first exchange, where client and server say hello and agree on the protocol version. tools/list asks the server which tools it has. tools/call runs one tool. Every tool the server lists has a name, a description and an inputSchema, which is a JSON Schema (the same kind of description of valid arguments you used for Pi tools in topic 08).",
      "analogy": "MCP is USB for AI tools. Before USB every device needed its own plug and driver. With one plug shape, any device (server) works with any laptop (client). With MCP, one message format lets any agent use any tool server without custom wiring.",
      "code": [
        {
          "language": "json",
          "filename": "tools-call.json",
          "source": "// Request: client -> server (written to the server's stdin)\n{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"list_directory\",\"arguments\":{\"path\":\"C:\\\\Users\\\\you\\\\pi-lab\\\\docs\"}}}\n\n// Response: server -> client (read from the server's stdout), same id\n{\"jsonrpc\":\"2.0\",\"id\":2,\"result\":{\"content\":[{\"type\":\"text\",\"text\":\"[FILE] billing.md\\n[FILE] faq.md\\n[FILE] setup.md\"}]}}",
          "output": "",
          "explanation": "This is illustration only, not a file you run (the // lines are explanatory notes, which real JSON does not allow). The request asks the server to run the tool list_directory with one argument, path. Backslashes in a Windows path are doubled because a single backslash is an escape character in JSON. The response has the same id 2, and its result holds a content array. Each content item has a type (here text) and the text itself. The exact wording of the text is chosen by the server, so treat it as a sample."
        },
        {
          "language": "json",
          "filename": "tools-list.json",
          "source": "// Request\n{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}\n\n// Response (shortened to one tool)\n{\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{\"tools\":[{\"name\":\"list_directory\",\"description\":\"List files and folders in a directory\",\"inputSchema\":{\"type\":\"object\",\"properties\":{\"path\":{\"type\":\"string\"}},\"required\":[\"path\"]}}]}}",
          "output": "",
          "explanation": "tools/list needs no params. The server answers with an array of tools. Each tool's inputSchema is plain JSON Schema saying the argument path is a required string. The description text here is a sample. This inputSchema is what lets the bridge you build later hand the tool to Pi without rewriting it."
        }
      ],
      "productionNote": "The point of MCP in production is reuse. Teams connect GitHub, Jira, databases or internal services by pointing the agent at an existing MCP server instead of writing and maintaining each integration themselves. The protocol version this course targets is the 2025-11-25 specification, which the TypeScript SDK 1.32.2 implements.",
      "commonMistakes": [
        "Writing log messages to stdout in a stdio server you build yourself. The client reads stdout as protocol messages, so a stray console.log line corrupts the conversation. Log to stderr (the separate error output channel) instead.",
        "Confusing MCP tools with Pi tools. They are two different registries with different shapes. An MCP tool lives in the server and is called with tools/call; a Pi tool is registered with pi.registerTool. The bridge you build in this topic converts one into the other.",
        "Thinking MCP is a library you import into the model. It is only a message format plus rules. The model never speaks it; your agent program does."
      ],
      "sources": [
        { "title": "MCP specification 2025-11-25", "url": "https://modelcontextprotocol.io/specification/2025-11-25" },
        { "title": "JSON-RPC 2.0 specification", "url": "https://www.jsonrpc.org/specification" }
      ]
    },
    {
      "id": "mcp-sdk-client",
      "title": "The MCP TypeScript SDK client",
      "explanation": "You could write the JSON-RPC lines by hand, but the official SDK (software development kit, a package of ready-made code) does it for you. The package is @modelcontextprotocol/sdk. This course pins the v1 line, version 1.32.2. A newer v2 exists as separate packages with different names, so do not mix examples from them.\n\nSet up inside your pi-lab folder. Open a terminal in pi-lab (for example run cd ~/pi-lab, where cd means change directory) and install the package and zod. zod is a validation library that the SDK uses internally and expects to be installed next to it. Your pi-lab folder already has a package.json with \"type\": \"module\" from earlier topics, which the import syntax below needs.\n\nThe client has five calls you need. new Client({ name, version }) creates a client that introduces itself with a name and version. await client.connect(transport) starts the server process and runs the initialize exchange. await client.listTools() sends tools/list and returns an object { tools: [...] }. await client.callTool({ name, arguments }) sends tools/call and returns { content, isError? }. Finally await client.close() shuts the connection and stops the server.\n\nThe transport is created with new StdioClientTransport({ command, args }). command is the program to start and args is the list of arguments given to it. The example below uses cmd with /c npx -y ... because that is how the filesystem server is launched on Windows; the next sub-topic explains why. For now just copy it. Replace the file path as needed: path.resolve(\"docs\") turns the relative folder docs into a full path, so run the script from inside pi-lab.\n\nCreate a file named mcp-list.ts in pi-lab, paste the code, and run it with node mcp-list.ts. Node 26 runs TypeScript directly by stripping the type annotations (topic 02). The server itself needs Node 24 or newer, which Node 26 satisfies. The first run downloads the server package, so it may pause for a few seconds.",
      "analogy": "The SDK is a phrasebook. Without it you would compose every JSON-RPC sentence yourself and check the grammar. With it you say listTools or callTool and the phrasebook produces the correct sentence and reads the reply.",
      "code": [
        {
          "language": "bash",
          "filename": "terminal",
          "source": "cd ~/pi-lab\nnpm install @modelcontextprotocol/sdk zod",
          "output": "added 94 packages in 6s",
          "explanation": "Run once inside pi-lab. The package count and time on your machine will differ; the line only confirms the install worked."
        },
        {
          "language": "typescript",
          "filename": "mcp-list.ts",
          "source": "import path from \"node:path\";\nimport { Client } from \"@modelcontextprotocol/sdk/client/index.js\";\nimport { StdioClientTransport } from \"@modelcontextprotocol/sdk/client/stdio.js\";\n\nconst docsDir = path.resolve(\"docs\");\nconst transport = new StdioClientTransport({\n  command: \"cmd\",\n  args: [\"/c\", \"npx\", \"-y\", \"@modelcontextprotocol/server-filesystem\", \"--read-only\", docsDir],\n});\n\nconst client = new Client({ name: \"mcp-list\", version: \"1.0.0\" });\nawait client.connect(transport);\n\nconst { tools } = await client.listTools();\nconsole.log(tools.map((t) => t.name).slice(0, 3));\n\nawait client.close();",
          "output": "[ 'read_text_file', 'read_media_file', 'read_multiple_files' ]",
          "explanation": "The script creates the transport, connects (this starts the server), lists the tools, prints the names of the first three, and closes. The imports end in .js even though your own files end in .ts, because the SDK ships compiled JavaScript and its subpath names include the extension. The output is a sample: the order comes from the server, so your first three names may differ. .map and .slice(0, 3) are the array methods from topic 02 and keep the first three items."
        }
      ],
      "productionNote": "The same client code works for any MCP server: only command and args change. That is why production agents treat MCP servers as configuration rather than code. Always close the client, because the server is a real operating-system process that keeps running until it is told to stop.",
      "commonMistakes": [
        "Leaving off the .js suffix in SDK subpath imports such as @modelcontextprotocol/sdk/client/index.js. Node reports ERR_MODULE_NOT_FOUND (module cannot be found).",
        "Not calling client.close(). The server child process can stay alive after your script ends (an orphan process), holding memory and sometimes blocking the terminal.",
        "Running the script from a different folder, so path.resolve(\"docs\") points at a folder that does not exist."
      ],
      "sources": [
        { "title": "MCP TypeScript SDK v1.x client guide", "url": "https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/docs/client.md" },
        { "title": "MCP TypeScript SDK repository", "url": "https://github.com/modelcontextprotocol/typescript-sdk" }
      ]
    },
    {
      "id": "launch-server-filesystem",
      "title": "Launching server-filesystem on Windows",
      "explanation": "The server you connect to is @modelcontextprotocol/server-filesystem, an official server that lets a client read and manage files. npx is a tool that comes with npm and runs a package without installing it permanently. The launch command is npx -y @modelcontextprotocol/server-filesystem followed by one or more allowed directories. The -y flag answers yes to npx's download prompt. The allowed directories are positional arguments, meaning they are identified by their position, not by a flag name. The server refuses to touch any path outside them. That is your first safety boundary.\n\nOn Windows, npx is not a normal program file but a .cmd shim (a small batch script that forwards to the real tool). Node's process-spawning code does not start such scripts directly. So you start cmd, the Windows command interpreter, and let it run npx: command: \"cmd\" with args beginning \"/c\" (run the following command, then exit). This is also the form shown in the server's own README for Windows. If you write command: \"npx\" on Windows you typically get a spawn error such as ENOENT (file not found) or EINVAL (invalid argument).\n\nOn macOS or Linux you can use command: \"npx\" and drop the \"/c\" entry.\n\nThe option --read-only stops the server from writing, editing or moving files. Use it for documentation, because reading is all the agent needs. The server prints its own log lines to stderr, and the SDK passes them through to your terminal by default, so you may see a line or two of server messages around your output. They are not protocol messages.\n\nOnce connected you can ask the server what it is allowed to touch with the list_allowed_directories tool. That is a quick way to confirm your launch arguments were understood.",
      "analogy": "Hiring a contractor through an agency. The contractor (npx, a .cmd shim) does not take direct calls from your program, so you phone the agency (cmd /c) and it connects you. The folder list you hand over is the contractor's work-site pass: they may enter only those sites.",
      "code": [
        {
          "language": "typescript",
          "filename": "mcp-allowed.ts",
          "source": "import path from \"node:path\";\nimport { Client } from \"@modelcontextprotocol/sdk/client/index.js\";\nimport { StdioClientTransport } from \"@modelcontextprotocol/sdk/client/stdio.js\";\n\nconst docsDir = path.resolve(\"docs\");\nconst transport = new StdioClientTransport({\n  command: \"cmd\",\n  args: [\"/c\", \"npx\", \"-y\", \"@modelcontextprotocol/server-filesystem\", \"--read-only\", docsDir],\n});\n\nconst client = new Client({ name: \"mcp-allowed\", version: \"1.0.0\" });\nawait client.connect(transport);\n\nconst r = await client.callTool({ name: \"list_allowed_directories\", arguments: {} });\nconst items = r.content as { type: string; text?: string }[];\nconsole.log(items[0].text);\n\nawait client.close();",
          "output": "Allowed directories:\nC:\\Users\\you\\pi-lab\\docs",
          "explanation": "list_allowed_directories takes no arguments, so arguments is an empty object. r.content is an array of content items (the same shape as the tools/call response in sub-topic 1); the as annotation only tells TypeScript the item shape and is removed when Node runs the file. items[0] means the first item, counting from zero. The printed path is a sample: yours is the full path of your own pi-lab\\docs folder, and the surrounding wording is chosen by the server."
        }
      ],
      "productionNote": "Apply least privilege: expose only the one folder the agent needs, and add --read-only when it never has to write. Never pass your whole home folder or a drive root as an allowed directory. For a server you cannot trust to be restricted, the allowed-directory list is the real security boundary, not the prompt.",
      "commonMistakes": [
        "Using command: \"npx\" directly on Windows. It fails with a spawn error (ENOENT or EINVAL) because npx is a .cmd shim. Go through cmd /c.",
        "Allowing a broad folder such as your whole home directory. A confused or manipulated agent could then read secrets such as .env files.",
        "Passing a relative path and then running the script from another folder. Resolve it to a full path with path.resolve first, as the examples do."
      ],
      "sources": [
        { "title": "server-filesystem README", "url": "https://github.com/modelcontextprotocol/servers/blob/main/src/filesystem/README.md" },
        { "title": "Node.js child_process: spawning .bat and .cmd files on Windows", "url": "https://nodejs.org/docs/latest-v26.x/api/child_process.html#spawning-bat-and-cmd-files-on-windows" }
      ]
    },
    {
      "id": "mcp-tools-to-pi-tools",
      "title": "Turning MCP tools into Pi tools",
      "explanation": "Now connect the two worlds. The bridge is a Pi extension that connects to the server once, lists its tools, and registers each wanted tool with pi.registerTool. Pi then offers them to the model like any tool you wrote yourself.\n\nCreate the file pi-lab/.pi/extensions/mcp-bridge.ts. The extension factory (the default exported function from topic 08) can be async, and Pi waits for it to finish before the session starts. That makes it the right place to connect and list the tools: by the time the model sees its tool list, the bridge tools exist.\n\nFor each MCP tool the registration needs four things. name is the tool name the model uses. We add the prefix fs_, giving fs_list_directory, so the bridged names can never clash with Pi's built-in tools or tools from another bridge. label is a human-readable name. description is copied from the server. parameters is the MCP inputSchema. Pi validates arguments as JSON Schema no matter what built it, so an MCP inputSchema works directly, with no TypeBox rewrite. TypeScript's tool-definition type expects a TypeBox schema, so we write as any (a cast that switches off type checking for that one value) and leave a comment explaining why.\n\nThe server offers about fifteen tools, including ones that write files. Do not register them all. Keep an allowlist (a short list of permitted names) of the read-only ones: read_text_file, list_directory and search_files. This file shows the minimal execute, which calls the server and returns its text; the next sub-topic adds proper error handling and shutdown.",
      "analogy": "A conference interpreter. Each foreign speaker (MCP tool) walks in with their own badge. The interpreter writes a new badge in the local language (a Pi tool with a prefixed name) and relays what each speaker says. And only the speakers on the approved list are let into the room.",
      "code": [
        {
          "language": "typescript",
          "filename": ".pi/extensions/mcp-bridge.ts",
          "source": "import path from \"node:path\";\nimport { Client } from \"@modelcontextprotocol/sdk/client/index.js\";\nimport { StdioClientTransport } from \"@modelcontextprotocol/sdk/client/stdio.js\";\nimport type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\n\nconst ALLOW = new Set([\"read_text_file\", \"list_directory\", \"search_files\"]);\n\nexport default async function (pi: ExtensionAPI) {\n  const docsDir = path.resolve(\"docs\");\n  const transport = new StdioClientTransport({\n    command: \"cmd\",\n    args: [\"/c\", \"npx\", \"-y\", \"@modelcontextprotocol/server-filesystem\", \"--read-only\", docsDir],\n  });\n  const client = new Client({ name: \"pi-mcp-bridge\", version: \"1.0.0\" });\n  await client.connect(transport);\n\n  const { tools } = await client.listTools();\n  for (const t of tools.filter((t) => ALLOW.has(t.name))) {\n    pi.registerTool({\n      name: `fs_${t.name}`,\n      label: t.name,\n      description: t.description ?? t.name,\n      // MCP inputSchema is plain JSON Schema; Pi validates any JSON Schema,\n      // but the type expects TypeBox, so we cast.\n      parameters: t.inputSchema as any,\n      async execute(_toolCallId, params) {\n        const r = await client.callTool({ name: t.name, arguments: params });\n        const items = r.content as { type: string; text?: string }[];\n        const text = items.map((c) => c.text ?? \"\").join(\"\\n\");\n        return { content: [{ type: \"text\", text }], details: undefined };\n      },\n    });\n  }\n}",
          "output": "",
          "explanation": "Save, then start pi in pi-lab (or run /reload; Pi may ask you to trust the project first, as in topic 08). The tools list now contains three new tools: fs_read_text_file, fs_list_directory and fs_search_files. Ask: List the docs folder using the fs tools. In the trace you should see a call such as CALL fs_list_directory with a path argument, then the file names in the result (sample behaviour). The file prints nothing itself, so its output is empty. The filter inside the for loop is the allowlist: tools not in ALLOW are never registered, so the model cannot even see the write tools. ALLOW is a Set, a collection that holds each value only once; ALLOW.has(name) returns true when name is in it. Using _toolCallId with an underscore means this parameter is required in position but unused."
        }
      ],
      "productionNote": "A generic bridge like this can expose any MCP server with the same code. The allowlist and the name prefix are what make it safe to reuse: you decide per server which capabilities reach the model. In real projects you would usually pick Pi's built-in MCP support (last sub-topic), but you now know what it does for you.",
      "commonMistakes": [
        "Registering write tools such as write_file or move_file without a guard. If you ever need them, add a tool_call check (topic 10) that blocks or asks for confirmation first.",
        "Using as any and forgetting why. Always leave a comment that the cast is there because the MCP schema is plain JSON Schema, otherwise real type errors elsewhere can hide behind it.",
        "Registering tools without a prefix. A server tool named read_text_file could clash with another tool of the same name and one would silently replace the other."
      ],
      "sources": [
        { "title": "Pi extensions: tool parameter schemas and TypeBox", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#tool-parameter-schemas-and-typebox" },
        { "title": "Pi extensions: async factory functions", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#async-factory-functions" }
      ]
    },
    {
      "id": "results-errors-built-in",
      "title": "Forwarding results and errors, then Pi's built-in MCP",
      "explanation": "A bridge has two jobs on the way back. First, results: a tool result from the server holds a content array, and the Pi tool must return the text items from it. Second, errors: an MCP server reports a failed tool call not by throwing but by returning a result with isError set to true and an explanation in the text. If your bridge ignores that flag, the model receives the error message as if it were a normal answer and may treat it as a fact. So when isError is true, throw new Error(text). Pi turns a thrown error into an error tool result (topic 09), and the model can then correct itself.\n\nTo prove it works, ask the agent to read ../.env. That path is outside the allowed folder, so the server refuses with a message along the lines of an access-denied notice (the exact wording is the server's), your bridge throws, and the model sees the refusal. Exceptions from the connection itself (for example the server crashed) propagate as ordinary errors too. Very large file contents are already shortened by Pi's 50KB / 2000 line output limit from topic 08, so the bridge does not need its own truncation here.\n\nThe last piece is cleanup. Pi emits session_shutdown when a session ends. In that handler call await client.close() so the server process stops. Without it, every Pi run leaves a stray server behind.\n\nThe production option is Pi's built-in MCP support, which makes all of the above unnecessary. You describe servers in an mcp.json file: ~/.pi/agent/mcp.json for all projects, or .pi/mcp.json for one project (a project file only loads after you trust the project, as with extensions). Each server has a command, args and an exposure setting, which controls how its tools reach the model.\n\nWith \"exposure\": \"direct\", every server tool becomes its own Pi tool named mcp__<server>__<tool>, such as mcp__docs__read_text_file. The default is codemode (Pi's default exposure mode, explained in the Pi MCP docs), not direct, so set direct explicitly when you want individual tools. The other values are deferred and hidden; see the Pi MCP documentation for what each does.\n\nUse pi mcp list in a terminal to check your configured servers, and /mcp inside Pi to inspect them. tool_call guards from topic 10 apply to MCP tools too, so a guard that blocks a name or path blocks it here as well.",
      "analogy": "A courier either hands over the parcel or hands over the 'address unknown' slip. Both must reach the sender. A bridge that drops the slip leaves the sender thinking the parcel arrived. And when the day is over the courier hands back the van keys: closing the server on shutdown. Pi's built-in MCP support is a courier company that already has the routes: you hand it a delivery list (mcp.json) instead of driving the van yourself.",
      "code": [
        {
          "language": "typescript",
          "filename": ".pi/extensions/mcp-bridge.ts",
          "source": "import path from \"node:path\";\nimport { Client } from \"@modelcontextprotocol/sdk/client/index.js\";\nimport { StdioClientTransport } from \"@modelcontextprotocol/sdk/client/stdio.js\";\nimport type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\n\nconst ALLOW = new Set([\"read_text_file\", \"list_directory\", \"search_files\"]);\n\nexport default async function (pi: ExtensionAPI) {\n  const docsDir = path.resolve(\"docs\");\n  const transport = new StdioClientTransport({\n    command: \"cmd\",\n    args: [\"/c\", \"npx\", \"-y\", \"@modelcontextprotocol/server-filesystem\", \"--read-only\", docsDir],\n  });\n  const client = new Client({ name: \"pi-mcp-bridge\", version: \"1.0.0\" });\n  await client.connect(transport);\n\n  const { tools } = await client.listTools();\n  for (const t of tools.filter((t) => ALLOW.has(t.name))) {\n    pi.registerTool({\n      name: `fs_${t.name}`,\n      label: t.name,\n      description: t.description ?? t.name,\n      // MCP inputSchema is plain JSON Schema; the type expects TypeBox, so we cast.\n      parameters: t.inputSchema as any,\n      async execute(_toolCallId, params) {\n        const r = await client.callTool({ name: t.name, arguments: params });\n        const items = r.content as { type: string; text?: string }[];\n        const text = items\n          .filter((c) => c.type === \"text\")\n          .map((c) => c.text)\n          .join(\"\\n\");\n        if (r.isError) throw new Error(text || \"MCP tool failed\");\n        return { content: [{ type: \"text\", text }], details: undefined };\n      },\n    });\n  }\n\n  pi.on(\"session_shutdown\", async () => {\n    await client.close();\n  });\n}",
          "output": "",
          "explanation": "Compared with the previous version, execute now keeps only items whose type is text, throws when r.isError is true (with a fallback message if the text is empty), and a session_shutdown handler closes the client, which stops the server. After /reload, ask Pi to read ../.env: the server refuses because the path is outside docs, the bridge throws, and the model sees an error result instead of a made-up answer. The file prints nothing itself, so its output is empty."
        },
        {
          "language": "json",
          "filename": ".pi/mcp.json",
          "source": "{\n  \"mcpServers\": {\n    \"docs\": {\n      \"command\": \"cmd\",\n      \"args\": [\"/c\", \"npx\", \"-y\", \"@modelcontextprotocol/server-filesystem\", \"--read-only\", \"./docs\"],\n      \"exposure\": \"direct\"\n    }\n  }\n}",
          "output": "",
          "explanation": "The same server, configured instead of coded. The key docs is the server name, which becomes part of the tool names (mcp__docs__read_text_file and so on). To avoid two bridges offering the same tools, remove or move aside the hand-built mcp-bridge.ts before trying this. Run pi mcp list to check the server is known, then start Pi in pi-lab and trust the project when asked, since a project mcp.json is only loaded after trust."
        },
        {
          "language": "bash",
          "filename": "terminal",
          "source": "pi mcp list",
          "output": "",
          "explanation": "Lists the configured MCP servers. The exact layout of its output is not fixed here; check that docs appears. Inside a running Pi session, /mcp shows the same servers and their tools."
        }
      ],
      "productionNote": "Compare the two approaches. The hand-built bridge teaches the protocol, but built-in MCP is what you should use for real work: it adds reconnects when a server drops, OAuth sign-in (a standard way to log in to a service without sharing your password) and control over how tools are exposed. Still apply the same safety habits: least-privilege folders, read-only where possible, and trust only project config you have read.",
      "commonMistakes": [
        "Swallowing isError. If the bridge returns the error text as a normal result, the model cannot tell a refusal from real data.",
        "Leaving server processes running by never closing the client on session_shutdown.",
        "Committing a project mcp.json you did not review and then trusting the project. An mcp.json starts programs on your machine, so only trust files you have read.",
        "Expecting individual tools after adding a server and not seeing them. The default exposure is codemode; set \"exposure\": \"direct\" if you want one Pi tool per server tool."
      ],
      "sources": [
        { "title": "Pi MCP documentation", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/mcp.md" },
        { "title": "Pi MCP: control tool exposure", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/mcp.md#control-tool-exposure" }
      ]
    }
  ],
  "quiz": [
    {
      "question": "With the stdio transport, how does an MCP message travel from client to server?",
      "options": [
        "It is sent as an HTTP request to a public web address",
        "It is written as a line of JSON to the server's stdin, and replies are read from its stdout",
        "It is saved to a JSONL session file that the server polls",
        "It is embedded as a vector and matched by cosine similarity"
      ],
      "answerIndex": 1,
      "explanation": "The client starts the server as a child process and exchanges JSON-RPC messages over its stdin and stdout. HTTP is a different transport, and session files and embeddings have nothing to do with MCP messages."
    },
    {
      "question": "Which MCP SDK call starts the server process and performs the initialize handshake?",
      "options": [
        "await client.connect(transport)",
        "await client.listTools()",
        "await client.callTool({ name, arguments })",
        "await client.close()"
      ],
      "answerIndex": 0,
      "explanation": "connect spawns the server through the transport and runs initialize. listTools and callTool need an existing connection, and close stops the server."
    },
    {
      "question": "Why does the Windows launch use command \"cmd\" with args starting \"/c\", \"npx\"?",
      "options": [
        "cmd makes the server run faster than starting it directly",
        "cmd is required so the server can read files outside the allowed folder",
        "cmd converts the server's JSON messages into XML",
        "npx is a .cmd shim that Node cannot spawn directly on Windows, so cmd /c runs it"
      ],
      "answerIndex": 3,
      "explanation": "npx on Windows is a batch-script shim, which a direct spawn fails on with errors such as ENOENT or EINVAL. cmd /c runs it. It has no effect on speed, access or message format."
    },
    {
      "question": "Why does the bridge register tools as fs_list_directory instead of list_directory?",
      "options": [
        "The MCP protocol requires every tool name to start with fs_",
        "The prefix avoids clashes with built-in Pi tools and tools from other sources",
        "Pi cannot register a tool whose name contains an underscore",
        "The prefix encrypts the arguments sent to the server"
      ],
      "answerIndex": 1,
      "explanation": "A prefix keeps bridged names unique, so two tools with the same name cannot replace each other. MCP has no such rule, underscores are fine in Pi, and a prefix does no encryption."
    },
    {
      "question": "In Pi 1.6.0, what is the default exposure for servers configured in mcp.json?",
      "options": [
        "direct, every server tool becomes its own Pi tool",
        "There is no default; Pi refuses to start the server until you choose one",
        "codemode, so you must set \"exposure\": \"direct\" to get individual mcp__server__tool tools",
        "hidden for project files and direct for global files"
      ],
      "answerIndex": 2,
      "explanation": "The default is codemode, not direct. Set direct explicitly to get one Pi tool per server tool. Pi does not refuse to start a server without the setting, and there is no split between project and global defaults."
    }
  ]
});
