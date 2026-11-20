# Map and routing

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a capability in
  [FND-8](../decisions/project-foundation/purpose-and-scope.md#fnd-8--capability-list). Partly
  implemented: straight-line distance exists. The
  [implementation roadmap](../roadmap/implementation-roadmap.md) says which stage builds it. The
  simple city, a grid of square areas without streets, and the Map view are built, in `I03`
  ([FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)),
  in
  [I03-E09](../../backlogs/Initiatives/I03-full-v1-0-0-lifecycle-and-rules/Archive/Done/I03-E09-city-and-map/I03-E09-city-and-map-backlog.md).

## Current and approved responsibilities

The delivery area, distances, and routes, in a synthetic city that the simulator draws itself
([FND-48](../decisions/project-foundation/simulation-model.md#fnd-48--simulation-model)). It owns
custom cities
([FND-58](../decisions/project-foundation/architecture-and-code.md#fnd-58--stored-records-and-shared-files)).

## Key approved business rules

- A synthetic city generated from a seed and settings, editable by hand; drivers move along its
  streets ([FND-48](../decisions/project-foundation/simulation-model.md#fnd-48--simulation-model)).
- Until those streets come in `I07`, a simple city: a grid of square areas from its south-west
  corner, width and height in kilometres, and areas across and down, named `area-1` onwards row
  by row unless given names. A place on the edge between two areas belongs to the one north or
  east of it. A place picked in an area comes from a stream of the city's seed named after the
  restaurant, to the millimetre. Built in I03-E09-001-P01; every scenario names a city from P02,
  and a run's script holds it, outside the roots, so no commit's digest changes. A scenario or
  saved run stored before cities gets one square area around its places, 500 metres beyond them,
  named as the one area they use, in P03; one whose places use several areas is refused
  ([FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- A simple city's streets, from its seed and `blockMetres`, 200 unless given: main roads along
  every area's edge, and local streets every block, each area holding as many equal blocks as
  fit, so streets line up across areas. The seed leaves out about one in eight local segments,
  drawn in turn from its `streets` stream, merging blocks and making some dead ends; main roads
  are never left out, and a left-out segment comes back where a crossing could not otherwise be
  reached. Built in I03-E09-005-P01
  ([FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- Each area has a waiting point, where a driver with nothing to do waits: the point the
  scenario sets, or else the street crossing nearest the area's centre, the one to the south and
  west on a tie. Built in I03-E09-009-P01
  ([FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- A route between two places leaves the start in a straight line to the nearest point on a
  street, the first street on a tie, follows the streets, and joins the end the same way; the
  legs count in its length. Every street is a block long, so walking out from a street's ends a
  block at a time finds the shortest way between crossings, and the shortest of the ways in and
  out of the two streets, or straight along one street both places join, is the route. It is the
  routing stand-in that I03-E04-005 builds on. Built in I03-E09-005-P02.
- Travel times are generated: street-level traffic and live routing providers are not used
  ([FND-33](../decisions/project-foundation/purpose-and-scope.md#fnd-33--out-of-scope)).
- Routing provider failures can be injected
  ([FND-47](../decisions/project-foundation/simulation-model.md#fnd-47--failures)).
- Custom cities are stored records, shared inside the scenarios that use them
  ([FND-58](../decisions/project-foundation/architecture-and-code.md#fnd-58--stored-records-and-shared-files)).

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation/architecture-and-code.md#fnd-56--module-boundaries)):

- **Uses:** no other module.
- **Used by:** [Business view](business-view.md) (heatmaps), [Scenarios](scenarios.md) (the
  city), [Fault injection](fault-injection.md) (provider failures),
  [Simulation engine](simulation-engine.md) (moves drivers),
  [Restaurants](restaurants.md) (where they are), and
  [Drivers](drivers.md) (distances).

## Code map

| Path | Purpose |
|---|---|
| `src/domain/map-and-routing/coordinates.ts` | A place, as a class that checks its latitude and longitude, and the straight-line distance between two |
| `src/domain/map-and-routing/area-id.ts` | `AreaId`, a delivery area's ID, in a file of its own until areas have a class |
| `src/domain/map-and-routing/numbers.ts` | `Metres`, `Degrees`, and `Kilometres`, branded numbers made by creators that check them |
| `src/domain/map-and-routing/sphere.ts` | The Earth's radius and turning degrees into radians, which distances and the city's plane share |
| `src/domain/map-and-routing/local-plane.ts` | The flat plane laid over a city from its south-west corner: a place in metres east and north, and back |
| `src/domain/map-and-routing/street-grid.ts` | `StreetGrid`, a city's streets: main roads on the areas' edges, local streets every block, about one in eight local segments left out by the city's seed, every crossing reachable |
| `src/domain/map-and-routing/route.ts` | The shortest route between two places along a city's streets, with straight legs to and from the nearest street, its points and its length, between points on the plane or on the map |
| `src/domain/map-and-routing/city-around.ts` | The smallest one-area city around some places, 500 metres beyond them, which older stored scenarios and saved runs get |
| `src/infrastructure/map-and-routing/persisted-city.ts` | A city, persisted in a stored scenario and a saved run's script, with the waiting points it sets |
| `src/infrastructure/map-and-routing/city-around-records.ts` | The city an older stored record gets, from the places it holds, refusing one whose places use several areas |
| `src/domain/map-and-routing/city.ts` | `City`, the simple city of [FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward): a grid of square areas from checked settings, the area a place lies in, a place picked in an area from a named random stream, how many blocks an area holds, and each area's waiting point |
