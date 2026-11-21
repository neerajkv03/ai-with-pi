# 04. How LLMs Work
Version: Pi 1.6.0 + Node.js 26.13.1 LTS
Prerequisites: 03-modules-async-node

Mostly concepts; every sub-topic ends in a tiny TS script (deterministic math) or a Pi observation. Files in `~/pi-lab/llm/`.

## Learning goals
- Learner can tell AI, machine learning and LLMs apart.
- Learner can explain tokens and the context window, and estimate tokens for a text.
- Learner can explain next-token prediction and what temperature changes.
- Learner can compute a request's cost from per-million-token prices.
- Learner can name why models hallucinate and two ways to reduce it.
- Learner can choose a cheap vs strong model from the OpenCode Zen catalog for a task.

## Sub-topics
### AI vs ML vs LLM
- Concept: AI = machines doing tasks needing intelligence; ML = learning patterns from data instead of hand rules; LLM (large language model) = ML model trained on huge text to continue text. Generative AI = models that create text/images. Agent = LLM + loop + tools (preview of 06).
- Analogy: nested dolls: AI biggest, ML inside, LLM inside ML; agent = the doll given hands (tools).
- Code example: none runnable; a 3-row table "rule-based spam filter / trained spam classifier / LLM writing a reply".
- Production use: picking the right tool — not every problem needs an LLM (exact math → plain code).
- Common mistakes: thinking LLMs "look things up" (they predict text unless given tools); calling every script "AI".
- Sources: https://developers.google.com/machine-learning/intro-to-ml/what-is-ml ; https://docs.anthropic.com/en/docs/intro

### Tokens & the context window
- Concept: token = chunk of text (word piece) the model reads/writes; rough rule ≈ 4 characters of English per token (estimate only, varies by model). Context window = max tokens per request (system prompt + history + tool results + reply). Over limit → error or Pi compaction (topic 14). Pi footer and `/session` show tokens.
- Analogy: context window = whiteboard of fixed size; every message, file and tool result takes space; when full, something must be erased or summarized.
- Code example: `tokens.ts`: `const estimate = (s: string) => Math.ceil(s.length / 4); const text = "Read the file src/math.ts and explain divide()."; console.log(text.length, estimate(text));` → `47 12`. State clearly: estimate, real tokenizers differ.
- Production use: budgeting tool output (Pi truncates tool output at 50KB / 2000 lines).
- Common mistakes: pasting huge files into context; assuming tokens = words.
- Sources: https://platform.openai.com/docs/concepts/tokens ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#output-truncation

### Next-token prediction & temperature
- Concept: model outputs a score (logit) per possible next token → softmax turns scores into probabilities → one token sampled → repeat. Temperature divides logits before softmax: low = sharper (more predictable), high = flatter (more varied). Same prompt can give different answers. Pi exposes thinking levels, not temperature (temperature is a provider/model parameter) — keep this as concept only.
- Analogy: autocomplete on a phone, but asked thousands of times in a row; temperature = how adventurous the typist is picking among suggestions.
- Code example: `softmax.ts`: `function softmax(logits: number[], t: number): number[] { const e = logits.map((x) => Math.exp(x / t)); const s = e.reduce((a, b) => a + b, 0); return e.map((x) => Number((x / s).toFixed(3))); } console.log(softmax([2, 1, 0], 1)); console.log(softmax([2, 1, 0], 0.5));` → `[ 0.665, 0.245, 0.09 ]` / `[ 0.867, 0.117, 0.016 ]`.
- Production use: why evals run tasks more than once (topic 18).
- Common mistakes: expecting identical output every run; thinking temperature 0 guarantees correctness.
- Sources: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/exp ; https://platform.openai.com/docs/guides/text

### Models, providers & cost per token
- Concept: model = trained network (e.g. Claude Sonnet, GLM); provider = service hosting it with an API. Price quoted per 1 million input tokens and per 1M output tokens; output usually costlier. Zen examples (fetched 2026-11-21): GLM 5.3 $1.40 in / $4.40 out; Kimi K3 $3 / $15; MiniMax M3 $0.30 / $1.20 (state "prices change; check the page"). Pi shows cost in footer and `/session`.
- Analogy: taxi meter: one rate for distance you ride in (input), higher rate for luggage you take out (output).
- Code example: `price.ts`: `const cost = (inTok: number, outTok: number, inP: number, outP: number) => (inTok * inP + outTok * outP) / 1_000_000; console.log(cost(20_000, 2_000, 1.40, 4.40).toFixed(4)); console.log(cost(20_000, 2_000, 3, 15).toFixed(4)); console.log(cost(20_000, 2_000, 0.30, 1.20).toFixed(4));` → `0.0368` / `0.0900` / `0.0084`.
- Production use: cost per task metric in evals and the portfolio README (topics 18, 20, 23).
- Common mistakes: ignoring that an agent sends the whole history every turn (input grows); comparing prices per 1K vs per 1M.
- Sources: https://opencode.ai/docs/console/models ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sessions.md#continue-or-switch-sessions

### Hallucination & limits
- Concept: hallucination = fluent but false output (made-up API, file, citation). Causes: prediction not lookup; training cutoff; missing context. Mitigations: give real context (tools, retrieval — topics 11–13), ask for sources, allow "I don't know", verify with tests.
- Analogy: confident tourist guide who never says "I don't know" — invents a street name rather than admit it.
- Code example: Pi observation: ask `What does the function parseInvoice in this repo do?` in `pi-lab` (no such function) → sample answer may invent; then `Use read/bash to check first, say if it does not exist` → model runs `grep`/`ls` and reports none (sample, varies).
- Production use: every agent answer path should be checkable (citations, tests).
- Common mistakes: trusting citations without opening them; blaming the model instead of missing context.
- Sources: https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations

### Choosing a model across vendors (OpenCode Zen: Claude, GPT, open models)
- Concept: trade-offs: quality, speed, price, context size, tool-calling reliability. Zen catalog has Claude (Opus/Sonnet/Haiku), GPT, Gemini, open models (GLM, Kimi, Qwen, DeepSeek, MiniMax). Rule of thumb: cheap model to explore, strong model to finish (deep dive topic 20). Switch with `/model` or `pi --model <pattern>`; list with `pi --list-models opencode`. Tool-calling support per model not stated by Zen → test it yourself (evals, topic 18).
- Analogy: choosing a vehicle: scooter (cheap, fast, small loads) for errands, truck (expensive, strong) for the big move.
- Code example: in Pi: `/model` → pick a cheap open model → ask `List the files here`; then `/model` → strong model → same prompt; compare `/session` cost (sample numbers, varies).
- Production use: per-task model routing to control cost.
- Common mistakes: always using the most expensive model; never re-testing after a model change.
- Sources: https://opencode.ai/docs/console/models ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md#models

## Quiz
1. Estimate tokens for a 400-character text — tests tokens
2. What happens to probabilities when temperature drops? — tests temperature
3. Cost of 10,000 in / 1,000 out at $3/$15 per 1M — tests cost math ($0.045)
4. Name two ways to reduce hallucination — tests limits
5. Why use a cheap model first? — tests model choice
