window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "22-code-review-agent",
  "order": 22,
  "title": "Portfolio: Code Review Agent",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "Build your first portfolio project (a small project you show to employers as evidence of your skills): an agent that reviews a git branch the way a teammate would. It reads the diff (the list of changed lines), checks the repo's written rules, runs the tests, and files its findings as structured JSON. You then measure it with an eval, change one thing, and measure again.",
  "prerequisites": ["21-sdk-packages"],
  "subtopics": [
    {
      "id": "reading-a-pr-diff",
      "title": "Reading a PR diff with git",
      "explanation": "A pull request (PR) is a proposal to merge the changes on one git branch into another, usually into main. Teammates review the PR before it is merged. The thing a reviewer reads is a diff: for every changed file, the lines that were removed (marked with `-`) and the lines that were added (marked with `+`). Each block of changes is called a hunk and starts with a hunk header such as `@@ -10,6 +10,8 @@`. It means: in the old file this hunk covers 6 lines starting at line 10, and in the new file it covers 8 lines starting at line 10. A brand-new file has the header `@@ -0,0 +1,5 @@`: nothing before, five lines after.\n\nIn this topic you build a new project, `~/pi-review-agent/`, that holds the review agent. Set it up once. Open Git Bash (not PowerShell) for the bash blocks in this topic, as in topic 01, and run the commands in the first code block below. They create the project folder with three sub-folders: `extensions/` for the code, `skills/` for the review procedure, and `evals/` for the measurements.\n\nThe agent needs a branch to review. In your `pi-lab` repo you create a branch called `feature/median` that adds a function `median` with a deliberate bug: it forgets to sort the numbers first. It also has no test. You commit it. (If your default branch is called `master` instead of `main`, use that name everywhere below.)\n\nTo compare a branch with main, git offers two notations. `git diff main...HEAD` (three dots) shows what changed on the current branch since it left main. `HEAD` means the commit you are currently on. `git diff main..HEAD` (two dots) compares the two tips directly, so changes that landed on main after you branched show up too, reversed. For reviewing a PR you want three dots.\n\nNow the tool. `get_diff` takes one optional parameter, `base`, which defaults to `\"main\"`. Its `execute` function calls `pi.exec`, Pi's way to run a program. `pi.exec(command, args, options)` takes the program name and an array of arguments, and returns an object with `stdout`, `stderr`, `code` (the exit code: 0 means success, anything else means failure) and `killed`. It does not use a shell, so the argument array is passed to git exactly as written and nothing in it can be interpreted as extra commands.\n\nThe tool also validates `base` before using it. A regular expression (a pattern that describes allowed text) `/^[\\w./-]+$/` accepts only letters, digits, `_`, `.`, `/` and `-`. That pattern still allows a leading `-`, and git would read a value like `--output=x` as an option instead of a branch name, so the tool rejects a leading `-` too. Finally, the diff can be huge, so the result goes through `truncateHead`, a helper from topic 08's truncation family that keeps the first 2000 lines or 50 KB, whichever limit is hit first, so the diff cannot flood the model's context window.",
      "analogy": "A diff is the tracked-changes view in a word processor: deleted text appears in red with a strikethrough, inserted text in green. The reviewer does not reread the whole document, only the marked changes. The three-dot form is like asking the editor to show only the edits you made since you copied the document, not edits your colleague made to the original in the meantime.",
      "code": [
        {
          "language": "bash",
          "filename": "setup.sh",
          "source": "mkdir -p ~/pi-review-agent/extensions ~/pi-review-agent/skills/code-review ~/pi-review-agent/evals\ncd ~/pi-lab\ngit switch main\ngit switch -c feature/median",
          "output": "Switched to branch 'main'\nSwitched to a new branch 'feature/median'",
          "explanation": "The first line creates the review project's folders (`-p` makes parent folders as needed). Then you move into your lab repo, make sure you are on main, and create and switch to the new branch `feature/median`. On a fresh clone that is already on main, the first `git switch` may print `Already on 'main'` instead."
        },
        {
          "language": "typescript",
          "filename": "src/stats.ts",
          "source": "export function median(nums: number[]): number {\n  const mid = Math.floor(nums.length / 2);\n  if (nums.length % 2 === 1) return nums[mid];\n  return (nums[mid - 1] + nums[mid]) / 2;\n}",
          "output": "",
          "explanation": "Create this new file in `~/pi-lab/src/` (the folder that already holds `math.ts`). The bug is on purpose: a median needs the numbers in sorted order, and this function never sorts `nums`. The file has exactly 5 lines, so git will count 5 insertions."
        },
        {
          "language": "bash",
          "filename": "seed-branch.sh",
          "source": "git add src/stats.ts\ngit commit -q -m \"Add median\"\ngit diff main...HEAD --stat",
          "output": " src/stats.ts | 5 +++++\n 1 file changed, 5 insertions(+)",
          "explanation": "Run these from `~/pi-lab`. `-q` makes the commit quiet. `--stat` asks git for a summary instead of the full diff: one line per file with the number of changed lines, then a total. This is the diff your agent will review."
        },
        {
          "language": "typescript",
          "filename": "extensions/review.ts",
          "source": "import {\n  DEFAULT_MAX_BYTES,\n  DEFAULT_MAX_LINES,\n  truncateHead,\n  type ExtensionAPI,\n} from \"@earendil-works/pi-coding-agent\";\nimport { Type } from \"typebox\";\n\nexport default function (pi: ExtensionAPI) {\n  pi.registerTool({\n    name: \"get_diff\",\n    label: \"Get diff\",\n    description:\n      \"Return the git diff of the current branch against a base branch (default main). \" +\n      \"Shows only the changes made on this branch. Read-only.\",\n    promptSnippet: \"Show the diff of the current branch against a base branch\",\n    parameters: Type.Object({\n      base: Type.Optional(Type.String({ description: \"Base branch name, default main\" })),\n    }),\n    async execute(_toolCallId, params, signal, _onUpdate, ctx) {\n      const base = params.base ?? \"main\";\n      if (!/^[\\w./-]+$/.test(base) || base.startsWith(\"-\")) {\n        throw new Error(`Invalid base \"${base}\". Use a branch name: letters, digits, _ . / - only, not starting with -.`);\n      }\n      const result = await pi.exec(\"git\", [\"diff\", \"--unified=3\", `${base}...HEAD`], {\n        signal,\n        cwd: ctx.cwd,\n      });\n      if (result.code !== 0) {\n        throw new Error(`git diff failed (exit ${result.code}): ${result.stderr.trim()}`);\n      }\n      if (result.stdout.trim() === \"\") {\n        return { content: [{ type: \"text\", text: `No changes between ${base} and HEAD.` }], details: { base } };\n      }\n      const t = truncateHead(result.stdout, { maxLines: DEFAULT_MAX_LINES, maxBytes: DEFAULT_MAX_BYTES });\n      return { content: [{ type: \"text\", text: t.content }], details: { base, truncated: t.truncated } };\n    },\n  });\n}",
          "output": "",
          "explanation": "Save this as `~/pi-review-agent/extensions/review.ts`. Nothing prints when the file loads. Test it later with `pi -e ~/pi-review-agent/extensions/review.ts` from `~/pi-lab`. `--unified=3` asks git for 3 unchanged lines of context around each change. Errors are thrown, so Pi reports them to the model as a failed tool result with a message the model can act on (topic 09). `ctx.cwd` makes git run in the repo Pi was started in."
        }
      ],
      "productionNote": "The same tool works unchanged in CI (continuous integration: a server that runs your checks on every push). A CI job checks out the PR branch and fetches the base branch, and `git diff base...HEAD` then gives the same view a human reviewer sees. Always keep the validation and the argument array, because in CI the branch name can come from outside your team.",
      "commonMistakes": [
        "Using `main..HEAD` (two dots) when you mean `main...HEAD` (three dots). Two dots also shows changes that landed on main after you branched, in reverse, which makes the review confusing.",
        "Building a shell string such as `git diff ${base}...HEAD` and running it through a shell. A value like `main; rm -rf .` would then run as extra commands. `pi.exec` with an argument array uses no shell, and the validation regex is a second layer.",
        "Letting the tool return the whole diff of a huge change. Without `truncateHead` the output can fill the model's context window; always cap it."
      ],
      "sources": [
        { "title": "git diff documentation", "url": "https://git-scm.com/docs/git-diff" },
        { "title": "Pi extensions: pi.exec", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#piexeccommand-args-options" }
      ]
    },
    {
      "id": "checking-repo-conventions",
      "title": "Checking repo conventions (AGENTS.md)",
      "explanation": "Conventions are the written rules of a repo: how things are named, which language features are banned, what must be tested. A good reviewer checks a change against them, not against personal taste.\n\nYou met `AGENTS.md` in topic 05: Pi loads it automatically from the working folder and its parents and puts it in front of the model. That means your reviewer already knows the rules without any extra code. You only have to write rules that can be checked.\n\nCompare two rules. `Write clean code` cannot be checked: two reviewers will disagree on what it means. `Every new exported function in src/ needs a test in test/` can be checked by reading the diff: find each added `export function` and look for a matching test. Write rules in this checkable form, and keep them from contradicting each other, because a model given two conflicting rules will pick one unpredictably.\n\nAlso ask the reviewer to quote the rule it applied. A finding that says `median has no test (AGENTS.md: every new exported function needs a test)` can be verified in seconds; a finding that says `bad practice` cannot.\n\nThe rule file lives on `main`, so first add it there, then bring your branch up to date. `git rebase main` replays your branch's commit on top of the latest main, so the branch now contains the new AGENTS.md while its diff against main still shows only `src/stats.ts`.",
      "analogy": "A building inspector walks through a new house with the city building code open on the clipboard. Every defect reported cites a section number. The inspector does not say \"this feels unsafe\"; they say \"section 4.2: stair rise exceeds the limit.\" AGENTS.md is the code book, and the quoted rule is the section number.",
      "code": [
        {
          "language": "markdown",
          "filename": "AGENTS.md",
          "source": "# pi-lab conventions\n\n- Use `const` or `let`, never `var`.\n- Do not use TypeScript `enum`; use a union of string literals instead.\n- Every new exported function in src/ needs a test in test/.",
          "output": "",
          "explanation": "Open `AGENTS.md` in the root of `~/pi-lab` (create it if topic 05's version is not there) and make sure these rules are present. The last line is the one the review will use. Each rule is short, specific and checkable from a diff."
        },
        {
          "language": "bash",
          "filename": "update-branch.sh",
          "source": "git switch main\ngit add AGENTS.md\ngit commit -q -m \"Require tests for new exports\"\ngit switch feature/median\ngit rebase main",
          "output": "Switched to branch 'main'\nSwitched to branch 'feature/median'\nSuccessfully rebased and updated refs/heads/feature/median.",
          "explanation": "Commit the rule on main, return to the feature branch and rebase. If your AGENTS.md was already committed and unchanged, `git commit` finds nothing to commit; in that case skip the rebase."
        },
        {
          "language": "typescript",
          "filename": "finding-line.ts",
          "source": "const finding = {\n  file: \"src/stats.ts\",\n  severity: \"medium\",\n  message: \"median has no test (AGENTS.md: every new exported function needs a test)\",\n};\nconsole.log(`${finding.file} [${finding.severity}] ${finding.message}`);",
          "output": "src/stats.ts [medium] median has no test (AGENTS.md: every new exported function needs a test)",
          "explanation": "This is the kind of finding you expect for the seeded branch. The wording will vary from run to run, but the file, a sensible severity and the quoted rule should be there. Run it with `node finding-line.ts`."
        }
      ],
      "productionNote": "A shared AGENTS.md makes reviews consistent across a team: the same rules are applied to every PR, by the agent and by humans. Review the rule file itself like code, and delete rules nobody follows. Rules that cannot be checked from a diff only add noise.",
      "commonMistakes": [
        "Writing vague rules such as \"write clean code\" or \"keep it simple\". The reviewer cannot point to a line that breaks them, so it either ignores them or invents nitpicks.",
        "Keeping conflicting rules, for example \"always add comments\" and \"never add comments\". The agent will follow one or the other at random, and the reviews become inconsistent.",
        "Not asking for the rule to be quoted in the finding. Without the quote you cannot tell whether the agent used your rules or its own opinion."
      ],
      "sources": [
        { "title": "Pi configuration: context files", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/configuration.md" },
        { "title": "AGENTS.md", "url": "https://agents.md/" }
      ]
    },
    {
      "id": "run-tests-tool",
      "title": "A run-tests tool",
      "explanation": "A reviewer who only reads code can miss bugs that a test run would show immediately. The `run_tests` tool lets the agent run the project's tests and see the result.\n\nIt takes no parameters. Its `execute` calls `pi.exec(\"node\", [\"--test\"], { signal, cwd: ctx.cwd, timeout: 120_000 })`. `node --test` is the built-in test runner from topic 17; with no file names it looks for test files in the project, including those in `test/`. The `timeout` option is in milliseconds: after 120 seconds (`120_000`, where `_` is just a digit separator for readability) Pi stops the process and the result has `killed: true`. Without a timeout, one test stuck in an endless loop would hang the whole review.\n\nTest output can be very long, and only the end usually matters (the failure summary). So the tool uses `truncateTail`, the mirror image of `truncateHead`: it keeps the last lines instead of the first. Here it keeps the last 100 lines.\n\nOne design decision is easy to get wrong. When tests fail, the tool does not set `isError`. `isError` means the tool itself broke, for example the program could not start. A failing test is not a broken tool: it is exactly the evidence a reviewer is looking for, and the agent should read it and report it as a finding. So the result always carries the text, and `details: { code, killed }` records the exit code and the timeout flag for later analysis (for example in the eval).\n\nThe small helper `summary` turns the exit code and the `killed` flag into a one-line headline. It is a plain function, so you can run it on its own to check it.",
      "analogy": "A car inspector who only reads the spec sheet can be fooled by a car that does not actually start. A good inspector also takes it for a test drive. If the engine stalls, that is not the inspector's equipment failing; it is the finding that goes on the report.",
      "code": [
        {
          "language": "typescript",
          "filename": "extensions/review.ts",
          "source": "// add to the imports at the top of review.ts:\nimport { truncateTail } from \"@earendil-works/pi-coding-agent\";\n\nconst summary = (code: number, killed: boolean) =>\n  killed ? \"tests timed out\" : code === 0 ? \"tests passed\" : `tests failed (exit ${code})`;\n\n// add inside the factory function, after the get_diff tool:\npi.registerTool({\n  name: \"run_tests\",\n  label: \"Run tests\",\n  description:\n    \"Run the project's tests with node --test. Returns the exit code and the last 100 lines of output. \" +\n    \"Failing tests are reported in the result; they are not a tool error.\",\n  parameters: Type.Object({}),\n  async execute(_toolCallId, _params, signal, _onUpdate, ctx) {\n    const r = await pi.exec(\"node\", [\"--test\"], { signal, cwd: ctx.cwd, timeout: 120_000 });\n    const tail = truncateTail(`${r.stdout}\\n${r.stderr}`, { maxLines: 100, maxBytes: DEFAULT_MAX_BYTES });\n    return {\n      content: [{ type: \"text\", text: `${summary(r.code, r.killed)}\\n\\n${tail.content}` }],\n      details: { code: r.code, killed: r.killed },\n    };\n  },\n});",
          "output": "",
          "explanation": "These are two additions to the file you already have, not a new file. The top lines go with the other imports; the `summary` helper goes above the `export default function`; the `pi.registerTool` call goes inside the function. Combining `stdout` and `stderr` makes sure the failure text is included whichever stream the runner wrote it to."
        },
        {
          "language": "typescript",
          "filename": "summary.ts",
          "source": "const summary = (code: number, killed: boolean) =>\n  killed ? \"tests timed out\" : code === 0 ? \"tests passed\" : `tests failed (exit ${code})`;\n\nconsole.log(summary(0, false), \"|\", summary(1, false), \"|\", summary(143, true));",
          "output": "tests passed | tests failed (exit 1) | tests timed out",
          "explanation": "The `killed` check comes first: a process stopped by the timeout has some non-zero code, but the useful message is that it timed out. Run it with `node summary.ts`."
        }
      ],
      "productionNote": "Evidence-based reviews are far more trustworthy than reading-only reviews, because the agent can say \"I ran the tests and 2 failed\" instead of guessing. Note that `node --test` executes the repo's own code, so on untrusted PRs run the whole agent inside a container or disposable CI job (topic 19's sandbox idea). The read-only tool list in the later sub-topic limits what the agent itself can do, not what the tests do.",
      "commonMistakes": [
        "Leaving out the timeout. One infinite loop in a test then hangs the review forever.",
        "Returning the full test log. Thousands of lines waste tokens and bury the failure; keep only the tail.",
        "Setting `isError` when tests fail. The model treats the result as a broken tool and may retry or give up, instead of reporting the failing test as a finding."
      ],
      "sources": [
        { "title": "Pi extensions: output truncation", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#output-truncation" },
        { "title": "Node.js test runner", "url": "https://nodejs.org/docs/latest-v26.x/api/test.html" }
      ]
    },
    {
      "id": "structured-findings",
      "title": "Structured findings (JSON)",
      "explanation": "A review written as free text is hard to use: you cannot count the problems, post them as comments on exact lines, or score them automatically. So the agent must finish by calling a tool that only accepts structured data. This final tool is `submit_review`.\n\nIts parameters are a `summary` string and a `findings` array. Each finding has a `file`, a `line` (a number, at least 1), a `severity` that must be one of `\"high\"`, `\"medium\"`, `\"low\"` (a list of allowed strings, made with `StringEnum`), a `message`, and an optional `suggestion`. The schema is a format guarantee: Pi validates the model's arguments against it (topic 08), and a call with a wrong severity or a missing file is rejected before `execute` runs.\n\nWhen it passes, `execute` writes the review to `review.json` in the repo with `JSON.stringify(params, null, 2)` (the `2` means two-space indentation, to be readable) and returns `terminate: true`. Topic 06 introduced `terminate`: it tells Pi that this tool result is the final answer, so the run ends here instead of making one more model call just to say \"done\".\n\n`promptGuidelines` adds a line to the system prompt: `Use submit_review exactly once at the end of a review.` Without it, models sometimes call the tool several times or forget it.\n\nThe code below also includes a small runnable check of the data shape: it counts findings and the `high` ones, which is the kind of number a CI job could use to block a merge.",
      "analogy": "A standardized inspection form instead of a handwritten letter: fixed boxes for location, severity and description, filed once at the end of the visit. Because every form has the same boxes, an office can sort them, count them and compare inspectors.",
      "code": [
        {
          "language": "typescript",
          "filename": "extensions/review.ts",
          "source": "// add to the imports at the top of review.ts:\nimport { writeFile } from \"node:fs/promises\";\nimport { join } from \"node:path\";\nimport { StringEnum } from \"@earendil-works/pi-ai\";\n\n// add inside the factory function:\npi.registerTool({\n  name: \"submit_review\",\n  label: \"Submit review\",\n  description:\n    \"File the final structured review. Each finding needs a file, a line number, a severity and a message with evidence.\",\n  promptGuidelines: [\"Use submit_review exactly once at the end of a review.\"],\n  parameters: Type.Object({\n    summary: Type.String({ description: \"One or two sentences on the overall result\" }),\n    findings: Type.Array(\n      Type.Object({\n        file: Type.String({ description: \"Path of the file, as in the diff\" }),\n        line: Type.Number({ minimum: 1, description: \"Line number in the new file\" }),\n        severity: StringEnum([\"high\", \"medium\", \"low\"] as const),\n        message: Type.String({ description: \"What is wrong and why, quoting the AGENTS.md rule if one applies\" }),\n        suggestion: Type.Optional(Type.String({ description: \"A suggested fix\" })),\n      }),\n    ),\n  }),\n  async execute(_toolCallId, params, _signal, _onUpdate, ctx) {\n    await writeFile(join(ctx.cwd, \"review.json\"), JSON.stringify(params, null, 2));\n    return {\n      content: [{ type: \"text\", text: `Review saved to review.json with ${params.findings.length} findings.` }],\n      details: { findings: params.findings.length },\n      terminate: true,\n    };\n  },\n});",
          "output": "",
          "explanation": "Again an addition to `review.ts`: three imports at the top and the tool inside the factory function. `StringEnum` comes from `@earendil-works/pi-ai`. `Type.Number({ minimum: 1 })` rejects line 0 or negative lines."
        },
        {
          "language": "typescript",
          "filename": "count-findings.ts",
          "source": "const review = {\n  summary: \"1 bug, 1 missing test\",\n  findings: [\n    { file: \"src/stats.ts\", line: 2, severity: \"high\", message: \"median does not sort input\" },\n    { file: \"src/stats.ts\", line: 1, severity: \"medium\", message: \"no test for median\" },\n  ],\n};\nconst high = review.findings.filter((f) => f.severity === \"high\").length;\nconsole.log(`${review.findings.length} findings, ${high} high`);",
          "output": "2 findings, 1 high",
          "explanation": "Because every finding has the same fields, counting by severity is one `.filter` and `.length`. With a free-text review you would have to parse sentences. Run it with `node count-findings.ts`."
        }
      ],
      "productionNote": "Once findings are structured data, publishing them is an extension point: a small script can post each finding as a comment on the PR, for example with the GitHub CLI (`gh pr review`) or the GitHub API, one comment per file and line. You do not build that now, but the schema already contains everything such a script needs.",
      "commonMistakes": [
        "Letting the agent answer in free text. Prose reviews cannot be counted, compared or scored, so you cannot tell whether a prompt change made the agent better.",
        "Forgetting `terminate: true`. The run then continues with an extra model call after the review is already filed, which costs tokens and can produce a second, different answer.",
        "Making the schema too loose, for example `severity` as any string. The model will invent values like `critical` or `bad`, and your counting code silently misses them."
      ],
      "sources": [
        { "title": "Pi extensions: tool definition", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#tool-definition" },
        { "title": "Pi example extension: structured-output.ts", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/structured-output.ts" }
      ]
    },
    {
      "id": "skill-plus-extension",
      "title": "Review skill + extension together",
      "explanation": "You now have the tools. The missing piece is the procedure: in what order should the agent use them? That is the job of a skill (topic 13): a `SKILL.md` file with a short description that is always visible to the model and a body that is loaded only when needed.\n\nThe split of responsibilities is simple. The extension provides the instruments: `get_diff`, `run_tests`, `submit_review`. The skill provides the checklist: first get the diff, then read the changed files around each hunk, then check the AGENTS.md rules, then run the tests, then file the review with a file and line as evidence for each finding. It also says what not to do (no style nitpicks) and defines the severity levels. Keep the skill about the procedure; do not repeat the tool descriptions, which the model already sees.\n\nThe extension also adds a `/review` command. `pi.registerCommand` (topic 10) defines it; its handler calls `pi.sendUserMessage`, which sends a message as if the user had typed it. The message starts with `/skill:code-review`, which forces the skill to load (topic 13). The option `expandPromptTemplates: true` makes Pi expand that `/skill:` text instead of treating it as plain words. The base branch comes from the command argument: `/review develop` reviews against `develop`, and plain `/review` falls back to `main`.\n\nFinally, make the reviewer read-only. In a `session_start` handler (topic 10), `pi.setActiveTools` (topic 09) limits the agent to the listed tools. The list has the reading tools (`read`, `grep`, `find`, `ls`) and your three review tools, and leaves out `write`, `edit` and `bash`, so the reviewer cannot change the code it reviews.\n\nTo try it: copy the skill folder into the lab with `cp -r ~/pi-review-agent/skills/code-review ~/pi-lab/.agents/skills/` (create `~/pi-lab/.agents/skills/` first with `mkdir -p`), start Pi in `~/pi-lab` with `pi -e ~/pi-review-agent/extensions/review.ts`, add your guard extension from topic 19 with another `-e` flag, and type `/review main`. Sharing it as an installable Pi package (topic 21) is the next step: the `package.json` shown below lists the `extensions/` and `skills/` folders in the `pi` manifest so that others can run `pi install`.",
      "analogy": "The skill is the inspection checklist on the clipboard: what to check, in what order, how to grade it. The extension is the inspector's instruments: the tape measure, the camera, the form to file. A checklist without instruments cannot be carried out, and instruments without a checklist get used randomly.",
      "code": [
        {
          "language": "markdown",
          "filename": "skills/code-review/SKILL.md",
          "source": "---\nname: code-review\ndescription: Review the current git branch against a base branch and file a structured review. Use when asked to review a diff, a branch or a pull request.\n---\n\n# Code review procedure\n\nFollow these steps in order.\n\n1. Call `get_diff` to see what changed on this branch.\n2. Read the changed files around each hunk to understand the surrounding code.\n3. Check the diff against the rules in AGENTS.md. When a rule is broken, quote it in the finding.\n4. Call `run_tests`. A failing test is evidence; cite it.\n5. Call `submit_review` once, with a file and line number as evidence for every finding.\n\n## What to report\n\n- Report real problems: wrong results, crashes, missing tests required by AGENTS.md, broken rules.\n- Do not report style preferences or formatting.\n- Every finding needs a file and a line. Do not report anything you cannot point to.\n\n## Severity\n\n- high: wrong behavior, crash or data loss.\n- medium: broken AGENTS.md rule or missing test.\n- low: small improvement that does not change behavior.",
          "output": "",
          "explanation": "Save this as `~/pi-review-agent/skills/code-review/SKILL.md`. The `name` must match the folder name, and the `description` tells the model when to use the skill. Note that it does not explain what the tools do; their own descriptions already do that."
        },
        {
          "language": "typescript",
          "filename": "extensions/review.ts",
          "source": "// add inside the factory function:\npi.on(\"session_start\", async () => {\n  pi.setActiveTools([\"read\", \"grep\", \"find\", \"ls\", \"get_diff\", \"run_tests\", \"submit_review\"]);\n});\n\npi.registerCommand(\"review\", {\n  description: \"Review the current branch against a base branch (default main)\",\n  handler: async (args) => {\n    const base = args.trim() || \"main\";\n    pi.sendUserMessage(`/skill:code-review Review the diff against ${base}`, { expandPromptTemplates: true });\n  },\n});",
          "output": "",
          "explanation": "`args` is the text typed after `/review`. `args.trim() || \"main\"` removes spaces and uses `main` when nothing was typed. After this addition `review.ts` has four parts inside its factory function: `get_diff`, `run_tests`, `submit_review`, and this command plus the tool restriction."
        },
        {
          "language": "json",
          "filename": "package.json",
          "source": "{\n  \"name\": \"pi-review-agent\",\n  \"version\": \"0.1.0\",\n  \"type\": \"module\",\n  \"keywords\": [\"pi-package\"],\n  \"pi\": {\n    \"extensions\": [\"./extensions\"],\n    \"skills\": [\"./skills\"]\n  }\n}",
          "output": "",
          "explanation": "Save this in `~/pi-review-agent/`. The `pi-package` keyword and the `pi` manifest are what topic 21 taught for making a folder installable. Packaging is covered fully in topic 23's shipping steps."
        }
      ],
      "productionNote": "A trace of `/review main` on `feature/median` should look like this: `get_diff`, then `read` on `src/stats.ts`, then `run_tests`, then `submit_review`. The resulting `review.json` should contain at least one high finding about the missing sort. The exact wording and line number vary between runs. Keep the reviewer read-only even when you trust it: a reviewer that can edit files will sometimes quietly fix the problem instead of reporting it. Note also that `run_tests` still runs the repo's code, so on untrusted code review inside a container or CI job.",
      "commonMistakes": [
        "Leaving write tools enabled on the reviewer. It may \"fix\" the bug instead of reporting it, and your branch changes during the review.",
        "Copying tool descriptions into the skill. Two places to maintain, and they drift apart. Let the skill describe the order and the rules, and the tool descriptions describe the tools.",
        "Forgetting `expandPromptTemplates: true` in `sendUserMessage`. The `/skill:code-review` text may then be sent to the model as plain words and the skill is not loaded."
      ],
      "sources": [
        { "title": "Pi skills", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md" },
        { "title": "Pi extensions: pi.sendUserMessage", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#pisendusermessagecontent-options" }
      ]
    },
    {
      "id": "eval-before-and-after",
      "title": "Eval before & after a change",
      "explanation": "One successful review proves little. To know whether the agent is good, and whether a change made it better, you measure it, as in topic 18.\n\nCreate five fixture branches (small copies of the repo, each with a known planted bug). For each one, repeat the feature/median steps: `git switch main`, `git switch -c bug-<name>`, add one file with one planted bug, then `git add` and `git commit` it. For each one, write down the expected findings as a file and line, for example in `evals/cases.json`. A finding counts as a match when it names the same file and its line is within 3 lines of the expected line (`|line difference| <= 3`). Models are rarely exact about line numbers, so a small tolerance keeps the score fair.\n\nTwo scores come out of the matching. Recall is the share of the planted bugs the agent found: found bugs divided by planted bugs. Precision is the share of the agent's findings that were real: matching findings divided by all findings. An agent that reports everything has perfect recall and terrible precision; an agent that reports almost nothing has the opposite. Watch both. False findings are costly: reviewers who see noise stop reading.\n\nThe workflow is the one from topics 18 and 21. Run all cases with the SDK runner and record a baseline: pass rate, tokens, cost, latency. Then change exactly one thing, for example add the severity guide to the skill, and run the same cases again. Compare the two rows. If you change two things at once you cannot tell which one made the difference.\n\nThe runnable example computes both scores for a small made-up run: two planted bugs, three findings, one match.",
      "analogy": "A test track with known defects planted in it. You secretly place two cracks and a loose bolt on the track, let the inspector go through, and count: how many planted defects were found (recall) and how many of the inspector's reports were about real defects rather than false alarms (precision). Then you change the inspector's training and run the same track again.",
      "code": [
        {
          "language": "json",
          "filename": "evals/cases.json",
          "source": "[\n  { \"branch\": \"bug-median-sort\", \"expected\": [{ \"file\": \"src/stats.ts\", \"line\": 2 }] },\n  { \"branch\": \"bug-off-by-one\", \"expected\": [{ \"file\": \"src/range.ts\", \"line\": 4 }] },\n  { \"branch\": \"bug-missing-await\", \"expected\": [{ \"file\": \"src/load.ts\", \"line\": 6 }] },\n  { \"branch\": \"bug-divide-zero\", \"expected\": [{ \"file\": \"src/math.ts\", \"line\": 9 }] },\n  { \"branch\": \"bug-no-test\", \"expected\": [{ \"file\": \"src/slug.ts\", \"line\": 1 }] }\n]",
          "output": "",
          "explanation": "An example layout for the five cases. The branch names and line numbers depend on the fixtures you plant; write yours down when you plant the bug, not after seeing the agent's answer."
        },
        {
          "language": "typescript",
          "filename": "evals/score.ts",
          "source": "type Loc = { file: string; line: number };\n\nconst match = (exp: Loc, got: Loc[]) =>\n  got.some((g) => g.file === exp.file && Math.abs(g.line - exp.line) <= 3);\n\nconsole.log(\n  match({ file: \"src/stats.ts\", line: 2 }, [{ file: \"src/stats.ts\", line: 4 }]),\n  match({ file: \"src/stats.ts\", line: 2 }, [{ file: \"src/math.ts\", line: 2 }]),\n);\n\nconst expected: Loc[] = [\n  { file: \"src/stats.ts\", line: 2 },\n  { file: \"src/math.ts\", line: 10 },\n];\nconst found: Loc[] = [\n  { file: \"src/stats.ts\", line: 4 },\n  { file: \"src/stats.ts\", line: 30 },\n  { file: \"src/util.ts\", line: 1 },\n];\nconst foundBugs = expected.filter((e) => match(e, found)).length;\nconst realFindings = found.filter((f) => match(f, expected)).length;\nconsole.log(`recall ${(foundBugs / expected.length).toFixed(2)} precision ${(realFindings / found.length).toFixed(2)}`);",
          "output": "true false\nrecall 0.50 precision 0.33",
          "explanation": "The first line: line 4 is within 3 of line 2 in the same file, so `true`; the same line number in a different file is `false`. Then the made-up run: one of two planted bugs was found (recall 1/2), and one of three findings was real (precision 1/3). Only `src/stats.ts` line 4 matches; line 30 is too far and `src/util.ts` is the wrong file. Run it with `node evals/score.ts`."
        }
      ],
      "productionNote": "These numbers (pass rate, recall, precision, tokens, cost per review) go into the README of your project in topic 23, so a reader can see how good the agent is, not just that it exists. Re-run the eval whenever you change the skill, the model or the tool descriptions.",
      "commonMistakes": [
        "Tuning on the same five cases forever. The skill slowly learns those exact bugs (overfitting) and the score stops meaning anything for new code. Add fresh cases from time to time and keep a few unseen ones for a final check.",
        "Looking only at recall. An agent that flags every line will find every bug and still be useless; count the false findings and track precision.",
        "Changing several things between two runs. You cannot tell which change helped. Change one thing, then re-run."
      ],
      "sources": [
        { "title": "Anthropic: Building effective agents", "url": "https://www.anthropic.com/engineering/building-effective-agents" }
      ]
    }
  ],
  "quiz": [
    {
      "question": "What does `git diff main...HEAD` (three dots) show?",
      "options": [
        "Every file in the repo, whether changed or not",
        "The changes made on the current branch since it left main",
        "Only the files that exist on main and not on the branch",
        "The commit messages of main, newest first"
      ],
      "answerIndex": 1,
      "explanation": "Three dots compare the current branch with the point where it split from main, so you see only the branch's own changes. That is what a PR reviewer wants."
    },
    {
      "question": "Why does `get_diff` call `pi.exec(\"git\", [...])` with an argument array instead of building one shell string?",
      "options": [
        "Without a shell, text in the branch name cannot be run as extra commands",
        "Argument arrays make git run faster than a shell string",
        "A shell string would make git return the diff in a different format",
        "Pi refuses to run any program that is given as a single string"
      ],
      "answerIndex": 0,
      "explanation": "With an argument array there is no shell to interpret characters such as `;` or `&&`, so user-supplied text is passed to git as data. This is a safety reason; it is not about speed or output format."
    },
    {
      "question": "A test fails while `run_tests` runs. Should the tool result be marked `isError`?",
      "options": [
        "Yes, because any non-zero exit code means the tool failed",
        "Yes, so that the agent retries the tool until the tests pass",
        "Only if the test output is longer than 100 lines",
        "No, a failing test is evidence for the review and the tool itself worked"
      ],
      "answerIndex": 3,
      "explanation": "`isError` is for a tool that broke. A failing test is the very information the reviewer needs, so the tool returns it as a normal result with the exit code in `details`."
    },
    {
      "question": "What does `terminate: true` do in the result of `submit_review`?",
      "options": [
        "It deletes `review.json` after the run",
        "It ends the run on this structured result, with no further model call",
        "It stops Pi and closes the terminal window",
        "It makes Pi validate the findings a second time"
      ],
      "answerIndex": 1,
      "explanation": "`terminate: true` tells Pi the tool result is the final answer, so the agent loop stops instead of asking the model for one more reply. Without it, the model gets an extra turn after the review is already filed."
    },
    {
      "question": "In a review eval with planted bugs, what do recall and precision measure?",
      "options": [
        "Recall is how fast the review runs; precision is how many tokens it uses",
        "Recall is the number of tokens used; precision is the number of tool calls made",
        "Recall is the share of planted bugs found; precision is the share of the agent's findings that were real",
        "Both measure how many findings the agent produced"
      ],
      "answerIndex": 2,
      "explanation": "Recall asks how many of the planted bugs were found. Precision asks how many of the agent's findings were real rather than false alarms. You need both, because reporting everything gives perfect recall and poor precision."
    }
  ]
});
