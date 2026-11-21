window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "10-commands-events-templates",
  "order": 10,
  "title": "Commands, Events & Prompt Templates",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "Pi can be steered without the model: a slash command is a button you press yourself, an event handler is code that runs when something happens in the agent loop, and a prompt template is a reusable message with blanks. You will build a logger extension that adds a command, counts tool calls and blocks `git push`, plus an `explain` template, and then learn to choose between an extension, a skill and a template.",
  "prerequisites": [
    "09-tool-design"
  ],
  "subtopics": [
    {
      "id": "register-command",
      "title": "Slash commands with pi.registerCommand",
      "explanation": "A slash command is something you type into Pi that starts with `/`, for example `/model` or `/reload`. Pi already has built-in ones. An extension can add its own with `pi.registerCommand(name, options)`. The `name` is what you type after the slash, and `options` holds a `description` (shown in the command list) and a `handler`.\n\nA handler is a function Pi calls for you when the command runs (also called a callback). It receives two arguments: `args`, the text typed after the command name as one string, and `ctx`, the context object (a bundle of information and helpers about the current session). So typing `/stats hello` calls the handler with `args` equal to `\"hello\"`.\n\nThe key difference from a tool: a command runs in the harness (Pi's own program), not in the model. You type it, your code runs, and no tokens are sent to the model, so it costs nothing and does exactly what the code says. A tool is the opposite: the model decides whether and when to call it.\n\nInside the handler, `ctx.ui.notify(text, \"info\")` shows a short message to you (you used `ctx.ui.notify` in topic 08). `ctx.sessionManager.getEntries()` returns the list of entries recorded in the current session file (the JSONL lines you read in topic 07), so `.length` is how many there are.\n\nA command handler gets a richer context than an event handler: it is an `ExtensionCommandContext`, which adds session-control methods such as `waitForIdle` (wait until the agent finishes) and `newSession` (start a fresh session). These are only safe inside commands. If two extensions register the same command name, Pi keeps both and numbers them: `/name:1` and `/name:2`.\n\nTo try it, create the file `~/pi-lab/.pi/extensions/logger.ts` (inside the `pi-lab` folder from topic 01, make a `.pi` folder, then an `extensions` folder inside it), paste the example, start `pi` in `~/pi-lab` (the project must be trusted, see topic 08), and type `/stats`. After later edits run `/reload`.",
      "analogy": "A command is a button on the workshop wall that you press yourself: it does one fixed thing, instantly, and the worker never gets involved. A tool is a job you describe to the worker, who decides for themselves whether and when to do it.",
      "code": [
        {
          "language": "typescript",
          "filename": "logger.ts",
          "source": "import type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\n\nexport default function (pi: ExtensionAPI) {\n  pi.registerCommand(\"stats\", {\n    description: \"Show session entry count\",\n    handler: async (_args, ctx) => {\n      const n = ctx.sessionManager.getEntries().length;\n      ctx.ui.notify(`${n} entries`, \"info\");\n    },\n  });\n}",
          "output": "12 entries",
          "explanation": "The factory function (taught in topic 08) registers one command. Typing `/stats` shows a notification like `12 entries`; the number is a sample and depends on how long your session is. `_args` starts with an underscore to say the handler does not use it. No model call happens, so no tokens are spent."
        }
      ],
      "productionNote": "Commands are the right place for actions a human should trigger on purpose, such as approving a plan (`/approve`, topic 15), saving a note (`/remember`, topic 14) or running an evaluation helper. If a command does slow work (reading many files, calling an API), call `ctx.ui.notify` first to say it started, otherwise the user thinks Pi is frozen.",
      "commonMistakes": [
        "Doing slow work in a handler with no feedback, so the command looks frozen. Send a `ctx.ui.notify` message before and after.",
        "Calling session-control methods such as `newSession` or `waitForIdle` from an event handler. They are meant for commands only, and calling them while the agent is running can deadlock (two things each waiting for the other, so nothing ever finishes).",
        "Expecting a command to talk to the model. A command only runs your code; to make the model respond you must send it a message explicitly (topic 15 shows how)."
      ],
      "sources": [
        {
          "title": "Pi extensions: registerCommand",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#piregistercommandname-options"
        },
        {
          "title": "Pi extensions: ExtensionCommandContext",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#extensioncommandcontext"
        }
      ]
    },
    {
      "id": "lifecycle-events",
      "title": "Lifecycle events: session_start, turn_end, agent_end, agent_settled",
      "explanation": "An event is a named signal that Pi sends when something happens. You listen with `pi.on(eventName, handler)`. The handler is `async (event, ctx) => {}`: `event` carries the details of what happened, and `ctx` is the context object from the previous sub-topic (without the session-control methods). The set of steps an agent goes through from start to finish is called its lifecycle.\n\nIn order, one prompt produces: `input` (your text arrives), `before_agent_start`, `agent_start`, then one or more turns, then `agent_end`, then possibly more runs, then `agent_settled`. Inside each turn (topic 06: one model reply plus the tool calls it asked for) you get `turn_start`, `message_*` events, `tool_*` events and `turn_end`.\n\n`session_start` fires when a session begins. Its `event.reason` says why: `startup`, `reload` (you ran `/reload`), `new`, `resume` or `fork`.\n\n`turn_end` carries `turnIndex` (which turn this was), `message` (the assistant message) and `toolResults` (an array with the results of the tools called in that turn). So `event.toolResults.length` is the number of tool calls in the turn.\n\n`agent_end` fires when the agent loop finishes and carries `messages`. But Pi may still retry or continue after it (topic 06 showed `retry.maxRetries`). `agent_settled` fires when Pi is really done. Use `agent_settled` for anything that means finished, such as printing a summary.\n\nKeep handlers quick. Pi waits for each handler, so heavy synchronous work (code that blocks until it ends, for example reading a huge file in one go) slows the whole loop.",
      "analogy": "Events are doorbells wired around the house. One rings when you come in the front door (`session_start`), one each time you leave a room (`turn_end`), one when you leave the house (`agent_end`), and one when you have locked up for the night (`agent_settled`). Leaving the house does not mean you will not come back for your keys; locking up does.",
      "code": [
        {
          "language": "typescript",
          "filename": "logger.ts",
          "source": "import type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\n\nexport default function (pi: ExtensionAPI) {\n  let calls = 0;\n\n  pi.on(\"session_start\", async (event, ctx) => {\n    ctx.ui.notify(`logger ready (${event.reason})`, \"info\");\n  });\n\n  pi.on(\"turn_end\", async (event) => {\n    calls += event.toolResults.length;\n  });\n\n  pi.on(\"agent_settled\", async (_event, ctx) => {\n    ctx.ui.notify(`run finished, ${calls} tool calls so far`, \"info\");\n  });\n}",
          "output": "logger ready (startup)\nrun finished, 2 tool calls so far",
          "explanation": "The first notification appears when Pi starts (`startup`; after `/reload` it says `reload`). `calls` is a variable kept alive by the factory, so it grows across turns. After a run in which the model used two tools, the second line appears once Pi is fully done. The `2` is a sample; it depends on what the model chooses to do."
        }
      ],
      "productionNote": "Lifecycle events are where metrics, cost tracking and audit logs live: count tool calls in `turn_end`, write a summary line in `agent_settled`. Listening costs no tokens. Keep each handler short and avoid slow synchronous work.",
      "commonMistakes": [
        "Treating `agent_end` as the final event. Pi may retry or run again afterwards; use `agent_settled` for \"really done\".",
        "Heavy synchronous work in a handler, which blocks the agent loop until it finishes.",
        "Forgetting that `calls` resets when Pi restarts or reloads: it lives only in memory, not in the session file."
      ],
      "sources": [
        {
          "title": "Pi extensions: lifecycle overview",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#lifecycle-overview"
        },
        {
          "title": "Pi extensions: turn_start / turn_end",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#turn_start--turn_end"
        }
      ]
    },
    {
      "id": "tool-call-and-result",
      "title": "Intercepting tool_call and tool_result",
      "explanation": "Two events let you stand next to every tool. `tool_call` fires before a tool runs. `tool_result` fires after it has run. Both are how you build guardrails (topic 19), redaction and logging.\n\nIn a `tool_call` handler you have three choices. Do nothing (return nothing) and the tool runs. Block it by returning `{ block: true, reason: \"...\" }`; the tool does not run, and the model receives the reason as the tool's error result, so it can explain or try something else. Or patch the call: `event.input` holds the arguments the model chose, and you may change it in place (for example edit `event.input.command`). Pi does not validate the arguments again after you change them, so only write valid values.\n\nTo know which tool you are looking at, use `isToolCallEventType(\"bash\", event)`. It is a type guard: inside the `if`, TypeScript narrows (topic 02) the event so `event.input.command` is known to be a string. The function is imported from `@earendil-works/pi-coding-agent`.\n\nFail-safe rule: if your `tool_call` handler throws an error, Pi blocks the tool. That is safe for guardrails, but it means a bug in your handler can stop every tool call.\n\nIn a `tool_result` handler, `event.toolName`, `event.content` and `event.isError` describe what happened. Return a partial patch, an object with only the fields you want to change: `content`, `details` or `isError`. Return nothing to leave the result alone. If several extensions handle the same event, they run in load order and each sees the previous patch.\n\nBelow is the finished `logger.ts` for the lab: the command, the counter, a `git push` block and a result label. Replace the file contents with it, run `/reload`, then try the prompt `Push my changes`.",
      "analogy": "`tool_call` is the security checkpoint in front of the factory floor: the guard can wave a job through, change the paperwork, or turn it away with a written reason. `tool_result` is the quality inspector at the exit, who can stamp or relabel the finished product before it goes out.",
      "code": [
        {
          "language": "typescript",
          "filename": "logger.ts",
          "source": "import { isToolCallEventType, type ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\n\nexport default function (pi: ExtensionAPI) {\n  let calls = 0;\n\n  pi.registerCommand(\"stats\", {\n    description: \"Show session entry count\",\n    handler: async (_args, ctx) => {\n      const n = ctx.sessionManager.getEntries().length;\n      ctx.ui.notify(`${n} entries`, \"info\");\n    },\n  });\n\n  pi.on(\"turn_end\", async (event) => {\n    calls += event.toolResults.length;\n  });\n\n  pi.on(\"agent_settled\", async (_event, ctx) => {\n    ctx.ui.notify(`run finished, ${calls} tool calls so far`, \"info\");\n  });\n\n  pi.on(\"tool_call\", async (event) => {\n    if (isToolCallEventType(\"bash\", event) && event.input.command.includes(\"git push\")) {\n      return { block: true, reason: \"git push is disabled in pi-lab\" };\n    }\n  });\n\n  pi.on(\"tool_result\", async (event) => {\n    if (event.toolName === \"read\" && !event.isError) {\n      return { content: [...event.content, { type: \"text\", text: \"[logged by logger.ts]\" }] };\n    }\n  });\n}",
          "output": "bash result (error): git push is disabled in pi-lab",
          "explanation": "For the prompt `Push my changes`, the model asks for a bash call containing `git push`. The handler blocks it, and the trace shows an error result whose text is the reason, `git push is disabled in pi-lab` (the exact wording on screen may differ slightly). The `tool_result` handler only touches successful `read` results: it copies the existing `content` array with `...event.content` and appends one extra text block. Because the `if` does not match other tools, those handlers return nothing and results stay untouched."
        }
      ],
      "productionNote": "Guardrails belong in `tool_call` because it runs before any side effect (a change to files or the outside world). Patterns such as blocking `git push` by checking `includes(\"git push\")` are a simple first layer; topic 19 builds a fuller permission gate. Remember that extensions run with your full user rights, so a block here is a safety net, not a sandbox.",
      "commonMistakes": [
        "Forgetting that a handler that throws blocks the tool. Wrap risky code in try/catch (topic 03) if you do not intend a block.",
        "Replacing `content` in `tool_result` without checking what else the result carries. Per the Pi docs, supplying your own `content` replaces the old one, so structured data such as `structuredContent` (machine-readable data some tools return next to the text) may be dropped. Spread the old `content` as above and test.",
        "Changing `event.input` to an invalid value. Pi does not validate it again after your handler.",
        "Checking only the tool name as a string and then reading `event.input.command` without `isToolCallEventType`, which loses the type safety and breaks for tools without that field."
      ],
      "sources": [
        {
          "title": "Pi extensions: tool_call",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#tool_call"
        },
        {
          "title": "Pi extensions: tool_result",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#tool_result"
        }
      ]
    },
    {
      "id": "prompt-templates",
      "title": "Prompt templates and argument expansion",
      "explanation": "A prompt template is a Markdown file (a plain text file with the `.md` ending) whose text Pi sends as your message when you type `/` plus the file name. A file named `explain.md` becomes the command `/explain`. A template contains no code: Pi only fills in blanks and sends the resulting text to the model. This happens before the agent sees your message.\n\nWhere Pi looks: `~/.pi/agent/prompts/*.md` for all your projects, and `.pi/prompts/` inside a project. Only files directly inside those folders count; a file in a subfolder such as `.pi/prompts/team/review.md` is not found. Project templates, like project extensions, load only after you trust the project (topic 08).\n\nThe file may start with frontmatter, a small block between two `---` lines holding settings. Two are used: `description` (shown in the command list) and `argument-hint` (a reminder of the arguments, shown to you while typing).\n\nArguments are the words you type after the command. Split like in a shell, so words are separated by spaces and quotes group words: `/explain \"src/my file.ts\"` passes one argument. Inside the template, `$1` is the first argument, `$2` the second, and so on. `$@` (or `$ARGUMENTS`) is all arguments joined with spaces.\n\n`${1:-default}` means: use argument 1, or the text `default` if it was not given. `${@:2}` means all arguments from the second one onward. `${@:2:3}` means 3 arguments starting at the second.\n\nThe template text is literal. Pi does not fix grammar for you: with the default `beginner` the sentence reads well, but with `expert` you get `to a expert`. Write templates so they work for every value, or choose neutral wording.\n\nCreate the file like this. In a terminal in `~/pi-lab` (Git Bash; the `mkdir -p` command makes the folder and any missing parents), run the command in the second example, create `explain.md` in `.pi/prompts/` with the first example's content, then start `pi` or run `/reload`.",
      "analogy": "A template is a rubber stamp with blanks you fill in each time. The stamp itself never thinks and never runs anything; it only saves you from rewriting the same sentence.",
      "code": [
        {
          "language": "markdown",
          "filename": "explain.md",
          "source": "---\ndescription: Explain a file for a beginner\nargument-hint: \"<file> [level]\"\n---\nExplain $1 to a ${2:-beginner}. List each function with one sentence.",
          "output": "/explain src/math.ts\n  -> Explain src/math.ts to a beginner. List each function with one sentence.\n\n/explain src/math.ts expert\n  -> Explain src/math.ts to a expert. List each function with one sentence.",
          "explanation": "The file lives at `~/pi-lab/.pi/prompts/explain.md`. `src/math.ts` is the file from topic 05. With one argument, `${2:-beginner}` falls back to `beginner`. With `expert` as the second argument, the text is inserted as it is, so the grammar slip `a expert` is a lesson: the template is plain text, not a language-aware tool."
        },
        {
          "language": "bash",
          "filename": "setup-prompts.sh",
          "source": "cd ~/pi-lab\nmkdir -p .pi/prompts\nls .pi/prompts",
          "output": "explain.md",
          "explanation": "Run these in Git Bash after creating the file. `ls` confirms `explain.md` sits directly in `.pi/prompts`, which is required. After editing a template later, run `/reload` inside Pi so the change is picked up."
        }
      ],
      "productionNote": "Teams keep standard prompts as templates: code review checklists, release-notes drafts, bug-report triage. Commit `.pi/prompts/` to git so everyone shares the same wording. Put a clear `argument-hint` in each one so people know what to type.",
      "commonMistakes": [
        "Putting templates in nested folders, where Pi does not discover them. Only direct children of the prompts folder load.",
        "Expecting a template to run code or read a file. It only substitutes text; the model does the work afterwards.",
        "Forgetting `/reload` after editing, then wondering why the old text is used.",
        "Forgetting to trust the project, so `.pi/prompts/` in the project is ignored."
      ],
      "sources": [
        {
          "title": "Pi prompt templates",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/prompt-templates.md"
        }
      ]
    },
    {
      "id": "extension-vs-skill-vs-template",
      "title": "Choosing: extension, skill or prompt template",
      "explanation": "Pi gives you three ways to shape behaviour. Use the lightest one that works.\n\nA prompt template is reusable text. You trigger it by typing `/name`. No code, no setup beyond one Markdown file.\n\nA skill is a folder with a `SKILL.md` file of instructions (and optionally scripts and reference files). Pi shows the model only its name and description, and the model loads the full instructions when the task matches. Topic 13 builds one.\n\nAn extension is TypeScript code with programmatic control: it can add tools, react to events, block calls and register commands. You need one whenever something must actually be computed, called or enforced, such as calling a weather API or blocking commands.\n\nRule of thumb: if instructions are enough, do not write code. If you type the same prompt every day, use a template. If the model should follow a procedure whenever a topic comes up, use a skill. If something must be enforced or executed, use an extension. Topic 21 shows how to bundle all three into one shareable package.",
      "analogy": "A template is a sticky note you stick on the desk to copy the same message from. A skill is a manual on the shelf that the worker opens only when the job calls for it. An extension is a new machine installed in the workshop: powerful, but it takes real work to build and maintain.",
      "code": [
        {
          "language": "markdown",
          "filename": "choose-mechanism.md",
          "source": "| Need                                   | Use       | Why                                          |\n|----------------------------------------|-----------|----------------------------------------------|\n| Same review prompt every day           | Template  | Reusable text, you trigger it with /review   |\n| How to cite docs in every answer       | Skill     | Instructions the model loads when relevant   |\n| Call a weather API / block commands    | Extension | Needs code that runs and can enforce rules   |",
          "output": "",
          "explanation": "Three rows, three mechanisms. Each need is matched to the lightest option that can do the job. Nothing here is run; use it as a checklist before you start writing code."
        }
      ],
      "productionNote": "Avoid code where instructions are enough: every extension is code you must test, secure and keep working across Pi updates. Keep skills small and focused, because a huge skill costs tokens whenever it loads. When pieces work, packages can ship templates, skills and extensions together.",
      "commonMistakes": [
        "Writing an extension for something a template already does, such as only sending the same text each time.",
        "Writing one giant skill that covers many unrelated jobs, so it is loaded (and billed) when only a small part is relevant.",
        "Using a template or skill to enforce a safety rule. Text asks the model politely; only an extension handler (like the `tool_call` block) actually prevents the action."
      ],
      "sources": [
        {
          "title": "Pi skills",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md"
        },
        {
          "title": "Pi extensions",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md"
        },
        {
          "title": "Pi prompt templates",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/prompt-templates.md"
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "You type `/stats`, a command registered with `pi.registerCommand`. Does this cost model tokens?",
      "options": [
        "Yes, Pi sends the command text to the model, which then replies",
        "No, the handler runs in the harness and the model is not involved",
        "Yes, but only the description text is sent",
        "Only when the command calls `ctx.ui.notify`"
      ],
      "answerIndex": 1,
      "explanation": "A command is run by Pi's own program (the harness), not the model. Your handler runs as plain code, so no tokens are used unless your code explicitly sends something to the model."
    },
    {
      "question": "What is the difference between `agent_end` and `agent_settled`?",
      "options": [
        "They are the same event with two names",
        "`agent_settled` fires before the first turn starts",
        "`agent_end` can be followed by retries or more runs; `agent_settled` fires when Pi is really done",
        "`agent_end` fires only when a tool call fails"
      ],
      "answerIndex": 2,
      "explanation": "`agent_end` marks the end of one agent run, but Pi may still retry or continue. `agent_settled` means everything is finished, so use it for final summaries."
    },
    {
      "question": "How do you stop a bash command from running inside a `tool_call` handler?",
      "options": [
        "Return `{ block: true, reason: \"...\" }` from the handler",
        "Return `{ isError: true }` from a `tool_result` handler",
        "Call `ctx.ui.notify` with the text \"blocked\"",
        "Delete the command text from the model's previous message"
      ],
      "answerIndex": 0,
      "explanation": "Returning `{ block: true, reason }` from `tool_call` prevents the tool from running, and the reason is sent back to the model. `tool_result` fires after the tool has already run, and a notification alone does not stop anything."
    },
    {
      "question": "A template contains `Explain ${1:-beginner} concepts.` and you type the command with no arguments. What text does Pi send?",
      "options": [
        "`Explain ${1:-beginner} concepts.` unchanged",
        "`Explain  concepts.` with an empty gap",
        "An error saying the argument is missing",
        "`Explain beginner concepts.`"
      ],
      "answerIndex": 3,
      "explanation": "`${1:-beginner}` means use argument 1 if given, otherwise the default text `beginner`. With no arguments the default is used."
    },
    {
      "question": "You want the model to always follow the same procedure for citing documentation sources whenever it answers a docs question. Which mechanism fits best?",
      "options": [
        "A `tool_call` handler that blocks bash",
        "A skill whose instructions the model loads when the task matches",
        "A slash command that the user must remember to type every time",
        "A TypeScript extension that registers a weather tool"
      ],
      "answerIndex": 1,
      "explanation": "Citing sources is a matter of instructions, not code, and it should apply whenever the topic comes up. A skill is loaded on demand when the task matches. A template or command would need the user to trigger it each time, and the other options do unrelated things."
    }
  ]
});
