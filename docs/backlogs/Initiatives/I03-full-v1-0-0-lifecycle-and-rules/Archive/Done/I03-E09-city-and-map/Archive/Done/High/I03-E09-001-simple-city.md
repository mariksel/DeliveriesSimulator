# I03-E09-001 — Simple city

| Field | Value |
| --- | --- |
| ID | `I03-E09-001` |
| Parent | [I03-E09 — City and map](../../../I03-E09-city-and-map-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-10 |
| Last updated | 2026-11-10 |
| Completed | 2026-11-10 |

## Scope

A simple city, the first part of the synthetic city of
[FND-48](../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-48--simulation-model):
a grid of square areas, generated from a seed and settings. The settings are the city's width
and height in kilometres, and the number of areas across and down; restaurant density waits for
`I07`'s Load generator. A scenario names its city's seed and settings, and gives each restaurant
and driver an exact point or only an area. A restaurant given only an area gets a point the seed
picks; a driver given only an area has no location until they send one. The area follows from
the point, so the two cannot disagree. Streets, routing along them, and editing a city by hand
stay in `I07`. Older stored scenarios and saved runs get the smallest grid around their places.

## Acceptance criteria

- The built-in scenarios name a city, and each place lies in the area its point falls in.
- A place given only by an area gets a point in that area from the seed, the same on every run
  with the same seed.
- A scenario with a place outside its city, or an area its city does not have, is refused when
  it is read.

## Dependencies

- [I03-E02-023 — Versioned scenario storage](../../../../../../Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-023-versioned-scenario-storage.md)

## Sources and evidence

- [Map and routing](../../../../../../../../../design/modules/map-and-routing.md)
- [Scenarios](../../../../../../../../../design/modules/scenarios.md)
- [Project foundation: FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)

## Internal phases

The user approved the plan below on 2026-11-10, so the implementer starts at P01. The details are
in [FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward).

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E09-001-P01` | The city in Map and routing | Done | 2026-11-10 | Approved; Built; `npm run check` passes |
| `I03-E09-001-P02` | The city in scenarios | Done | 2026-11-10 | Approved; Built; `npm run check` passes |
| `I03-E09-001-P03` | Stored scenarios and saved runs | Done | 2026-11-10 | Approved; Built; `npm run check` passes |

### Plan

After each phase, `npm run check` passes.

1. **P01, the city in Map and routing:** a `City` built from checked settings, with its square
   areas, the area a point lies in, and a point picked in an area from a named stream of the
   city's seed.
2. **P02, the city in scenarios:** the scenario format's `city` field, and places given by a
   point, an area, or both when they agree, with the checks for a place outside the city, an area
   the city does not have, and a point and area that disagree. The built-in scenarios name a city,
   and the run's script holds it. The scenario format page follows.
3. **P03, stored scenarios and saved runs:** stored scenarios move to schema 2 and saved runs to
   schema 3, each older one getting one square area around its places, or refused when it used
   several areas. The kept snapshot runs are made again, and the Map and routing, Scenarios, and
   Run history pages follow.

## Status history

- 2026-11-10 — Created as Ready: the user brought the Map view and a simple city forward from
  `I07`, to be built next
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
  Its dependency, I03-E02-023, is Done.
- 2026-11-10 — Moved from Ready to In Progress: the user approved the plan, choosing that
  restaurant density waits for `I07`, every scenario has a city, a driver given only an area has
  no location, a point and area may both be given when they agree, and older data that used
  several areas is refused ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-10 — P01 Done: Map and routing has a `City`, a grid of square areas from checked
  settings, with the area a place lies in and a place picked in an area from a named stream.
  Positions on the city's plane are rounded to the micrometre, and picked places lie on a
  millimetre grid, so turning degrees into metres and back cannot move a place across an edge.
  `npm run check` passes.
- 2026-11-10 — P02 Done: every scenario names a `city`, and each restaurant and driver gives a
  point, an area, or both when they agree; a restaurant given only an area gets a point from the
  city's seed. The run's script holds the city, outside the roots, so the kept snapshot run gained
  only its city and every commit stayed the same. Stored scenarios and saved runs already write
  the city; one stored before has none until P03. Details settled while building: the format stays
  at `format: 1`, a city has at most 1000 areas each way, and a step checks its actor against
  the IDs the file gives, so a place that is wrong is not reported again at every step.
  `npm run check` passes.
- 2026-11-10 — P03 Done, and the item Done: stored scenarios are at schema version 2 and saved runs
  at 3. One stored before cities gets one square area around its places, 500 metres beyond them,
  named as the one area they use, and a scenario's content key is worked out again; one whose
  places use several areas is refused, saying why. The kept snapshot run is made again, with only
  its city and schema version new. `npm run check` passes
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).

## Priority history

- 2026-11-10 — Created at High priority, like the rest of the stage, when the user brought the
  map forward.
