# Architecture Overview

Owns how the source is structured and which way dependencies point. Layer rules
are in [layers](layers.md).

## Version and status

- **Architecture version:** `A0.6.0`.
- **Status:** Approved for the stack, style, and build, in the
  [project foundation decisions](../decisions/project-foundation.md). The rest is
  [undecided](../governance/open-decisions.md). The workspace, build, composition root, and
  dependency rules are Observed in the source.

## Style and dependency direction

The application is written in TypeScript 6.0 with Angular 22 and Vite 8, on Node 26 or later
([FND-61](../decisions/project-foundation.md#fnd-61--node-and-typescript-versions)).
It follows clean architecture style and principles, with a framework-free core
([FND-11](../decisions/project-foundation.md#fnd-11--clean-architecture-with-a-framework-free-core)).
Dependencies point inward: UI and Infrastructure depend on the core, and the core does not
depend on them. [Layers](layers.md) describes the five layers.

## Runtime composition

No backend or server database has been named, and data lives in
[IndexedDB](../data/persistence.md). Vite runs the Angular build directly
([FND-12](../decisions/project-foundation.md#fnd-12--custom-vite-build)), using
`@analogjs/vite-plugin-angular`
([FND-14](../decisions/project-foundation.md#fnd-14--vite-plugin)). At startup, a
[composition root](layers.md#composition-root) binds Application's abstractions to their
Infrastructure implementations.

`src/composition/main.ts` starts the application. `npm run dev` runs the development server,
`npm run build` makes a local build, and `npm run preview` serves it. `npm run check` runs every
check and test
([FND-63](../decisions/project-foundation.md#fnd-63--tests-and-public-safety-check)).
`npm run format` formats the code, and
`npm run test:mutation` runs mutation testing
([FND-71](../decisions/project-foundation.md#fnd-71--code-style-and-quality-tools)).
`npm run scenario -- <file>` runs a scenario headless. A new machine first needs
`npx playwright install` for the browsers. The plugin skips type
checking by default, so `vite.config.ts` turns it on: a type error in code or a template fails
the build.

## Source map

This is the approved layout
([FND-13](../decisions/project-foundation.md#fnd-13--layers-and-source-layout)), with module
folders inside each layer:

| Path | Responsibility |
|---|---|
| `src/domain/` | Domain layer |
| `src/domain/system/` | What every module in the core shares, in [System](../modules/system.md)'s submodules: time, randomness, math, the checks for a bug, the fields a Domain class is made from, how a record is written out for a digest, a record's version chain, and how far an inbox has read. The Domain and Infrastructure roots hold module folders only, and the architecture check keeps them so ([FND-85](../decisions/project-foundation.md#fnd-85--system-submodules)) |
| `src/application-core/` | Application.Core layer |
| `src/application/` | Application layer |
| `src/infrastructure/` | Infrastructure layer |
| `src/ui/` | UI layer |
| `src/composition/` | Composition root, outside the five layers |
| `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json` | Entry page and build |
| `.dependency-cruiser.cjs`, `tsconfig.core.json` | [Architecture check](layers.md#checking-the-rules) |
| `vitest.config.ts`, `playwright.config.ts`, `tsconfig.spec.json` | Test tools |
| `stryker.config.json`, `vitest.stryker.config.ts` | Mutation testing |
| `.editorconfig`, `.gitattributes`, `.prettierrc.json`, `.prettierignore`, `eslint.config.mjs`, `.stylelintrc.json` | Code style |
| `*.spec.ts`, beside the code they test | Unit and component tests |
| `*.testing.ts`, beside the code they stand in for | Helpers for those tests |
| `e2e/` | End-to-end tests, and scenario files they share with other tests |
| `scripts/` | Project tools: the public-safety check, the headless scenario runner, the city-scale benchmark, the self-tests, and a test that the core stays free of outside randomness |

## Operational architecture constraints

- The simulator is self-contained
  ([FND-1](../decisions/project-foundation.md#fnd-1--purpose-and-boundary)).
- Data lives in browser storage, which stays on one machine
  ([FND-4](../decisions/project-foundation.md#fnd-4--data-in-browser-storage)).
- Tests use Vitest, with jsdom for components, and Playwright end to end
  ([FND-17](../decisions/project-foundation.md#fnd-17--test-tools)).
- It runs locally for now and supports current desktop browsers
  ([FND-57](../decisions/project-foundation.md#fnd-57--hosting-and-data)). A hosted deployment is
  [undecided](../governance/open-decisions.md).

## Architecture decisions and evolution

- [Project foundation decisions](../decisions/project-foundation.md)
- No approved structural changes are waiting to be implemented.
