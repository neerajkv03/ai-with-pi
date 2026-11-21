window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "21-sdk-packages",
  "order": 21,
  "title": "Pi SDK & Packages",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "Until now you ran Pi as a program in a terminal. Here you embed Pi inside your own Node.js script using its SDK (software development kit: a library you import), watch what the agent does through events, add your own tools, and rewrite the eval runner without shell quoting. Finally you bundle your extensions, skills and prompts into a Pi package that a teammate can install with one command.",
  "prerequisites": [
    "20-cost-control"
  ],
  "subtopics": [
    {
      "id": "create-agent-session-and-prompt",
      "title": "createAgentSession & prompt",
      "explanation": "So far you used Pi by typing `pi` in a terminal. The SDK (software development kit, a library you import into your own code) lets a Node.js script run the same agent without any terminal. The script creates a session (one conversation with the agent, including its history), sends it a prompt and reads the answer as a normal string.\n\nSetup, done once. Open a terminal in your `pi-lab` folder and run `npm install @earendil-works/pi-coding-agent typebox`. This downloads the Pi library (and `typebox`, the schema library from topic 08) into `node_modules`. Standalone scripts like the ones in this topic need this install; extensions loaded by Pi itself do not, because Pi supplies those imports for them. Then run `mkdir sdk` and create the file `sdk/hello.ts` in any text editor. Your `pi-lab` already has a `package.json` and ES modules switched on from topics 02 and 03.\n\nThe core calls are short. `createAgentSession(options)` returns a Promise (a value that arrives later) for an object with a `session` inside. `await session.prompt(text)` sends one user message and finishes only when the whole agent run is over, including every tool call. `session.getLastAssistantText()` returns the final assistant message as text (it can be undefined if there was none, hence the `?? \"\"` you will see later).\n\nAlways end with `session.dispose()` inside a `finally` block. Dispose means release what the session holds open (listeners, timers, child processes). If you forget it, your script can stay alive after printing the answer because something is still running.\n\nBy default a session behaves like the CLI: it uses the current working directory (`cwd`), discovers the same extensions, skills and prompts, and reads the same stored settings and credentials. Your `OPENCODE_API_KEY` or the `/login` entry in `auth.json` from topic 01 works unchanged. Four options matter most:\n\n- `sessionManager: SessionManager.inMemory()` keeps the conversation in memory only, so no session file is written to disk.\n- `tools: [\"read\", \"grep\", \"find\", \"ls\"]` is an allowlist (a list of the only tool names the agent may use). This one is read-only: the agent can look but not change anything.\n- `cwd` sets the folder the agent works in.\n- `model` and `thinkingLevel` choose the model and the thinking level from topic 05.\n\nRun the script from `pi-lab` with `node sdk/hello.ts`. Node strips the TypeScript types itself, as you learned in topic 02.",
      "analogy": "The CLI is like renting a whole workshop: you walk in, use its benches and leave. The SDK is like installing the same workbench inside your own garage. It is the same tool, but now it sits next to your own machines and you start it from your own code.",
      "code": [
        {
          "language": "typescript",
          "filename": "sdk/hello.ts",
          "source": "import { createAgentSession, SessionManager } from \"@earendil-works/pi-coding-agent\";\n\nconst { session } = await createAgentSession({\n  sessionManager: SessionManager.inMemory(),\n  tools: [\"read\", \"grep\", \"find\", \"ls\"],\n});\n\ntry {\n  await session.prompt(\"Which functions does src/math.ts export? Names only.\");\n  console.log(session.getLastAssistantText());\n} finally {\n  session.dispose();\n}\n",
          "output": "add, divide, multiply",
          "explanation": "Run it with `node sdk/hello.ts` from the pi-lab folder. The output is a sample: it is written by a model, so the wording can differ, and the list of names depends on what your own src/math.ts exports. The structure is always the same: create the session, prompt, read the text, dispose in finally."
        }
      ],
      "productionNote": "This is how Pi ends up inside other software: a chat bot (a program that answers messages), a CI job (an automatic check that runs on every code change) or a web backend (the server side of a website). Give such programs the smallest tool list they need, because an embedded agent runs with the rights of your process. This is also portfolio option 2 in topic 23.",
      "commonMistakes": [
        "Forgetting `session.dispose()`. The script may not exit because the session still holds something open. Put it in `finally` so it runs even when the prompt throws an error.",
        "Calling `session.prompt()` again while the previous run is still streaming. A session handles one run at a time; wait for the first `await` to finish, or use the session's steer and follow-up calls (they queue a message for the running agent) instead.",
        "Running `node sdk/hello.ts` from a different folder, so `src/math.ts` is not found. The session's default cwd is the folder you started Node in."
      ],
      "sources": [
        {
          "title": "Pi SDK documentation",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md"
        },
        {
          "title": "Pi SDK example 05-tools.ts",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/sdk/05-tools.ts"
        }
      ]
    },
    {
      "id": "subscribing-to-events",
      "title": "Subscribing to events",
      "explanation": "`session.prompt()` only returns after the run is over. To react while the agent works, for example to show text as it is typed or to count tool calls, you subscribe to events. An event is a small object that says something happened. You saw the same events as JSON lines in topic 07.\n\n`session.subscribe(callback)` takes a callback (a function you pass in so Pi can call it later, once per event). It returns an `unsubscribe` function; calling it stops the notifications. Subscribe before you call `prompt`, otherwise you miss the events that happen first.\n\nEvery event has a `type` string. Check it with `if`, and TypeScript then knows which other fields exist. The ones you need:\n\n- `message_update` fires many times while a message is being written. When its `assistantMessageEvent.type` is `\"text_delta\"`, then `assistantMessageEvent.delta` holds the next small piece of text. Writing each delta with `process.stdout.write` (like `console.log` but without a newline) prints the answer as a stream.\n- `tool_execution_start` and `tool_execution_end` mark the start and end of one tool run. Counting the end events gives the number of tool calls.\n- `message_end` carries the finished message. It is the authoritative copy, and assistant messages have a `usage` field with token counts (topic 07).\n- `agent_settled` means Pi has no more automatic work to do. Treat that, not `agent_end`, as the true end; `agent_end` can be followed by automatic follow-up work such as retries.\n\nThe example below streams the answer and then prints how many tools ran.",
      "analogy": "Subscribing is like tuning a radio scanner to the agent's channel. You hear every message as it is spoken, such as words being typed and tools starting and stopping, instead of waiting for the final report. You must tune in before the broadcast starts, or you miss the beginning.",
      "code": [
        {
          "language": "typescript",
          "filename": "sdk/events.ts",
          "source": "import { createAgentSession, SessionManager } from \"@earendil-works/pi-coding-agent\";\n\nconst { session } = await createAgentSession({\n  sessionManager: SessionManager.inMemory(),\n  tools: [\"read\", \"grep\", \"find\", \"ls\"],\n});\n\nlet tools = 0;\nconst unsubscribe = session.subscribe((e) => {\n  if (e.type === \"message_update\" && e.assistantMessageEvent.type === \"text_delta\") {\n    process.stdout.write(e.assistantMessageEvent.delta);\n  }\n  if (e.type === \"tool_execution_end\") {\n    tools++;\n  }\n});\n\ntry {\n  await session.prompt(\"List the files in src\");\n  console.log(`\\ntools used: ${tools}`);\n} finally {\n  unsubscribe();\n  session.dispose();\n}\n",
          "output": "The src folder contains one file: math.ts\ntools used: 1",
          "explanation": "The first line is a sample of the streamed answer; it appears piece by piece while the model writes. The count line is printed by your own code after the run. `tools++` adds one each time a tool finishes. The exact count depends on how many tools the model chooses to call, and here it listed the folder once."
        }
      ],
      "productionNote": "Live user interfaces use `text_delta` to show text as it arrives. Metrics systems (programs that collect numbers about how software behaves) use tool events and the `usage` field of `message_end` to track tool counts, token counts and cost per run.",
      "commonMistakes": [
        "Subscribing after `prompt()` has started. Events that already happened are gone, so the start of the stream is lost. Subscribe first.",
        "Treating `agent_end` as the final signal. Use `agent_settled`, which means no more automatic work follows.",
        "Counting `tool_execution_start` and `tool_execution_end` together, which doubles the count. Pick one of the two."
      ],
      "sources": [
        {
          "title": "Pi SDK docs: subscribing to events",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md#subscribing-to-events"
        },
        {
          "title": "Pi JSON event stream",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/json.md"
        }
      ]
    },
    {
      "id": "custom-tools-via-the-sdk",
      "title": "Custom tools via the SDK",
      "explanation": "In topic 08 you wrote extensions that register tools with `pi.registerTool`. An SDK session finds extensions the same way as the CLI, but it can also take extensions you write inline, as functions in your own script. That lets one script define a tool and use it in the same file.\n\nThe pieces are these. A resource loader is the object that finds the things a session may use: extensions, skills, prompts. `new DefaultResourceLoader({ cwd, agentDir, extensionFactories })` builds the standard one. `getAgentDir()` returns Pi's agent folder (`~/.pi/agent` by default). `extensionFactories` is a list of factory functions; each receives the `pi` object, exactly like the default export of an extension file, and can call `pi.registerTool`.\n\nAfter creating the loader you must call `await resourceLoader.reload()`, which makes it actually read and run everything. Then pass it as `resourceLoader` to `createAgentSession`. To load extension files from disk too, add `additionalExtensionPaths: [\"./.pi/extensions/weather.ts\"]` to the same loader options.\n\nThe tool definition is the same shape as in topic 08: `name`, `label`, `description`, `parameters` built with TypeBox and an `execute` function that returns `{ content: [{ type: \"text\", text }], details: {} }`. Here `word_count` splits the text on whitespace and returns, for example, `6 words`. The `typebox` import works because you installed it in `pi-lab` in the first sub-topic.\n\nTwo notes. The SDK has also a `customTools` option, but this course uses extension factories because they reuse the exact same `registerTool` code as the CLI. And SDK sessions do not load Pi's built-in MCP support (topic 16) automatically, so MCP tools are not there unless you add them yourself.",
      "analogy": "Think of a borrowed workbench. It comes with its own tools, but you can bring your own power tool and plug it in. The extension factory is the plug: your tool appears on the bench next to the built-in ones, and the agent can pick it up.",
      "code": [
        {
          "language": "typescript",
          "filename": "sdk/custom-tool.ts",
          "source": "import {\n  createAgentSession,\n  DefaultResourceLoader,\n  getAgentDir,\n  SessionManager,\n} from \"@earendil-works/pi-coding-agent\";\nimport type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\nimport { Type } from \"typebox\";\n\nconst resourceLoader = new DefaultResourceLoader({\n  cwd: process.cwd(),\n  agentDir: getAgentDir(),\n  extensionFactories: [\n    (pi: ExtensionAPI) => {\n      pi.registerTool({\n        name: \"word_count\",\n        label: \"Word count\",\n        description: \"Count the words in a piece of text.\",\n        parameters: Type.Object({\n          text: Type.String({ description: \"The text to count words in\" }),\n        }),\n        async execute(_toolCallId, params) {\n          const words = params.text.trim().split(/\\s+/).filter(Boolean).length;\n          return { content: [{ type: \"text\", text: `${words} words` }], details: {} };\n        },\n      });\n    },\n  ],\n});\nawait resourceLoader.reload();\n\nconst { session } = await createAgentSession({\n  resourceLoader,\n  sessionManager: SessionManager.inMemory(),\n});\n\ntry {\n  await session.prompt(\"Use the word_count tool on this text: the agent loop is the loop\");\n  console.log(session.getLastAssistantText());\n} finally {\n  session.dispose();\n}\n",
          "output": "The text \"the agent loop is the loop\" has 6 words.",
          "explanation": "The tool itself always returns exactly `6 words` for that text, because the code counts it. The sentence printed at the end is written by the model, so treat it as a sample. `_toolCallId` starts with an underscore to show the argument is unused. `.filter(Boolean)` removes empty strings, for example when the text is empty."
        }
      ],
      "productionNote": "Keep tool code in one place and reuse it: the same tool function can be registered by an extension file for the CLI and by an inline factory in an SDK service. That way a bug fix or a better description applies everywhere.",
      "commonMistakes": [
        "Forgetting `await resourceLoader.reload()`. The loader then has not loaded your factory, and the model never sees the tool.",
        "Importing `typebox` in an SDK script without running `npm install typebox`. Extensions inside the Pi CLI get this import for free, but your own Node script does not, and Node stops with an error that the module was not found.",
        "Writing a vague tool `description`. The model chooses tools by it (topic 09), so the same rules apply in the SDK."
      ],
      "sources": [
        {
          "title": "Pi SDK example 06-extensions.ts",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/sdk/06-extensions.ts"
        },
        {
          "title": "Pi SDK docs: configuring a session",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md#configuring-a-session"
        }
      ]
    },
    {
      "id": "scripted-runs-for-evals",
      "title": "Scripted runs for evals",
      "explanation": "In topic 18 your eval runner started `pi` as a child process with `spawnSync(\"pi\", ..., { shell: true })`, then parsed its JSON output. On Windows that meant fighting the `.cmd` shim and quoting rules. With the SDK the runner is just a function that calls Pi directly: the prompt is a normal string argument, so no shell is involved and nothing needs quoting.\n\nThe steps per task are the ones you already know: copy a fixture (a fixed starting folder) to a fresh temporary directory, run the agent there, score the answer, and delete the folder. The SDK-specific parts are three:\n\n- `createAgentSession({ cwd: tmp, sessionManager: SessionManager.inMemory(tmp) })` starts a brand-new session in the temp folder with no history and no file left behind.\n- A `message_end` subscriber adds `e.message.usage.totalTokens` for every assistant message to a counter.\n- `Date.now()` before and after `prompt()` gives the time in milliseconds.\n\nThe events are typed objects, not lines of text you must parse, and a model sweep (running the same tasks once per model) becomes a loop: pass a different `model` to `createAgentSession` for each round.\n\nThe example is self-contained: it creates a tiny fixture file itself instead of copying one, and scores with a simple substring check like the `answerIncludes` rubric of topic 18.",
      "analogy": "Topic 18's runner was like mailing exam papers to a school and waiting for the answer sheets, which meant dealing with envelopes (shell quoting) on the way. The SDK runner is like running the exam in your own building: you hand over the paper in person and watch the clock yourself.",
      "code": [
        {
          "language": "typescript",
          "filename": "sdk/run-task.ts",
          "source": "import { mkdtemp, mkdir, writeFile, rm } from \"node:fs/promises\";\nimport { tmpdir } from \"node:os\";\nimport { join } from \"node:path\";\nimport { createAgentSession, SessionManager } from \"@earendil-works/pi-coding-agent\";\n\ntype Task = { id: string; prompt: string; check: string };\n\nfunction scoreAnswer(answer: string, check: string): boolean {\n  return answer.includes(check);\n}\n\nasync function runTask(task: Task) {\n  const tmp = await mkdtemp(join(tmpdir(), \"eval-\"));\n  await mkdir(join(tmp, \"src\"));\n  await writeFile(\n    join(tmp, \"src\", \"math.ts\"),\n    \"export function add(a: number, b: number) { return a + b; }\\n\",\n  );\n\n  const { session } = await createAgentSession({\n    cwd: tmp,\n    sessionManager: SessionManager.inMemory(tmp),\n    tools: [\"read\", \"grep\", \"find\", \"ls\"],\n  });\n  try {\n    const t0 = Date.now();\n    let tokens = 0;\n    session.subscribe((e) => {\n      if (e.type === \"message_end\" && e.message.role === \"assistant\") {\n        tokens += e.message.usage.totalTokens;\n      }\n    });\n    await session.prompt(task.prompt);\n    const pass = scoreAnswer(session.getLastAssistantText() ?? \"\", task.check);\n    return { id: task.id, pass, tokens, ms: Date.now() - t0 };\n  } finally {\n    session.dispose();\n    await rm(tmp, { recursive: true, force: true });\n  }\n}\n\nconst tasks: Task[] = [\n  { id: \"e1\", prompt: \"Which function does src/math.ts export? Name only.\", check: \"add\" },\n];\n\nfor (const task of tasks) {\n  console.log(await runTask(task));\n}\n",
          "output": "{ id: 'e1', pass: true, tokens: 1530, ms: 6400 }",
          "explanation": "The printed row is a sample. `pass` should be true when the model names `add`, but `tokens` and `ms` differ on every run. Each task gets its own session and its own temp folder, and the `finally` block disposes the session and deletes the folder even when a task fails."
        }
      ],
      "productionNote": "This runner is the base of a CI eval gate: a CI job that runs your fixed task set on every change and fails when the pass rate drops below a threshold. Write each row as a line in your results JSONL file, as in topic 18.",
      "commonMistakes": [
        "Sharing one session across tasks. The history of task 1 leaks into task 2 and distorts both the answer and the token count. Create a fresh session per task.",
        "Not disposing the session (and deleting the temp folder) per task. Handles and folders pile up over a long run."
      ],
      "sources": [
        {
          "title": "Pi SDK docs: session storage",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md#session-storage"
        },
        {
          "title": "Pi message types: usage",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/message-types.md#usage"
        }
      ]
    },
    {
      "id": "bundling-extensions-and-skills-as-a-package",
      "title": "Bundling extensions & skills as a package",
      "explanation": "You now have extensions (weather, permission gate), skills and prompt templates spread over several folders. A Pi package bundles them into one folder (or npm package) that someone else can install with a single command.\n\nA package can contain four kinds of resources, each in its own folder: `extensions/`, `skills/`, `prompts/` and `themes/`. If you use these names, Pi discovers them automatically. Alternatively, you list the files explicitly in a `pi` manifest. A manifest is a description of what a package contains; here it is a `pi` key inside `package.json` whose lists point at the files to load. The example below uses the manifest so that you can see exactly what is loaded. Adding the keyword `pi-package` to `package.json` lets the package appear in Pi's package gallery.\n\nCreate `~/pi-lab/pi-lab-tools/` with `extensions/weather.ts`, `extensions/permission-gate.ts`, a `skills/` folder with your skill folders and a `prompts/` folder with your `.md` templates (copy them from the earlier topics), plus the `package.json` below.\n\nInstall and manage it with these commands:\n\n- `pi install ./pi-lab-tools` installs from a local folder. The files are not copied; Pi points at your folder, so edits count.\n- `pi install git:github.com/you/pi-lab-tools@v1` installs from a git repository at the tag `v1` (a tag is a named point in the git history).\n- `pi install npm:@you/pi-lab-tools@1.0.0` installs a published npm version. Replace `you` with your own account name.\n- `-l` after install writes it into the project's settings instead of your global ones.\n- `pi list` shows what is installed, and `pi remove ./pi-lab-tools` uninstalls it.\n- `pi -e ./pi-lab-tools` loads it just for one run, to test before installing.\n\nTwo rules for the dependencies. Libraries your code needs at run time go in `dependencies`. Packages that Pi provides itself (`@earendil-works/*` and `typebox`) must never be listed there, because Pi already supplies them to extensions.",
      "analogy": "Packing your tools into a labelled toolbox. Instead of telling a teammate to fetch a hammer from one shelf, a saw from another and the manual from a drawer, you hand over one box with a list on the lid, and they have the whole kit at once.",
      "code": [
        {
          "language": "json",
          "filename": "pi-lab-tools/package.json",
          "source": "{\n  \"name\": \"pi-lab-tools\",\n  \"version\": \"1.0.0\",\n  \"keywords\": [\"pi-package\"],\n  \"pi\": {\n    \"extensions\": [\"./extensions/weather.ts\", \"./extensions/permission-gate.ts\"],\n    \"skills\": [\"./skills\"],\n    \"prompts\": [\"./prompts/*.md\"]\n  }\n}\n",
          "output": "",
          "explanation": "The `pi` key is the manifest. Paths are relative to the package folder. `\"./prompts/*.md\"` matches every Markdown file in `prompts/`. There is no `dependencies` key because the extensions only use libraries Pi supplies (typebox and Pi's own packages)."
        },
        {
          "language": "bash",
          "filename": "terminal",
          "source": "cd ~/pi-lab\npi install ./pi-lab-tools\npi list",
          "output": "",
          "explanation": "After install, `pi list` shows `pi-lab-tools` among your packages (the exact layout of the listing is Pi's choice). Start `pi` and your tools, skills and templates are available, with no copying of files."
        }
      ],
      "productionNote": "A package is how you share the portfolio agent in topic 23: another person installs it from git or npm and gets the same tools, skills and prompts. Review any package before installing it, because its extensions run with full system permissions (topic 08).",
      "commonMistakes": [
        "Putting secrets such as API keys or `.env` files in the package folder. Anyone who installs or reads the package would get them. Keep keys in environment variables.",
        "Listing host packages (`@earendil-works/pi-coding-agent`, `typebox`) in `dependencies`. Pi already provides them, and a second copy can cause conflicts.",
        "Using paths in the `pi` manifest that do not match the real folder names, so nothing loads. Check with `pi list` and a test run with `pi -e ./pi-lab-tools`."
      ],
      "sources": [
        {
          "title": "Pi packages documentation",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md"
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "What must you always call when you are finished with an SDK session, ideally inside a `finally` block?",
      "options": [
        "session.dispose()",
        "session.prompt()",
        "session.subscribe()",
        "SessionManager.inMemory()"
      ],
      "answerIndex": 0,
      "explanation": "`dispose()` releases whatever the session still holds open, so your script can exit cleanly. `prompt` sends a message, `subscribe` listens to events, and `SessionManager.inMemory()` is an option for creating a session; none of them cleans up."
    },
    {
      "question": "Which event carries the streamed text of the answer, piece by piece?",
      "options": [
        "agent_settled",
        "tool_execution_end",
        "message_update with an assistantMessageEvent of type text_delta",
        "session_shutdown"
      ],
      "answerIndex": 2,
      "explanation": "While the model writes, `message_update` events arrive, and when `assistantMessageEvent.type` is `text_delta`, its `delta` holds the next piece of text. `agent_settled` signals that automatic work is over and `tool_execution_end` marks a finished tool run."
    },
    {
      "question": "How do you add a custom tool to an SDK session in this course?",
      "options": [
        "Put the tool code into the system prompt",
        "Register it inside an extension factory given to a DefaultResourceLoader, call `await resourceLoader.reload()`, and pass the loader to createAgentSession",
        "Call `session.dispose()` with the tool definition",
        "Edit the tool list in `node_modules`"
      ],
      "answerIndex": 1,
      "explanation": "An inline extension factory calls `pi.registerTool` exactly like an extension file. The loader must be reloaded before use, and the session receives it as `resourceLoader`. A system prompt cannot execute code, and `node_modules` should never be edited."
    },
    {
      "question": "Why is an SDK-based eval runner better on Windows than a runner that spawns `pi` as a child process?",
      "options": [
        "The SDK makes the model more accurate",
        "The SDK is free of charge",
        "The prompt is passed as a plain string, so there is no `.cmd` shim or shell quoting to get wrong",
        "The SDK removes the need for fixtures and scoring"
      ],
      "answerIndex": 2,
      "explanation": "Spawning `pi` with `shell: true` on Windows means quoting rules and the `.cmd` shim can break your prompt. With the SDK no shell is involved, and the events are typed objects. The model, the cost and the need for fixtures stay the same."
    },
    {
      "question": "Which key in a package's `package.json` lists the extensions, skills and prompts that Pi should load?",
      "options": [
        "dependencies",
        "scripts",
        "main",
        "pi"
      ],
      "answerIndex": 3,
      "explanation": "The `pi` key is the manifest, with lists such as `extensions`, `skills` and `prompts`. `dependencies` is for run-time libraries (and must not contain host packages such as typebox), `scripts` holds npm commands, and `main` names the entry file of a normal JavaScript package."
    }
  ]
});
