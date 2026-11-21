window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "03-modules-async-node",
  "order": 3,
  "title": "Modules, Async & Node APIs",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "Real programs are split into files that share code, wait for slow work such as network calls, and need secrets and safety nets. You will split code into modules (files that share chosen values), use Promises (stand-ins for results that arrive later) and async/await to wait for them, call a web API (a service you reach by sending it a request over the internet) with fetch and read its JSON reply (a plain-text data format), handle errors, keep API keys in environment variables, and cancel slow work with a timeout. Every Pi tool you build later uses all of these.",
  "prerequisites": ["02-typescript-essentials"],
  "subtopics": [
    {
      "id": "import-export-npm",
      "title": "import/export & npm packages",
      "explanation": "A module is one file that shares chosen values with other files. Inside a module, you mark a value with the keyword `export` (a keyword is a word with special meaning in the language) to make it available outside. Another file then uses `import` to bring that value in. Anything you do not export stays private to its file.\n\nThe module system Node.js uses today is called ES modules (ESM, the official JavaScript standard for modules). To tell Node that your project uses it, set `\"type\": \"module\"` in `package.json`. In this course all work for this topic happens in the folder `~/pi-lab/ts-basics/` from topic 02. Open your terminal (PowerShell or Git Bash from topic 01), run `cd ~/pi-lab/ts-basics` (in PowerShell, `cd $HOME/pi-lab/ts-basics`), and run the command shown below. It adds the line to your existing `package.json` for you.\n\nCreate a file named `price.ts` in that folder with the first code example, and a file `main.ts` with the second. Then run `node main.ts`. Node strips the types (topic 02) and runs the code.\n\nTwo rules matter because Node only erases types, it does not rewrite your imports. First, a relative import (a path starting with `./` or `../`) must include the real file extension, so write `\"./price.ts\"`, never `\"./price\"`. Second, when you import something that exists only as a type (a type alias like `Usage`), use `import type { Usage }`. Types vanish when Node strips them, so a normal import of one would ask for a value that does not exist at run time.\n\nA module can also have one `export default`, a single main value that the importer names however it likes: `import greet from \"./greet.ts\"` with no curly braces. Named exports (`export function cost`) are imported with braces, and the name must match.\n\nImports are not only your own files. Import a name with no path to load either an npm package (a ready-made library that you download into the `node_modules` folder with `npm install`) or a Node built-in (code that ships with Node). Built-ins are written with the `node:` prefix, for example `node:path` or `node:fs/promises` (file reading and writing, used in later topics).",
      "analogy": "A module is a shop. `export` puts items on display in the shop window; anything left in the back room is private. `import` is your shopping list: it names the shop (the file path) and the exact items you want. A default export is the shop's single signature item that you can ask for without knowing its label. npm packages are shops in a big shopping centre that you register once with `npm install`, and `node:` built-ins are the services the building itself provides.",
      "code": [
        {
          "language": "bash",
          "filename": "terminal",
          "source": "npm pkg set type=module",
          "output": "",
          "explanation": "Run this once inside ~/pi-lab/ts-basics. `npm pkg set` edits package.json for you and adds `\"type\": \"module\"`, so Node treats your files as ES modules."
        },
        {
          "language": "typescript",
          "filename": "price.ts",
          "source": "export function cost(tokens: number, perM: number): number {\n  return (tokens / 1_000_000) * perM;\n}\n\nexport type Usage = { tokens: number };",
          "output": "",
          "explanation": "This module exports a function (`cost`, which converts a token count and a price per million tokens into a price) and a type (`Usage`). It prints nothing by itself because nobody runs it directly. The underscores in `1_000_000` are only for readability."
        },
        {
          "language": "typescript",
          "filename": "main.ts",
          "source": "import { cost } from \"./price.ts\";\nimport type { Usage } from \"./price.ts\";\n\nconst u: Usage = { tokens: 2_000_000 };\nconsole.log(cost(u.tokens, 0.3));",
          "output": "0.6",
          "explanation": "Run it with `node main.ts`. The relative path ends in `.ts`, and `Usage` is imported with `import type` because it is only a type. 2,000,000 tokens at 0.3 per million prints 0.6."
        },
        {
          "language": "typescript",
          "filename": "greet.ts",
          "source": "export default function greet(name: string): string {\n  return `Hello, ${name}`;\n}",
          "output": "",
          "explanation": "A module with a default export. Save it next to a second file named `hello.ts` that contains `import greet from \"./greet.ts\"; console.log(greet(\"Asha\"));`. Running `node hello.ts` prints `Hello, Asha`. No curly braces are used for a default import."
        },
        {
          "language": "bash",
          "filename": "terminal",
          "source": "npm install typebox",
          "output": "added 1 package, and audited 3 packages in 1s",
          "explanation": "`npm install <name>` downloads a package into node_modules and records it under `dependencies` in package.json. Then `import { Type } from \"typebox\"` works with no path, because the name has no `./`. TypeBox is the library Pi extensions use to describe tool inputs (topic 08). The exact counts and timing in the output vary between runs."
        }
      ],
      "productionNote": "Every Pi extension is a module with a default export, a function that Pi calls with an extension API object (the object that lets an extension register tools; topic 08): `export default function (pi: ExtensionAPI) { ... }`. It imports from packages by name, such as `@earendil-works/pi-coding-agent` (the Pi package that provides the `ExtensionAPI` type) and `typebox`, and from Node built-ins such as `node:fs/promises`. Node refuses to run TypeScript files that sit inside `node_modules`, so packages you install must ship plain JavaScript.",
      "commonMistakes": [
        "Writing `import { cost } from \"./price\"` without `.ts`. Node fails with `ERR_MODULE_NOT_FOUND` (its error code meaning it could not find that file). Always write the full file name in relative imports.",
        "Importing a type with a normal `import { Usage } from ...`. Types are erased when Node strips them, so the import breaks. Use `import type { Usage }`.",
        "Forgetting `export` on a value, then wondering why the other file cannot import it. Without `export` the value is private to its file.",
        "Mixing up named and default imports: `import { greet } from` for a default export, or `import greet from` for a named one."
      ],
      "sources": [
        { "title": "Node.js: ECMAScript modules", "url": "https://nodejs.org/docs/latest-v26.x/api/esm.html" },
        { "title": "Node.js: TypeScript - importing types without type keyword", "url": "https://nodejs.org/docs/latest-v26.x/api/typescript.html#importing-types-without-type-keyword" }
      ]
    },
    {
      "id": "promises-async-await",
      "title": "Promises & async/await",
      "explanation": "Some work finishes later: reading a file, calling a web API, waiting for a model to answer. JavaScript does not freeze while it waits. Instead, a slow operation immediately gives you a Promise, an object that stands for a value that will arrive later. A Promise is pending until it settles, either fulfilled (it has a value) or rejected (it failed with an error).\n\nThe keyword `await` pauses your code at that line until the Promise settles, then gives you its value. `await` may only be used inside a function marked `async`, which is a function that returns a Promise. In a module file (like all yours now) you may also use `await` at the top level, outside any function. This is called top-level await.\n\nThe example below builds a `sleep` helper from `setTimeout` (a built-in that runs a function after a number of milliseconds). In `Promise<void>` and `Promise<number>`, the part in angle brackets is the type of the value the Promise will deliver; `void` means no value. `new` creates a fresh object from a built-in recipe, and `resolve` is the function you call to finish the Promise.\n\n`Promise.all` takes a list of Promises, starts them all at once, and gives back a list of their results in the same order once every one has finished. Two 50 ms jobs run together take about 50 ms, not 100 ms. In `const [a, b] = ...` the square brackets unpack the first and second items of that list into two variables.",
      "analogy": "A Promise is the buzzer a restaurant hands you: you get it immediately, and it buzzes when the food is ready. `await` is standing at the counter doing nothing else until the buzzer goes off. `Promise.all` is ordering at several counters at once and waiting until every buzzer has gone off, rather than queuing at one counter after another.",
      "code": [
        {
          "language": "typescript",
          "filename": "wait.ts",
          "source": "const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));\n\nasync function slowDouble(n: number): Promise<number> {\n  await sleep(50);\n  return n * 2;\n}\n\nconsole.log(\"start\");\nawait sleep(100);\nconsole.log(\"after 100ms\");\nconst [a, b] = await Promise.all([slowDouble(1), slowDouble(2)]);\nconsole.log(a + b);",
          "output": "start\nafter 100ms\n6",
          "explanation": "Run with `node wait.ts`. It prints `start`, waits 100 ms, prints `after 100ms`, then runs both `slowDouble` calls at the same time. The results are 2 and 4, so it prints 6."
        },
        {
          "language": "typescript",
          "filename": "forgot.ts",
          "source": "const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));\n\nconst p = sleep(10);\nconsole.log(p);\nawait p;\nconsole.log(\"settled\");",
          "output": "Promise { <pending> }\nsettled",
          "explanation": "Without `await`, you hold the buzzer, not the food: printing the Promise shows `Promise { <pending> }`. Only after `await p` has the work finished."
        }
      ],
      "productionNote": "Every model call in Pi and every tool's `execute` function is async. A tool returns a Promise, and Pi awaits it before sending the result back to the model. If you forget to `await` inside a tool, the tool returns before its work is done and the model receives an incomplete result.",
      "commonMistakes": [
        "Forgetting `await` and getting `Promise { <pending> }` (or a wrong value) instead of the real result.",
        "Using `await` inside a normal function. It is a syntax error (code the language cannot read) unless the function is marked `async`. Top-level await works only in module files.",
        "Awaiting independent jobs one after another when they could run together with `Promise.all`, making the program needlessly slow."
      ],
      "sources": [
        { "title": "MDN: Using promises", "url": "https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS/Promises" },
        { "title": "MDN: await", "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await" }
      ]
    },
    {
      "id": "fetch-json",
      "title": "fetch & JSON",
      "explanation": "An HTTP request is a message your program sends to a server over the internet. It has a URL (the address), a method (`GET` asks for data, `POST` sends data), headers (extra labelled details such as the content type or an API key), and optionally a body (the data being sent). The server answers with a response that has a status code and a body.\n\n`fetch` is a function built into Node that sends a request and returns a Promise of the response. `await fetch(url)` gives you a response object. A plain `fetch(url)` is a GET. To send data you pass a second argument, for example `{ method: \"POST\", headers: { \"Content-Type\": \"application/json\" }, body: JSON.stringify(data) }`.\n\nMost web APIs send their data as JSON (JavaScript Object Notation), a text format for objects, arrays, strings, numbers, booleans and null. `await res.json()` reads the response body and parses it (turns the text into a real JavaScript object). `res.json()` also returns a Promise, so it needs its own `await`.\n\nTwo functions convert by hand. `JSON.stringify(value)` turns a JavaScript value into JSON text, which you need when you send a body. `JSON.parse(text)` does the reverse.\n\nParsing gives back an unchecked value, so you describe its shape with `as { ... }` (a type assertion: you tell TypeScript what the data looks like; nothing checks that you are right). Because a real API may omit fields, mark possibly missing ones with `?` and read them with `?.` (optional chaining: if the thing on the left is `undefined`, the whole expression becomes `undefined` instead of crashing).\n\nThe demo uses Open-Meteo's geocoding API (it turns a place name into coordinates). It needs no API key but does need an internet connection. Latitude and longitude come back with many decimals, so `toFixed(1)` rounds a number to one decimal place and returns it as a string.",
      "analogy": "`fetch` is posting a letter and waiting for the reply envelope. The URL is the address, the method and headers are the notes on the envelope, and the body is the letter itself. JSON is the standard form the reply is written on, so both sides know exactly where each answer goes; `res.json()` is opening the envelope and reading the form.",
      "code": [
        {
          "language": "typescript",
          "filename": "geo.ts",
          "source": "const res = await fetch(\"https://geocoding-api.open-meteo.com/v1/search?name=Pune&count=1\");\nconst data = (await res.json()) as {\n  results?: { name: string; latitude: number; longitude: number }[];\n};\nconst p = data.results?.[0];\nconsole.log(p?.name, p?.latitude.toFixed(1), p?.longitude.toFixed(1));",
          "output": "Pune 18.5 73.9",
          "explanation": "Run with `node geo.ts` while online. `results` is optional because an unknown city returns no list; `data.results?.[0]` takes the first match (`[0]` is the first item of a list) or `undefined`. The exact decimals come from the live API, so they are rounded here to keep the output stable."
        },
        {
          "language": "typescript",
          "filename": "json.ts",
          "source": "const text = JSON.stringify({ a: 1, tags: [\"x\", \"y\"] });\nconsole.log(text);\n\nconst back = JSON.parse(text) as { a: number; tags: string[] };\nconsole.log(back.tags[1]);",
          "output": "{\"a\":1,\"tags\":[\"x\",\"y\"]}\ny",
          "explanation": "`JSON.stringify` produces compact text with double-quoted keys. `JSON.parse` turns it back into an object, and `back.tags[1]` is the second item of the list, `y`."
        }
      ],
      "productionNote": "Pi tools that reach real services use exactly this pattern: build the URL, `await fetch`, check the result, `await res.json()`, and return readable text to the model. You will build the weather tool in topic 09 and call the Voyage embeddings API (Voyage AI, a service that turns text into lists of numbers; topic 11) using a POST with a JSON body and an API key header.",
      "commonMistakes": [
        "Forgetting `await` on `res.json()`, so you get a pending Promise instead of the data.",
        "Assuming a field exists. Real responses omit fields; use `?.` and handle `undefined`.",
        "Writing `as { ... }` and believing the data is now checked. The assertion only silences TypeScript; a wrong shape still fails at run time.",
        "Sending an object as `body` without `JSON.stringify`; the body must be text."
      ],
      "sources": [
        { "title": "Node.js: globals - fetch", "url": "https://nodejs.org/docs/latest-v26.x/api/globals.html#fetch" },
        { "title": "Open-Meteo Geocoding API", "url": "https://open-meteo.com/en/docs/geocoding-api" },
        { "title": "MDN: JSON.parse()", "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse" }
      ]
    },
    {
      "id": "errors-try-catch",
      "title": "Errors with try/catch",
      "explanation": "An error is an object that is thrown when something goes wrong, which stops the normal flow of the program. You create one yourself with `throw new Error(\"message\")`. If nothing handles it, the program crashes and prints the message.\n\nTo handle an error, wrap risky code in `try { ... }` and put the response in `catch (err) { ... }`. If anything inside `try` throws (including a rejected Promise that you `await`), execution jumps to `catch`. An optional `finally { ... }` block runs afterwards whether or not an error happened, which is the place for cleanup.\n\nIn `catch`, TypeScript treats `err` as `unknown` (a type meaning 'could be any value'), because anything can be thrown. Check with `err instanceof Error` (is it an `Error` object?) before reading `err.message`.\n\nThe most important fetch rule: `fetch` throws only when the request could not complete at all, for example the network is down. If the server answers with a failure such as 404 (not found) or 500 (server error), `fetch` still succeeds and gives you the response. You must check `res.ok` (`true` only for status codes 200 to 299) or `res.status` (the number itself) yourself and throw if it is bad.",
      "analogy": "`try/catch` is the safety net under a tightrope: you walk on, and if you fall the net catches you instead of the floor. The `res.ok` check is reading the \"returned to sender\" stamp on a letter. The postal service did its job (no exception, the letter arrived back), but the stamp says the request failed, and you must look at it yourself.",
      "code": [
        {
          "language": "typescript",
          "filename": "safe.ts",
          "source": "function divide(a: number, b: number): number {\n  if (b === 0) throw new Error(\"Cannot divide by zero\");\n  return a / b;\n}\n\ntry {\n  divide(1, 0);\n} catch (err) {\n  console.log(err instanceof Error ? err.message : String(err));\n} finally {\n  console.log(\"done\");\n}",
          "output": "Cannot divide by zero\ndone",
          "explanation": "`divide` throws, so `try` is abandoned and `catch` prints the message. `finally` runs last. The `a ? b : c` form picks `b` if `a` is true, otherwise `c`; `String(err)` is the fallback for non-Error values."
        },
        {
          "language": "typescript",
          "filename": "status.ts",
          "source": "try {\n  const r = await fetch(\"https://httpbin.org/status/404\");\n  console.log(r.ok, r.status);\n  if (!r.ok) throw new Error(`HTTP ${r.status}`);\n} catch (err) {\n  console.log(err instanceof Error ? err.message : String(err));\n}",
          "output": "false 404\nHTTP 404",
          "explanation": "Run while online. httpbin.org is a test server whose `/status/404` address always answers 404. `fetch` does not throw, so the first line prints `false 404`. Our own `throw` on `!r.ok` (read \"not ok\") then moves into `catch`."
        }
      ],
      "productionNote": "When a Pi tool fails, the model only sees the text you give it. Turn failures into short, readable messages (\"HTTP 404 from the geocoding API\") instead of leaking a raw crash, so the model can decide what to do next. Topic 09 builds on this.",
      "commonMistakes": [
        "Writing an empty `catch {}`. It silently swallows the error, and you never learn what went wrong. At least log the message.",
        "Assuming `fetch` throws on 404 or 500. It does not; check `res.ok`.",
        "Reading `err.message` without checking `err instanceof Error`; a thrown string or number has no `message`."
      ],
      "sources": [
        { "title": "MDN: try...catch", "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch" },
        { "title": "MDN: Response.ok", "url": "https://developer.mozilla.org/en-US/docs/Web/API/Response/ok" }
      ]
    },
    {
      "id": "environment-variables",
      "title": "Environment variables & API keys",
      "explanation": "An API key is a secret string that proves to a service that a request comes from you (and often bills you). Never write one directly in your code, because code gets shared, committed to git and pasted into chats. Instead keep it in an environment variable: a named setting that the shell hands to a program when it starts.\n\nIn Node you read it as `process.env.NAME`. `process` is a built-in object describing the running program, and `process.env` holds its variables. The value is a string, or `undefined` if the variable is not set, so check for that.\n\nFail fast: if a needed key is missing, print a clear message with `console.error` (which writes to the error stream) and stop with `process.exit(1)`.\n\nAn exit code of 1 tells the shell that the program failed; 0 means success.\n\nTo set a variable for the current terminal session only: in PowerShell run `$env:VOYAGE_API_KEY = \"abc123\"`; in Git Bash run `export VOYAGE_API_KEY=abc123`. It disappears when you close the terminal.\n\nTo keep several keys in one place, create a text file named `.env` in the project folder with one `NAME=value` per line, then start Node with `node --env-file=.env key.ts`. Node loads those lines into `process.env` before your code runs. Because `.env` holds secrets, add the line `.env` to a `.gitignore` file (a file listing names git must never commit) so it never reaches a repository. Never print the key itself; printing its length, as below, is a safe check.",
      "analogy": "An environment variable is a note the receptionist hands to a worker at the start of a shift: it holds what they need today, such as a door code. It is not printed in the employee handbook (your code), so when the handbook is photocopied and shared, the code does not leak with it.",
      "code": [
        {
          "language": "typescript",
          "filename": "key.ts",
          "source": "const key = process.env.VOYAGE_API_KEY;\n\nif (!key) {\n  console.error(\"Missing VOYAGE_API_KEY\");\n  process.exit(1);\n}\n\nconsole.log(\"key length:\", key.length);",
          "output": "Missing VOYAGE_API_KEY",
          "explanation": "With no variable set, `node key.ts` prints `Missing VOYAGE_API_KEY` (to the error stream) and exits with code 1. After the `if`, TypeScript knows `key` is a real string, so `key.length` is safe."
        },
        {
          "language": "bash",
          "filename": "Git Bash terminal",
          "source": "echo \"VOYAGE_API_KEY=abc123\" > .env\necho \".env\" >> .gitignore\nnode --env-file=.env key.ts",
          "output": "key length: 6",
          "explanation": "Run these three lines in Git Bash (PowerShell 5.1 writes UTF-16 files with `>`; in PowerShell create `.env` with a text editor instead). The first line creates `.env` (`>` writes a file). The second appends `.env` to `.gitignore` so git ignores it (`>>` adds to the end). The third loads the variable and runs the script; `abc123` has 6 characters, so the program prints `key length: 6` and never reveals the key."
        }
      ],
      "productionNote": "Pi itself reads its OpenCode Zen key from the `OPENCODE_API_KEY` environment variable (or from the login you stored in topic 01). Your extensions should read their own keys the same way, for example `VOYAGE_API_KEY` in topic 11, and fail with a clear message when it is missing.",
      "commonMistakes": [
        "Committing the `.env` file to git. Add it to `.gitignore` before your first commit.",
        "Printing the key in logs or error messages. Log only that it is present, or its length.",
        "Setting the variable in one terminal and running the program in another; a session variable exists only in the terminal where you set it.",
        "Using the value without checking for `undefined`, which later fails with a confusing error."
      ],
      "sources": [
        { "title": "Node.js: process.env", "url": "https://nodejs.org/docs/latest-v26.x/api/process.html#processenv" },
        { "title": "Node.js CLI: --env-file", "url": "https://nodejs.org/docs/latest-v26.x/api/cli.html#--env-filefile" }
      ]
    },
    {
      "id": "abortsignal-timeouts",
      "title": "AbortSignal & timeouts",
      "explanation": "Slow work can hang your program: an API that never answers would freeze an agent forever. An AbortSignal is a cancel switch you pass to async work; when the switch flips, the work stops and its Promise rejects (fails).\n\nThe easiest way to get one is `AbortSignal.timeout(ms)`, a signal that flips by itself after `ms` milliseconds. Hand it to fetch with `fetch(url, { signal })`. If the time runs out first, the Promise rejects with an error whose `name` is `TimeoutError`.\n\nTo cancel by hand (for example when a user presses Esc), create an `AbortController`, an object that owns a signal and a button. `controller.signal` is the signal to pass along, and `controller.abort()` flips it. A manual cancel produces an error named `AbortError`. Both names belong to a `DOMException`, a standard error type used by web APIs; you read `err.name` to tell them apart.",
      "analogy": "An AbortSignal is a kitchen timer attached to an order. `AbortSignal.timeout` is a timer that rings by itself after a set time, and when it rings the chef stops cooking that order and the waiter reports it as taking too long. An `AbortController` is the kitchen manager's stop button: pressing it also stops the chef, but the report says the order was cancelled, not that it ran too long.",
      "code": [
        {
          "language": "typescript",
          "filename": "timeout.ts",
          "source": "try {\n  await fetch(\"https://httpbin.org/delay/5\", { signal: AbortSignal.timeout(1000) });\n} catch (err) {\n  console.log((err as Error).name);\n}",
          "output": "TimeoutError",
          "explanation": "Run while online. httpbin's `/delay/5` waits 5 seconds before answering, but the signal fires after 1 second, so `fetch` rejects with an error named `TimeoutError`. `(err as Error)` tells TypeScript the caught value is an Error so `.name` can be read."
        },
        {
          "language": "typescript",
          "filename": "abort.ts",
          "source": "const controller = new AbortController();\nconsole.log(controller.signal.aborted);\n\ncontroller.abort();\nconsole.log(controller.signal.aborted, controller.signal.reason.name);",
          "output": "false\ntrue AbortError",
          "explanation": "A new controller's signal is not aborted. After `controller.abort()` the signal reports `aborted` as `true`, and its `reason` is an error named `AbortError`. Passing this signal to fetch would make the request reject with that same kind of error."
        }
      ],
      "productionNote": "Pi passes a `signal` into every tool's `execute` function, and it flips when the user cancels with Esc. A tool should forward it to its own `fetch` calls so cancelling really stops the work. Give each outside call a timeout as well, so one slow API cannot hang the whole agent (you will use this in topics 15 and 17).",
      "commonMistakes": [
        "Not passing the signal into nested calls. If a tool receives a signal but its inner `fetch` ignores it, cancelling does nothing.",
        "Treating an abort as a real failure. A user-requested `AbortError` is a normal stop, not a bug to report; check `err.name`.",
        "Setting no timeout at all on network calls, so one stalled server blocks everything."
      ],
      "sources": [
        { "title": "MDN: AbortSignal.timeout()", "url": "https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static" },
        { "title": "Node.js: globals - AbortSignal", "url": "https://nodejs.org/docs/latest-v26.x/api/globals.html#class-abortsignal" }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Why must a relative import in a Node TypeScript file be written `./price.ts` and not `./price`?",
      "options": [
        "Because `.ts` files can only be imported by other `.ts` files in the same folder",
        "Because Node only erases the types and does not guess or rewrite file extensions, so the import must name the real file",
        "Because the `.ts` suffix tells Node to type-check the file before running it",
        "Because without the suffix Node treats the import as an npm package name"
      ],
      "answerIndex": 1,
      "explanation": "Node strips types but leaves the import path as written, so it looks for exactly that file. A missing extension gives `ERR_MODULE_NOT_FOUND`. Node does not type-check the file, and a path starting with `./` is never an npm package."
    },
    {
      "question": "You call an async function without `await` and print the result. What do you see?",
      "options": [
        "`Promise { <pending> }` (or another Promise object), not the real value",
        "The finished value, because Node waits automatically",
        "A syntax error before the program starts",
        "`undefined`"
      ],
      "answerIndex": 0,
      "explanation": "An async function returns a Promise immediately. Without `await` you hold the Promise (the buzzer) instead of its value. Nothing waits automatically, and this is not a syntax error."
    },
    {
      "question": "A `fetch` request reaches the server, which answers with status 404. What happens?",
      "options": [
        "`fetch` throws and the `catch` block runs",
        "`fetch` returns `undefined`",
        "The program exits with code 1",
        "`fetch` returns a response with `ok` set to `false` and `status` 404, and you must check it yourself"
      ],
      "answerIndex": 3,
      "explanation": "`fetch` only throws when the request cannot complete at all, such as a network failure. HTTP error statuses still produce a response, so you check `res.ok` or `res.status` and throw if needed."
    },
    {
      "question": "Where should an API key live in a project like this?",
      "options": [
        "In a constant at the top of the source file, so it is easy to find",
        "In an environment variable, optionally loaded from a `.env` file that is listed in `.gitignore`",
        "In `package.json`, which is committed to git",
        "In a comment above the `fetch` call"
      ],
      "answerIndex": 1,
      "explanation": "Environment variables keep secrets out of the code and out of git. The other options put the key in files that get committed and shared."
    },
    {
      "question": "A `fetch` call is given `AbortSignal.timeout(1000)` and the server takes 5 seconds. What is the name of the error that fetch rejects with?",
      "options": [
        "`AbortError`",
        "`SyntaxError`",
        "`TimeoutError`",
        "`ERR_MODULE_NOT_FOUND`"
      ],
      "answerIndex": 2,
      "explanation": "A signal made by `AbortSignal.timeout` rejects with `TimeoutError`. `AbortError` is what you get when you cancel by hand with `controller.abort()`. A `SyntaxError` is about unreadable code, and `ERR_MODULE_NOT_FOUND` is about missing files."
    }
  ]
});
