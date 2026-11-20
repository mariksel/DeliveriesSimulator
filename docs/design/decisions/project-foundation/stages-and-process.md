# Project foundation — Stages and process

How the work is staged and planned, and the rule that keeps the project safe to publish.
This is part of the [project foundation](../project-foundation.md), which holds
its version, authority, and undecided questions, and lists where each record is.

## Approved decisions

### FND-23 — Safe to publish

The project must be safe to expose publicly. It does not expose private information, and the
real service's name stays generic. What counts as private beyond its name and location is
undecided (U9); until then, these documents do not record the real service's rules, values, or
internal identifiers.

Amended 2026-11-03 by the user, deciding U9: only identity is private. That is the real
service's name and location, the people involved, and real data. Its rules, values, event names,
and identifiers may be recorded, described generically, so versions of the real service can ship
with the simulator.

### FND-27 — Covered in stages

The simulator covers the whole delivery lifecycle, delivered in stages.

### FND-28 — Backlog first

Implementation does not start directly. The first initiative,
[I01](../../../backlogs/Initiatives/Archive/Done/I01-requirements-and-backlog-creation/I01-requirements-and-backlog-creation-backlog.md),
gathers requirements by asking the user and creates the implementation initiatives. This
foundation is its baseline: it asks only what is still open, and a conflict with a decision is
raised with the user.

### FND-59 — Requirements approved

- **Approved:** the requirements, summarised in [requirements](../../requirements.md), are complete
  and correct, area by area.
- **Open questions:** implementation may start with U12, U13, and U14 open. U13 is decided when
  the report generator is built, U14 before anything is published, and U12 once versions are
  being added.

The user decided these on 2026-11-03, in I01-E06-001.

### FND-60 — Implementation stages

- **First stage:** an end-to-end skeleton. The project setup, and one `V1.0.0` order going end to
  end without faults: the restaurant creates it, and it is dispatched, accepted, picked up, and
  delivered, through both modules' outboxes and inboxes. It has the virtual clock, the event log,
  a basic technical view, and a scenario that passes or fails on four criteria: Valid final state,
  Modules agree, Exactly-once effect, and Outbox for every event.
- **Stage gate:** a stage is complete, and the next one starts, only when its built-in scenarios
  pass in the browser and headless; the user has run it and approved it; the design pages, code
  maps, and statuses match the code, with Implemented evidence; and the unit, component, and
  end-to-end tests pass, with the architecture and public-safety checks.
