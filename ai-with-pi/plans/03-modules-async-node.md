# 03. Modules, Async & Node APIs
Version: Node.js 26.13.1 LTS + TypeScript 7.0.2
Prerequisites: 02-typescript-essentials

Files in `~/pi-lab/ts-basics/`. package.json needs `"type": "module"`.

## Learning goals
- Learner can split code into modules with `import`/`export` and install an npm package.
- Learner can explain a Promise and use `async`/`await`.
- Learner can call an HTTP API with `fetch` and parse JSON.
- Learner can catch errors with `try`/`catch` and check `response.ok`.
- Learner can read API keys from environment variables safely.
- Learner can cancel slow work with `AbortSignal.timeout()`.

## Sub-topics
### import/export & npm packages
- Concept: module = one file sharing chosen values via `export`; others `import` them. ES modules (`"type": "module"`). Node type stripping requires explicit `.ts` in relative imports and `import type` for types. npm package import by name; `node:` built-ins (`node:fs/promises`, `node:path`). `export default`.
- Analogy: module = shop; `export` = items on display; `import` = shopping list naming the shop and item.
- Code example: `price.ts`: `export function cost(tokens: number, perM: number): number { return tokens / 1_000_000 * perM; } export type Usage = { tokens: number };` ; `main.ts`: `import { cost } from "./price.ts"; import type { Usage } from "./price.ts"; const u: Usage = { tokens: 2_000_000 }; console.log(cost(u.tokens, 0.3));` → `node main.ts` → `0.6`.
- Production use: Pi extensions `export default function (pi) {}` and import from `@earendil-works/pi-coding-agent`.
- Common mistakes: omitting `.ts` extension → `ERR_MODULE_NOT_FOUND`; importing a type without `import type`.
- Sources: https://nodejs.org/docs/latest-v26.x/api/esm.html ; https://nodejs.org/docs/latest-v26.x/api/typescript.html#importing-types-without-type-keyword

### Promises & async/await
- Concept: async work (network, disk) finishes later; Promise = "value will arrive"; `await` pauses an `async` function until it settles; top-level await in modules; `Promise.all` runs in parallel.
- Analogy: Promise = restaurant buzzer: you get it now, it buzzes when food is ready; `await` = waiting at the counter for the buzz.
- Code example: `wait.ts`: `const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)); console.log("start"); await sleep(100); console.log("after 100ms"); const [a, b] = await Promise.all([Promise.resolve(1), Promise.resolve(2)]); console.log(a + b);` → `start` / `after 100ms` / `3`.
- Production use: every model call and tool `execute` in Pi is async.
- Common mistakes: forgetting `await` (prints `Promise { <pending> }`); `await` inside non-async function.
- Sources: https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS/Promises ; https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await

### fetch & JSON
- Concept: HTTP request = message to a server (method GET/POST, URL, headers, body); `fetch` built into Node; `res.json()` parses; `JSON.stringify` / `JSON.parse`. Use no-key API Open-Meteo for demo.
- Analogy: fetch = posting a letter and waiting for the reply envelope; JSON = reply written on a standard form both sides understand.
- Code example: `geo.ts`: `const res = await fetch("https://geocoding-api.open-meteo.com/v1/search?name=Pune&count=1"); const data = await res.json() as { results?: { name: string; latitude: number; longitude: number }[] }; const p = data.results?.[0]; console.log(p?.name, p?.latitude, p?.longitude);` → `Pune 18.5... 73.8...` (sample; exact decimals from API). Also `JSON.stringify({ a: 1 })` → `{"a":1}`.
- Production use: tools call real APIs (weather in topic 09, Voyage in 11).
- Common mistakes: forgetting `await res.json()`; assuming field exists (use `?.`).
- Sources: https://nodejs.org/docs/latest-v26.x/api/globals.html#fetch ; https://open-meteo.com/en/docs/geocoding-api ; https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse

### Errors with try/catch
- Concept: error = thrown object stopping normal flow; `throw new Error("msg")`; `try/catch/finally`; `err instanceof Error`; fetch does NOT throw on HTTP 404/500 → check `res.ok` / `res.status`; network failure does throw.
- Analogy: try/catch = safety net under a tightrope; `res.ok` check = reading the "returned to sender" stamp — the letter arrived, but says failure.
- Code example: `safe.ts`: `function divide(a: number, b: number): number { if (b === 0) throw new Error("Cannot divide by zero"); return a / b; } try { divide(1, 0); } catch (err) { console.log(err instanceof Error ? err.message : String(err)); } finally { console.log("done"); }` → `Cannot divide by zero` / `done`. fetch: `const r = await fetch("https://httpbin.org/status/404"); console.log(r.ok, r.status);` → `false 404`.
- Production use: tools must turn failures into readable messages for the model (topic 09).
- Common mistakes: empty catch swallowing errors; assuming fetch throws on 404.
- Sources: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch ; https://developer.mozilla.org/en-US/docs/Web/API/Response/ok

### Environment variables & API keys
- Concept: env var = named setting given to a process by the shell; `process.env.NAME` (string | undefined); set: PowerShell `$env:VOYAGE_API_KEY = "..."` (session), Git Bash `export VOYAGE_API_KEY=...`; `.env` file + `node --env-file=.env main.ts`; `.env` in `.gitignore`. Fail fast if missing.
- Analogy: env var = note the receptionist hands the worker at shift start; not printed in the employee handbook (code), so not leaked with it.
- Code example: `key.ts`: `const key = process.env.VOYAGE_API_KEY; if (!key) { console.error("Missing VOYAGE_API_KEY"); process.exit(1); } console.log("key length:", key.length);` → without var: `Missing VOYAGE_API_KEY` (exit 1); with `.env` containing `VOYAGE_API_KEY=abc123` and `node --env-file=.env key.ts` → `key length: 6`.
- Production use: Pi reads `OPENCODE_API_KEY`; extensions read their own keys the same way.
- Common mistakes: committing `.env`; printing the key in logs.
- Sources: https://nodejs.org/docs/latest-v26.x/api/process.html#processenv ; https://nodejs.org/docs/latest-v26.x/api/cli.html#--env-filefile

### AbortSignal & timeouts
- Concept: AbortSignal = cancel switch passed to async work; `AbortSignal.timeout(ms)`; fetch rejects with `TimeoutError` (DOMException name) on timeout, `AbortError` when aborted via controller; `AbortController.abort()`. Pi passes `signal` into every tool `execute` (Esc cancels).
- Analogy: AbortSignal = kitchen timer attached to an order; when it rings, chef stops cooking.
- Code example: `timeout.ts`: `try { await fetch("https://httpbin.org/delay/5", { signal: AbortSignal.timeout(1000) }); } catch (err) { console.log((err as Error).name); }` → `TimeoutError`.
- Production use: agent tools need timeouts so one slow API does not hang the loop (topic 15/17).
- Common mistakes: not passing signal into nested fetch; treating abort as a real failure.
- Sources: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static ; https://nodejs.org/docs/latest-v26.x/api/globals.html#class-abortsignal

## Quiz
1. Why `./price.ts` not `./price`? — tests Node TS imports
2. What prints if you forget `await`? — tests Promises
3. Does fetch throw on 404? — tests res.ok
4. Where should API keys live? — tests env vars
5. Error name when `AbortSignal.timeout` fires — tests timeouts
