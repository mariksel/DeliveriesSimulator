# I02-E01-001 — Angular 22 and Vite 8 workspace

| Field | Value |
| --- | --- |
| ID | `I02-E01-001` |
| Parent | [I02-E01 — Project foundation](../../../I02-E01-project-foundation-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

## Scope

The application workspace: TypeScript and Angular 22, built directly by Vite 8 through
`@analogjs/vite-plugin-angular`, without the Analog framework or the Angular CLI's default
setup.

### Outcome

- The workspace builds and runs an empty application, using Angular 22.2, Vite 8.3, TypeScript 6.0,
  and `@analogjs/vite-plugin-angular` 2.9.
- The development server and the local build each opened without console errors in Chromium,
  Firefox, and WebKit, on Node 26.13 and on Node 25.0.
- The plugin skips type checking by default, so the build turns it on. A code error and a template
  error each failed the build when tried.
- WebKit stands in for Safari, which does not run on the machine used. Playwright was run from
  outside the repository; it joins the project in I02-E01-003.
- Node:
  [FND-61](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-61--node-and-typescript-versions).

## Acceptance criteria

- The development server and a local build both run an empty application.
- The application opens in a current desktop browser.

## Dependencies

- [I01-E06-002 — Create implementation initiatives](../../../../../../../I01-requirements-and-backlog-creation/Archive/Done/I01-E06-implementation-backlog/Archive/Done/High/I01-E06-002-create-implementation-initiatives.md)

## Sources and evidence

- [Project foundation: FND-3](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-3--technology-stack)
- [Project foundation: FND-12](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-12--custom-vite-build)
- [Project foundation: FND-14](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-14--vite-plugin)
- [Project foundation: FND-16](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-16--angular-version)
- [Project foundation: FND-57](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-57--hosting-and-data)

## Status history

- 2026-11-03 — Created as Proposed, in I01-E06-002. It starts when its dependencies are Done.
- 2026-11-03 — Moved from Proposed to Ready: its dependency, I01-E06-002, is Done.
- 2026-11-03 — Moved from Ready to In Progress: the user started it.
- 2026-11-03 — Moved from In Progress to Done on the user's approval: both acceptance criteria
  are met, as the outcome records. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved in I01-E06-002.
