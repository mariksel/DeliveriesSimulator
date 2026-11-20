# Scenario Format

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved by the user on 2026-11-04, in I02-E04-001
  ([FND-70](../decisions/project-foundation/simulation-model.md#fnd-70--scenario-format)).
  Implemented for the fields below; I03 and later stages add to them. The user added rule settings
  on 2026-11-07
  ([FND-84](../decisions/project-foundation/architecture-and-code.md#fnd-84--rule-abstractions)),
  and indirect steps on 2026-11-08
  ([FND-89](../decisions/project-foundation/run-history.md#fnd-89--indirect-effects-stated-by-hand)),
  the city on 2026-11-10, and customers on 2026-11-11
  ([FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).

A scenario is a JSON file that people can read and edit
([FND-49](../decisions/project-foundation/simulation-model.md#fnd-49--scenarios)). This page
describes format 1, as far as `I02` needs it. [Scenarios](scenarios.md) owns the format.

## Example

```json
{
    "format": 1,
    "name": "One order, happy path",
    "description": "One order from creation to delivered.",
    "version": "V1.0.0",
    "seed": 42,
    "runUntil": "h00:m05:s00:ms00",
    "city": {
        "origin": { "latitude": 10.325, "longitude": 20.815 },
        "widthKm": 2,
        "heightKm": 2,
        "across": 2,
        "down": 2,
        "seed": 7
    },
    "restaurants": [
        {
            "id": "restaurant-1",
            "area": "area-1",
            "location": { "latitude": 10.33, "longitude": 20.82 }
        }
    ],
    "customers": [
        {
            "id": "customer-1",
            "restaurant": "restaurant-1",
            "addresses": [
                {
                    "id": "address-1",
                    "area": "area-1",
                    "location": { "latitude": 10.3275, "longitude": 20.8225 }
                }
            ]
        }
    ],
    "drivers": [
        {
            "id": "driver-1",
            "area": "area-1",
            "availability": "Available",
            "location": { "latitude": 10.331, "longitude": 20.82 },
            "locatedAt": "h00:m00:s00:ms00"
        }
    ],
    "steps": [
        {
            "at": "h00:m00:s01:ms00",
            "actor": "restaurant-1",
            "command": "create-order",
            "order": "A",
            "customer": "customer-1",
            "address": "address-1"
        },
        { "at": "h00:m00:s02:ms00", "actor": "restaurant-1", "command": "request-delivery", "order": "A" },
        { "at": "h00:m00:s40:ms00", "actor": "restaurant-1", "command": "mark-ready", "order": "A" },
        { "at": "h00:m01:s00:ms00", "actor": "driver-1", "command": "accept", "order": "A" },
        { "at": "h00:m02:s00:ms00", "actor": "driver-1", "command": "pick-up", "order": "A" },
        { "at": "h00:m04:s00:ms00", "actor": "driver-1", "command": "deliver", "order": "A" }
    ]
}
```

## Times

A time is simulated time since the run began, written `h00:m05:s00:ms00`:

- **`h`:** hours, at least two digits, with no upper limit.
- **`m` and `s`:** minutes and seconds, two digits each, from 00 to 59.
- **`ms`:** a count of milliseconds, two or three digits, from 00 to 999. So `ms05` is 5
  milliseconds, and `ms500` is half a second.

All four parts are always written.

## Fields

| Field | Required | Meaning |
| --- | --- | --- |
| `format` | Yes | The format's version: `1` |
| `name` | Yes | What the scenario is called |
| `description` | No | What it is for |
| `version` | Yes | The [version](../versions/README.md) of the real service it runs against |
| `seed` | Yes | A whole number from 0 to 4294967295. The same version, scenario, and seed give the same run |
| `runUntil` | Yes | The simulated time at which the run ends |
| `city` | Yes | The [city](#a-city) the run happens in, which every place must lie in |
| `restaurants` | Yes | The restaurants at the start, which may be an empty list |
| `customers` | Yes | The restaurants' [customers](#a-customer), with their addresses, which may be an empty list |
| `drivers` | Yes | The drivers at the start, which may be an empty list |
| `rules` | No | [Rule settings](#a-rule-setting) the run starts with, before the first step. They make no commit |
| `steps` | Yes | What the actors do, and when rules change, in time order, which may be an empty list |

### A city

A simple city: a grid of square areas, with a street grid from its seed
([FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).

| Field | Required | Meaning |
| --- | --- | --- |
| `origin` | Yes | Its south-west corner, a `latitude` and `longitude` as for a location |
| `widthKm`, `heightKm` | Yes | Its width and height in kilometres, each above 0 |
| `across`, `down` | Yes | How many areas it has from west to east, and from south to north, each a whole number from 1 to 1000. Width over across must equal height over down, so each area is square |
| `seed` | Yes | The seed the city's streets come from, and a restaurant or address given only an area has its point picked from, as for the scenario's own `seed`. Changing the scenario's seed leaves the streets and places where they are |
| `blockMetres` | No | How far apart the local streets are, a number of metres above 0, 200 unless given. Each area holds as many equal blocks as fit, so streets line up across areas |
| `areas` | No | A name for each area, row by row from the south-west corner, all different. Without it, the areas are `area-1`, `area-2`, and so on, in that order |
| `waitingPoints` | No | Where a driver with nothing to do waits, by area: an object whose keys name areas, each a `latitude` and `longitude` that lie in that area. An area not given waits at the street crossing nearest its centre, the one to the south and west on a tie |

The city must not reach a pole or across the date line. Its areas are laid flat from the
south-west corner, which is close enough over a city. A place on the edge between two areas
belongs to the one north or east of it, and a place outside the city is refused.

### Where a place is

A restaurant, driver, or address gives its point, its area, or both. The area always follows from
the point: when both are given, the point must lie in that area. A restaurant given only an area
has a point picked anywhere in it, to the millimetre, from a stream of the city's seed named after
the restaurant, so adding a restaurant moves no other. An address given only an area has its point
picked the same way, from a stream named after the address. A driver given only an area has no
location until they send one.

### A restaurant

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | Yes | Its name in this scenario, unique among restaurants |
| `area` | Unless `location` is given | Its service area, one of the city's |
| `location` | Unless `area` is given | Its `latitude`, from -90 to 90, and `longitude`, from -180 to 180, inside the city |

### A customer

A customer belongs to one restaurant, which places their orders, and has one or more stored
addresses. Customer IDs are unique among customers, and address IDs among every customer's
addresses.

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | Yes | Their name in this scenario |
| `restaurant` | Yes | The `id` of the restaurant they belong to |
| `addresses` | Yes | Their stored addresses, at least one |

An address has an `id`, and an `area`, a `location`, or both, as a restaurant does. When it is
read, it gets its stored distance: the route along the city's streets from the customer's
restaurant to it, which the routing fallback uses
([FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).

### A driver

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | Yes | Its name in this scenario, unique among drivers |
| `area` | Unless `location` is given | Its service area, one of the city's |
| `availability` | Yes | `Offline`, `Available`, `Busy`, or `FreeForDelivery` |
| `location` | With `locatedAt` | Its latest location, as for a restaurant, inside the city |
| `locatedAt` | With `location` | The device time of that location |
| `sendsEvery` | No | How long the driver's app waits between the locations it sends while the driver is online, a time above none; 30 seconds unless given |
| `speedKmh` | No | How fast the driver rides along the streets, a number of kilometres an hour above 0; 20 unless given |

The simulator rides each driver: after they accept, pick up, or deliver, they set off along the
streets at `speedKmh` for their nearest stop that is due, the restaurant of an order they accepted
or the address of one on board. A `pick-up` or `deliver` step whose driver has not arrived waits
for them, and runs when they do; only that step waits, and the rest run at their times. While a
driver is online and has a location, their app sends where they are to the service every
`sendsEvery`, as an API call of its own that no step gives
([FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).

### A step

| Field | Required | Meaning |
| --- | --- | --- |
| `at` | Yes | When it happens. Not before the step above it, and not after `runUntil` |
| `actor` | Yes | The restaurant or driver acting |
| `command` | Yes | What they do |
| `order` | Yes | The scenario's own name for the order |
| `after` | No | The `label` of an earlier [indirect step](#an-indirect-step) that led to this action. Its API call then records the indirect commit it follows from |
| `customer` | For `create-order` only, and then required | The customer the order is for, who must be the acting restaurant's |
| `address` | For `create-order` only, and then required | Which of that customer's addresses it goes to |
| `atItsTime` | No; for `pick-up` and `deliver` only | `true` to run at its time even if the driver has not arrived, to test a driver who reports early. Otherwise the step waits for them |

A step can instead change rules at its time, with `at`, `set`, and an optional `after`:

```json
{ "at": "h00:m10:s00:ms00", "set": [{ "rule": "drivers.dispatch-pass", "parameter": "interval", "value": "h00:m00:s10:ms00" }] }
```

`set` is a list of [rule settings](#a-rule-setting). The change is a config change commit at its
time, and counts as a step. `after` names the `label` of an earlier
[indirect step](#an-indirect-step) that led to the change, as an action's does, and the config
change commit then records the indirect commit it follows from
([FND-89](../decisions/project-foundation/run-history.md#fnd-89--indirect-effects-stated-by-hand)).

A step can instead switch state functions to other versions at its time, with `at`, `use`, and
an optional `after`
([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)):

```json
{ "at": "h00:m10:s00:ms00", "use": [{ "function": "orders.pick-up", "version": 2 }] }
```

`use` lists one or more functions, each by its name, such as `orders.pick-up`, and the version to
use from then on. A name no state function has, or a version it does not have, is refused, with
its place, such as `steps[3].use[0].version: orders.pick-up has no version 2`. The switch is an
implementation change commit at its time, and counts as a step; every later state call goes
through the versions it puts in use. `after` names an earlier indirect step's `label`, as a rules
step's does.

Steps due at the same time run in the order they are written. An order must be created by an
earlier step before another step can use its name.

| Command | Actor | Does |
| --- | --- | --- |
| `create-order` | Restaurant | Creates the order, for its customer and address |
| `request-delivery` | Restaurant | Requests delivery |
| `mark-ready` | Restaurant | Marks the order ready |
| `accept` | Driver | Accepts the delivery request |
| `pick-up` | Driver | Picks the order up |
| `deliver` | Driver | Delivers the order |

### An indirect step

A step can instead state a decision or change outside the service, which the service does not
see, with `indirect` in place of `command`
([FND-89](../decisions/project-foundation/run-history.md#fnd-89--indirect-effects-stated-by-hand)):

```json
{ "at": "h00:m00:s45:ms00", "indirect": "driver-ignores-request", "actor": "driver-1", "order": "A", "label": "ignored" }
```

| `indirect` | `actor` | Other fields | Means |
| --- | --- | --- | --- |
| `driver-ignores-request` | A driver | | The driver ignores the request to deliver the order |
| `restaurant-runs-late` | A restaurant | `lateBy`, a time like `h00:m01:s30:ms00`, more than none | The restaurant expects the order to be ready this much later |
| `customer-wont-take-order` | None | | The customer won't take the order |

Each also has `at`, `order`, which an earlier step must have created, and an optional `label`,
which no earlier indirect step may have used. It is an indirect commit at its time, and counts as
a step.

### A rule setting

| Field | Required | Meaning |
| --- | --- | --- |
| `rule` | Yes | A rule's ID, such as `drivers.near-restaurant`: one of the [Drivers](drivers.md#rules) or [Orders](orders.md#rules) rules |
| `parameter` | Yes | One of that rule's parameters, such as `max-distance` |
| `value` | Yes | The value. A duration is a time like `h00:m00:s30:ms00`; a distance in metres, a count, or a multiplier is a number |

A value a run cannot use is refused, such as an interval of 0. A value outside its parameter's
valid range is used, with a warning, since a run may test extremes
([FND-54](../decisions/project-foundation/simulation-model.md#fnd-54--tunability)).

## Validation

Reading a scenario either gives the scenario, or a list of everything wrong with it, each with
where it is and what is wrong, such as `steps[3].actor: must be a driver for accept`. It never
throws an exception
([FND-22](../decisions/project-foundation/architecture-and-code.md#fnd-22--error-reporting)). A
field the format does not have is refused, because it is usually a typing mistake.

A step that is well formed can still be refused when the run reaches it, such as a pickup before
the order is ready. That is not invalid: the run logs the refusal, and carries on.

A scenario that can run may still have warnings, each with its place, such as
`rules[0].value: is outside its valid range, from 500 to 10000`. The command line reports them
in its `warnings` field, and the browser lists them below the run's controls until another
scenario opens.

## Running a scenario

In the browser, choose a file or a built-in scenario in Runs and scenarios. It opens paused at time
0, and you start it. On the command line, use `npm run scenario -- <file>`, or
`npm run scenario -- --built-in <id>`. Both use the same core, and give the same run: each reports
a digest of the run's whole event log, and tests check that Node, the command line, and each
browser give the same digest. `e2e/fixtures/one-order-digest.ts` holds the expected value. It
changes when the simulation's behaviour does, which should be on purpose.

Both also judge the run on the
[correctness criteria built so far](verification.md#how-the-first-criteria-are-judged), and say
whether it passed. The command line exits with code 0 when it did, and 1 when it did not. A bug
inside a run stops it and says where, what ran before it remains, and the scenario fails. In the
browser, the verdict is for the run as it stood at the time the scenario states it ends, even if
someone then keeps it going.

## Code map

| Path | Purpose |
|---|---|
| `src/infrastructure/scenarios/read-scenario.ts`, `scenario-reader.ts`, `parse-scenario.ts` | Parses a scenario file's text, and reads and validates the scenario it holds |
| `src/infrastructure/scenarios/read-city.ts` | Reads the city, and makes it from its checked fields |
| `src/infrastructure/scenarios/read-waiting-points.ts` | Reads the waiting points a city sets, and checks each lies in its area |
| `src/infrastructure/scenarios/read-place.ts` | Works out a restaurant's or driver's area from its point, its area, or both, and picks a restaurant's point in its area |
| `src/infrastructure/scenarios/read-customers.ts` | Reads the customers and their addresses, placing each address and storing its route distance from the restaurant |
| `src/infrastructure/scenarios/read-order-destination.ts` | Reads a create-order step's customer and address, which must belong to the acting restaurant and the customer |
| `src/infrastructure/scenarios/read-rule-settings.ts` | Reads a list of rule settings, with its problems and warnings |
| `src/infrastructure/scenarios/read-indirect-step.ts` | Reads what an indirect step states, and the label an action follows from |
| `src/infrastructure/scenarios/read-use-step.ts` | Reads the functions and versions a `use` step switches to, which the registry must hold |
| `src/domain/simulation-engine/clock-time.ts` | Reads and writes times |
