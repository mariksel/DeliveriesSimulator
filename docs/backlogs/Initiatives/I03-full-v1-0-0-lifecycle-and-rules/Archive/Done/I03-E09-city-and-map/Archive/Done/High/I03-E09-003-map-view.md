# I03-E09-003 — Map view

| Field | Value |
| --- | --- |
| ID | `I03-E09-003` |
| Parent | [I03-E09 — City and map](../../../I03-E09-city-and-map-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-10 |
| Last updated | 2026-11-11 |
| Completed | 2026-11-11 |

## Scope

Map view: shows drivers, restaurants, and orders on a map of the simple city, which the
simulator draws itself. It draws the city's areas, each restaurant, and each driver at the last
location they sent with their recorded track behind them. Each order shows in several views at
once: the restaurant's, in the state Orders holds; the driver's, as a request notified or
accepted; and the physical order, at the restaurant until picked up, then with the driver. Later items add their part as they arrive: delivery addresses in
[I03-E09-002](I03-E09-002-delivery-addresses.md), and drivers' location points in
[I03-E03-012](../../../../../../I03-E03-paths-and-commands/High/I03-E03-012-driver-status-and-location.md).
Streets and the heatmaps come in `I07`.

## Acceptance criteria

- Map view shows this for a run of `V1.0.0`, and follows the selected commit on the timeline.
- A driver is shown at the last location they sent, never between two points.

## Dependencies

- [I03-E09-001 — Simple city](I03-E09-001-simple-city.md)

## Sources and evidence

- [Map and routing](../../../../../../../../../design/modules/map-and-routing.md)
- [Project foundation: FND-34](../../../../../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-34--required-capabilities)
- [Project foundation: FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)

## Internal phases

The user approved the plan below on 2026-11-10, so the implementer starts at P01. The details are in
[FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward).

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E09-003-P01` | What the map shows, worked out in the UI | Done | 2026-11-11 | Approved; Built; `npm run check` passes |
| `I03-E09-003-P02` | The Map tab | Done | 2026-11-11 | Approved; Built; `npm run check` passes |
| `I03-E09-003-P03` | Zoom, pan, and Fit | Done | 2026-11-11 | Approved; Built; `npm run check` passes |

### Plan

After each phase, `npm run check` passes.

1. **P01, what the map shows:** tested functions in the UI layer work out, from the run at the
   commit shown, the city's areas, each restaurant, each driver at the last location they sent
   with their track, and each order's views: the restaurant's, the driver's notified and
   accepted requests, and the physical order. The workspace's store gives the map what it needs
   from the run.
2. **P02, the Map tab:** the first tab of the main area, which a run opens on, drawn in SVG: the
   areas with their names, the restaurants, the drivers and their tracks, and each kind of
   order view as up to five marks, or one badge with the count that opens their list, with a
   switch for each kind. Every mark has a tooltip, and clicking a driver or order selects it, as
   the timeline's views do, and shows it selected.
3. **P03, zoom, pan, and Fit:** the wheel zooms around the pointer, dragging pans, and Fit brings
   the whole city back into view. End-to-end tests, and the Map and routing and UI pages, follow.

## Status history

- 2026-11-10 — Created as Proposed: the user brought the Map view and a simple city forward from
  `I07`, to be built next
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
  It starts when its dependency is Done.
- 2026-11-10 — Moved from Proposed to Ready: its dependency, I03-E09-001, is Done.
- 2026-11-10 — Moved from Ready to In Progress: the user approved the plan, choosing SVG, dots for up to
  five orders and a badge with their count beyond, wheel zoom with drag and Fit, and that the
  Map view is worked out and drawn in the UI layer, so Map and routing's core keeps to its own
  concepts ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-11 — Scope settled while planning: each order shows in several views at once, the
  restaurant's, the driver's notified and accepted requests, and the physical order, each kind
  with its own shape and a switch, five marks of a kind before a badge
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-11 — P01 Done: tested functions in the UI layer work out what the map shows at the
  commit shown, from the run's script and every module's state, which the watched run now gives:
  the city's areas, each restaurant with its view of its orders and the parcels there, and each
  driver at the last location they sent, with their track, the requests notified and not
  answered, those accepted, and the parcels with them. The workspace's store gives the map its
  scene. `npm run check` passes, but for the format of the workspace file, which was edited by
  hand outside this item.
- 2026-11-11 — P02 Done: the Map tab is the first of the main area, and a run opens on it. It
  draws the areas, the restaurants, the drivers with their tracks, and each order view with its
  own shape, a badge past five of a kind that lists them, and a switch for each kind; every mark
  has a tooltip, and clicking a driver or order selects it as the timeline's views do. End-to-end
  tests that look at the inspector now open its tab first. `npm run check` passes, but for the
  format of the workspace file, which was edited by hand outside this item.
- 2026-11-11 — P03 Done, and the item Done: the wheel zooms the map around the pointer, from a
  fiftieth of the whole city to twice it, a drag on the map pans it, and Fit brings the whole
  city back; marks keep their size on screen. An end-to-end test covers the map. `npm run check`
  passes, but for the format of the workspace file, which was edited by hand outside this item
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).

## Priority history

- 2026-11-10 — Created at High priority, like the rest of the stage, when the user brought the
  map forward.
