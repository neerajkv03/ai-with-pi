window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "12-doc-index",
  "order": 12,
  "title": "Building a Doc Index",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "You turn a folder of markdown documents into a searchable index. You split each file into small chunks at its headings, attach metadata (the file name and heading) to each chunk, embed the chunks in batches with Voyage, and save everything as one JSON file. A content hash (a short fingerprint of the text) lets the build script re-embed only the chunks that changed.",
  "prerequisites": ["11-embeddings"],
  "subtopics": [
    {
      "id": "chunking-markdown-files",
      "title": "Chunking markdown files",
      "explanation": "In topic 11 you turned a piece of text into an embedding (a list of numbers that captures its meaning). To search real documents, you first decide which pieces of text to embed. A chunk is one small piece of a document that is embedded and searched on its own.\n\nChunk size matters. If you embed a whole file as one vector, the meaning of the file gets averaged out, so a question about one paragraph matches it poorly. If you embed single sentences, each piece loses the context that explains it. A good middle size for documentation is one section: a heading plus the text under it.\n\nMarkdown marks headings with lines that start with one or more `#` characters, for example `# Setup` or `## API keys`. Our strategy is simple: read the file line by line, start a new chunk whenever a line begins with `#`, remember that line as the chunk's heading, and collect the lines below it as the chunk's text. Chunks with no text are skipped. Text that appears before the first heading gets the heading `(intro)`.\n\nFirst create the small corpus (the set of documents you will search) that the rest of this topic uses. Open Git Bash (see topic 1), then run the commands below. Each `cat > file <<'EOF'` command writes the lines up to the closing `EOF` into that file.\n\nNow the chunker. Save it as `~/pi-lab/rag/chunk.ts`. It uses a few basic tools. `md.split(/\\r?\\n/)` cuts the text into an array of lines; the part between slashes is a regular expression (regex, a pattern for matching text) that matches a line break on both Windows (`\\r\\n`) and Linux or macOS (`\\n`).\n\n`line.match(...)` tests a line against a regex and returns the match, or `null` if it does not match. `buf.push(line)` adds an item to the end of an array, and `buf.join(\"\\n\")` glues an array of lines back into one string.\n\nThe heading regex `^#{1,6}\\s+(.*)$` reads as: start of line, one to six `#` characters, at least one whitespace character, then capture the rest of the line (the parentheses make `m[1]` hold the heading text). The `for (const line of ...)` loop (a for...of loop) runs its block once for each item in the array. `flush` is a small helper function that turns the collected lines into a chunk. It trims blank space from both ends with `.trim()`, and only saves the chunk if some text remains.\n\nThe lines under the `// demo` comment only exist so you can try the function. Run the file with `node rag/chunk.ts` from `~/pi-lab`. Afterwards delete the demo lines, because other scripts will import this file and you do not want the demo to print every time.\n\nFinally, a second script reads the real `docs/` folder. `readdir` (from `node:fs/promises`) lists the file names in a folder, and `readFile` reads one file's text. Both return a Promise, so you use `await`. The corpus has three files: `faq.md` begins with `# FAQ` directly followed by `## Is Pi a sandbox?`, so the empty `FAQ` section is skipped and that file produces only one chunk.",
      "analogy": "Think of cutting a cookbook into recipe cards. One card per recipe, each with its title at the top, so when you want pancakes you grab just the pancake card instead of carrying the whole book. A card for a whole chapter would be too vague, and a card with one line of a recipe would be useless on its own.",
      "code": [
        {
          "language": "bash",
          "filename": "create-docs.sh",
          "source": "mkdir -p ~/pi-lab/docs ~/pi-lab/rag\ncd ~/pi-lab\n\ncat > docs/setup.md <<'EOF'\n# Setup\nInstall Node 26 LTS.\n## API keys\nSet OPENCODE_API_KEY and VOYAGE_API_KEY.\nEOF\n\ncat > docs/billing.md <<'EOF'\n# Billing\nZen uses prepaid credits.\n## Refunds\nUnused credits are not refunded.\nEOF\n\ncat > docs/faq.md <<'EOF'\n# FAQ\n## Is Pi a sandbox?\nNo. Pi runs commands with your user's permissions.\nEOF\n\nls docs",
          "output": "billing.md\nfaq.md\nsetup.md",
          "explanation": "`mkdir -p` creates the folders (and does nothing if they exist). `cd ~/pi-lab` moves into your lab folder. Each `cat > ... <<'EOF'` block creates one markdown file with exactly the lines shown. `ls docs` lists the three files."
        },
        {
          "language": "typescript",
          "filename": "chunk.ts",
          "source": "export type Chunk = { id: string; file: string; heading: string; text: string };\n\nexport function chunkMarkdown(file: string, md: string): Chunk[] {\n  const out: Chunk[] = [];\n  let heading = \"(intro)\";\n  let buf: string[] = [];\n  const flush = () => {\n    const text = buf.join(\"\\n\").trim();\n    if (text) out.push({ id: `${file}#${out.length}`, file, heading, text });\n    buf = [];\n  };\n  for (const line of md.split(/\\r?\\n/)) {\n    const m = line.match(/^#{1,6}\\s+(.*)$/);\n    if (m) {\n      flush();\n      heading = m[1];\n    } else {\n      buf.push(line);\n    }\n  }\n  flush();\n  return out;\n}\n\n// demo: delete these lines before other files import this module\nconst chunks = chunkMarkdown(\"setup.md\", \"# Setup\\nInstall Node 26 LTS.\\n## API keys\\nSet OPENCODE_API_KEY and VOYAGE_API_KEY.\\n\");\nfor (const c of chunks) console.log(c.id, \"|\", c.heading, \"|\", c.text);",
          "output": "setup.md#0 | Setup | Install Node 26 LTS.\nsetup.md#1 | API keys | Set OPENCODE_API_KEY and VOYAGE_API_KEY.",
          "explanation": "The `Chunk` type is the shape of one chunk. The id is the file name plus a counter (`out.length` is how many chunks exist so far). When a heading line appears, `flush()` saves the chunk collected so far, then the new heading is remembered. A final `flush()` after the loop saves the last chunk, because no later heading triggers it. The trailing empty line in the demo text is trimmed away."
        },
        {
          "language": "typescript",
          "filename": "load-docs.ts",
          "source": "import { readdir, readFile } from \"node:fs/promises\";\nimport { chunkMarkdown } from \"./chunk.ts\";\n\nconst names = (await readdir(\"docs\")).filter((f) => f.endsWith(\".md\")).sort();\nlet total = 0;\nfor (const name of names) {\n  const md = await readFile(`docs/${name}`, \"utf8\");\n  const chunks = chunkMarkdown(name, md);\n  console.log(`${name}: ${chunks.length} chunk(s)`);\n  total += chunks.length;\n}\nconsole.log(`total: ${total}`);",
          "output": "billing.md: 2 chunk(s)\nfaq.md: 1 chunk(s)\nsetup.md: 2 chunk(s)\ntotal: 5",
          "explanation": "Save this as `~/pi-lab/rag/load-docs.ts` and run `node rag/load-docs.ts` from `~/pi-lab` (the path `\"docs\"` is relative to the folder you run the command from). `.filter(f => f.endsWith(\".md\"))` keeps only markdown files, and `.sort()` puts the names in a fixed order so results are the same on every machine. `\"utf8\"` makes `readFile` return text instead of raw bytes."
        }
      ],
      "productionNote": "Chunk quality decides answer quality more than the choice of model. Before tuning anything else, print your chunks and read them: each one should make sense on its own. Real documentation sometimes has very long sections, so production chunkers also cap the length (for example around 1500 characters) and split a long section at a paragraph or sentence boundary.",
      "commonMistakes": [
        "Splitting by a fixed number of characters. This cuts sentences in half and separates a heading from its text, so neither piece embeds well. Split at headings or paragraph boundaries instead.",
        "Splitting only on `\\n` and forgetting that files saved on Windows use `\\r\\n` line endings. The leftover `\\r` character stays at the end of each line and can break the heading match. The regex `/\\r?\\n/` handles both.",
        "Calling the demo lines part of the module. If `chunk.ts` still prints the demo, every script that imports it prints those lines too."
      ],
      "sources": [
        { "title": "Voyage AI: Text embeddings", "url": "https://docs.voyageai.com/docs/embeddings" },
        { "title": "Node.js fs.promises.readdir", "url": "https://nodejs.org/docs/latest-v26.x/api/fs.html#fspromisesreaddirpath-options" }
      ]
    },
    {
      "id": "chunk-metadata",
      "title": "Chunk metadata (file, heading)",
      "explanation": "Metadata is information about a chunk that you keep next to its text. Each chunk already carries four facts: `file` (which document it came from), `heading` (which section), `id` (a unique name such as `faq.md#0`), and later a `hash` (a fingerprint of its content, covered below). The text is what the model reads; the metadata is how you find your way back.\n\nMetadata makes citations possible. A citation is a pointer to the source of an answer, such as `docs/setup.md > API keys`. Without `file` and `heading` stored on the chunk, a search result is just an anonymous paragraph and nobody can check where it came from. Topic 13 builds on this to cite sources in answers.\n\nThere is one more decision: what text to send to the embedding model. A heading like `Is Pi a sandbox?` carries a lot of meaning that the answer text (`No. Pi runs commands...`) does not repeat. So embed the heading and the text joined together, but store them as separate fields so you can still show the heading alone in a citation.",
      "analogy": "A library card lists the book's title, its shelf and its page number. The quote you copied is only useful because the card lets someone walk back to the exact place it came from. Chunk metadata is that card, and the embedded text is the quote.",
      "code": [
        {
          "language": "typescript",
          "filename": "metadata.ts",
          "source": "type Chunk = { id: string; file: string; heading: string; text: string };\n\nconst toEmbed = (c: Chunk) => `${c.heading}\\n${c.text}`;\nconst cite = (c: Chunk) => `docs/${c.file} > ${c.heading}`;\n\nconst chunk: Chunk = {\n  id: \"faq.md#0\",\n  file: \"faq.md\",\n  heading: \"Is Pi a sandbox?\",\n  text: \"No. Pi runs commands with your user's permissions.\",\n};\n\nconsole.log(toEmbed(chunk));\nconsole.log(cite(chunk));",
          "output": "Is Pi a sandbox?\nNo. Pi runs commands with your user's permissions.\ndocs/faq.md > Is Pi a sandbox?",
          "explanation": "`toEmbed` builds the string that will be sent to the embedding API: the heading, a line break, then the text. `cite` builds a human-readable source label from the metadata. The chunk object itself still keeps heading and text apart."
        }
      ],
      "productionNote": "Store enough metadata to trace every search result back to its source, and decide the citation format early because later steps depend on it. With a real vector database (a database built to search embeddings, covered later in this topic), metadata also lets you filter results, for example only chunks from `billing.md`.",
      "commonMistakes": [
        "Building ids from a position number, like `faq.md#0`. If someone adds a section at the top of the file, every later id shifts. That is acceptable in this course because the content hash, introduced in the last sub-topic, is what decides whether a stored embedding can be reused.",
        "Embedding only the text and throwing the heading away. Short answers such as `No.` carry almost no meaning without the question-like heading above them.",
        "Overwriting the text field with heading plus text. Keep them as separate fields so citations can show the heading alone."
      ],
      "sources": [
        { "title": "Voyage AI: Text embeddings", "url": "https://docs.voyageai.com/docs/embeddings" }
      ]
    },
    {
      "id": "embedding-in-batches",
      "title": "Embedding in batches",
      "explanation": "A batch is a group of items handled together. The Voyage embeddings API accepts an array of inputs in one request, up to 1000 items (you saw this limit in topic 11). Sending many chunks per request means far fewer round trips (one request plus its response is one round trip), which is faster than one request per chunk.\n\nYou should not send everything at once either: a huge request can exceed the 1000-item limit or the token limit, and one failure then loses all the work. This course uses a batch size of 64. A rate limit is a cap on how many requests you may send in a given time, so we send batches one after another, not all at the same time, and log progress so you can see the script working.\n\nThe helper `batches` below cuts an array into smaller arrays. `<T>` after the function name is a generic: it means the function works for arrays of any item type, and `T` stands for that type. `items.slice(i, i + size)` copies the part of the array from position `i` up to (but not including) `i + size`. The classic `for (let i = 0; i < items.length; i += size)` loop starts at 0 and jumps forward by `size` each time.\n\nThe second example runs the same loop shape that the build script will use. It calls a stand-in function called `fakeEmbed`, so you can run it with no API key. In the final script you replace it with the `embed(texts, \"document\")` function from topic 11 (it takes an array of texts plus the input type, and returns one vector per text, in the same order).",
      "analogy": "Posting letters. One trip to the post box per letter wastes your day, and one enormous sack of 5000 letters is too heavy to lift and might be refused. Bundles of 64 letters are a sensible compromise: few trips, each one manageable.",
      "code": [
        {
          "language": "typescript",
          "filename": "batches.ts",
          "source": "export function batches<T>(items: T[], size: number): T[][] {\n  const out: T[][] = [];\n  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));\n  return out;\n}\n\nconsole.log(batches([1, 2, 3, 4, 5], 2));\nconst ids = Array.from({ length: 130 }, (_, i) => i);\nconsole.log(batches(ids, 64).map((b) => b.length));",
          "output": "[ [ 1, 2 ], [ 3, 4 ], [ 5 ] ]\n[ 64, 64, 2 ]",
          "explanation": "The first call splits five numbers into groups of two; the last group is smaller. `Array.from({ length: 130 }, (_, i) => i)` builds an array of 130 numbers (0 to 129) to stand in for 130 chunks, and `.map((b) => b.length)` shows the size of each batch. 130 chunks need 3 requests."
        },
        {
          "language": "typescript",
          "filename": "batch-loop.ts",
          "source": "function batches<T>(items: T[], size: number): T[][] {\n  const out: T[][] = [];\n  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));\n  return out;\n}\n\n// stand-in for embed(texts, \"document\"): one tiny vector per text\nconst fakeEmbed = async (texts: string[]) => texts.map((t) => [t.length]);\n\nconst texts = Array.from({ length: 130 }, (_, i) => `chunk ${i}`);\nconst groups = batches(texts, 64);\nconst vectors: number[][] = [];\nfor (let i = 0; i < groups.length; i++) {\n  const vecs = await fakeEmbed(groups[i]);\n  vectors.push(...vecs);\n  console.log(`batch ${i + 1}/${groups.length}: ${groups[i].length} texts`);\n}\nconsole.log(`vectors: ${vectors.length}`);",
          "output": "batch 1/3: 64 texts\nbatch 2/3: 64 texts\nbatch 3/3: 2 texts\nvectors: 130",
          "explanation": "Each loop turn awaits one batch before starting the next (sequential, so you never fire many requests at once). `vectors.push(...vecs)` appends every vector from the batch (the three dots spread an array into separate arguments). Because batches are processed in order and each response keeps the input order, vector number N still belongs to text number N at the end."
        }
      ],
      "productionNote": "Indexing a large repository or documentation site can mean tens of thousands of chunks. Batching is what keeps that affordable in time. Log progress per batch, and make sure a failure in batch 40 does not force you to redo batches 1 to 39. The incremental rebuild in the last sub-topic gives you exactly that, because finished work is saved by hash.",
      "commonMistakes": [
        "Sending one request per chunk. Each request has fixed overhead, so a corpus of 5000 chunks becomes 5000 slow round trips.",
        "Sending more than 1000 inputs in one request. The API rejects it, so always cut with a batch size below that limit.",
        "Mixing up the order of vectors and chunks. Always map vector `i` of a batch back to chunk `i` of the same batch."
      ],
      "sources": [
        { "title": "Voyage AI: Embeddings API reference", "url": "https://docs.voyageai.com/reference/embeddings-api" }
      ]
    },
    {
      "id": "storing-the-index-as-json",
      "title": "Storing the index as JSON",
      "explanation": "The index is the saved result of all your work: every chunk with its metadata and its embedding. Embedding costs time and money, so you save it to disk and load it when you search, instead of rebuilding on every question.\n\nA JSON file is plenty for this. JSON (introduced in topic 3) is a text format for objects and arrays, and `JSON.stringify` / `JSON.parse` convert to and from it. The file has this shape: `{ model, dims, builtAt, chunks: [...] }`. `model` is the embedding model name (`voyage-4`), `dims` is how many numbers each vector has (1024 by default), `builtAt` is a timestamp for when the build ran, and each item in `chunks` holds `id`, `file`, `heading`, `text`, `hash` and `embedding`.\n\nWrite it with `writeFile(path, text)` from `node:fs/promises`, and read it back with `readFile` and `JSON.parse`. Always check that the stored `model` is the one you plan to use for questions. Vectors from different models (or different dimensions) live in different number spaces, so comparing them gives meaningless scores.\n\nThe real file will be generated again by the build script, so it does not need to be committed to git. If `~/pi-lab` is a git repository (topic 1), add the line `rag/index.json` to its `.gitignore` file, which tells git to leave listed files out. The demo below uses two-number vectors and its own file name so it never touches your real index.",
      "analogy": "A card catalogue drawer saved to disk. Once the librarians have written a card for every book, you keep the drawer. Tomorrow you open it and search, instead of re-reading every book to rebuild the catalogue. The label on the drawer (the model name) tells you which cataloguing system the cards follow.",
      "code": [
        {
          "language": "typescript",
          "filename": "save.ts",
          "source": "import { readFile, writeFile } from \"node:fs/promises\";\n\ntype StoredChunk = {\n  id: string;\n  file: string;\n  heading: string;\n  text: string;\n  hash: string;\n  embedding: number[];\n};\ntype Index = { model: string; dims: number; builtAt: string; chunks: StoredChunk[] };\n\nconst index: Index = {\n  model: \"voyage-4\",\n  dims: 2,\n  builtAt: new Date().toISOString(),\n  chunks: [\n    {\n      id: \"faq.md#0\",\n      file: \"faq.md\",\n      heading: \"Is Pi a sandbox?\",\n      text: \"No. Pi runs commands with your user's permissions.\",\n      hash: \"abc123\",\n      embedding: [0.1, 0.2],\n    },\n  ],\n};\n\nawait writeFile(\"index-demo.json\", JSON.stringify(index));\n\nconst loaded: Index = JSON.parse(await readFile(\"index-demo.json\", \"utf8\"));\nif (loaded.model !== \"voyage-4\") throw new Error(`Index built with ${loaded.model}, rebuild it`);\nconsole.log(loaded.chunks.length, loaded.model);",
          "output": "1 voyage-4",
          "explanation": "Run it from `~/pi-lab` with `node rag/save.ts` (save the file in `rag/`). It writes `index-demo.json` in the folder you ran it from, then reads it back. `new Date().toISOString()` gives the current time as text such as `2026-11-21T10:00:00.000Z`; it is stored in the file but not printed, so the output stays the same on every run. The `model` check throws an Error if the file was built with a different model. You can delete `index-demo.json` afterwards."
        }
      ],
      "productionNote": "A single JSON file is simple and you can open it in an editor to inspect it. It loads fully into memory, which is fine for hundreds or a few thousand chunks. Only when the index gets large, or several programs need to query it at once, switch to a vector database such as Chroma or Qdrant (programs built to store and search embeddings).",
      "commonMistakes": [
        "Pretty-printing the file with `JSON.stringify(index, null, 2)`. Each vector has 1024 numbers, and indentation puts every number on its own line, which makes the file several times larger. Write it compact.",
        "Mixing embeddings from different models in one file. Store the model name and refuse to use an index that does not match.",
        "Committing a large generated file to git. It can be rebuilt from the docs, so list it in `.gitignore`."
      ],
      "sources": [
        { "title": "Node.js fs.promises.writeFile", "url": "https://nodejs.org/docs/latest-v26.x/api/fs.html#fspromiseswritefilefile-data-options" },
        { "title": "MDN: JSON.stringify()", "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify" }
      ]
    },
    {
      "id": "rebuilding-when-files-change",
      "title": "Rebuilding when files change",
      "explanation": "Docs change. If you re-embed every chunk after each edit, you pay for work you already did. A hash solves this. A hash is a short fingerprint computed from some content: the same text always gives the same hash, and any change to the text gives a different one. We use SHA-256 (a standard hashing algorithm) from the built-in `node:crypto` module: `createHash(\"sha256\").update(text).digest(\"hex\")` returns the fingerprint as a string of hexadecimal characters, and `.slice(0, 12)` keeps the first 12 to make it short.\n\nThe rebuild logic is short. Load the old index if one exists. For each current chunk, compute its hash. If an old chunk had the same hash, reuse its stored embedding. Otherwise the chunk is new or changed, so embed it. Chunks that no longer exist are simply not copied into the new index, which deletes them.\n\nHash exactly the text you embed (heading plus text). Then editing a heading also triggers a re-embed.\n\nThe full script follows the example of the hash function. Save it as `~/pi-lab/rag/build-index.ts`; it reuses `chunk.ts` and `embed.ts` from this topic and topic 11, and it assumes `embed(texts, inputType)` returns one vector per text. Run it from `~/pi-lab` with `node --env-file=rag/.env rag/build-index.ts`. The `--env-file=rag/.env` flag (topic 3) loads `VOYAGE_API_KEY` from `rag/.env`. In the script, `??` means \"use the right side if the left side is null or undefined\", `new Map()` is a lookup table from keys to values, and the `!` after `vectors.get(c.hash)` tells TypeScript you are sure the value exists (it is erased before running).",
      "analogy": "Re-photographing only the pages of a manuscript that were edited. You recognise an unchanged page by its fingerprint (the hash) and keep its old photo. New or altered pages get a fresh photo, and pages torn out of the book lose their photo.",
      "code": [
        {
          "language": "typescript",
          "filename": "hash.ts",
          "source": "import { createHash } from \"node:crypto\";\n\nconst h = (s: string) => createHash(\"sha256\").update(s).digest(\"hex\").slice(0, 12);\n\nconsole.log(h(\"Install Node 26 LTS.\") === h(\"Install Node 26 LTS.\"), h(\"a\") === h(\"b\"));",
          "output": "true false",
          "explanation": "The same text gives the same hash, so the first comparison is `true`. Different texts (`\"a\"` and `\"b\"`) give different hashes, so the second is `false`. That is the whole trick the rebuild relies on."
        },
        {
          "language": "typescript",
          "filename": "build-index.ts",
          "source": "import { createHash } from \"node:crypto\";\nimport { readdir, readFile, writeFile } from \"node:fs/promises\";\nimport { chunkMarkdown } from \"./chunk.ts\";\nimport type { Chunk } from \"./chunk.ts\";\nimport { embed } from \"./embed.ts\";\n\nconst MODEL = \"voyage-4\";\nconst DIMS = 1024;\nconst BATCH_SIZE = 64;\nconst INDEX_PATH = \"rag/index.json\";\n\ntype StoredChunk = Chunk & { hash: string; embedding: number[] };\ntype Index = { model: string; dims: number; builtAt: string; chunks: StoredChunk[] };\n\nconst sha = (s: string) => createHash(\"sha256\").update(s).digest(\"hex\").slice(0, 12);\nconst toEmbed = (c: Chunk) => `${c.heading}\\n${c.text}`;\n\nfunction batches<T>(items: T[], size: number): T[][] {\n  const out: T[][] = [];\n  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));\n  return out;\n}\n\n// 1. Load the old index (if any) and remember its embeddings by hash.\nlet old: Index | null = null;\ntry {\n  old = JSON.parse(await readFile(INDEX_PATH, \"utf8\"));\n} catch {\n  old = null; // no index yet\n}\nconst vectors = new Map<string, number[]>();\nif (old && old.model === MODEL && old.dims === DIMS) {\n  for (const c of old.chunks ?? []) vectors.set(c.hash, c.embedding);\n}\n\n// 2. Chunk every markdown file and hash each chunk.\nconst chunks: Chunk[] = [];\nconst names = (await readdir(\"docs\")).filter((f) => f.endsWith(\".md\")).sort();\nfor (const name of names) {\n  chunks.push(...chunkMarkdown(name, await readFile(`docs/${name}`, \"utf8\")));\n}\nconst hashed = chunks.map((c) => ({ ...c, hash: sha(toEmbed(c)) }));\n\n// 3. Embed only chunks whose hash has no stored vector.\nconst todo = hashed.filter((c) => !vectors.has(c.hash));\nconst groups = batches(todo, BATCH_SIZE);\nfor (let i = 0; i < groups.length; i++) {\n  const vecs = await embed(groups[i].map(toEmbed), \"document\");\n  groups[i].forEach((c, j) => vectors.set(c.hash, vecs[j]));\n  console.log(`batch ${i + 1}/${groups.length}: ${groups[i].length} chunks`);\n}\n\n// 4. Write the new index. Chunks that no longer exist are dropped here.\nconst index: Index = {\n  model: MODEL,\n  dims: DIMS,\n  builtAt: new Date().toISOString(),\n  chunks: hashed.map((c) => ({ ...c, embedding: vectors.get(c.hash)! })),\n};\nawait writeFile(INDEX_PATH, JSON.stringify(index));\nconsole.log(`chunks: ${hashed.length}, reused: ${hashed.length - todo.length}, embedded: ${todo.length}`);",
          "output": "batch 1/1: 5 chunks\nchunks: 5, reused: 0, embedded: 5",
          "explanation": "This is the output of the first run, when no index exists, so all 5 chunks of the corpus are embedded in one batch (it needs your Voyage key and network access, unlike the earlier examples). Run it again without changing anything and it prints only `chunks: 5, reused: 5, embedded: 0`, with no batch lines. If you then edit one section in a doc, it prints `chunks: 5, reused: 4, embedded: 1`. The `{ ...c, hash: ... }` syntax copies all fields of `c` into a new object and adds a `hash` field."
        }
      ],
      "productionNote": "Teams run this kind of script in CI (continuous integration, an automatic job that runs when code changes) so the index is rebuilt whenever the docs change. Hash reuse keeps that cheap, because only edited sections cost embedding tokens, and it also keeps the build fast.",
      "commonMistakes": [
        "Hashing the file path instead of the content. The path does not change when the text does, so edited chunks would keep their stale embeddings.",
        "Never removing stale chunks. If you merge new chunks into the old index instead of building the list from the current files, deleted sections keep appearing in search results. Build the new chunk list from the current files only, as the script does.",
        "Reusing embeddings after changing model or dimensions. The script checks `model` and `dims` and starts fresh when they differ."
      ],
      "sources": [
        { "title": "Node.js crypto.createHash", "url": "https://nodejs.org/docs/latest-v26.x/api/crypto.html#cryptocreatehashalgorithm-options" }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Why split documents into chunks instead of embedding each whole file as one vector?",
      "options": [
        "The embedding API refuses any file with more than one heading",
        "One vector for a whole file averages many topics together, so a question about one section matches it poorly",
        "Chunks are required to save the index as JSON",
        "Whole files cannot be read by readFile"
      ],
      "answerIndex": 1,
      "explanation": "A chunk focuses on one idea, so its embedding represents that idea clearly. A whole-file vector blends all topics in the file and dilutes the meaning. The API, JSON and readFile have no such restriction."
    },
    {
      "question": "Which chunk metadata lets you show a citation such as docs/setup.md > API keys?",
      "options": [
        "embedding and hash",
        "builtAt and dims",
        "model and id counter only",
        "file and heading"
      ],
      "answerIndex": 3,
      "explanation": "The file name and heading say where the text came from. The embedding, hash, build time, dimensions and model describe the vector or the build, not the source location."
    },
    {
      "question": "You have 130 chunks and use batches of 64. How many embedding requests does one full build need?",
      "options": [
        "2",
        "130",
        "3",
        "64"
      ],
      "answerIndex": 2,
      "explanation": "The batches have 64, 64 and 2 chunks, so 3 requests. Two requests would leave 2 chunks out, and 130 is one request per chunk."
    },
    {
      "question": "Why does the index file store the model name (for example voyage-4)?",
      "options": [
        "Vectors from different models are not comparable, so you must refuse an index built with another model",
        "The Voyage API refuses requests without it",
        "JSON files cannot be loaded without a model field",
        "It makes the file smaller"
      ],
      "answerIndex": 0,
      "explanation": "Each model places meanings in its own number space. Comparing vectors from different models gives meaningless scores, so the stored model name is checked before the index is used. The other options are not true."
    },
    {
      "question": "When rebuilding, what does a chunk whose hash matches a chunk in the old index let you skip?",
      "options": [
        "Reading the markdown files from disk",
        "Calling the embedding API for that chunk, because you can reuse its stored vector",
        "Writing the new index.json file",
        "Splitting the file into chunks"
      ],
      "answerIndex": 1,
      "explanation": "A matching hash means the embedded text is unchanged, so its old embedding is still valid and no new API call (cost) is needed. You still read, chunk and write the files."
    }
  ]
});
