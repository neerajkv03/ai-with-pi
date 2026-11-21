# 13. Retrieval Tool & Doc Skill
Version: Pi 1.6.0 + Node.js 26.13.1 LTS + Voyage voyage-4
Prerequisites: 12-doc-index

Week 3 checkpoint: answers cite retrieved chunks, not hallucinations. Build `~/pi-lab/.pi/extensions/docs-search.ts` (imports `../../rag/embed.ts`, `../../rag/cosine.ts`) and skill `~/pi-lab/.pi/skills/doc-answer/SKILL.md`. Start Pi from a shell where `VOYAGE_API_KEY` is set.

## Learning goals
- Learner can register a `search_docs` tool that returns the top-k chunks for a query.
- Learner can format chunks with numbered sources and scores.
- Learner can write a SKILL.md with valid frontmatter and place it where Pi finds it.
- Learner can teach the agent to cite sources and say "I don't know".
- Learner can verify with test questions that answers are grounded.

## Sub-topics
### A search_docs tool returning top-k chunks
- Concept: tool params `{ query: string, k?: number (1–8, default 3) }`; execute: load `rag/index.json` (resolve from `ctx.cwd`, cache in a variable after first load), embed query with `input_type: "query"`, score all chunks with cosine, sort desc, take k. Pass `signal` to fetch. Throw clear error if index missing ("Run node --env-file=.env rag/build-index.ts first").
- Analogy: librarian who, given your question, brings back the 3 most relevant index cards.
- Code example: pure ranking helper (deterministic): `export function topK<T extends { embedding: number[] }>(q: number[], items: T[], k: number) { return items.map((it) => ({ it, score: cosine(q, it.embedding) })).sort((a, b) => b.score - a.score).slice(0, k); } const items = [{ id: "a", embedding: [1, 0] }, { id: "b", embedding: [0, 1] }, { id: "c", embedding: [1, 1] }]; console.log(topK([1, 0.1], items, 2).map((r) => r.it.id));` → `[ 'a', 'c' ]`.
- Production use: the standard RAG tool shape.
- Common mistakes: reloading the index every call; embedding query as document; k too large (context waste).
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#custom-tools ; https://docs.voyageai.com/docs/embeddings

### Formatting chunks with sources
- Concept: content text the model reads: numbered blocks `[n] file › heading (score 0.xx)` + text; keep `details: { results: [{ id, file, heading, score }] }` for UI/evals. Round scores to 2 decimals. Low scores still returned; skill decides.
- Analogy: footnotes in a textbook — each claim points to a numbered source.
- Code example: `const fmt = (r: { file: string; heading: string; text: string; score: number }, i: number) => \`[${i + 1}] docs/${r.file} › ${r.heading} (score ${r.score.toFixed(2)})\n${r.text}\`; console.log(fmt({ file: "setup.md", heading: "API keys", text: "Set OPENCODE_API_KEY and VOYAGE_API_KEY.", score: 0.7123 }, 0));` → `[1] docs/setup.md › API keys (score 0.71)` / `Set OPENCODE_API_KEY and VOYAGE_API_KEY.`
- Production use: citations users can click/check.
- Common mistakes: dropping file names; huge chunks (truncate).
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#output-truncation

### SKILL.md format & locations
- Concept: skill = folder with `SKILL.md` (+ optional scripts/references). Frontmatter: `name` (lowercase, digits, hyphens, ≤64, match folder), `description` (≤1024; required — skills without it are not loaded). Only name/description/path go into the system prompt; model loads the body when the task matches; `/skill:doc-answer` forces it. Locations: `~/.pi/agent/skills/`, project `.pi/skills/` (trust), also `~/.agents/skills/` and `.agents/skills/`. `/reload` after edits.
- Analogy: skill = laminated procedure card in a drawer; the drawer label (description) is always visible, the card is pulled out only when needed.
- Code example: `.pi/skills/doc-answer/SKILL.md`: `---\nname: doc-answer\ndescription: Answer questions about the pi-lab docs (setup, billing, FAQ) using the search_docs tool, with numbered citations.\n---\n# Answering from docs\n1. Call search_docs with the user's question.\n2. Answer only from returned chunks.\n3. Cite like [1] docs/setup.md › API keys.\n4. If no chunk answers it, say: "I don't know based on the docs."` → startup header lists skill `doc-answer`.
- Production use: domain workflows without code.
- Common mistakes: missing description; name not matching rules; vague description (never triggers).
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md ; https://agentskills.io/specification

### Teaching citations & "I don't know"
- Concept: grounding = answer only from retrieved text. Rules: cite every claim; refuse when scores low or chunks irrelevant (threshold guide e.g. top score < 0.5 → treat as no match; tune by testing); never invent file names. Also add tool `promptGuidelines`: "Use search_docs before answering questions about pi-lab docs."
- Analogy: a careful journalist: no source, no story.
- Code example: question `Are unused credits refunded?` → expected answer pattern (sample): `No, unused credits are not refunded [1].` with `[1] docs/billing.md › Refunds`. Question `What is the office address?` → `I don't know based on the docs.`
- Production use: support bots, internal doc assistants (portfolio option 2).
- Common mistakes: threshold copied without testing; letting model "add helpful extra info" from memory.
- Sources: https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations

### Checkpoint: cited answers, not hallucinations
- Concept: 6 fixed questions: 4 answerable (API keys, sandbox, credits refund, Node version), 2 unanswerable (office address, phone support hours). Score: answerable → correct + citation exists in docs; unanswerable → says "I don't know". Run headless and save: `pi --no-session -p "<q>"`. Record a table.
- Analogy: open-book exam where the grader checks every footnote.
- Code example: `check.ts` (deterministic scorer on saved answers): `const ans = "No, unused credits are not refunded [1] docs/billing.md › Refunds"; const cited = /\[\d+\] docs\/[\w-]+\.md/.test(ans); const idk = /I don't know/.test(ans); console.log({ cited, idk });` → `{ cited: true, idk: false }`.
- Production use: seed of the eval set (topic 18).
- Common mistakes: grading by feel; only testing answerable questions.
- Sources: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md#invocation-and-output

## Quiz
1. Why embed the query with input_type "query"? — tests retrieval
2. What goes in content vs details for search results? — tests formatting
3. Which SKILL.md field is required to load? — tests skills
4. When should the agent say "I don't know"? — tests grounding
5. Why include unanswerable questions in the checkpoint? — tests evaluation
