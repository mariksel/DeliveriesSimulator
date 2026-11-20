# I02-E01-002 — Layers, composition root, and architecture checks

| Field | Value |
| --- | --- |
| ID | `I02-E01-002` |
| Parent | [I02-E01 — Project foundation](../../../I02-E01-project-foundation-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

## Scope

The Domain, Application, Infrastructure, and UI folders, the composition root, and an automated
check of the dependency rules. Module folders are added when a module has code there.

### Outcome

- `src/` has one folder per layer, plus `src/composition/`. Git needs `src/domain/.gitkeep` to keep
  the empty Domain folder.
- The composition root binds `WallClock` to `BrowserWallClock`. A temporary component injected it
  and read the clock in the development server and the local build; it was then removed. A
  permanent test belongs with the test tools, in I02-E01-003.
- `npm run check:architecture` passes on the source, and failed on each of 11 violations planted
  in turn: six wrong-way dependencies, three Angular imports in the core (one of them type-only),
  and two browser APIs in the core.
- The check covers layers, not modules: the module graph in FND-56 is not checked yet.
- Decisions:
  [FND-62](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-62--dependency-injection-and-architecture-check).

## Acceptance criteria

- The source has one top-level folder per layer.
- The composition root binds an Application abstraction to its Infrastructure implementation
  through Angular's dependency injection.
- The check fails when a dependency points the wrong way, or when the core imports Angular.

## Dependencies

- [I02-E01-001 — Angular 22 and Vite 8 workspace](I02-E01-001-angular-22-and-vite-8-workspace.md)

## Sources and evidence

- [Project foundation: FND-11](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-11--clean-architecture-with-a-framework-free-core)
- [Project foundation: FND-13](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-13--layers-and-source-layout)
- [Project foundation: FND-18](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-18--use-of-domain-by-outer-layers)
- [Project foundation: FND-19](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-19--composition-root-and-dependency-inversion)
- [Project foundation: FND-20](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-20--module-placement-in-layers)
- [Project foundation: FND-21](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-21--validation)
- [Project foundation: FND-22](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-22--error-reporting)
- [Layers](../../../../../../../../../../../design/architecture/layers.md)

## Status history

- 2026-11-03 — Created as Proposed, in I01-E06-002. It starts when its dependencies are Done.
- 2026-11-03 — Moved from Proposed to Ready: its dependency, I02-E01-001, is Done.
- 2026-11-03 — Moved from Ready to In Progress: the user started it.
- 2026-11-03 — Moved from In Progress to Done on the user's approval: every acceptance criterion
  is met, as the outcome records. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved in I01-E06-002.
