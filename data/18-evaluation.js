window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "18-evaluation",
  "order": 18,
  "title": "Evaluation",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "An eval (short for evaluation) is a fixed set of tasks that you run the same way every time, so you can prove with numbers that a change to your agent helped or hurt. You build a 10-task set, score each run automatically, run the tasks headless (with no human at the keyboard), log pass rate, tokens, cost and latency, then change exactly one thing and compare.",
  "prerequisites": ["17-multi-step-recovery"],
  "subtopics": [
    {
      "id": "why-evals-beat-vibes",
      "title": "Why evals beat vibes",
      "explanation": "So far you have judged your agent by feel: you tried a prompt, read the answer, and decided it \"seemed better\". That is judging by vibes. The problem is that a language model is non-deterministic: the same prompt can produce different output on different runs, because the model samples its next token from a probability distribution (topic 04). One good-looking run proves nothing, and one bad run proves nothing either.\n\nAn eval fixes this with four rules. The same tasks, the same starting state (the same files), the same scoring, and the same procedure every time you change something. Then the only thing that differs between two runs of the eval is the change you made.\n\nTwo more habits make the numbers trustworthy. Run every task at least twice, so a single lucky or unlucky run does not decide the score. And change one variable at a time: if you switch the model and rewrite the prompt together, you cannot tell which one caused the difference.\n\nYou have already done a small version of this. In topic 09 you compared a bad tool description to a good one, and in topic 13 you checked answers against a set of test questions. This topic turns that habit into a repeatable tool. The same idea is called regression testing in ordinary software: a regression is something that used to work and now breaks, and a fixed test set is how you catch it. Here the tests are tasks for an agent.",
      "analogy": "Weighing yourself on the same scale, at the same time, every morning gives you a trend you can trust. Guessing from the mirror (vibes) feels fine but cannot tell you whether you gained or lost half a kilo. The eval is the scale; the mirror is your gut feeling. Weighing twice and averaging is like running each task twice: it smooths out one odd reading.",
      "code": [
        {
          "language": "markdown",
          "filename": "eval-notes.md",
          "source": "<!-- ILLUSTRATIVE, MADE-UP NUMBERS: not real measurements -->\n\n| change | felt better? | measured pass rate (20 runs) |\n| --- | --- | --- |\n| baseline | n/a | 70% (14 of 20) |\n| much longer system prompt | yes, answers sounded careful | 55% (11 of 20) |\n| AGENTS.md rule: run the tests after edits | yes | 85% (17 of 20) |",
          "output": "",
          "explanation": "This is a notes table, not a program, so there is nothing to run. The numbers are made up to show the pattern. The longer system prompt felt better because the answers sounded careful, yet it scored lower than the baseline. Only the measured column tells you that. Without it you would have kept a change that made the agent worse."
        }
      ],
      "productionNote": "Teams use evals as regression tests for prompts, tool descriptions and models: before any change ships, the same fixed task set runs and the pass rate must not drop. A model provider may update or retire a model, and a changed prompt may fix one task and silently break three others; only a stored set of tasks and scores reveals that.",
      "commonMistakes": [
        "Changing the model and the prompt at the same time, then crediting one of them. Change one thing per eval run.",
        "Drawing big conclusions from a tiny sample. With 3 runs, one lucky answer moves the pass rate by 33 percentage points.",
        "Trusting a single run because the output looked good. Models are non-deterministic (the same input can give different output), so run each task at least twice."
      ],
      "sources": [
        { "title": "Anthropic: Building effective agents", "url": "https://www.anthropic.com/engineering/building-effective-agents" },
        { "title": "OpenAI: Evals guide", "url": "https://platform.openai.com/docs/guides/evals" }
      ]
    },
    {
      "id": "fixed-task-set",
      "title": "A fixed task set (3 easy, 4 medium, 3 hard)",
      "explanation": "Your task set lives in a file called tasks.json: an array (a list) of objects, one per task. Each object has an id, a level (\"easy\", \"medium\" or \"hard\"), a prompt (the text you send to the agent) and a check (how the run is scored automatically, covered in the next sub-topic).\n\nEvery task runs against a fixture: a folder of starting files that is copied fresh for each run, so the repository state is identical every time. Here the fixture is `evals/fixture/`, a small copy of a project with `src/`, `test/` and `docs/` folders. Set up the folders first. Open Git Bash (taught in topic 01), then run the commands in the first code block below.\n\nPut the files from the second and third code blocks into the fixture. `src/math.ts` exports add, divide and a deliberately weak `average` that returns NaN (not a number) for an empty list. `test/math.test.ts` uses the node:test runner from topic 17 and contains one deliberately failing test. Also create two small Markdown files by hand: `evals/fixture/docs/billing.md` (any text, but it must contain the word refunds) and `evals/fixture/docs/math.md` (a short list of the math functions). Add `evals/fixture/package.json` containing `{ \"type\": \"module\" }` so Node treats the `.ts` files as ES modules.\n\nThe 10 tasks, in plain words:\n\nEasy (answer a question): e1 lists the exports of src/math.ts; e2 finds which docs file mentions refunds; e3 reports the error message divide throws.\n\nMedium (small edit): m1 adds `multiply`; m2 fixes `average` for an empty list so the failing test passes (scored by running the tests); m3 adds `subtract` and a test for it; m4 adds `max`.\n\nHard (multi-file): h1 adds `median`, tests for it, and a docs/math.md update; h2 changes `divide` to return null instead of throwing and updates its test; h3 renames `average` to `mean` in src, test and docs.\n\nThe last code block is the full tasks.json. Keep prompts as plain text without the characters double quote, ampersand, percent or caret. The runner later passes the prompt through a Windows shell, where those characters have special meanings.",
      "analogy": "A fixed exam paper that is reused every term. Because the questions never change, a score of 70% this term and 80% next term means the students improved, not that the paper got easier. The fixture is the same exam room set up identically each time.",
      "code": [
        {
          "language": "bash",
          "filename": "setup-evals.sh",
          "source": "cd ~/pi-lab\nmkdir -p evals/fixture/src evals/fixture/test evals/fixture/docs evals/results",
          "output": "",
          "explanation": "`cd ~/pi-lab` moves into your lab folder. `mkdir -p` makes a folder and any missing parent folders. You now have evals/fixture (the starting files) and evals/results (where run logs go). Save tasks.json as evals/tasks.json."
        },
        {
          "language": "typescript",
          "filename": "evals/fixture/src/math.ts",
          "source": "export function add(a: number, b: number): number {\n  return a + b;\n}\n\nexport function divide(a: number, b: number): number {\n  if (b === 0) throw new Error(\"Cannot divide by zero\");\n  return a / b;\n}\n\nexport function average(numbers: number[]): number {\n  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;\n}",
          "output": "",
          "explanation": "Three small exported functions. `average` adds up the list with reduce (a method that folds a list into one value, starting from 0) and divides by the length. For an empty list that is 0 divided by 0, which is NaN. That is the bug task m2 asks the agent to fix."
        },
        {
          "language": "typescript",
          "filename": "evals/fixture/test/math.test.ts",
          "source": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { add, divide, average } from \"../src/math.ts\";\n\ntest(\"add adds\", () => {\n  assert.equal(add(2, 3), 5);\n});\n\ntest(\"divide throws on zero\", () => {\n  assert.throws(() => divide(1, 0), /Cannot divide by zero/);\n});\n\ntest(\"average of numbers\", () => {\n  assert.equal(average([2, 4]), 3);\n});\n\ntest(\"average of an empty list is 0\", () => {\n  assert.equal(average([]), 0);\n});",
          "output": "",
          "explanation": "Four tests; the last one fails on the untouched fixture because average([]) is NaN. A test that fails at the start gives task m2 a clear pass condition: run the tests, and they must all pass. (Running the file prints test-runner output, which varies, so none is shown.)"
        },
        {
          "language": "json",
          "filename": "evals/tasks.json",
          "source": "[\n  { \"id\": \"e1\", \"level\": \"easy\", \"prompt\": \"Which functions does src/math.ts export? Answer with names only.\", \"check\": { \"type\": \"answerIncludes\", \"values\": [\"add\", \"divide\", \"average\"] } },\n  { \"id\": \"e2\", \"level\": \"easy\", \"prompt\": \"Which file in the docs folder mentions refunds? Answer with the file name only.\", \"check\": { \"type\": \"answerIncludes\", \"values\": [\"billing.md\"] } },\n  { \"id\": \"e3\", \"level\": \"easy\", \"prompt\": \"What error message does divide in src/math.ts throw when b is 0?\", \"check\": { \"type\": \"answerIncludes\", \"values\": [\"cannot divide by zero\"] } },\n  { \"id\": \"m1\", \"level\": \"medium\", \"prompt\": \"Add export function multiply(a, b) to src/math.ts.\", \"check\": { \"type\": \"fileIncludes\", \"file\": \"src/math.ts\", \"text\": \"export function multiply\" } },\n  { \"id\": \"m2\", \"level\": \"medium\", \"prompt\": \"One test in test/math.test.ts fails. Fix the code in src/math.ts, not the test, then run the tests.\", \"check\": { \"type\": \"command\", \"cmd\": \"node --test test/math.test.ts\" } },\n  { \"id\": \"m3\", \"level\": \"medium\", \"prompt\": \"Add export function subtract(a, b) to src/math.ts and a test for it in test/math.test.ts, then run the tests.\", \"check\": { \"type\": \"fileIncludes\", \"file\": \"test/math.test.ts\", \"text\": \"subtract\" } },\n  { \"id\": \"m4\", \"level\": \"medium\", \"prompt\": \"Add export function max(numbers) to src/math.ts that returns the largest number in the list.\", \"check\": { \"type\": \"fileIncludes\", \"file\": \"src/math.ts\", \"text\": \"export function max\" } },\n  { \"id\": \"h1\", \"level\": \"hard\", \"prompt\": \"Add export function median(numbers) to src/math.ts, add tests for it in test/math.test.ts, document it in docs/math.md, then run the tests.\", \"check\": { \"type\": \"fileIncludes\", \"file\": \"docs/math.md\", \"text\": \"median\" } },\n  { \"id\": \"h2\", \"level\": \"hard\", \"prompt\": \"Users report that divide crashes the program when b is 0. Change divide in src/math.ts to return null instead of throwing, update its test in test/math.test.ts, then run the tests.\", \"check\": { \"type\": \"fileIncludes\", \"file\": \"src/math.ts\", \"text\": \"return null\" } },\n  { \"id\": \"h3\", \"level\": \"hard\", \"prompt\": \"Rename the function average to mean in src/math.ts, test/math.test.ts and docs/math.md, then run the tests.\", \"check\": { \"type\": \"fileIncludes\", \"file\": \"test/math.test.ts\", \"text\": \"mean\" } }\n]",
          "output": "",
          "explanation": "Ten tasks: 3 easy, 4 medium, 3 hard. Easy tasks only read; medium tasks change one file; hard tasks touch several files. Task m2 is checked by running the tests because the fixture starts with a failing test, so the command can only succeed after a real fix. Most other checks look for text in a file, which is cheaper to write but weaker (see the next sub-topic)."
        }
      ],
      "productionNote": "A real task set grows from real failures: when your agent fails in practice, you turn that failure into a new task so it can never silently return (topic 23 collects these in FAILURES.md). Keep a mix of levels so the pass rate has room to move in both directions.",
      "commonMistakes": [
        "Writing only easy tasks. If every task passes, a 100% score tells you nothing about whether a change helped.",
        "Tasks that depend on the internet (a live website, a changing API). The result then changes for reasons unrelated to your agent. Keep tasks inside the fixture.",
        "Putting double quotes, ampersands, percent signs or carets in prompts. They break the Windows command line the runner uses."
      ],
      "sources": [
        { "title": "Node.js: Test runner", "url": "https://nodejs.org/docs/latest-v26.x/api/test.html" }
      ]
    },
    {
      "id": "scoring-rubrics",
      "title": "Scoring rubrics",
      "explanation": "A rubric is the rule that turns a run into a score. Prefer automatic rubrics: a program decides pass or fail, so scoring is fast, free and identical every time. Each task's `check` object names one of three types.\n\n`answerIncludes`: every string in `values` must appear in the agent's final answer, ignoring upper and lower case.\n\n`fileIncludes`: a named file, inside the task's working copy of the fixture, must contain some text.\n\n`command`: a shell command is run in the working copy, and an exit code of 0 means pass. An exit code is the number a program returns when it finishes; by convention 0 means success and anything else means failure.\n\nThe score of one run is simply pass or fail. You can add partial credit later (for example 0.5 for a correct answer with a wrong format), but a plain pass or fail is easier to compare. A third approach is an LLM-as-judge, where a second model grades fuzzy qualities like tone. It is mentioned here only; it is slower, costs tokens and can itself be inconsistent, so use it only when no automatic check fits.\n\nStart with the smallest scorer. In the code below, `every` returns true only if the test passes for all items in a list, and `includes` on a string checks whether it contains another string.",
      "analogy": "A multiple-choice answer key versus marking essays. The key is quick, fair and gives the same result whoever applies it; essay marking is richer but slow and subjective. Automatic checks are the answer key, and an LLM judge is the essay marker you call in only when you must.",
      "code": [
        {
          "language": "typescript",
          "filename": "score-answer.ts",
          "source": "type Check = { type: \"answerIncludes\"; values: string[] };\n\nexport function scoreAnswer(answer: string, c: Check): boolean {\n  const a = answer.toLowerCase();\n  return c.values.every((v) => a.includes(v.toLowerCase()));\n}\n\nconsole.log(\n  scoreAnswer(\"add, divide\", { type: \"answerIncludes\", values: [\"add\", \"divide\"] }),\n  scoreAnswer(\"add only\", { type: \"answerIncludes\", values: [\"add\", \"divide\"] }),\n);",
          "output": "true false",
          "explanation": "The first answer contains both required words, so it passes. The second lacks \"divide\", so it fails. Lowercasing both sides makes the match ignore case. console.log with two arguments prints them on one line separated by a space."
        },
        {
          "language": "typescript",
          "filename": "scoring.ts",
          "source": "import { mkdtempSync, rmSync, writeFileSync, readFileSync } from \"node:fs\";\nimport { tmpdir } from \"node:os\";\nimport { join } from \"node:path\";\nimport { spawnSync } from \"node:child_process\";\n\nexport type Check =\n  | { type: \"answerIncludes\"; values: string[] }\n  | { type: \"fileIncludes\"; file: string; text: string }\n  | { type: \"command\"; cmd: string };\n\nexport function score(check: Check, answer: string, cwd: string): boolean {\n  if (check.type === \"answerIncludes\") {\n    const a = answer.toLowerCase();\n    return check.values.every((v) => a.includes(v.toLowerCase()));\n  }\n  if (check.type === \"fileIncludes\") {\n    try {\n      return readFileSync(join(cwd, check.file), \"utf8\").includes(check.text);\n    } catch {\n      return false;\n    }\n  }\n  return spawnSync(check.cmd, { cwd, shell: true }).status === 0;\n}\n\nif (import.meta.main) {\n  const dir = mkdtempSync(join(tmpdir(), \"score-demo-\"));\n  writeFileSync(join(dir, \"math.ts\"), \"export function multiply(a, b) { return a * b; }\\n\");\n  console.log(score({ type: \"fileIncludes\", file: \"math.ts\", text: \"function multiply\" }, \"\", dir));\n  console.log(score({ type: \"fileIncludes\", file: \"missing.ts\", text: \"x\" }, \"\", dir));\n  console.log(score({ type: \"command\", cmd: 'node -e \"process.exit(0)\"' }, \"\", dir));\n  console.log(score({ type: \"command\", cmd: 'node -e \"process.exit(1)\"' }, \"\", dir));\n  rmSync(dir, { recursive: true, force: true });\n}",
          "output": "true\nfalse\ntrue\nfalse",
          "explanation": "`score` handles all three check types. A union type (taught in topic 02) lets `check.type` decide which fields exist. For fileIncludes, a missing file is caught and scored false. For command, spawnSync runs the command string and waits for it to finish; `status` is its exit code, and `shell: true` lets the operating system's shell run it. The demo runs only when the file is started directly: `import.meta.main` is true then, and false when another file imports `score`. mkdtempSync creates a new uniquely named folder inside the system temp folder (os.tmpdir()), writeFileSync and readFileSync are the blocking versions of the file functions from topic 12, and rmSync deletes the folder afterwards. The two command lines are node one-liners that exit with 0 and 1."
        }
      ],
      "productionNote": "Pass rate becomes a CI gate (CI means continuous integration: a server that runs checks on every change). If the eval pass rate falls below an agreed threshold, the change is blocked from merging, exactly like a failing unit test.",
      "commonMistakes": [
        "Checks that are too loose: answerIncludes with the value add also matches the word address. Use more distinctive values, such as a full file name or a whole error message.",
        "Checks the agent can game. A check that only asks whether a file exists passes without the work being done. In the task set above, m1 only looks for the text of the function, so an agent could add an empty function and pass. For important tasks, combine this with a command check that runs tests; a stronger runner would accept a list of checks that must all pass.",
        "Using a command check that runs tests the agent was allowed to edit. The prompt of m2 says not to change the test, but nothing enforces it. Keep an eye on this when reading failures."
      ],
      "sources": [
        { "title": "Node.js: child_process.spawnSync", "url": "https://nodejs.org/docs/latest-v26.x/api/child_process.html#child_processspawnsynccommand-args-options" }
      ]
    },
    {
      "id": "running-tasks-headless",
      "title": "Running tasks headless",
      "explanation": "Headless means the agent runs with no human at the keyboard: your script starts Pi, gives it a prompt, and reads what comes back. The command is `pi --no-session --mode json \"<prompt>\"`. `--no-session` stops Pi from saving a session file for each run, and `--mode json` prints one JSON event per line to stdout (the normal output stream, topic 07) and then exits.\n\nFor each run, the runner does four things. It creates an empty temporary folder, copies `evals/fixture` into it with `fs.cp` (recursive copy), starts Pi with that folder as its working directory, and later deletes the folder. The agent can edit files freely, and the real fixture stays untouched. No `git init` is needed in the copy.\n\nOn Windows, npm installs `pi` as `pi.cmd`, a small batch-file wrapper (a shim) that Node cannot start directly. Passing `shell: true` makes Node run the command through the Windows shell, which handles it. The command is built as one string, and the prompt is wrapped with `JSON.stringify(prompt)` to put quotes around it. The shell does not understand escaped quotes inside, which is why the task prompts avoid special characters.\n\nThe output is a long text of lines. Split it on the newline character, and strip a trailing carriage return (`\\r`, which Windows adds). Each line that starts with `{` is an event. Only events with type `message_end` and a message whose role is `assistant` matter here: their text blocks hold the answer, their toolCall blocks are tool calls, and their `usage` object holds the token counts and cost. The final answer is the text of the last such message. Do not read stderr (the error stream) as events; it holds diagnostics, not JSON events.\n\nTopic 21 replaces this process-spawning approach with the Pi SDK, which avoids shell quoting entirely. For now, the first block parses events, and the second block runs one task. The second block needs Pi installed and a provider logged in (topic 01), and it makes real model calls, so it prints nothing and shows no output.",
      "analogy": "Each exam is taken in a fresh, identical exam room. Before each student sits down, the room is reset to the same state: same desks, same paper. The fixture copy is that reset, and the temporary folder is the room that is thrown away afterwards. Afterwards the marker reads only the answer lines on the sheet (the JSON event lines) and ignores the scribbles in the margin (stderr).",
      "code": [
        {
          "language": "typescript",
          "filename": "parse-events.ts",
          "source": "type Block = { type: string; text?: string };\n\nexport function parseEvents(stdout: string) {\n  let answer = \"\";\n  let toolCalls = 0;\n  let totalTokens = 0;\n  let cost = 0;\n  for (const line of stdout.split(\"\\n\")) {\n    const text = line.trim();\n    if (!text.startsWith(\"{\")) continue;\n    let event;\n    try {\n      event = JSON.parse(text);\n    } catch {\n      continue;\n    }\n    const msg = event.message;\n    if (event.type !== \"message_end\" || msg?.role !== \"assistant\") continue;\n    const blocks: Block[] = msg.content ?? [];\n    totalTokens += msg.usage?.totalTokens ?? 0;\n    cost += msg.usage?.cost?.total ?? 0;\n    toolCalls += blocks.filter((b) => b.type === \"toolCall\").length;\n    answer = blocks.filter((b) => b.type === \"text\").map((b) => b.text).join(\"\");\n  }\n  return { answer, toolCalls, totalTokens, cost: Math.round(cost * 1e6) / 1e6 };\n}\n\nif (import.meta.main) {\n  const sample = [\n    '{\"type\":\"message_end\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"toolCall\",\"id\":\"c1\",\"name\":\"read\",\"arguments\":{\"path\":\"src/math.ts\"}}],\"usage\":{\"totalTokens\":900,\"cost\":{\"total\":0.003}}}}',\n    '{\"type\":\"message_end\",\"message\":{\"role\":\"toolResult\",\"toolCallId\":\"c1\",\"content\":[{\"type\":\"text\",\"text\":\"export function add\"}],\"isError\":false}}',\n    '{\"type\":\"message_end\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"add, divide\"}],\"usage\":{\"totalTokens\":630,\"cost\":{\"total\":0.002}}}}',\n  ].join(\"\\r\\n\");\n  console.log(JSON.stringify(parseEvents(sample)));\n}",
          "output": "{\"answer\":\"add, divide\",\"toolCalls\":1,\"totalTokens\":1530,\"cost\":0.005}",
          "explanation": "The sample has three event lines joined with Windows line endings. `trim()` removes the stray carriage return, and `startsWith(\"{\")` skips anything that is not a JSON line. A line that fails JSON.parse is skipped by the catch block. `?.` and `??` mean: if the value is missing, give up safely (undefined) or use the fallback on the right. Line 1 is an assistant message with one tool call and 900 tokens; line 2 is a tool result, which is ignored because its role is not assistant; line 3 is the final text answer with 630 tokens. Totals: 900 + 630 = 1530 tokens, 1 tool call, cost 0.005. The last assistant message's text becomes the answer."
        },
        {
          "language": "typescript",
          "filename": "run-task.ts",
          "source": "import { cp, mkdtemp } from \"node:fs/promises\";\nimport { tmpdir } from \"node:os\";\nimport { join } from \"node:path\";\nimport { spawnSync } from \"node:child_process\";\nimport { parseEvents } from \"./parse-events.ts\";\n\nexport async function runTask(prompt: string) {\n  const dir = await mkdtemp(join(tmpdir(), \"pi-eval-\"));\n  await cp(\"evals/fixture\", dir, { recursive: true });\n\n  const started = Date.now();\n  const res = spawnSync(`pi --no-session --mode json ${JSON.stringify(prompt)}`, {\n    cwd: dir,\n    shell: true,\n    encoding: \"utf8\",\n    maxBuffer: 50 * 1024 * 1024,\n    timeout: 300000,\n  });\n  const ms = Date.now() - started;\n\n  return { dir, ms, ...parseEvents(res.stdout ?? \"\") };\n}",
          "output": "",
          "explanation": "Run from ~/pi-lab so the relative path evals/fixture resolves. mkdtemp makes a unique folder such as pi-eval-AbC123 in the system temp folder, and cp copies the fixture into it. The `cwd` option makes Pi start inside that copy. `encoding: \"utf8\"` returns text instead of raw bytes. `maxBuffer` is the most output Node keeps in memory (a buffer is a holding area for data in transit) and is raised so a long event stream is not cut off. `timeout` kills the run after 300000 milliseconds (5 minutes). Date.now() before and after gives the latency in milliseconds. The function returns the folder path so the caller can score the files, and then delete the folder."
        }
      ],
      "productionNote": "Teams run the eval as a nightly or on-every-change job, in a clean machine or container, so the same fixture, the same Pi version and the same model are used each time. Record the Pi version and model name with every result, because a silent upgrade can change scores.",
      "commonMistakes": [
        "Running the agent in your real repository. Edits from one run leak into the next run (state drift), and you may damage real files. Always use a fresh copy of the fixture.",
        "Reading stderr as if it contained events. Only stdout carries the JSON event lines.",
        "Forgetting that Windows needs `shell: true` for pi.cmd, or putting special characters in the prompt, which the Windows shell then misreads."
      ],
      "sources": [
        { "title": "Pi: JSON mode and event stream", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/json.md" },
        { "title": "Node.js: fs.cp", "url": "https://nodejs.org/docs/latest-v26.x/api/fs.html#fspromisescpsrc-dest-options" },
        { "title": "Node.js: spawning .bat and .cmd files on Windows", "url": "https://nodejs.org/docs/latest-v26.x/api/child_process.html#spawning-bat-and-cmd-files-on-windows" }
      ]
    },
    {
      "id": "logging-results",
      "title": "Logging pass rate, tokens, cost and latency",
      "explanation": "Pass rate alone is not enough. A change that raises the pass rate by 5% but triples the cost may not be worth it. For every run, record one row: `{ label, taskId, pass, tokens, cost, ms, toolCalls }`.\n\nThe `label` names the experiment (for example base or v2). `tokens` is the sum of `usage.totalTokens` and `cost` is the sum of `usage.cost.total`, both taken over every assistant `message_end` event of the run (the parser from the last sub-topic does this). `ms` is latency: the wall-clock time from just before starting Pi to just after it finished.\n\nAppend each row as one line of JSON to `evals/results/<label>.jsonl`. JSONL means one JSON object per line (topic 07). Appending means a crash halfway through a long eval keeps every row logged so far, and you can read the file with one JSON.parse per line.\n\nA summary turns rows into four numbers: pass rate, average tokens, total cost and median latency. The median is the middle value after sorting, and it is better than the average for latency because one very slow run drags the average up. Variance (how much results differ from run to run) is the reason to run each task more than once.",
      "analogy": "A fitness tracker logs distance, heart rate and time for every run, not just whether you finished. Looking at only one number (distance) would hide that you got there by exhausting yourself. Pass rate is distance; tokens, cost and latency are the heart rate and the stopwatch.",
      "code": [
        {
          "language": "typescript",
          "filename": "log-run.ts",
          "source": "import { appendFileSync, mkdtempSync, readFileSync, rmSync } from \"node:fs\";\nimport { tmpdir } from \"node:os\";\nimport { join } from \"node:path\";\n\nconst dir = mkdtempSync(join(tmpdir(), \"results-\"));\nconst file = join(dir, \"base.jsonl\");\n\nconst runs = [\n  { label: \"base\", taskId: \"e1\", pass: true, tokens: 1530, cost: 0.005, ms: 8000, toolCalls: 1 },\n  { label: \"base\", taskId: \"m2\", pass: false, tokens: 3000, cost: 0.011, ms: 20000, toolCalls: 4 },\n];\nfor (const r of runs) {\n  appendFileSync(file, JSON.stringify(r) + \"\\n\");\n}\n\nconst back = readFileSync(file, \"utf8\").trim().split(\"\\n\").map((l) => JSON.parse(l));\nconsole.log(back.length, back[1].taskId);\nrmSync(dir, { recursive: true, force: true });",
          "output": "2 m2",
          "explanation": "`for (const r of runs)` repeats the body once per item in the list. appendFileSync adds text to the end of a file (creating it if missing); each row is written as JSON followed by a newline. Reading it back, trim removes the final empty line, split cuts into one string per line and map parses each into an object. back[1] is the second item, because list positions start at 0. The real runner appends to evals/results/<label>.jsonl instead of a temporary folder."
        },
        {
          "language": "typescript",
          "filename": "summary.ts",
          "source": "const rows = [\n  { pass: true, tokens: 1200, cost: 0.004, ms: 8000 },\n  { pass: false, tokens: 3000, cost: 0.011, ms: 20000 },\n  { pass: true, tokens: 1800, cost: 0.006, ms: 12000 },\n];\n\nconst rate = rows.filter((r) => r.pass).length / rows.length;\nconst avgTok = rows.reduce((s, r) => s + r.tokens, 0) / rows.length;\nconst cost = rows.reduce((s, r) => s + r.cost, 0);\nconst sorted = rows.map((r) => r.ms).sort((a, b) => a - b);\nconst median = sorted[Math.floor(sorted.length / 2)];\n\nconsole.log(`pass ${(rate * 100).toFixed(0)}% | avg tokens ${avgTok} | cost $${cost.toFixed(3)} | median latency ${median} ms`);",
          "output": "pass 67% | avg tokens 2000 | cost $0.021 | median latency 12000 ms",
          "explanation": "Two of three runs passed: 2/3 = 0.667, printed as 67%. reduce adds up a field across all rows, so tokens total 6000 and the average is 2000. Costs add to 0.021, and toFixed(3) prints three decimals. For the median, map pulls out the latencies, sort with (a, b) => a - b orders numbers from small to large (without it, sort compares them as text), and the middle item of [8000, 12000, 20000] is 12000. With an even number of runs the middle falls between two values; this simple version takes the upper one, which is fine for a rough report."
        }
      ],
      "productionNote": "The summary table becomes the eval results table in your project README (topic 23). Always report cost and latency next to pass rate, so readers see what the accuracy cost.",
      "commonMistakes": [
        "Reporting pass rate without cost. A variant that passes more tasks by using four times the tokens is a trade-off, not a free win.",
        "Ignoring variance. If the same task passes once and fails once in two runs, that is information; do not hide it by showing only the better run.",
        "Rewriting the results file instead of appending. A crash then loses all earlier rows."
      ],
      "sources": [
        { "title": "Pi: message types (usage)", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/message-types.md#usage" }
      ]
    },
    {
      "id": "change-one-thing-compare",
      "title": "Change one thing, compare (checkpoint)",
      "explanation": "This is the week 5 checkpoint. The procedure has four steps.\n\nFirst, run the baseline: the label is `base`, and every one of the 10 tasks runs twice, which makes 20 runs. Second, change exactly one thing. Examples: add an AGENTS.md line to the fixture such as \"always run node --test test/math.test.ts after edits\", or switch to a different model, or improve a tool description. Third, run again with the label `v2`, using the same fixture, the same tasks and the same scoring. Fourth, compare the two result files in one table.\n\nTo run the loop, save the file below as `evals/run.ts` and start it from ~/pi-lab with `node evals/run.ts base`. In this script `process.argv` is the list of words typed on the command line, and index 2 is the first one after the file name, so it holds the label. `??` supplies a default when the left side is missing, and `cond ? a : b` picks a when cond is true and b otherwise. The loop body runs once per task and per repeat, so it also appends one row per run.\n\nThen read the table honestly. With 20 runs each run is worth 5 percentage points, so a gap of 5 or 10 points is within normal noise. Conclude that a change helped only when the difference is clear and shows in several tasks; otherwise write that the result is inconclusive and add more runs. The comparison below prints a table from sample data. Its numbers are made up for illustration and use only 5 runs per label, so a one-run difference is still just noise.",
      "analogy": "An A/B test in a shop: change only the window display, keep prices, opening hours and stock the same, and compare sales over equal periods. If you also changed the prices that week, you would not know which change brought the customers.",
      "code": [
        {
          "language": "typescript",
          "filename": "evals/run.ts",
          "source": "import { readFileSync, appendFileSync } from \"node:fs\";\nimport { rm } from \"node:fs/promises\";\nimport { runTask } from \"./run-task.ts\";\nimport { score } from \"./scoring.ts\";\n\nconst label = process.argv[2] ?? \"base\";\nconst repeats = 2;\nconst tasks = JSON.parse(readFileSync(\"evals/tasks.json\", \"utf8\"));\n\nfor (const task of tasks) {\n  for (let i = 0; i < repeats; i++) {\n    const run = await runTask(task.prompt);\n    const pass = score(task.check, run.answer, run.dir);\n    await rm(run.dir, { recursive: true, force: true });\n    const row = {\n      label,\n      taskId: task.id,\n      pass,\n      tokens: run.totalTokens,\n      cost: run.cost,\n      ms: run.ms,\n      toolCalls: run.toolCalls,\n    };\n    appendFileSync(`evals/results/${label}.jsonl`, JSON.stringify(row) + \"\\n\");\n    console.log(label, task.id, pass ? \"PASS\" : \"FAIL\");\n  }\n}",
          "output": "",
          "explanation": "Put run-task.ts, parse-events.ts and scoring.ts next to run.ts in evals/ (the imports use ./ paths). The script uses top-level await, which works because your project is an ES module. `for (let i = 0; i < repeats; i++)` repeats its body 2 times. Each run is scored while its temporary folder still exists, then the folder is deleted. The script prints one PASS or FAIL line per run, such as base e1 PASS; the lines depend on the model, so no fixed output is shown. It needs Pi and a logged-in provider, and it spends real tokens."
        },
        {
          "language": "typescript",
          "filename": "compare.ts",
          "source": "type Row = { pass: boolean; tokens: number; cost: number };\n\n// ILLUSTRATIVE, MADE-UP numbers, 5 runs per label\nconst results: Record<string, Row[]> = {\n  base: [\n    { pass: true, tokens: 2000, cost: 0.04 },\n    { pass: true, tokens: 2200, cost: 0.04 },\n    { pass: true, tokens: 2400, cost: 0.04 },\n    { pass: false, tokens: 2600, cost: 0.04 },\n    { pass: false, tokens: 2800, cost: 0.05 },\n  ],\n  v2: [\n    { pass: true, tokens: 2200, cost: 0.04 },\n    { pass: true, tokens: 2400, cost: 0.05 },\n    { pass: true, tokens: 2600, cost: 0.05 },\n    { pass: true, tokens: 2800, cost: 0.05 },\n    { pass: false, tokens: 3000, cost: 0.05 },\n  ],\n};\n\nconsole.log(\"| label | runs | pass | avg tokens | cost |\");\nconsole.log(\"| --- | --- | --- | --- | --- |\");\nfor (const [label, rows] of Object.entries(results)) {\n  const pass = (rows.filter((r) => r.pass).length / rows.length) * 100;\n  const tok = rows.reduce((s, r) => s + r.tokens, 0) / rows.length;\n  const cost = rows.reduce((s, r) => s + r.cost, 0);\n  console.log(`| ${label} | ${rows.length} | ${pass.toFixed(0)}% | ${tok} | $${cost.toFixed(2)} |`);\n}",
          "output": "| label | runs | pass | avg tokens | cost |\n| --- | --- | --- | --- | --- |\n| base | 5 | 60% | 2400 | $0.21 |\n| v2 | 5 | 80% | 2600 | $0.24 |",
          "explanation": "Object.entries turns the results object into a list of [label, rows] pairs, and the loop prints one table line per label. Base passed 3 of 5 (60%), v2 passed 4 of 5 (80%). The average tokens are 2400 and 2600, and the costs sum to $0.21 and $0.24. The numbers are made up. Here v2 passes one more run but costs more tokens and money, and one run is too little to call it a win. A real conclusion needs the full 20 runs per label and a clear gap."
        }
      ],
      "productionNote": "Every change to a prompt, tool description or model in your portfolio project (topic 22) goes through this loop: run base, run the variant, compare, and keep the change only if the numbers justify it. Store the result files in version control next to the change they measured.",
      "commonMistakes": [
        "Different fixture state between the two runs (for example editing the fixture between base and v2). Then you are comparing two changes, not one.",
        "Rerunning only the tasks that failed and calling the new total the result. That is cherry-picking: passing tasks could fail on a rerun too. Rerun the whole set.",
        "Declaring victory on a small gap. With 20 runs per label, a 5 to 10 point difference can be noise; write down the uncertainty."
      ],
      "sources": [
        { "title": "Anthropic: Building effective agents", "url": "https://www.anthropic.com/engineering/building-effective-agents" }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Why should you run each eval task more than once?",
      "options": [
        "Pi ignores the first run of every session",
        "The model is non-deterministic, so a single run can pass or fail by luck",
        "A results file needs at least two lines to be valid JSONL",
        "Running twice doubles the token count, which makes the cost report more accurate"
      ],
      "answerIndex": 1,
      "explanation": "The same prompt can produce different outputs on different runs. Repeating each task shows how stable the result is. The other options are not true: Pi does not skip runs, one line is valid JSONL, and extra tokens do not improve accuracy."
    },
    {
      "question": "Why does every task run in a fresh copy of the fixture folder?",
      "options": [
        "Because copying files is faster than reading them from the original folder",
        "Because Pi refuses to start in a folder that already has files in it",
        "So each run starts from identical files and edits from earlier runs cannot leak into later ones",
        "Because the tests in the fixture need an internet connection that only a new folder has"
      ],
      "answerIndex": 2,
      "explanation": "Isolation keeps runs comparable. If the agent's edits stayed in the real fixture, the next task would start from a different state and scores would drift."
    },
    {
      "question": "Which is a valid answerIncludes check?",
      "options": [
        "{ \"type\": \"answerIncludes\", \"values\": [\"add\", \"divide\"] }",
        "{ \"type\": \"answerIncludes\", \"cmd\": \"node --test test/math.test.ts\" }",
        "{ \"type\": \"answerIncludes\", \"file\": \"src/math.ts\", \"text\": \"add\" }",
        "{ \"type\": \"exitCode\", \"values\": 0 }"
      ],
      "answerIndex": 0,
      "explanation": "An answerIncludes check has a values list of strings that must all appear in the final answer. The second option uses the command field, the third has the fields of fileIncludes, and exitCode is not one of the three check types."
    },
    {
      "question": "Where do token counts and cost come from in the event stream of pi --mode json?",
      "options": [
        "From the content of toolResult messages",
        "From stderr, which Pi uses to report usage",
        "From the durationMs field on tool_execution_end events",
        "From the usage object (totalTokens, cost.total) on assistant message_end events"
      ],
      "answerIndex": 3,
      "explanation": "Each assistant message carries a usage object. The eval parser sums totalTokens and cost.total over all assistant message_end events. durationMs measures tool time, and stderr does not carry events."
    },
    {
      "question": "Which procedure makes a fair before/after comparison?",
      "options": [
        "Switch the model and rewrite the prompt together to save time",
        "Rerun only the tasks that failed in the baseline",
        "Keep the same fixture, tasks, scoring and number of runs, change exactly one thing, and compare the full results",
        "Compare one run of the baseline with the best of five runs of the variant"
      ],
      "answerIndex": 2,
      "explanation": "Only one difference between the two eval runs means any score change can be attributed to it. Changing two things hides the cause, rerunning only failures is cherry-picking, and comparing unequal numbers of runs is unfair."
    }
  ]
});
