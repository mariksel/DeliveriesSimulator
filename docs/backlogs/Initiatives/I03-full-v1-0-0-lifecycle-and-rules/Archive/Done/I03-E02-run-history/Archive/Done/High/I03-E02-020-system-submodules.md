# I03-E02-020 — System submodules

| Field | Value |
| --- | --- |
| ID | `I03-E02-020` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-07 |
| Last updated | 2026-11-07 |
| Completed | 2026-11-07 |

## Scope

The shared helpers at the root of `src/domain`, such as `FieldsOf` and `unreachable`, move into
the System module, each into the submodule it belongs to, and System's own files move into
submodules too. In the user's words: "helper types like fieldsof, unreachable, should [not] be
in the domain root, instea they should be in the sustem moduel in their respective submodues"
([FND-85](../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-85--system-submodules)).

System gets eight submodules, each a folder in `src/domain/system/`: `time`, `randomness`,
`math`, `validation`, `classes`, `digests`, `records`, and `messaging`. Infrastructure's shared
files move the same way, into `src/infrastructure/system/`: `json`, `records`, `messaging`, and
`functions`. The roots of Application.Core, Application, and UI hold no shared files.

## Acceptance criteria

- `src/domain` and `src/infrastructure` hold module folders only, and the architecture check
  refuses a file added at either root.
- Each System file sits in its submodule, as FND-85 lists them.
- Behaviour does not change: the pinned digests and the city day's digest hold.
- System's page, the module map, the architecture overview, and the code style name the new
  places.

## Dependencies

- [I03-E02-019 — Types owned by their modules](I03-E02-019-types-owned-by-their-modules.md)

## Sources and evidence

- [Project foundation: FND-85](../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-85--system-submodules)
- [Project foundation: FND-83](../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-83--types-owned-by-their-modules)
- [System](../../../../../../../../../design/modules/system.md)

## Internal phases

The user approved the plan below on 2026-11-07.

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E02-020-P01` | System's own files into time, randomness, and math | Done | 2026-11-07 | Approved; Implemented |
| `I03-E02-020-P02` | The helpers into validation, classes, and digests | Done | 2026-11-07 | Approved; Implemented |
| `I03-E02-020-P03` | The version chain and the inbox position into records and messaging | Done | 2026-11-07 | Approved; Implemented |
| `I03-E02-020-P04` | Infrastructure's shared files into its System submodules | Done | 2026-11-07 | Approved; Implemented |

### Plan

Each phase moves files and updates every import, keeps each spec beside the code it tests, and
updates the pages that name the moved files. After each phase, `npm run check` passes and the
pinned digests hold.

1. **P01, System's own files:** `instant.ts`, `duration.ts`, `clock.ts`, and their test helpers
   move to `time/`; `random-source.ts` to `randomness/`; and `math.ts` to `math/`. The shared
   `system.spec.ts` splits into one spec per submodule.
2. **P02, the helpers:** `required.ts` and `unreachable.ts` move to `validation/`, with
   `refuse`, which leaves `math.ts`; `fields-of.ts` and `deep-freeze.testing.ts` to `classes/`;
   and `digest-parts.ts` to `digests/`. The `as` exception for `math.ts` follows it.
3. **P03, the shared concepts:** `version-chain.ts` moves to `records/`, and `inbox-position.ts`
   to `messaging/`, with their specs. The domain root is then empty of files, and the
   architecture check keeps it so. The `as` exception for `version-chain.ts` follows it, and the graph's "Every module"
   line names what System now holds.

4. **P04, Infrastructure's shared files:** `json-value.ts` and `json-data.ts` move to
   `src/infrastructure/system/json/`, `persisted-groups.ts` to `records/`, `persisted-inbox.ts`
   to `messaging/`, and `registered-function.ts` to `functions/`. The architecture check keeps
   Infrastructure's root empty of files too.

### Decisions on the plan

The user chose these on 2026-11-07
([FND-85](../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-85--system-submodules)):

- **Keeping the root empty:** dependency-cruiser refuses a file at the root of `src/domain`.
- **Infrastructure's root:** its shared files move too, into an Infrastructure System folder
  with `json`, `records`, `messaging`, and `functions`, so P04 was added.

## Status history

- 2026-11-07 — Created as Proposed: the user asked that the domain root's helpers move into
  System's submodules, accepted the eight submodules, and chose that a new item plans the move
  first (FND-85). The plan waits for the user's review.
- 2026-11-07 — In Progress: the user approved the plan, chose that the architecture check keeps the
  domain root empty, and added Infrastructure's shared files, as P04 (FND-85). P01 started, and
  the other phases are Ready.
- 2026-11-07 — P01 Done: System's own files sit in `time/`, `randomness/`, and `math/`, and its spec is one per submodule. Every import and the config paths followed. npm run check passes.
- 2026-11-07 — P02 Done: `required`, `unreachable`, and `refuse`, which left `math.ts` for a file of its own, sit in `validation/`; `FieldsOf` and `deepFrozen` in `classes/`; and the digest parts in `digests/`. npm run check passes.
- 2026-11-07 — P03 Done: the version chain sits in `records/` and the inbox position in `messaging/`, so `src/domain` holds module folders only, and three dependency-cruiser rules refuse a file at its root, whether it imports, is imported, or neither. The graph's "Every module" line names System's shared helpers. npm run check passes.
- 2026-11-07 — P04 Done: `json-value.ts` and `json-data.ts` sit in `src/infrastructure/system/json/`, `persisted-groups.ts` in `records/`, `persisted-inbox.ts` in `messaging/`, and `registered-function.ts` in `functions/`, and the root rule covers Infrastructure too. npm run check passes, and the city day's digest is unchanged.
- 2026-11-07 — Done: every acceptance criterion is met. The city day's digest is unchanged, at 49.7 s,
  and the item moved to the Done archive.

## Priority history

- 2026-11-07 — Created at High priority, like the other items of this epic.
