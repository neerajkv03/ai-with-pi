window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "04-llm-fundamentals",
  "order": 4,
  "title": "How LLMs Work",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "This topic explains what a large language model (LLM) is and how it differs from AI and machine learning in general. You learn tokens, the context window, next-token prediction, temperature, cost per token, hallucination and how to pick a model. Each idea ends in a tiny script with exact numbers or a short experiment in Pi.",
  "prerequisites": ["03-modules-async-node"],
  "subtopics": [
    {
      "id": "ai-vs-ml-vs-llm",
      "title": "AI vs ML vs LLM",
      "explanation": "Artificial intelligence (AI) is the broad name for machines doing tasks that normally need human intelligence, such as understanding language, recognising images or making plans. Not every program that looks clever is AI: a script with fixed if/else rules is just a program.\n\nMachine learning (ML) is a part of AI. Instead of a person writing every rule by hand, you show a program many examples and it learns the patterns itself. The result of that learning is called a model: a big file of numbers that turns an input into an output. A spam filter trained on thousands of labelled emails is machine learning.\n\nA large language model (LLM) is a machine learning model trained on a huge amount of text so it can continue text. Give it the start of a sentence and it produces a likely continuation. Because answering a question, writing code and summarising a document can all be framed as 'continue this text', one LLM can do many jobs. Generative AI is the name for models that create new content (text, images, audio), and LLMs are the text kind.\n\nAn agent is an LLM placed in a loop and given tools (functions it can ask your program to run, such as reading a file). Pi, the tool you installed in topic 01, is an agent harness: it wraps an LLM with that loop and a set of tools. Topic 06 builds this properly; for now remember agent = LLM + loop + tools.\n\nA plain LLM does not look anything up. It predicts text from patterns it learned during training. It only knows about your files or the web if a tool fetches them and puts the result into the text it reads.",
      "analogy": "Think of nested Russian dolls. The biggest doll is AI, inside it sits machine learning, and inside that sits the LLM. An agent is the LLM doll given hands: it can pick up tools and act, not only talk.",
      "code": [
        {
          "language": "markdown",
          "filename": "ai-types.md",
          "source": "| Task: filter spam         | Approach                    | Kind                          |\n|---------------------------|-----------------------------|-------------------------------|\n| Block emails with 'WIN $$$' | Hand-written if/else rule   | Plain code (not machine learning) |\n| Learn spam from 10,000 labelled emails | Trained spam classifier | Machine learning              |\n| Write a polite reply to an email | Language model continues the text | LLM (generative AI)      |",
          "output": "",
          "explanation": "Three ways to attack email problems. The first is a fixed rule a person wrote, so it is not machine learning. The second learned its rules from examples, so it is machine learning but only classifies. The third is an LLM, which generates new text. Nothing here is run; it is a reference table."
        }
      ],
      "productionNote": "Pick the simplest tool that works. Exact arithmetic, sorting, date maths or checking a file exists should be plain code, which is free, instant and always gives the same answer. Use an LLM only when the task needs understanding or generating natural language. Calling every script 'AI' hides which parts can be wrong.",
      "commonMistakes": [
        "Thinking an LLM looks facts up. It predicts likely text from training patterns unless a tool gives it real data.",
        "Calling every script or if/else rule 'AI'. Hand-written rules are plain code, not machine learning.",
        "Using an LLM for exact maths such as 17 * 243. Plain code gives the exact answer every time."
      ],
      "sources": [
        { "title": "Google: What is machine learning?", "url": "https://developers.google.com/machine-learning/intro-to-ml/what-is-ml" },
        { "title": "Anthropic docs: Intro to Claude", "url": "https://docs.anthropic.com/en/docs/intro" }
      ]
    },
    {
      "id": "tokens-context-window",
      "title": "Tokens and the context window",
      "explanation": "An LLM does not read letters or whole words. It reads tokens: short chunks of text, often a word or a piece of a word. 'Reading' might be one token, while an unusual word like 'divide()' may split into several. Models both read and write in tokens, and providers charge by the token.\n\nA rough rule for English is that one token is about 4 characters. This is only an estimate. Every model has its own tokenizer (the program that cuts text into tokens), so real counts differ, and code, other languages and emoji usually use more tokens per character. Also, tokens are not words: 100 words is usually more than 100 tokens.\n\nThe context window is the maximum number of tokens a model can handle in one request. Everything counts against it: the system prompt (hidden instructions at the start), the earlier conversation history, tool results such as file contents, and the reply the model writes. If you go over the limit the provider returns an error, or Pi shrinks the history by summarising it (called compaction, covered in topic 14). Pi's footer and the `/session` command show token counts.\n\nSetup for the scripts in this topic: open your terminal (Git Bash or PowerShell from topic 01), then run the commands below to create the lab folder and move into it. Create each script as a new file in that folder using any text editor (for example VS Code), and run it with `node` followed by the file name. Node.js 26 runs `.ts` files directly by stripping types (topic 02).",
      "analogy": "The context window is a whiteboard of fixed size. Every instruction, message, file and tool result you add takes up space, and the model's own answer must fit too. When the board is full, something has to be erased or summarised before anything new fits. Tokens are the pen strokes on that board: one word may take one stroke or several, so the board fills faster than a word count suggests.",
      "code": [
        {
          "language": "bash",
          "filename": "setup.sh",
          "source": "mkdir -p ~/pi-lab/llm\ncd ~/pi-lab/llm\npwd",
          "output": "/c/Users/you/pi-lab/llm",
          "explanation": "mkdir -p creates the folder (and any missing parent folders), cd moves into it, and pwd prints where you are. Your path will start differently on your machine."
        },
        {
          "language": "typescript",
          "filename": "tokens.ts",
          "source": "// Rough estimate only: real tokenizers give different counts.\nconst estimate = (s: string) => Math.ceil(s.length / 4);\n\nconst text = \"Read the file src/math.ts and explain divide().\";\nconsole.log(text.length, estimate(text));",
          "output": "47 12",
          "explanation": "The text is 47 characters long. 47 divided by 4 is 11.75, and Math.ceil rounds up to the next whole number, 12. A real tokenizer might say 13 or 14, so treat this as a budget guess, not a measurement. Run it with: node tokens.ts"
        }
      ],
      "productionNote": "Budget the context window on purpose. A single large tool result can eat most of it. Pi limits tool output to 50KB or 2000 lines so one file read cannot flood the context, and your own tools should do the same. Prefer reading the needed part of a file over pasting the whole thing.",
      "commonMistakes": [
        "Pasting huge files into the conversation when only a few lines matter. It costs money and leaves less room for the answer.",
        "Assuming tokens equal words. Tokens are smaller pieces, so counts are higher than word counts.",
        "Treating the 4-characters rule as exact. It is an estimate for English; code and other languages differ."
      ],
      "sources": [
        { "title": "OpenAI: Key concepts", "url": "https://platform.openai.com/docs/concepts" },
        { "title": "Pi docs: output truncation", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#output-truncation" }
      ]
    },
    {
      "id": "next-token-prediction-temperature",
      "title": "Next-token prediction and temperature",
      "explanation": "An LLM writes one token at a time. For the text so far, it produces a score for every possible next token. These scores are called logits (raw numbers, higher means more likely, and they can be negative).\n\nA function called softmax turns the scores into probabilities: numbers between 0 and 1 that add up to 1. Then the program samples one token, meaning it picks one at random, weighted by those probabilities. That token is added to the text and the whole process repeats until the reply is finished.\n\nTemperature is a setting that divides every logit before softmax. A low temperature (below 1) makes the gaps between scores bigger, so the top token gets almost all the probability and the output is predictable. A high temperature (above 1) shrinks the gaps, so the probabilities flatten and the output is more varied. Because the pick is random, the same prompt can give different answers on different runs.\n\nThe script below uses `Math.exp(x)`, which computes e raised to the power x (e is about 2.718); softmax uses it to make every score positive. `reduce` adds all the numbers in an array together, and `toFixed(3)` rounds a number to 3 decimal places (it returns a string, so `Number(...)` turns it back into a number).\n\nPi lets you set thinking levels (topic 05), not temperature. Temperature is a parameter of the provider and model, so treat it here as a concept.",
      "analogy": "It is like the autocomplete on your phone, but asked thousands of times in a row, each time picking from the suggested words. Temperature is how adventurous the typist is: a cautious typist always takes the top suggestion, an adventurous one often picks the second or third.",
      "code": [
        {
          "language": "typescript",
          "filename": "softmax.ts",
          "source": "function softmax(logits: number[], t: number): number[] {\n  const e = logits.map((x) => Math.exp(x / t));\n  const s = e.reduce((a, b) => a + b, 0);\n  return e.map((x) => Number((x / s).toFixed(3)));\n}\n\nconsole.log(softmax([2, 1, 0], 1));\nconsole.log(softmax([2, 1, 0], 0.5));",
          "output": "[ 0.665, 0.245, 0.09 ]\n[ 0.867, 0.117, 0.016 ]",
          "explanation": "Three candidate tokens have scores 2, 1 and 0. At temperature 1 the top token gets 66.5 percent. At temperature 0.5 the scores are divided by 0.5 first, which widens the gaps, so the top token jumps to 86.7 percent and the others shrink. 0.090 prints as 0.09 because it is a number again after Number(). Run it with: node softmax.ts"
        }
      ],
      "productionNote": "Because output is sampled, one successful run proves little. This is why evaluations (topic 18) run each task several times and report a pass rate rather than a single pass or fail.",
      "commonMistakes": [
        "Expecting identical output on every run. Sampling makes answers vary unless the provider offers a deterministic setting (one that gives the same output for the same input), and even then it is not guaranteed.",
        "Thinking temperature 0 guarantees a correct answer. It only makes the model pick its top choice, which can still be wrong."
      ],
      "sources": [
        { "title": "MDN: Math.exp()", "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/exp" },
        { "title": "OpenAI: Text generation guide", "url": "https://platform.openai.com/docs/guides/text" }
      ]
    },
    {
      "id": "models-providers-cost",
      "title": "Models, providers and cost per token",
      "explanation": "A model is the trained network itself, for example Claude Sonnet or GLM. A provider is the service that hosts a model and lets you call it over an API (a way for programs to talk to a service over the internet). OpenCode Zen, which you set up in topic 01, is a provider that offers many models behind one account.\n\nProviders quote prices per 1 million tokens, with two separate rates: input tokens (everything you send, including history and files) and output tokens (what the model writes). Output is usually more expensive. Prices change, so check the pricing page before you rely on a number. Examples read from the Zen models page on 2026-11-21 (dollars per 1M tokens, input / output): GLM 5.3 costs 1.40 / 4.40, Kimi K3 costs 3 / 15, and MiniMax M3 costs 0.30 / 1.20.\n\nCost of a request = (input tokens x input price + output tokens x output price) divided by 1,000,000. Pi shows the running cost in its footer and in `/session`.\n\nOne trap: an agent sends the whole conversation again on every turn (one model reply plus the tool calls it asks for; topic 06), so input tokens grow with each step. A long session costs far more than the length of the final answer suggests.",
      "analogy": "A taxi meter with two rates: one rate for the distance you ride in (input) and a higher rate for the luggage the driver carries out (output). Different taxi companies (providers) and different cars (models) charge different rates, and the meter keeps running as the trip gets longer.",
      "code": [
        {
          "language": "typescript",
          "filename": "price.ts",
          "source": "// Prices are dollars per 1 million tokens.\nconst cost = (inTok: number, outTok: number, inP: number, outP: number) =>\n  (inTok * inP + outTok * outP) / 1_000_000;\n\nconsole.log(cost(20_000, 2_000, 1.4, 4.4).toFixed(4));\nconsole.log(cost(20_000, 2_000, 3, 15).toFixed(4));\nconsole.log(cost(20_000, 2_000, 0.3, 1.2).toFixed(4));",
          "output": "0.0368\n0.0900\n0.0084",
          "explanation": "The same request, 20,000 tokens in and 2,000 out, is priced on three models: GLM 5.3, Kimi K3 and MiniMax M3. For the first, 20,000 x 1.4 = 28,000 and 2,000 x 4.4 = 8,800; their sum 36,800 divided by 1,000,000 is 0.0368 dollars. The underscores in 20_000 are only for readability. toFixed(4) keeps 4 decimals. The strongest model costs over ten times the cheapest here. Run it with: node price.ts"
        }
      ],
      "productionNote": "Cost per task is a standard metric. You will record it in your evaluations (topic 18), reduce it with model routing (topic 20) and report it in your portfolio README (topic 23). Always compute from per-million prices, and watch that input tokens grow each turn.",
      "commonMistakes": [
        "Ignoring that the full history is sent again every turn, so input tokens (and cost) grow as a session gets longer.",
        "Comparing a per-1,000-token price with a per-1,000,000-token price. Check the unit before comparing.",
        "Treating example prices as permanent. Providers change them, so read the pricing page."
      ],
      "sources": [
        { "title": "OpenCode Zen: models and pricing", "url": "https://opencode.ai/docs/console/models" },
        { "title": "Pi docs: sessions", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sessions.md#continue-or-switch-sessions" }
      ]
    },
    {
      "id": "hallucination-limits",
      "title": "Hallucination and limits",
      "explanation": "A hallucination is output that sounds fluent and confident but is false: an invented function, a file that does not exist, a citation to a paper nobody wrote. It happens because the model predicts likely-sounding text; it does not look facts up and has no built-in sense of 'I am not sure'.\n\nThere are three common causes. First, prediction, not lookup: a plausible answer is produced even when no true one exists. Second, the training cutoff: the date after which the model saw no new data, so it knows nothing about newer libraries or events. Third, missing context: if your code is not in the conversation, the model can only guess about it.\n\nYou reduce hallucination mainly by giving real context and by checking. Let the agent use tools such as read and grep to see the actual files; supplying real source text this way is called grounding, and topics 11 to 13 build it in full. Also tell the model it is allowed to say 'I do not know', ask it to cite where each claim comes from, and verify results with tests.\n\nTry it in Pi. Open your terminal, `cd ~/pi-lab`, start `pi`, and ask about a function that does not exist. The exact answers below are samples; yours will differ.",
      "analogy": "A confident tourist guide who never says 'I do not know'. Asked for a street that is not on the map, they invent a name rather than admit it. Handing the guide a real map (context) and permission to say 'I am not sure' is what fixes it.",
      "code": [
        {
          "language": "text",
          "filename": "pi-session-hallucination.txt",
          "source": "# 1. Ask with no instruction to check:\nWhat does the function parseInvoice in this repo do?\n\n# 2. Then ask again, allowing a negative answer:\nUse read/bash to check first, and say if it does not exist.",
          "output": "(sample, varies)\n1. The model may describe parseInvoice in detail even though it does not exist.\n2. The model runs grep or ls, finds nothing, and reports that parseInvoice does not exist in this repo.",
          "explanation": "The first prompt gives the model no way to verify, so it may invent an answer. The second prompt lets it use tools to look at the real files and gives it permission to report that nothing was found. Same model, different outcome, because the context and the rules changed."
        }
      ],
      "productionNote": "Make every answer path in an agent checkable: citations that point to a real file or document, and tests or commands that confirm a result. An answer that cannot be checked cannot be trusted.",
      "commonMistakes": [
        "Trusting citations or links without opening them. Models can invent both.",
        "Blaming the model when the real problem is missing context. If the code was never shown, a guess is the expected result.",
        "Believing a confident tone means a correct answer. Fluency and truth are unrelated."
      ],
      "sources": [
        { "title": "Anthropic docs: Reduce hallucinations", "url": "https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations" }
      ]
    },
    {
      "id": "choosing-a-model",
      "title": "Choosing a model across vendors (OpenCode Zen)",
      "explanation": "Models differ on five things: quality (how well they solve hard tasks), speed, price, context size, and how reliably they call tools. The OpenCode Zen catalogue includes Claude (Opus, Sonnet, Haiku), GPT, Gemini and open models such as GLM, Kimi, Qwen, DeepSeek and MiniMax. Open models are ones whose weights (the learned numbers) are published.\n\nA good rule of thumb: use a cheap model to explore and a strong model to finish. Topic 20 turns this into automatic routing.\n\nIn Pi, list the models Zen offers with `pi --list-models opencode`, switch inside a session with `/model`, or start with a chosen one using `pi --model <pattern>`, where the pattern is part of the model name.\n\nZen does not state which models call tools well, so never assume it. Test any model you adopt on your own tasks; topic 18 shows how to build those tests.\n\nTry it: start `pi` in `~/pi-lab`, run `/model`, pick a cheap open model and ask `List the files here`. Then run `/model` again, pick a strong model, ask the same thing, and compare the cost shown by `/session`. Numbers are samples and will vary.",
      "analogy": "Choosing a vehicle. A scooter (cheap, quick, small loads) is perfect for errands, while a truck (expensive, strong) is right for the big move. Using the truck for every errand wastes money, and using the scooter for the big move fails.",
      "code": [
        {
          "language": "bash",
          "filename": "list-models.sh",
          "source": "pi --list-models opencode",
          "output": "(a table of model ids available through the opencode provider; contents change over time)",
          "explanation": "Prints the models Pi knows for the opencode provider (Zen). Copy part of an id into /model or into pi --model to select it. The list changes as Zen adds and removes models."
        },
        {
          "language": "text",
          "filename": "pi-session-compare.txt",
          "source": "/model            (pick a cheap open model)\nList the files here\n/session\n\n/model            (pick a strong model)\nList the files here\n/session",
          "output": "(sample, varies)\nCheap model: correct list, cost about $0.001\nStrong model: correct list, cost about $0.01",
          "explanation": "For an easy task both models succeed, so the cheaper one is the better choice. On harder tasks the strong model may be the only one that succeeds. The point is to compare quality and cost side by side instead of guessing."
        }
      ],
      "productionNote": "Production agents route per task: cheap models for searching and simple steps, strong models for hard reasoning. Re-test whenever you change the model, because behaviour, especially tool calling, can change.",
      "commonMistakes": [
        "Always using the most expensive model, even for trivial tasks.",
        "Never re-testing after switching models. A new model may format answers or call tools differently.",
        "Assuming every model calls tools reliably. Zen does not state this, so test it."
      ],
      "sources": [
        { "title": "OpenCode Zen: models and pricing", "url": "https://opencode.ai/docs/console/models" },
        { "title": "Pi docs: CLI models", "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md#models" }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Using the rule of about 4 characters per token, roughly how many tokens is a 400-character English text?",
      "options": ["40", "100", "400", "1,600"],
      "answerIndex": 1,
      "explanation": "400 divided by 4 is about 100 tokens. It is only an estimate because real tokenizers differ, but 400 would assume one token per character and 40 or 1,600 are off by a factor of 4 or more."
    },
    {
      "question": "What happens to the probabilities of the next token when the temperature is lowered (for example from 1 to 0.5)?",
      "options": [
        "They flatten so every token becomes equally likely",
        "They all become zero",
        "They become sharper, so the top token gets even more probability",
        "They no longer add up to 1"
      ],
      "answerIndex": 2,
      "explanation": "Lower temperature divides the logits by a smaller number, widening the gaps, so softmax gives the top token more probability. Flattening is what a higher temperature does, and softmax output always sums to 1."
    },
    {
      "question": "A request uses 10,000 input tokens and 1,000 output tokens on a model priced at $3 per 1M input and $15 per 1M output. What does it cost?",
      "options": ["$0.045", "$0.45", "$4.50", "$0.0045"],
      "answerIndex": 0,
      "explanation": "(10,000 x 3 + 1,000 x 15) / 1,000,000 = (30,000 + 15,000) / 1,000,000 = 0.045 dollars."
    },
    {
      "question": "Which pair are two good ways to reduce hallucination?",
      "options": [
        "Raise the temperature and ask shorter questions",
        "Use a model with a longer name and avoid tools",
        "Hide the files from the model and ask it to be confident",
        "Give real context through tools such as read and grep (grep searches inside files; topic 06), and allow the model to say it does not know"
      ],
      "answerIndex": 3,
      "explanation": "Real context (grounding) removes the need to guess, and permission to say 'I do not know' removes the pressure to invent. Verifying with tests also helps. The other options either increase randomness or take away information."
    },
    {
      "question": "Why is it a good habit to explore a task with a cheap model first and use a strong model to finish?",
      "options": [
        "Cheap models never make mistakes on easy steps, so strong models are unnecessary",
        "Most of the steps are simple and cost little on a cheap model, so you only pay strong-model prices where needed",
        "Strong models cannot read files, so a cheap model must do that part",
        "Cheap models have unlimited context windows"
      ],
      "answerIndex": 1,
      "explanation": "Exploring involves many simple steps, so doing them cheaply saves money; the strong model is used only for the hard final work. Cheap models can still make mistakes, strong models can use tools, and every model has a finite context window."
    }
  ]
});
