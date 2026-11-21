GOAL
Learn Generative AI with agents using Pi coding agent harness, by understanding the agent loop and building each piece in TypeScript, ending with a shippable portfolio agent.

WHAT PI IS
Pi is an open-source, minimal, extensible terminal coding agent harness from Earendil. It gives an interactive terminal where a model can inspect a project and use built-in tools for reading, writing, editing files and executing shell commands.
It ships with just four tools: read, write, edit, bash. Its system prompt is under 1,000 tokens with tool definitions included. It is written in TypeScript.
Pi deliberately has no MCP, sub-agents, or plan mode built in. You add exactly what you want with TypeScript extensions, skills, prompt templates, and themes bundled as shareable packages.
Main packages: pi-coding-agent is the CLI you run, pi-agent-core is the runtime handling tool calling and state management.

CORE AGENT MENTAL MODEL
Every agent is the same loop: Reason, Act with a tool call, Observe the tool result, Reason again.
On top of the loop: Context (system prompt, files, history, retrieved docs), Tools (typed functions the model can call), Memory (short term in session, long term in files or vector store), Planning (break goal into steps, replan after observations), Evaluation (same tasks, same scoring, every time you change something).
Key pattern: ReAct, which is reason, act, observe, repeat, wiring an LLM to external tools.
Learning sequence: AI fundamentals, LLM fundamentals, prompting and APIs, RAG, AI agents, then evaluation and production systems.

EXTENSION SYSTEM
Pi has three extension mechanisms:

1. Extensions: .ts files for custom tools, event handlers, commands, using the Extension API.
2. Skills: SKILL.md plus resources, for domain workflows, instructions, scripts, and references.
3. Prompt Templates: .md files for reusable prompt snippets with argument expansion.
   Extensions are TypeScript modules that extend Pi behavior. They can subscribe to lifecycle events, register custom tools callable by the LLM, add commands, and more.
   Skills teach the agent how to use a CLI tool or follow a convention. Extensions are for when you need programmatic control.

SETUP
Requirement: Node.js 22.19.0 or later.
Install: npm install -g @earendil-works/pi-coding-agent
Run: pi
Inside Pi: /login to connect a provider, /model to switch models, /session to manage sessions. Pi supports 15+ providers including Anthropic, OpenAI, and OpenRouter.
Key files:

- ~/.pi/agent/settings.json: default provider, model, thinking level, UI prefs
- ~/.pi/agent/models.json: custom providers and models
- ~/.pi/agent/extensions/: global extensions
- .pi/extensions/: project-local extensions
- AGENTS.md in a repo: persistent instructions Pi reads every session

6-WEEK PLAN, 60 TO 90 MINUTES A DAY
Week 1: Focusing on LLM and tool calling by inspecting Pi traces and practicing prompt engineering leads to the checkpoint of explaining one full Pi trace tool by tool.
Details: Run Pi on a small repo for a refactor, read every tool call. Learn system prompt vs user prompt vs tool output, tokens and context window, temperature, structured output, and why tool descriptions matter. Daily drill: ask Pi why it chose a tool.

Week 2: Focusing on custom tools and extensions by building your first extension leads to the checkpoint where Pi can call your tool reliably.
Details: Build a tool with pi.registerTool with name, description, parameters schema, and execute function. Example: get_weather tool that fetches from an API. Put it in .pi/extensions/weather.ts, reload Pi. Then build a second tool with a badly written description to see how description quality changes behavior.

Week 3: Focusing on RAG and memory by building a doc assistant on your own files leads to the checkpoint where answers cite retrieved chunks instead of hallucinations.
Details: Learn embeddings, chunking, vector search. Build an extension that indexes markdown files, embeds them, returns top chunks to Pi. Use Chroma, Qdrant, or JSON plus cosine similarity. Add a SKILL.md that tells Pi how to answer from docs, when to say it does not know, and how to cite sources.

Week 4: Focusing on planning, MCP, and multi-step work by building a planning agent and MCP bridge leads to the checkpoint where the agent recovers from a failed tool call.
Details: Add planning step: Pi writes a plan file, gets approval, then executes. Bridge Pi to an MCP server via an extension with registerTool plus MCP JSON-RPC bridge. Build multi-step agent: triage a GitHub issue, find relevant code, propose fix, run tests, summarize. Add max steps, timeouts, and clear stop condition.

Week 5: Focusing on evals, guardrails, and cost by building an eval set and safety extension leads to the checkpoint where you can prove a change helped with numbers.
Details: Create 10 fixed tasks in evals folder: 3 easy, 4 medium, 3 hard. Same prompts, same repo state, same scoring rubric. Run them, change one thing, run again. Log pass rate, tokens used, latency. Add guardrails: input validation, output checks, denylist for destructive commands. Cost control: cheap model for exploration, strong model for final code.

Week 6: Focusing on shipping by building a portfolio agent end to end leads to the checkpoint of a deployed demo plus a README with architecture and evals.
Details: Build one portfolio agent end to end, with architecture diagram, tool list, eval results before and after a change, cost per task, failure cases.

PORTFOLIO PROJECT OPTIONS, PICK ONE FOR WEEK 6

1. Repo-aware code review agent: Pi extension plus skill that reviews a PR diff, checks repo conventions, runs tests, posts structured findings.
2. Support agent with RAG: React frontend plus Pi core via SDK plus Week 3 retrieval tool. User asks, agent retrieves, answers with citations, logs trace.
3. Multi-agent triage: One planner agent splits work, one coder agent implements, one reviewer agent checks. Orchestrate with simple TypeScript.

EVALUATION AND SAFETY
Evaluation order: foundation, core components, orchestration, RAG and retrieval, design patterns, safety and evaluation, then production.
Safety: Pi runs bash, edit, write on host shell. It is not a sandbox. Learn in a git repo or scratch directory, commit often.
Add safety extensions: permission-gate.ts to prompt before dangerous bash commands like rm-rf or sudo, protected-paths.ts to block writes to .env, .git/, node_modules/.

WHAT TO SKIP
Do not start by learning three frameworks. Learn the loop in Pi, then LangGraph or LangChain will feel like the same loop with more helpers.
Do not learn agents by only watching videos. Every concept should end in a tool, a trace, or an eval you can rerun.
Do not fine-tune yet. For most agent work, better retrieval, better tools, and better evals beat fine-tuning.
