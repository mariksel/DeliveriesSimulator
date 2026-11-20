# I03-E02-022 — Indirect effect labels and config change links

| Field | Value |
| --- | --- |
| ID | `I03-E02-022` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-08 |
| Last updated | 2026-11-09 |
| Completed | 2026-11-09 |

## Scope

Two changes the user chose on reviewing
[I03-E02-013](I03-E02-013-indirect-effects-stated-by-hand.md), as
[FND-89](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-89--indirect-effects-stated-by-hand)
records:

- The State an indirect effect form asks for an optional label. Only Manual mode's actions
  ([I03-E03-001](../../../../../../I03-E03-paths-and-commands/High/I03-E03-001-manual-mode.md)) can
  name such a label, once built.
- A config change can record the indirect commit it follows from, as an API call does. A
  scenario's `set` step takes `after` with a label, as an action step does, and the Rules panel
  offers the scenario's labelled indirect effects to pick from; it does not offer labels given by
  hand.

## Acceptance criteria

- An indirect effect stated from the form can have a label, which saved runs keep.
- A config change made by a `set` step with `after`, or in the Rules panel with a label picked,
  records the indirect commit it follows from, and saved runs keep it.

## Dependencies

- [I03-E02-013 — Indirect effects stated by hand](I03-E02-013-indirect-effects-stated-by-hand.md)

## Sources and evidence

- [Project foundation: FND-89](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-89--indirect-effects-stated-by-hand)
- [Simulation engine: Kinds of effect](../../../../../../../../../design/modules/simulation-engine.md#kinds-of-effect)
- [Scenario format](../../../../../../../../../design/modules/scenario-format.md)

## Internal phases

The user approved the plan below on 2026-11-08, so the implementer starts at P01.

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E02-022-P01` | A config change that follows from an indirect commit | Done | 2026-11-09 | Approved; Implemented |
| `I03-E02-022-P02` | Labels in the form, and picking one in the Rules panel | Done | 2026-11-09 | Approved; Implemented |

### Plan

After each phase, `npm run check` passes.

1. **P01, the core and the format:** the config change effect gains `followsFrom`, looked up as
   an API call's is in `run-inputs.ts`; a rules input gains `after`; `config-change.ts` records
   it. `read-scenario.ts` and `read-rule-settings.ts` accept `after` on a `set` step, checking
   that an earlier indirect step holds the label, and the persisted config change and rules step
   keep it.
2. **P02, the browser:** the indirect effect form gets an optional label, refusing one already
   used in the run, scripted or by hand; the run keeps it with the effect, and saved runs keep
   it. The Rules panel offers the scenario's labelled indirect effects to pick from when a value
   changes, through `simulation-run.ts`, `live-scenario-run.ts`, and `watched-run.ts`. The
   Scenario format, Simulation engine, and Business rules pages, FND-89's as-built note, and the
   end-to-end tests follow.

## Status history

- 2026-11-08 — Created as Ready: the user reviewed I03-E02-013's choices, kept two, changed two,
  and chose a new Run history item for the change. Its dependency I03-E02-013 is Done.
- 2026-11-08 — Scope narrowed: the user chose that only Manual mode's actions name a label given
  by hand, so the Rules panel offers scripted labels only (FND-89).
- 2026-11-08 — Planned: the user chose that the form refuses a label already used in the run,
  and approved the phases below (FND-81).
- 2026-11-09 — Done: both phases are built, and `npm run check` passes. A config change records
  the indirect commit it follows from, from a `set` step's `after` or a label picked in the
  Rules panel, and saved runs and scripts keep it; the form takes an optional label, refused
  when the run already uses it. The as-built note is in FND-89.

## Priority history

- 2026-11-08 — Created at High priority, like the epic's other items.
