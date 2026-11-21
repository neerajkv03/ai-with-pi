# 11. Embeddings & Similarity
Version: Node.js 26.13.1 LTS + Voyage voyage-4
Prerequisites: 10-commands-events-templates

Week 3 start (RAG). Scripts in `~/pi-lab/rag/`. Needs `VOYAGE_API_KEY` (separate from Zen; Zen has no embeddings API).

## Learning goals
- Learner can explain what an embedding is and why similar texts get close vectors.
- Learner can call the Voyage embeddings API from TypeScript.
- Learner can choose `input_type` "query" vs "document".
- Learner can compute cosine similarity in plain TypeScript.
- Learner can pick dimensions and stay within request limits.

## Sub-topics
### What an embedding is
- Concept: embedding = list of numbers (vector) representing meaning of a text; similar meaning → vectors point in similar directions. Used for search by meaning (semantic search), the "R" in RAG (retrieval-augmented generation: fetch relevant text, give it to the model). Vector = array of numbers; dimension = its length.
- Analogy: map coordinates for ideas: "cat" and "kitten" are neighbours in the same town; "invoice" lives in another city.
- Code example: toy 2-D vectors (made-up): `const v = { cat: [0.9, 0.1], kitten: [0.85, 0.2], invoice: [0.1, 0.95] }; console.log(v.cat, v.invoice);` → `[ 0.9, 0.1 ] [ 0.1, 0.95 ]` (state real ones have 1024 numbers).
- Production use: doc search, dedup, memory recall (topic 14).
- Common mistakes: thinking embeddings store the text; comparing vectors from different model families.
- Sources: https://docs.voyageai.com/docs/embeddings ; https://developers.google.com/machine-learning/crash-course/embeddings

### Calling the Voyage AI API
- Concept: `POST https://api.voyageai.com/v1/embeddings`, headers `Authorization: Bearer $VOYAGE_API_KEY`, `Content-Type: application/json`; body `{ input: string | string[], model: "voyage-4", input_type?: "query"|"document" }`. Response `{ data: [{ object: "embedding", embedding: number[], index }], model, usage: { total_tokens } }`. Check `res.ok`; sort by `index`.
- Analogy: sending sentences to a translation office that replies with coordinates instead of words.
- Code example: `embed.ts`: `export async function embed(texts: string[], inputType: "query" | "document"): Promise<number[][]> { const key = process.env.VOYAGE_API_KEY; if (!key) throw new Error("Missing VOYAGE_API_KEY"); const res = await fetch("https://api.voyageai.com/v1/embeddings", { method: "POST", headers: { Authorization: \`Bearer ${key}\`, "Content-Type": "application/json" }, body: JSON.stringify({ input: texts, model: "voyage-4", input_type: inputType }) }); if (!res.ok) throw new Error(\`Voyage HTTP ${res.status}: ${await res.text()}\`); const json = await res.json() as { data: { embedding: number[]; index: number }[]; usage: { total_tokens: number } }; return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding); }` ; demo `const [v] = await embed(["hello"], "document"); console.log(v.length);` → `1024`.
- Production use: wrapped as a helper used by the index builder (12) and search tool (13).
- Common mistakes: key in code; ignoring HTTP errors; not sorting by index.
- Sources: https://docs.voyageai.com/reference/embeddings-api ; https://docs.voyageai.com/docs/embeddings

### Query vs document input_type
- Concept: `input_type: "document"` for stored chunks, `"query"` for the user's question; Voyage prepends prompts ("Represent the query for retrieving supporting documents: " / "Represent the document for retrieval: "). Improves retrieval; vectors stay compatible (can mix with null).
- Analogy: library: books catalogued by librarian's rules (document), questions asked at the desk phrased as "I'm looking for..." (query); both use the same shelf map.
- Code example: `const [q] = await embed(["How do I set my API key?"], "query"); const docs = await embed(["Set OPENCODE_API_KEY in your shell.", "Invoices are sent monthly."], "document");` then cosine (next sub-topic) → first doc scores higher (sample scores, e.g. 0.6 vs 0.2; values vary).
- Production use: always tag correctly in RAG.
- Common mistakes: embedding queries as documents; mixing models (voyage-4 index + other-family query).
- Sources: https://docs.voyageai.com/docs/embeddings

### Cosine similarity in TypeScript
- Concept: cosine = dot(a,b) / (|a|·|b|); range -1..1; 1 = same direction. Dot product = sum of pairwise products; norm = sqrt(sum of squares). Top-k = sort by score, take first k.
- Analogy: comparing two arrows by the angle between them, ignoring length — two people pointing the same way agree, even if one arm is longer.
- Code example: `cosine.ts`: `export function cosine(a: number[], b: number[]): number { let dot = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return dot / (Math.sqrt(na) * Math.sqrt(nb)); } console.log(cosine([1, 2, 3], [2, 4, 6]).toFixed(4), cosine([1, 2, 3], [3, 0, -1]).toFixed(4), cosine([1, 0], [1, 1]).toFixed(4));` → `1.0000 0.0000 0.7071`.
- Production use: no vector DB needed for a few thousand chunks (course choice: JSON + cosine).
- Common mistakes: different lengths; division by zero for all-zero vectors (guard).
- Sources: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sqrt ; https://en.wikipedia.org/wiki/Cosine_similarity

### Dimensions, cost & limits
- Concept: voyage-4 default 1024 dims; `output_dimension` 256/512/2048 (smaller = less storage, some quality loss). `output_dtype` float default. Max 1000 inputs per request; 32,000-token context per input (`truncation` default true cuts longer text). Billed per token (`usage.total_tokens`); check pricing page, do not quote prices. Index storage: 1024 floats × chunks.
- Analogy: photo resolution: higher = sharper but bigger files.
- Code example: `size.ts`: `const chunks = 500, dims = 1024; const bytesAsJsonApprox = chunks * dims * 10; console.log((bytesAsJsonApprox / 1_000_000).toFixed(1) + " MB");` → `5.1 MB` (state ~10 chars per number in JSON as an estimate).
- Production use: pick 512 for big corpora; batch to stay under 1000.
- Common mistakes: re-embedding everything each run (topic 12 fixes); comparing 512-dim and 1024-dim vectors.
- Sources: https://docs.voyageai.com/reference/embeddings-api ; https://docs.voyageai.com/docs/pricing

## Quiz
1. What does an embedding represent? — tests concept
2. Which input_type for a user's question? — tests query vs document
3. cosine of [1,0] and [0,1] — tests cosine (0)
4. Max inputs per Voyage request — tests limits (1000)
5. Why not compare vectors of different dimensions? — tests dimensions
