window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "20-cost-control",
  "order": 20,
  "title": "Cost Control",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "An agent calls the model many times per task, and every call is billed per token. In this topic you compute the cost of a run from usage numbers, route work between a cheap and a strong model, use thinking levels and prompt caching (the provider keeps a copy of a repeated start of your prompt so re-reading it costs less) wisely, and build a cost-meter extension that reports the cost of every task.",
  "prerequisites": [
    "19-guardrails"
  ],
  "subtopics": [
    {
      "id": "token-cost-math",
      "title": "Token cost math",
      "explanation": "Providers bill per token, and prices are quoted per 1 million tokens (1M), with one price for input tokens (what you send) and a higher one for output tokens (what the model writes). The cost of one model call is (input tokens x input price + output tokens x output price) / 1,000,000. The cost of an agent run is the sum (the symbol for this in maths is the Greek letter sigma) of that formula over every model call in the run.\n\nAn agent makes one model call per turn, and every turn resends the whole conversation so far: system prompt, your request, earlier model messages and tool results. So input tokens grow on every turn, while the output of each turn stays small. This is why the cost of a run grows faster than the number of turns, and why counting only the last turn badly underestimates the bill.\n\nPrompt caching (the provider keeps a copy of a repeated prompt start) adds two more prices: cacheWrite and cacheRead. Tokens written into the provider's cache (`cacheWrite`) and tokens read back from it (`cacheRead`) each have their own rate.\n\nYou met the usage fields in the trace-reading topic: every assistant message in a Pi session carries a `usage` object with `input`, `output`, `cacheRead`, `cacheWrite`, `totalTokens` and a `cost` object holding `input`, `output`, `cacheRead`, `cacheWrite` and `total` in dollars. Pi computes `cost` for you from the model's prices, and the `/session` command shows the session totals.\n\nThe example below does the math by hand so you understand what Pi computes. The prices (3 dollars input, 15 dollars output per 1M tokens) are made up for the example; real prices differ per model, and you can see Zen prices on the models page linked below. The code uses three small tools: an array of objects (one per turn), `.reduce(...)`, which walks over an array and folds it into one value (here a running sum `s`, starting at `0`), and `.toFixed(4)`, which turns a number into text with exactly 4 decimals. The underscore in `1_000_000` is only a readability separator.\n\nTo try it: open a terminal, run `cd ~/pi-lab`, create the file `run-cost.ts` in your editor, paste the code, and run it with Node.js, which runs `.ts` files directly.",
      "analogy": "Think of a phone bill. Each call is charged by its length, and talking costs more than listening. An agent is a caller who redials every turn and reads the whole conversation so far aloud again before adding one new sentence, so each call is longer than the last and the bill grows faster than the number of calls.",
      "code": [
        {
          "language": "typescript",
          "filename": "run-cost.ts",
          "source": "// One entry per model call (turn). Notice that input grows each turn.\nconst turns = [\n  { in: 3000, out: 400 },\n  { in: 4200, out: 300 },\n  { in: 5000, out: 600 },\n];\n\n// Made-up prices in dollars per 1M tokens.\nconst IN = 3;\nconst OUT = 15;\n\nconst total = turns.reduce((s, t) => s + (t.in * IN + t.out * OUT) / 1_000_000, 0);\nconsole.log(total.toFixed(4));\n",
          "output": "0.0561",
          "explanation": "Per turn: 3000x3 + 400x15 = 15000, then 4200x3 + 300x15 = 17100, then 5000x3 + 600x15 = 24000. The sum is 56100, divided by 1,000,000 gives 0.0561 dollars. Run it with `node run-cost.ts`."
        }
      ],
      "productionNote": "Real systems set a budget per task or per user and stop the agent when the running cost crosses it. You can only enforce a budget if you can compute cost per call, which is exactly the formula above.",
      "commonMistakes": [
        "Counting only the last turn. Every turn is billed, and earlier turns are cheaper than later ones because history grows.",
        "Ignoring the output price. Output tokens usually cost several times more than input tokens, so a long answer or long thinking is expensive even if the input is small.",
        "Using made-up prices from an example for real budgeting. Read the current price of your model on the provider's page."
      ],
      "sources": [
        {
          "title": "Pi docs: message types (usage)",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/message-types.md#usage"
        },
        {
          "title": "OpenCode Zen models and prices",
          "url": "https://opencode.ai/docs/console/models"
        }
      ]
    },
    {
      "id": "cheap-explore-strong-finish",
      "title": "Cheap model to explore, strong model to finish",
      "explanation": "Not every turn needs the smartest model. Exploring (searching files, reading, summarising) is simple work that a cheap model does well. Writing the final code change or a tricky fix benefits from a strong model. Routing means using the cheap one first and switching to the strong one for the final step. Because most turns in an agent run are exploration, this can cut the bill a lot.\n\nPi offers three ways to switch.\n\nInteractively, the `/model` command lets you pick another model.\n\nAt start, `pi --model <pattern>` begins the session with that model (the pattern is a model name or `provider/id`).\n\nFrom an extension, `pi.setModel(model)` switches in code.\n\nSeparately, the `--models` flag and the `enabledModels` setting limit which models Pi offers, so you can scope the list to just your cheap and strong choices.\n\nWe use the OpenCode Zen provider, whose Pi provider id is `opencode`. Model ids change over time, so this course never hardcodes them. Run `pi --list-models opencode` in your terminal, pick one cheap and one strong model from the list, and write them as `provider/id` strings in two constants named `CHEAP` and `STRONG`. In the code below, replace `<cheap-id>` and `<strong-id>` with your picks.\n\nThe extension registers two slash commands, `/cheap` and `/strong` (a slash command is a command you type inside Pi, taught earlier). To set it up, run `cd ~/pi-lab`, `mkdir -p .pi/extensions`, create `.pi/extensions/route.ts`, paste the code, and run `/reload` in Pi (the project must be trusted for project extensions to load).\n\nHow the code works: `ctx.modelRegistry.find(provider, id)` looks up a model and returns nothing if it does not exist. `pi.setModel(model)` returns `false` when you have no API key for that model's provider, so we check both. The handler's first parameter is named `_args` because we do not use it; the leading underscore is a convention for an unused value. We split `provider/id` at the first slash with `indexOf` and `slice`.\n\nThen try the flow: start with `pi --model <your CHEAP string>`, ask `Find where average is defined and summarize`, type `/strong` (or use `/model`), ask `Now fix it with a test`, and compare the cost shown by `/session` before and after.",
      "analogy": "A junior researcher gathers and skims the files because that work is plentiful and cheap per hour. A senior engineer then writes the fix, and costs more per hour but gets it right. Routing is deciding who does which part of the job.",
      "code": [
        {
          "language": "bash",
          "filename": "list-models.sh",
          "source": "pi --list-models opencode",
          "output": "",
          "explanation": "Prints the models Pi knows for the `opencode` provider. The list changes with Pi releases, so no output is shown here; pick your own cheap and strong ids from it."
        },
        {
          "language": "typescript",
          "filename": ".pi/extensions/route.ts",
          "source": "import type { ExtensionAPI, ExtensionCommandContext } from \"@earendil-works/pi-coding-agent\";\n\n// Fill these in from `pi --list-models opencode`, as \"opencode/<id>\".\nconst CHEAP = \"opencode/<cheap-id>\";\nconst STRONG = \"opencode/<strong-id>\";\n\nexport default function (pi: ExtensionAPI) {\n  const switchTo = (target: string) => async (_args: string, ctx: ExtensionCommandContext) => {\n    const slash = target.indexOf(\"/\");\n    const model = ctx.modelRegistry.find(target.slice(0, slash), target.slice(slash + 1));\n    if (!model) {\n      ctx.ui.notify(`Unknown model ${target}`, \"error\");\n      return;\n    }\n    if (await pi.setModel(model)) {\n      ctx.ui.notify(`Model: ${target}`, \"info\");\n    } else {\n      ctx.ui.notify(\"No API key for this model\", \"error\");\n    }\n  };\n\n  pi.registerCommand(\"cheap\", { description: \"Switch to the cheap model\", handler: switchTo(CHEAP) });\n  pi.registerCommand(\"strong\", { description: \"Switch to the strong model\", handler: switchTo(STRONG) });\n}\n",
          "output": "",
          "explanation": "Loading the extension prints nothing. Typing `/cheap` or `/strong` in Pi shows a notification: `Model: opencode/<id>` on success, `Unknown model ...` if the id is not in the registry, or `No API key for this model` if `pi.setModel` returns false."
        }
      ],
      "productionNote": "Routing pays off when most turns are exploration. Do not trust the saving blindly: run your eval set (from the evaluation topic) with the cheap setup and check that the pass rate does not drop much compared with the strong baseline.",
      "commonMistakes": [
        "Switching models in the middle of an edit. The new model has to pick up half-finished work, and the trace becomes harder to read. Switch between phases instead.",
        "Using a cheap model for a task it cannot do. Failed attempts and retries burn tokens, and can cost more than one run with the strong model.",
        "Hardcoding model ids you copied from a blog post. Always read them from `pi --list-models opencode`."
      ],
      "sources": [
        {
          "title": "Pi docs: CLI models",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md#models"
        },
        {
          "title": "Pi docs: ctx.modelRegistry, ctx.model",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#ctxmodelregistry--ctxmodel--ctxthinkinglevel--ctxscopedmodels"
        },
        {
          "title": "Pi docs: pi.setModel",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#pisetmodelmodel"
        }
      ]
    },
    {
      "id": "thinking-and-caching",
      "title": "Thinking levels and prompt caching",
      "explanation": "Thinking (also called reasoning) is text the model writes to itself before answering. Those thinking tokens are billed as output tokens, the expensive kind. You met thinking levels earlier (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`; the default is `medium`). For exploration use `low` or `off`; save `high` for a hard fix. You can set it at start with a suffix, for example `pi --model <your CHEAP string>:low`, or per model with the `modelThinkingLevels` setting (see the settings page for its exact format).\n\nPrompt caching is a provider feature. When many calls start with the same text, called the prefix (system prompt, tool list, early history), the provider can store it. Later calls that start with the same prefix read it from the cache at a much lower price. In Pi's usage numbers this appears as `cacheRead` (cheap) versus `cacheWrite` (storing it). An agent resends a growing history every turn, so caching helps long sessions the most.\n\nThe cache only matches an identical beginning. If something near the start changes, everything after it misses the cache and is billed at full input price. So keep the prefix stable: do not edit `AGENTS.md` in the middle of a session, avoid changing the active tools often, and avoid an extension that rewrites the system prompt on every `before_agent_start`.\n\nPi has two settings related to this. `cacheWarming` (default `\"idle\"`) sends a keep-alive so the cache stays warm between your runs when the estimated saving is at least 0.05 dollars. `showCacheMissNotices` makes Pi tell you when a cache miss happened. See the settings page for accepted values.\n\nThe example compares one call with an 8000-token prefix and 1000 new tokens. The cache read price of 0.3 dollars per 1M is illustrative; real rates differ per model. Save it as `cache.ts` in `~/pi-lab` and run `node cache.ts`.",
      "analogy": "Thinking levels are how long the engineer deliberates before answering: billable hours, so spend them only on hard problems. Caching is reusing a printed handout instead of retyping the same pages for every meeting. It only works if the handout stays identical; change page one and you must reprint everything.",
      "code": [
        {
          "language": "typescript",
          "filename": "cache.ts",
          "source": "const prefix = 8000; // tokens that repeat every call\nconst fresh = 1000; // tokens that are new this call\nconst IN = 3; // dollars per 1M input tokens (illustrative)\nconst CACHE_READ = 0.3; // dollars per 1M cache-read tokens (illustrative)\n\nconst noCache = ((prefix + fresh) * IN) / 1e6;\nconst withCache = (prefix * CACHE_READ + fresh * IN) / 1e6;\nconsole.log(noCache.toFixed(4), withCache.toFixed(4));\n",
          "output": "0.0270 0.0054",
          "explanation": "Without caching: 9000 x 3 = 27000, divided by 1e6 (one million) gives 0.027. With caching: 8000 x 0.3 + 1000 x 3 = 2400 + 3000 = 5400, giving 0.0054. The cached call costs one fifth as much."
        }
      ],
      "productionNote": "Long agent sessions benefit most from caching, since the same large prefix is read on every turn. Check the `cacheRead` and `cacheWrite` numbers in your traces to confirm that caching actually happens.",
      "commonMistakes": [
        "Rewriting the system prompt on every `before_agent_start` (the event fired before each agent run). The changed prefix causes cache misses every time.",
        "Leaving thinking at a very high level by default. Thinking tokens are output tokens, so it makes every exploration turn expensive.",
        "Assuming the example prices are real. Cache rates differ per model and provider."
      ],
      "sources": [
        {
          "title": "Pi docs: settings (model and thinking)",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/settings.md#model-and-thinking"
        },
        {
          "title": "Anthropic: prompt caching",
          "url": "https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching"
        }
      ]
    },
    {
      "id": "measuring-cost-per-task",
      "title": "Measuring cost per task",
      "explanation": "The monthly total hides which tasks are expensive. The cost of one task is the sum of `usage.cost.total` over all assistant messages that belong to it (plus the `usage` of any nested model calls made by tools, if a tool calls a model itself). Tool result and user messages have no `usage`, so they add nothing.\n\nThe pure part of this is a small sum. The example uses a type alias for a message whose `usage` is optional, an array with one assistant message, one tool result and one more assistant message. Optional chaining `?.` safely reads `usage.cost.total` and `?? 0` (use 0 if the value is missing) makes messages without usage count as zero. Save as `task-cost.ts` and run `node task-cost.ts`.\n\nThe second example is the extension `cost-meter.ts`. On `agent_start` (the event when an agent run begins) it remembers how many entries the session branch already has. On `agent_settled` (the event after the run, including retries, is completely finished) it takes only the new entries, sums the cost of the assistant messages and shows it with `ctx.ui.notify`. A session entry of type `message` holds the message under its `message` field. We read `ctx.sessionManager.getBranch()`, which is the active path of the session, and not all branches, so abandoned side branches are not counted.\n\nSetup: `cd ~/pi-lab`, `mkdir -p .pi/extensions` (if not done yet), create `.pi/extensions/cost-meter.ts`, paste the code and run `/reload`. After each prompt, Pi shows a notification like `run cost $0.0123` (the number depends on your model and task).\n\nFor reporting, your eval runner from the evaluation topic already logs cost per task. Report the median (the middle value when costs are sorted, which is not distorted by one outlier) and the maximum. These two numbers go into the README in the shipping topic.",
      "analogy": "An itemised receipt per order instead of only the monthly card statement. The statement says you spent a lot; the receipts say which orders were the expensive ones.",
      "code": [
        {
          "language": "typescript",
          "filename": "task-cost.ts",
          "source": "type Msg = { role: string; usage?: { cost?: { total?: number } } };\n\nconst msgs: Msg[] = [\n  { role: \"assistant\", usage: { cost: { total: 0.012 } } },\n  { role: \"toolResult\" },\n  { role: \"assistant\", usage: { cost: { total: 0.008 } } },\n];\n\nconst cost = msgs.reduce((s, m) => s + (m.usage?.cost?.total ?? 0), 0);\nconsole.log(cost.toFixed(3));\n",
          "output": "0.020",
          "explanation": "The tool result has no `usage`, so it adds 0. The two assistant messages add 0.012 and 0.008, which gives 0.02, printed with three decimals as 0.020."
        },
        {
          "language": "typescript",
          "filename": ".pi/extensions/cost-meter.ts",
          "source": "import type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\n\ntype Entry = {\n  type: string;\n  message?: { role?: string; usage?: { cost?: { total?: number } } };\n};\n\nexport default function (pi: ExtensionAPI) {\n  let startCount = 0;\n\n  pi.on(\"agent_start\", async (_event, ctx) => {\n    startCount = ctx.sessionManager.getBranch().length;\n  });\n\n  pi.on(\"agent_settled\", async (_event, ctx) => {\n    const entries = ctx.sessionManager.getBranch() as unknown as Entry[];\n    const cost = entries\n      .slice(startCount)\n      .filter((e) => e.type === \"message\" && e.message?.role === \"assistant\")\n      .reduce((s, e) => s + (e.message?.usage?.cost?.total ?? 0), 0);\n    ctx.ui.notify(`run cost $${cost.toFixed(4)}`, \"info\");\n  });\n}\n",
          "output": "",
          "explanation": "Loading prints nothing. After each agent run, Pi shows a notification such as `run cost $0.0123`; the value depends on your model and task, so it is not shown here."
        }
      ],
      "productionNote": "Put a cost-per-task table (median and maximum) in your project README. It lets readers judge whether your agent is affordable, and it gives you a baseline to compare when you change models or prompts.",
      "commonMistakes": [
        "Forgetting failed or retried runs. They were billed too, so leave them in the total.",
        "Reading all branches of the session instead of the active branch, which counts abandoned attempts twice.",
        "Reporting only the average. One expensive task can hide behind it, so also report the median and maximum."
      ],
      "sources": [
        {
          "title": "Pi docs: ctx.sessionManager",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#ctxsessionmanager"
        },
        {
          "title": "Pi docs: session format",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/session-format.md"
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Why does the cost of an agent run grow faster than the number of turns?",
      "options": [
        "Each turn resends the whole history, so input tokens grow every turn",
        "Each turn the provider raises its price per token",
        "Output tokens are free after the first turn",
        "Tool calls are billed as a flat fee per turn"
      ],
      "answerIndex": 0,
      "explanation": "The model has no memory between calls, so the agent sends the system prompt, the request and all earlier messages again each turn. Input tokens, and therefore cost, grow with every turn."
    },
    {
      "question": "When is it sensible to use a cheap model and when a strong one?",
      "options": [
        "Cheap for the final code fix, strong for reading files",
        "Always cheap, because price is the only thing that matters",
        "Cheap for exploring (search, read, summarise), strong for the final fix",
        "Switch models after every single turn to balance the load"
      ],
      "answerIndex": 2,
      "explanation": "Exploration is simple and makes up most turns, so a cheap model handles it. The final change needs more intelligence, so switch to a strong model for it."
    },
    {
      "question": "Which change is most likely to break prompt caching in a long session?",
      "options": [
        "Asking a longer question as the last message",
        "Reading a file with the read tool",
        "Running the cost-meter extension",
        "Editing AGENTS.md or rewriting the system prompt in the middle of the session"
      ],
      "answerIndex": 3,
      "explanation": "The cache matches an identical beginning of the prompt. Changing the system prompt or AGENTS.md changes the beginning, so everything after it is a cache miss and billed at full input price."
    },
    {
      "question": "Which field of an assistant message's usage gives the dollar cost of that call?",
      "options": [
        "usage.totalTokens",
        "usage.cost.total",
        "usage.cacheRead",
        "usage.input"
      ],
      "answerIndex": 1,
      "explanation": "`usage.cost.total` is the dollar cost Pi computed. The other fields are token counts, not money."
    },
    {
      "question": "How do you prove that a cheaper setup is good enough?",
      "options": [
        "Check that its per-token price is lower",
        "Try one prompt and see if the answer looks fine",
        "Run the same eval set with both setups and compare pass rate and cost per task",
        "Ask the cheap model whether it is good enough"
      ],
      "answerIndex": 2,
      "explanation": "Only a fixed eval set shows whether the pass rate stays close while the cost per task drops. A lower price per token alone says nothing about quality or retries."
    }
  ]
});
