window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "08-first-extension",
  "order": 8,
  "title": "Your First Extension",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "An extension is a TypeScript file that Pi loads to give the agent new abilities. In this topic you build your first one, a word_count tool, from the file location up to the return value. You also learn how to reload it quickly while you experiment.",
  "prerequisites": [
    "07-reading-traces"
  ],
  "subtopics": [
    {
      "id": "extension-files-locations-trust",
      "title": "Extension files, locations and project trust",
      "explanation": "An extension is a TypeScript file (a module, meaning one file that exports things for others to use) that Pi loads at startup to add new abilities. An extension can add tools the model may call, commands you type, and handlers that react to events in the agent loop. Everything you build from here to the end of the course is an extension.\n\nPi looks for extensions in two places. Global extensions live in your home folder at `~/.pi/agent/extensions/` and are available in every project. Project extensions live inside the project at `.pi/extensions/` and are available only when you start Pi in that project.\n\nIn both places Pi accepts two layouts: a single file such as `word-count.ts`, or a folder containing an `index.ts` such as `word-count/index.ts`. Discovery goes one level deep only. A file at `.pi/extensions/team/tools/word-count.ts` is not found automatically. You can also list extra paths in the `extensions` array of a `settings.json` file (Pi's settings file, which you met when choosing a default model).\n\nPi loads TypeScript extensions through a library called jiti, which reads `.ts` files and runs them directly. You never compile anything and you do not need `npm install` just to run an extension.\n\nProject trust. A project folder can contain code that runs on your machine, so Pi does not load project resources (such as `.pi/extensions/`) until the project is trusted. The first time you start Pi in a folder that has such resources, Pi asks whether you trust it. Answer yes only for code you wrote or have read. The `--approve` flag answers that question in advance, which is useful for scripts but should be used only on folders you already trust.\n\nThe reason for the caution is simple: an extension runs with your full user permissions. It can read your files, run programs and use the network, just like any program you start yourself. Pi has no permission system that limits it.\n\nSetup for this course: open Git Bash (the terminal from topic 01), then create the extensions folder inside your pi-lab folder. `mkdir -p` creates a folder and any missing parent folders, and `~` stands for your home folder. Then change into pi-lab and start Pi.",
      "analogy": "An extension is a plug-in attachment for a power tool: it adds a new ability the base tool did not have. Project trust is the site manager who inspects an unfamiliar attachment before letting you plug it in. Your own attachments you can approve at once. An attachment someone handed you on the street deserves a closer look.",
      "code": [
        {
          "language": "bash",
          "filename": "setup.sh",
          "source": "mkdir -p ~/pi-lab/.pi/extensions\ncd ~/pi-lab\nls -a\npi",
          "output": ".  ..  .git  .pi\n(Pi starts; if the project has resources it has not seen before, it asks whether to trust the project. Accept, because this is your own folder.)",
          "explanation": "`mkdir -p` creates `.pi/extensions` inside pi-lab. `ls -a` lists all files, including names that start with a dot, so you can see `.pi`. Your listing may also show other files you created in earlier topics. Starting `pi` from inside pi-lab makes pi-lab the project. The exact wording of the trust prompt can differ between Pi versions, but it always asks before loading project resources."
        }
      ],
      "productionNote": "Teams commit shared extensions to `.pi/extensions/` in the repository so every teammate gets the same tools after trusting the project. Personal helpers that you want everywhere go in `~/.pi/agent/extensions/`. Treat an extension in a repository like any other code in it: review it before trusting.",
      "commonMistakes": [
        "Nesting an extension more than one level deep (for example `.pi/extensions/team/word-count.ts`). Discovery goes one level deep, so Pi never finds it. Use `.pi/extensions/word-count.ts` or `.pi/extensions/word-count/index.ts`.",
        "Trusting a cloned repository without reading its `.pi/extensions/` folder. Extensions run with your full permissions, so a malicious one could read or delete your files.",
        "Putting the extension in the wrong folder (a `.pi` folder in your home folder instead of the project) and wondering why the project does not see it."
      ],
      "sources": [
        {
          "title": "Pi docs: extension locations",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#extension-locations"
        },
        {
          "title": "Pi docs: understand project trust",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/security.md#understand-project-trust"
        }
      ]
    },
    {
      "id": "factory-function-extensionapi",
      "title": "The factory function and ExtensionAPI",
      "explanation": "Every extension file has one default export (the main thing a module hands out, written `export default`, as taught in topic 03). That export must be a function, called the factory function. Pi calls it once when it loads the extension and passes in one argument, conventionally named `pi`, whose type is `ExtensionAPI`.\n\nThe `pi` object is the toolbox the extension uses to plug itself in. It has `pi.registerTool(...)` to add a tool, `pi.registerCommand(...)` to add a slash command, `pi.on(eventName, handler)` to react to an event, and `pi.exec(...)` to run a program. In this topic you use `registerTool` and `on`.\n\nThe import line `import type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";` only brings in a type, which TypeScript uses for checking and which is erased before running. Pi supplies its own copy of that package to extensions, so the extension runs without any `npm install`.\n\nThe factory may be `async` (it may return a Promise, and Pi waits for it) and Pi awaits it before the `session_start` event fires. Keep it quick, because heavy work here slows down every start of Pi.\n\nThe example below listens to the `session_start` event, which fires when a session begins. The handler receives the event and a context object `ctx` (information and helpers about the current session). `ctx.ui.notify(message, level)` shows a short message to you. The leading underscore in `_event` is a convention that means the parameter is intentionally unused.\n\nOptional: if you want your editor to check types and autocomplete, run `npm install -D @earendil-works/pi-coding-agent typebox typescript` inside pi-lab (`-D` records them as development-only dependencies). This is for the editor only. Pi does not need it.",
      "analogy": "The factory function is a new employee's first-day setup. Pi (the manager) hands the employee a toolbox, the `pi` object, and the employee uses it to register what they can do: take orders, answer phones, run reports. The setup happens once, at the start, and a slow setup delays the whole workplace opening.",
      "code": [
        {
          "language": "typescript",
          "filename": "hello.ts",
          "source": "import type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\n\nexport default function (pi: ExtensionAPI) {\n  pi.on(\"session_start\", async (_event, ctx) => {\n    ctx.ui.notify(\"hello extension loaded\", \"info\");\n  });\n}",
          "output": "hello extension loaded",
          "explanation": "Save this as `~/pi-lab/.pi/extensions/hello.ts`. When Pi starts a session it shows the notice `hello extension loaded` in its interface. The output is a notice shown by Pi, not text printed by Node. Once you have seen it, delete `hello.ts` (or keep it, it is harmless) and move on."
        }
      ],
      "productionNote": "Write one extension per concern (a weather tool, a safety guard, a memory feature), each in its own file. Small focused files are easier to review, reload and delete than one large extension that does everything.",
      "commonMistakes": [
        "Using a named export (`export function setup(pi) {...}`) instead of `export default`. Pi looks for the default export, so the extension does nothing.",
        "Doing slow work inside the factory (reading big files, calling a web API). The factory runs at every startup, so it delays Pi each time.",
        "Writing `import { ExtensionAPI }` without the word `type`. As taught in topic 03, type-only imports use `import type`."
      ],
      "sources": [
        {
          "title": "Pi docs: writing an extension",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#writing-an-extension"
        },
        {
          "title": "Pi docs: available imports",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#available-imports"
        }
      ]
    },
    {
      "id": "register-tool-name-label-description",
      "title": "registerTool: name, label, description",
      "explanation": "`pi.registerTool({ ... })` adds a tool the model can call. You pass one object describing the tool. Three of its fields identify it.\n\n`name` is the identifier the model uses when it calls the tool. Use lowercase snake_case such as `word_count`. `label` is a human-friendly name that Pi shows in its interface, for example `Word Count`. `description` is a sentence the model reads to decide whether and when to call the tool. The model never sees your code, only the name, the description and the parameter schema (the written description of the allowed inputs, explained in the next sub-topic), so the description is the main way you steer it.\n\nA good description says what the tool does and when to use it: `Count the words in a piece of text. Use when the user asks how many words something has.` A vague one such as `Text tool` leaves the model guessing. Topic 09 returns to this in depth.\n\nRegistering a tool also activates it, so the model can use it straight away. If you set `defaultActive: false` on the tool, it is registered but starts switched off.\n\nNames matter. If you register a tool whose name equals a built-in tool such as `read` or `bash`, your tool replaces the built-in one without a warning. Pick distinctive names unless you really mean to override.\n\nThe example below shows the identifying fields. It also contains `parameters` and `execute`, which are required. `Type.Object({})` means an empty set of inputs, so this stub tool takes none. The next two sub-topics explain real inputs and the return value in detail.",
      "analogy": "Registering a tool is adding a dish to a restaurant menu. The name is the short code the kitchen uses on tickets. The label is the display name printed on the menu. The description is the line that makes customers order it. Using the code of an existing dish, like read or bash, silently replaces that dish.",
      "code": [
        {
          "language": "typescript",
          "filename": "stub-tool.ts",
          "source": "import type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\nimport { Type } from \"typebox\";\n\nexport default function (pi: ExtensionAPI) {\n  pi.registerTool({\n    name: \"word_count\",\n    label: \"Word Count\",\n    description:\n      \"Count the words in a piece of text. Use when the user asks how many words something has.\",\n    parameters: Type.Object({}),\n    async execute() {\n      return { content: [{ type: \"text\", text: \"not implemented yet\" }], details: {} };\n    },\n  });\n}",
          "output": "",
          "explanation": "This file prints nothing by itself. It only registers the tool. The three identifying fields are `name`, `label` and `description`. The `parameters` and `execute` fields are placeholders that the next sub-topics replace with real ones."
        }
      ],
      "productionNote": "Tool descriptions drive reliability: a precise description makes the model call the tool at the right moments and not at the wrong ones. Treat the description as part of the tool's interface and test it like code (topic 09 does this).",
      "commonMistakes": [
        "Giving a custom tool the same name as a built-in (`read`, `bash`, `edit`, `write`) by accident. It replaces the built-in without any warning.",
        "Writing a vague description such as `Does stuff with text`. The model cannot tell when to call it.",
        "Using spaces or capital letters in `name`. Stick to snake_case like `word_count`."
      ],
      "sources": [
        {
          "title": "Pi docs: pi.registerTool",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#piregistertooldefinition"
        },
        {
          "title": "Pi docs: overriding built-in tools",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#overriding-built-in-tools"
        }
      ]
    },
    {
      "id": "parameters-typebox",
      "title": "Parameters with TypeBox",
      "explanation": "The `parameters` field tells the model which inputs the tool accepts. It is written as a JSON Schema, which is a standard way to describe the shape of JSON data: which fields exist, their types, and which are required.\n\nWriting raw JSON Schema by hand is verbose, so Pi's docs use TypeBox, a small library whose functions build JSON Schema objects. You import it with `import { Type } from \"typebox\";` (Pi provides that package, so no install is needed).\n\nThe building blocks are these. `Type.Object({ ... })` describes an object with named fields. `Type.String()`, `Type.Number()` and `Type.Boolean()` describe a text, a number and a true or false value. `Type.Optional(...)` wraps a field to say it may be left out. Fields without it are required. For a choice among fixed strings, the `StringEnum` helper from `@earendil-works/pi-ai` is used (topic 09 uses it).\n\nEach field takes an options object where `{ description: \"...\" }` explains the field in plain language. The model reads those descriptions, so always write them.\n\nPi validates the arguments the model sends against the schema before `execute` runs. Validation is done by Pi's own JSON Schema validator, not by TypeBox, so only the plain JSON Schema parts of your schema take effect. Pi also coerces loose values, for example the string `\"5\"` becomes the number `5` and `\"true\"` becomes `true`. If a required field is missing, the tool does not run. The model gets an error message listing the problem (a line such as `- text: missing`) and can try again.\n\nOne limit: TypeBox features that are not plain JSON Schema, such as `Type.Refine` (custom check functions), are not run on tool arguments. Do extra checks inside `execute` and throw an error when the input is wrong.",
      "analogy": "The schema is an order form with boxes. Required boxes must be filled in, optional boxes may stay empty, and each box has a hint printed beside it. The clerk (the validator) rejects a form with an empty required box before it ever reaches the kitchen, and politely writes on the form what is missing so the customer can fix it.",
      "code": [
        {
          "language": "typescript",
          "filename": "schema-demo.ts",
          "source": "import { Type } from \"typebox\";\n\nexport const parameters = Type.Object({\n  text: Type.String({ description: \"Text to count\" }),\n  unique: Type.Optional(Type.Boolean({ description: \"Count distinct words only\" })),\n});",
          "output": "",
          "explanation": "`text` is required because it is not wrapped in `Type.Optional`. `unique` is optional. Both have descriptions the model reads. The file prints nothing. It only builds the schema object. In the next sub-topic this same expression is placed in the `parameters` field of the tool."
        }
      ],
      "productionNote": "Typed, described inputs mean fewer broken tool calls: the model knows exactly what to send and Pi rejects bad calls before your code runs. Keep schemas small and every field described.",
      "commonMistakes": [
        "Leaving out `description` on fields. The model then has to guess what each field means.",
        "Using `Type.Refine` for validation. Pi does not run it on tool arguments, so check the value in `execute` instead and throw an error if it is bad.",
        "Forgetting `Type.Optional` for a field the model may omit, which makes Pi reject calls that left it out."
      ],
      "sources": [
        {
          "title": "Pi docs: tool parameter schemas and TypeBox",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#tool-parameter-schemas-and-typebox"
        },
        {
          "title": "TypeBox on GitHub",
          "url": "https://github.com/sinclairzx81/typebox"
        }
      ]
    },
    {
      "id": "execute-return-shape",
      "title": "execute and its return shape",
      "explanation": "`execute` is the function Pi runs when the model calls your tool. Its full signature is `async execute(toolCallId, params, signal, onUpdate, ctx)`. `toolCallId` is the id of this call (as you saw in traces in topic 07). `params` holds the arguments, already validated against your schema. `signal` is an AbortSignal (topic 03) that fires if the user cancels, `onUpdate` lets long tools report progress, and `ctx` is the session context. A simple tool needs only the first two, and a leading underscore such as `_id` marks one you ignore.\n\nIt must return an object with two parts. `content` is an array of blocks that goes back to the model as the tool result, normally one block `{ type: \"text\", text: \"...\" }`. `details` is an object kept for the interface and for state. The model does not read it. Always include it; use {} when there is nothing to store.\n\nIf something goes wrong, throw an `Error`. Pi reports that as a failed tool result and the model sees the message. Do not return a plain string, because Pi expects the object shape above.\n\nKeep results small. Pi's built-in tools cap output at 50 KB or 2000 lines, and your own tools should truncate large output too, because everything in `content` uses up the model's context window.\n\nThe first example below is a plain script you can run with Node (type stripping, topic 02). It holds just the counting logic that goes inside `execute`, so you can see exactly what the tool will return. For the phrase `the agent loop is the loop`, the words are the, agent, loop, is, the, loop: six in total, and four distinct ones once repeats are removed. The second example is the complete extension.",
      "analogy": "`execute` is the kitchen cooking an order. The `content` is the plate handed to the customer, which is what the customer (the model) actually sees and eats. The `details` are the kitchen's own notes on the order ticket, kept for the staff and never served. A cook who finds the ingredient missing does not send out a blank plate: they tell the waiter about the problem, which is what throwing an error does.",
      "code": [
        {
          "language": "typescript",
          "filename": "count-logic.ts",
          "source": "function countWords(text: string, unique: boolean): number {\n  const words = text.trim().split(/\\s+/).filter(Boolean);\n  if (unique) {\n    return new Set(words.map((w) => w.toLowerCase())).size;\n  }\n  return words.length;\n}\n\nconst sample = \"the agent loop is the loop\";\nconsole.log(`${countWords(sample, false)} words`);\nconsole.log(`${countWords(sample, true)} words`);",
          "output": "6 words\n4 words",
          "explanation": "Run it with `node count-logic.ts`. `trim()` removes spaces at both ends, `split(/\\s+/)` cuts the text at every run of whitespace, and `filter(Boolean)` drops empty strings (an empty text would otherwise count as one empty word). A `Set` is a collection that keeps each value once, so its `size` is the number of distinct words."
        },
        {
          "language": "typescript",
          "filename": "word-count.ts",
          "source": "import type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\nimport { Type } from \"typebox\";\n\nexport default function (pi: ExtensionAPI) {\n  pi.registerTool({\n    name: \"word_count\",\n    label: \"Word Count\",\n    description:\n      \"Count the words in a piece of text. Use when the user asks how many words something has.\",\n    parameters: Type.Object({\n      text: Type.String({ description: \"Text to count\" }),\n      unique: Type.Optional(Type.Boolean({ description: \"Count distinct words only\" })),\n    }),\n    async execute(_id, params) {\n      const words = params.text.trim().split(/\\s+/).filter(Boolean);\n      const n = params.unique\n        ? new Set(words.map((w) => w.toLowerCase())).size\n        : words.length;\n      return {\n        content: [{ type: \"text\", text: `${n} words` }],\n        details: { n },\n      };\n    },\n  });\n}",
          "output": "6 words",
          "explanation": "Save this as `~/pi-lab/.pi/extensions/word-count.ts` (replace the stub). When the model calls `word_count` with the text `the agent loop is the loop`, the tool result is exactly `6 words`. With `unique: true` it is `4 words`. The output is the tool result in Pi, not something printed by Node. `details: { n }` stores the number for the interface."
        }
      ],
      "productionNote": "Every custom tool you will write in this course follows this shape: validated `params` in, `{ content, details }` out, and a thrown `Error` for failure. Keep `content` short and useful for the model, and truncate anything that might be large.",
      "commonMistakes": [
        "Returning a plain string such as `return \"6 words\"`. Pi expects an object with `content` (and `details`).",
        "Forgetting `details`. It must be present, even if only `{}`.",
        "Returning huge output (a whole file, a long listing). Truncate it, because it fills the model's context window. Pi's built-in tools cap at 50 KB or 2000 lines."
      ],
      "sources": [
        {
          "title": "Pi docs: tool definition",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#tool-definition"
        },
        {
          "title": "Pi docs: output truncation",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#output-truncation"
        }
      ]
    },
    {
      "id": "loading-reload-and-pi-e",
      "title": "Loading with /reload and pi -e",
      "explanation": "There are two quick ways to try an extension.\n\nThe first: an extension in an auto-discovered location (`.pi/extensions/` or the global folder) is loaded when Pi starts. After you edit it, type `/reload` inside Pi (a slash command, a command you type starting with `/`). Pi reloads the extensions without a restart, and your new description or code takes effect.\n\nThe second: `pi -e ./path/to/file.ts` loads one file for a single run, without placing it in a discovered folder. You can repeat `-e` to load several files. This is the way to test an extension you have not decided to keep. The flag `-ne` (long form `--no-extensions`) turns off automatic discovery, so only the files you name with `-e` load. That gives you a clean run when you suspect another extension is interfering.\n\nIf an extension throws an error while loading, Pi logs the error and carries on, so the rest of the agent keeps working. Check the message if your tool does not show up.\n\nThe example sends one prompt with `-p` (print mode, topic 05) with your extension loaded. The wording of the model's answer varies between runs, so the answer below is only a sample. What is exact is the tool result `6 words`, which you can see in the trace (topic 07) or by pressing Ctrl+O in interactive mode. The loop for development is: edit, `/reload`, ask a question, read the trace.",
      "analogy": "`/reload` is restarting a song from the same playlist after you edited it: the playlist stays, the track is refreshed. `pi -e` is playing a single track straight from a file without adding it to the playlist. `-ne` is turning the whole playlist off so only that one track plays.",
      "code": [
        {
          "language": "bash",
          "filename": "try-extension.sh",
          "source": "cd ~/pi-lab\npi -ne -e ./.pi/extensions/word-count.ts -p \"How many words are in: the agent loop is the loop\"",
          "output": "There are 6 words in \"the agent loop is the loop\".",
          "explanation": "`-ne` skips discovery so the tool is not loaded twice, and `-e` loads the one file. The model calls `word_count`, gets `6 words`, and writes a final answer. Your exact sentence will differ, but it should contain 6. If it does not, open the session trace and check whether the tool was called."
        }
      ],
      "productionNote": "Fast iteration is the main skill when building extensions: edit, `/reload`, prompt, read the trace. Use `pi -e` for experiments and for scripts and tests where you want exactly one known extension loaded.",
      "commonMistakes": [
        "Editing the file and forgetting `/reload`, then testing the old version.",
        "Loading the same file twice, once from the discovered folder and once with `-e`. Add `-ne` to avoid duplicate tools.",
        "Assuming the model will call the tool. If it does not, check the description and the trace instead of the code."
      ],
      "sources": [
        {
          "title": "Pi docs: extensions quick start",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#quick-start"
        },
        {
          "title": "Pi docs: CLI resources",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md#resources"
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Where do project-level extensions live, and what must happen before Pi loads them?",
      "options": [
        "In `.pi/extensions/` inside the project; the project must be trusted",
        "In `node_modules/`; you must run `npm install` first",
        "In `~/.pi/agent/extensions/`; nothing is required",
        "In `.pi/extensions/` nested three folders deep; you must compile them with `tsc`"
      ],
      "answerIndex": 0,
      "explanation": "Project extensions sit in `.pi/extensions/` (one level deep) and load only after you trust the project, because extensions run with your full permissions. The home-folder path is for global extensions, and no compile step is needed because Pi loads TypeScript directly."
    },
    {
      "question": "What does the model read to decide whether to call a tool?",
      "options": [
        "The source code inside `execute`",
        "The tool's `description` (together with its name and parameter schema)",
        "The `details` object from the last call",
        "The `label`, which is the only field sent to the model"
      ],
      "answerIndex": 1,
      "explanation": "The model never sees your implementation. It sees the name, the description and the parameter schema. The description is what tells it when the tool is useful. `label` is only for the human interface."
    },
    {
      "question": "Which parameters definition has exactly one required string field named `path`?",
      "options": [
        "`Type.Object({ path: Type.Optional(Type.String()) })`",
        "`Type.String({ path: true })`",
        "`Type.Object({ path: Type.String({ description: \"File path\" }) })`",
        "`Type.Object({ path: Type.Number() })`"
      ],
      "answerIndex": 2,
      "explanation": "`Type.Object` describes the argument object, `Type.String` makes the field a string, and without `Type.Optional` the field is required. The first option makes it optional and the last makes it a number."
    },
    {
      "question": "In the value returned by `execute`, what are `content` and `details` for?",
      "options": [
        "`content` is kept for the interface only, and `details` is sent to the model",
        "Both are sent to the model and must contain the same text",
        "`content` is the log file name, and `details` is the error message",
        "`content` is the result sent to the model, and `details` is extra data kept for the interface and state"
      ],
      "answerIndex": 3,
      "explanation": "`content` holds the blocks the model reads as the tool result. `details` is for Pi's interface and for your own state, and the model does not read it. Errors are signalled by throwing, not by either field."
    },
    {
      "question": "How can you test one extension file for a single run without installing it into an extensions folder?",
      "options": [
        "Run `/reload` with no file",
        "Run `pi -e ./word-count.ts`, which loads just that file",
        "Copy it into `node_modules/` and restart",
        "Rename it to `index.html`"
      ],
      "answerIndex": 1,
      "explanation": "`pi -e <path>` loads the named extension for that run only. `/reload` only refreshes extensions that are already discovered, and the other options have no effect on Pi's extension loading."
    }
  ]
});
