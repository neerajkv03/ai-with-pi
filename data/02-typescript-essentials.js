window.TOPICS = window.TOPICS || [];
window.TOPICS.push({
  "id": "02-typescript-essentials",
  "order": 2,
  "title": "TypeScript Essentials",
  "version": "Pi 1.6.0 + Node.js 26.13.1 LTS + TypeScript 7.0.2 + MCP SDK 1.32.2 + server-filesystem 2.4.0 + Voyage voyage-4",
  "summary": "TypeScript is JavaScript with optional labels (types) that describe what kind of data each value is. Pi extensions are written in it, so you learn only the parts you will use: variables, objects, arrays, functions and union types. You then run .ts files with Node.js, and check the labels with the TypeScript checker, tsc.",
  "prerequisites": [
    "01-terminal-setup"
  ],
  "subtopics": [
    {
      "id": "values-variables-basic-types",
      "title": "Values, variables & basic types",
      "explanation": "A value is a piece of data, such as the text \"small\", the number 120, or the answer true. A variable is a name attached to a value so you can use it later. You create one with a keyword: `const` makes a variable that can never be pointed at a different value, and `let` makes one you may change. Use `const` by default and `let` only when the value really changes.\n\nA type says what kind of value a variable holds. The three basic types are `string` (text, written in quotes), `number` (any number, whole or decimal) and `boolean` (only `true` or `false`). You write a type after the name with a colon: `let tokens: number = 120;`. This is called a type annotation, a label you attach for the reader and for the checker (the tool that compares labels with values; `tsc`, sub-topic 6). If you leave the annotation out and give a value straight away, TypeScript works out the type itself. That is called type inference: `const model = \"small\"` is already known to be a string.\n\nA template literal is text written between backticks (the ` character) that can contain `${...}` holes. Whatever expression is inside the hole is turned into text and placed in the string. `console.log(...)` prints its arguments to the terminal, and it is the way every example in this topic shows its result.\n\nSetup, the first time. Open your terminal (Git Bash or PowerShell from the terminal-setup topic) and run the commands in the first block below to create and enter the practice folder `~/pi-lab/ts-basics/` (`~` means your home folder). Then create a file called `basics.ts` in that folder with any text editor, for example VS Code or Notepad. Make sure the name really ends in `.ts` and not `.ts.txt`. Paste the code, save, and run it with `node basics.ts`. How Node can run a TypeScript file is explained in the fifth sub-topic; for now just trust that it works.",
      "analogy": "A variable is a labelled jar. The label on the jar is its name, and the contents are the value. A `const` jar is glued shut after you fill it, while a `let` jar can be emptied and refilled. The type is a second sticker on the jar saying \"only sugar\", so nobody pours salt into it.",
      "code": [
        {
          "language": "bash",
          "filename": "terminal.sh",
          "source": "mkdir ~/pi-lab/ts-basics\ncd ~/pi-lab/ts-basics\nnode --version",
          "output": "v26.13.1",
          "explanation": "mkdir makes the folder, cd moves into it, and node --version confirms Node.js is installed. Your number should start with v26 (or at least be a recent Node release); if the command is not found, revisit the terminal-setup topic."
        },
        {
          "language": "typescript",
          "filename": "basics.ts",
          "source": "const model: string = \"small\";\nlet tokens: number = 120;\ntokens = tokens + 30;\nconst cached: boolean = false;\nconsole.log(`${model} used ${tokens} tokens, cached=${cached}`);",
          "output": "small used 150 tokens, cached=false",
          "explanation": "model and cached are const because they never change. tokens is let, so line 3 may give it a new value (120 + 30 = 150). The template literal on the last line fills the three holes with the current values of model, tokens and cached."
        }
      ],
      "productionNote": "In Pi tools you will keep configuration values (a model name, a limit) in `const` variables and counters (tokens used, retries so far) in `let` variables. Preferring `const` makes it obvious to the next reader which values can never change.",
      "commonMistakes": [
        "Reassigning a `const`, for example `const limit = 5; limit = 6;`. Running it fails with a TypeError (an error JavaScript raises when a value is used in a way that is not allowed) with the message `Assignment to constant variable.` Use `let` if the value must change.",
        "Using `var`, an older keyword for variables that behaves in surprising ways. Always write `const` or `let` instead.",
        "Saving the file as `basics.ts.txt` because the editor hid the real extension, so `node basics.ts` says the file does not exist."
      ],
      "sources": [
        {
          "title": "TypeScript Handbook: Everyday Types",
          "url": "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html"
        },
        {
          "title": "MDN: const",
          "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const"
        }
      ]
    },
    {
      "id": "objects-arrays-type-annotations",
      "title": "Objects, arrays & type annotations",
      "explanation": "An object groups several named pieces of data, called fields, in curly braces: `{ name: \"read\", description: \"Read a file\" }`. You read a field with a dot, so `tool.name` gives \"read\". Pi tools, tool results and settings are all objects, so you will read and write them constantly.\n\nA `type` alias gives a name to a type so you can reuse it. `type Tool = { name: string; description: string }` says: a Tool is an object with a text field `name` and a text field `description`. Putting a question mark after a field name, as in `readOnly?: boolean`, makes that field optional: it may be present or missing.\n\nAn array is an ordered list of values written in square brackets: `[1, 2, 3]`. The type `Tool[]` means \"an array whose items are all Tools\". An array has `.length` (how many items it holds) and two methods (a method is a function that belongs to a value and is called with a dot). `.map(f)` builds a new array by applying `f` to every item, and `.filter(f)` builds a new array holding only the items for which `f` gives true.\n\nThe `f` you pass is a small function. In `(t) => t.name`, read the arrow as \"given t, give back t.name\". Functions get a full explanation in the next sub-topic. Create `tools.ts` in the same folder and run `node tools.ts`.",
      "analogy": "An object type is a paper form template with labelled boxes: Name, Description, Read-only. A box marked \"fill if applicable\" is an optional field. An array is a stack of filled-in forms, and `.map` is a clerk who copies one box (the name) from every form onto a new list, while `.filter` pulls out only the forms that tick the read-only box.",
      "code": [
        {
          "language": "typescript",
          "filename": "tools.ts",
          "source": "type Tool = { name: string; description: string; readOnly?: boolean };\n\nconst tools: Tool[] = [\n  { name: \"read\", description: \"Read a file\", readOnly: true },\n  { name: \"write\", description: \"Write a file\" },\n];\n\nconst names = tools.map((t) => t.name);\nconsole.log(names, tools.filter((t) => t.readOnly).length);",
          "output": "[ 'read', 'write' ] 1",
          "explanation": "The map call collects the name of each tool into a new array of text. The filter call keeps only tools whose readOnly is true; the write tool has no readOnly field, so it counts as not true and is dropped, leaving 1 item. console.log prints an array in the style [ 'read', 'write' ], with single quotes around text."
        }
      ],
      "productionNote": "A Pi tool returns an object such as `{ content: [...], details: {} }`, and an extension registers a tool by passing an object with name, description and more. Being able to read an object type tells you exactly what Pi expects from you.",
      "commonMistakes": [
        "Leaving out a required field. If the write tool above had no `description`, the type checker tsc (introduced in the last two sub-topics) reports an error, because Tool requires it.",
        "Using an optional field as if it were always there. `readOnly` may be missing, so code must allow for that (the union sub-topic shows how).",
        "Mixing up `.map` and `.filter`: map always returns an array of the same length, filter returns an array that may be shorter."
      ],
      "sources": [
        {
          "title": "TypeScript Handbook: Object Types",
          "url": "https://www.typescriptlang.org/docs/handbook/2/objects.html"
        },
        {
          "title": "MDN: Array.prototype.map()",
          "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map"
        }
      ]
    },
    {
      "id": "functions-arrow-functions",
      "title": "Functions & arrow functions",
      "explanation": "A function is a reusable recipe. It takes inputs, called parameters, does some work, and hands back an output with the `return` keyword. You define it once and call it as many times as you like by writing its name followed by values in parentheses, called arguments.\n\nIn TypeScript you label each parameter with a type and put the return type after the parentheses: `function costUsd(tokens: number, pricePerMillion: number): number { ... }` takes two numbers and gives back a number. The checker then refuses a call such as `costUsd(\"lots\", 3)`.\n\nAn arrow function is a shorter way to write a function as a value: `const double = (n: number): number => n * 2;`. When the body is a single expression without braces, its result is returned automatically. A function is a value like any other, so you can pass it to another function, which is exactly what you did with `.map((t) => t.name)`. A function that is handed to another function to be called later is called a callback.\n\nA parameter may have a default: `function greet(name: string = \"world\")` uses \"world\" when no argument is given. In the number `1_000_000`, the underscores are just visual separators; it is one million. Create `cost.ts` and run it with `node cost.ts`.",
      "analogy": "A function is a vending machine: you put in coins (arguments), press a button, and a snack (the return value) drops out. The labels on the coin slot and the tray are the parameter and return types. An arrow function is the same machine in a compact, wall-mounted model: it does the same job with less casing.",
      "code": [
        {
          "language": "typescript",
          "filename": "cost.ts",
          "source": "function costUsd(tokens: number, pricePerMillion: number): number {\n  return (tokens / 1_000_000) * pricePerMillion;\n}\n\nconst double = (n: number): number => n * 2;\n\nconsole.log(costUsd(500_000, 3), double(21));",
          "output": "1.5 42",
          "explanation": "costUsd(500_000, 3) computes 500000 / 1000000 = 0.5, then 0.5 * 3 = 1.5. double(21) returns 21 * 2 = 42. console.log prints the two results separated by a space."
        }
      ],
      "productionNote": "A Pi extension is a file whose main exported value (a default export, explained in topic 03) is a function that Pi calls once at load time, and every tool you register has an `execute` function that Pi calls whenever the model uses the tool. Writing typed functions is the core skill of extension work.",
      "commonMistakes": [
        "Forgetting `return` in a function with braces. The function then returns `undefined` (JavaScript's value meaning \"nothing\"), and the checker complains if you promised a `number`.",
        "Writing an arrow function with braces but no `return`: `(n) => { n * 2 }` does the multiplication and throws the result away. Either drop the braces (`(n) => n * 2`) or add `return`.",
        "Passing arguments in the wrong order, such as `costUsd(3, 500_000)`. Both are numbers, so no type error appears; the answer is simply wrong."
      ],
      "sources": [
        {
          "title": "TypeScript Handbook: More on Functions",
          "url": "https://www.typescriptlang.org/docs/handbook/2/functions.html"
        }
      ]
    },
    {
      "id": "union-literal-types",
      "title": "Union & literal types",
      "explanation": "A union type, written `A | B`, means \"a value of type A or a value of type B\". For example `string | number` accepts text or a number. A literal type is a type made of one exact value, so `\"info\"` as a type only allows that exact text. Combining them gives a small fixed menu: `type Level = \"off\" | \"low\" | \"high\"` allows exactly those three strings and nothing else.\n\nTwo special values appear in unions all the time. `undefined` means \"no value was given\" and `null` means \"deliberately empty\". A type like `string | undefined` says the value might be missing.\n\nNarrowing is how code deals with a union. Inside an `if`, TypeScript tracks what you have checked and treats the variable as the narrower type. `typeof value === \"string\"` asks whether a value is text (`typeof` gives the kind of a value as text, and `===` means \"is exactly equal to\"). After that check, you may use text-only methods such as `toUpperCase()`, which returns the text in capital letters. For numbers, `toFixed(1)` returns the number as text with one digit after the decimal point.\n\nSave the first example as `level.ts` and the second as `show.ts`, then run each with `node`. Both run fine. The type checker `tsc`, which you meet in the last two sub-topics, would reject a call like `budget(\"max\")`, because \"max\" is not one of the three allowed strings. Its message reads: `Argument of type '\"max\"' is not assignable to parameter of type 'Level'.` (tsc prints the file name and position first.)",
      "analogy": "A literal union is a traffic light: only red, amber and green are allowed, and \"purple\" is rejected at the factory before any light is built. A plain union such as `string | number` is a parcel slot that accepts either an envelope or a box, and narrowing is the clerk who opens the slot, looks at what arrived, and then handles envelopes and boxes differently.",
      "code": [
        {
          "language": "typescript",
          "filename": "level.ts",
          "source": "type Level = \"off\" | \"low\" | \"high\";\n\nfunction budget(l: Level): number {\n  if (l === \"off\") return 0;\n  if (l === \"low\") return 1024;\n  return 8192;\n}\n\nconsole.log(budget(\"low\"), budget(\"high\"));",
          "output": "1024 8192",
          "explanation": "budget accepts only the three Level strings. \"low\" matches the second if and returns 1024. \"high\" matches neither if, so execution reaches the last line and returns 8192. Adding budget(\"max\") would be flagged by tsc but Node itself would not stop it, as the next sub-topic explains."
        },
        {
          "language": "typescript",
          "filename": "show.ts",
          "source": "function show(value: string | number | undefined): string {\n  if (value === undefined) return \"none\";\n  if (typeof value === \"string\") return value.toUpperCase();\n  return value.toFixed(1);\n}\n\nconsole.log(show(\"hi\"), show(2), show(undefined));",
          "output": "HI 2.0 none",
          "explanation": "After the first if, undefined is ruled out. After the second, value can only be a number, so toFixed is safe to call. show(\"hi\") gives HI, show(2) gives 2.0 and show(undefined) gives none."
        }
      ],
      "productionNote": "Pi's own types use literal unions everywhere. For example, the context object `ctx` that an extension receives (topic 08) has a `mode` field whose value is one of `\"tui\" | \"rpc\" | \"json\" | \"print\"`, the way Pi is running (`tui` is the full-screen screen). Checking it with `===` is how an extension behaves differently in each mode.",
      "commonMistakes": [
        "Comparing against a misspelled string, such as `l === \"hgih\"`. When the variable has a literal union type, the checker flags a comparison that can never be true.",
        "Forgetting to handle `undefined` for optional values, then calling a method on it, which crashes at run time with a TypeError.",
        "Using a plain `string` type where only a few values make sense. A literal union catches typos before the program runs."
      ],
      "sources": [
        {
          "title": "TypeScript Handbook: Everyday Types (Union Types)",
          "url": "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types"
        },
        {
          "title": "TypeScript Handbook: Narrowing",
          "url": "https://www.typescriptlang.org/docs/handbook/2/narrowing.html"
        }
      ]
    },
    {
      "id": "running-ts-with-node-type-stripping",
      "title": "Running .ts with Node type stripping",
      "explanation": "Node.js 26 can run a `.ts` file directly: `node basics.ts`. It does this by type stripping: Node deletes (blanks out) every type annotation and then runs the remaining plain JavaScript. There is no separate compile step and no output file.\n\nThe important consequence is that Node does not check types. A wrong label is simply erased, never compared against the value. Type checking is a separate job, covered in the next sub-topic.\n\nOnly erasable syntax works, meaning syntax that can be removed and leave valid JavaScript behind. A few TypeScript features do not just add labels, they generate code, so Node rejects them with the error code `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`. These are `enum` (a named list of constants), runtime `namespace`, and parameter properties (a shortcut for class fields you can ignore for now), plus `import x = require(...)` (an old import style). Use a union of literals instead of an `enum`.\n\nNode also ignores `tsconfig.json`. Type stripping is on by default in Node 26, and `--no-strip-types` turns it off. Try the demo below: create `oops.ts` and `enum.ts` in `~/pi-lab/ts-basics/` and run each with `node`. Delete `enum.ts` afterwards, because the checker setup in the next sub-topic scans every `.ts` file in the folder.",
      "analogy": "Type stripping is removing the sticky notes from a recipe before cooking. The cook only follows the written steps and never reads the notes, so a wrong note (\"this is flour\" on a bag of salt) is not caught. A checker has to read the notes separately. Unsupported features are steps written on the sticky notes themselves, so you cannot peel them off without losing part of the recipe.",
      "code": [
        {
          "language": "bash",
          "filename": "terminal.sh",
          "source": "node basics.ts",
          "output": "small used 150 tokens, cached=false",
          "explanation": "Node strips the annotations from basics.ts and runs the JavaScript left over. The output is the same as before: no compile step was needed."
        },
        {
          "language": "typescript",
          "filename": "oops.ts",
          "source": "const n: number = \"oops\";\nconsole.log(n);",
          "output": "oops",
          "explanation": "The label says number, but the value is text. Node erases the label, so the program runs happily and prints oops. Nothing warned you; only a type checker would."
        },
        {
          "language": "typescript",
          "filename": "enum.ts",
          "source": "enum Color {\n  Red,\n  Green,\n}\n\nconsole.log(Color.Green);",
          "output": "...ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX (the exact message text varies)",
          "explanation": "Node stops with an error that ends with the code ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX, because an enum needs real code generated and cannot just be erased. Delete this file after trying it."
        }
      ],
      "productionNote": "Pi itself loads extensions through a library called jiti (a loader that runs TypeScript; topic 08), and small scripts such as evaluation runners (topic 18) can be run with plain `node`. Neither checks types, so you must run a checker yourself before shipping.",
      "commonMistakes": [
        "Believing `node file.ts` catches type errors. It does not; it only strips them.",
        "Using `enum`, `namespace` or parameter properties and getting ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX. Replace them with literal unions, plain objects and ordinary fields.",
        "Expecting `tsconfig.json` settings to change how `node` runs a file. Node ignores that file."
      ],
      "sources": [
        {
          "title": "Node.js: Modules: TypeScript",
          "url": "https://nodejs.org/docs/latest-v26.x/api/typescript.html"
        }
      ]
    },
    {
      "id": "type-checking-with-tsc",
      "title": "Type checking with tsc",
      "explanation": "`tsc` is the TypeScript compiler, and here you use it only as a checker. It reads the labels and tells you where they disagree with the values. TypeScript 7 is a rewrite in Go, so it is much faster than earlier versions. In TypeScript 7 the `strict` setting (a group of the most thorough checks) is on by default.\n\nSetup, step by step. In your terminal run the commands in the first block below, inside `~/pi-lab/ts-basics/`. `npm init -y` (npm is the package manager that came with Node) creates `package.json`, a small file describing a project. `npm install -D typescript` downloads TypeScript into a `node_modules` folder and records it in `package.json` as a development-only tool (`-D`).\n\nNext create `tsconfig.json` in the same folder, shown in the second block. This is the checker's settings file. `noEmit` means check but write no files. `target` and `module` set the JavaScript flavour (`esnext` is the newest, `nodenext` matches how Node loads files). `rewriteRelativeImportExtensions` and `verbatimModuleSyntax` keep imports compatible with Node. `erasableSyntaxOnly` makes tsc flag the same enum-like features that Node rejects, so the checker and Node agree. `include` lists which files to check. These are the settings the Node documentation recommends.\n\nFinally run `npx tsc --noEmit` (`npx` runs a tool installed in the project). With `oops.ts` from the last sub-topic it reports the mismatch; after you fix the value or the label, it prints nothing, and no output means no errors. Run the check on the folder as a whole, with no file name.",
      "analogy": "tsc is a proofreader who reads the sticky notes and flags mismatches before anyone cooks. If a note says \"flour\" and the bag says salt, the proofreader writes a complaint. Node, the cook, never reads the notes, so the proofreader has to be called as a separate step.",
      "code": [
        {
          "language": "bash",
          "filename": "terminal.sh",
          "source": "cd ~/pi-lab/ts-basics\nnpm init -y\nnpm install -D typescript",
          "output": "",
          "explanation": "npm init -y writes package.json with default answers. npm install -D typescript adds TypeScript to node_modules and package.json. Both print a short summary that varies, so it is not shown here."
        },
        {
          "language": "json",
          "filename": "tsconfig.json",
          "source": "{\n  \"compilerOptions\": {\n    \"noEmit\": true,\n    \"target\": \"esnext\",\n    \"module\": \"nodenext\",\n    \"rewriteRelativeImportExtensions\": true,\n    \"erasableSyntaxOnly\": true,\n    \"verbatimModuleSyntax\": true\n  },\n  \"include\": [\"*.ts\"]\n}",
          "output": "",
          "explanation": "Save this as tsconfig.json next to your .ts files. It prints nothing by itself; tsc reads it whenever you run it in this folder."
        },
        {
          "language": "bash",
          "filename": "terminal.sh",
          "source": "npx tsc --noEmit",
          "output": "error TS2322: Type 'string' is not assignable to type 'number'.",
          "explanation": "tsc found the mismatch in oops.ts (a string \"oops\" given to a variable labelled number). The real output starts with the file name and line position, and the layout can vary. Fix oops.ts by changing the label to string, run again, and tsc prints nothing: the check passed."
        }
      ],
      "productionNote": "Because Node does not check types, teams run `tsc --noEmit` as a separate step, usually in continuous integration (CI, an automatic job that runs on every code change), before releasing an extension.",
      "commonMistakes": [
        "Running `npx tsc file.ts` while a `tsconfig.json` exists. In TypeScript 7 this fails unless you add `--ignoreConfig`. Run plain `npx tsc --noEmit` instead.",
        "Removing `noEmit` from tsconfig.json. Without it tsc writes `.js` files next to your sources and clutters the folder.",
        "Leaving `enum.ts` from the last sub-topic in the folder. Because `erasableSyntaxOnly` is on and `include` matches every `.ts` file, tsc reports an error for it."
      ],
      "sources": [
        {
          "title": "Announcing TypeScript 7.0",
          "url": "https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/"
        },
        {
          "title": "TypeScript: TSConfig Reference",
          "url": "https://www.typescriptlang.org/tsconfig/"
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "What is the difference between `const` and `let`?",
      "options": [
        "`const` is for numbers and `let` is for text",
        "`const` variables are faster than `let` variables",
        "A `const` variable cannot be reassigned after it is set, while a `let` variable can",
        "`let` variables cannot be printed with console.log"
      ],
      "answerIndex": 2,
      "explanation": "`const` fixes which value the name points to; trying to reassign it fails. `let` allows reassignment. Neither is tied to a particular type or to speed."
    },
    {
      "question": "Which line correctly declares a type for an object with a required text `name`, a required text `description` and an optional true/false `readOnly`?",
      "options": [
        "type Tool = { name: string; description: string; readOnly?: boolean }",
        "type Tool = string | number",
        "let Tool: { name = \"read\" }",
        "type Tool = readOnly?"
      ],
      "answerIndex": 0,
      "explanation": "An object type lists each field with its type, and the question mark makes `readOnly` optional. The other lines are a union of two basic types, an invalid declaration, and incomplete syntax."
    },
    {
      "question": "What values does `type Level = \"off\" | \"low\"` allow?",
      "options": [
        "Any text at all",
        "Any number",
        "Both the text \"off\" and the number 0",
        "Only the exact text \"off\" or the exact text \"low\""
      ],
      "answerIndex": 3,
      "explanation": "Each part of the union is a literal type that allows exactly one value, so only those two strings are accepted."
    },
    {
      "question": "A file contains `const n: number = \"oops\";`. What happens when you run `node file.ts`?",
      "options": [
        "It stops with a type error before running",
        "It runs and prints oops, because Node strips the types without checking them",
        "It prints 0, because the string is converted to a number",
        "It creates a file.js containing the compiled result"
      ],
      "answerIndex": 1,
      "explanation": "Node strips the type label without comparing it to the value, so the program runs and prints oops. Stopping with a type error is what a type checker such as tsc does, not node."
    },
    {
      "question": "Which command checks types in a project without writing any output files?",
      "options": [
        "node --check file.ts",
        "npm init -y",
        "npx tsc --noEmit",
        "node --no-strip-types file.ts"
      ],
      "answerIndex": 2,
      "explanation": "`npx tsc --noEmit` runs the TypeScript checker and writes nothing. `npm init -y` only creates package.json, and `node` does not check types, with or without type stripping. `node --check` only checks the syntax (grammar), not the types, so it is not a type check."
    }
  ]
});
