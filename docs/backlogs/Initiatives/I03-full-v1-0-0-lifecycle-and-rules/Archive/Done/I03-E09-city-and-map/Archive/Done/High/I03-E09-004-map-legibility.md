# I03-E09-004 — Map legibility

| Field | Value |
| --- | --- |
| ID | `I03-E09-004` |
| Parent | [I03-E09 — City and map](../../../I03-E09-city-and-map-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-11 |
| Last updated | 2026-11-11 |
| Completed | 2026-11-11 |

## Scope

The Map view made readable: a driver drawn as a rider on a bike and a restaurant as a
restaurant, every mark larger, marks that grow as the map zooms in, a badge whose count can be
read, and a selected order or driver that stands out boldly.

## Acceptance criteria

- At the whole city, every mark, badge count, and area name can be read.
- Zooming in makes the marks larger, up to a limit.
- A selected order or driver is visible at a glance wherever it shows.

## Dependencies

- [I03-E09-003 — Map view](I03-E09-003-map-view.md)

## Sources and evidence

- [Map and routing](../../../../../../../../../design/modules/map-and-routing.md)
- [UI](../../../../../../../../../design/ui/README.md)
- [Project foundation: FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)

## Internal phases

The user approved the plan below on 2026-11-11; it is one phase. The details are in
[FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward).

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E09-004-P01` | Icons, sizes, zoom growth, and selection | Done | 2026-11-11 | Approved; Built; `npm run check` passes |

### Plan

After the phase, `npm run check` passes.

1. **P01, icons, sizes, zoom growth, and selection:** drivers as a rider on a bike and
   restaurants as a small restaurant front, about 28 pixels across at the whole-city view; order
   marks about 12 pixels; badges with a readable count; area names in clear text; marks that grow
   as the map zooms in, up to twice their size; and a selected order or driver with a thick amber
   halo while everything else fades. The screenshot tour is taken again to check it.

## Status history

- 2026-11-11 — Created as Ready: after seeing screenshots of the Map view, the user asked
  for a minimal map that is actually useful
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)). Its dependency, I03-E09-003, is Done.
- 2026-11-11 — Moved from Ready to In Progress: the user approved the plan, choosing a halo on the
  selected order's or driver's marks with everything else faded ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-11 — P01 Done, and the item Done: drivers are drawn as a rider on a bike and
  restaurants as a restaurant front, about 28 pixels across at the whole city and growing as the
  map zooms in, to at most twice that; order marks, badge counts, and area names can be read; and
  a selected order's or driver's marks get an amber halo while everything else fades. The
  screenshot tour was taken again to check it. `npm run check` passes, but for the format of the
  workspace file, which was edited by hand outside this item
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).

## Priority history

- 2026-11-11 — Created at High priority, like the rest of the stage, when the user asked for a
  map that is actually useful.
