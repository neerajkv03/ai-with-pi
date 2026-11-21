# 02. TypeScript Essentials
Version: Node.js 26.13.1 LTS + TypeScript 7.0.2
Prerequisites: 01-terminal-setup

Scope: only what Pi extensions need. Files live in `~/pi-lab/ts-basics/`. Run with `node file.ts` (type stripping). No enums, namespaces, decorators, parameter properties (Node rejects them).

## Learning goals
- Learner can declare `const`/`let` values with `string`, `number`, `boolean` types.
- Learner can write object types, arrays and type annotations.
- Learner can write named and arrow functions with typed parameters and return types.
- Learner can use union and literal types to limit allowed values.
- Learner can run a `.ts` file with `node` and explain what type stripping does.
- Learner can run `npx tsc --noEmit` and read a type error.

## Sub-topics
### Values, variables & basic types
- Concept: value = piece of data; variable = named box. `const` (cannot reassign) vs `let`. Types `string`, `number`, `boolean`; type inference. `console.log` prints. Template literal `${}`.
- Analogy: variable = labelled jar; `const` jar is glued shut after filling; type = label saying "only sugar".
- Code example: `basics.ts` — `const model: string = "small"; let tokens: number = 120; tokens = tokens + 30; const cached: boolean = false; console.log(\`${model} used ${tokens} tokens, cached=${cached}\`);` → `small used 150 tokens, cached=false`.
- Production use: config values, counters in tools.
- Common mistakes: reassigning `const` (TypeError at runtime: `Assignment to constant variable.`); using `var`.
- Sources: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html ; https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const

### Objects, arrays & type annotations
- Concept: object = group of named fields; `type` alias describes its shape; optional field `?`; array `T[]`; `.length`, `.map`, `.filter`; property access `a.b`.
- Analogy: object type = form template with labelled boxes; optional `?` box = "fill if applicable".
- Code example: `tools.ts` — `type Tool = { name: string; description: string; readOnly?: boolean }; const tools: Tool[] = [{ name: "read", description: "Read a file", readOnly: true }, { name: "write", description: "Write a file" }]; const names = tools.map((t) => t.name); console.log(names, tools.filter((t) => t.readOnly).length);` → `[ 'read', 'write' ] 1`.
- Production use: Pi tool results are objects (`{ content: [...], details: {} }`); knowing shapes is daily work.
- Common mistakes: missing required field → tsc error; accessing optional field without check.
- Sources: https://www.typescriptlang.org/docs/handbook/2/objects.html ; https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map

### Functions & arrow functions
- Concept: function = reusable recipe with inputs (parameters) and output (return). Typed params & return. Arrow `(a) => a * 2`. Default params. Functions as values (callbacks).
- Analogy: function = vending machine: put coins (args) in, get snack (return value); arrow function = same machine, compact model.
- Code example: `cost.ts` — `function costUsd(tokens: number, pricePerMillion: number): number { return (tokens / 1_000_000) * pricePerMillion; } const double = (n: number): number => n * 2; console.log(costUsd(500_000, 3), double(21));` → `1.5 42`.
- Production use: Pi extensions are a default-exported function; tool `execute` is a function.
- Common mistakes: forgetting `return` (returns `undefined`); arrow with braces but no return.
- Sources: https://www.typescriptlang.org/docs/handbook/2/functions.html

### Union & literal types
- Concept: union `A | B` = one of several types; literal type `"info" | "error"` = only exact values; narrowing with `if`/`typeof`/`===`. `null`/`undefined`.
- Analogy: literal union = traffic light: only red, amber, green allowed — "purple" rejected at the factory.
- Code example: `level.ts` — `type Level = "off" | "low" | "high"; function budget(l: Level): number { if (l === "off") return 0; if (l === "low") return 1024; return 8192; } console.log(budget("low"), budget("high"));` → `1024 8192`. Show `budget("max")` → tsc error `Argument of type '"max"' is not assignable to parameter of type 'Level'.`
- Production use: Pi uses literal unions everywhere (`ctx.mode` is `"tui" | "rpc" | "json" | "print"`).
- Common mistakes: comparing to misspelled string; forgetting to handle `undefined`.
- Sources: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types ; https://www.typescriptlang.org/docs/handbook/2/narrowing.html

### Running .ts with Node type stripping
- Concept: Node 26 runs `.ts` directly by deleting type annotations ("erasable syntax") then running JS; no type checking happens. Unsupported: `enum`, runtime `namespace`, parameter properties, `import x =` → `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`. `tsconfig.json` ignored by node. Disable with `--no-strip-types`.
- Analogy: type stripping = removing the sticky notes from a recipe before cooking; cook never reads notes, so a wrong note is not caught.
- Code example: `node basics.ts` → `small used 150 tokens, cached=false`. Demo: `const n: number = "oops"; console.log(n);` runs and prints `oops` under node (no check).
- Production use: Pi itself loads extensions via jiti (also no compile step); scripts for evals run with plain `node`.
- Common mistakes: thinking node checks types; using `enum`.
- Sources: https://nodejs.org/docs/latest-v26.x/api/typescript.html

### Type checking with tsc
- Concept: `tsc` = TypeScript compiler/checker; TS 7 is native (Go), fast; `npm install -D typescript`; `npx tsc --noEmit` checks only. TS 7 defaults strict true. tsconfig recommended by Node docs: `noEmit, target esnext, module nodenext, rewriteRelativeImportExtensions, erasableSyntaxOnly, verbatimModuleSyntax`. `npm init -y` creates package.json.
- Analogy: tsc = proofreader who reads sticky notes and flags mismatches before cooking.
- Code example: `ts-basics/tsconfig.json` with those 6 options + `"include": ["*.ts"]`; `npm init -y`; `npm install -D typescript`; `npx tsc --noEmit` on the "oops" file → `error TS2322: Type 'string' is not assignable to type 'number'.`; fixed → no output.
- Production use: CI runs `tsc --noEmit` on extensions before release.
- Common mistakes: `npx tsc file.ts` with a tsconfig present fails in TS 7 unless `--ignoreConfig`; forgetting `--noEmit` creates .js files.
- Sources: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ ; https://www.typescriptlang.org/tsconfig/

## Quiz
1. `const` vs `let` — tests variables
2. Write a type for `{ name, description, readOnly? }` — tests object types
3. What does `type Level = "off" | "low"` allow? — tests literal unions
4. Does `node file.ts` catch type errors? — tests type stripping
5. Which command only type-checks? — tests tsc --noEmit
