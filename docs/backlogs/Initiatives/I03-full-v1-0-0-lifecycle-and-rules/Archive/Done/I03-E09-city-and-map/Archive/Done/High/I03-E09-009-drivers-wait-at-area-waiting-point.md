# I03-E09-009 — Drivers wait at their area's waiting point

| Field | Value |
| --- | --- |
| ID | `I03-E09-009` |
| Parent | [I03-E09 — City and map](../../../I03-E09-city-and-map-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-11 |
| Last updated | 2026-11-11 |
| Completed | 2026-11-11 |

## Scope

A driver with no stop due rides along the streets to their service area's waiting point and
waits there, instead of staying where their last stop left them. Each area has a waiting
point: by default the street corner nearest its centre, which a scenario can set. A driver sets
off for it as soon as they have no stop due, and an order taken on the way sends them on from
where they are. The demonstration scenario is retuned to keep its story
([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).

## Acceptance criteria

- A driver who delivers their last order rides to their area's waiting point and stays there
  until they take another order.
- A scenario can set an area's waiting point; without one it is the street corner nearest the
  area's centre.
- The demonstration still shows each of its situations, every stage at its stated minute, and
  passes.

## Dependencies

- [I03-E09-006 — Drivers on the move](I03-E09-006-drivers-on-the-move.md)

## Sources and evidence

- [Map and routing](../../../../../../../../../design/modules/map-and-routing.md)
- [Simulation engine](../../../../../../../../../design/modules/simulation-engine.md)
- [Scenario format](../../../../../../../../../design/modules/scenario-format.md)
- [Project foundation: FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)

## Internal phases

The user approved the plan below on 2026-11-11. The details are in
[FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward).

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E09-009-P01` | Waiting points | Done | 2026-11-11 | Implemented; Tested |
| `I03-E09-009-P02` | Riding to wait | Done | 2026-11-11 | Implemented; Tested |
| `I03-E09-009-P03` | The map and the demonstration | Done | 2026-11-11 | Implemented; Tested |

### Plan

After each phase, `npm run check` passes.

1. **P01, waiting points:** each area of the city has a waiting point, by default the street
   corner nearest its centre, the south-west one on a tie. A scenario can set it with an
   optional city field, `waitingPoints`, by area, and stored scenarios keep it.
2. **P02, riding to wait:** when a driver's command leaves them no stop due, they set off along
   the streets for their area's waiting point, as an indirect commit. An order taken on the way
   sends them on from where they are. A driver begins where the scenario puts them. A saved run
   from before keeps its drivers where they finished, so it goes on as it was run.
3. **P03, the map and the demonstration:** each area's waiting point is drawn faintly on the
   map, and the route to it shows like any other. The demonstration is retuned to keep its
   story, with tests, pins, and the design pages.

## Status history

- 2026-11-11 — Created as Ready: after seeing drivers stay where their last delivery left them,
  the user asked that a driver with nothing to do ride to a waiting point instead, chose a
  waiting point per area, set off straight away, and the demonstration retuned to keep its story
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)). Its dependency,
  I03-E09-006, is Done.
- 2026-11-11 — Moved from Ready to In Progress: the user chose that a driver begins where the
  scenario puts them, and approved the plan ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-11 — P01 Done, still In Progress: each area of the city has a waiting point, the one a
  scenario sets in the city's `waitingPoints` or else the street crossing nearest the area's
  centre, and stored scenarios and saved runs keep the points set. `npm run check` passes
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-11 — P02 Done, still In Progress: a driver with no stop due rides along the streets to
  their area's waiting point, and a saved run from before, now migrated to schema version 5,
  keeps its drivers where they finish. `npm run check` passes but for two end-to-end tests that
  failed under the full suite's load and passed when run again; the city benchmark's test now
  allows three minutes, as sends make its small day take about 45 seconds
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-11 — P03 Done, and the item Done: the Map view draws each area's waiting point,
  and the route to it like any other. The demonstration needed no retuning: it shows each refusal
  it had and every stage at minute 37:30, and passes. `npm run check` passes
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).

## Priority history

- 2026-11-11 — Created at High priority, to be built before I03-E09-008, as the user chose.
