# I02-E01-003 — Test tools and public-safety check

| Field | Value |
| --- | --- |
| ID | `I02-E01-003` |
| Parent | [I02-E01 — Project foundation](../../../I02-E01-project-foundation-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-03 |
| Last updated | 2026-11-04 |
| Completed | 2026-11-04 |

## Scope

Vitest for the core and for components, Playwright for end-to-end browser tests, one command
that runs every check, and a check that private identity stays out of the repository, without
recording any private term in it.

### Outcome

- `npm run check` runs both checks, a type check, the unit and component tests, and the end-to-end
  tests in Chromium, Firefox, and WebKit.
- It failed at the right step on each of eight changes made in turn: a planted email address, a
  planted home folder path, a wrong-way dependency, a type error, a template error, a wrong clock,
  a removed binding, and a changed heading. The end-to-end tests also failed on the changed
  heading when run alone. Clean source then passed.
- The composition root's binding now has a permanent test, as I02-E01-002 expected.
- The check keeps no list of private terms, by the user's decision, so none is stored. It finds
  patterns only: a planted email address is caught, but the real service's name would not be.
- jsdom was added for component tests, because `@analogjs/vitest-angular` tests run without a
  browser.
- Decisions:
  [FND-63](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-63--tests-and-public-safety-check).

## Acceptance criteria

- One command runs the unit, component, and end-to-end tests and both checks.
- The public-safety check fails on a planted private term, and that term is not stored in the
  repository.

## Dependencies

- [I02-E01-002 — Layers, composition root, and architecture checks](I02-E01-002-layers-composition-root-and-architecture-checks.md)

## Sources and evidence

- [Project foundation: FND-17](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-17--test-tools)
- [Project foundation: FND-23](../../../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-23--safe-to-publish)
- [Project foundation: FND-60](../../../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-60--implementation-stages)

## Status history

- 2026-11-03 — Created as Proposed, in I01-E06-002. It starts when its dependencies are Done.
- 2026-11-03 — Moved from Proposed to Ready: its dependency, I02-E01-002, is Done.
- 2026-11-03 — Moved from Ready to In Progress: the user started it.
- 2026-11-04 — Moved from In Progress to Done on the user's approval: every acceptance criterion
  is met, as the outcome records. Archived under `Archive/Done/High/`; its epic is archived with
  it.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved in I01-E06-002.
