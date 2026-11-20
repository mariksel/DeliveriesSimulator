# I03-E09-005 — Streets and routing

| Field | Value |
| --- | --- |
| ID | `I03-E09-005` |
| Parent | [I03-E09 — City and map](../../../I03-E09-city-and-map-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-11 |
| Last updated | 2026-11-11 |
| Completed | 2026-11-11 |

## Scope

A street grid for the simple city, generated from its seed and settings: main roads along the
areas' edges, local streets every couple of hundred metres inside each area, and some blocks
merged or cut by the seed. The shortest route between two places along the streets, which the
routing stand-in of
[I03-E04-005](../../../../../../I03-E04-business-rules/High/I03-E04-005-routing-interface-and-stand-in.md)
builds on, in place of the straight line. The Map view draws the streets.

## Acceptance criteria

- The same city settings and seed always give the same streets, and every place can be reached.
- A route follows the streets, and is the shortest along them.
- The Map view draws the streets, main roads apart from local ones.

## Dependencies

- [I03-E09-001 — Simple city](I03-E09-001-simple-city.md)

## Sources and evidence

- [Map and routing](../../../../../../../../../design/modules/map-and-routing.md)
- [Project foundation: FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)

## Internal phases

The user approved the plan below on 2026-11-11, so the implementer starts at P01. The details are in
[FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward).

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E09-005-P01` | The street grid | Done | 2026-11-11 | Approved; Built; `npm run check` passes |
| `I03-E09-005-P02` | Routes | Done | 2026-11-11 | Approved; Built; `npm run check` passes |
| `I03-E09-005-P03` | Streets on the map | Done | 2026-11-11 | Approved; Built; `npm run check` passes |

### Plan

After each phase, `npm run check` passes.

1. **P01, the street grid:** a city gains its seed and `blockMetres`, and Map and routing works
   its streets out from them: main roads on the areas' edges, local streets every block, about one
   in eight local segments left out, every crossing reachable. The scenario format gets the
   optional `blockMetres`. A stored city keeps both; one stored before streets gets 200 metres and
   seed 0, which changes no run, as nothing measures routes yet.
2. **P02, routes:** the shortest route between two places along the streets, with straight legs to
   and from the nearest street, its distance and its points, tested against every path on small
   grids.
3. **P03, streets on the map:** main roads drawn wider than local streets, under everything else;
   an end-to-end test; the design pages, and I03-E04-005 told what to build on.

## Status history

- 2026-11-11 — Created as Ready: after seeing screenshots of the Map view, the user asked
  for a minimal map that is actually useful
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)). Its dependency, I03-E09-001, is Done.
- 2026-11-11 — Moved from Ready to In Progress: the user approved the plan, choosing 200-metre blocks
  as a city setting, about one in eight local segments left out, and straight access legs to the
  nearest street ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-11 — P01 Done: a city carries its seed and `blockMetres`, 200 unless given, and
  Map and routing works its streets out from them: main roads on the areas' edges, local streets
  every block, about one in eight local segments left out by the city's seed, and every crossing
  reachable. The scenario format reads `blockMetres`, and a stored city keeps both; one stored
  before streets gets seed 0 and 200-metre blocks. The kept snapshot run gained only those two
  fields. `npm run check` passes, but for the format of the workspace file, which was edited by
  hand outside this item.
- 2026-11-11 — P02 Done: the shortest route between two places along a city's streets, with
  straight legs to and from the nearest street, the first on a tie, its points and its length.
  Every route between eight places on a small grid with three streets missing matches the
  shortest of every path. `npm run check` passes, but for the format of the workspace file,
  which was edited by hand outside this item.
- 2026-11-11 — P03 Done, and the item Done: the Map view draws the streets, main roads
  wider than local ones, under everything else. The streets are worked out once for each city,
  not at every commit: worked out at every commit, they kept WebKit busy enough that two end-to-end
  tests elsewhere timed out waiting for a button to settle. `npm run check` passes, but for the
  format of the workspace file, which was edited by hand outside this item
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).

## Priority history

- 2026-11-11 — Created at High priority, like the rest of the stage, when the user asked for a
  map that is actually useful.
