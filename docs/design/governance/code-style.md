# Code Style

Owns how the code is written. The user chose every rule here in 2026-11, comparing the guides
below ([FND-72](../decisions/project-foundation.md#fnd-72--code-style) and
[FND-73](../decisions/project-foundation.md#fnd-73--immutable-architecture)). It is updated after
each round of choices.

## How to read this page

- **Source:** where a rule comes from: Google's TypeScript guide, Angular's guide (v22), Airbnb's
  JavaScript guide, Microsoft's TypeScript guidelines (written for that compiler's own contributors
  only), or the user's own choice. Where they disagree, the user's choice wins.
- **Checked by:** Prettier, ESLint, Stylelint, dependency-cruiser, a test, or review, where no tool
  can check it.
- **Status:** Applied means the code follows it now. Planned means
  I02-E07
  applies it, or the stage it names.

## Layout

| Rule | Source | Checked by | Status |
| --- | --- | --- | --- |
| 4 spaces. `package.json` and its lock file stay at 2, as npm writes them; Markdown follows governance | User; Microsoft | Prettier | Applied |
| Single quotes | User; Google, Airbnb | Prettier | Applied |
| Semicolons | User; Google | Prettier | Applied |
| Trailing commas everywhere | User | Prettier | Applied |
| Lines under 100 characters, with code styled vertically rather than horizontally. A string, test title, or selector that cannot break sensibly may run over | User | Prettier, ESLint for comments | Applied |
| LF line endings, UTF-8, a final newline, no trailing whitespace | User | `.editorconfig`, `.gitattributes` | Applied |
| Every `if` has braces | User; stricter than all the guides | ESLint | Applied |

## Naming

| Rule | Source | Checked by | Status |
| --- | --- | --- | --- |
| Types, classes, and const objects in PascalCase, with PascalCase keys | User | ESLint | Applied |
| Functions and variables in camelCase; module constants in CONSTANT_CASE; no leading underscores, except unused parameters | User; Google | ESLint | Applied |
| Files in kebab-case | Angular | Review | Applied |
| A file is named for the feature or concept, with no `-module` suffix: `orders.ts`, not `orders-module.ts` | User | Review | Applied |
| Whole words in names, allowing loop indexes and common terms such as `id` | User; Microsoft, Airbnb | Review | Applied |
| Booleans read as questions: `isReady`, `hasDriver` | User; Airbnb | ESLint | Applied |
| Times and distances state their unit: `maxDelayMs`, `distanceMetres` | User | Review | Applied |
| Acronyms as whole words: `JsonValue`, `driverId` | Google | Review | Applied |
| The domain's words are `driver` and `restaurant`, not `courier` and `merchant` ([FND-74](../decisions/project-foundation.md#fnd-74--driver-and-restaurant-vocabulary)) | User | Review | Applied |
| One word per concept: always `driver`, with no synonyms | User | Review | Applied |
| Commands are plain functions with imperative names: `requestDelivery`, `pickUp` | User | Review | Applied |
| Follow-ups are named as requests: `SendHandoff`, `CallOrders` | User | Review | Applied |

## Functions and control flow

| Rule | Source | Checked by | Status |
| --- | --- | --- | --- |
| A top-level function short enough for one line is an arrow function, even when the formatter wraps it; anything longer is a declaration | User | ESLint, partly | Applied |
| Every function states its return type, unless it is a callback typed by where it is passed | User; stricter than Google | ESLint | Applied |
| A state function takes the state first: `pickUp(state, orderId, driverId)` | User | Review | Applied |
| A call's result goes into a local before it is passed as an argument, with no exceptions, in source and tests: `const run = createRun(settings);` then `scheduleScenario(run, start, steps)` | User | ESLint | Applied |
| Never reassign parameters | User; Airbnb | ESLint | Applied |
| No `else` after `return` | User; Airbnb | ESLint | Applied |
| No nested ternaries | User; Airbnb | ESLint | Applied |
| Complexity of at most 10 per function | User | ESLint | Applied |
| No magic numbers, outside tests. -1, 0, 1, and 2 do not count | User | ESLint | Applied |
| `switch` always has a `default`, and handles every case of a const object | User; Google | ESLint | Applied |
| Conditions are explicit: `order !== undefined`, not `order` | User | ESLint | Applied |
| Side effects happen only at the edges: time, randomness, files, storage, the network, and any other outside dependency stay in Infrastructure, and reach the core through abstractions | User | dependency-cruiser, ESLint, a test | Applied |

## Types and modules

| Rule | Source | Checked by | Status |
| --- | --- | --- | --- |
| Fixed sets of values are const objects, not enums or unions of literals | User | ESLint | Applied |
| `interface` for object shapes; `type` for unions and aliases | User; Google | ESLint | Applied |
| Every interface name starts with `I`: `IScenario`, `IRunValues`. Abstract classes keep plain names: `WallClock` | User; against Google and Microsoft | ESLint | Applied |
| Follow-ups are a union of interfaces, `FollowUp`, with no shared base | User | Compiler | Applied |
| The `private` keyword, not `#` | User; Google | ESLint | Applied |
| A class's members in this order: static fields, static methods, fields, getters and setters, the constructor, then methods. Fields, getters, and setters go private, protected, public; methods go public, protected, private; statics follow the same access order. A getter and its setter sit side by side ([FND-72](../decisions/project-foundation.md#fnd-72--code-style)) | User | ESLint | Applied |
| Both `null` and `undefined`, by meaning: `null` for a known absence in a record, `undefined` for not found or not passed | User | Review | Applied |
| Distinct ID types, such as `OrderId` and `DriverId`, as branded strings rather than plain `string` | User | Compiler | Applied |
| A persisted record's type is its application type with a `Persisted` prefix: `IPersistedOrder` ([FND-81](../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions)) | User | Review | Applied |
| A Domain class has readonly parameter properties, a `declare private readonly brand: never` so that no object literal passes for it, a private constructor that freezes the instance, and static constructors: `create(fields)`, taking `FieldsOf<T>` and checking invariants, and `createNew` where making a new one differs from rebuilding one. A method that changes it returns a new instance ([FND-73](../decisions/project-foundation.md#fnd-73--immutable-architecture)) | User | ESLint for private constructors and readonly fields; compiler for the brand; review | Applied |
| Money is whole minor units, in a branded `Money` type ([FND-80](../decisions/project-foundation.md#fnd-80--planning-stage-i03)) | User | Compiler | Planned, from I03 |
| No `as` assertions in source, except in the small functions that create IDs and branded numbers: in the files that hold an ID beside its class or on its own, `version-chain.ts`, each module's `numbers.ts`, and System's `math.ts` ([FND-83](../decisions/project-foundation.md#fnd-83--types-owned-by-their-modules)) | User; Google | ESLint | Applied |
| Domain, Application.Core, and Application work only with strongly typed values, never JSON or JSON-shaped data. Parsing, serializing, and JSON checks belong in Infrastructure, at persistence and other IO ([FND-72](../decisions/project-foundation.md#fnd-72--code-style)) | User | ESLint, for `JSON.parse`, `JSON.stringify`, and JSON imports; review | Applied |
| No primitive types for domain values: a field with a fixed set of values is a const-object type, an identity is a branded ID, and simulated times, durations, counts, and amounts are branded numbers ([FND-72](../decisions/project-foundation.md#fnd-72--code-style)) | User | Compiler, review | Applied: fixed sets and identities in I03-E02-018-P05, and numbers in P06, as the branded types in `src/domain/quantities.ts` |
| In source, a value that must exist goes through `required`, not `!`; tests may use `!` | User's strict lint choice | ESLint | Applied |
| Named exports only, except tool config files that require a default | User; Google | ESLint | Applied |
| Imports use relative paths, with no path aliases | User; Google | Review | Applied |
| The compiler uses `exactOptionalPropertyTypes`, `noUnusedLocals`, `noUnusedParameters`, and `verbatimModuleSyntax`, and keeps `noPropertyAccessFromIndexSignature` | User | Compiler | Applied |
| The compiler also uses `allowUnreachableCode: false` and `noUncheckedSideEffectImports` | User | Compiler | Applied |
| The compiler's target and library are ES2024, the lowest with both `toSorted` and `Object.groupBy` | User | Compiler | Applied |
| Type-only imports are marked `import type` | User | ESLint | Applied |
| One concept per file | User; Angular | Review | Applied |
| No import cycles between files | User | dependency-cruiser | Applied |

## Comments

| Rule | Source | Checked by | Status |
| --- | --- | --- | --- |
| Every exported function, class, type, and constant has a doc comment | User; Google | ESLint | Applied |

## Angular

| Rule | Source | Checked by | Status |
| --- | --- | --- | --- |
| Standalone components only, with no `NgModule`. The code stays modular through its feature folders | User | ESLint | Applied |
| OnPush change detection on every component | User | ESLint | Applied |
| Signals for state: `signal()`, `computed()`, `input()`, `output()` | User | ESLint, review | Applied |
| `inject()`, not constructor injection | User; Angular | ESLint | Applied |
| `protected` for members only the template reads | User; Angular | Review | Applied |
| Angular members first among the fields of their access level, and `readonly`. Statics and the access order come first ([FND-72](../decisions/project-foundation.md#fnd-72--code-style)) | User; Angular | Review | Applied |
| Event handlers named for what they do, not the event | User; Angular | Review | Applied |
| Every control that does something, such as a button, a tab, a link, a slider, or a divider that resizes, has a tooltip saying what it does, with the app's own tooltip directive ([FND-76](../decisions/project-foundation.md#fnd-76--application-shell-and-components)) | User | Review | Applied |
| No logic in components: they present, and Application decides | User; Angular | Review | Applied |
| What a view shows is computed by a tested pure function | User | Review | Applied |
| Built-in control flow only: `@if` and `@for` | User | ESLint | Applied |
| `class` and `style` bindings, not `NgClass` or `NgStyle` | User; Angular | ESLint | Applied |
| Separate template and style files, named the same, once a component is more than a few lines | User; Angular | Review | Applied |
| A component split into several files has its own folder of the same name inside its feature folder, such as `src/ui/workspace/status-bar/`. Its pure-function helpers stay in the feature folder, even when only it uses them | User | Review | Applied |
| Lazy-loaded routes for each top-level section | User | Review | Applied |
| No manual `subscribe` in components | User | ESLint, review | Applied |
| No direct DOM access, except a drawing surface such as the city map | User | ESLint, review | Applied |
| `@for` tracks a real ID, unless a list has no identity | User | Review | Applied |
| Colours and spacing from CSS variables, with no inline styles | User | Stylelint, ESLint | Applied |

## Immutability

The design is in the [layers](../architecture/layers.md#immutability) page. These are its rules.

| Rule | Source | Checked by | Status |
| --- | --- | --- | --- |
| Domain is strictly immutable and pure | User | ESLint | Applied |
| Application.Core is strictly immutable and pure like Domain; its only classes are the abstract classes Infrastructure implements ([FND-82](../decisions/project-foundation.md#fnd-82--application-core-layer)) | User | ESLint | Applied |
| Application does orchestration and coordination, and may hold mutable services. Its data is immutable, except where that would be a considerable performance problem | User | ESLint, review | Applied |
| An exception needs a benchmark that shows the problem, and a comment saying so. There is one, `runDigest` ([results](../modules/simulation-engine.md#performance)) | User | Review | Applied |
| Runs are immutable | User | A test | Applied |
| Not event sourcing: a run's state is held directly, and nothing derives it from events or from the log | User | Review | Applied |
| A record that changes has an unchanging part and a version part: `Order` and `OrderVersion` ([FND-81](../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions)) | User | Review | Applied |
| Persisted records are their own types, and application records are never stored directly ([FND-81](../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions)) | User | Review, tests | Applied |
| No mutation of data: no `push`, in-place `sort`, or field assignment | User | ESLint | Applied |
| `eslint-plugin-functional` checks the immutability rules, using chosen rules rather than its strictest preset: strict for Domain and softer for Application | User | ESLint | Applied |
| Function inputs are read-only types | User | ESLint | Applied |
| No `let` in Domain, apart from proven exceptions | User | ESLint | Applied |
| Tests deep-freeze the state they pass in | User | Tests | Applied |
| Immutable.js for collections, which may be used in every layer, imported in whichever form suits the file | User | Review | Applied |
| `OrderedMap` wherever order matters; a rule never iterates a plain `Map` | User | Review, tests | Applied |
| Records inside collections are plain `readonly` objects | User | Compiler | Applied |
| Work due is a record, worked out from a run's commits and scenario, and the engine turns it into a function call | User | Tests | Applied |
| Functions over classes in Domain. In Application, only abstractions and orchestration services are classes. The user reversed the Domain part on 2026-11-06: every Domain type becomes an immutable class with validating static constructors ([FND-73](../decisions/project-foundation.md#fnd-73--immutable-architecture)) | User | ESLint, review | Applied; Domain part replaced |
| Saved run state carries a schema version, and a test shows that old saved states still load | User | Tests | Planned, from I05 |
| A bug inside a run stops it and shows where, and the last good state remains | User | Tests | Applied |

## Tests

| Rule | Source | Checked by | Status |
| --- | --- | --- | --- |
| Tests are `.spec.ts`, beside the code they test | Angular | Review | Applied |
| Arrange, act, assert, separated by blank lines | User | Review | Applied |
| One behaviour per test | User | Review | Applied |
| No `if` or loops in a test, apart from `it.each`; a helper outside the test body may use them | User | ESLint | Applied |
| Vitest's ESLint rules, such as no focused tests and no test without an assertion | User | ESLint | Applied |
| Coverage of at least 95% of lines, 90% of branches, and 90% of functions | User | `npm run check` | Applied |
| Mutation testing with Stryker, on demand | User | `npm run test:mutation` | Applied |
| Snapshot-equality tests prove that a run stays immutable | User | Tests | Applied |
| A city-scale performance benchmark, on demand: `npm run benchmark` | User | A script | Applied |

## Lint settings

These adjust ESLint's strict rules. The user reviewed and accepted them on 2026-11-05.

- Numbers are allowed in template strings.
- A decorated class may be empty.
- -1, 0, 1, and 2 are not magic numbers.
- A helper in a test file, outside the test body, may use `if` and loops.
- A test may use `forEach` to arrange its data, but not to assert. Assertions over many cases use
  `it.each`, so a failure says which case failed.
- Tests may use `!` and `as`.
- The files that create branded IDs and numbers may use `as`: an ID's file, beside its class or
  on its own, `version-chain.ts`, each module's `numbers.ts`, and System's `math.ts`.
- Application's services may change their own fields.
- `runDigest` may use `let`, as a proven exception.
- `*.testing.ts` files follow the rules for tests, except that they may not use `as`.
- ESLint checks line length only where Prettier cannot wrap, mainly comments. It leaves out lines
  holding a string, a template, a regular expression, or a test title, and lint-disable comments.

## Considered and not adopted

The user looked at these and did not choose them, so the code does what it does today.

- **Layout and size:** function and file length limits, a limit on parameters, a nesting limit, and
  a cognitive complexity limit.
- **Design names:** `decide` and `evolve` as standard function names, and state types named for
  each module.
- **Compiler:** `erasableSyntaxOnly`.
- **Vocabulary:** a glossary file as the source of domain words.
- **Code:** one result shape, whether for all functions or only state functions, a fixed position
  for the time parameter, avoiding `++` and `--`, avoiding pass-through getters, sorted imports, no
  `console` in source, and TODOs that name a work ID.
- **Structure:** no barrel files, and one spelling of English.
- **Angular:** tests that find elements by role first, a signal holding the current snapshot, and
  running the simulation in a Web Worker.
- **Tests:** test data builders.
- **Workflow:** a pre-commit hook, a commit message format, VS Code workspace settings, an unused
  code check, markdownlint, and a spell check.
- **Docs tools:** moving the docs checks and the backlog tool into the repository.
