window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "15-planning",
  "order": 15,
  "title": "Planning Agents",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "Pi has no built-in plan mode, so in this topic you build one yourself as an extension. You write a /plan command that lets the agent save only a PLAN.md checklist, a /approve command that unlocks real work, progress tracking, replanning after a failed step, and hard limits (max turns, timeout, stop condition) so the agent cannot run forever.",
  "prerequisites": ["14-agent-memory"],
  "subtopics": [
    {
      "id": "plan-first-pattern",
      "title": "Plan-first pattern",
      "explanation": "So far the agent has jumped straight into doing: you ask, it reads files, edits files and runs commands. That is fast, but if it picks the wrong direction you only find out after it has changed your files. The plan-first pattern splits the work into three separate stages: (1) the agent writes a numbered plan and changes nothing else, (2) a human reads the plan and approves or edits it, (3) the agent carries the plan out.\n\nThe benefits are concrete. You catch a wrong direction early, before any code has changed. Reviewing ten lines of plan is much cheaper than reviewing a whole diff (a diff is the list of changes between two versions of your files, which you met in the git topic). The plan is also saved in a file, so work can be resumed later by you or by another session.\n\nThe cost is one extra turn (one round of the agent loop: model call plus any tool calls) and one human pause. So use plan-first for multi-file or risky tasks, and skip it for a one-line fix where writing the plan takes longer than the fix.\n\nThe plan itself is a Markdown checklist. Markdown is a plain-text format where a line starting with `- [ ]` is an unticked checkbox and `- [x]` is a ticked one. A checklist is easy for a human to read and easy for a program to parse, which you will exploit later. Throughout this topic the task is: \"Add a `percent(part, whole)` function to src/math.ts with tests\". Real tools such as Claude Code and Codex have a plan mode, and it is exactly this pattern. Pi deliberately does not ship one, so you will build it.",
      "analogy": "An architect's drawing is approved by the client before the builders pour concrete. Changing a line on paper costs nothing; changing poured concrete costs a lot. The plan is the drawing, your approval is the signature, and the execution stage is the building work.",
      "code": [
        {
          "language": "markdown",
          "filename": "PLAN.md",
          "source": "# Plan: add percent()\n- [ ] 1. Read src/math.ts\n- [ ] 2. Add percent(part, whole) throwing on whole = 0\n- [ ] 3. Add test/percent.test.ts\n- [ ] 4. Run node --test",
          "output": "",
          "explanation": "This is the plan format used for the whole topic: a title line, then one numbered checkbox per step. Each step is specific (a file, a function, a command) so a human can judge it in seconds. A vague step such as \"fix stuff\" cannot be reviewed or verified. The file prints nothing because it is data, not a program."
        }
      ],
      "productionNote": "Human-in-the-loop approval gates (a point where a person must say yes before the agent continues) are standard in production agents. Use plan-first when a task touches several files, is hard to undo, or costs a lot of tokens. Keep the plan in a file inside the repository so it can be reviewed, committed or thrown away.",
      "commonMistakes": [
        "Accepting vague plans such as \"fix stuff\" or \"update code\". A good step names the file, the change and how to check it.",
        "Approving without reading. The whole value of the pattern is the human review; if you always approve blindly you only pay the extra turn.",
        "Using plan-first for a one-line fix. The planning turn costs more than the change."
      ],
      "sources": [
        { "title": "Pi coding agent repository", "url": "https://github.com/earendil-works/pi" },
        { "title": "Anthropic: Building effective agents", "url": "https://www.anthropic.com/engineering/building-effective-agents" }
      ]
    },
    {
      "id": "plan-file-and-approval",
      "title": "Writing a plan file and an approval command",
      "explanation": "Now build it. Create the file `~/pi-lab/.pi/extensions/planner.ts` (in your pi-lab folder, make the `.pi/extensions` folders if they do not exist yet). Pi loads project extensions from there once the project is trusted, as you saw in the first-extension topic. After saving, run `/reload` inside Pi so it picks the file up.\n\nThe extension keeps a state variable, a variable that remembers where the program currently is. Here it is `mode`, which is one of three string values: `\"idle\"` (nothing going on), `\"planning\"` or `\"executing\"`. Every command and event handler checks `mode` to decide what to do.\n\n`/plan <goal>` is a command you register with `pi.registerCommand`. It does four things: it saves the current tools with `pi.getActiveTools()` (so they can be restored later), sets `mode` to `\"planning\"`, narrows the agent to read-only tools plus `write` with `pi.setActiveTools([...])`, and then sends a message as if you had typed it, using `pi.sendUserMessage(text)`.\n\nNarrowing the tools is the first lock: with only `read`, `grep`, `find`, `ls` and `write` active, the agent has no `bash` and no `edit`. But `write` can still overwrite any file, so you add a second lock: a `tool_call` guard (you met `tool_call` blocking in the commands topic). While `mode` is `\"planning\"`, any `write` or `edit` call whose path is not `PLAN.md` is blocked with a reason. The reason text is sent back to the model as the tool result, so the model learns why and can correct itself.\n\nThe path check needs care. The model might write `PLAN.md`, `./PLAN.md` or an absolute path, and all mean the same file. The code uses `resolve` from `node:path` (a built-in Node.js module for working with file paths): `resolve(p)` turns any relative path into a full absolute path, so the two sides compare equal when they point at the same file. A simple `endsWith(\"PLAN.md\")` check also works for the common cases but wrongly allows `docs/PLAN.md`, so the resolved comparison is stricter.\n\n`/approve` is the second command. If `mode` is `\"planning\"` it sets `mode` to `\"executing\"`, restores the saved tools with `pi.setActiveTools(savedTools)` and sends the execute message. Typing it is your stamp of approval. Before typing it, read PLAN.md and edit it by hand if you disagree with a step.",
      "analogy": "A drafting room where only pencils are allowed: you can sketch and write on the plan, but the power tools are locked away. The `/approve` command is the stamp that opens the tool shed. The `tool_call` guard is the supervisor who checks that the only paper being marked is the plan.",
      "code": [
        {
          "language": "typescript",
          "filename": ".pi/extensions/planner.ts",
          "source": "import { resolve } from 'node:path';\nimport type { ExtensionAPI } from '@earendil-works/pi-coding-agent';\n\nconst PLAN_TOOLS = ['read', 'grep', 'find', 'ls', 'write'];\nconst EXECUTE_MESSAGE =\n  'Execute PLAN.md one step at a time. After each step, mark it [x] in PLAN.md and say which step is done. Stop when all are checked.';\n\nexport default function (pi: ExtensionAPI) {\n  let mode: 'idle' | 'planning' | 'executing' = 'idle';\n  let savedTools: string[] = [];\n\n  pi.registerCommand('plan', {\n    description: 'Write PLAN.md for a goal (no other file changes)',\n    handler: async (args, ctx) => {\n      const goal = args.trim();\n      if (!goal) {\n        ctx.ui.notify('Usage: /plan <goal>', 'warning');\n        return;\n      }\n      if (mode === 'idle') savedTools = pi.getActiveTools();\n      mode = 'planning';\n      pi.setActiveTools(PLAN_TOOLS);\n      pi.sendUserMessage(\n        `Write a numbered checklist plan for: ${goal}. Save it to PLAN.md. Do not change any other file.`,\n      );\n    },\n  });\n\n  pi.registerCommand('approve', {\n    description: 'Approve PLAN.md and let the agent execute it',\n    handler: async (_args, ctx) => {\n      if (mode !== 'planning') {\n        ctx.ui.notify('Nothing to approve: run /plan first', 'warning');\n        return;\n      }\n      mode = 'executing';\n      pi.setActiveTools(savedTools);\n      pi.sendUserMessage(EXECUTE_MESSAGE);\n    },\n  });\n\n  pi.on('tool_call', async (event) => {\n    if (mode !== 'planning') return;\n    if (event.toolName !== 'write' && event.toolName !== 'edit') return;\n    const path = String((event.input as { path?: string }).path);\n    if (resolve(path) !== resolve('PLAN.md')) {\n      return { block: true, reason: 'Planning mode: only PLAN.md may be written' };\n    }\n  });\n}",
          "output": "",
          "explanation": "The file prints nothing itself; it registers two commands and one guard when Pi loads it. `args.trim()` removes spaces around what you typed after `/plan`. `savedTools` is only captured when `mode` is `\"idle\"` so a second `/plan` does not overwrite the saved list with the narrowed one. `event.input as { path?: string }` is a type assertion: it tells TypeScript the shape of the input, it does not check anything at run time. The `_args` name with an underscore means the parameter is required by the function shape but unused. The execute message is defined here because `/approve` needs it; the next sub-topic explains it."
        },
        {
          "language": "bash",
          "filename": "try-plan.sh",
          "source": "cd ~/pi-lab\npi\n# inside Pi: /reload\n# inside Pi: /plan add percent() with tests\n# when the agent has finished, in a second terminal:\ncd ~/pi-lab\ngit status --short",
          "output": "?? PLAN.md",
          "explanation": "Start Pi in the lab folder, reload extensions, then run `/plan add percent() with tests`. When the agent finishes, `git status --short` lists changed files, one per line. `??` means a new file git does not track yet. If your lab folder was clean before, only `PLAN.md` appears: the guard and the tool list kept the agent from touching anything else. The exact plan text varies by model, but it should look like the checklist from the previous sub-topic."
        }
      ],
      "productionNote": "Two locks are better than one. The reduced tool list stops the agent from even seeing `bash` and `edit`, and the `tool_call` guard catches misuse of `write`. Pi has no permission system of its own and runs with your user rights, so guards like this are how you add safety. Always restore the saved tools on approval; a later topic builds a fuller permission gate.",
      "commonMistakes": [
        "Forgetting to restore the tools in `/approve`. The agent then tries to execute the plan with no `bash` or `edit` and fails confusingly.",
        "Comparing paths as raw strings. `./PLAN.md`, `PLAN.md` and an absolute path are the same file, so resolve them first (or at least use `endsWith`), and remember that `endsWith` also accepts `docs/PLAN.md`.",
        "Overwriting `savedTools` on every `/plan`. If you run `/plan` twice, the second call would save the already narrowed list and `/approve` would restore the wrong tools.",
        "Not running `/reload` after saving the extension, so the new commands do not exist yet."
      ],
      "sources": [
        { "title": "Pi extensions: pi.sendUserMessage", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#pisendusermessagecontent-options" },
        { "title": "Pi extensions: getActiveTools / setActiveTools", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#pigetactivetools--pigetalltools--pisetactivetoolsnames" }
      ]
    },
    {
      "id": "executing-step-by-step",
      "title": "Executing step by step",
      "explanation": "After `/approve`, the agent receives the execute message: \"Execute PLAN.md one step at a time. After each step, mark it [x] in PLAN.md and say which step is done. Stop when all are checked.\" Three things in that sentence matter. \"One step at a time\" stops the agent from doing everything in one giant turn. \"Mark it [x]\" makes the plan file the single source of truth for progress, so the work can be resumed. \"Stop when all are checked\" gives a clear end.\n\nYou can then show progress to yourself. Parsing means reading text and extracting structured facts from it. Here you count lines in PLAN.md that look like `- [x]` (done) and lines that look like `- [ ]` or `- [x]` (total). The counting uses regular expressions (regexes): small patterns for matching text. In `/^- \\[x\\]/gim`, `^` means start of a line, `\\[` matches a literal square bracket, and the letters after the closing slash are flags. `g` finds all matches instead of the first, `i` ignores upper/lower case, and `m` makes `^` match at the start of every line, not only the start of the whole text. Forgetting `m` is the classic bug: only the first line would be checked.\n\n`md.match(regex)` returns an array of matches or `null` when there are none. `?? []` (the nullish coalescing operator) means \"if the left side is null or undefined, use the right side\", so you always get an array and `.length` works.\n\nTo show the result in Pi's footer, call `ctx.ui.setStatus(\"plan\", \"2/4\")`. The first argument is a key naming your status slot (so you can update it later instead of adding a new one), the second is the text. Do it in a `turn_end` handler (an event handler that runs after each turn), so the counter refreshes after every step. Test the counting function on its own first, as a normal Node.js script.",
      "analogy": "A recipe card with tick boxes. The cook ticks each step before starting the next, so anyone glancing at the card knows how far along dinner is, and if the cook leaves, someone else can carry on from the first unticked box.",
      "code": [
        {
          "language": "typescript",
          "filename": "progress.ts",
          "source": "export function progress(md: string) {\n  const done = (md.match(/^- \\[x\\]/gim) ?? []).length;\n  const total = (md.match(/^- \\[[ x]\\]/gim) ?? []).length;\n  return `${done}/${total}`;\n}\n\nconsole.log(progress('- [x] 1. Read\\n- [x] 2. Add\\n- [ ] 3. Test\\n- [ ] 4. Run'));",
          "output": "2/4",
          "explanation": "Save this in ~/pi-lab and run it with `node progress.ts`. The text has four checklist lines, so `total` is 4, and two of them start with `- [x]`, so `done` is 2. `[ x]` in the second regex is a character class meaning \"a space or an x\". The template literal builds the string \"2/4\"."
        },
        {
          "language": "typescript",
          "filename": "planner-progress-fragment.ts",
          "source": "// add near the top of .pi/extensions/planner.ts\nimport { readFile } from 'node:fs/promises';\n\n// ...progress() copied from progress.ts goes here, inside planner.ts...\n\n// add inside the factory function, next to the other handlers\npi.on('turn_end', async (_event, ctx) => {\n  if (mode !== 'executing') return;\n  const md = await readFile('PLAN.md', 'utf8').catch(() => '');\n  ctx.ui.setStatus('plan', progress(md));\n});",
          "output": "",
          "explanation": "This is a fragment to paste into planner.ts, not a standalone file. The `.pi/extensions` folder is scanned for extensions, so the helper is copied into planner.ts rather than kept as a separate file there. `readFile(...)` reads PLAN.md as text and `.catch(() => '')` turns a missing file into an empty string so the handler never crashes. While the agent works, the Pi footer shows a status such as `2/4`."
        }
      ],
      "productionNote": "Visible progress matters for long tasks: you can glance at the footer instead of reading every tool call. Because progress lives in PLAN.md, a crashed or stopped run can be resumed in a new session by telling the agent to continue from the first unticked step.",
      "commonMistakes": [
        "Trusting that the agent will always tick boxes. Models sometimes skip a tick; if the counter stalls, re-prompt with \"update PLAN.md\".",
        "Using the wrong regex flags. Without `m`, `^` only matches the very start of the text, so most lines are missed; without `g`, you get one match instead of all.",
        "Forgetting `?? []`. `match` returns `null` when nothing matches, and `null.length` throws a TypeError (an error raised when a value is used in a way its type does not allow)."
      ],
      "sources": [
        { "title": "Pi extensions: widgets, status and footer", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#widgets-status-and-footer" }
      ]
    },
    {
      "id": "replanning-after-observations",
      "title": "Replanning after observations",
      "explanation": "A plan is written before the agent has seen everything. Along the way an observation (a tool result such as a failing test or a missing file) can prove a step or the whole plan wrong. A weak agent then retries the same thing blindly or loops. A better one replans: it says what it observed, then adds new steps.\n\nYou ask for this in the execute message. Extend it with: \"If a step fails, do not retry blindly: add a `## Replan` section explaining what you observed and the new steps, then continue.\" A `##` line is a Markdown level-2 heading. Because the new steps are normal checklist lines, the progress counter keeps working: the total simply grows.\n\nHere is the story with our task. The agent adds `percent` and a test, runs `node --test` (Node's built-in test runner), and a test calling `percent(1, 0)` fails because the function returned `Infinity` instead of throwing. The agent marks step 4 done with a FAILED note, adds a Replan section, and appends two new steps. The counter goes from 4/4 to 4/6.\n\nFor big changes you may want to review the new steps yourself. You can do that by switching `mode` back to `\"planning\"` and asking for `/approve` again. For small fixes it is usually fine to let the agent continue.\n\nReplanning must itself be capped, or an agent can replan forever. Count the `## Replan` headings in PLAN.md and stop at more than 2. Stopping uses `ctx.abort()`, which cancels the current agent run; the next sub-topic covers it in more depth.",
      "analogy": "A GPS rerouting after a closed road. It does not keep driving into the barrier and it does not silently change course: it tells you what happened (road closed) and shows the new route, and if it reroutes too many times you stop and look at the map yourself.",
      "code": [
        {
          "language": "typescript",
          "filename": "replan-demo.ts",
          "source": "function progress(md: string) {\n  const done = (md.match(/^- \\[x\\]/gim) ?? []).length;\n  const total = (md.match(/^- \\[[ x]\\]/gim) ?? []).length;\n  return `${done}/${total}`;\n}\n\nfunction replans(md: string) {\n  return (md.match(/^## Replan/gim) ?? []).length;\n}\n\nconst md = [\n  '# Plan: add percent()',\n  '- [x] 1. Read src/math.ts',\n  '- [x] 2. Add percent(part, whole)',\n  '- [x] 3. Add test/percent.test.ts',\n  '- [x] 4. Run node --test (FAILED: percent(1, 0) returned Infinity)',\n  '## Replan',\n  'Observed: no check for whole = 0.',\n  '- [ ] 5. Throw on whole = 0',\n  '- [ ] 6. Re-run node --test',\n].join('\\n');\n\nconsole.log(progress(md));\nconsole.log(`replans: ${replans(md)}`);",
          "output": "4/6\nreplans: 1",
          "explanation": "The array of lines is joined with newline characters into one PLAN.md text, exactly as the agent would leave it after the failure. Four lines are ticked (step 4 counts as done because it was run, even though it failed) and six checklist lines exist in total, so `progress` gives 4/6. One line starts with `## Replan`, so `replans` is 1. Run it with `node replan-demo.ts`."
        },
        {
          "language": "typescript",
          "filename": "planner-replan-fragment.ts",
          "source": "// replace EXECUTE_MESSAGE at the top of planner.ts\nconst EXECUTE_MESSAGE =\n  'Execute PLAN.md one step at a time. After each step, mark it [x] in PLAN.md and say which step is done. ' +\n  'If a step fails, do not retry blindly: add a \"## Replan\" section explaining what you observed and the new steps, then continue. ' +\n  'Stop when all are checked.';\n\nconst MAX_REPLANS = 2;\n\n// inside the turn_end handler, after reading md\nif ((md.match(/^## Replan/gim) ?? []).length > MAX_REPLANS) {\n  ctx.ui.notify(`Stopped: more than ${MAX_REPLANS} replans`, 'warning');\n  ctx.abort();\n}",
          "output": "",
          "explanation": "A fragment again. The execute message now carries the replan rule. The cap counts `## Replan` headings in PLAN.md; on the third one the extension tells you why with `ctx.ui.notify` (a message shown in the Pi interface) and stops the run. Nothing is printed by this code; the notice appears in Pi."
        }
      ],
      "productionNote": "Robust agents adapt instead of looping. The written Replan section also gives you an audit trail: you can read what the agent saw and why it changed course. Always cap replans; an agent that cannot succeed should stop and report, not rewrite the plan forever.",
      "commonMistakes": [
        "No cap on replans, so a hopeless task loops until it hits a cost limit. Cap it at 2 and let a human decide.",
        "Telling the agent to \"try again\" without asking it to explain the observation. Blind retries repeat the same failure.",
        "Deleting the failed step instead of marking it. Keep it ticked with a FAILED note so the history is honest and the counter still works."
      ],
      "sources": [
        { "title": "ReAct: Synergizing Reasoning and Acting in Language Models", "url": "https://arxiv.org/abs/2210.03629" },
        { "title": "Anthropic: Building effective agents", "url": "https://www.anthropic.com/engineering/building-effective-agents" }
      ]
    },
    {
      "id": "max-steps-timeouts-stop-conditions",
      "title": "Max steps, timeouts and stop conditions",
      "explanation": "An agent loop ends when the model stops calling tools, but a confused model may never do that. For unattended work you need guards that end a run from the outside. There are three, plus a clear success condition.\n\nMax turns: count `turn_end` events (one per round of the loop) and stop at a limit such as `MAX_TURNS = 15`. Reset the counter on `agent_start`, the event that fires when a run begins. Say clearly that you count turns, not tool calls: one turn can contain several parallel tool calls.\n\nWall-clock timeout: wall-clock time is real elapsed time, as on a wall clock. Record `Date.now()` (the current time as a number of milliseconds) in `agent_start`. In each `turn_end`, if `Date.now() - startedAt` is more than your limit, such as 10 minutes (`10 * 60 * 1000` milliseconds), stop.\n\nTool timeouts: a single stuck command can freeze a turn forever, so the `turn_end` check never runs. The built-in `bash` tool accepts a `timeout` argument, and your own tools should pass `AbortSignal.timeout(ms)` to anything that can hang, as you learned in the modules topic.\n\nTo stop, call `ctx.abort()` and tell the user with `ctx.ui.notify(text, \"warning\")`. Pi's own `retry.maxRetries` setting (3) is different: it only retries failed provider requests such as network errors, and does nothing about a looping agent.\n\nFinally, the success condition: when every step in PLAN.md is ticked, the job is done. Set `mode` back to `\"idle\"` so the guards stop applying and the next `/plan` starts fresh. The complete extension below combines everything from this topic. Note that it checks ticks only; the plan's last step (\"Run node --test\") is what makes the agent actually verify the tests pass before ticking it.",
      "analogy": "A chess game with a clock and a move limit. It ends at checkmate (success: all steps ticked), when a player's flag falls (wall-clock timeout) or when the move cap is reached (max turns). Without these, a game between two stuck players never finishes.",
      "code": [
        {
          "language": "typescript",
          "filename": ".pi/extensions/planner.ts",
          "source": "import { readFile } from 'node:fs/promises';\nimport { resolve } from 'node:path';\nimport type { ExtensionAPI } from '@earendil-works/pi-coding-agent';\n\nconst MAX_TURNS = 15;\nconst MAX_REPLANS = 2;\nconst TIMEOUT_MS = 10 * 60 * 1000;\nconst PLAN_TOOLS = ['read', 'grep', 'find', 'ls', 'write'];\nconst EXECUTE_MESSAGE =\n  'Execute PLAN.md one step at a time. After each step, mark it [x] in PLAN.md and say which step is done. ' +\n  'If a step fails, do not retry blindly: add a \"## Replan\" section explaining what you observed and the new steps, then continue. ' +\n  'Stop when all are checked.';\n\nfunction counts(md: string) {\n  const done = (md.match(/^- \\[x\\]/gim) ?? []).length;\n  const total = (md.match(/^- \\[[ x]\\]/gim) ?? []).length;\n  const replans = (md.match(/^## Replan/gim) ?? []).length;\n  return { done, total, replans };\n}\n\nexport default function (pi: ExtensionAPI) {\n  let mode: 'idle' | 'planning' | 'executing' = 'idle';\n  let savedTools: string[] = [];\n  let turns = 0;\n  let startedAt = 0;\n\n  pi.registerCommand('plan', {\n    description: 'Write PLAN.md for a goal (no other file changes)',\n    handler: async (args, ctx) => {\n      const goal = args.trim();\n      if (!goal) {\n        ctx.ui.notify('Usage: /plan <goal>', 'warning');\n        return;\n      }\n      if (mode === 'idle') savedTools = pi.getActiveTools();\n      mode = 'planning';\n      pi.setActiveTools(PLAN_TOOLS);\n      pi.sendUserMessage(\n        `Write a numbered checklist plan for: ${goal}. Save it to PLAN.md. Do not change any other file.`,\n      );\n    },\n  });\n\n  pi.registerCommand('approve', {\n    description: 'Approve PLAN.md and let the agent execute it',\n    handler: async (_args, ctx) => {\n      if (mode !== 'planning') {\n        ctx.ui.notify('Nothing to approve: run /plan first', 'warning');\n        return;\n      }\n      mode = 'executing';\n      pi.setActiveTools(savedTools);\n      pi.sendUserMessage(EXECUTE_MESSAGE);\n    },\n  });\n\n  pi.on('tool_call', async (event) => {\n    if (mode !== 'planning') return;\n    if (event.toolName !== 'write' && event.toolName !== 'edit') return;\n    const path = String((event.input as { path?: string }).path);\n    if (resolve(path) !== resolve('PLAN.md')) {\n      return { block: true, reason: 'Planning mode: only PLAN.md may be written' };\n    }\n  });\n\n  pi.on('agent_start', async () => {\n    turns = 0;\n    startedAt = Date.now();\n  });\n\n  pi.on('turn_end', async (_event, ctx) => {\n    if (mode !== 'executing') return;\n    turns++;\n    const md = await readFile('PLAN.md', 'utf8').catch(() => '');\n    const { done, total, replans } = counts(md);\n    ctx.ui.setStatus('plan', `${done}/${total}`);\n\n    if (total > 0 && done === total) {\n      mode = 'idle';\n      ctx.ui.notify(`Plan complete: ${done}/${total} steps ticked`, 'info');\n    } else if (replans > MAX_REPLANS) {\n      mode = 'idle';\n      ctx.ui.notify(`Stopped: more than ${MAX_REPLANS} replans`, 'warning');\n      ctx.abort();\n    } else if (turns >= MAX_TURNS) {\n      mode = 'idle';\n      ctx.ui.notify(`Stopped: ${MAX_TURNS} turns reached`, 'warning');\n      ctx.abort();\n    } else if (Date.now() - startedAt > TIMEOUT_MS) {\n      mode = 'idle';\n      ctx.ui.notify('Stopped: 10 minute timeout', 'warning');\n      ctx.abort();\n    }\n  });\n}",
          "output": "",
          "explanation": "This is the finished extension; it replaces the earlier versions of planner.ts. It prints nothing itself. `counts` returns three numbers from PLAN.md in one pass. The `if / else if` chain in `turn_end` checks success first, then the replan cap, the turn cap and the timeout; whichever fires sets `mode` back to `\"idle\"`. In a runaway run, Pi shows the notice `Stopped: 15 turns reached` and the run ends. On a successful run you see `Plan complete: 4/4 steps ticked`."
        }
      ],
      "productionNote": "Cost and safety ceilings are mandatory for unattended agents: every extra turn costs tokens and can change files. Tune the limits to your task: too low and the agent never finishes (a 15-turn cap is generous for a 4-step plan but too small for a 30-step one), too high and a runaway burns money. Log which guard fired so you can tell a slow success from a stuck failure.",
      "commonMistakes": [
        "Counting tool calls in one place and turns in another without saying which. Pick one unit and name it in the message (\"15 turns\").",
        "Setting caps so low that healthy agents are cut off mid-plan. Measure a few normal runs first (see the trace-reading topic) and add headroom.",
        "Relying on `retry.maxRetries`. It only retries provider errors; it does not stop a looping agent.",
        "Forgetting to set `mode` back to `\"idle\"` after a stop, so the guards keep applying to the next, unrelated task."
      ],
      "sources": [
        { "title": "Pi extensions: ctx.isIdle / ctx.abort / ctx.hasPendingMessages", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#ctxisidle--ctxabort--ctxhaspendingmessages" },
        { "title": "Pi settings", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/settings.md" }
      ]
    }
  ],
  "quiz": [
    {
      "question": "When is the plan-first pattern worth its extra turn?",
      "options": [
        "For every request, including renaming one variable",
        "For multi-file or risky tasks where a wrong direction is expensive to undo",
        "Only when the model is too weak to call tools",
        "Only after the agent has already finished the work"
      ],
      "answerIndex": 1,
      "explanation": "Plan-first costs one extra turn and a human pause, and pays off when mistakes are costly: several files, hard-to-undo changes or long runs. For a one-line fix the plan costs more than the fix, and a plan written after the work is not a plan."
    },
    {
      "question": "While mode is \"planning\", how does the extension stop the agent from editing src/math.ts?",
      "options": [
        "It deletes src/math.ts until /approve is typed",
        "It asks the model politely in the system prompt and nothing else",
        "A tool_call handler returns { block: true, reason } for write or edit calls whose path does not resolve to PLAN.md",
        "It sets the temperature to 0 so the model cannot choose that file"
      ],
      "answerIndex": 2,
      "explanation": "The tool_call guard inspects each write or edit call and blocks it with a reason unless the resolved path is PLAN.md. The active tool list is also narrowed, but the guard is what protects against write calls to other files. Temperature controls randomness, not permissions."
    },
    {
      "question": "What does progress(\"- [x] a\\n- [ ] b\") return?",
      "options": [
        "1/2",
        "2/2",
        "0/2",
        "1/1"
      ],
      "answerIndex": 0,
      "explanation": "There are two checklist lines (total 2) and one of them starts with - [x] (done 1), so the result is 1/2."
    },
    {
      "question": "A step fails because a test returned Infinity for percent(1, 0). What should the agent do?",
      "options": [
        "Retry the same step again and again until it passes",
        "Delete the failed step from PLAN.md so the counter looks clean",
        "Ignore the failure and tick every remaining box",
        "Add a ## Replan section explaining what it observed, add new steps, and continue (within the replan cap)"
      ],
      "answerIndex": 3,
      "explanation": "Blind retries repeat the same failure, deleting history hides it, and ticking boxes falsely claims success. A Replan section records the observation and the new steps, and a cap of 2 replans prevents endless loops."
    },
    {
      "question": "Which set lists three ways a planning run can end?",
      "options": [
        "Colour theme, font size, window title",
        "Max turns, wall-clock timeout, all steps ticked (success condition)",
        "Git branch name, commit message length, file count",
        "Model price, token count of the system prompt, provider name"
      ],
      "answerIndex": 1,
      "explanation": "A turn cap, a wall-clock timeout and a clear success condition (all steps ticked) each end a run. Tool timeouts and a replan cap are further guards. The other options are cosmetic or unrelated settings that cannot end a run."
    }
  ]
});
