window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "11-embeddings",
  "order": 11,
  "title": "Embeddings & Similarity",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "An embedding turns a piece of text into a list of numbers so that texts with similar meaning end up with similar numbers. In this topic you call the Voyage AI embeddings API from TypeScript, tag texts as query or document, compare vectors with cosine similarity (a score for how closely two lists of numbers point the same way) written in plain TypeScript, and learn how dimensions and request limits affect size and cost. This is the foundation for the retrieval-augmented generation (RAG) topics that follow.",
  "prerequisites": ["10-commands-events-templates"],
  "subtopics": [
    {
      "id": "what-an-embedding-is",
      "title": "What an embedding is",
      "explanation": "An embedding is a list of numbers that represents the meaning of a piece of text. A list of numbers is called a vector (in TypeScript, simply an array of numbers). The length of that list is called its dimension. A 2-dimensional vector has two numbers, like a point on a flat map. The vectors that real embedding models produce are much longer: the Voyage model used in this course, voyage-4, returns 1024 numbers by default.\n\nThe key property is this: texts with similar meaning get vectors that point in similar directions, and unrelated texts get vectors that point in different directions. That lets a program search by meaning instead of by exact words. This is called semantic search (semantic means \"relating to meaning\"). A search for \"how do I reset my password\" can find a page titled \"Recovering account access\" even though they share no words.\n\nSemantic search is the \"R\" in RAG, short for retrieval-augmented generation. The idea: before the model answers, your program retrieves (fetches) the most relevant pieces of your own text and puts them into the prompt, so the model answers from your documents instead of from memory. Topics 12 and 13 build this; this topic builds the two pieces it needs, getting vectors and comparing them.\n\nAn embedding does not store the text. It is a one-way summary of meaning. You cannot rebuild the original sentence from the numbers, so a search index always keeps the original text next to its vector.\n\nThe example below uses tiny made-up 2-dimensional vectors so you can see the idea. Real ones have 1024 numbers, and you never choose them by hand; the model computes them.",
      "analogy": "Think of map coordinates for ideas. \"cat\" and \"kitten\" are neighbours in the same town, so their coordinates are close. \"invoice\" lives in a different city, so its coordinates are far away. Searching by meaning means asking \"which places are closest to this point?\". The coordinates are not the town itself, just a way to say where it is, which is why the vector does not contain the original text.",
      "code": [
        {
          "language": "typescript",
          "filename": "toy-vectors.ts",
          "source": "// Made-up 2-dimensional vectors. Real voyage-4 vectors have 1024 numbers.\nconst v = {\n  cat: [0.9, 0.1],\n  kitten: [0.85, 0.2],\n  invoice: [0.1, 0.95],\n};\n\nconsole.log(v.cat, v.invoice);\nconsole.log(v.cat.length);",
          "output": "[ 0.9, 0.1 ] [ 0.1, 0.95 ]\n2",
          "explanation": "Setup: in a terminal run `cd ~/pi-lab`, then `mkdir rag` and `cd rag` (the folder name is rag, short for retrieval-augmented generation). Create toy-vectors.ts there in your editor and run it with `node toy-vectors.ts`. Each object field holds a vector, which is an array of numbers. `cat` and `kitten` have similar numbers (high first value), while `invoice` has a high second value instead. `.length` is the number of items in the array, which is the vector's dimension: 2 here."
        }
      ],
      "productionNote": "Embeddings power document search, duplicate detection (two texts with nearly identical vectors are probably the same thing), and agent memory recall (topic 14). In every case you store the original text alongside its vector, because the vector alone cannot be turned back into text.",
      "commonMistakes": [
        "Thinking an embedding stores the text. It is only a numeric summary of meaning; keep the original text separately.",
        "Comparing vectors from different model families. Each model has its own coordinate system, so numbers from model A mean nothing next to numbers from model B.",
        "Expecting words to need to match. Embeddings match meaning, so \"car\" and \"automobile\" are close even though the spelling is different."
      ],
      "sources": [
        { "title": "Voyage AI: Text embeddings", "url": "https://docs.voyageai.com/docs/embeddings" },
        { "title": "Google Machine Learning Crash Course: Embeddings", "url": "https://developers.google.com/machine-learning/crash-course/embeddings" }
      ]
    },
    {
      "id": "calling-the-voyage-api",
      "title": "Calling the Voyage AI API",
      "explanation": "Pi's model provider (OpenCode Zen, from topic 1) has no embeddings API, so the course uses a separate service, Voyage AI. You need a Voyage API key, which is separate from your Zen key. To get one, sign in to the Voyage AI website and find its API keys page. Then put it in a file named .env inside ~/pi-lab/rag as a single line: VOYAGE_API_KEY=your-key-here. Never type the key into your code and never commit .env to git.\n\nIf ~/pi-lab/rag has no package.json yet, run `npm init -y` there and add \"type\": \"module\" to it, exactly as in topic 3, so Node treats your files as ES modules.\n\nThe API is one HTTP request (topic 3). You send a POST to https://api.voyageai.com/v1/embeddings with two headers: `Authorization: Bearer <your key>` (Bearer is the label that tells the server the key follows) and `Content-Type: application/json`. The JSON body has `input` (a string, or an array of strings so you can embed many texts in one request), `model` (\"voyage-4\"), and optionally `input_type` (explained in the \"Query vs document input_type\" section below).\n\nThe response is JSON shaped like `{ \"data\": [{ \"object\": \"embedding\", \"embedding\": [numbers], \"index\": 0 }], \"model\": \"voyage-4\", \"usage\": { \"total_tokens\": 3 } }`. Each item in `data` has the vector in `embedding` and its position in your input array in `index`. `usage.total_tokens` is how many tokens (topic 4) you were billed for.\n\nTwo habits keep this code safe. First, check `res.ok` (true for HTTP status 200-299) and throw an error that includes the status and body, so a wrong key or a rate limit is visible instead of crashing later. Second, sort `data` by `index` before using it, so vector number 0 always belongs to text number 0, even if the server returned them in another order.\n\nThe helper below is a library file: other files import it. It contains a few TypeScript pieces you have not seen. `as { ... }` is a type assertion: you tell TypeScript the shape of the parsed JSON (it is erased when Node runs the file, so it checks nothing at runtime). `.sort((a, b) => a.index - b.index)` sorts an array in place, using a function that returns a negative number when `a` should come first. `Promise<number[][]>` means the async function eventually returns an array of vectors.",
      "analogy": "Sending sentences to a translation office that replies with coordinates instead of words. You hand over a batch of sentences with a cover note (your key). The office returns one set of coordinates per sentence, labelled with each sentence's position in your batch. If the office is closed or rejects your note, you want a clear error slip, not a silent blank, which is why you check the status.",
      "code": [
        {
          "language": "typescript",
          "filename": "embed.ts",
          "source": "export async function embed(\n  texts: string[],\n  inputType: \"query\" | \"document\",\n): Promise<number[][]> {\n  const key = process.env.VOYAGE_API_KEY;\n  if (!key) throw new Error(\"Missing VOYAGE_API_KEY\");\n\n  const res = await fetch(\"https://api.voyageai.com/v1/embeddings\", {\n    method: \"POST\",\n    headers: {\n      Authorization: `Bearer ${key}`,\n      \"Content-Type\": \"application/json\",\n    },\n    body: JSON.stringify({ input: texts, model: \"voyage-4\", input_type: inputType }),\n  });\n  if (!res.ok) throw new Error(`Voyage HTTP ${res.status}: ${await res.text()}`);\n\n  const json = (await res.json()) as {\n    data: { embedding: number[]; index: number }[];\n    usage: { total_tokens: number };\n  };\n  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);\n}",
          "output": "",
          "explanation": "Save this as embed.ts in ~/pi-lab/rag. It prints nothing because it only defines and exports a function. It reads the key from `process.env` (topic 3), refuses to run without it, sends the POST request, throws on a non-OK status, then returns just the vectors in input order."
        },
        {
          "language": "typescript",
          "filename": "embed-demo.ts",
          "source": "import { embed } from \"./embed.ts\";\n\nconst [v] = await embed([\"hello\"], \"document\");\nconsole.log(v.length);",
          "output": "1024",
          "explanation": "Run it from ~/pi-lab/rag with `node --env-file=.env embed-demo.ts` (the --env-file flag loads your key from .env, topic 3). `const [v] = ...` is array destructuring: it takes the first item of the returned array, here the vector for \"hello\". voyage-4 returns 1024 numbers by default, so the length is 1024. This makes a real network call and needs a valid key."
        }
      ],
      "productionNote": "Wrap the API call in one helper like this and reuse it everywhere: the index builder (topic 12) and the search tool (topic 13) both import it. One place then handles the key, the error check and the ordering.",
      "commonMistakes": [
        "Putting the API key directly in the code. It ends up in git history. Read it from the environment.",
        "Ignoring HTTP errors. Without the res.ok check, a bad key returns an error object with no `data`, and the failure shows up later as a confusing crash.",
        "Not sorting by `index`. If you assume the order, one reordered response silently attaches vectors to the wrong texts."
      ],
      "sources": [
        { "title": "Voyage AI: Embeddings API reference", "url": "https://docs.voyageai.com/reference/embeddings-api" },
        { "title": "Voyage AI: Text embeddings", "url": "https://docs.voyageai.com/docs/embeddings" }
      ]
    },
    {
      "id": "cosine-similarity",
      "title": "Cosine similarity in TypeScript",
      "explanation": "Once you have vectors, you need a number that says how similar two of them are. The standard measure is cosine similarity. It looks at the angle between two vectors and ignores how long they are.\n\nThe formula is cosine(a, b) = dot(a, b) / (|a| x |b|). The dot product of two vectors is what you get by multiplying them item by item and adding up the results: for [1, 2] and [3, 4] it is 1x3 + 2x4 = 11. The norm |a| of a vector is its length: square every item, add them up, and take the square root (`Math.sqrt` in JavaScript).\n\nThe result is between -1 and 1. A score of 1 means the vectors point the same way (very similar meaning), 0 means they are unrelated (at a right angle), and negative means they point in opposite directions. In practice, text embeddings from the same model usually give scores between 0 and 1.\n\nTo find the best matches for a query, compute the score against every stored vector, sort from highest to lowest, and keep the first k. This is called top-k (the k best). The code below does this with `.map` (from topic 2), `.sort` (sorts an array using a comparison function, here highest score first) and `.slice(0, k)` (returns the first k items).\n\nThe function uses a `for` loop: `for (let i = 0; i < a.length; i++)` runs the body once for each index i from 0 up to the last position. `+=` adds to a variable, so `dot += x` means `dot = dot + x`.\n\nTwo guards matter. Vectors of different lengths cannot be compared, so the function throws an error. A vector of all zeros has norm 0, which would divide by zero, so the function returns 0 instead.",
      "analogy": "Comparing two arrows by the angle between them, ignoring length. Two people pointing in the same direction agree completely, even if one has a longer arm. Two people pointing at right angles share nothing. Top-k is then like asking everyone in a room to point, and picking the k people whose arrows line up best with yours.",
      "code": [
        {
          "language": "typescript",
          "filename": "cosine.ts",
          "source": "export function cosine(a: number[], b: number[]): number {\n  if (a.length !== b.length) throw new Error(\"Vectors must have the same length\");\n  let dot = 0;\n  let na = 0;\n  let nb = 0;\n  for (let i = 0; i < a.length; i++) {\n    dot += a[i] * b[i];\n    na += a[i] * a[i];\n    nb += b[i] * b[i];\n  }\n  if (na === 0 || nb === 0) return 0;\n  return dot / (Math.sqrt(na) * Math.sqrt(nb));\n}\n\nexport function topK(\n  query: number[],\n  items: { text: string; vector: number[] }[],\n  k: number,\n): { text: string; score: number }[] {\n  return items\n    .map((it) => ({ text: it.text, score: cosine(query, it.vector) }))\n    .sort((x, y) => y.score - x.score)\n    .slice(0, k);\n}",
          "output": "",
          "explanation": "Save as cosine.ts in ~/pi-lab/rag. `na` and `nb` accumulate the squared lengths; the final line is dot divided by the two norms. `topK` scores every item, sorts so the highest score comes first (`y.score - x.score`), and returns the first k."
        },
        {
          "language": "typescript",
          "filename": "cosine-demo.ts",
          "source": "import { cosine, topK } from \"./cosine.ts\";\n\nconsole.log(\n  cosine([1, 2, 3], [2, 4, 6]).toFixed(4),\n  cosine([1, 2, 3], [3, 0, -1]).toFixed(4),\n  cosine([1, 0], [1, 1]).toFixed(4),\n);\n\nconst items = [\n  { text: \"cat\", vector: [0.9, 0.1] },\n  { text: \"kitten\", vector: [0.85, 0.2] },\n  { text: \"invoice\", vector: [0.1, 0.95] },\n];\nconst best = topK([1, 0], items, 2);\nconsole.log(best.map((r) => `${r.text} ${r.score.toFixed(4)}`));",
          "output": "1.0000 0.0000 0.7071\n[ 'cat 0.9939', 'kitten 0.9734' ]",
          "explanation": "Run with `node cosine-demo.ts`. `.toFixed(4)` rounds a number to 4 decimal places and returns text. [2, 4, 6] points exactly the same way as [1, 2, 3] (just longer), so the score is 1. [1, 2, 3] and [3, 0, -1] have dot product 3 + 0 - 3 = 0, so they are unrelated. [1, 0] and [1, 1] are 45 degrees apart, and cosine of 45 degrees is about 0.7071. In the second part, the query [1, 0] points toward the \"cat\" side of the map, so cat and kitten rank above invoice and only the top 2 are kept."
        }
      ],
      "productionNote": "For a few thousand chunks you do not need a vector database. Loading all vectors from a JSON file and running this loop over them takes milliseconds, and it is easy to understand and debug. The course uses exactly that (JSON file plus cosine). A vector database becomes worth considering when you have far more data than fits comfortably in memory.",
      "commonMistakes": [
        "Comparing vectors of different lengths, for example one made with 512 dimensions and one with 1024. The function should throw instead of silently using part of the vector.",
        "Dividing by zero for an all-zero vector, which produces NaN (JavaScript's \"not a number\" value). Guard against it as the code above does.",
        "Forgetting that sort needs a comparison function. Without one, JavaScript sorts numbers as text, which gives a wrong order."
      ],
      "sources": [
        { "title": "MDN: Math.sqrt()", "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sqrt" },
        { "title": "MDN: Array.prototype.sort()", "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort" }
      ]
    },
    {
      "id": "query-vs-document-input-type",
      "title": "Query vs document input_type",
      "explanation": "In a search system there are two kinds of text. Documents are the pieces of your content that you store and embed once. Queries are the short questions a user types later. They look different: a document says \"Set OPENCODE_API_KEY in your shell.\", a query asks \"How do I set my API key?\".\n\nVoyage lets you say which kind you are embedding with the `input_type` field. Use \"document\" for stored chunks and \"query\" for the user's question. Behind the scenes Voyage puts a short instruction in front of your text before embedding it: \"Represent the query for retrieving supporting documents: \" for queries and \"Represent the document for retrieval: \" for documents. This nudges the model so that a question lands close to the passages that answer it, which improves retrieval.\n\nThe resulting vectors live in the same space, so you compare them with the same cosine function as before. Voyage also states that vectors made with and without input_type are compatible, but the course always tags them: the `embed` helper from earlier requires you to pass \"query\" or \"document\".\n\nThe demo below embeds one question as a query and two sentences as documents, then checks that the sentence about the key scores higher than the sentence about invoices. Exact scores differ from run to run of the service and between model versions, so the program prints only the comparison result. It imports embed.ts and cosine.ts from the earlier sections, so keep all three files in ~/pi-lab/rag.",
      "analogy": "A library. Books are catalogued by the librarian's rules (documents, embedded once and stored). Visitors ask questions at the desk phrased as \"I'm looking for...\" (queries). Both the catalogue and the questions use the same shelf map, but each is written in the style that makes matching work best.",
      "code": [
        {
          "language": "typescript",
          "filename": "search-demo.ts",
          "source": "import { embed } from \"./embed.ts\";\nimport { cosine } from \"./cosine.ts\";\n\nconst [q] = await embed([\"How do I set my API key?\"], \"query\");\nconst docs = await embed(\n  [\"Set OPENCODE_API_KEY in your shell.\", \"Invoices are sent monthly.\"],\n  \"document\",\n);\n\nconst scores = docs.map((d) => cosine(q, d));\nconsole.log(\"key doc closer than invoice doc:\", scores[0] > scores[1]);",
          "output": "key doc closer than invoice doc: true",
          "explanation": "Run with `node --env-file=.env search-demo.ts`. The question is embedded with \"query\", the two stored sentences with \"document\". `docs.map(...)` gives one cosine score per document. The first document answers the question, so it scores higher and the comparison prints true. This makes real network calls and needs your Voyage key."
        }
      ],
      "productionNote": "In a RAG system, tag everything correctly every time: \"document\" when the index is built (topic 12) and \"query\" when a user searches (topic 13). Make the tag a required parameter, as in the embed helper, so nobody can forget it.",
      "commonMistakes": [
        "Embedding the user's question as a \"document\". It still works, but retrieval quality is lower than it needs to be.",
        "Mixing models: building the index with voyage-4 and embedding queries with a different model family. The vector spaces do not match, so scores are meaningless."
      ],
      "sources": [
        { "title": "Voyage AI: Text embeddings", "url": "https://docs.voyageai.com/docs/embeddings" }
      ]
    },
    {
      "id": "dimensions-cost-limits",
      "title": "Dimensions, cost & limits",
      "explanation": "voyage-4 returns 1024 numbers per text by default. You can ask for a different size with the `output_dimension` field in the request body: 256, 512, 1024 (default) or 2048. Smaller vectors take less storage and compare faster but may lose some search quality; larger ones are the reverse. Whatever you choose, use the same dimension for every vector in one index, because vectors of different lengths cannot be compared (the cosine function would throw).\n\nThe other output setting is `output_dtype`, the number type of each item. The default is \"float\" (ordinary decimal numbers), which is what this course uses.\n\nThere are limits on each request. You can send at most 1000 texts in the `input` array. Each text can be up to 32,000 tokens long for voyage-4. The whole request is also capped at 320,000 tokens across all texts, so a batch of many long texts can be rejected even when it has fewer than 1000 items. If a text is longer, the `truncation` field decides what happens: it defaults to true, which silently cuts the text to fit. Silent cutting means the end of a long text is not represented in its vector, so split long documents into smaller pieces (topic 12).\n\nCost is per token. The response's `usage.total_tokens` tells you how many tokens a request used. Prices change, so check Voyage's pricing page instead of memorising numbers.\n\nStorage also grows with your index. Each chunk needs one vector of `dimension` numbers. When the vectors are saved in a JSON file, each number takes roughly 10 characters (digits, decimal point, minus sign, comma), which is only an estimate. The first example estimates the file size. The second shows a batching helper: it splits any number of texts into groups so each request stays under the 1000-text limit. It uses `let` for a variable that changes and `.concat` to join two arrays into a new one.",
      "analogy": "Photo resolution. Higher resolution (more dimensions) gives a sharper picture but a bigger file; lower resolution is smaller and faster but loses fine detail. Sending texts in batches is like posting photos in several envelopes because the post office only accepts so many per envelope.",
      "code": [
        {
          "language": "typescript",
          "filename": "size.ts",
          "source": "// Rough estimate: about 10 characters per number once saved as JSON text.\nfunction approxMB(chunks: number, dims: number): string {\n  const bytes = chunks * dims * 10;\n  return (bytes / 1_000_000).toFixed(1) + \" MB\";\n}\n\nconsole.log(approxMB(500, 1024), approxMB(500, 512));",
          "output": "5.1 MB 2.6 MB",
          "explanation": "Run with `node size.ts`. 500 chunks x 1024 numbers x 10 characters is 5,120,000 characters, about 5.1 MB. At 512 dimensions it is half of that, about 2.6 MB. `1_000_000` is a number written with underscores for readability; the underscores are ignored."
        },
        {
          "language": "typescript",
          "filename": "embed-all.ts",
          "source": "import { embed } from \"./embed.ts\";\n\nexport async function embedAll(\n  texts: string[],\n  inputType: \"query\" | \"document\",\n  batchSize = 128,\n): Promise<number[][]> {\n  let out: number[][] = [];\n  for (let i = 0; i < texts.length; i += batchSize) {\n    const part = await embed(texts.slice(i, i + batchSize), inputType);\n    out = out.concat(part);\n  }\n  return out;\n}",
          "output": "",
          "explanation": "Save as embed-all.ts next to embed.ts. It prints nothing; it is an optional helper; topic 12 uses its own batching loop with a batch size of 64. Each loop step takes the next `batchSize` texts (128 is well under the 1000-per-request limit), embeds them, and appends the vectors, so the result has one vector per text in the original order. `batchSize = 128` is a parameter with a default value."
        }
      ],
      "productionNote": "For a large corpus, choose a smaller dimension such as 512 to cut storage and comparison time, and test that search quality is still good enough on your own questions. Always batch requests to stay under 1000 inputs. Remember that every vector in an index, and every query vector used against it, must have the same dimension.",
      "commonMistakes": [
        "Re-embedding every document on every run. This wastes tokens and money. Topic 12 shows how to embed only what changed.",
        "Comparing a 512-dimension vector with a 1024-dimension one. Choose one dimension per index.",
        "Sending a whole large document as one input and relying on truncation. The cut-off part is invisible to search; split into chunks instead."
      ],
      "sources": [
        { "title": "Voyage AI: Embeddings API reference", "url": "https://docs.voyageai.com/reference/embeddings-api" },
        { "title": "Voyage AI: Pricing", "url": "https://docs.voyageai.com/docs/pricing" }
      ]
    }
  ],
  "quiz": [
    {
      "question": "What does an embedding represent?",
      "options": [
        "A compressed copy of the text that can be decoded back into the original sentence",
        "A list of numbers capturing the meaning of the text, so similar meanings get similar vectors",
        "The number of tokens in the text",
        "A hash that changes completely if one letter of the text changes"
      ],
      "answerIndex": 1,
      "explanation": "An embedding is a vector (list of numbers) that represents meaning. It cannot be decoded back into the text, it is not a token count, and similar texts get similar (not wildly different) vectors."
    },
    {
      "question": "A user types a question into your search box. Which input_type do you pass when embedding it?",
      "options": [
        "\"document\"",
        "\"question\"",
        "\"query\"",
        "No input_type is allowed for questions"
      ],
      "answerIndex": 2,
      "explanation": "The user's question is a query, so use \"query\". Stored chunks use \"document\". \"question\" is not a valid value, and input_type is allowed for queries."
    },
    {
      "question": "What is the cosine similarity of [1, 0] and [0, 1]?",
      "options": [
        "0",
        "1",
        "-1",
        "2"
      ],
      "answerIndex": 0,
      "explanation": "The dot product is 1x0 + 0x1 = 0, so the score is 0 / (1 x 1) = 0. The vectors are at a right angle, meaning unrelated. Cosine can never be 2, since its range is -1 to 1."
    },
    {
      "question": "What is the maximum number of texts you can send in the input array of one Voyage embeddings request?",
      "options": [
        "10",
        "128",
        "32,000",
        "1000"
      ],
      "answerIndex": 3,
      "explanation": "The limit is 1000 inputs per request. 32,000 is the token limit for a single text with voyage-4, not the number of texts. Batch larger jobs."
    },
    {
      "question": "Why should you not compare a 512-dimension vector with a 1024-dimension vector?",
      "options": [
        "Cosine similarity needs the two vectors to have the same number of items, so the comparison is not defined",
        "Voyage rejects any request that contains two different sizes",
        "512-dimension vectors always score exactly 0",
        "Smaller vectors are encrypted"
      ],
      "answerIndex": 0,
      "explanation": "Cosine multiplies items pairwise, which requires equal lengths; and a different dimension setting also means a different coordinate layout. The other options are made-up behaviour."
    }
  ]
});
