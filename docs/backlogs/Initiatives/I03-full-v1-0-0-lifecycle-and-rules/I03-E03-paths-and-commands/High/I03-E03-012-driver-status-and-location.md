# I03-E03-012 — Driver status and location

| Field | Value |
| --- | --- |
| ID | `I03-E03-012` |
| Parent | [I03-E03 — Paths and commands](../I03-E03-paths-and-commands-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-11 |
| Completed | Not completed |

## Scope

A driver goes online or offline, sets their availability, and steps can send a location point
or a batch by hand. Sending a location from a moving driver, with the send interval per
driver, is built in
[I03-E09-006](../../Archive/Done/I03-E09-city-and-map/Archive/Done/High/I03-E09-006-drivers-on-the-move.md),
which brings the location send forward.

## Acceptance criteria

- A built-in scenario covers each status command and both ways of sending location.
- Status and location feed the eligibility rules.
- The Map view shows each driver at the last location point they sent, with their recorded
  track
  ([FND-90](../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).

## Dependencies

- [I03-E03-001 — Manual mode](I03-E03-001-manual-mode.md)

## Sources and evidence

- [V1.0.0 actors and commands](../../../../../design/versions/V1.0.0/actors-and-commands.md)
- [Project foundation: FND-80](../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-80--planning-stage-i03)
- [Deliveries](../../../../../design/modules/drivers.md)
- [Project foundation: FND-90](../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-10 — Still Proposed: an acceptance criterion added, as the user chose that each later item
  adds its part to the Map view
  ([FND-90](../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-11 — Still Proposed: sending locations from a moving driver, and the send interval, moved
  to I03-E09-006, as the user chose that drivers move along their routes
  ([FND-90](../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
