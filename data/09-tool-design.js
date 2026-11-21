window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "09-tool-design",
  "order": 9,
  "title": "Designing Good Tools",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "A tool is only useful if the model picks it at the right moment, fills in valid arguments and can recover when something goes wrong. You will build a real get_weather tool on a free public API, write the text that steers the model towards it, measure the effect of a bad description, return errors the model can act on, validate inputs in two layers, and finish with a repeatable reliability check.",
  "prerequisites": ["08-first-extension"],
  "subtopics": [
    {
      "id": "get-weather-tool",
      "title": "A get_weather tool calling a real API",
      "explanation": "In the last topic you registered a tool that only did local work. Most useful tools wrap an HTTP API (a web service you talk to with requests, taught in topic 03). Here you will wrap Open-Meteo, a free weather service that needs no API key.\n\nOpen-Meteo's forecast endpoint (one web address that answers one kind of request) wants coordinates, not a city name. So the tool makes two requests in a row. First it calls the geocoding API (geocoding = turning a place name into latitude and longitude) at https://geocoding-api.open-meteo.com/v1/search with the query parameters (the name=value pairs after the ? in a web address) name and count=1. The reply is JSON whose results[0] holds the best match, with fields name, latitude and longitude.\n\nSecond, it calls https://api.open-meteo.com/v1/forecast with latitude, longitude and current=temperature_2m,wind_speed_10m. The reply has a current object with temperature_2m (degrees Celsius) and wind_speed_10m (km/h).\n\nThree details matter. Wrap the city in encodeURIComponent(...), a built-in function that escapes characters such as spaces and & so they cannot break the URL. Pass the signal argument of execute into each fetch, so that pressing Esc in Pi cancels the request. And return one short line of text instead of the raw JSON: everything you return costs tokens and the model only needs the answer.\n\nSetup by hand: open a terminal (Git Bash or PowerShell), run cd ~/pi-lab, then mkdir -p .pi/extensions (on PowerShell use mkdir .pi/extensions). Create the file weather.ts in that folder with your editor and paste the code below. Pi loads project extensions only after you trust the project (topic 08), and /reload inside Pi loads a new file without restarting.\n\nThis first version only handles the happy path (a real city, a working service). Later sub-topics add error handling, validation and better descriptions to this same file.",
      "analogy": "You ask a hotel receptionist for the weather in Pune. They cannot answer from memory, so they first look up the city's address in the directory (geocoding), then phone that city's weather desk with the address (forecast), and finally tell you one short sentence rather than reading you the whole printout.",
      "code": [
        {
          "language": "typescript",
          "filename": "~/pi-lab/.pi/extensions/weather.ts",
          "source": "import type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\nimport { Type } from \"typebox\";\n\nexport default function (pi: ExtensionAPI) {\n  pi.registerTool({\n    name: \"get_weather\",\n    label: \"Get weather\",\n    description: \"Get current temperature and wind for a city using Open-Meteo.\",\n    parameters: Type.Object({\n      city: Type.String({ description: \"City name, e.g. Pune\", minLength: 2 }),\n    }),\n    // _toolCallId starts with _ because this tool does not use it\n    async execute(_toolCallId, params, signal) {\n      // Step 1: city name -> coordinates\n      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(params.city)}&count=1`;\n      const geoRes = await fetch(geoUrl, { signal });\n      const geo = await geoRes.json();\n      const place = geo.results[0];\n\n      // Step 2: coordinates -> current weather\n      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,wind_speed_10m`;\n      const forecastRes = await fetch(forecastUrl, { signal });\n      const forecast = await forecastRes.json();\n      const c = forecast.current;\n\n      return {\n        content: [\n          { type: \"text\", text: `${place.name}: ${c.temperature_2m}°C, wind ${c.wind_speed_10m} km/h` },\n        ],\n        details: { lat: place.latitude, lon: place.longitude },\n      };\n    },\n  });\n}\n",
          "output": "",
          "explanation": "Loading the file prints nothing: it only registers the tool. When you later ask Pi \"Weather in Pune?\", the tool result the model sees is one line such as `Pune: 27.3°C, wind 9.4 km/h` (the numbers are live and will differ). content is what the model reads; details holds extra data (here the coordinates) for logs and display."
        }
      ],
      "productionNote": "Wrapping an HTTP API as a tool is the most common extension you will write. The pattern never changes: translate the model's simple input into the API's request, always forward signal, and shrink the response to the few fields the model needs. Large raw responses waste context window (the amount of text the model can read at once) and money.",
      "commonMistakes": [
        "Putting the city straight into the URL without encodeURIComponent: a name like \"Sao Paulo\" or \"A&B\" breaks or changes the request.",
        "Not passing signal to fetch: Esc in Pi can no longer cancel a slow request.",
        "Returning the whole JSON response as text: it fills the context window with fields the model never uses. Return one short line."
      ],
      "sources": [
        { "title": "Open-Meteo forecast API docs", "url": "https://open-meteo.com/en/docs" },
        { "title": "Open-Meteo geocoding API docs", "url": "https://open-meteo.com/en/docs/geocoding-api" },
        { "title": "Pi extensions: custom tools", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#custom-tools" }
      ]
    },
    {
      "id": "descriptions-snippets-guidelines",
      "title": "Descriptions, promptSnippet and promptGuidelines",
      "explanation": "The model never sees your TypeScript. It only sees text: the tool's name, its description and its parameter schema. So that text decides whether the model picks your tool. Pi gives you three places to write it.\n\ndescription is sent to the model with the tool definition. A good description says what the tool does, when to use it, what inputs it takes, what it returns and any limits. Example: \"Get current temperature and wind for a city using Open-Meteo. Input: city name. Returns one line: '<city>: <temp>°C, wind <speed> km/h'.\" Keep it as short as it can be while still saying all that, because every word is sent on every request and costs tokens.\n\npromptSnippet is a single line that Pi lists in the <tools> section of the system prompt (the hidden instructions at the start of the conversation, from topic 05). Custom tools are left out of that section unless they have a promptSnippet.\n\npromptGuidelines is an array of rule sentences. Pi appends them, all together in one flat list, to the <rules> section of the system prompt. Because the list is flat, the model reads each rule without knowing which tool it came from. So each guideline must name the tool: write \"Use get_weather for ...\", never \"Use this tool for ...\", since \"this tool\" points at nothing.",
      "analogy": "Think of a shop. The description is the label on the product itself (what it is, how to use it). The promptSnippet is the one line in the shop directory by the entrance. The promptGuidelines are the staff rule card behind the counter, shared by everyone, so a rule must say \"send weather questions to the weather desk\" by name, not \"send them to the desk\".",
      "code": [
        {
          "language": "typescript",
          "filename": "~/pi-lab/.pi/extensions/weather.ts",
          "source": "import type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\nimport { Type } from \"typebox\";\n\nexport default function (pi: ExtensionAPI) {\n  pi.registerTool({\n    name: \"get_weather\",\n    label: \"Get weather\",\n    description:\n      \"Get current temperature and wind for a city using Open-Meteo. Input: city name. Returns one line: '<city>: <temp>°C, wind <speed> km/h'.\",\n    promptSnippet: \"Current weather for a city\",\n    promptGuidelines: [\n      \"Use get_weather for any question about current weather, temperature or wind in a city; do not guess weather.\",\n    ],\n    parameters: Type.Object({\n      city: Type.String({ description: \"City name, e.g. Pune\", minLength: 2 }),\n    }),\n    async execute(_toolCallId, params, signal) {\n      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(params.city)}&count=1`;\n      const geo = await (await fetch(geoUrl, { signal })).json();\n      const place = geo.results[0];\n      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,wind_speed_10m`;\n      const c = (await (await fetch(forecastUrl, { signal })).json()).current;\n      return {\n        content: [\n          { type: \"text\", text: `${place.name}: ${c.temperature_2m}°C, wind ${c.wind_speed_10m} km/h` },\n        ],\n        details: { lat: place.latitude, lon: place.longitude },\n      };\n    },\n  });\n}\n",
          "output": "",
          "explanation": "Same tool as before with three new fields. Nothing prints on load. After /reload, the model's system prompt lists get_weather with the line \"Current weather for a city\" and contains the rule about get_weather. The two nested awaits are just a shorter way to write fetch then .json()."
        }
      ],
      "productionNote": "Wording is the cheapest reliability lever you have: it costs no code and no extra model calls. Before adding retries or more tools, read your descriptions as if you were the model and had never seen your project.",
      "commonMistakes": [
        "Writing guidelines like \"Use this tool when...\": the flat rules list does not say which tool \"this\" is. Always use the tool's name.",
        "Making descriptions much longer than needed. Every tool's description is sent on every request, so long ones cost tokens each time.",
        "Leaving out promptSnippet and wondering why the tool is missing from the <tools> section of the system prompt."
      ],
      "sources": [
        { "title": "Pi extensions: pi.registerTool(definition)", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#piregistertooldefinition" },
        { "title": "Anthropic: implement tool use", "url": "https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implement-tool-use" }
      ]
    },
    {
      "id": "bad-description-experiment",
      "title": "The bad-description experiment",
      "explanation": "Do not take on trust that descriptions matter. Measure it. An experiment compares two setups that differ in exactly one thing, using the same inputs, and counts the result.\n\nThe set-up: add a second tool called wx whose description is just \"does stuff\" and whose only parameter is x: Type.String() with no description. It runs the same weather code as get_weather, so only the wording the model sees differs. Then switch get_weather off so the model can only use wx.\n\nPi lets you change which tools are active. pi.getActiveTools() returns the names of the active tools as an array, and pi.setActiveTools(names) replaces that list. Inside a session_start handler (an event handler that runs when a session begins, from topic 08) we take the current list and filter out get_weather. Alternatively, comment out the get_weather registration and run /reload.\n\nUse five fixed prompts: (1) Weather in Pune? (2) Is it windy in Mumbai right now? (3) Should I take a jacket in Delhi today? (4) What is 2+2? (this one should NOT call any weather tool) (5) Temperature in London.\n\nFor each prompt start a fresh run with pi --no-session \"<prompt>\" (so no earlier conversation influences it) and record in a table: prompt, tool called?, arguments. Read the calls in the terminal with Ctrl+O, or with the trace tools from topic 07. Then repeat everything with get_weather active and wx off.\n\nTwo rules keep the experiment honest. Change one thing only: do not switch model and description in the same run. And do not over-read a single run: models are not deterministic (the same prompt can behave differently twice), so run each prompt more than once before concluding anything.",
      "analogy": "Same shop, same customers, same shelf, but you wipe the label off one product. If customers now walk past it, the label was doing the work. If you also moved the product to another shelf, you could not say which change mattered.",
      "code": [
        {
          "language": "typescript",
          "filename": "~/pi-lab/.pi/extensions/wx.ts",
          "source": "import type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\nimport { Type } from \"typebox\";\n\nexport default function (pi: ExtensionAPI) {\n  pi.registerTool({\n    name: \"wx\",\n    label: \"wx\",\n    description: \"does stuff\",\n    parameters: Type.Object({ x: Type.String() }),\n    async execute(_toolCallId, params, signal) {\n      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(params.x)}&count=1`;\n      const geo = await (await fetch(geoUrl, { signal })).json();\n      const place = geo.results[0];\n      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,wind_speed_10m`;\n      const c = (await (await fetch(forecastUrl, { signal })).json()).current;\n      return {\n        content: [\n          { type: \"text\", text: `${place.name}: ${c.temperature_2m}°C, wind ${c.wind_speed_10m} km/h` },\n        ],\n        details: {},\n      };\n    },\n  });\n\n  // Switch get_weather off so only the badly described wx remains\n  pi.on(\"session_start\", async () => {\n    pi.setActiveTools(pi.getActiveTools().filter((name) => name !== \"get_weather\"));\n  });\n}\n",
          "output": "",
          "explanation": "Nothing prints on load. Save this next to weather.ts and run /reload. For the control run, delete or rename wx.ts and /reload again so get_weather is active. Record both runs in a table like the one in the next example."
        },
        {
          "language": "markdown",
          "filename": "weather-experiment.md",
          "source": "| prompt                                  | wx (bad description)   | get_weather (good description) |\n|-----------------------------------------|------------------------|--------------------------------|\n| 1 Weather in Pune?                      | called, x=\"Pune\"       | called, city=\"Pune\"            |\n| 2 Is it windy in Mumbai right now?      | no call, guessed       | called, city=\"Mumbai\"          |\n| 3 Should I take a jacket in Delhi today?| tried bash + curl      | called, city=\"Delhi\"           |\n| 4 What is 2+2?                          | no call                | no call                        |\n| 5 Temperature in London                 | called, x=\"London\"     | called, city=\"London\"          |\n| correct weather calls (of 4)            | 2/4                    | 4/4                            |\n",
          "output": "",
          "explanation": "This is a SAMPLE of what a result can look like, not a promised outcome: real runs vary by model and by run. The typical pattern is that the good description gets every weather call right and no call on prompt 4, while the bad description misses some or sends the model to guess with bash and curl. Fill in your own numbers."
        }
      ],
      "productionNote": "This is a mini evaluation (an eval: a fixed set of tasks scored the same way every time). Topic 18 automates it. The habit to keep: when you change a tool's wording, re-run the same prompts and compare counts instead of trusting a feeling.",
      "commonMistakes": [
        "Changing the model and the description in the same run, so you cannot tell which one caused the difference.",
        "Running each prompt only once and over-reading the result: one run can be luck in either direction.",
        "Forgetting prompt 4 (a question that should not call the tool): a tool that is called for everything is not reliable either."
      ],
      "sources": [
        { "title": "Pi extensions: getActiveTools, getAllTools, setActiveTools", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#pigetactivetools--pigetalltools--pisetactivetoolsnames" },
        { "title": "Anthropic: implement tool use", "url": "https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implement-tool-use" }
      ]
    },
    {
      "id": "errors-the-model-can-use",
      "title": "Returning errors the model can use",
      "explanation": "Things fail: the city does not exist, the Wi-Fi drops, the service is down. What matters is what the model hears. If execute throws an Error (throw new Error(message)), Pi turns it into a tool result marked isError: true (the flag from topic 06 that says the call failed). Returning an object with isError: true does the same. The model then reads your message and can retry, change its arguments or ask the user.\n\nA good error message says what failed and what to try next. Compare \"City not found: \\\"Xyzzyville\\\". Try the full city name or a larger nearby city.\" with just \"error\". The first lets the model recover on its own.\n\nSeparate the failure kinds, because each needs different advice. Not found (the geocoding reply has no results): suggest another spelling. Network error (fetch itself fails, for example no connection): say the service could not be reached. HTTP status (the server answered, but with a failure code; res.ok is false): include the status number and say to try later.\n\nOne exception to rewrap: if the user pressed Esc, fetch rejects because the signal was aborted. Rethrow that error unchanged so cancellation still looks like cancellation.\n\nNever put secrets (API keys, tokens) or a full stack trace (the list of internal function calls printed after a crash) in a message. The model does not need them and they cost tokens.\n\nTry it with the prompt Weather in Xyzzyville?. In the trace you should see the tool result flagged as an error and the model reacting, for example by asking which city you meant (sample behaviour; it varies).",
      "analogy": "A good shop assistant says \"that is out of stock, try our branch on Main Street\". A bad one shrugs. Both tell you the item is not here, but only the first gives you a next step.",
      "code": [
        {
          "language": "typescript",
          "filename": "~/pi-lab/.pi/extensions/weather.ts",
          "source": "import type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\nimport { Type } from \"typebox\";\n\n// Fetch a URL and return parsed JSON, or throw an error the model can act on\nasync function getJson(url: string, signal?: AbortSignal) {\n  let res: Response;\n  try {\n    res = await fetch(url, { signal });\n  } catch (err) {\n    if (signal?.aborted) throw err; // user pressed Esc: keep it a cancellation\n    throw new Error(\"Could not reach the weather service (network error). Try again in a moment.\");\n  }\n  if (!res.ok) {\n    throw new Error(`Weather service returned HTTP ${res.status}; try again later.`);\n  }\n  return res.json();\n}\n\nexport default function (pi: ExtensionAPI) {\n  pi.registerTool({\n    name: \"get_weather\",\n    label: \"Get weather\",\n    description:\n      \"Get current temperature and wind for a city using Open-Meteo. Input: city name. Returns one line: '<city>: <temp>°C, wind <speed> km/h'.\",\n    promptSnippet: \"Current weather for a city\",\n    promptGuidelines: [\n      \"Use get_weather for any question about current weather, temperature or wind in a city; do not guess weather.\",\n    ],\n    parameters: Type.Object({\n      city: Type.String({ description: \"City name, e.g. Pune\", minLength: 2 }),\n    }),\n    async execute(_toolCallId, params, signal) {\n      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(params.city)}&count=1`;\n      const geo = await getJson(geoUrl, signal);\n      if (!geo.results?.length) {\n        throw new Error(`City not found: \"${params.city}\". Try the full city name or a larger nearby city.`);\n      }\n      const place = geo.results[0];\n\n      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,wind_speed_10m`;\n      const c = (await getJson(forecastUrl, signal)).current;\n      return {\n        content: [\n          { type: \"text\", text: `${place.name}: ${c.temperature_2m}°C, wind ${c.wind_speed_10m} km/h` },\n        ],\n        details: { lat: place.latitude, lon: place.longitude },\n      };\n    },\n  });\n}\n",
          "output": "",
          "explanation": "Nothing prints on load. With the prompt `Weather in Xyzzyville?` the geocoding reply has no results, so the tool throws `City not found: \"Xyzzyville\". Try the full city name or a larger nearby city.` and the trace shows that tool result with isError true. The ?. in geo.results?.length (optional chaining, topic 03) makes a missing results field give undefined instead of crashing."
        }
      ],
      "productionNote": "Automatic recovery (topic 17) only works if errors are actionable. A model that receives \"failed\" will repeat the same call; a model that receives \"try a larger nearby city\" changes its input.",
      "commonMistakes": [
        "Returning ordinary text like \"Error: not found\" without throwing or setting isError: true. The model may treat it as a successful result.",
        "Sending a raw stack trace or an internal exception message to the model instead of a short sentence saying what to try.",
        "Using one generic message for every failure, so the model cannot tell \"fix your input\" from \"try again later\"."
      ],
      "sources": [
        { "title": "Pi extensions: tool definition", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#tool-definition" },
        { "title": "Pi extensions: error handling", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#error-handling" }
      ]
    },
    {
      "id": "validating-parameters",
      "title": "Validating parameters",
      "explanation": "Never trust arguments from the model: it can send an empty string, a wrong type or an out-of-range number. Validate in two layers.\n\nLayer 1 is the schema (the description of allowed inputs from topic 08). Pi checks the arguments against it before execute runs. First it coerces loose types, for example the text \"5\" becomes the number 5 when a number is expected. Then it validates. If a check fails, the model gets an error message that lists each problem on its own line, in a form like \"- city: ...\", and can fix the call. Useful constraints: minLength on strings, Type.Number({ minimum: 1, maximum: 16 }) for a number range, and StringEnum([\"celsius\", \"fahrenheit\"] as const; as const tells TypeScript the list holds exactly these words, not any text), a helper (imported from @earendil-works/pi-ai) that allows only the listed words. Wrap a field in Type.Optional(...) when it may be left out.\n\nLayer 2 is code inside execute, for rules a schema cannot express: trim whitespace, reject a city containing digits, check that two fields agree. Throw an Error with a clear message, as in the previous sub-topic.\n\nPi does not run the schema check again if code changes the arguments after validation (a tool_call event handler can do this; topic 10), so a check you rely on must also live in execute.\n\nThe code below adds an optional units parameter. When it is \"fahrenheit\", the forecast URL gets &temperature_unit=fahrenheit and the output shows °F.",
      "analogy": "A nightclub has a bouncer at the door (the schema): wrong age or no ticket, you never get in. Inside, the bartender checks ID again before serving a special drink (the checks in execute), because some rules only make sense once you are at the bar.",
      "code": [
        {
          "language": "typescript",
          "filename": "~/pi-lab/.pi/extensions/weather.ts",
          "source": "import type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\nimport { StringEnum } from \"@earendil-works/pi-ai\";\nimport { Type } from \"typebox\";\n\nasync function getJson(url: string, signal?: AbortSignal) {\n  let res: Response;\n  try {\n    res = await fetch(url, { signal });\n  } catch (err) {\n    if (signal?.aborted) throw err;\n    throw new Error(\"Could not reach the weather service (network error). Try again in a moment.\");\n  }\n  if (!res.ok) {\n    throw new Error(`Weather service returned HTTP ${res.status}; try again later.`);\n  }\n  return res.json();\n}\n\nexport default function (pi: ExtensionAPI) {\n  pi.registerTool({\n    name: \"get_weather\",\n    label: \"Get weather\",\n    description:\n      \"Get current temperature and wind for a city using Open-Meteo. Input: city name, optional units (celsius or fahrenheit, default celsius). Returns one line: '<city>: <temp>°C or °F, wind <speed> km/h'.\",\n    promptSnippet: \"Current weather for a city\",\n    promptGuidelines: [\n      \"Use get_weather for any question about current weather, temperature or wind in a city; do not guess weather.\",\n    ],\n    parameters: Type.Object({\n      city: Type.String({ description: \"City name, e.g. Pune\", minLength: 2 }),\n      units: Type.Optional(StringEnum([\"celsius\", \"fahrenheit\"] as const)),\n    }),\n    async execute(_toolCallId, params, signal) {\n      // Layer 2: rules the schema cannot express\n      const city = params.city.trim();\n      if (city.length < 2) throw new Error(\"City must have at least 2 characters.\");\n      if (/\\d/.test(city)) throw new Error(\"City must not contain digits\");\n\n      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;\n      const geo = await getJson(geoUrl, signal);\n      if (!geo.results?.length) {\n        throw new Error(`City not found: \"${city}\". Try the full city name or a larger nearby city.`);\n      }\n      const place = geo.results[0];\n\n      const fahrenheit = params.units === \"fahrenheit\";\n      const unitParam = fahrenheit ? \"&temperature_unit=fahrenheit\" : \"\";\n      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,wind_speed_10m${unitParam}`;\n      const c = (await getJson(forecastUrl, signal)).current;\n      const symbol = fahrenheit ? \"°F\" : \"°C\";\n      return {\n        content: [\n          { type: \"text\", text: `${place.name}: ${c.temperature_2m}${symbol}, wind ${c.wind_speed_10m} km/h` },\n        ],\n        details: { lat: place.latitude, lon: place.longitude },\n      };\n    },\n  });\n}\n",
          "output": "",
          "explanation": "Nothing prints on load. This is the final weather.ts for the topic. If the model calls it with city \"Pune1\", the schema accepts the string (it has at least 2 characters), then execute throws `City must not contain digits` and the model sees that as an error result. A call with units \"kelvin\" never reaches execute: the schema rejects it and the model is told which value is not allowed."
        }
      ],
      "productionNote": "Input validation is also a safety measure: the arguments come from a model that can be wrong or be tricked, so a tool should refuse bad input itself. Topic 19 builds on this with path and command checks.",
      "commonMistakes": [
        "Trusting the model's arguments and skipping validation. Treat them like input typed by an anonymous user.",
        "Validating only inside execute. Constraints in the schema are visible to the model before it calls, so it gets the call right the first time and avoids a wasted round trip.",
        "Relying on the schema for rules it cannot express, such as \"no digits\" or \"trimmed length at least 2\"."
      ],
      "sources": [
        { "title": "Pi extensions: tool parameter schemas and TypeBox", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#tool-parameter-schemas-and-typebox" },
        { "title": "Open-Meteo forecast API docs", "url": "https://open-meteo.com/en/docs" }
      ]
    },
    {
      "id": "checkpoint-reliability",
      "title": "Checkpoint: Pi calls your tool reliably",
      "explanation": "Week 2 goal: Pi calls get_weather reliably. \"Reliably\" needs a definition you can check. Over the five prompts from the experiment, Pi must (a) call get_weather when weather is asked, (b) not call it for 2+2, and (c) send valid arguments. Because models are not deterministic, the whole set must pass twice.\n\nTo count calls automatically, use pi --no-session --mode json \"<prompt>\". Mode json runs the prompt, prints one JSON event per line (JSONL, topic 07) and exits; you do not need -p. Pi prints a tool_execution_end event when a tool call finishes, so counting those lines that name get_weather gives the number of calls, exactly one per call.\n\nIn the script, $(...) runs the command inside it and stores its printed output in the variable n. 2>/dev/null hides stderr (the separate error stream), grep tool_execution_end keeps only those event lines, and grep -c counts the lines that mention the tool name. Save the counts and your notes on arguments in weather-check.md. For a closer look at arguments, open the trace with the reader from topic 07.\n\nExpected pattern (a sample, not a guarantee): count 1 or more for the three weather prompts that name a city, 0 for the math prompt.",
      "analogy": "A driving test. The examiner uses the same route every time and ticks boxes: stopped at the sign, signalled, did not run the light. You pass only when every box is ticked, and to be sure it was not luck you do the route twice.",
      "code": [
        {
          "language": "bash",
          "filename": "check.sh",
          "source": "#!/usr/bin/env bash\n# Run from ~/pi-lab. Each line prints: run | prompt | number of get_weather calls\nfor run in 1 2; do\n  for p in \"Weather in Pune?\" \"Is it windy in Mumbai right now?\" \"Should I take a jacket in Delhi today?\" \"What is 2+2?\" \"Temperature in London\"; do\n    n=$(pi --no-session --mode json \"$p\" 2>/dev/null | grep tool_execution_end | grep -c '\"toolName\":\"get_weather\"')\n    echo \"run $run | $p | $n\"\n  done\ndone\n",
          "output": "run 1 | Weather in Pune? | 1\nrun 1 | Is it windy in Mumbai right now? | 1\nrun 1 | Should I take a jacket in Delhi today? | 1\nrun 1 | What is 2+2? | 0\nrun 1 | Temperature in London | 1\nrun 2 | Weather in Pune? | 1\nrun 2 | Is it windy in Mumbai right now? | 1\nrun 2 | Should I take a jacket in Delhi today? | 1\nrun 2 | What is 2+2? | 0\nrun 2 | Temperature in London | 1",
          "explanation": "Run it with bash check.sh (Git Bash on Windows). The output is a SAMPLE of a passing result; yours can differ, and a 0 on a weather prompt or a 1 on the math prompt means the tool is not yet reliable. Fix the description and run again. Then copy the table into weather-check.md."
        }
      ],
      "productionNote": "Run a check like this before merging any new tool into a shared project. It is small, but it is the first step toward a full evaluation suite (topic 18).",
      "commonMistakes": [
        "Judging reliability from one run: a model can pass once by luck.",
        "Testing only happy paths. Include a prompt that must not call the tool, and later a misspelt city to see the error path.",
        "Counting all JSON lines instead of only tool_execution_end lines, which inflates the numbers."
      ],
      "sources": [
        { "title": "Pi JSON mode: tool execution events", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/json.md#tool-execution-events" },
        { "title": "Pi CLI: invocation and output", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md#invocation-and-output" }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Why must each entry in promptGuidelines name the tool, for example \"Use get_weather when...\"?",
      "options": [
        "Pi refuses to load a guideline that does not contain a tool name",
        "Guidelines are appended to one flat rules list, so the model cannot tell which tool \"this tool\" refers to",
        "The tool name makes the guideline run faster",
        "Guidelines are only shown to the model when they contain a name in capital letters"
      ],
      "answerIndex": 1,
      "explanation": "All guidelines from all tools land in one flat list in the system prompt. A rule that says \"this tool\" has no anchor there, so it must use the tool's actual name."
    },
    {
      "question": "What should a good tool error message contain?",
      "options": [
        "The full stack trace so the model can debug the code",
        "Only the word \"error\", to keep it short",
        "What failed and what the model should try next",
        "The API key used for the request, so the model can retry"
      ],
      "answerIndex": 2,
      "explanation": "The model can only recover if it knows what went wrong and what to change. Stack traces add noise and secrets must never be placed in errors."
    },
    {
      "question": "What is the difference between the schema check and the check inside execute?",
      "options": [
        "The schema check runs before execute and handles simple rules like types, lengths and allowed values; execute handles rules the schema cannot express, like rejecting digits",
        "There is no difference; Pi runs both identically and you only need one",
        "The schema check runs after execute to verify the result",
        "execute checks only the type of each field, the schema checks the meaning"
      ],
      "answerIndex": 0,
      "explanation": "The schema is the first gate and its constraints guide the model. Custom rules that a schema cannot describe belong in execute."
    },
    {
      "question": "In the bad-description experiment, what must stay fixed between the two runs?",
      "options": [
        "Nothing, as long as you run each prompt once",
        "The tool description, since it is what you are measuring",
        "The prompts, the model and everything else except the tool wording",
        "The number of tools Pi has loaded in total"
      ],
      "answerIndex": 2,
      "explanation": "A fair experiment changes one variable. The five prompts and the model stay the same so any difference in calls can be put down to the description."
    },
    {
      "question": "Why run the checkpoint prompts twice instead of once?",
      "options": [
        "Pi ignores the first run of any prompt",
        "The second run is cheaper because of caching, so it costs nothing",
        "A tool must be called twice before the log records it",
        "Model behaviour varies between runs, so a single pass could be luck"
      ],
      "answerIndex": 3,
      "explanation": "The same prompt can lead to different choices on different runs. Passing twice gives more confidence that the tool is called reliably."
    }
  ]
});
