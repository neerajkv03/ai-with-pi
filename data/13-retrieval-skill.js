window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "13-retrieval-skill",
  "order": 13,
  "title": "Retrieval Tool & Doc Skill",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "You turn the doc index from the previous topic into a working question-answering agent. A search_docs tool finds the most relevant chunks, and a skill (a folder with a SKILL.md file of instructions) teaches the agent to cite numbered sources and to say \"I don't know\" when the docs do not contain the answer. You finish with a six-question checkpoint that is scored by a script, not by feel.",
  "prerequisites": [
    "12-doc-index"
  ],
  "subtopics": [
    {
      "id": "search-docs-tool",
      "title": "A search_docs tool returning top-k chunks",
      "explanation": "In the last two topics you built the pieces of retrieval: an embedding function, a cosine similarity function and a rag/index.json file holding every doc chunk with its vector. Now you connect them to the agent. You write an extension (topic 8) that registers a tool called search_docs. When the model calls it with a question, the tool finds the k chunks whose vectors are closest to the question's vector and returns them. The model then writes its answer from those chunks instead of from memory.\n\nThe tool takes two parameters. query is the question text, required. k is how many chunks to return, optional, between 1 and 8, default 3. Keep k small: every returned chunk is added to the context window, so a large k wastes tokens and buries the useful chunk among weak ones.\n\nInside execute the steps are always the same. First, load rag/index.json once and keep it in a variable (a cache: a stored copy so you do not repeat slow work). Second, embed the query with input_type \"query\", because the index was built with input_type \"document\" and Voyage prepares the two kinds of text differently so that questions land near the passages that answer them. Third, score every chunk with cosine similarity. Fourth, sort by score from highest to lowest and keep the first k. Pass the tool's signal (the cancellation signal from topic 3) to the embedding call so that Esc or a timeout also stops the network request.\n\nThe ranking step has no network or file access, so you can test it on its own. The first example below is that helper, topK. Notes on the syntax: .sort((a, b) => b.score - a.score) reorders an array in place; returning a positive number means b goes before a, so bigger scores come first. .slice(0, k) returns a new array with only the first k items.",
      "analogy": "A librarian who, given your question, goes to the card catalogue and brings back the 3 index cards that match best. Embedding the query is the librarian understanding what you mean; cosine is comparing your meaning with each card; k is how many cards you let them carry back.",
      "code": [
        {
          "language": "typescript",
          "filename": "top-k.ts",
          "source": "type Item = { id: string; embedding: number[] };\n\nfunction cosine(a: number[], b: number[]): number {\n  let dot = 0;\n  let normA = 0;\n  let normB = 0;\n  for (let i = 0; i < a.length; i++) {\n    dot += a[i] * b[i];\n    normA += a[i] * a[i];\n    normB += b[i] * b[i];\n  }\n  return dot / (Math.sqrt(normA) * Math.sqrt(normB));\n}\n\nfunction topK(q: number[], items: Item[], k: number) {\n  return items\n    .map((it) => ({ it, score: cosine(q, it.embedding) }))\n    .sort((a, b) => b.score - a.score)\n    .slice(0, k);\n}\n\nconst items: Item[] = [\n  { id: \"a\", embedding: [1, 0] },\n  { id: \"b\", embedding: [0, 1] },\n  { id: \"c\", embedding: [1, 1] },\n];\n\nconsole.log(topK([1, 0.1], items, 2).map((r) => r.it.id));",
          "output": "[ 'a', 'c' ]",
          "explanation": "Run it with node top-k.ts. The query [1, 0.1] points almost along the first axis, so item a scores about 0.995, item c about 0.77 and item b about 0.10. After sorting, slice(0, 2) keeps a and c. The cosine function is copied here only so the file runs alone; in pi-lab you import it from rag/cosine.ts."
        },
        {
          "language": "typescript",
          "filename": "pi-lab/.pi/extensions/docs-search.ts",
          "source": "import { readFile } from \"node:fs/promises\";\nimport { join } from \"node:path\";\nimport type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\nimport { Type } from \"typebox\";\nimport { embed } from \"../../rag/embed.ts\";\nimport { cosine } from \"../../rag/cosine.ts\";\n\ntype Chunk = { id: string; file: string; heading: string; text: string; embedding: number[] };\n\nlet index: Chunk[] | undefined;\n\nasync function loadIndex(cwd: string): Promise<Chunk[]> {\n  if (index) return index;\n  let raw: string;\n  try {\n    raw = await readFile(join(cwd, \"rag\", \"index.json\"), \"utf8\");\n  } catch {\n    throw new Error(\"rag/index.json not found. Run node --env-file=.env rag/build-index.ts first.\");\n  }\n  index = JSON.parse(raw) as Chunk[];\n  return index;\n}\n\nexport default function (pi: ExtensionAPI) {\n  pi.registerTool({\n    name: \"search_docs\",\n    label: \"Search docs\",\n    description:\n      \"Search the pi-lab documentation (setup, billing, FAQ) and return the most relevant text chunks for a question.\",\n    parameters: Type.Object({\n      query: Type.String({ description: \"The question or keywords to search for\", minLength: 1 }),\n      k: Type.Optional(Type.Number({ description: \"How many chunks to return, 1 to 8 (default 3)\", minimum: 1, maximum: 8 })),\n    }),\n    async execute(_toolCallId, params, signal, _onUpdate, ctx) {\n      const k = Math.min(8, Math.max(1, Math.floor(params.k ?? 3)));\n      const chunks = await loadIndex(ctx.cwd);\n      const [queryVector] = await embed([params.query], \"query\", signal);\n      const top = chunks\n        .map((c) => ({ c, score: cosine(queryVector, c.embedding) }))\n        .sort((a, b) => b.score - a.score)\n        .slice(0, k);\n      const text = top.map((r) => `${r.c.file} / ${r.c.heading}: ${r.c.text}`).join(\"\\n\\n\");\n      return {\n        content: [{ type: \"text\", text }],\n        details: { results: top.map((r) => ({ id: r.c.id, score: r.score })) },\n      };\n    },\n  });\n}",
          "output": "",
          "explanation": "Create the folder first if needed (mkdir -p .pi/extensions in Git Bash, or mkdir .pi/extensions in PowerShell, run inside ~/pi-lab), then save this file. It loads automatically because it lives in the project's .pi/extensions folder; the project must be trusted (topic 8). Important assumptions: from topics 11 and 12, rag/embed.ts exports embed(texts, inputType, signal) returning one vector per text, rag/cosine.ts exports cosine(a, b), and rag/index.json is a list of chunk objects with id, file, heading, text and embedding. If your names or shapes differ, adjust the three import lines and the Chunk type. Also, ctx.cwd is the folder Pi was started in, and a ?? b means 'use a, but use b if a is undefined'. Pi runs extensions inside its own process, so VOYAGE_API_KEY must be set in the shell where you start pi: in Git Bash run export VOYAGE_API_KEY=your-key, in PowerShell run $env:VOYAGE_API_KEY = \"your-key\", then start pi. The next sub-topic replaces the plain text layout with numbered, cited blocks."
        }
      ],
      "productionNote": "This is the standard shape of a RAG (retrieval-augmented generation) tool: embed the query, rank stored vectors, return the top few passages. Real systems swap the in-memory loop for a vector database, but the tool contract (query in, ranked passages out) stays the same, so the agent code does not change. The cache is why a second search is fast; after you rebuild the index, run /reload so the extension is loaded fresh and the old cached copy is dropped.",
      "commonMistakes": [
        "Reading and parsing rag/index.json on every call. It is slow and pointless; load it once into a variable.",
        "Embedding the query with input_type \"document\" (or none). The index side used \"document\", so the query side must use \"query\" to get the retrieval-tuned vectors.",
        "Allowing a large k. Eight long chunks can fill a big part of the context window and distract the model from the one chunk that matters.",
        "Forgetting to pass signal to the embedding call, so cancelling the agent leaves a network request running.",
        "Starting pi from a shell where VOYAGE_API_KEY is not set. The tool then fails at the embedding step."
      ],
      "sources": [
        {
          "title": "Pi docs: extensions, custom tools",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#custom-tools"
        },
        {
          "title": "Voyage AI: embeddings",
          "url": "https://docs.voyageai.com/docs/embeddings"
        }
      ]
    },
    {
      "id": "formatting-chunks-with-sources",
      "title": "Formatting chunks with sources",
      "explanation": "What the tool returns is what the model reads, so the layout matters. Give each chunk a numbered header with the file, the heading and the score, then the chunk text. For example: [1] docs/setup.md › API keys (score 0.71). The number lets the model cite [1] in its answer; the file and heading let a human find the exact passage; the score lets the skill (next sub-topics) decide whether a match is strong enough to trust.\n\nThe tool result has two parts, as you learned in topic 8. content is the text the model sees. details is structured data that the model does not see but your UI, traces and tests can read. Put the readable blocks in content, and a list of { id, file, heading, score } objects in details so a later evaluation script (topic 18) can check which chunks were retrieved without parsing text.\n\nRound scores to two decimals with .toFixed(2) (it returns a string such as \"0.71\"); more digits add tokens and no information. Return low-scoring chunks too instead of filtering them in the tool: the tool reports, the skill judges. Finally, cap each chunk's length. A helper clip cuts text at a maximum number of characters and adds an ellipsis. Pi does not truncate a custom tool's output for you: the tool must do it (the 50KB / 2000-line limits from topic 8 are the ceiling to stay far below), which is why clip exists.",
      "analogy": "Footnotes in a textbook. Each claim in the answer carries a small number, and the numbered list at the bottom says exactly which book and page it came from. The reader can check any claim in seconds, and a claim with no footnote is suspect.",
      "code": [
        {
          "language": "typescript",
          "filename": "format.ts",
          "source": "type Result = { file: string; heading: string; text: string; score: number };\n\nconst clip = (s: string, max: number) => (s.length > max ? s.slice(0, max) + \"…\" : s);\n\nconst fmt = (r: Result, i: number) =>\n  `[${i + 1}] docs/${r.file} › ${r.heading} (score ${r.score.toFixed(2)})\\n${clip(r.text, 80)}`;\n\nconst results: Result[] = [\n  { file: \"setup.md\", heading: \"API keys\", text: \"Set OPENCODE_API_KEY and VOYAGE_API_KEY.\", score: 0.7123 },\n  { file: \"faq.md\", heading: \"Support\", text: \"Support is by email only.\", score: 0.4 },\n];\n\nconsole.log(results.map(fmt).join(\"\\n\\n\"));\n\nconst details = { results: results.map((r) => ({ file: r.file, score: Number(r.score.toFixed(2)) })) };\nconsole.log(JSON.stringify(details));",
          "output": "[1] docs/setup.md › API keys (score 0.71)\nSet OPENCODE_API_KEY and VOYAGE_API_KEY.\n\n[2] docs/faq.md › Support (score 0.40)\nSupport is by email only.\n{\"results\":[{\"file\":\"setup.md\",\"score\":0.71},{\"file\":\"faq.md\",\"score\":0.4}]}",
          "explanation": "Run it with node format.ts. results.map(fmt) turns each result into a numbered block (i starts at 0, so the label is i + 1) and join puts a blank line between blocks. The second print shows the details object that travels with the result, as JSON text. Both chunk texts are shorter than 80 characters, so clip leaves them unchanged."
        },
        {
          "language": "typescript",
          "filename": "pi-lab/.pi/extensions/docs-search.ts",
          "source": "import { readFile } from \"node:fs/promises\";\nimport { join } from \"node:path\";\nimport type { ExtensionAPI } from \"@earendil-works/pi-coding-agent\";\nimport { Type } from \"typebox\";\nimport { embed } from \"../../rag/embed.ts\";\nimport { cosine } from \"../../rag/cosine.ts\";\n\ntype Chunk = { id: string; file: string; heading: string; text: string; embedding: number[] };\n\nlet index: Chunk[] | undefined;\n\nasync function loadIndex(cwd: string): Promise<Chunk[]> {\n  if (index) return index;\n  let raw: string;\n  try {\n    raw = await readFile(join(cwd, \"rag\", \"index.json\"), \"utf8\");\n  } catch {\n    throw new Error(\"rag/index.json not found. Run node --env-file=.env rag/build-index.ts first.\");\n  }\n  index = JSON.parse(raw) as Chunk[];\n  return index;\n}\n\nconst clip = (s: string, max: number) => (s.length > max ? s.slice(0, max) + \"…\" : s);\n\nexport default function (pi: ExtensionAPI) {\n  pi.registerTool({\n    name: \"search_docs\",\n    label: \"Search docs\",\n    description:\n      \"Search the pi-lab documentation (setup, billing, FAQ) and return the most relevant text chunks for a question, numbered and with similarity scores.\",\n    promptSnippet: \"Search the pi-lab docs and return numbered, scored chunks\",\n    promptGuidelines: [\"Use search_docs before answering questions about pi-lab docs.\"],\n    parameters: Type.Object({\n      query: Type.String({ description: \"The question or keywords to search for\", minLength: 1 }),\n      k: Type.Optional(Type.Number({ description: \"How many chunks to return, 1 to 8 (default 3)\", minimum: 1, maximum: 8 })),\n    }),\n    async execute(_toolCallId, params, signal, _onUpdate, ctx) {\n      const k = Math.min(8, Math.max(1, Math.floor(params.k ?? 3)));\n      const chunks = await loadIndex(ctx.cwd);\n      const [queryVector] = await embed([params.query], \"query\", signal);\n      const top = chunks\n        .map((c) => ({ c, score: cosine(queryVector, c.embedding) }))\n        .sort((a, b) => b.score - a.score)\n        .slice(0, k);\n      const text = top\n        .map((r, i) => `[${i + 1}] docs/${r.c.file} › ${r.c.heading} (score ${r.score.toFixed(2)})\\n${clip(r.c.text, 1200)}`)\n        .join(\"\\n\\n\");\n      return {\n        content: [{ type: \"text\", text }],\n        details: {\n          results: top.map((r) => ({\n            id: r.c.id,\n            file: r.c.file,\n            heading: r.c.heading,\n            score: Number(r.score.toFixed(2)),\n          })),\n        },\n      };\n    },\n  });\n}",
          "output": "",
          "explanation": "This replaces the file from the previous sub-topic. The result text now uses numbered blocks with file, heading and score, each chunk is cut at 1200 characters, and details carries the structured list. It also adds promptSnippet (a one-line description of the tool for the system prompt) and promptGuidelines (rules added to the system prompt while the tool is active), both from topic 9. After saving run /reload inside pi so the new version loads."
        }
      ],
      "productionNote": "Citations users can click or check are what turn a chatbot into a trustworthy doc assistant. Always keep the source file name in the text the model sees; without it the model cannot cite and the user cannot verify. Keeping the machine-readable details alongside also gives you free test data: an evaluation can assert that the right file was retrieved without reading prose.",
      "commonMistakes": [
        "Dropping the file name and heading from the result, so the model has nothing real to cite and starts inventing sources.",
        "Returning very large chunks. Cut each one (clip) so a few results cannot flood the context.",
        "Filtering out low-scoring chunks inside the tool. The score is evidence; let the skill decide what counts as too weak, so you can tune the rule without changing code.",
        "Printing scores with many decimals, which spends tokens on noise."
      ],
      "sources": [
        {
          "title": "Pi docs: extensions, output truncation",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md#output-truncation"
        }
      ]
    },
    {
      "id": "skill-md-format-and-locations",
      "title": "SKILL.md format & locations",
      "explanation": "A tool gives the agent an ability; a skill gives it a procedure. A skill is a folder containing a file named SKILL.md (and optionally scripts or reference files). The file starts with frontmatter (the block between two --- lines at the top, which you met in prompt templates in topic 10), followed by plain Markdown instructions.\n\nTwo frontmatter fields matter. name must use only lowercase letters, digits and hyphens, be at most 64 characters, and, by the Agent Skills specification, should match the folder name (Pi itself does not enforce this, but other tools may). description is required, at most 1024 characters: a skill without a description is not loaded at all. Pi also accepts optional fields such as license, compatibility, metadata and disable-model-invocation, but you do not need them here.\n\nSkills load on demand, which keeps the context small. Only each skill's name, description and file path go into the system prompt. When the user's task matches a description, the model reads the full SKILL.md with its file-reading tool and follows it. You can force it by typing /skill:doc-answer in pi (slash commands for skills are on by default). This is why the description is the most important line: it is the only part the model sees before deciding to open the skill.\n\nPi looks for skills in these places: ~/.pi/agent/skills/ (your user-wide folder), .pi/skills/ inside a project (only after the project is trusted), ~/.agents/skills/ and .agents/skills/ (the shared Agent Skills locations, global and project). For pi-lab use .pi/skills/doc-answer/SKILL.md. After creating or editing a skill, run /reload so Pi rescans.\n\nCreate the folder from inside ~/pi-lab with mkdir -p .pi/skills/doc-answer (Git Bash) or mkdir .pi/skills/doc-answer (PowerShell), then create SKILL.md in it.",
      "analogy": "A laminated procedure card kept in a drawer. The drawer label (the description) is always visible, so a worker knows which card exists and when it applies. The full card (the body) is pulled out only when the job calls for it, so the workbench stays uncluttered. A card with no label is never picked, and a label that says only 'stuff' is as good as none.",
      "code": [
        {
          "language": "markdown",
          "filename": ".pi/skills/doc-answer/SKILL.md",
          "source": "---\nname: doc-answer\ndescription: Answer questions about the pi-lab docs (setup, billing, FAQ) using the search_docs tool, with numbered citations.\n---\n# Answering from docs\n\n1. Call search_docs with the user's question.\n2. Answer only from returned chunks.\n3. Cite like [1] docs/setup.md › API keys.\n4. If no chunk answers it, say: \"I don't know based on the docs.\"\n",
          "output": "",
          "explanation": "This is a first, short version of the skill; the next sub-topic strengthens it. After /reload, the Pi startup header lists doc-answer among the loaded skills. The description names the topic (pi-lab docs), the examples (setup, billing, FAQ) and the tool, so questions about those subjects match it."
        },
        {
          "language": "typescript",
          "filename": "check-name.ts",
          "source": "const ok = (name: string, folder: string) => /^[a-z0-9-]{1,64}$/.test(name) && name === folder;\n\nconsole.log(ok(\"doc-answer\", \"doc-answer\"), ok(\"Doc_Answer\", \"Doc_Answer\"), ok(\"doc-answer\", \"docs\"));",
          "output": "true false false",
          "explanation": "A small illustration of the naming rules, not Pi's own code. The pattern /^[a-z0-9-]{1,64}$/ is a regular expression (a text pattern): it accepts only lowercase letters, digits and hyphens, 1 to 64 characters long. The first call is valid. The second fails because of capitals and an underscore. The third breaks the Agent Skills spec's folder-name rule (Pi itself would not complain)."
        }
      ],
      "productionNote": "Skills let you ship domain workflows without writing code: the steps, tone and rules of a task live in a Markdown file that anyone on the team can review in a pull request (a proposed change that teammates read before it is merged). Because only the description is always loaded, you can keep many skills installed without paying for them in every request.",
      "commonMistakes": [
        "Leaving out description. The skill is silently not loaded.",
        "A name with capitals or underscores, or one that differs from the folder name (not enforced by Pi, but breaks the portable spec).",
        "A vague description such as 'Helps with docs'. The model cannot tell when it applies, so it never triggers. Name the subject and the tool.",
        "Putting the skill in a project folder that is not trusted, or forgetting /reload after creating it."
      ],
      "sources": [
        {
          "title": "Pi docs: skills",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md"
        },
        {
          "title": "Agent Skills specification",
          "url": "https://agentskills.io/specification"
        }
      ]
    },
    {
      "id": "citations-and-i-dont-know",
      "title": "Teaching citations & \"I don't know\"",
      "explanation": "Grounding means the answer comes only from the retrieved text. A model that is not told this will happily fill gaps from its training data (a hallucination, from topic 4), and the result sounds just as confident as a correct answer. The skill is where you state the rules.\n\nThe rules to write down: answer only from the chunks returned by search_docs; put a numbered citation after every claim; never invent a file name or a number that is not in the results; and if the chunks do not answer the question, say exactly \"I don't know based on the docs.\" and stop. Give the model a score guide too. A threshold is a cut-off value: for example, if the top score is below 0.5, treat the search as having found nothing. Scores from an embedding model are not probabilities, so 0.5 is a starting guess; tune it by testing real questions (the checkpoint below).\n\nA matching tool-side rule was already added in the formatting-chunks sub-topic: promptGuidelines tells the model to call search_docs before answering anything about the docs. The tool guideline makes it search; the skill tells it what to do with the results.\n\nFor example, given the question Are unused credits refunded? the expected shape is: No, unused credits are not refunded [1]. followed by the source line [1] docs/billing.md › Refunds. Given What is the office address? the search finds nothing relevant, and the only acceptable answer is I don't know based on the docs. The decision part of the rule is small enough to write as code, which the second example shows.",
      "analogy": "A careful journalist: no source, no story. Every sentence in the article must point to a document on the desk, and if the desk has nothing about the question the journalist writes 'no information available' instead of guessing, however plausible the guess.",
      "code": [
        {
          "language": "markdown",
          "filename": ".pi/skills/doc-answer/SKILL.md",
          "source": "---\nname: doc-answer\ndescription: Answer questions about the pi-lab docs (setup, billing, FAQ) using the search_docs tool, with numbered citations. Say \"I don't know\" when the docs do not contain the answer.\n---\n# Answering from docs\n\n## Steps\n1. Call search_docs with the user's question. Use k = 3 unless the question has several parts.\n2. Read the returned chunks. Each starts with a header like `[1] docs/setup.md › API keys (score 0.71)`.\n3. Answer using only the text of those chunks.\n\n## Rules\n- Put a citation after every claim, written exactly like the chunk header without the score: [1] docs/setup.md › API keys.\n- Never mention a file, heading, number or fact that does not appear in the returned chunks.\n- Do not add helpful extra information from your own memory.\n- If the highest score is below 0.5, or no chunk actually answers the question, reply with exactly: \"I don't know based on the docs.\" Do not guess and do not cite anything.\n",
          "output": "",
          "explanation": "Replace the earlier SKILL.md with this version and run /reload. The description now also mentions the refusal, which helps match questions the docs cannot answer. The 0.5 threshold is a starting value to be checked by the checkpoint, not a universal constant."
        },
        {
          "language": "typescript",
          "filename": "decide.ts",
          "source": "const THRESHOLD = 0.5;\n\nconst decide = (scores: number[]) =>\n  scores.length === 0 || Math.max(...scores) < THRESHOLD ? \"I don't know based on the docs.\" : \"answer\";\n\nconsole.log(decide([0.82, 0.4]));\nconsole.log(decide([0.31, 0.2]));\nconsole.log(decide([]));",
          "output": "answer\nI don't know based on the docs.\nI don't know based on the docs.",
          "explanation": "Math.max(...scores) uses the spread syntax ... to pass every array item as a separate argument, giving the largest score. The first call has a best score of 0.82, which is at least the threshold, so the answer proceeds. The second has a best score of 0.31, below the threshold, and the third has no results at all, so both refuse. In pi-lab the model applies this rule by reading the scores in the tool result; this helper just states the logic precisely and could later be used in an evaluation script."
        }
      ],
      "productionNote": "Support bots and internal doc assistants live or die on this behaviour: one confident wrong answer about billing costs more trust than ten honest 'I don't know' replies. The refusal rule also tells you what to improve. Every 'I don't know' on a question that should be answerable points to a missing doc or a retrieval problem.",
      "commonMistakes": [
        "Copying a threshold such as 0.5 from an example without testing it on your own docs and model. Too high refuses good answers, too low accepts weak matches.",
        "Allowing the model to 'add helpful extra info' from memory. That is exactly where hallucinations enter.",
        "Telling the model to cite but not telling it what a citation looks like, so the format drifts and cannot be checked by a script.",
        "Only writing the refusal text and not the condition for it (low score or no relevant chunk)."
      ],
      "sources": [
        {
          "title": "Anthropic: reduce hallucinations",
          "url": "https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations"
        }
      ]
    },
    {
      "id": "checkpoint-cited-answers",
      "title": "Checkpoint: cited answers, not hallucinations",
      "explanation": "Never judge a retrieval agent by reading one good answer. Use a fixed set of questions and a script that scores the saved answers. Your set has six questions: four answerable from the docs (API keys, sandbox, credits refund, Node version) and two that the docs cannot answer (office address, phone support hours).\n\nThe scoring rules are simple. For an answerable question the answer must contain at least one citation and every cited file must really exist in the docs folder. For an unanswerable question the answer must say \"I don't know\" and must not cite anything. Including unanswerable questions is essential: a bot that always produces a confident, cited-looking answer would pass four of the four answerable questions and still be dangerous.\n\nRun each question headlessly (without the interactive screen) using print mode from topic 5, with --no-session so that nothing is saved to the session history. Start from ~/pi-lab with VOYAGE_API_KEY set, and make sure the project is trusted (open pi once interactively there and accept the trust prompt) so the extension and skill load. Save each answer to a file. Then record a table with one row per question: the question, answerable or not, whether it cited, whether it said 'I don't know', and pass or fail.\n\nThe scorer below shows the logic on hand-written sample answers. A regular expression such as /docs\\/([\\w-]+\\.md)/g finds every citation of a docs file; matchAll returns all matches, and the capture group (the part in parentheses) gives the file name. Replace the sample answers with the real saved ones when you run your checkpoint.",
      "analogy": "An open-book exam where the grader checks every footnote. Having the book on the desk is not enough: each answer must point to a page that exists, and for the trick questions whose answers are not in the book, the only correct reply is 'not covered'.",
      "code": [
        {
          "language": "bash",
          "filename": "run-checkpoint.sh",
          "source": "mkdir -p answers\npi --no-session -p \"How do I set up my API keys?\" > answers/q1.txt\npi --no-session -p \"Is there a sandbox I can test in?\" > answers/q2.txt\npi --no-session -p \"Are unused credits refunded?\" > answers/q3.txt\npi --no-session -p \"Which Node.js version is needed?\" > answers/q4.txt\npi --no-session -p \"What is the office address?\" > answers/q5.txt\npi --no-session -p \"What are the phone support hours?\" > answers/q6.txt",
          "output": "",
          "explanation": "Run it in Git Bash from ~/pi-lab (bash run-checkpoint.sh). The > symbol redirects what pi prints into a file instead of the screen. The wording of each answer will differ from run to run, which is why the scoring script checks patterns rather than exact text. Adjust the question wording to match what your docs actually contain."
        },
        {
          "language": "typescript",
          "filename": "check.ts",
          "source": "type Case = { question: string; answerable: boolean; answer: string };\n\nconst known = [\"setup.md\", \"billing.md\", \"faq.md\"];\n\nconst cases: Case[] = [\n  { question: \"Are unused credits refunded?\", answerable: true, answer: \"No, unused credits are not refunded [1] docs/billing.md › Refunds\" },\n  { question: \"What is the office address?\", answerable: false, answer: \"I don't know based on the docs.\" },\n  { question: \"Which Node version is needed?\", answerable: true, answer: \"Node.js 22 or newer [1] docs/install.md › Node\" },\n  { question: \"What are the phone support hours?\", answerable: false, answer: \"Phone support is open 9 to 5 [1] docs/faq.md › Support\" },\n];\n\nfunction score(c: Case): boolean {\n  const idk = /I don't know/.test(c.answer);\n  const cites = [...c.answer.matchAll(/docs\\/([\\w-]+\\.md)/g)].map((m) => m[1]);\n  const cited = cites.length > 0 && cites.every((f) => known.includes(f));\n  return c.answerable ? cited && !idk : idk && cites.length === 0;\n}\n\nlet passed = 0;\nfor (const c of cases) {\n  const ok = score(c);\n  if (ok) passed++;\n  console.log(c.question, \"->\", ok ? \"PASS\" : \"FAIL\");\n}\nconsole.log(`Passed ${passed}/${cases.length}`);",
          "output": "Are unused credits refunded? -> PASS\nWhat is the office address? -> PASS\nWhich Node version is needed? -> FAIL\nWhat are the phone support hours? -> FAIL\nPassed 2/4",
          "explanation": "Run it with node check.ts. Case 1 is answerable, cites billing.md (which is in the known list) and does not say 'I don't know', so it passes. Case 2 is unanswerable and refuses without citing, so it passes. Case 3 fails because it cites docs/install.md, a file that does not exist: an invented source. Case 4 fails because the question is unanswerable yet the answer gives hours and cites a file instead of refusing. In your real checkpoint, read each answer from answers/q1.txt to q6.txt with readFile and keep the known list equal to the real file names in docs/."
        }
      ],
      "productionNote": "This table is the seed of your evaluation set. In topic 18 you will automate it: many questions, a pass rate, and a comparison before and after each change to the skill, the threshold or the chunking. Keep the six questions and their results in your repository so you can see when a change makes grounding better or worse.",
      "commonMistakes": [
        "Grading by feel: reading two answers, deciding 'it seems fine'. Use the script so the result is the same every time.",
        "Testing only answerable questions. You will never see the bot invent an answer, which is its most harmful failure.",
        "Checking that a citation exists in the text but not that the cited file exists in docs/.",
        "Not trusting the project or not setting VOYAGE_API_KEY, so the tool never runs and every answer is a refusal or a guess. Check that search_docs was actually called before blaming the skill."
      ],
      "sources": [
        {
          "title": "Pi docs: CLI, invocation and output",
          "url": "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md#invocation-and-output"
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Why does search_docs embed the user's question with input_type \"query\" while the index was built with \"document\"?",
      "options": [
        "Voyage rejects any request that omits input_type",
        "It marks the text as a search question, so its vector is tuned to land near the passages that answer it",
        "It makes Voyage return a shorter vector so the search is faster",
        "It encrypts the question so it cannot be read in transit"
      ],
      "answerIndex": 1,
      "explanation": "input_type tells Voyage whether the text is a question or a passage, and it prepares each kind for retrieval. Without it the call still works, so the first option is wrong. It does not change the vector length or encrypt anything."
    },
    {
      "question": "In the search_docs result, what belongs in content and what belongs in details?",
      "options": [
        "content holds the numbered text blocks with file, heading and score for the model; details holds structured data for the UI and tests",
        "content holds the structured list for tests; details holds the text the model reads",
        "Both hold the same text, so one of them can be left empty",
        "content holds the API key; details holds the query"
      ],
      "answerIndex": 0,
      "explanation": "The model reads content, so the cited blocks go there. details is structured data that evaluation scripts and UIs can read without parsing prose."
    },
    {
      "question": "Which SKILL.md frontmatter field must be present or the skill is not loaded?",
      "options": [
        "license",
        "metadata",
        "compatibility",
        "description"
      ],
      "answerIndex": 3,
      "explanation": "description is required (max 1024 characters); a skill without one is not loaded. It is also what the model uses to decide when to open the skill. license, metadata and compatibility are optional."
    },
    {
      "question": "When should the doc-answer skill make the agent reply \"I don't know based on the docs.\"?",
      "options": [
        "Whenever the user's question is longer than one sentence",
        "Only when search_docs throws an error",
        "When the top score is below the threshold or no returned chunk actually answers the question",
        "Whenever k is larger than 3"
      ],
      "answerIndex": 2,
      "explanation": "Grounding means answering only from retrieved text. If the best score is weak or the chunks do not contain the answer, refusing is correct. Question length and the value of k have no bearing on whether the docs contain the answer."
    },
    {
      "question": "Why does the checkpoint include unanswerable questions such as the office address?",
      "options": [
        "To make the test set longer",
        "To check that the agent refuses instead of inventing an answer, which answerable questions alone cannot reveal",
        "To test whether Voyage can embed questions about addresses",
        "To confirm the index file loads without errors"
      ],
      "answerIndex": 1,
      "explanation": "A bot that always answers confidently would pass every answerable question. Only questions the docs cannot answer show whether it says \"I don't know\" instead of hallucinating."
    }
  ]
});
