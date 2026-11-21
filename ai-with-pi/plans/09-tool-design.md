# 09. Designing Good Tools
Version: Pi 1.6.0 + Node.js 26.13.1 LTS
Prerequisites: 08-first-extension

Week 2 checkpoint: Pi calls your tool reliably. Build `~/pi-lab/.pi/extensions/weather.ts` (Open-Meteo, no API key).

## Learning goals
- Learner can build a `get_weather` tool that calls a real API.
- Learner can write descriptions, `promptSnippet` and `promptGuidelines` that guide tool choice.
- Learner can run the bad-description experiment and measure the difference.
- Learner can return errors the model can act on.
- Learner can validate parameters in the schema and in `execute`.
- Learner can show with 5 test prompts that Pi calls the tool reliably.

## Sub-topics
### A get_weather tool calling a real API
- Concept: two calls: geocode city → lat/lon (`https://geocoding-api.open-meteo.com/v1/search?name=<city>&count=1`, field `results[0].latitude/longitude`), then forecast (`https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&current=temperature_2m,wind_speed_10m`, fields `current.temperature_2m`, `current.wind_speed_10m`). `encodeURIComponent(city)`. Pass `signal` to fetch. Return short text.
- Analogy: asking a receptionist for the weather: first look up the city's address in the directory, then phone that city's weather desk.
- Code example: `weather.ts` registerTool `get_weather`, params `{ city: Type.String({ description: "City name, e.g. Pune", minLength: 2 }) }`; execute: geocode, forecast, `return { content: [{ type: "text", text: \`${place.name}: ${c.temperature_2m}°C, wind ${c.wind_speed_10m} km/h\` }], details: { lat, lon } }` → sample `Pune: 27.3°C, wind 9.4 km/h` (live values vary).
- Production use: wrapping any HTTP API as a tool.
- Common mistakes: not encoding city; no `signal` (Esc cannot cancel); returning the whole JSON blob.
- Sources: https://open-meteo.com/en/docs ; https://open-meteo.com/en/docs/geocoding-api ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#custom-tools

### Descriptions, promptSnippet & promptGuidelines
- Concept: `description` = sent with the tool definition. `promptSnippet` = one-line entry in system prompt `<tools>` section (custom tools omitted there without it). `promptGuidelines` = bullets appended flat to `<rules>`; must name the tool ("Use get_weather when...", never "this tool"). Good description: what, when, inputs, output, limits.
- Analogy: description = product label; snippet = line in the shop directory; guidelines = staff rule card ("send weather questions to get_weather").
- Code example: `description: "Get current temperature and wind for a city using Open-Meteo. Input: city name. Returns one line: '<city>: <temp>°C, wind <speed> km/h'."`, `promptSnippet: "Current weather for a city"`, `promptGuidelines: ["Use get_weather for any question about current weather, temperature or wind in a city; do not guess weather."]`.
- Production use: the cheapest reliability lever.
- Common mistakes: "Use this tool when..."; descriptions longer than needed (context cost).
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#piregistertooldefinition ; https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implement-tool-use

### The bad-description experiment
- Concept: register second tool `wx` with description `"does stuff"` and param `x: Type.String()`; disable get_weather (`/reload` after commenting out, or `pi.setActiveTools`). Same 5 prompts; count calls. Change one thing only.
- Analogy: same shop, but product label wiped — customers walk past it.
- Code example: test prompts: 1 `Weather in Pune?` 2 `Is it windy in Mumbai right now?` 3 `Should I take a jacket in Delhi today?` 4 `What is 2+2?` (should NOT call) 5 `Temperature in London`. Record table `prompt | tool called? | args`. Expected pattern (sample, varies): good description 4/4 correct calls + 0 on prompt 4; bad description fewer correct calls or bash/curl guesses.
- Production use: this is a mini eval (formalized in topic 18).
- Common mistakes: changing model and description at once; running each prompt only once and over-reading the result.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#pigetactivetools--pigetalltools--pisetactivetoolsnames ; https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implement-tool-use

### Returning errors the model can use
- Concept: throw `new Error(msg)` or return `isError: true` → model gets error result and can retry/adjust. Message should say what failed + what to try. Distinguish: not found, network error, HTTP status. Never leak secrets in errors.
- Analogy: helpful "out of stock — try the branch on Main Street" vs a shrug.
- Code example: `if (!data.results?.length) throw new Error(\`City not found: "${params.city}". Try the full city name or a larger nearby city.\`);` and `if (!res.ok) throw new Error(\`Weather service returned HTTP ${res.status}; try again later.\`);` Prompt `Weather in Xyzzyville?` → trace shows `RESULT get_weather error=true` and model asks user/clarifies (sample).
- Production use: recovery loops (topic 17) rely on actionable errors.
- Common mistakes: returning "error" text without `isError`/throw (model may think it succeeded); stack traces to the model.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#tool-definition ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#error-handling

### Validating parameters
- Concept: layer 1 schema (minLength, number ranges `Type.Number({ minimum: 1, maximum: 16 })`, `StringEnum(["celsius","fahrenheit"] as const)`); Pi coerces loose types then validates; errors like `- city: ...`. Layer 2 in execute for rules schema cannot express (trim, reject digits). No re-validation after `tool_call` mutation.
- Analogy: bouncer at the door (schema) + bartender checking ID again for special drinks (execute).
- Code example: add `units: Type.Optional(StringEnum(["celsius", "fahrenheit"] as const))`; forecast URL add `&temperature_unit=fahrenheit` when chosen; in execute `const city = params.city.trim(); if (/\d/.test(city)) throw new Error("City must not contain digits");` → input `"Pune1"` → error text `City must not contain digits`.
- Production use: input validation is also a guardrail (topic 19).
- Common mistakes: trusting model args; validating only in execute (wastes a round trip less clearly).
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#tool-parameter-schemas-and-typebox ; https://open-meteo.com/en/docs

### Checkpoint: Pi calls your tool reliably
- Concept: define "reliable": over the 5 prompts, correct call when needed, no call when not, valid args; run twice (non-determinism). Save results to `weather-check.md`. Read traces with trace.ts (topic 07) or `--mode json`.
- Analogy: a driving test: same route, examiner ticks boxes; pass = all boxes ticked twice.
- Code example: script `check.sh`: `for p in "Weather in Pune?" "What is 2+2?"; do pi --no-session --mode json "$p" 2>/dev/null | grep tool_execution_end | grep -c '"toolName":"get_weather"'; done` (`--mode json` runs the prompt, writes JSONL, exits; no `-p` needed). Expected counts (sample): ≥1 for weather, 0 for math. Counting only `tool_execution_end` lines = 1 per call.
- Production use: pre-merge check for any new tool.
- Common mistakes: counting from one run; testing only happy paths.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/json.md#tool-execution-events ; https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md#invocation-and-output

## Quiz
1. Why must promptGuidelines name the tool? — tests guidelines
2. What should a good error message contain? — tests errors
3. Schema check vs execute check — tests validation
4. In the experiment, what must stay fixed? — tests experiment design
5. Why run the checkpoint prompts twice? — tests reliability
