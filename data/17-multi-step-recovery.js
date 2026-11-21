window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "17-multi-step-recovery",
  "order": 17,
  "title": "Multi-Step Agents & Recovery",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "You will run a complete bug-fixing workflow with the agent: read an issue, find the code, prove the bug with a failing test, fix it, run the tests and write a summary. Then you will teach your agent to notice failed tool calls, retry, switch approach and finally give up cleanly instead of looping forever. The Week 4 checkpoint proves the agent recovers from a deliberately flaky tool.",
  "prerequisites": [
    "16-mcp-bridge"
  ],
  "subtopics": [
    {
      "id": "issue-triage-workflow",
      "title": "Issue-triage workflow end to end",
      "explanation": "A workflow is a fixed sequence of stages that the agent follows in order. Instead of saying \"fix this bug\" and hoping for the best, you spell out the stages. Our issue-triage workflow has six: 1) read the issue, 2) locate the relevant code, 3) reproduce the bug with a failing test, 4) fix the code, 5) run the tests, 6) write a summary (what was wrong, why, which files changed, and the test result).\n\nAn issue is a written bug report. On GitHub it lives on a web page; in this course it is a plain text file, so you need no account. We will use a small bug in the lab. Open Git Bash (the terminal from topic 01), move into the lab folder with `cd ~/pi-lab`, and create the folders we need with `mkdir -p src issues test .pi/prompts .pi/extensions` (`mkdir -p` creates every folder in the list and does not complain if one already exists). Then create the two files below by hand in your editor: `src/stats.ts` and `issues/42.md`.\n\nLook at `average`. The array method `reduce` walks through the array keeping a running total that starts at 0, so `xs.reduce((a, b) => a + b, 0)` is the sum of the numbers. Dividing by `xs.length` gives the average. For an empty array the sum is 0 and the length is 0, and `0 / 0` in JavaScript is `NaN` (short for \"not a number\", a special number value that means \"no valid result\"). The issue says this should be an error instead. To see the bug yourself, create `demo-bug.ts` and run it with `node demo-bug.ts`.\n\nNow encode the workflow as a prompt template (topic 10): a Markdown file whose name becomes a slash command. Save the fourth file below (the one that starts with `---`) as `.pi/prompts/triage.md`. The frontmatter (the block between the `---` lines) gives the command a description and an argument hint, and `$1` is replaced with the first argument you type. Start Pi in `~/pi-lab` (trust the project when asked, so the project template loads) and run `/triage issues/42.md`.\n\nA healthy run looks like this sample trace: read `issues/42.md`, run a `grep` search with bash, read `src/stats.ts`, write a test file, edit `src/stats.ts`, run `node --test` with bash. The exact wording and order can vary, but the stages must all appear. If you already track a plan with the planning guard from topic 15 you can reuse it here, so the agent cannot edit files before it has written down its steps.\n\nIf your issues do live on GitHub, the GitHub command line tool `gh` can print one: `gh issue view 42 | pi -p \"Triage this issue\"` sends the issue text (through a pipe, the `|` symbol that feeds one command's output into another's input) to Pi in print mode. We do not use it in the lab because it needs an account and a login.",
      "analogy": "Hospital triage. A nurse assesses the patient (read the issue), locates the problem (find the code), runs a test to confirm it (failing test), treats it (fix), checks the treatment worked (run tests) and writes the discharge note (summary). Skipping a step, such as treating before testing, is how mistakes happen, and the fixed order is what makes the process repeatable.",
      "code": [
        {
          "language": "markdown",
          "filename": "issues/42.md",
          "source": "# Issue 42\n\naverage([]) returns NaN. It should throw an Error with message 'average of empty list'.\n",
          "output": "",
          "explanation": "The issue is just text. Good issues state the actual behaviour and the expected behaviour, which is exactly what the agent needs to write a test."
        },
        {
          "language": "typescript",
          "filename": "src/stats.ts",
          "source": "export function average(xs: number[]): number {\n  return xs.reduce((a, b) => a + b, 0) / xs.length;\n}\n",
          "output": "",
          "explanation": "The buggy function. `xs: number[]` means a list of numbers. Nothing here checks for an empty list."
        },
        {
          "language": "typescript",
          "filename": "demo-bug.ts",
          "source": "import { average } from \"./src/stats.ts\";\n\nconsole.log(average([2, 4]), average([]));\n",
          "output": "3 NaN",
          "explanation": "Run it with `node demo-bug.ts`. The first call works (6 / 2 = 3). The second prints NaN because 0 / 0 is NaN. Note the `.ts` extension in the import, which Node requires when it runs TypeScript directly."
        },
        {
          "language": "markdown",
          "filename": ".pi/prompts/triage.md",
          "source": "---\ndescription: Triage and fix an issue file\nargument-hint: \"<issue-file>\"\n---\nRead $1. Find the relevant code with grep/find. Write a failing test first, then fix the code, run node --test test/*.test.ts, and finish with a summary: cause, fix, files changed, test result.\n",
          "output": "",
          "explanation": "Save as `.pi/prompts/triage.md`. The file name `triage` becomes the command `/triage`, and `$1` becomes `issues/42.md` when you run `/triage issues/42.md`. The template lists all six stages in order, in one paragraph the model can follow."
        }
      ],
      "productionNote": "The same pattern powers issue bots (a program that reads a newly filed issue and proposes a fix) and on-call helpers (assistants for the engineer who is on duty to respond to outages). In production the output is a proposal that a human reviews, never an unreviewed change.",
      "commonMistakes": [
        "Letting the agent fix the code before reproducing the bug. Without a failing test first you cannot know the fix addressed the reported problem.",
        "Accepting a summary that has no test evidence. The final summary must quote the test result, for example the pass and fail counts.",
        "Forgetting to trust the project, so the project-level prompt template in `.pi/prompts/` is not loaded and `/triage` does not exist."
      ],
      "sources": [
        {
          "title": "Pi docs: prompt templates",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/prompt-templates.md"
        },
        {
          "title": "GitHub CLI manual: gh issue view",
          "url": "https://cli.github.com/manual/gh_issue_view"
        }
      ]
    },
    {
      "id": "finding-relevant-code",
      "title": "Finding relevant code",
      "explanation": "Stage 2 of the workflow is locating the code. The rule is: search first, read second. A real project can hold thousands of files, and every file the agent reads is added to the context window (the limited amount of text the model can see, from topic 04). Reading everything wastes money and pushes useful information out. Searching first finds the few files that matter.\n\n`grep` is a command that prints every line of the files you give it that matches a pattern. `-r` means recursive (look inside folders too) and `-n` means show line numbers. Each result has the form `file:line:text`, which is exactly the evidence you want to ask the agent for. Run it in Git Bash from `~/pi-lab`.\n\nBe specific. Searching for the word `average` in a big project returns hundreds of lines; searching for `function average` returns the definition. When you search from the project root, add `--exclude-dir=node_modules` so grep skips the folder where npm stores downloaded packages (thousands of files that are not your code).\n\nThe agent can use bash for this, or Pi's own `grep`, `find` and `ls` tools (topic 06). Those three are not enabled by default, so start Pi with `-t` (the tool allowlist) or set `defaultTools` in settings. In your prompt, ask for evidence: \"Give file:line for each place you will change.\" Then the agent must have actually looked.",
      "analogy": "Using the index at the back of a book before reading chapters. You look up the word, get the page numbers, and read only those pages instead of the whole book.",
      "code": [
        {
          "language": "bash",
          "filename": "search.sh",
          "source": "grep -rn \"function average\" src",
          "output": "src/stats.ts:1:export function average(xs: number[]): number {",
          "explanation": "The output says: file `src/stats.ts`, line 1, followed by the matching line. Now the agent can read just that file. Run this in Git Bash from `~/pi-lab`."
        },
        {
          "language": "bash",
          "filename": "pi-search.sh",
          "source": "pi -t read,grep,find,ls -p \"Where is average defined? Reply with file:line only.\"",
          "output": "",
          "explanation": "Starts Pi in print mode with only read-only search tools enabled (`-t` is an allowlist). The reply is generated by the model, so we do not show it, but it should name `src/stats.ts:1`."
        }
      ],
      "productionNote": "In large repositories search-first is mandatory: the whole code base will never fit in the context window, and reading it would cost far too many tokens. Teams often give agents a search tool and a short list of conventions about where code lives.",
      "commonMistakes": [
        "Letting the agent search or read inside `node_modules`, which floods the context with code you did not write.",
        "Using a pattern that is too broad (such as one common word), which returns hundreds of matches and hides the relevant one.",
        "Asking the agent to \"look around\" without asking for file:line evidence, so you cannot check its claims."
      ],
      "sources": [
        {
          "title": "Pi docs: CLI",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md"
        },
        {
          "title": "GNU grep manual",
          "url": "https://www.gnu.org/software/grep/manual/grep.html"
        }
      ]
    },
    {
      "id": "fix-and-test-with-node-test",
      "title": "Proposing a fix & running tests (node:test)",
      "explanation": "A test is a small program that checks your code and reports pass or fail. Node.js ships a test runner, so you need to install nothing. You import `test` from `node:test` (the `node:` prefix marks a built-in module) and `assert` from `node:assert/strict`, Node's built-in checking functions. The `/strict` version compares values exactly.\n\nEach `test(name, function)` call is one test. Inside, `assert.equal(actual, expected)` fails if the two values differ. `assert.throws(function, pattern)` calls the function and fails if it does NOT throw an error, or if the error message does not match the pattern. A pattern like `/average of empty list/` is a regular expression (a compact way to describe text to search for); here it simply means \"the message contains these words\".\n\nRun the tests with `node --test test/stats.test.ts`. Node strips the TypeScript types as in topic 02, so no build step is needed (the lab's `package.json` from topic 02 already marks the project as ES modules). The command exits with exit code 0 (a number every program returns when it ends; 0 means success, anything else means failure) when all tests pass, which lets scripts and agents detect the result automatically.\n\nThe key habit is writing the failing test first. Before the fix, the `average of empty list throws` test must fail, because the function returns NaN instead of throwing. That failure proves the test really detects the bug. After the fix, the same test passes, proving the fix works. A test that never failed proves nothing.\n\nThe full output of Node's runner is long. The examples below use `--test-reporter=tap` (TAP is a plain-text test report format) and `grep` to keep only the summary lines that start with `# pass` and `# fail`.",
      "analogy": "Testing a smoke alarm. You press the test button first: if it does not beep, you know the alarm is broken. A test that has never failed is like an alarm you never pressed. It might work, but you have no evidence.",
      "code": [
        {
          "language": "typescript",
          "filename": "test/stats.test.ts",
          "source": "import { test } from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { average } from \"../src/stats.ts\";\n\ntest(\"average of numbers\", () => {\n  assert.equal(average([2, 4]), 3);\n});\n\ntest(\"average of empty list throws\", () => {\n  assert.throws(() => average([]), /average of empty list/);\n});\n",
          "output": "",
          "explanation": "Two tests. The first checks normal behaviour, the second encodes the issue. The import path ends in `.ts` because Node needs the real file name."
        },
        {
          "language": "bash",
          "filename": "run-before-fix.sh",
          "source": "node --test --test-reporter=tap test/stats.test.ts | grep -E \"^# (pass|fail)\"",
          "output": "# pass 1\n# fail 1",
          "explanation": "Before the fix: one test passes and one fails. The failing one is the empty-list test, because `average([])` returned NaN instead of throwing."
        },
        {
          "language": "typescript",
          "filename": "src/stats.ts",
          "source": "export function average(xs: number[]): number {\n  if (xs.length === 0) throw new Error(\"average of empty list\");\n  return xs.reduce((a, b) => a + b, 0) / xs.length;\n}\n",
          "output": "",
          "explanation": "The fix adds a guard at the top: an empty list now throws an Error with the exact message the issue asked for."
        },
        {
          "language": "bash",
          "filename": "run-after-fix.sh",
          "source": "node --test --test-reporter=tap test/stats.test.ts | grep -E \"^# (pass|fail)\"",
          "output": "# pass 2\n# fail 0",
          "explanation": "After the fix both tests pass. In the triage summary the agent should quote this result."
        }
      ],
      "productionNote": "An agent that changes code must prove the change with tests, and the proof should come from a command it ran, not from its own claim. Many teams also make the test command the single required check before any agent-written change is accepted.",
      "commonMistakes": [
        "The agent edits the test until it passes instead of fixing the code. Say in the prompt: \"do not change existing tests\", and check the diff.",
        "Forgetting `.ts` in an import such as `../src/stats.ts`. Node then reports it cannot find the module.",
        "Never running the test before the fix, so you cannot tell whether the test would have caught the bug."
      ],
      "sources": [
        {
          "title": "Node.js docs: test runner",
          "url": "https://nodejs.org/docs/latest-v26.x/api/test.html"
        },
        {
          "title": "Node.js docs: assert",
          "url": "https://nodejs.org/docs/latest-v26.x/api/assert.html"
        }
      ]
    },
    {
      "id": "detecting-failed-tool-calls",
      "title": "Detecting failed tool calls",
      "explanation": "Real tools fail: a file is missing, a network call times out, input fails validation. The agent sees the error text and can react, but your extension can react too, if it can detect failure. Pi gives you the signal: every `tool_result` event (fired after each tool finishes, topic 10) has `event.isError`, which is `true` when the tool threw an error or returned `isError: true`. Blocked calls and calls with invalid arguments do not reach `tool_result`; to observe every finalized call, including those, use `tool_execution_end` (it carries the same flag). The JSON event stream from topic 07 shows `tool_execution_end` too.\n\nA single failure is normal and the model will often fix it itself. What matters is repetition, so we count consecutive failures per tool. Use a `Map` (a collection that stores a value for each key, here the tool name and its failure count). On an error add 1 to that tool's count. On a success reset it to 0. `fails.get(name) ?? 0` means \"the stored count, or 0 if there is none yet\".\n\nThe first example is a pure helper function that you can run with `node bump.ts` to see the counting logic. The second is the same logic inside an extension, using `pi.on(\"tool_result\", ...)` and `ctx.ui.notify` (topic 08) to show a message in Pi.",
      "analogy": "The warning lights on a car dashboard, counted per system. One flicker of the oil light means little, but the same light on for the third day in a row means stop. Each light has its own counter and goes back to zero when the problem is fixed.",
      "code": [
        {
          "language": "typescript",
          "filename": "bump.ts",
          "source": "function bump(m: Map<string, number>, tool: string, err: boolean): number {\n  const n = err ? (m.get(tool) ?? 0) + 1 : 0;\n  m.set(tool, n);\n  return n;\n}\n\nconst m = new Map<string, number>();\nconsole.log(bump(m, \"bash\", true), bump(m, \"bash\", true), bump(m, \"bash\", false));\n",
          "output": "1 2 0",
          "explanation": "Two errors in a row give 1 then 2. The success resets the count to 0. The three calls run left to right, and console.log prints the three numbers separated by spaces."
        },
        {
          "language": "typescript",
          "filename": "recovery.ts",
          "source": "import type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\n\nexport default function (pi: ExtensionAPI) {\n  const fails = new Map<string, number>();\n\n  pi.on(\"tool_result\", async (event, ctx) => {\n    const n = event.isError ? (fails.get(event.toolName) ?? 0) + 1 : 0;\n    fails.set(event.toolName, n);\n    if (event.isError) {\n      ctx.ui.notify(`${event.toolName} failed (${n} in a row)`, \"warning\");\n    }\n  });\n}\n",
          "output": "",
          "explanation": "Save as `~/pi-lab/.pi/extensions/recovery.ts` and run `/reload` in Pi. Each failing tool shows a notice with its consecutive-failure count. Counting per `event.toolName` keeps a failing `bash` from hiding behind a working `read`."
        }
      ],
      "productionNote": "Failure counters feed alerting (telling a human when something is wrong) and auto-recovery (the agent changes its approach without a human). Per-tool counts also reveal which tool in your agent is unreliable.",
      "commonMistakes": [
        "Counting all tools together: three unrelated failures from three different tools are not the same signal as one tool failing three times.",
        "Never resetting the counter on success, so an old failure from an hour ago triggers a give-up later.",
        "Assuming a tool result that looks fine was a success without checking `event.isError`."
      ],
      "sources": [
        {
          "title": "Pi docs: extensions (tool_result event)",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md"
        },
        {
          "title": "Pi docs: JSON event stream",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/json.md"
        }
      ]
    },
    {
      "id": "retry-fallback-give-up",
      "title": "Retry, fallback & giving up cleanly",
      "explanation": "Now turn the counter into a policy with three steps. 1) First failure: do nothing, because the model reads the error text and usually retries by itself. 2) Second consecutive failure of the same tool: send the model a steering message suggesting a fallback, meaning a different approach such as another tool or a smaller input. 3) Third consecutive failure: give up. Stop the run and tell the user what failed.\n\nThe steering message uses `pi.sendMessage({ customType, content, display }, { deliverAs: \"steer\" })`. `customType` is a label you choose (\"recovery\"), `content` is the text the model sees, and `display: true` also shows it in the interface. `deliverAs: \"steer\"` delivers it while the agent is still running, so the model reads it before its next step. Giving up uses `ctx.abort()` (from topic 15) to stop the run, and `ctx.ui.notify` to leave a clear message.\n\nTwo different kinds of retry exist, and you should keep them apart. Pi itself already retries provider errors (for example a temporary failure of the model service); its setting `retry.maxRetries` defaults to 3. Inside your own tools, retry only transient errors, meaning errors that may disappear if you wait, such as HTTP 429 (too many requests) or 5xx (server-side failures). Do not retry permanent errors such as 404 (not found) or validation failures, because the same request will fail the same way.\n\nWhen you do retry, use exponential backoff: wait longer after each attempt, doubling the delay. The second example computes delays of 500, 1000 and 2000 milliseconds. A real tool would wait that long between attempts and stop after a fixed number of tries.",
      "analogy": "A phone call you really need to make. You redial once (the model retries), then switch to email (the fallback), and if that bounces too you leave a clear voicemail explaining what happened and stop. You never stand there redialling forever.",
      "code": [
        {
          "language": "typescript",
          "filename": "recovery.ts",
          "source": "import type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\n\nexport default function (pi: ExtensionAPI) {\n  const fails = new Map<string, number>();\n\n  pi.on(\"tool_result\", async (event, ctx) => {\n    const n = event.isError ? (fails.get(event.toolName) ?? 0) + 1 : 0;\n    fails.set(event.toolName, n);\n\n    if (n === 2) {\n      pi.sendMessage(\n        {\n          customType: \"recovery\",\n          content: `${event.toolName} failed twice. Try a different approach (another tool or smaller input) or ask the user.`,\n          display: true,\n        },\n        { deliverAs: \"steer\" },\n      );\n    }\n\n    if (n >= 3) {\n      ctx.ui.notify(`Giving up: ${event.toolName} failed ${n} times in a row.`, \"error\");\n      ctx.abort();\n    }\n  });\n}\n",
          "output": "",
          "explanation": "Replace `~/pi-lab/.pi/extensions/recovery.ts` with this version and run `/reload`. At 2 consecutive failures the model is steered; at 3 the run is aborted with a visible notice. Because a success resets the count to 0, a tool that recovers never reaches the give-up step."
        },
        {
          "language": "typescript",
          "filename": "backoff.ts",
          "source": "const delays = [0, 1, 2].map((i) => 500 * 2 ** i);\nconsole.log(delays);\n",
          "output": "[ 500, 1000, 2000 ]",
          "explanation": "`2 ** i` means 2 to the power i, so the values are 500 x 1, 500 x 2 and 500 x 4. `map` builds a new array by applying the function to each item. Run it with `node backoff.ts`."
        }
      ],
      "productionNote": "Unattended agents (running in a scheduled job with nobody watching) must fail loudly rather than loop. Always put a hard limit on attempts, and make the final failure message say which tool failed and how many times, so a person can act on it.",
      "commonMistakes": [
        "Retrying without a limit, so a permanently broken tool burns tokens and money forever.",
        "Retrying non-transient errors such as 404 or validation failures. Fix the input or change approach instead.",
        "Giving up silently. Without a notice the user cannot tell a finished run from an aborted one."
      ],
      "sources": [
        {
          "title": "Pi docs: extensions (pi.sendMessage)",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md"
        },
        {
          "title": "Pi docs: settings",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/settings.md"
        }
      ]
    },
    {
      "id": "checkpoint-recovery",
      "title": "Checkpoint: recovery from a failed tool call",
      "explanation": "This Week 4 checkpoint proves your agent recovers. We use a deliberately unreliable tool, `flaky_status`, whose failure is deterministic (fully predictable, not random): it fails on its first call and succeeds afterwards. Testing a system by breaking parts of it on purpose is called chaos testing.\n\nThe error message matters. It says \"retry once\", so the model knows the failure is temporary and the right response is to try again. Save the extension below as `~/pi-lab/.pi/extensions/flaky.ts` (next to `recovery.ts`), run `/reload`, then ask: `Check the status with flaky_status`. The tool takes no parameters, so its schema is an empty `Type.Object({})`.\n\nRun 1 passes when the trace (use `pi --mode json` and the trace reader from topic 07) shows an error result followed by a successful retry, for example `RESULT flaky_status error=true` then `RESULT flaky_status error=false`, and the final answer mentions `status: ok`. The wording of the final answer is the model's own and will vary. The recovery notice must NOT appear, because only one failure happened and the counter never reached 2.\n\nRun 2: change `calls === 1` to `calls <= 3` so the tool fails three times, and start a fresh session. Now the second failure should trigger the steering message and the third failure the give-up notice. It passes when the run ends with that clear notice and the agent does not keep calling the tool. Remember that `calls` lives in memory, so restart Pi (or use `/reload`) to reset it between runs.",
      "analogy": "A fire drill. The alarm is fake, but the response must be real: people have to follow the exit plan. In the same way the failure is staged, but the agent's retry or clean give-up must really happen.",
      "code": [
        {
          "language": "typescript",
          "filename": "flaky.ts",
          "source": "import type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\nimport { Type } from \"typebox\";\n\nexport default function (pi: ExtensionAPI) {\n  let calls = 0;\n\n  pi.registerTool({\n    name: \"flaky_status\",\n    label: \"Flaky Status\",\n    description: \"Return service status. May fail temporarily; retry once if it does.\",\n    parameters: Type.Object({}),\n    async execute() {\n      calls++;\n      if (calls === 1) {\n        throw new Error(\"Temporary failure: service warming up, retry once.\");\n      }\n      return { content: [{ type: \"text\", text: \"status: ok\" }], details: { calls } };\n    },\n  });\n}\n",
          "output": "",
          "explanation": "Throwing inside `execute` makes the result an error (`isError` is true), as in topic 09. The error text tells the model what to do next. On the second call the tool returns `status: ok`."
        },
        {
          "language": "bash",
          "filename": "run-checkpoint.sh",
          "source": "pi --mode json \"Check the status with flaky_status\" > events.jsonl",
          "output": "",
          "explanation": "Saves the event stream to `events.jsonl`. Read it with your trace reader and look for one failed `flaky_status` result followed by a successful one. Nothing is printed to the terminal because the output was redirected into the file."
        }
      ],
      "productionNote": "Chaos testing for agents means injecting failures (a tool that errors, a slow response) in a controlled test and checking that the agent behaves well. Run it before shipping, because real services fail at the worst moments.",
      "commonMistakes": [
        "Writing tool error text that does not say what to do next. A message such as \"failed\" gives the model nothing to act on; \"retry once\" does.",
        "Testing only the happy path, so the first real failure is also the first time you see how the agent behaves.",
        "Forgetting that the `calls` counter lives in memory and is not reset between runs, which makes the second run start in the wrong state."
      ],
      "sources": [
        {
          "title": "Pi docs: extensions (tool definition)",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md"
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Why should the agent write a failing test before it fixes the code?",
      "options": [
        "Because Node refuses to run tests that pass on the first try",
        "The failure proves the test really detects the bug, so the later pass proves the fix works",
        "Because the fix can only be written once the test file exists on disk",
        "To make the agent run for more turns and so be more thorough"
      ],
      "answerIndex": 1,
      "explanation": "A test that has never failed might not detect the bug at all. Seeing it fail first and pass after the fix is the evidence that the fix works."
    },
    {
      "question": "Which field on a `tool_result` event tells your extension that the tool call failed?",
      "options": [
        "event.exitCode",
        "event.status",
        "event.isError",
        "event.retryCount"
      ],
      "answerIndex": 2,
      "explanation": "`event.isError` is `true` when the tool threw an error or returned `isError: true`. The other names are not fields that the event provides for this purpose."
    },
    {
      "question": "A per-tool consecutive-failure counter sees: error, error, success. What is its value at the end?",
      "options": [
        "0",
        "1",
        "2",
        "3"
      ],
      "answerIndex": 0,
      "explanation": "The counter reaches 2 after two errors, then a success resets it to 0."
    },
    {
      "question": "In which case should you NOT automatically retry a failed call?",
      "options": [
        "HTTP 429 (too many requests)",
        "HTTP 503 (server temporarily unavailable)",
        "A network connection that dropped for a moment",
        "HTTP 404 (not found) because the requested thing does not exist"
      ],
      "answerIndex": 3,
      "explanation": "A 404 is permanent: repeating the same request gives the same result. Retries are for transient errors that may go away, such as 429 and 5xx."
    },
    {
      "question": "What evidence shows the Week 4 checkpoint passed in run 1?",
      "options": [
        "The final answer says \"status: ok\" and nothing else is checked",
        "The trace shows an error result for flaky_status, then a successful retry, then a correct final answer, with no give-up notice",
        "The recovery extension printed a give-up notice",
        "The tool succeeded on its first call"
      ],
      "answerIndex": 1,
      "explanation": "Recovery means a failure followed by a successful retry, visible in the trace. A give-up notice would mean the run failed, and a first-call success means no failure was tested."
    }
  ]
});
