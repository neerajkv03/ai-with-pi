window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "06-agent-loop",
  "order": 6,
  "title": "The Agent Loop",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "This is the core idea of the whole course. An agent is a loop: the model asks for an action, your program (the harness) performs it, the result goes back to the model, and this repeats until the model gives a final answer. You will build a tiny loop with a scripted fake model, then learn Pi's default tools, what is sent to the model on every turn, and what makes the loop stop.",
  "prerequisites": ["05-prompts-messages"],
  "subtopics": [
    {
      "id": "reason-act-observe",
      "title": "Reason, act, observe (ReAct)",
      "explanation": "An agent loop is a repeating cycle. The model reasons about the task and decides what to do next. It then acts by asking for a tool to be run (a tool is a function the harness can run for the model, such as reading a file). It observes the result of that tool, which is fed back to it as a new message. Then it reasons again. This continues until the model decides it has enough information and writes a final answer instead of asking for another tool. The pattern is called ReAct, short for Reason + Act, and comes from a 2022 research paper.\n\nOne trip around the cycle is called a turn: one model response, plus the tool calls that response asked for. A single prompt from you can therefore cause many model calls. Your one sentence \"Why does divide crash?\" might become turn 1 (model asks to read a file), turn 2 (model asks to read a test), and turn 3 (model writes the answer).\n\nEvery agent you will meet, including Pi, LangGraph (a popular library for building agents) and others, is this same loop plus helper features (saving sessions, compacting history, safety checks). If you understand the loop, you can understand any agent.\n\nThe model never runs anything itself. It only produces text, and part of that text can be a request such as \"please call read with path src/math.ts\". The harness (the program around the model, which for this course is Pi, and in the toy example below is your own script) is what actually runs the tool.\n\nTo see this clearly, build a toy. We replace the real model with a script: a plain array of steps that the \"model\" will say in order. No network, no cost, and the output is the same every time. Setup, first time only: open your terminal, `cd` into your `pi-lab` folder, run `mkdir loop`, then `cd loop`. Create a file named `toy-agent.ts` inside it with your editor and paste the code below. Run it with `node toy-agent.ts` (Node 26 runs TypeScript directly by stripping the type annotations, as you saw in topic 02).",
      "analogy": "A detective works the same way. She thinks (\"the victim was last seen in the kitchen, so check there\"), acts (walks to the kitchen), observes (muddy boots by the door), and thinks again with that new fact (\"who owns boots like that?\"). She repeats until the case is closed and she announces who did it. The detective's loop is the agent loop: the model is the thinking, the tool call is the walking and looking, the tool result is the clue.",
      "code": [
        {
          "language": "typescript",
          "filename": "toy-agent.ts",
          "source": "// A step is either a tool request or a final answer (a union type).\ntype ToolStep = { tool: \"read\"; args: { path: string } };\ntype AnswerStep = { answer: string };\ntype Step = ToolStep | AnswerStep;\n\n// The harness owns the tools. The model can only ask for them by name.\nconst tools = {\n  read: (a: { path: string }) => `contents of ${a.path}`,\n};\n\n// The scripted \"model\": what it will say on turn 1, then turn 2.\nconst script: Step[] = [\n  { tool: \"read\", args: { path: \"src/math.ts\" } },\n  { answer: \"divide throws on 0\" },\n];\n\nlet turn = 0;\nfor (const step of script) {\n  turn++;\n  if (\"answer\" in step) {\n    // No tool requested: this is the final answer, so the loop ends.\n    console.log(`turn ${turn}: answer -> ${step.answer}`);\n    break;\n  }\n  console.log(`turn ${turn}: call ${step.tool}(${JSON.stringify(step.args)})`);\n  console.log(`  observe: ${tools[step.tool](step.args)}`);\n}\n",
          "output": "turn 1: call read({\"path\":\"src/math.ts\"})\n  observe: contents of src/math.ts\nturn 2: answer -> divide throws on 0",
          "explanation": "The array `script` stands in for the model. Each time round the `for` loop is one turn. The check `\"answer\" in step` asks whether the step has an `answer` field; if so TypeScript knows it is the answer variant (narrowing, from topic 02) and the loop ends with `break`. Otherwise the step is a tool request: the loop prints the call, then the harness (our code) runs `tools[step.tool]` itself and prints the observation. In a real agent the observation would be sent back to the model, which would choose the next step; here the script already contains it."
        }
      ],
      "productionNote": "When an agent misbehaves, the first debugging question is always \"which step of the loop went wrong?\". Did the model pick the wrong tool, pass bad arguments, receive a misleading tool result, or draw a wrong conclusion from a correct result? Topic 07 teaches you to read Pi's recorded traces so you can answer exactly that.",
      "commonMistakes": [
        "Thinking the model runs code or reads files itself. It only outputs text that requests a tool; the harness runs the tool and reports back.",
        "Thinking one prompt equals one model call. One prompt usually causes several turns, and each turn is a separate model call that you pay for."
      ],
      "sources": [
        { "title": "ReAct: Synergizing Reasoning and Acting in Language Models (paper)", "url": "https://arxiv.org/abs/2210.03629" },
        { "title": "Pi docs: how Pi works", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/how-pi-works.md" }
      ]
    },
    {
      "id": "tool-calling",
      "title": "Tool calling: model asks, harness runs",
      "explanation": "How does the model know which tools exist? On every model call the harness sends a list of tool definitions. Each definition has a name, a plain-language description, and a parameter schema. A schema is a machine-readable description of what arguments are allowed, written in JSON Schema (a standard format that says things like \"path is a required string\"). The model reads this list like a menu.\n\nWhen the model wants a tool, its reply contains a tool-call block, a small JSON object (JSON is the text data format from topic 03) shaped like `{ \"type\": \"toolCall\", \"id\": ..., \"name\": ..., \"arguments\": ... }`. The `id` is a label that links this request to its answer later. The `name` picks the tool and `arguments` holds the values.\n\nPi then validates the arguments (checks them against the schema and rejects ones that do not fit), runs the tool on your machine, and adds a new message with role `toolResult`. The model reads that message on its next turn.\n\nThe `toolResult` message has four fields. `toolCallId` is the matching id from the request. `toolName` is the name of the tool that ran. `content` is the output. `isError` is true if the tool failed.\n\nIf the model asks for several tools in one reply, Pi runs them in parallel by default (at the same time, not one after another). Each gets its own `toolResult` message.\n\nThe two JSON blocks below are illustrative: the model's request, then the harness's answer to it.",
      "analogy": "A restaurant. The customer (the model) orders from the menu (the tool list). The kitchen (the harness) cooks the dish on its own equipment. A waiter brings the plate back (the tool result, matched to the order by its ticket number, the id). The customer never enters the kitchen, can only order what is on the menu, and if the kitchen is out of an item the waiter says so (isError). When the customer orders several dishes at once, the kitchen can cook them in parallel.",
      "code": [
        {
          "language": "json",
          "filename": "assistant-tool-call.json",
          "source": "{\n  \"type\": \"toolCall\",\n  \"id\": \"call_1\",\n  \"name\": \"read\",\n  \"arguments\": { \"path\": \"src/math.ts\" }\n}\n",
          "output": "",
          "explanation": "This block sits inside the assistant message's content. It is only a request: nothing has been read yet."
        },
        {
          "language": "json",
          "filename": "tool-result-message.json",
          "source": "{\n  \"role\": \"toolResult\",\n  \"toolCallId\": \"call_1\",\n  \"toolName\": \"read\",\n  \"content\": [{ \"type\": \"text\", \"text\": \"export function add...\" }],\n  \"isError\": false\n}\n",
          "output": "",
          "explanation": "The harness ran `read` and wrapped the output in a separate message. `toolCallId` matches the `id` above, so the model knows which request this answers. `isError: false` means the tool succeeded."
        },
        {
          "language": "typescript",
          "filename": "harness-dispatch.ts",
          "source": "type ToolCall = {\n  type: \"toolCall\";\n  id: string;\n  name: string;\n  arguments: Record<string, string>;\n};\n\ntype ToolResult = {\n  role: \"toolResult\";\n  toolCallId: string;\n  toolName: string;\n  content: { type: \"text\"; text: string }[];\n  isError: boolean;\n};\n\n// The harness's tool table. Only these names exist.\nconst tools: Record<string, (args: Record<string, string>) => string> = {\n  read: (args) => `contents of ${args.path}`,\n};\n\nfunction runToolCall(call: ToolCall): ToolResult {\n  const tool = tools[call.name];\n  if (tool === undefined) {\n    // The model asked for a tool that does not exist: report it, do not crash.\n    return {\n      role: \"toolResult\",\n      toolCallId: call.id,\n      toolName: call.name,\n      content: [{ type: \"text\", text: `Unknown tool: ${call.name}` }],\n      isError: true,\n    };\n  }\n  return {\n    role: \"toolResult\",\n    toolCallId: call.id,\n    toolName: call.name,\n    content: [{ type: \"text\", text: tool(call.arguments) }],\n    isError: false,\n  };\n}\n\n// Pretend the model replied with two tool calls in one response.\nconst calls: ToolCall[] = [\n  { type: \"toolCall\", id: \"call_1\", name: \"read\", arguments: { path: \"src/math.ts\" } },\n  { type: \"toolCall\", id: \"call_2\", name: \"deploy\", arguments: {} },\n];\n\nfor (const call of calls) {\n  const result = runToolCall(call);\n  console.log(`${result.toolCallId} ${result.toolName} isError=${result.isError}: ${result.content[0].text}`);\n}\n",
          "output": "call_1 read isError=false: contents of src/math.ts\ncall_2 deploy isError=true: Unknown tool: deploy",
          "explanation": "This is a miniature harness. `Record<string, string>` is a type for an object whose keys and values are all text. `runToolCall` takes the model's request, looks the name up in the harness's own table, runs the function, and builds a `toolResult`. The second call names a tool that does not exist, so the harness answers with `isError: true` and a message instead of crashing. The model sees that message on its next turn and can correct itself. (Pi's real implementation also validates arguments against the schema before running; this toy skips that.) Save it as `harness-dispatch.ts` in the same `loop` folder and run `node harness-dispatch.ts`."
        }
      ],
      "productionNote": "Almost everything from topic 08 to topic 22 is one of two jobs: defining tools well so the model picks the right one, and handling tool results well, including errors. A tool result with `isError: true` is information for the model, so write error messages that tell it what to try next.",
      "commonMistakes": [
        "Writing vague tool descriptions. The model chooses tools by reading them, so a vague description leads to wrong choices (topic 09 covers this).",
        "Ignoring `isError` when reading traces. A failed tool call looks like any other message unless you check that field, and many \"the model is dumb\" bugs are really a tool failing quietly."
      ],
      "sources": [
        { "title": "Pi docs: message types", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/message-types.md" },
        { "title": "Pi docs: extensions (tool_call event)", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#tool_call" }
      ]
    },
    {
      "id": "default-tools",
      "title": "Pi's default tools (read, write, edit, bash)",
      "explanation": "Pi ships with four tools switched on by default:\n\n- `read`: reads a file. Parameters: `path`, and optionally `offset` and `limit` (where to start and how much to read, useful for big files).\n- `write`: creates a file or overwrites an existing one. Parameters: `path` and `content`.\n- `edit`: changes a file by exact text replacement. Parameters: `path` and `edits`, a list of `{ oldText, newText }` pairs; Pi swaps each exact `oldText` for its `newText`.\n- `bash`: runs a shell command. Parameters: `command`, and optionally `timeout`.\n\nFour more tools exist but are off by default: `grep` (search inside files), `find` (find files by name), `ls` (list a folder), and `powershell` (a Windows-only alternative to `bash`). You choose the set with the `defaultTools` setting in a settings file, or per run with the `-t` (long form `--tools`) flag, for example `pi -t read,bash`. The flag is an allowlist (a list of the only items allowed): only the tools you name are available.\n\nThere is no sandbox. These tools run with your own user's permissions, so `bash` can delete anything you can delete, and `write` can overwrite any file you can write to. On Windows the `bash` tool needs a Bash program installed; Git for Windows, which you installed in topic 01, normally provides it.\n\nTry it in `pi-lab` with the file `src/math.ts` from topic 05. Start `pi` in that folder and send this prompt: `Add a multiply function to src/math.ts like add`. In the interface you should see the model call `read` on `src/math.ts`, then `edit` on the same file (the exact lines the model shows may vary). Press Ctrl+O to expand a tool's output. Afterwards, ask git what really changed with the command below.",
      "analogy": "Four basic workshop tools. `read` is the magnifying glass: look, change nothing. `write` is the pen: put new words on a clean page. `edit` is correction tape: fix one exact spot and leave the rest. `bash` is the power drill: it can build almost anything and can also go straight through the wall, so it gets the most respect.",
      "code": [
        {
          "language": "bash",
          "filename": "check-the-change.sh",
          "source": "cd ~/pi-lab\ngit diff | grep \"^+export\"",
          "output": "+export function multiply(a: number, b: number): number {",
          "explanation": "`git diff` shows every line changed since your last commit; `grep \"^+export\"` keeps only added lines starting with `export`. The output is a sample: the exact result depends on what the model wrote, but you should see a new `multiply` function if the task worked. Always look at the real diff, not just the model's summary."
        },
        {
          "language": "json",
          "filename": "settings.json",
          "source": "{\n  \"defaultTools\": [\"read\", \"grep\", \"find\", \"ls\"]\n}\n",
          "output": "",
          "explanation": "Put this in `.pi/settings.json` inside a project (project settings win over your user settings) to make every Pi session there read-only: the model can look and search but has no `write`, `edit` or `bash`. For a one-off read-only session use `pi -t read,grep,find,ls` instead."
        }
      ],
      "productionNote": "Use read-only sessions (`pi -t read,grep,find,ls`) when you only want to explore or understand a codebase. Removing a tool is the strongest safety measure you have, because a model cannot call a tool it was never given. Topic 19 adds guardrails on top of this.",
      "commonMistakes": [
        "Starting Pi with bash enabled in a folder that holds important files that are not under git. There is no sandbox and no undo.",
        "Trusting the model's summary of what it changed without running `git diff` to see the actual edit."
      ],
      "sources": [
        { "title": "Pi docs: CLI reference (tools)", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md#tools" },
        { "title": "Pi docs: Windows setup", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/windows.md" }
      ]
    },
    {
      "id": "context-each-turn",
      "title": "What goes into context each turn",
      "explanation": "The model has no memory between calls. On every turn the harness sends everything the model needs, again. That bundle is the context (the text the model reads for one call, measured in tokens, as in topic 04). It contains three things.\n\nFirst, the system prompt: Pi's base instructions, plus your AGENTS.md files (topic 05), short snippets describing each tool, and the name and description of each available skill (a skill is a packaged set of instructions the model can load on demand; topic 13). Second, all earlier messages on the current branch (the one line of conversation you are on; topic 07): your prompts, the model's replies, and every tool result so far. Third, the tool definitions (names, descriptions, schemas) from the previous sub-topic. Extensions, which are plugins you write in topic 08, can inspect or change the context before it is sent (the `context` event, topic 10).\n\nBecause earlier messages are included every time, the context grows with each turn, and you pay for input tokens on every call. A long session is therefore much more expensive per turn than a fresh one. Near the context window's limit Pi compacts the conversation, meaning it replaces old messages with a summary (topic 14).\n\nThe script below models this with made-up numbers. The system prompt is 900 tokens, and the three turns add 300, 1200 and 400 tokens of new messages. Save it as `growth.ts` in the `loop` folder and run `node growth.ts`.",
      "analogy": "Briefing a forgetful expert on every call. Each time you phone, the expert has forgotten everything, so you read out the whole case file from page one, then add the newest page. The file gets thicker every call, and the phone company charges by the minute, so each call costs more than the last.",
      "code": [
        {
          "language": "typescript",
          "filename": "growth.ts",
          "source": "const sys = 900; // system prompt + tool definitions, sent every turn\nconst perTurn = [300, 1200, 400]; // new tokens added during each turn\n\nlet ctx = sys;\nlet totalSent = 0;\nperTurn.forEach((t, i) => {\n  ctx += t;\n  totalSent += ctx;\n  console.log(`turn ${i + 1}: ~${ctx} tokens sent`);\n});\nconsole.log(`total input over 3 turns: ~${totalSent} tokens`);\n",
          "output": "turn 1: ~1200 tokens sent\nturn 2: ~2400 tokens sent\nturn 3: ~2800 tokens sent\ntotal input over 3 turns: ~6400 tokens",
          "explanation": "`ctx` starts at 900 and each turn adds that turn's tokens: 900 + 300 = 1200, then 1200 + 1200 = 2400, then 2400 + 400 = 2800. `forEach` runs the function once per array item, with `i` as the 0-based position. The new line shows the cost effect: the three calls sent 1200 + 2400 + 2800 = 6400 input tokens in total, even though only 1900 tokens of new content were created. Old content is paid for again on every turn."
        }
      ],
      "productionNote": "Keep tool outputs small: ask for a line range instead of a whole file, and make your own tools return summaries rather than raw dumps. Context size drives cost and also quality, since the model's attention is spread thinner over huge contexts. Topic 20 covers prompt caching, which makes the repeated part cheaper.",
      "commonMistakes": [
        "Having the agent read entire large files when it needs a few lines. The whole file stays in context for every later turn.",
        "Running very long sessions without `/compact` (summarise the history) or `/new` (start a fresh conversation), so each turn drags a huge history along."
      ],
      "sources": [
        { "title": "Pi docs: how Pi works (context)", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/how-pi-works.md#context" },
        { "title": "Pi docs: sessions (manage conversation context)", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sessions.md#manage-conversation-context" }
      ]
    },
    {
      "id": "stop-conditions",
      "title": "Stop conditions",
      "explanation": "A loop needs a way to end. In Pi it ends in these cases.\n\nThe normal case: the model replies with no tool calls. That reply is the final answer.\n\nThe user aborts by pressing Esc.\n\nAn error occurs that retrying cannot fix. Pi automatically retries transient failures (temporary ones such as a network hiccup or an overloaded server); the number of retries is the `retry.maxRetries` setting, default 3. After that it gives up.\n\nA tool returns `terminate: true`. This is a flag a tool you write can set to say \"my result is the end of the task\"; Pi skips the next model call only when every tool result in that batch sets it. You will use it in topic 22.\n\nThere are two events to tell apart when you write extensions or read traces (an event is a notification Pi emits when something happens). `agent_end` means one run of the loop finished. `agent_settled` means Pi will not continue automatically after that run. Treat `agent_settled` as the real \"everything is finished\" signal.\n\nOn top of these, a production harness adds its own guards: a maximum number of steps and a time limit (topic 15). The toy loop below adds the first. The script has five tool steps, but `MAX_STEPS` is 3. Save it as `max-steps.ts` in the `loop` folder and run `node max-steps.ts`.",
      "analogy": "A taxi ride ends when the passenger says \"here is fine\" (final answer), when the passenger jumps out at a red light (Esc), or when the car breaks down and the driver has restarted it three times without luck (retries exhausted). A sensible taxi company also sets a rule: no ride runs longer than three hours, whatever happens (a max-steps cap).",
      "code": [
        {
          "language": "typescript",
          "filename": "max-steps.ts",
          "source": "type Step = { tool: \"read\"; args: { path: string } } | { answer: string };\n\nconst MAX_STEPS = 3;\n\n// A runaway \"model\" that never stops asking for files.\nconst script: Step[] = [\n  { tool: \"read\", args: { path: \"src/a.ts\" } },\n  { tool: \"read\", args: { path: \"src/b.ts\" } },\n  { tool: \"read\", args: { path: \"src/c.ts\" } },\n  { tool: \"read\", args: { path: \"src/d.ts\" } },\n  { tool: \"read\", args: { path: \"src/e.ts\" } },\n];\n\nlet turn = 0;\nfor (const step of script) {\n  if (turn === MAX_STEPS) {\n    console.log(`stopped: max steps (${MAX_STEPS}) reached`);\n    break;\n  }\n  turn++;\n  if (\"answer\" in step) {\n    console.log(`turn ${turn}: answer -> ${step.answer}`);\n    break;\n  }\n  console.log(`turn ${turn}: call ${step.tool}(${JSON.stringify(step.args)})`);\n}\n",
          "output": "turn 1: call read({\"path\":\"src/a.ts\"})\nturn 2: call read({\"path\":\"src/b.ts\"})\nturn 3: call read({\"path\":\"src/c.ts\"})\nstopped: max steps (3) reached",
          "explanation": "Before each turn the loop checks whether the cap has been reached. Turns 1 to 3 run normally. On the fourth pass `turn` equals `MAX_STEPS`, so the loop prints the stop message and ends with `break`, and the files d.ts and e.ts are never requested. Without the check, a model that keeps asking for tools would loop until something else broke."
        }
      ],
      "productionNote": "A runaway loop burns money, because every extra turn re-sends the whole growing context. Every production agent needs a hard cap on steps and on time, enforced by the harness and not left to the model's judgement.",
      "commonMistakes": [
        "Running an agent with no maximum number of steps, so a confused model can loop for a long time at your expense.",
        "Treating `agent_end` as the final signal. Pi may still continue after it; `agent_settled` means Pi will not continue automatically."
      ],
      "sources": [
        { "title": "Pi docs: JSON mode (agent and turn events)", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/json.md#agent-and-turn-events" },
        { "title": "Pi docs: settings", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/settings.md" }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Which order describes one cycle of the ReAct agent loop?",
      "options": [
        "Observe the tool result, then reason, then act with a tool call",
        "Reason about what to do, act by requesting a tool, observe the tool result",
        "Act with a tool call, observe the final answer, then reason",
        "Reason, then observe, then act without using any tool"
      ],
      "answerIndex": 1,
      "explanation": "The model reasons and chooses an action, the action is a tool call, and the result of that tool is observed. The cycle then repeats with the new information until the model gives a final answer instead of a tool call."
    },
    {
      "question": "When the model replies with a toolCall block asking to read src/math.ts, who actually reads the file?",
      "options": [
        "The model, because it has direct access to your disk",
        "The model provider's servers, which then send the contents to Pi",
        "The harness (Pi), which runs the tool on your machine and sends back a toolResult message",
        "Nobody; the model guesses the contents from its training"
      ],
      "answerIndex": 2,
      "explanation": "The model only produces text that requests a tool. The harness validates the arguments, runs the tool locally with your permissions, and returns the output as a toolResult message."
    },
    {
      "question": "Which of Pi's default tools is the most dangerous, and why?",
      "options": [
        "read, because it can open any file",
        "edit, because it only changes exact text",
        "bash, because it runs any shell command with your user's permissions and there is no sandbox",
        "write, because it is the only tool that touches files"
      ],
      "answerIndex": 2,
      "explanation": "bash can run any command you could run yourself, including deleting files or installing software. read changes nothing, edit is limited to exact replacements in a file, and write only touches files (edit does as well, so it is not unique)."
    },
    {
      "question": "Why does the cost of each model call tend to grow as an agent session gets longer?",
      "options": [
        "Each call re-sends the system prompt, tool definitions and all earlier messages, so the input gets bigger every turn",
        "The model charges a higher price per token after the first turn",
        "Tool results are billed separately from the model",
        "Pi deletes old messages, which has to be paid for"
      ],
      "answerIndex": 0,
      "explanation": "The model keeps no memory between calls, so the whole conversation so far is sent again each turn. The same content is paid for repeatedly and the total grows with every turn."
    },
    {
      "question": "Which pair lists two ways the agent loop can stop?",
      "options": [
        "The model writes a longer reply, or the user changes the model",
        "A tool returns isError: true, or the context contains an AGENTS.md file",
        "The model replies with no tool calls (a final answer), or the user presses Esc to abort",
        "The system prompt is shorter than 900 tokens, or git diff shows no changes"
      ],
      "answerIndex": 2,
      "explanation": "A reply with no tool calls is the normal final answer, and Esc aborts the run. Other stops include unrecoverable errors after retries, a tool returning terminate: true, and harness guards such as a maximum number of steps. A tool error alone does not stop the loop; the model sees it and can try again."
    }
  ]
});
