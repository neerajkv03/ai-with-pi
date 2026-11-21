window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "07-reading-traces",
  "order": 7,
  "title": "Reading Pi Traces",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "A trace is the recorded step-by-step history of what an agent did. In this topic you find Pi's session files, read the tool calls and tool results inside them, capture a live event stream from runs with no interactive screen (headless runs), export a session for review, and write a small Node.js script that replays a trace tool by tool. You finish by learning to ask Pi why it chose a tool, and how far to trust the answer.",
  "prerequisites": [
    "06-agent-loop"
  ],
  "subtopics": [
    {
      "id": "session-files-jsonl",
      "title": "Session files (JSONL) and /session",
      "explanation": "Pi saves every conversation to a file called a session file. You do not have to turn this on: each time you run `pi` normally, a new file is written as you work.\n\nThe file format is JSONL (JSON Lines). JSON is the text format for data you met in topic 03. JSONL simply means one complete JSON object per line, so you can read the file line by line and parse each line on its own. (To parse means to read text and turn it into data your program can use.) Appending a new line is cheap, which is why Pi uses this format for a log that keeps growing.\n\nPi stores session files under its agent folder, `~/.pi/agent/sessions/`. The `~` is shorthand for your home folder. On Windows that is `C:\\Users\\you\\.pi\\agent\\sessions\\`. Inside, Pi makes one folder per project, named after the working folder you launched Pi from. The rule is: path separators (`/` or `\\`) and the drive colon `:` become `-`, and the result is wrapped in `--`. So `C:\\Users\\you\\pi-lab` becomes the folder `--C--Users-you-pi-lab--`. Inside that folder each session is one file named `<timestamp>_<session-id>.jsonl`. A timestamp is a date and time written as text, and the session id is a unique name for that conversation.\n\nLine 1 of every file is the session header: `{\"type\":\"session\",\"version\":3,\"id\":...,\"timestamp\":...,\"cwd\":...}`. It records the format version, the session id, when it started, and `cwd` (the current working directory, the folder Pi was launched in). Every later line is an entry with its own `id` and a `parentId` pointing at the entry before it. Together these form a tree, so that if you go back and try a different path in a conversation, the new entries become a branch (a fork off an earlier point) instead of overwriting the old ones.\n\nInside Pi, type `/session` to see facts about the current session: the file path, the session id, how many messages it holds, token totals and the cost so far. A token is the small chunk of text a model reads and writes (topic 04), and cost is what those tokens were billed at.\n\nIf you do not want a file at all, start Pi with `--no-session`. Nothing is written, which suits throwaway experiments.",
      "analogy": "A session file is an aircraft's flight recorder (the black box). Every message and every tool use is written down line by line while the flight happens, and anyone can read the record after landing to understand exactly what took place. Like a flight recorder, the file is a faithful log, not something you edit to tidy up the story.",
      "code": [
        {
          "language": "bash",
          "filename": "list-sessions.sh",
          "source": "ls ~/.pi/agent/sessions/",
          "output": "--C--Users-you-pi-lab--",
          "explanation": "Run this in Git Bash (the terminal from topic 01). `ls` lists a folder's contents. You see one folder per project you have launched Pi in; the name above is what a project at `C:\\Users\\you\\pi-lab` produces, so your own list will show your own paths. Run `ls` on that folder to see the `.jsonl` session files inside it."
        },
        {
          "language": "text",
          "filename": "session-command.txt",
          "source": "/session",
          "output": "Session file: C:\\Users\\you\\.pi\\agent\\sessions\\--C--Users-you-pi-lab--\\2026-11-21T10-00-00-000Z_sess-001.jsonl\nSession id:   sess-001\nMessages:     4\nTokens:       138\nCost:         $0.0004",
          "explanation": "Type `/session` at the Pi prompt (not in a normal terminal). The output above is an illustration of the kind of information shown: the exact wording, layout and numbers on your machine will differ, but you should find the file path, the id, the message count, tokens and cost."
        }
      ],
      "productionNote": "Session files are the raw material for debugging (what did the agent really do?), audits (who ran which command?) and evaluation logs (topic 18). Because they are plain text, standard tools such as `grep` (a command that prints lines containing a search word) and scripts like the one at the end of this topic can analyse them. Treat them like any log that may hold sensitive data and decide where they are stored and who can read them.",
      "commonMistakes": [
        "Sharing a session file without checking it first. It contains every message and every file the agent read, so it can include secrets such as API keys from a `.env` file.",
        "Editing a session file by hand. Each entry's `parentId` must point at a real earlier `id`; a hand edit can break that chain and make the file unreadable for Pi.",
        "Expecting a file after starting Pi with `--no-session`. That flag deliberately writes nothing, so `/session` has no file to show."
      ],
      "sources": [
        {
          "title": "Pi docs: session format, file location",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/session-format.md#file-location"
        },
        {
          "title": "Pi docs: sessions, control session storage",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sessions.md#control-session-storage"
        }
      ]
    },
    {
      "id": "toolcall-and-toolresult",
      "title": "toolCall and toolResult entries",
      "explanation": "After the header, most lines are message entries. Each has the shape `{\"type\":\"message\",\"id\":...,\"parentId\":...,\"timestamp\":...,\"message\":{...}}`. The inner `message` object is the same kind of message from topic 05, with a `role` such as `user`, `assistant` or `toolResult`.\n\nAn assistant message has a `content` array (an ordered list). Each item is a block with its own `type`: `text` is words for the user, `thinking` is reasoning text on models that provide it, and `toolCall` is a request to run a tool. A `toolCall` block holds an `id` (for example `call_1`), the tool `name` and its `arguments`, the same fields you saw in topic 06.\n\nThe result does not live inside the assistant message. When Pi runs the tool it appends a separate entry whose message has `role` set to `toolResult`. That message has a `toolCallId` equal to the `id` of the call it answers, the `toolName`, the `content` the tool returned, and `isError`, a true/false flag that says whether the tool failed.\n\nAssistant messages also carry a `usage` object with `input`, `output`, `cacheRead`, `cacheWrite`, `totalTokens` and `cost.total`. These are the token counts and money for that one model call. `cacheRead` and `cacheWrite` count tokens the provider reused or stored from earlier requests, which comes back in the cost-control topic.\n\nBelow is `sample.jsonl`, a small hand-written session of exactly 5 lines that this topic uses throughout. It is simplified: real files hold more fields and more entries. Create it by making the folder with `mkdir -p ~/pi-lab/traces`, moving into it with `cd ~/pi-lab/traces`, and saving the text below as `sample.jsonl` in your editor.\n\nRead it line by line. Line 1 is the session header. Line 2 is the user's question, with `parentId` null because it is the first message. Line 3 is the assistant calling the `read` tool on `src/math.ts`, with a `usage` object. Line 4 is the `toolResult` whose `toolCallId` is `call_1`, matching line 3, with `isError` false. Line 5 is the assistant's final text answer.",
      "analogy": "Think of a restaurant kitchen. Each order written by the waiter gets a number. When the kitchen sends out a dish, the ticket on it carries the number of the order it answers. The toolResult is the dish, the toolCallId is the order number, and matching numbers is how you know which dish belongs to which order, even when several orders are in flight at once.",
      "code": [
        {
          "language": "json",
          "filename": "sample.jsonl",
          "source": "{\"type\":\"session\",\"version\":3,\"id\":\"sess-001\",\"timestamp\":\"2026-11-21T10:00:00.000Z\",\"cwd\":\"C:/Users/you/pi-lab\"}\n{\"type\":\"message\",\"id\":\"a1\",\"parentId\":null,\"timestamp\":\"2026-11-21T10:00:01.000Z\",\"message\":{\"role\":\"user\",\"content\":\"What does divide do?\"}}\n{\"type\":\"message\",\"id\":\"a2\",\"parentId\":\"a1\",\"timestamp\":\"2026-11-21T10:00:03.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"toolCall\",\"id\":\"call_1\",\"name\":\"read\",\"arguments\":{\"path\":\"src/math.ts\"}}],\"usage\":{\"input\":120,\"output\":18,\"cacheRead\":0,\"cacheWrite\":0,\"totalTokens\":138,\"cost\":{\"total\":0.0004}}}}\n{\"type\":\"message\",\"id\":\"a3\",\"parentId\":\"a2\",\"timestamp\":\"2026-11-21T10:00:03.500Z\",\"message\":{\"role\":\"toolResult\",\"toolCallId\":\"call_1\",\"toolName\":\"read\",\"content\":[{\"type\":\"text\",\"text\":\"export function divide(a: number, b: number) { if (b === 0) throw new Error('b is 0'); return a / b; }\"}],\"isError\":false}}\n{\"type\":\"message\",\"id\":\"a4\",\"parentId\":\"a3\",\"timestamp\":\"2026-11-21T10:00:05.000Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"divide throws when b is 0.\"}]}}",
          "output": "",
          "explanation": "Five lines, five JSON objects. Each line must stay on a single physical line in the file (do not add line breaks inside an object). The file only needs to be saved; nothing prints. In real sessions the `cwd` on Windows is written with backslashes, and the exact set of fields varies, but the links are the same: `parentId` chains the entries, and `toolCallId` on line 4 equals the `id` `call_1` on line 3."
        }
      ],
      "productionNote": "Matching each call to its result by `toolCallId` is how evaluation harnesses and guard logs work: to answer 'did the agent run a dangerous command, and did it fail?' you pair the call (name and arguments) with its result (content and `isError`). Later topics in this course build on that pairing.",
      "commonMistakes": [
        "Assuming the tool result sits inside the assistant message. It is its own entry with `role` `toolResult`; look for it on a later line and match it by `toolCallId`.",
        "Ignoring `isError`. A result with `isError` true means the tool failed, and the model's next step is usually a reaction to that failure. Skipping it hides the real story.",
        "Matching calls to results by position. When a model makes several calls at once, results may arrive in a different order; always compare the ids."
      ],
      "sources": [
        {
          "title": "Pi docs: message types",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/message-types.md"
        },
        {
          "title": "Pi docs: session format, message entry",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/session-format.md#sessionmessageentry"
        }
      ]
    },
    {
      "id": "headless-runs",
      "title": "Headless runs with --print and --mode json",
      "explanation": "So far you used Pi interactively, typing into its screen. A headless run is one with no interactive screen: you give Pi a message on the command line, it works, and the program exits. This is what scripts and automated jobs need.\n\n`pi -p \"your message\"` (long form `--print`) runs the agent, prints only the final answer to the terminal, and exits. You saw `-p` in topic 05. It is the quickest way to get one answer into a script.\n\n`pi --mode json \"your message\"` is different: instead of just the answer, it prints a live stream of events, one JSON object per line. An event is a small record that says something just happened. You do not need `-p` with it; `--mode json` runs the prompt and exits. The events include the session header, then `agent_start`, `turn_start`, `message_start`, `message_update` and `message_end`, then `tool_execution_start` with `toolCallId`, `toolName` and `args`, and `tool_execution_end` with `result`, `isError` and `durationMs` (how many milliseconds the tool took). Each turn ends with `turn_end`, the run ends with `agent_end`, and finally `agent_settled` says that the agent has fully finished.\n\nThe JSON goes to stdout (standard output), the normal output channel of a program. Anything that is only a log or a warning goes to stderr (standard error), a separate channel. Keeping them apart means you can safely redirect stdout into a file. In a shell, `>` sends stdout to a file, for example `> events.jsonl`.\n\nAdd `--no-session` when you do not want the run saved as a session file, which is good for throwaway runs. Then you can inspect the saved stream with `grep`, which prints only the lines containing a word, and `head -1`, which keeps just the first line. The `|` symbol (a pipe) passes the output of one command into the next.",
      "analogy": "Using `-p` is like asking the shop only for the final receipt: you see what you bought and what it cost, nothing else. Using `--mode json` is like being given a live CCTV feed of the whole shop: you see every step as it happens, and you can replay it later.",
      "code": [
        {
          "language": "bash",
          "filename": "headless-print.sh",
          "source": "pi -p --no-session \"What does divide in src/math.ts do?\"",
          "output": "divide returns a divided by b and throws an error when b is 0.",
          "explanation": "Prints just the final answer and exits. The wording of the answer is produced by the model, so yours will differ; the point is that only the answer is printed."
        },
        {
          "language": "bash",
          "filename": "headless-json.sh",
          "source": "pi --mode json --no-session \"List files in src\" > events.jsonl\ngrep tool_execution_end events.jsonl | head -1",
          "output": "{\"type\":\"tool_execution_end\",\"toolCallId\":\"call_1\",\"toolName\":\"ls\",\"isError\":false,\"durationMs\":12,...}",
          "explanation": "The first command saves the event stream into `events.jsonl`; the terminal shows nothing during the run because stdout went to the file. The second command finds the lines mentioning `tool_execution_end` and keeps the first. The line above is an illustration, shortened with `...`: the model chooses the tool, so you may see `\"toolName\":\"bash\"` instead of `ls`, and other fields and values will differ."
        }
      ],
      "productionNote": "The evaluation runner you build in topic 18 starts Pi with `--mode json` and parses this stream to learn which tools ran, whether they failed, and how many tokens were used. Keep stdout clean for the stream and read logs from stderr, so that a stray warning can never corrupt your JSON.",
      "commonMistakes": [
        "Reading the stream with Node's `readline` module (a Node.js helper that reads text one line at a time). It also splits lines on some Unicode separator characters that can legitimately appear inside JSON strings, which cuts an event in half. Split on the line-feed character `\\n` only, as the Pi docs advise.",
        "Mixing stderr into the file, for example with `2>&1` (a shell instruction that sends error text into the same file as normal output). Log text is not JSON, so the saved file stops being valid JSONL and parsing fails.",
        "Forgetting `--no-session` on test runs and filling the sessions folder with throwaway files."
      ],
      "sources": [
        {
          "title": "Pi docs: JSON mode",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/json.md"
        },
        {
          "title": "Pi docs: CLI, invocation and output",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md#invocation-and-output"
        }
      ]
    },
    {
      "id": "export-and-debug",
      "title": "/export and /debug",
      "explanation": "Raw JSONL is precise but not pleasant to read. Inside Pi, `/export` writes the current session out as an HTML page (a readable document you open in a browser) or as JSONL. Pick HTML when you want to read or present a conversation, and JSONL when you want data.\n\n`/share` goes a step further and uploads the session so others can view it online. Because a session contains the contents of every file the agent read, review what is in it before you share it.\n\n`/debug` is for problems with Pi itself rather than with your conversation. It writes a file named `pi-debug.log` into Pi's agent folder, `~/.pi/agent/`. You can attach that file to a bug report.\n\nTwo keyboard shortcuts help while reading a live run. Ctrl+O expands the output of tool calls, which Pi normally shortens on screen. Ctrl+T shows or hides the model's thinking blocks (see topic 05 for thinking).",
      "analogy": "`/export` is like printing the flight log as a neat booklet that anyone can read without special equipment. `/debug` is like the mechanic's engine readout: it says nothing about where the plane flew, only how the machine itself behaved.",
      "code": [
        {
          "language": "text",
          "filename": "export-and-debug.txt",
          "source": "/export\n/debug",
          "output": "",
          "explanation": "Type these one at a time at the Pi prompt. For `/export`, choose HTML when asked, then open the file path Pi reports in your browser (double-click it in your file explorer). For `/debug`, Pi writes `pi-debug.log`. The messages Pi prints vary, so none are shown here."
        },
        {
          "language": "bash",
          "filename": "check-debug-log.sh",
          "source": "ls ~/.pi/agent/pi-debug.log",
          "output": "/c/Users/you/.pi/agent/pi-debug.log",
          "explanation": "Run this in Git Bash after `/debug` to confirm the file exists. If it does not exist, `ls` reports an error instead. The path shown is how Git Bash writes a Windows home folder; yours will use your own user name."
        }
      ],
      "productionNote": "When you report a bug in an agent, attach the exported HTML or JSONL trace plus `pi-debug.log`. A maintainer can then see what happened instead of guessing. Always read the trace first and remove anything private.",
      "commonMistakes": [
        "Sharing an export that includes `.env` contents because a tool read that file during the session. Exports are a copy of everything in the conversation.",
        "Looking for `pi-debug.log` in the current project folder. It is written to the agent folder `~/.pi/agent/`.",
        "Using `/share` without reviewing the session first, since it uploads the contents."
      ],
      "sources": [
        {
          "title": "Pi docs: sessions, export or share a session",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sessions.md#export-or-share-a-session"
        },
        {
          "title": "Pi docs: usage",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/usage.md"
        }
      ]
    },
    {
      "id": "explaining-a-trace",
      "title": "Explaining a trace tool by tool",
      "explanation": "Reading a trace well is a method, not a gift. For each tool call, note four things: (1) why the model called it, which you can infer from the text or thinking just before the call; (2) the arguments it passed; (3) the result or error that came back; (4) what the model did next. Do this for every call in order and you can explain the whole run.\n\nDoing it by eye on a long session is slow, so write a small reader script. `trace.ts` below reads a session file and prints one line per step. Save it in `~/pi-lab/traces/` next to `sample.jsonl`.\n\nHere is how it works. `process.argv[2]` is the first argument you type after the script name (the file path). `readFileSync` reads a whole file into a string. `.split(\"\\n\")` cuts it into lines.\n\nThen clean up those lines. `.map(...)` removes a trailing carriage return `\\r` from each one (a character Windows adds to line endings, written as `\\r$` in the pattern), and `.filter(Boolean)` throws away empty lines.\n\nThe `for (const line of lines)` loop repeats its block once per line. Each line goes through `JSON.parse`. The statement `if (e.type !== \"message\") continue;` skips entries that are not messages, such as the header (`continue` jumps to the next line; `!==` means 'is not equal to'). For assistant messages it loops over the content blocks and prints `CALL` or `SAY`; for tool results it prints `RESULT`.\n\nRun it with `node trace.ts sample.jsonl`. Node.js 26 runs `.ts` files directly because of type stripping (topic 02), so no compile step is needed.",
      "analogy": "It is like replaying a chess game move by move with commentary. You do not only list the moves; for each one you say why it was played, what it changed and what the opponent did in reply. The script gives you the move list, and you add the commentary.",
      "code": [
        {
          "language": "typescript",
          "filename": "trace.ts",
          "source": "import { readFileSync } from \"node:fs\";\n\nconst file = process.argv[2];\nconst lines = readFileSync(file, \"utf8\")\n  .split(\"\\n\")\n  .map((l) => l.replace(/\\r$/, \"\"))\n  .filter(Boolean);\n\nfor (const line of lines) {\n  const e = JSON.parse(line);\n  if (e.type !== \"message\") continue;\n  const m = e.message;\n  if (m.role === \"assistant\") {\n    for (const b of m.content) {\n      if (b.type === \"toolCall\") console.log(`CALL ${b.name} ${JSON.stringify(b.arguments)}`);\n      if (b.type === \"text\") console.log(`SAY  ${b.text}`);\n    }\n  }\n  if (m.role === \"toolResult\") console.log(`RESULT ${m.toolName} error=${m.isError}`);\n}",
          "output": "CALL read {\"path\":\"src/math.ts\"}\nRESULT read error=false\nSAY  divide throws when b is 0.",
          "explanation": "Run `node trace.ts sample.jsonl` from `~/pi-lab/traces`. The header (line 1) and the user message (line 2) print nothing: line 1 is not a message, and line 2 has role `user`, which the script does not handle. Line 3 prints the CALL, line 4 prints the RESULT and line 5 prints the SAY. The same script works on a real session file by passing its path instead."
        }
      ],
      "productionNote": "Checkpoint for week 1: ask Pi to do a small refactor in `pi-lab`, then run `trace.ts` on the new session file and write one line of commentary for every tool, covering why, arguments, result and next step. If you can do this, you can explain a full Pi trace tool by tool.",
      "commonMistakes": [
        "Forgetting that the file has non-message lines, such as the header. Calling `e.message.role` on them fails with a `TypeError` (an error raised when a value is used in a way its type does not allow, here reading a field of nothing). Check `e.type` first.",
        "Not stripping `\\r`. A Windows file can end each line with `\\r\\n`; if you split only on `\\n`, a stray `\\r` can remain at the end of a line, so trim it before parsing.",
        "Assuming `content` is always a list of blocks. In the user message of the sample it is a plain string, so only loop over `content` for assistant messages, as the script does."
      ],
      "sources": [
        {
          "title": "Pi docs: session format, parsing example",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/session-format.md#parsing-example"
        },
        {
          "title": "Node.js docs: fs.readFileSync",
          "url": "https://nodejs.org/docs/latest-v26.x/api/fs.html#fsreadfilesyncpath-options"
        }
      ]
    },
    {
      "id": "asking-why",
      "title": "Asking Pi why it chose a tool",
      "explanation": "A trace tells you what happened. To learn why, you can simply ask. After a run, send a follow-up such as: `Why did you call bash instead of read for that step?` The model answers in plain language.\n\nTreat that answer as a post-hoc explanation: an account written after the fact. The model reads the conversation history again and builds a plausible reason. It is not a recording of its internal computation, so it can be wrong or tidier than reality.\n\nGood practice is to compare the answer with other evidence. Look at the thinking blocks if the model produced them (Ctrl+T shows them), at the text it wrote before the call, and at the tool descriptions it was given. If the answer says 'the description of read did not mention searching', check whether that is true.\n\nThen use what you learn. If the model chose the wrong tool because two descriptions overlapped or one was vague, fix the description or your prompt and run the same task again. You will practise this in topic 09.",
      "analogy": "It is like asking a footballer after the match why they passed left. The answer is useful and often insightful, but it is a reconstruction from memory, shaped by what they now know. You would still check the video.",
      "code": [
        {
          "language": "text",
          "filename": "why-drill.txt",
          "source": "Find where divide is defined\nWhy bash and not read?",
          "output": "(second reply, illustrative) I needed to search across files first, and I did not yet know which file held divide. read needs a path.",
          "explanation": "Run these two messages in `pi-lab`, one after the other. For the first, the model may use `bash` with `grep` (a search through files) instead of `read`; it varies by model. The reply to the second is a sample: yours will differ. Write down the reason it gives, then check it against the trace from `trace.ts` and the thinking blocks."
        }
      ],
      "productionNote": "Make this a daily drill: after any surprising run, ask why, note the answer, then check it against the trace. Collect the patterns, such as 'it picks bash when the file name is unknown', and turn them into clearer tool descriptions and prompts.",
      "commonMistakes": [
        "Treating the explanation as ground truth. It is a reasonable guess generated after the fact, so verify it against the actual trace.",
        "Asking why but not changing anything. The value comes from editing a prompt or tool description and re-running the same task to see if behaviour improves.",
        "Asking in a long-finished session where the context has been compacted. The model may no longer have the details and can invent reasons."
      ],
      "sources": [
        {
          "title": "Anthropic docs: extended thinking",
          "url": "https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking"
        },
        {
          "title": "Pi docs: usage",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/usage.md"
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "In a Pi session file, which field links a toolResult message to the tool call it answers?",
      "options": [
        "parentId",
        "timestamp",
        "toolCallId",
        "usage"
      ],
      "answerIndex": 2,
      "explanation": "toolCallId in the result equals the id of the toolCall block. parentId links entries in the session tree (the entry before), not a call to its result."
    },
    {
      "question": "What is the difference between `pi -p \"msg\"` and `pi --mode json \"msg\"`?",
      "options": [
        "-p prints only the final answer and exits; --mode json prints a stream of JSON events, one per line, and exits",
        "-p saves a session file; --mode json never does",
        "-p runs without a model; --mode json calls the model",
        "They are identical; --mode json is just the long spelling of -p"
      ],
      "answerIndex": 0,
      "explanation": "-p is for getting one answer into a script. --mode json emits the whole event stream (agent_start, tool_execution_end and so on) for programs to parse."
    },
    {
      "question": "Where does the /debug command write pi-debug.log?",
      "options": [
        "In the project folder where you launched Pi",
        "In your Downloads folder",
        "Inside the sessions folder next to each .jsonl file",
        "In Pi's agent folder, ~/.pi/agent/"
      ],
      "answerIndex": 3,
      "explanation": "/debug writes pi-debug.log to the agent folder ~/.pi/agent/. It is a log about Pi itself, not about one session."
    },
    {
      "question": "Why does a trace reader script strip a trailing \\r from each line before calling JSON.parse?",
      "options": [
        "Because \\r makes the file JSONL instead of JSON",
        "Because Windows files can end lines with \\r\\n, and splitting only on \\n would leave a stray \\r",
        "Because JSON.parse only accepts lines shorter than 80 characters",
        "Because \\r marks the header line that must be skipped"
      ],
      "answerIndex": 1,
      "explanation": "Windows line endings are \\r\\n. Splitting on \\n leaves a \\r at the end of each line, so the script removes it before parsing."
    },
    {
      "question": "You ask Pi \"Why did you call bash instead of read?\" and get a clear reason. How should you treat it?",
      "options": [
        "As an exact recording of the model's internal reasoning",
        "As proof that the tool description is wrong",
        "As a plausible after-the-fact explanation to check against the trace, thinking blocks and tool descriptions",
        "As useless, since the model can never answer questions about its own runs"
      ],
      "answerIndex": 2,
      "explanation": "The explanation is rebuilt from the conversation history after the fact. It is useful evidence for improving prompts and descriptions, but it is not a true record of internal reasoning."
    }
  ]
});
