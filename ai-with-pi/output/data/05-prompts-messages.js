window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "05-prompts-messages",
  "order": 5,
  "title": "Prompts & Messages",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "A prompt is the text you send to a language model, and a conversation is a list of messages, each with a role. In this topic you learn the four roles, how to write precise prompts, how to ask for JSON and check it in TypeScript, how to give Pi standing instructions with AGENTS.md, and how the thinking level trades answer quality against cost.",
  "prerequisites": ["04-llm-fundamentals"],
  "subtopics": [
    {
      "id": "message-roles",
      "title": "System vs user vs assistant messages",
      "explanation": "A chat model does not receive one block of text. It receives a list of messages, and every message has a role: a label that says who is speaking. There are four roles you need to know.\n\nsystem: the standing rules set by the harness (the program around the model, here Pi). The system message is sent at the start of every request. It says things like \"you are a coding assistant, these tools exist, answer briefly\".\n\nuser: your request, the text you type into Pi.\n\nassistant: the model's replies. An assistant message can contain plain text, and it can also contain tool calls, which are requests such as \"please read this file\". Tool calls are explained properly in the next topic.\n\ntoolResult: the output that Pi sends back after it has run a tool the model asked for. The model never runs tools itself. It asks, Pi runs the tool, and Pi reports the result in a toolResult message.\n\nPi builds its system prompt (the text of the system message) from several parts: its base instructions, any context files you wrote (see the AGENTS.md sub-topic below), the list of available tools, and short descriptions of installed skills (packaged instruction sets that Pi loads on demand; topic 13).\n\nTwo facts matter in daily use. First, the model has no memory of its own between requests: every request re-sends the whole message list, and that list is the only thing the model knows about the conversation. Second, a new Pi session starts with an empty list, so the model does not remember earlier sessions.\n\nThe example below is plain data and needs no API key. Before running it, set up the lab file that later topics reuse. Open a terminal, run `cd ~/pi-lab`, run `mkdir src` (skip this if the folder exists), and create `src/math.ts` in any editor with the contents of the first code block. Then save it in git with `git add . && git commit -m \"add math.ts\"`. Finally create `messages.ts` in `~/pi-lab` and run it with `node messages.ts`.",
      "analogy": "Think of a theatre show. The system message is the director's notes pinned backstage before the show: they apply to the whole performance. The user message is a question shouted from the audience. The assistant message is the actor's reply on stage. A tool result is a stagehand walking on with the prop the actor asked for. And the actor remembers only the script pages in front of them: when the show ends and a new one begins, the pages are gone.",
      "code": [
        {
          "language": "typescript",
          "filename": "src/math.ts",
          "source": "export function add(a: number, b: number): number {\n  return a + b;\n}\n\nexport function divide(a: number, b: number): number {\n  if (b === 0) throw new Error(\"Cannot divide by zero\");\n  return a / b;\n}\n",
          "output": "",
          "explanation": "The lab file used by later topics. It exports two functions: add returns the sum, and divide throws an Error (a built-in error value) when the divisor b is 0. Nothing is printed because the file only defines functions."
        },
        {
          "language": "typescript",
          "filename": "messages.ts",
          "source": "type Msg = { role: \"system\" | \"user\" | \"assistant\"; content: string };\n\nconst convo: Msg[] = [\n  { role: \"system\", content: \"You are a terse coding assistant.\" },\n  { role: \"user\", content: \"What does divide do?\" },\n  { role: \"assistant\", content: \"Divides a by b; throws on b = 0.\" },\n];\n\n// A for...of loop runs its body once for each item in the array.\nfor (const m of convo) {\n  console.log(`${m.role}: ${m.content}`);\n}\n",
          "output": "system: You are a terse coding assistant.\nuser: What does divide do?\nassistant: Divides a by b; throws on b = 0.",
          "explanation": "A conversation is an array of objects, each with a role and some content. Msg is a type alias whose role field only accepts three literal strings. The for...of loop prints every message in order. A real Pi conversation has the same shape, plus the toolResult role and richer content for tool calls."
        }
      ],
      "productionNote": "When something goes wrong with an agent, you debug by reading the message list it actually received. Topic 07 shows how to read Pi's saved sessions, and what you see there is exactly these roles in order. Knowing which role a piece of text sits in tells you who put it there: you, Pi, the model, or a tool.",
      "commonMistakes": [
        "Repeating standing rules (\"always use TypeScript, never use enums\") in every user message. Standing rules belong in the system prompt, which for Pi means a context file such as AGENTS.md (see below).",
        "Believing the model remembers earlier sessions. It only sees the messages sent in the current request, so anything it needs must be in the current session or in a file Pi loads.",
        "Thinking the model runs tools. It only asks for them in an assistant message, and Pi runs them and returns a toolResult message."
      ],
      "sources": [
        { "title": "Pi docs: message types", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/message-types.md" },
        { "title": "Pi docs: how Pi works (context)", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/how-pi-works.md#context" }
      ]
    },
    {
      "id": "prompt-patterns",
      "title": "Prompt patterns (role, constraints, examples)",
      "explanation": "A prompt is the text you give the model. Vague prompts get vague results, and with an agent that can edit files, a vague result means unwanted changes. A good prompt usually has these parts:\n\nRole or goal: who the model should act as and what job it must do.\n\nContext: the facts it needs, such as which file to look at.\n\nConstraints: rules on format, length and scope, including what it must not do (\"change nothing else\").\n\nExamples: one or two samples of the output you want. Giving examples inside the prompt is called few-shot prompting (\"shot\" means example).\n\nSuccess criteria: how you will judge that the job is done.\n\nYou do not need every part every time. A small edit needs a goal, a file and a constraint. The rule is that specific beats vague.\n\nTry it in the lab. Start Pi in `~/pi-lab` with `pi`. First send the vague prompt `fix math` and see what Pi decides to change. Undo whatever it did by running `git restore .` in the terminal (git restore, taught in topic 01, throws away uncommitted edits to tracked files). Then send the precise prompt from the example below.\n\nAfter the precise prompt, check the result with `git diff --stat`. The `--stat` flag prints a one-line summary per changed file instead of every changed line. A precise prompt usually produces one small, targeted change. The exact output is a sample and varies between runs and models.",
      "analogy": "Briefing a new contractor. You tell them who they are for this job (role), which room to work on (context), the site rules such as no drilling after 6pm (constraints), and you show a photo of a finished result (example). Without that briefing they guess, and they may repaint the hallway as well.",
      "code": [
        {
          "language": "text",
          "filename": "prompt.txt",
          "source": "In src/math.ts, add a one-line JSDoc comment above the divide function that says it throws an Error when b is 0. Do not change any code. Do not edit any other file.",
          "output": "",
          "explanation": "A JSDoc comment is a comment written as /** ... */ above a function to document it. The prompt names the file, the function and the exact change, and ends with two constraints. Paste it into Pi as a single message."
        },
        {
          "language": "bash",
          "filename": "check-diff.sh",
          "source": "git diff --stat",
          "output": " src/math.ts | 1 +\n 1 file changed, 1 insertion(+)",
          "explanation": "Sample output after the precise prompt: exactly one file, one added line. If you see other files or deletions, the constraints were not strong enough or the model ignored them, and you can undo with git restore ."
        }
      ],
      "productionNote": "Prompts you reuse should be saved, not retyped. Pi's prompt templates (topic 10) and skills (topic 13) are saved prompts: a template is a stored message you can fill in, and a skill is a stored set of instructions Pi loads when relevant. Writing precise prompts now is the skill that makes those useful.",
      "commonMistakes": [
        "Giving no constraints, so the agent edits extra files or reformats code you did not mention. Always say what must not change.",
        "Giving contradictory instructions, for example \"keep it very short\" and \"explain every step in detail\". The model picks one at random. Reread your prompt for conflicts before sending.",
        "Not checking the result. After an edit, always look at git diff (or git diff --stat) before you commit."
      ],
      "sources": [
        { "title": "Anthropic: prompt engineering overview", "url": "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview" },
        { "title": "OpenAI: prompt engineering guide", "url": "https://platform.openai.com/docs/guides/prompt-engineering" }
      ]
    },
    {
      "id": "structured-output",
      "title": "Structured output (JSON)",
      "explanation": "When your own code needs to use the model's answer, free text is hard to process. Structured output means asking the model to reply in a fixed format, usually JSON (the text format for data you used in topic 03), with an exact shape: which fields exist and what type each has.\n\nA good request says: reply ONLY with JSON, and gives the shape, for example {\"file\": string, \"functions\": string[]}. Pi can run a single prompt without the interactive screen: `pi -p \"...\"` (long form `--print`) prints the final answer text and exits. That makes it easy to feed Pi's answer to a script.\n\nThe model can still break the rules, so your code must defend itself in three steps.\n\nStep 1: strip code fences: models often wrap JSON in ``` lines (a code fence), which `JSON.parse` cannot read. \n\nStep 2: parse with `JSON.parse`, which throws a SyntaxError (an error meaning the text is not valid JSON) if the text is not valid JSON.\n\nStep 3: validate: check that every field you need exists and has the right type, because a correct parse does not mean the right shape.\n\nIf any step fails, retry by asking the model again, usually with the error message included.\n\nThe first example removes the fences with a regular expression: a compact pattern for matching text, written between slashes. In `/^```(json)?\\n?|\\n?```$/g`, the `^` means the start of the text, `$` the end, `?` means optional, `|` means or, and `g` means replace every match. It deletes an opening fence (with or without the word json) and a closing fence. The `as { ... }` part is a type assertion: it tells TypeScript to treat the parsed value as that shape, but it checks nothing at run time, which is why the `typeof` checks below it are needed. Run it with `node parse-review.ts`.",
      "analogy": "A printed form versus a letter. If you ask a clerk for a letter, you have to read it and hunt for the facts. If you hand over a form with labelled boxes, you can check each box quickly, and an empty or wrong box is obvious. Your validation code is you checking every box before you accept the form.",
      "code": [
        {
          "language": "typescript",
          "filename": "parse-review.ts",
          "source": "const raw = '```json\\n{\"file\":\"src/math.ts\",\"issues\":1}\\n```';\n\n// Remove an opening fence (``` or ```json) and a closing fence.\nconst cleaned = raw.replace(/^```(json)?\\n?|\\n?```$/g, \"\");\n\nconst data = JSON.parse(cleaned) as { file: string; issues: number };\n\nif (typeof data.file !== \"string\" || typeof data.issues !== \"number\") {\n  throw new Error(\"bad shape\");\n}\n\nconsole.log(data.file, data.issues);\n",
          "output": "src/math.ts 1",
          "explanation": "raw simulates a model reply wrapped in a fence. The replace call strips both fences, JSON.parse turns the remaining text into an object, and the typeof checks confirm both fields have the expected types before the values are used."
        },
        {
          "language": "typescript",
          "filename": "bad-parse.ts",
          "source": "const text = 'Sure! Here is the JSON: {\"issues\":1}';\n\ntry {\n  JSON.parse(text);\n  console.log(\"parsed\");\n} catch {\n  console.log(\"not valid JSON, ask the model again\");\n}\n",
          "output": "not valid JSON, ask the model again",
          "explanation": "Prose around the JSON makes JSON.parse throw. Catching the error lets your program retry instead of crashing. The catch clause has no name for the error because this code does not need it."
        },
        {
          "language": "bash",
          "filename": "ask-json.sh",
          "source": "pi -p 'Reply ONLY with JSON {\"file\": string, \"functions\": string[]} for src/math.ts'",
          "output": "{\"file\":\"src/math.ts\",\"functions\":[\"add\",\"divide\"]}",
          "explanation": "Run this in ~/pi-lab with Git Bash (the single quotes protect the inner double quotes). The output is a sample: the exact text varies between runs and models, and it may arrive wrapped in a fence, which is why you strip and validate it."
        }
      ],
      "productionNote": "Structured output is how an agent's result becomes something a program can use. Later in the course the code-review agent returns its findings as JSON (topic 22) and the evaluation harness scores answers automatically (topic 18). The code-review agent also gets its findings through a tool whose parameters are a schema (topic 22), but the defensive parse-and-validate habit stays useful everywhere.",
      "commonMistakes": [
        "Trusting the output without validation. Valid JSON can still have a missing field or a string where you expected a number.",
        "Calling JSON.parse on text that has prose or code fences around the JSON. Strip fences first, and ask for JSON only.",
        "Treating a type assertion (as { ... }) as a check. It only silences the compiler, so you still need run-time checks."
      ],
      "sources": [
        { "title": "MDN: JSON.parse()", "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse" },
        { "title": "Pi docs: CLI invocation and output", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md#invocation-and-output" }
      ]
    },
    {
      "id": "context-files",
      "title": "AGENTS.md, SYSTEM.md & APPEND_SYSTEM.md",
      "explanation": "Instead of retyping your rules in every prompt, put them in a context file: a file Pi reads automatically and adds to the system prompt. The main one is AGENTS.md, a plain Markdown file (plain text where `#` starts a heading and `-` starts a bullet) of project instructions. Pi also accepts CLAUDE.md as the same kind of file.\n\nPi loads these files at the start of every session from three places: the agent directory (the folder holding Pi's own settings, `~/.pi/agent` by default), the current working directory, and the parent folders above it. This means you can keep personal rules in the agent directory and project rules inside each project. If a folder contains `AGENTS.override.md`, that file replaces the AGENTS.md in that same folder.\n\nPi does not ask for trust before loading AGENTS.md. Project trust (glossed in topic 01) is the check that protects you from untrusted project settings, but it does not apply here. So if you clone someone else's repository and run Pi in it, their AGENTS.md is loaded and obeyed. Read it first and treat it as untrusted text.\n\nTwo other files change the system prompt more deeply. `SYSTEM.md` replaces Pi's default system prompt completely. `APPEND_SYSTEM.md` keeps the default and adds your text after it. Both can live in the agent directory (`~/.pi/agent/`) or in a project's `.pi/` folder, and the project versions only take effect after you trust the project. Prefer AGENTS.md for almost everything. Replacing the default prompt removes Pi's built-in guidance about its tools, so use SYSTEM.md rarely and only when you know why.\n\nTry it: create `~/pi-lab/AGENTS.md` with the content below, quit Pi if it is running, and start it again with `pi` in `~/pi-lab`. The startup header lists the context files that were loaded. Then ask `What are this repo's rules?`. The model should restate the three rules; its exact wording is a sample.",
      "analogy": "AGENTS.md is a set of house rules taped to the fridge: every visitor who walks in reads them before doing anything. SYSTEM.md is different: it is like tearing up the employee's whole contract and writing a new one, which is a big step and easy to get wrong. APPEND_SYSTEM.md is a short extra clause stapled to the existing contract.",
      "code": [
        {
          "language": "markdown",
          "filename": "AGENTS.md",
          "source": "# pi-lab rules\n- TypeScript only, no enums.\n- Run node --test before saying done.\n- Never edit files outside src/ and test/.\n",
          "output": "",
          "explanation": "Save this in ~/pi-lab. Each line is a short, checkable rule. The file prints nothing; its effect is visible in the next block."
        },
        {
          "language": "text",
          "filename": "pi-session.txt",
          "source": "> What are this repo's rules?",
          "output": "1. TypeScript only, and no enums.\n2. Run node --test before saying the work is done.\n3. Never edit files outside src/ and test/.",
          "explanation": "Typed inside interactive Pi after restarting. The reply is a sample: the wording varies, but all three rules should be restated because AGENTS.md was added to the system prompt."
        }
      ],
      "productionNote": "Team repositories keep their conventions (how to run tests, what style to use, which folders are off limits) in AGENTS.md so every teammate's Pi follows them. The code-review agent you build in topic 22 relies on exactly this to know a repository's conventions.",
      "commonMistakes": [
        "Writing a huge AGENTS.md. The whole file is sent with every request, so it uses up the context window and costs tokens each time. Keep it short and specific.",
        "Putting secrets such as API keys in AGENTS.md. Its text is sent to the model provider and it is often committed to git.",
        "Running Pi in a repository you do not trust without reading its AGENTS.md. It is loaded without any trust prompt.",
        "Reaching for SYSTEM.md when AGENTS.md would do. Replacing the default prompt removes Pi's own guidance."
      ],
      "sources": [
        { "title": "Pi docs: configuration", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/configuration.md" },
        { "title": "Pi docs: security (project trust)", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/security.md#understand-project-trust" }
      ]
    },
    {
      "id": "thinking-levels",
      "title": "Thinking levels",
      "explanation": "Some models are reasoning models: before they write the answer, they produce hidden reasoning text, called thinking, that works through the problem. Thinking is made of tokens (the units from topic 04), and thinking tokens are billed as output tokens, which cost more than input tokens.\n\nPi lets you choose how much the model thinks with a thinking level. The levels, from least to most, are off, minimal, low, medium, high, xhigh and max. The default is medium. Not every model supports every level, so Pi may map a level to the closest one the model offers.\n\nYou can change the level in three ways.\n\nInside Pi, type `/thinking` or press Shift+Tab to cycle through the levels.\n\nOn the command line, pass `--thinking <level>`, or attach the level to a model pattern like `--model <pattern>:high`.\n\nFor every session, set `defaultThinkingLevel` in your settings file `~/.pi/agent/settings.json`.\n\nPress Ctrl+T in Pi to show or hide the thinking blocks on screen.\n\nThe trade-off is simple. More thinking means more output tokens, so a higher cost and a slower answer. It helps on hard problems such as tricky bugs and multi-step logic. It wastes money on easy questions. The thinking text is also not part of the answer: it is a working area, so do not assume it is correct or that users should see it.\n\nTry the two commands below in `~/pi-lab`. Both should answer 391. To see the cost difference, run the same prompt in interactive Pi at two levels and compare the token counts that `/session` reports (the numbers are samples and vary).",
      "analogy": "Asking someone to think out loud on scrap paper before answering. For a hard puzzle, the scrap paper helps them get it right. For \"what is 2 + 2\" it only wastes their time and your money, because you pay for every line they write on that paper.",
      "code": [
        {
          "language": "bash",
          "filename": "thinking.sh",
          "source": "pi --thinking off -p \"What is 17*23?\"\npi --thinking high -p \"What is 17*23?\"",
          "output": "391\n391",
          "explanation": "Same question at two levels. Both give the same answer because it is easy, but the second run spends many more output tokens thinking first. The exact wording of the reply may differ; the number is 391."
        },
        {
          "language": "json",
          "filename": "settings.json",
          "source": "{\n  \"defaultThinkingLevel\": \"low\"\n}",
          "output": "",
          "explanation": "Saved as ~/.pi/agent/settings.json, this makes low the starting level for every new session. Restart Pi, or type `/reload` (it re-reads settings files) after editing a settings file by hand. You can still change the level per session with /thinking."
        }
      ],
      "productionNote": "Choose the level per task: low for exploring and simple edits, high for tricky fixes. Topic 20 turns this into a cost-control strategy together with model routing.",
      "commonMistakes": [
        "Setting max thinking everywhere. It multiplies output tokens and latency (the wait before the answer arrives) for tasks that do not need it.",
        "Assuming the thinking text is shown to users or is a trustworthy explanation. It is working text, and you can hide it with Ctrl+T.",
        "Expecting every model to support every level. Check with the model you actually use."
      ],
      "sources": [
        { "title": "Pi docs: settings (model and thinking)", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/settings.md#model-and-thinking" },
        { "title": "Pi docs: usage", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/usage.md" }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Which message role carries Pi's standing rules, such as its base instructions and the contents of AGENTS.md?",
      "options": ["user", "system", "assistant", "toolResult"],
      "answerIndex": 1,
      "explanation": "The system message holds standing rules from the harness. The user message is your request, assistant is the model's reply, and toolResult is the output of a tool Pi ran."
    },
    {
      "question": "Which rewrite of the vague prompt \"fix math\" is best?",
      "options": [
        "Fix math properly and make it good.",
        "Please look at everything in the project and improve it as you see fit.",
        "In src/math.ts, add a JSDoc comment above divide saying it throws when b is 0. Change nothing else.",
        "Fix math. Also fix everything else. Keep the changes minimal."
      ],
      "answerIndex": 2,
      "explanation": "The third option names the file and function, states the exact change, and adds a constraint. The first two are still vague, and the last one contradicts itself."
    },
    {
      "question": "Why must you validate JSON after JSON.parse succeeds?",
      "options": [
        "Because JSON.parse only works on text that contains prose.",
        "Because valid JSON can still lack a field you need or have a value of the wrong type.",
        "Because JSON.parse changes numbers into strings.",
        "Because validation makes the model answer faster."
      ],
      "answerIndex": 1,
      "explanation": "JSON.parse only checks that the text is valid JSON. It does not check that the fields and types match the shape your code expects, so you check them yourself."
    },
    {
      "question": "When should you choose SYSTEM.md instead of AGENTS.md?",
      "options": [
        "Whenever you want to list your project's test command.",
        "Whenever you want Pi to remember last week's session.",
        "Almost never: SYSTEM.md replaces Pi's whole default system prompt, so use it only when you deliberately want that.",
        "Always, because AGENTS.md is only read when the project is trusted."
      ],
      "answerIndex": 2,
      "explanation": "AGENTS.md adds project instructions and is the normal choice. SYSTEM.md replaces the default prompt, which removes Pi's built-in guidance. AGENTS.md is loaded without a trust check, and neither file gives the model memory of past sessions."
    },
    {
      "question": "What is the effect of raising the thinking level from low to high on a simple question?",
      "options": [
        "More output tokens are used, so it costs more and takes longer, usually for no better answer.",
        "Fewer tokens are used because the model works more efficiently.",
        "The model's price per token goes down.",
        "The thinking is skipped and the answer arrives instantly."
      ],
      "answerIndex": 0,
      "explanation": "Thinking is made of output tokens. A higher level produces more of them, which adds cost and latency. On easy questions the extra thinking rarely improves the answer."
    }
  ]
});