- **Order:** correctness first. Each stage is one initiative:
  1. `I02` End-to-end skeleton.
  2. `I03` Full `V1.0.0` lifecycle and rules: every path, command, and rule.
  3. `I04` Faults, races, and verification: fault injection, the known races C1 to C4 and R1 to
     R4, the give-ups D1 to D4, invariants, and the drift report.
  4. `I05` Stored runs and files: run history, and import and export.
  5. `I06` Versions and comparison: `V1.1.0-planned-dispatch` and option switches.
  6. `I07` City, actors, and scale: behaviour profiles, the map, and the business view.
  7. `I08` Analysis and the offline dispatch model.
  8. `I09` The conformance exchange.
  9. `I10` Remaining views and checks: the model checker, coverage, and metrics.
  10. `I11` The later capabilities of [FND-35](purpose-and-scope.md#fnd-35--later-capabilities), all
      five together.
     U13 is decided when it starts.
- **Capabilities by stage:** each FND-34 capability is built in one stage, as the
  [implementation roadmap](../../roadmap/implementation-roadmap.md#capabilities-by-stage) lists
  them.
- **Backlog detail:** `I02` is written in full, with epics and items. Each of `I03` to `I11` has
  one epic with one planning item until it starts, because the backlog derives an epic's status
  from its items. Its intended epics are in the
  [implementation roadmap](../../roadmap/implementation-roadmap.md#capabilities-by-stage), and are
  created when it starts, so they reflect what the earlier stages taught.
- **Priority:** the `I02` items are High, and the planning items are Normal until each stage
  starts.

The user decided these on 2026-11-03, in I01-E06-002.

Amended on 2026-11-10 by [FND-90](#fnd-90--map-and-a-simple-city-brought-forward): the Map view and
a simple city move from `I07` into `I03`.

### FND-67 — Scope of the skeleton

- **Order detail:** in `I02`, an order holds only what the path needs: its ID, restaurant, status,
  version, readiness, driver, and events. The rest of
  [FND-38](capabilities-and-inventory.md#fnd-38--order-detail) arrives in
  `I03`, and FND-38 is unchanged.
- **Idempotency:** `I02`'s commands take no idempotency keys, because nothing on its path repeats.
  They arrive in `I03`.
- **Dispatch:** `I02` has all of `V1.0.0`'s eligibility, ranking, and notification sequence
  rules. A notification is a durable record; pushes and devices arrive in `I03`. A driver's status
  and location come from the scenario.
- **Communication:** `I02` has both outboxes, both inbox jobs, the handoff and its retry, and the
  direct calls. Inbox retries, dead letters, pending driver commands, cleanups, and refused events
  arrive with `I03` and `I04`; until then, an event the path cannot handle stops the run with an
  error rather than being lost.

The user decided these on 2026-11-04, in I02-E03-001.

### FND-80 — Planning stage I03

The user chose these on 2026-11-05, in I03-E01-001.

- **Order of work:** the roadmap's epics, with Manual mode built in the first epic, so each path
  can be tried by hand as it arrives.
- **Built-in scenarios:** one for each path, about 10 to 15, with every command in at least one.
- **Retries before faults:** the retry jobs and the Pending command view are built in I03. A
  scenario can mark one call as failing, so a retry can be seen. I04's fault injection replaces
  that step.
- **Saved scenarios:** the Scenario library and Scenario recorder save to IndexedDB in I03, with
  the schema version and migration of [FND-57](architecture-and-code.md#fnd-57--hosting-and-data).
  I05 extends that storage to runs and files.
- **Money:** amounts are whole minor units, held in a branded `Money` type. Rounding happens only
  where a rule divides.
- **Locations:** each driver in a scenario has an optional send interval, a preset or a value from
  5 seconds to 5 minutes, and steps can send a specific point or batch. I06 and I07 feed the same
  setting later.
- **Routing:** a stand-in provider returns the straight-line distance from restaurant to address,
  behind the interface I07 implements with streets. The simple failure step can make it fail.

### FND-90 — Map and a simple city brought forward

The user asked on 2026-11-10 to bring the Map view, planned for `I07`, as far forward as
possible, and chose:

- **Scope:** the Map view and a simple city come into `I03`. The simple city is a first part of
  the synthetic city of
  [FND-48](simulation-model.md#fnd-48--simulation-model): generated from a seed and settings,
  without streets. Streets, routing along them, drivers moving along them, editing a city by hand,
  custom cities, and the heatmaps stay in `I07`, and are drawn on the same map when they arrive.
- **When:** next in `I03`, before Manual mode. The map shows what a run holds at the time, and
  each later item adds its part as it arrives, such as drivers' location points and delivery
  addresses.
- **Between two points:** the map shows a driver at the last location they sent, with their
  recorded track behind them. It does not move them between points, which would be the
  simulator's guess and not data the service has.

The user then chose, the same day, how the simple city works:

- **Shape:** a grid of square areas. Its settings are the city's width and height in kilometres,
  the number of areas across and down, and the restaurant density. I07's streets lie over the
  same grid.
- **Placing:** a scenario names its city's seed and settings. Each restaurant and driver gives an
  exact point, as before, or only an area, and the seed picks a point in it. The area always
  follows from the point, so the two cannot disagree.
- **Addresses:** each order's delivery address is seeded by the city, in an area, or given exactly
  by a step. They come with the city, so the map shows where an order goes, and the routing
  stand-in measures to them.

Planning I03-E09-001 the same day, the user chose:

- **Restaurant density:** left out of the simple city. It comes back with the Load generator in
  `I07`, which generates restaurants at volume, so no setting exists that nothing reads.
- **Every scenario has a city:** reading an older stored scenario or saved run, which has none,
  gives it the smallest grid around its places, so nothing stored is lost. Scenario files must name
  a city.
- **A driver given only an area:** has no location until they send one, as before, and belongs to
  that area. Only a restaurant given only an area gets a point picked by the seed, since a
  restaurant always has a place.
- **A point and an area both given:** allowed when the point lies in that area, which keeps files
  readable, and refused, with its place, when it does not.

The user then approved I03-E09-001's plan, with these details, and chose the last:

- **The city's fields:** `origin`, the south-west corner; `width` and `height` in kilometres;
  `across` and `down`; the city's own `seed`; and optional `areas` names. Width over across must
  equal height over down, so each area is square, or the scenario is refused.
- **Area names:** `area-1`, `area-2`, and so on, row by row from the south-west corner, unless
  `areas` names them.
- **The area of a point:** a flat projection from the origin, close enough over a city. A point on
  an edge between two areas belongs to the one north or east of it, and a point outside the city
  is refused.
- **A point the seed picks:** anywhere in the area's square, from the city's seed, in a stream
  named after the restaurant, so adding a restaurant moves no other, and changing the run's seed
  keeps the places.
- **Where the city lives:** in the run's script, beside its restaurants, not in the state roots,
  so no commit's digest changes.
- **Older data:** stored scenarios move to schema 2 and saved runs to schema 3. Each gets one
  square area covering its places with a 500-metre margin, named after the area it used, with the
  scenario's seed. One that used several area names cannot keep every place in its old area, so it
  is refused, saying why, and needs a city by hand. Every built-in scenario, and anything made from
  one, uses a single area.

As built in I03-E09-001, on 2026-11-10: the scenario format stays at `format: 1`, with `city`
required; a city has at most 1000 areas each way; and a step checks its actor against the IDs
the file gives, so a place that is wrong is reported once, not again at every step that names
it. The kept snapshot run gained only its city and schema version, as every commit stayed the
same.

Planning I03-E09-003, the Map view, the same day, the user chose:

- **Drawing:** SVG, each area, restaurant, driver, and order an element, so tooltips, keyboard
  focus, and tests come easily. If `I07`'s city-scale runs need more, the drawing can move to a
  canvas then.
- **Orders:** each order at its restaurant or with its driver shows as a dot when there are few,
  and as a badge with their count when there are many, which opens the full list when clicked.
- **Zoom:** the wheel zooms around the pointer, dragging pans, and a Fit button brings the whole
  city back into view. The map starts fitted to the city.

Where the map goes was decided already: it is a tab of the run workspace's main area
([FND-78](ui.md#fnd-78--outbox-and-inbox-inspector)), the one a run opens on
([FND-53](ui.md#fnd-53--ui-organisation)).

The user then answered the rest, and approved I03-E09-003's plan:

- **Where the map is worked out:** Map and routing's core thinks only in its own concepts, such
  as the city, an area, a route, a distance, and later the weather. The Map view is a UI matter:
  what it shows is worked out from the run, by tested functions in the UI layer, which may read
  every module's records, and drawn there. Map and routing's core knows nothing of orders or
  drivers, and the module graph is unchanged.
- **Few orders:** up to five orders show as dots; six or more show as one badge with the count.

Asked whose record places an order on the map, since Deliveries hears of a pick-up or delivery
before Orders does, the user answered:

> orders should be shownt at the respective state they are in, a created order has it state, a
> ready order has its state and so on, when a driver gets a delivery request for an order the
> notification is its own view, when a driver accepts an order delivery request that another view,
> so the driver show its accepted request order and the restaurant also show its view of the
> order, parallel o this it should also be shown where the physical order is belived to be, so
> when teh order is ready the physical order is at the restaurant,whent it is picked up and
> delivered it is with the driver and so on

So the map shows each order in several views at once, none of them chosen over another:

- **The restaurant's view:** each order at its restaurant, in the state the Orders module holds,
  such as created or ready.
- **The driver's views:** a delivery request a driver was notified of is one view, and a request
  the driver accepted is another, each shown at that driver.
- **The physical order:** where the order itself is believed to be: at the restaurant until it is
  picked up, then with the driver.

The user then chose, on 2026-11-11, how these views are drawn:

- **Marks:** the restaurant's view is a small square at the restaurant, coloured and labelled by
  the state Orders holds; a request a driver was notified of, and still outstanding, is a hollow
  circle at the driver, and one they accepted a filled circle; the physical order is a parcel, a
  diamond, at the restaurant or with the driver.
- **Layers:** three switches above the map show or hide the restaurants' views, the drivers'
  views, and the physical orders.
- **Leaving the restaurant's view:** an order stays there until Orders holds it delivered, so the
  lag behind Deliveries stays visible.
- **A delivered parcel:** leaves the map once the driver reports delivering it, until
  I03-E09-002 draws it at the order's address.
- **Few and many:** the five-dot limit counts each kind of view at a place on its own; past five,
  that kind becomes one badge with its count and list.
- **A notified request:** a notification in `V1.0.0` holds one of its request's five slots until
  the driver explicitly ignores it, and accepting does not free it. The map shows a request as
  notified only while the driver has not answered it: the mark goes once they accept it, when the
  accepted mark takes over, once they ignore it, and once the request is no longer open, because
  another driver accepted it or it was delivered. The user chose this on 2026-11-11.

As built in I03-E09-003, on 2026-11-11: the Map tab is the first of the run workspace's main area,
so the end-to-end tests that look at the inspector open its tab first. The watched run gives the
UI its script and every module's state at the commit shown, from which the UI works out the
scene, so Verification and Map and routing take no new dependency. Marks keep their size on
screen as the map zooms, and the map reads the page only on the drawing surface an event reaches,
to measure the pointer.

On 2026-11-11, after seeing screenshots of the Map view, the user found it too simple and too
small:

> the map is too mach oversimplified, make the drier look like a ctual driver on a biike and a
> restaurant to look like an restaurant, everything is too small, add more detail like routing,
> roads, the path that driver is planing to follow, etc, basicly make a minimal map but one that
> is actually usefull

The user then chose, bringing more of `I07`'s City and map forward into `I03`:

- **Looks:** a driver is drawn as a rider on a bike and a restaurant as a restaurant, every mark
  is larger, marks grow as the map zooms in, and a selected order or driver stands out boldly.
- **Roads:** the city gets a street grid generated from its seed: main roads along the areas'
  edges, and local streets every couple of hundred metres inside each area, with some blocks
  merged or cut by the seed so it does not look like graph paper.
- **Routing:** the shortest path along those streets is the routing stand-in that I03-E04-005
  builds on, so the delivery fee band and the estimated distance measure the route, and the map
  draws the same route the rules used. This replaces the straight-line stand-in of
  [FND-80](#fnd-80--planning-stage-i03).
- **Addresses with it:** I03-E09-002's delivery addresses are built as part of this work, so a
  driver's planned path runs from where they are to the restaurant and on to the address.
- **Movement:** the simulator moves each driver along their route at a fixed speed, and their app
  sends locations as they go. This replaces the earlier choice that a driver is never shown
  between two points they sent: they now send points as they move. It brings location sending and
  a first movement model forward from I03-E03-012 and `I07`, and changes every run's results.

The user then chose how movement and addresses work, the same day:

- **Arrival:** a scripted pick-up or delivery runs at its time or when the driver arrives,
  whichever is later, so runs look like real trips. A step can still say it runs at its time
  regardless, to test a driver who reports early.
- **Speed and sending:** drivers move at 20 km/h, the speed `V1.0.0` itself assumes for travel
  time, and their app sends a location every 30 seconds while moving, well inside the 5-minute
  freshness limit. Both are scenario settings, per driver if wanted, with these as defaults.
- **Customers and addresses:** Restaurants' Customers submodule gets customers, each belonging to
  a restaurant, with stored addresses: a point, its area, and its stored distance. A scenario lists
  its customers.
- **An address is required:** as in `V1.0.0`, every order has a delivery address, so a
  create-order step names its customer and address. The user corrected an earlier reading that a
  step could leave the address out. What the seed still does: a scenario's customer address gives
  an exact point or only an area, and the seed picks a point in that area, as for a restaurant.

Planning I03-E09-004 the same day, the user chose that a selected order or driver gets a thick
amber halo on each of its marks, and everything else fades to a third, so its restaurant, driver,
and parcel are found at a glance. The user approved its plan: drivers drawn as a rider on a bike
and restaurants as a small restaurant front, about 28 pixels across at the whole-city view; order
marks about 12 pixels; badges with a readable count; area names in clear text; and marks that grow
as the map zooms in, up to twice their size.

As built in I03-E09-004, on 2026-11-11: icons are a twenty-sixth of the city's longer side, about
28 pixels where the city fills a map about 750 pixels wide, as in the workspace, and grow with the
square root of the zoom, to at most twice that. A restaurant or driver stays clear while anything
selected shows there. A driver within about 100 metres of a restaurant still overlaps its icon at
the whole-city view, and zooming in separates them; drivers on the move may call for more.

Planning I03-E09-005 the same day, the user chose how the streets work:

- **Blocks:** local streets are a city's optional `blockMetres` apart, 200 by default. Each area is
  split into as many equal blocks as fit, so streets line up across areas.
- **Variation:** the city's seed leaves out about one in eight local street segments, each between
  two crossings, which merges blocks and makes some dead ends. Main roads are never left out, and
  every crossing stays reachable.
- **Reaching a place:** a route leaves a place in a straight line to the nearest point on a
  street, follows the streets, and joins its destination the same way. These short access legs
  count in its distance.

As built in I03-E09-005, on 2026-11-11: a city carries its seed and `blockMetres`, and the
scenario's own city seed moved into it, so a stored scenario's city looks as it did. Streets are
worked out again from the seed wherever they are needed, so nothing stores them. A route joins
its start's and its end's nearest street, the first on a tie, and as every street is a block
long, walking out from a street's ends a block at a time finds the shortest way between
crossings. The Map view draws main roads wider than local streets, under everything else.

Planning I03-E09-002 the same day, the user chose:

- **Stored distance:** when an address is stored, its distance is the route along the streets from
  its customer's restaurant, so the routing fallback gives the distance the route did then, and it
  never changes afterwards, as an address does not.
- **Pins:** each order not yet delivered has a house pin at its address, in the restaurants' views
  layer, under the up-to-five-then-badge rule.
- **Delivered parcels:** stay at their addresses, drawn faint, and a fourth switch, Delivered,
  shows or hides them.
- **Older data is refused:** a stored scenario or saved run from before customers, whose
  create-order steps name no customer or address, is refused, saying it needs customers. Unlike
  the city, which older data got made for it, nothing is made up here.

As built in I03-E09-002-P01, on 2026-11-11: a scenario's `customers` list is required, even when
it creates no order. An address given only an area has its point picked from a stream of the
city's seed named after the address, as a restaurant's is. Stored scenarios moved to schema
version 3, and a version 1 or 2 record that creates an order without a customer is refused,
saying why. A run's script does not hold customers yet, so saved runs gain them, and older ones
are refused, in P02, when orders carry their customer and address.

Building I03-E09-002-P02 the same day, the user chose to update the state functions' pinned
fingerprints in place, as once before, rather than register new versions: orders holding their
address changes the shape of the Orders and Deliveries state, which the old versions cannot run
on, and every saved run that made an order is refused, so no saved run replays differently.

As built in I03-E09-002-P02, on 2026-11-11: an order holds its customer's and address's IDs,
Orders keeps each order's address beside its restaurant, and the order-created log entry names
both, so every run's digest changed. The handoff and Deliveries' order delivery carry the
address's point as the destination. A run's script holds the customers and addresses; a
create-order step whose address the script does not hold, or whose address is not its
customer's, or whose customer is not the restaurant's, is refused as `UnknownAddress`. Saved runs
moved to schema version 4, refusing a version 3 run that made orders.

As built in I03-E09-002-P03, on 2026-11-11: an address has no icon of its own. Each order on its
way there has a house pin whose point is at the address, in a row centred on it, and the orders
delivered there sit faint below, so a selected order's pin shows where it is going. Addresses
are drawn under everything else.

Planning I03-E09-006 on 2026-11-11, after the user saw that drivers do not move yet, the user
chose:

- **Sending while online:** an online driver's app sends a location every 30 seconds whether
  moving or waiting, as a real app would, so a driver waiting after a delivery stays inside the
  5-minute freshness limit and eligible. An offline driver sends nothing. This widens the earlier
  "while moving".
- **Nearest stop next:** a driver holding several orders always rides to the nearest stop that
  is due: the restaurant of an accepted order not yet picked up, or the address of an order on
  board.
- **The demonstration keeps its story:** its times are retuned so each situation still happens and
  the map still shows every stage at once at a stated minute, with its digest and kept run made
  again.

Building I03-E09-006-P01 the same day, sends every 30 seconds measured about five times the
commits and three times the memory of a 50-driver day, and a 200-driver day ran out of memory.
The user kept the 30 seconds and chose to defer FND-48's scale: the city benchmark runs 50 drivers
and 500 orders for now, and I03-E09-008 makes sends cheap enough for hundreds of drivers before
`I07`.

As built in I03-E09-006-P01, on 2026-11-11: a send is an API call about no order, which no step
gives, so it does not count as a step run. Deliveries receives it, as
`drivers.deliveries.receive-location`, beside the commands that change the drivers' state. Each
driver's sending interval and speed are the simulated actor's, so they sit in the run's script as
its riders; a run started without riders, as the engine's own tests are, sends nothing. A stored
scenario from before gets the defaults; a saved run from before has no riders, so it replays
without sends, as it was run.

Starting I03-E09-006-P02 the same day, the user chose that when a scripted pick-up or delivery
waits for its driver to arrive, only that step waits: the rest of the script runs at its times,
and the waiting step runs once its driver arrives, so a driver riding to another stop first never
holds up other actors or deadlocks the script.

As built in I03-E09-006-P02, on 2026-11-11: a driver's ride is an indirect commit the engine
makes after each of their successful accepts, pick-ups, and deliveries, holding the route along
the streets to the nearest due stop, chosen by route length, the first on a tie; where they are is
worked out along it. A waiting step is an indirect commit that counts as the step, and the call
it waits for runs when the driver's ride reaches its stop. A driver's later step on the same order
waits behind their earlier one, so a delivery never overtakes its own pick-up. The demonstration's
busy driver now rides at 6 km/h, so they are still within a kilometre of the restaurant when
turned down as busy.

As built in I03-E09-006-P03, on 2026-11-11: the Map view draws each driver where their app last
sent them, with their track behind, and the route still to go of their latest ride, from where
the ride has them now to the stop, under the drivers' views switch. As apps send every 30
seconds, the route can start a little ahead of the driver's icon. The demonstration keeps its
story, with every stage at minute 37:30. Sends due at a moment come after everything
else due then. The demonstration's stale driver now gets there by sending only every ten minutes.

Planning I03-E09-009 on 2026-11-11, after the user saw that a driver with nothing left to do
stays where their last delivery left them, the user chose:

- **A waiting point per area:** a driver with no stop due rides to their service area's waiting
  point and waits there. By default it is the street corner nearest the area's centre, and a
  scenario can set it.
- **Straight away:** they set off as soon as they have no stop due, such as after their last
  delivery. An order taken on the way sends them on from where they are.
- **The demonstration keeps its story:** it is retuned, as for drivers on the move, so each
  situation still happens, every stage still shows at a stated minute, and it still passes.
- **Next:** the item is High priority and comes before I03-E09-008.
- **The start stays the scenario's:** a driver begins where the scenario puts them, and only
  running out of stops sends them to wait, so a scenario keeps control of where drivers begin.

The user approved the plan the same day: waiting points in the city first, then riding to them,
with a saved run from before keeping its drivers where they finished so it goes on as it was
run, then the waiting points on the map and the demonstration retuned.

As built in I03-E09-009-P01, on 2026-11-11: a city holds the waiting points its scenario sets,
read from an optional `waitingPoints` field of the city by area and refused when one lies outside
its area; any other area's is worked out from the city's size and blocks, which the streets now
share. A stored scenario or saved run keeps the points a city sets, and one stored before has
none, so it needs no new schema version.

As built in I03-E09-009-P02, on 2026-11-11: when a driver's command leaves them no stop due, the
engine's indirect commit is `driver-goes-to-wait`, with the route along the streets to their
service area's waiting point; a driver already there stays. Saved runs moved to schema version 5,
whose migration marks each rider of a version 4 run to stay where they finish. Every run with a
delivery changed its digest. The demonstration still passes, with each refusal it had. The city
benchmark's small day takes about 45 seconds alone, almost all of it from sends, so its test now
allows three minutes.

As built in I03-E09-009-P03, on 2026-11-11: the Map view draws each area's waiting point as a
faint dashed ring on its crossing, over the streets and under everything else, and a driver going
to wait has their route still to go drawn like any other, to the waiting point. The demonstration
needed no retuning: it shows each refusal it had, every stage at minute 37:30, and passes, and
by its end its idle drivers wait at their areas' waiting points.

Planning I03-E09-008 on 2026-11-11, the 50-driver day took 120 s, peaked at 3 GB, and held 709 MB
with every commit's root, for 364,124 commits, two for each of its 144,000 sends; loading it as a
saved run took about three minutes. A 500-driver day would make about 3.6 million commits. The
user chose to batch sends: every online driver's app still sends every 30 seconds, moving or
waiting, and all the sends due at one moment make one commit holding each driver's location, with
one log entry listing them, so a day makes about 2,880 send commits whatever the number of
drivers. In the timeline's view by driver, that commit shows under each driver it holds.

The user approved the plan the same day: batching first, then running the city day of 500
drivers and 5,000 orders, slimming what each send keeps if memory is still too high, and
restoring the benchmark's default.

As built in I03-E09-008-P01, on 2026-11-12: all the sends due at one moment are one piece of
due work and one API call, `send-locations`, whose state commit calls a new Deliveries function,
`drivers.deliveries.receive-locations`, and whose one log entry lists each app's send with no one
actor. The single-send function stays registered; given the same arguments, it still gives
exactly its pinned results, and the batched function gives the same results for a one-driver
batch. A run saved before keeps its single sends and still loads. Every run's digest changed,
as its send entries did; the demonstration still passes with each refusal it had, in 564 log
entries instead of 1,410.

Measuring P02 on 2026-11-12: working out which apps are due, finding a driver's due stops, and
finding the versions a commit read again on loading all cost far more than they need, and were
made cheaper with the same digests. A 500-driver day then completed in about 8 minutes, against
46 seconds before sends, holding 1.6 GB, 1.1 GB when saved, and about 5 GB at its peak while
saved and loaded back, more than Node's default heap; each send kept about 700 bytes, mostly a
new driver version made only to hold a new location. The user chose a general rule, recorded in
[FND-81](run-history.md#fnd-81--runs-as-a-tree-of-state-transitions): parts of a record that change
at different rates have versions of their own, so a driver's location and their online or offline
status are each a versioned model extending the driver, and the full view of a driver is all of
them together.

The user then chose:

- **The driver in four parts:** `Driver`, the ID, which never changes; `DriverVersion`, their
  service area, which changes rarely; their location, with its device time, a version chain of
  its own, one small version for each send; and their status, online or offline and how
  available, a version chain of its own. Eligibility and the map read the full view of all four.
- **Saved runs:** they move to schema version 6, and one saved before is refused, saying why, as
  nothing is made up for it. The pinned fingerprints are updated in place, as no saved run can
  replay differently. This ends P01's keeping of single sends in saved runs.
- **The other records audited now:** orders, deliveries, and notifications are gone through for
  parts that change at different rates, in a new item, I03-E09-010, built right after this one.

The plan then became three phases: batched sends, the driver in four parts, and city scale.

As built in I03-E09-008-P02, on 2026-11-12: `DriverVersion` holds only the driver's area;
`DriverStatusVersion` and `DriverLocationVersion` are version chains of their own, in the drivers'
state beside the driver's, and are records the timeline, the Inspector, and the reads know as
`DriverStatus` and `DriverLocation`. A send makes one location version and names its driver's
location. Eligibility, ranking, the due sends, and the map's track read the driver's full view.
Every run's digest stayed the same; the five pins of functions that give back drivers were
updated in place. Saved runs moved to schema version 6, refusing one saved with drivers kept as
before. Working out the due sends, a driver's due stops, the versions a commit read on loading,
and a commit's distinct reads were also made cheaper, with the same digests.

Measuring again on 2026-11-12: the split saved little, as each send's cost is spread over many
small parts. Noting all of a commit's records in the run's index at once, with each record's
commits a list that grows without being copied, took a 500-driver day from about 8 minutes to
215 seconds; it held 1,506 MB, saved at "everything" in 1,025 MB, and saving and loading it back
peaked at about 4.7 GB. The user lowered the scope to 200 drivers: the benchmark's default and
this item's acceptance are 200 drivers and 2,000 orders, keeping ten orders for each driver.

As built in I03-E09-008-P03, on 2026-11-12: the benchmark's default is 200 drivers and 2,000
orders. With Node's default heap, the day ran in 58 seconds, held 656 MB with every root, and
peaked at 2.8 GB, delivering every order with none refused; saved at "everything" it took 417 MB,
and it loaded back as the same run at both levels.

Planning I03-E09-010 on 2026-11-12, over a 50-driver, 500-order day: an order had 7 versions,
its status, request flag, ready flag, and driver each changing once or twice; Orders' copy of a
delivery had 6, only its events changing; a delivery had 9, its copy of the order changing about
five times and its state and driver about three; a notification, a driver, and a driver's status
never changed; and a driver's location had 2,881, 93% of them changing only the device time. The
user chose:

- **An order's status comes from its events:** an order's status, driver, and whether it is
  ready are read from the order's own events, which Orders already keeps, its latest event
  deciding the status and no event meaning Created. Its version keeps only whether a delivery
  request is pending, which no event records. This amends FND-73's "not event sourcing".
- **Deliveries' copy of the order is a record of its own:** it changes when Orders' events
  arrive, apart from the delivery's state and driver, so it gets versions of its own instead of
  being part of the delivery's version.
- **A location stays one reading:** a send is one reading of where and when, so it stays one
  record; splitting the device time from the place would save only a field a version.
- Orders' copy of a delivery, a notification, a driver, and a driver's status each have one part
  that changes, so they stay as they are.

The user approved the plan the same day: an order's status, driver, and ready flag from its events
first, then Deliveries' copy of the order as a record of its own, each with every run's digest
the same, saved runs moving up a schema version and refusing a run saved before that holds
orders, and the pinned fingerprints of functions whose results change shape updated in place.

Starting I03-E09-010-P01 the same day, the user chose that an order's version number still counts
every change: each event recorded moves the order to its next version, a small one holding only
whether a request is pending, so the version numbers that Orders' outbox events carry, that
Deliveries uses to ignore an older event arriving late, and that event IDs are built from stay as
they are.

As built in I03-E09-010-P01, on 2026-11-12: `OrderVersion` holds only whether a delivery request
is pending, and makes its next version with every change; `OrderView` is an order's full view,
reading its status, driver, and readiness from its events, and its methods decide each change.
Orders' reports, outbox events, and handoffs take the order's status from that view, so every
run's digest stayed the same. The Inspector tells an order's version as the order stood in the
commit that made it. The eight pins of Orders' functions were updated in place, and saved runs
moved to schema version 7, refusing one with orders kept as before.

As built in I03-E09-010-P02, on 2026-11-12: `OrderCopyVersion` is Deliveries' copy of an order,
with versions of its own in the deliveries' state, made as each of Orders' events arrives and
keeping only a newer version of the order's status; a delivery's version holds its state and its
driver, and moves on only when an event moves the delivery on. The timeline, the Inspector, and
the reads know the copy as the record `OrderCopy`. Every run's digest stayed the same; the eight
pins of Deliveries' functions were updated in place, and saved runs moved to schema version 8,
refusing one with deliveries kept as before.
