# 12. Building a Doc Index
Version: Node.js 26.13.1 LTS + Voyage voyage-4
Prerequisites: 11-embeddings

Script `~/pi-lab/rag/build-index.ts` → writes `~/pi-lab/rag/index.json`. Corpus `~/pi-lab/docs/`: author defines 3 small files: `setup.md` (# Setup / Install Node 26 LTS. / ## API keys / Set OPENCODE_API_KEY and VOYAGE_API_KEY.), `billing.md` (# Billing / Zen uses prepaid credits. / ## Refunds / Unused credits are not refunded.), `faq.md` (# FAQ / ## Is Pi a sandbox? / No. Pi runs commands with your user's permissions.). Reuse `embed.ts`, `cosine.ts` from topic 11.

## Learning goals
- Learner can split markdown into chunks by headings.
- Learner can attach metadata (file, heading, id) to each chunk.
- Learner can embed chunks in batches under the API limit.
- Learner can save and load the index as JSON.
- Learner can rebuild only changed chunks using content hashes.

## Sub-topics
### Chunking markdown files
- Concept: chunk = small piece of a document embedded separately (whole files dilute meaning; tiny pieces lose context). Simple strategy: split at lines starting with `#`; keep heading + following text; skip empty chunks; optional max length (e.g. 1500 chars) split further. `readdir`, `readFile` from `node:fs/promises`.
- Analogy: cutting a cookbook into recipe cards — one card per recipe, titled, so you can grab just the one you need.
- Code example: `chunk.ts`: `export type Chunk = { id: string; file: string; heading: string; text: string }; export function chunkMarkdown(file: string, md: string): Chunk[] { const out: Chunk[] = []; let heading = "(intro)"; let buf: string[] = []; const flush = () => { const text = buf.join("\n").trim(); if (text) out.push({ id: \`${file}#${out.length}\`, file, heading, text }); buf = []; }; for (const line of md.split(/\r?\n/)) { const m = line.match(/^#{1,6}\s+(.*)$/); if (m) { flush(); heading = m[1]; } else buf.push(line); } flush(); return out; } console.log(chunkMarkdown("setup.md", "# Setup\nInstall Node 26 LTS.\n## API keys\nSet OPENCODE_API_KEY and VOYAGE_API_KEY.\n"));` → array of 2: `{ id: 'setup.md#0', file: 'setup.md', heading: 'Setup', text: 'Install Node 26 LTS.' }`, `{ id: 'setup.md#1', file: 'setup.md', heading: 'API keys', text: 'Set OPENCODE_API_KEY and VOYAGE_API_KEY.' }`.
- Production use: chunk quality decides answer quality more than the model.
- Common mistakes: splitting mid-sentence by fixed char count; forgetting `\r\n` on Windows.
- Sources: https://docs.voyageai.com/docs/embeddings ; https://nodejs.org/docs/latest-v26.x/api/fs.html#fspromisesreaddirpath-options

### Chunk metadata (file, heading)
- Concept: metadata = facts about a chunk kept beside its text: `file`, `heading`, stable `id`, `hash`. Enables citations ("docs/setup.md › API keys") and filtering. Embed `heading + "\n" + text` for better recall; store them separately.
- Analogy: library card: book title, shelf, page — so a quote can be traced back.
- Code example: `const toEmbed = (c: Chunk) => \`${c.heading}\n${c.text}\`; console.log(toEmbed({ id: "faq.md#0", file: "faq.md", heading: "Is Pi a sandbox?", text: "No. Pi runs commands with your user's permissions." }));` → two lines `Is Pi a sandbox?` / `No. Pi runs commands with your user's permissions.`
- Production use: citations in topic 13.
- Common mistakes: ids based on position that shift when files change (accept for course; note hash fixes reuse).
- Sources: https://docs.voyageai.com/docs/embeddings

### Embedding in batches
- Concept: send many chunks per request (fewer round trips) but ≤1000 inputs; pick batch size 64; loop with `slice`; sequential to respect rate limits; log progress.
- Analogy: posting letters in bundles of 64 instead of one trip per letter or one impossible giant sack.
- Code example: `export function batches<T>(items: T[], size: number): T[][] { const out: T[][] = []; for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size)); return out; } console.log(batches([1, 2, 3, 4, 5], 2));` → `[ [ 1, 2 ], [ 3, 4 ], [ 5 ] ]`. Then `for (const b of batches(chunks, 64)) { const vecs = await embed(b.map(toEmbed), "document"); ... }`.
- Production use: indexing large repos/doc sites.
- Common mistakes: one request per chunk (slow, costly overhead); exceeding 1000.
- Sources: https://docs.voyageai.com/reference/embeddings-api

### Storing the index as JSON
- Concept: index file `{ model: "voyage-4", dims: 1024, builtAt: ISO date, chunks: [{ id, file, heading, text, hash, embedding }] }`; `writeFile(path, JSON.stringify(index))`; load with `JSON.parse(await readFile(...))`; check `model` matches before use. Add `rag/index.json` to `.gitignore`? (No: small, but regenerate-able — recommend ignoring.)
- Analogy: index = card catalogue drawer saved to disk so tomorrow you don't re-catalogue the library.
- Code example: `save.ts` writes index with 1 fake chunk `embedding: [0.1, 0.2]`, reads back, `console.log(loaded.chunks.length, loaded.model)` → `1 voyage-4`.
- Production use: simple, inspectable store; swap for a vector DB (Chroma, Qdrant) only when it gets big.
- Common mistakes: pretty-printing huge vectors (file bloat); mixing models in one file.
- Sources: https://nodejs.org/docs/latest-v26.x/api/fs.html#fspromiseswritefilefile-data-options ; https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify

### Rebuilding when files change
- Concept: hash = short fingerprint of content (`createHash("sha256").update(text).digest("hex")` from `node:crypto`); same text → same hash. On rebuild: reuse embedding when hash matches an old chunk, embed only new/changed, drop deleted. Command: `node --env-file=.env rag/build-index.ts`.
- Analogy: only re-photographing pages that were edited, recognized by their fingerprint.
- Code example: `import { createHash } from "node:crypto"; const h = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 12); console.log(h("Install Node 26 LTS.") === h("Install Node 26 LTS."), h("a") === h("b"));` → `true false`. Build log sample: `chunks: 6, reused: 5, embedded: 1`.
- Production use: CI job re-indexing docs on change; cost control.
- Common mistakes: hashing file path instead of content; never deleting stale chunks.
- Sources: https://nodejs.org/docs/latest-v26.x/api/crypto.html#cryptocreatehashalgorithm-options

## Quiz
1. Why chunk instead of embedding whole files? — tests chunking
2. Which metadata enables citations? — tests metadata
3. Batches of 64 for 130 chunks = how many requests? — tests batching (3)
4. Why store `model` in the index? — tests index format
5. What does a matching hash let you skip? — tests rebuilds
