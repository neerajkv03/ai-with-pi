window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "14-agent-memory",
  "order": 14,
  "title": "Agent Memory",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "An agent forgets everything when a session ends, and even inside one session old messages get squeezed out when the context window fills up. In this topic you learn how Pi compacts a long session (short-term memory), then build a Pi extension with `remember` and `recall` tools that store facts in a JSONL file (long-term memory). You also learn what is worth remembering and how to keep memory inside a token budget.",
  "prerequisites": ["13-retrieval-skill"],
  "subtopics": [
    {
      "id": "short-term-memory-compaction",
      "title": "Short-term memory: session context and compaction",
      "explanation": "Short-term memory is everything the model can see right now. In Pi that is the messages on the active session branch (the current path through the session's tree of entries). All of them are sent to the model on every turn. Because of the context window limit you met in the LLM fundamentals topic, this memory is finite.\n\nWhen the conversation gets close to the limit, Pi compacts it automatically. Compaction means: keep the most recent messages word for word, and replace the older ones with a short summary written by the model. Pi triggers it when `contextTokens > contextWindow - reserveTokens`. Here `contextTokens` is how many tokens the conversation currently uses, `contextWindow` is the model's maximum, and `reserveTokens` is head-room kept free for the next reply.\n\nTwo settings control this. `compaction.reserveTokens` defaults to 16384. `compaction.keepRecentTokens` defaults to 20000, which is roughly how much recent conversation is kept unsummarised. You can change both in Pi's settings file, `settings.json` (see the Pi settings docs in the sources below).\n\nThe summary is stored in the session file as a `CompactionEntry` (one new line of the session JSONL file that holds the summary). The original messages are not deleted from the file, they just stop being sent to the model. You can also compact by hand with `/compact`, optionally followed by instructions such as `/compact focus on the file names we changed`.\n\nTwo related commands: `/new` starts a completely fresh session with an empty context, and `/tree` lets you jump back to an earlier point and continue from there as a new branch. Use `/new` between unrelated tasks so old, irrelevant messages do not take up space or distract the model.\n\nThe example below does the trigger arithmetic. New syntax in it: `200_000` is just 200000 (underscores make long numbers readable). `for (const used of [...])` is a loop that runs its body once for each item of the array, with `used` holding the current item. `condition ? \"compact\" : \"ok\"` is a ternary: it gives the first value when the condition is true and the second when it is false.",
      "analogy": "Meeting minutes. After a very long meeting, the early discussion is condensed into one summary paragraph, while the last few minutes stay word for word. You keep the gist of everything, but you lose small details from the early part. The original recording (the session file) still exists if you need it.",
      "code": [
        {
          "language": "typescript",
          "filename": "should-compact.ts",
          "source": "const contextWindow = 200_000;\nconst reserve = 16_384;\n\nfor (const used of [150_000, 190_000]) {\n  console.log(used, used > contextWindow - reserve ? \"compact\" : \"ok\");\n}\n",
          "output": "150000 ok\n190000 compact",
          "explanation": "The limit is 200000 - 16384 = 183616 tokens. 150000 is below it, so nothing happens. 190000 is above it, so Pi would compact. Run it with `node should-compact.ts`."
        }
      ],
      "productionNote": "Compaction is what lets long agent tasks run past a single context window. Plan for it: put anything the agent must never lose (rules, conventions) in AGENTS.md, which is re-sent every turn, rather than trusting it to survive inside a summary.",
      "commonMistakes": [
        "Expecting perfect recall after compaction. A summary is lossy: exact numbers, file names and wording from old messages may be gone. Re-state important details or store them in a file.",
        "Never using `/new` between unrelated tasks. Leftover messages from the old task waste tokens and can steer the model wrongly."
      ],
      "sources": [
        { "title": "Pi docs: compaction", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/compaction.md" },
        { "title": "Pi docs: settings", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/settings.md" }
      ]
    },
    {
      "id": "long-term-memory-files",
      "title": "Long-term memory in files",
      "explanation": "Long-term memory is anything that survives after the session ends. The simplest forms are files. `AGENTS.md` (from the prompts topic) holds rules you write by hand. A memory file holds facts the agent collects over time. A bigger option is a vector store (the embedding index from earlier topics), but this topic sticks to plain files. Embedding-based recall is an optional upgrade you could add later.\n\nA good format for a memory file is JSONL, which you already know from session files: one JSON object per line. Each memory is one line shaped like `{ \"date\", \"text\", \"tags\" }`. Adding a memory means appending one line to the end, never rewriting the file. Appending is safe and simple, the file is human-readable, and `git diff` shows exactly what was added.\n\nNode's `appendFile(path, data)` (from `node:fs/promises`) adds text to the end of a file and creates the file if it does not exist. To read it back, `readFile(path, \"utf8\")` returns the whole text. `.trim()` removes the blank space at the ends, and `.split(\"\\n\")` cuts the text into an array of lines, using `\\n`, the newline character.\n\nThe example first deletes any old file with `rm(path, { force: true })` (`force` means: do not complain if it is missing). That makes the printed result the same on every run.\n\nNever store secrets such as API keys or passwords in a memory file. It is plain text, it may be committed to git, and its contents are sent to the model provider whenever they are recalled.",
      "analogy": "A notebook you keep between meetings versus the whiteboard that is wiped every day. The whiteboard (session context) is fast to use but temporary. The notebook (the memory file) is where you write things you want to find next week.",
      "code": [
        {
          "language": "typescript",
          "filename": "memory-file.ts",
          "source": "import { appendFile, readFile, rm } from \"node:fs/promises\";\n\nawait rm(\"mem.jsonl\", { force: true });\n\nawait appendFile(\"mem.jsonl\", JSON.stringify({ date: \"2026-11-20\", text: \"Project uses node:test\", tags: [\"testing\"] }) + \"\\n\");\nawait appendFile(\"mem.jsonl\", JSON.stringify({ date: \"2026-11-21\", text: \"User prefers PowerShell examples\", tags: [\"prefs\"] }) + \"\\n\");\n\nconst lines = (await readFile(\"mem.jsonl\", \"utf8\")).trim().split(\"\\n\");\nconsole.log(lines.length, JSON.parse(lines[1]).text);\n",
          "output": "2 User prefers PowerShell examples",
          "explanation": "Each call to `appendFile` writes one JSON line ending in a newline. Reading the file back gives 2 lines; `lines[1]` is the second line (arrays count from 0), which `JSON.parse` turns back into an object."
        }
      ],
      "productionNote": "Typical uses are per-project preferences and a decisions log (what was decided and why). Because it is plain JSONL in the project, teammates can review it in a pull request (a proposed change that others review before it is merged).",
      "commonMistakes": [
        "Storing everything the agent sees. The file grows, recall gets noisy and every recalled line costs tokens.",
        "Writing secrets (API keys, passwords, tokens) into the file."
      ],
      "sources": [
        { "title": "Node.js docs: fsPromises.appendFile", "url": "https://nodejs.org/docs/latest-v26.x/api/fs.html#fspromisesappendfilepath-data-options" }
      ]
    },
    {
      "id": "remember-recall-tool",
      "title": "A remember/recall tool",
      "explanation": "Now we give the agent two tools. `remember` takes `{ text, tags? }` and appends one line to `.pi/memory.jsonl`. `recall` takes `{ query, limit? }` and returns up to `limit` matching memories (default 5), newest first. A memory matches when its text or tags contain any word of the query, ignoring upper/lower case. This is plain keyword matching. It will not find a memory that uses different words for the same idea; that is where embeddings would help later.\n\nWe start with the matching logic alone, as a plain function you can run. It cuts the query into words with `split(/\\s+/)` (the pattern `\\s+` means one or more whitespace characters), drops words of 2 letters or fewer with `filter`, and keeps memories where `some` word is found with `includes` in the lowercase text or in the tags. `reverse()` puts the newest (last-appended) first and `slice(0, limit)` caps the count. Note that \"shell\" matches \"PowerShell\" because `includes` checks for a substring.\n\nThe second block is the real extension. Save it as `~/pi-lab/.pi/extensions/memory.ts` and run `/reload` in Pi (the project must be trusted, as in the first-extension topic). Points to notice:\n\n- The file path is built from `ctx.cwd` (the folder Pi was started in), so every project gets its own memory.\n- `maxLength: 300` in the schema limits one memory to 300 characters, so the file cannot explode through one huge entry. `??` means \"use the right side if the left side is null or undefined\".\n- Pi may run several tool calls at the same time. `withFileMutationQueue(path, fn)` makes calls that touch the same file run one after another, so two simultaneous `remember` calls cannot corrupt each other's write.\n- `promptGuidelines` adds rules to the system prompt telling the model when to use each tool.",
      "analogy": "A personal assistant with a card box. You say \"note this down\" and the assistant files a card (remember). Later you ask \"what do we know about shells?\" and the assistant pulls out the matching cards, newest on top (recall). The box has a rule: one short card per fact.",
      "code": [
        {
          "language": "typescript",
          "filename": "match.ts",
          "source": "type Mem = { date: string; text: string; tags: string[] };\n\nexport function match(mems: Mem[], query: string, limit = 5): Mem[] {\n  const words = query.toLowerCase().split(/\\s+/).filter((w) => w.length > 2);\n  return mems\n    .filter((m) => words.some((w) => m.text.toLowerCase().includes(w) || m.tags.includes(w)))\n    .reverse()\n    .slice(0, limit);\n}\n\nconst mems = [\n  { date: \"2026-11-20\", text: \"Project uses node:test\", tags: [\"testing\"] },\n  { date: \"2026-11-21\", text: \"User prefers PowerShell examples\", tags: [\"prefs\"] },\n];\nconsole.log(match(mems, \"which shell examples\").map((m) => m.text));\n",
          "output": "[ 'User prefers PowerShell examples' ]",
          "explanation": "The query words are \"which\", \"shell\" and \"examples\". The first memory contains none of them. The second contains \"shell\" (inside \"powershell\") and \"examples\", so only it matches."
        },
        {
          "language": "typescript",
          "filename": ".pi/extensions/memory.ts",
          "source": "import { appendFile, readFile } from \"node:fs/promises\";\nimport { join } from \"node:path\";\nimport { Type } from \"typebox\";\nimport { withFileMutationQueue, type ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\n\ntype Mem = { date: string; text: string; tags: string[] };\n\nfunction match(mems: Mem[], query: string, limit: number): Mem[] {\n  const words = query.toLowerCase().split(/\\s+/).filter((w) => w.length > 2);\n  return mems\n    .filter((m) => words.some((w) => m.text.toLowerCase().includes(w) || m.tags.includes(w)))\n    .reverse()\n    .slice(0, limit);\n}\n\nasync function load(file: string): Promise<Mem[]> {\n  try {\n    const raw = await readFile(file, \"utf8\");\n    return raw\n      .split(\"\\n\")\n      .filter((line) => line.trim() !== \"\")\n      .map((line) => JSON.parse(line) as Mem);\n  } catch {\n    return []; // no memory file yet\n  }\n}\n\nexport default function (pi: ExtensionAPI) {\n  pi.registerTool({\n    name: \"remember\",\n    label: \"Remember\",\n    description:\n      \"Save one durable fact the user stated (a preference, project convention or decision) to long-term memory. Maximum 300 characters. Never save secrets.\",\n    promptGuidelines: [\"Use remember only for durable facts the user states.\"],\n    parameters: Type.Object({\n      text: Type.String({ maxLength: 300, description: \"The fact to remember, one short sentence\" }),\n      tags: Type.Optional(Type.Array(Type.String(), { description: \"Lowercase keywords, e.g. prefs\" })),\n    }),\n    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {\n      const file = join(ctx.cwd, \".pi\", \"memory.jsonl\");\n      const entry: Mem = {\n        date: new Date().toISOString().slice(0, 10),\n        text: params.text,\n        tags: (params.tags ?? []).map((t) => t.toLowerCase()),\n      };\n      await withFileMutationQueue(file, async () => {\n        await appendFile(file, JSON.stringify(entry) + \"\\n\");\n      });\n      return { content: [{ type: \"text\", text: `Remembered: ${entry.text}` }], details: {} };\n    },\n  });\n\n  pi.registerTool({\n    name: \"recall\",\n    label: \"Recall\",\n    description:\n      \"Search long-term memory for saved facts matching the words of the query. Returns at most 5 entries by default, newest first.\",\n    promptGuidelines: [\"Use recall at the start of a task about user preferences.\"],\n    parameters: Type.Object({\n      query: Type.String({ minLength: 1, description: \"Words to look for, e.g. 'shell examples'\" }),\n      limit: Type.Optional(Type.Number({ minimum: 1, maximum: 10, description: \"Maximum entries, default 5\" })),\n    }),\n    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {\n      const file = join(ctx.cwd, \".pi\", \"memory.jsonl\");\n      const found = match(await load(file), params.query, params.limit ?? 5);\n      const text = found.length === 0\n        ? \"No matching memories.\"\n        : found.map((m) => `${m.date} ${m.text.slice(0, 300)}`).join(\"\\n\");\n      return { content: [{ type: \"text\", text }], details: {} };\n    },\n  });\n}\n",
          "output": "",
          "explanation": "The file prints nothing itself; Pi loads it when it starts or after `/reload`. After that, asking \"remember that I prefer PowerShell examples\" should make the model call `remember`, and a later session can call `recall` with \"shell examples\" to get that line back. `recall` returns \"No matching memories.\" rather than an error when nothing matches, so the model can continue."
        }
      ],
      "productionNote": "Assistants that improve over sessions rely on exactly this loop: write a small durable fact once, look it up later on demand. Keeping the size limit, the result limit and the file queue in place is what makes it safe to leave running.",
      "commonMistakes": [
        "No size limit on a memory, so the file and the recalled text grow without bound.",
        "A `recall` that returns every entry instead of the few that match, which defeats the point and fills the context."
      ],
      "sources": [
        { "title": "Pi docs: extensions, custom tools", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#custom-tools" },
        { "title": "Pi docs: extensions, state management", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#state-management" }
      ]
    },
    {
      "id": "what-to-remember",
      "title": "Deciding what is worth remembering",
      "explanation": "A memory tool is only as good as what goes into it. Remember facts that are durable (still true next week), reusable (useful in future tasks) and user-confirmed (the user actually said it). Good examples are preferences, project conventions, and decisions together with the reason for them.\n\nSkip transient task state (what you are editing right now), secrets, guesses, and anything already recorded in the code, in git history or in `AGENTS.md`. Duplicated facts can drift apart and contradict each other.\n\nAlso plan for forgetting. Wrong or outdated memories are harmful, so make them easy to remove: edit the JSONL file by hand (delete the line), or add a `/forget` command like the slash commands you built earlier.\n\nFinally, treat the memory file as untrusted input. Prompt injection is when text the agent reads (a web page, a file, a tool result) contains instructions that try to take over the model. If the agent saves such text as a \"memory\", the attack persists into every future session. This is called memory poisoning. Review the file from time to time, and only let `remember` store what the user stated.\n\nThe example is a checklist of six candidate facts with a verdict and a reason, printed one per line.",
      "analogy": "A family recipe book. You write down proven recipes that you will cook again and again, not today's shopping list and not a recipe you have only heard about. If a recipe turns out bad, you cross it out.",
      "code": [
        {
          "language": "typescript",
          "filename": "checklist.ts",
          "source": "const rows = [\n  { fact: \"tests use node:test\", verdict: \"keep\", reason: \"project convention\" },\n  { fact: \"API key is sk-...\", verdict: \"skip\", reason: \"secret\" },\n  { fact: \"currently editing math.ts\", verdict: \"skip\", reason: \"transient task state\" },\n  { fact: \"user prefers PowerShell examples\", verdict: \"keep\", reason: \"stated preference\" },\n  { fact: \"I think the bug is in divide()\", verdict: \"skip\", reason: \"a guess\" },\n  { fact: \"we chose JSONL because it is diffable\", verdict: \"keep\", reason: \"decision and why\" },\n];\n\nfor (const row of rows) {\n  console.log(`${row.verdict}: ${row.fact} (${row.reason})`);\n}\n",
          "output": "keep: tests use node:test (project convention)\nskip: API key is sk-... (secret)\nskip: currently editing math.ts (transient task state)\nkeep: user prefers PowerShell examples (stated preference)\nskip: I think the bug is in divide() (a guess)\nkeep: we chose JSONL because it is diffable (decision and why)",
          "explanation": "Each row is an object with three fields; the loop prints them with a template literal. Use the same six questions when you review what an agent saved: is it durable, reusable, confirmed, non-secret, not a guess and not already written elsewhere?"
        }
      ],
      "productionNote": "Memory hygiene keeps an agent accurate over months. Review the memory file in the same way you review code, and keep it small.",
      "commonMistakes": [
        "Auto-remembering something from every turn. The file fills with noise and trivia.",
        "Trusting stored memories blindly. They may be outdated, wrong or planted by injected text."
      ],
      "sources": [
        { "title": "Pi docs: security", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/security.md" }
      ]
    },
    {
      "id": "context-budget",
      "title": "Context budget",
      "explanation": "Every memory you put into the context costs tokens on every turn, and a bloated context raises cost and lowers answer quality. So give memory a budget. A sensible rule for this course: recall at most 5 items, each at most 300 characters. That is at most 1500 characters, roughly 375 tokens, using the common rule of thumb that one token is about 4 characters of English.\n\nThe cheapest way to respect the budget is on-demand injection: memory enters the context only when the model calls `recall`, not on every prompt. That is what the tools in the previous sub-topic do.\n\nTo see where you stand, an extension can call `ctx.getContextUsage()`. It returns information about the active model's context, including `tokens` (how many tokens the conversation uses now). It can be missing before the first model reply, so the code below handles that with `?.` and `??`. This example is a slash command; save it as `.pi/extensions/ctx-usage.ts` and run `/reload`.\n\nThere is an alternative: the `before_agent_start` event (fired before the agent starts working on a prompt) lets an extension return a `message` that is added to the context, for instance a short \"Known preferences\" note. The tradeoff is clear. Injection is automatic, so the model always knows your preferences without having to decide to call `recall`. But you pay for those tokens on every prompt, relevant or not. For a handful of short, always-useful lines it is reasonable. For anything larger, prefer the `recall` tool.\n\nThe standalone example estimates tokens for three 300-character memories using characters divided by 4 (a rough estimate, not the model's real tokeniser).",
      "analogy": "A suitcase weight limit. Everything you pack is carried the whole trip, so you pack only what you will actually wear. Memory in the context is the same: carried on every turn, so bring only the few items needed.",
      "code": [
        {
          "language": "typescript",
          "filename": "budget.ts",
          "source": "const items = [\"a\".repeat(300), \"b\".repeat(300), \"c\".repeat(300)];\nconst tokens = Math.ceil(items.join(\"\\n\").length / 4);\nconsole.log(tokens);\n",
          "output": "226",
          "explanation": "`\"a\".repeat(300)` makes a string of 300 letters. Joining three of them with a newline gives 900 + 2 = 902 characters. 902 / 4 = 225.5, and `Math.ceil` rounds up to 226 tokens."
        },
        {
          "language": "typescript",
          "filename": ".pi/extensions/ctx-usage.ts",
          "source": "import type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\n\nexport default function (pi: ExtensionAPI) {\n  pi.registerCommand(\"ctx\", {\n    description: \"Show how many tokens the current context uses\",\n    handler: async (_args, ctx) => {\n      const usage = ctx.getContextUsage();\n      ctx.ui.notify(`Context tokens: ${usage?.tokens ?? \"unknown\"}`, \"info\");\n    },\n  });\n}\n",
          "output": "",
          "explanation": "After `/reload`, typing `/ctx` shows a notification with the current token count (or `unknown` if there is no data yet). The number depends on your session, so it is not shown here."
        }
      ],
      "productionNote": "Cost and quality both fall when context bloats, because you pay for every token each turn and the model has more irrelevant text to wade through. Cap what memory can add, and measure with `ctx.getContextUsage()` instead of guessing.",
      "commonMistakes": [
        "Injecting the whole memory file into every turn. Cost grows with the file, and most of it is irrelevant to the current task."
      ],
      "sources": [
        { "title": "Pi docs: extensions, ctx.getContextUsage", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#ctxgetcontextusage" },
        { "title": "Pi docs: extensions, before_agent_start", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#before_agent_start" }
      ]
    }
  ],
  "quiz": [
    {
      "question": "When does Pi automatically compact a session?",
      "options": [
        "Every time the user sends a new message",
        "When the tokens in use exceed the context window minus the reserve (`reserveTokens`)",
        "Only when the user types `/compact`",
        "When the session file grows larger than 1 MB"
      ],
      "answerIndex": 1,
      "explanation": "Auto-compaction triggers when `contextTokens > contextWindow - reserveTokens`. `/compact` is the manual way, and neither message count nor file size is the trigger."
    },
    {
      "question": "What is the difference between short-term and long-term memory for an agent?",
      "options": [
        "Short-term memory is stored in a file, long-term memory is held in the model's weights",
        "Short-term memory is for secrets, long-term memory is for public facts",
        "Short-term memory is the messages in the current session context; long-term memory is stored outside it, such as in a file, and survives new sessions",
        "There is no difference; both are the same list of messages"
      ],
      "answerIndex": 2,
      "explanation": "The session context is sent every turn and is limited by the context window. Long-term memory lives in files (or a vector store) and survives `/new` and restarts."
    },
    {
      "question": "Why does `remember` wrap its write in `withFileMutationQueue`?",
      "options": [
        "Pi can run tool calls in parallel, and the queue makes writes to the same file happen one after another",
        "It encrypts the memory file so secrets are safe",
        "It makes the model call `remember` more often",
        "It converts the file from JSONL to JSON"
      ],
      "answerIndex": 0,
      "explanation": "Parallel tool calls could write to the same file at the same moment. The queue serialises them so entries do not get mixed up or lost. It does no encryption and does not influence the model."
    },
    {
      "question": "A user pastes `API key is sk-...` into the chat. Should the agent remember it?",
      "options": [
        "Yes, it is a durable fact the user stated",
        "Yes, but only with the tag `secret`",
        "Yes, as long as it is under 300 characters",
        "No, secrets must never go into a memory file because it is plain text and gets sent to the model when recalled"
      ],
      "answerIndex": 3,
      "explanation": "Secrets are always skipped. The file is readable plain text that may be committed to git, and recalled lines are sent to the provider. Tags and length do not make it safe."
    },
    {
      "question": "Why is on-demand recall usually better than injecting the whole memory file into every prompt?",
      "options": [
        "Because the model cannot read files at all",
        "Because only the relevant few entries enter the context, which saves tokens on every turn and keeps the context focused",
        "Because injected text is ignored by the model",
        "Because it makes compaction unnecessary"
      ],
      "answerIndex": 1,
      "explanation": "Injected memory is paid for on every turn whether relevant or not. A `recall` call adds only matching entries, within a small budget. Injected text is not ignored, and compaction is still needed for long sessions."
    }
  ]
});
