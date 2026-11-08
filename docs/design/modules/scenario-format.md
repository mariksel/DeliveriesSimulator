# Scenario Format

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved by the user on 2026-11-04, in I02-E04-001
  ([FND-70](../decisions/project-foundation.md#fnd-70--scenario-format)). Implemented for the
  fields below; I03 and later stages add to them. The user added rule settings on 2026-11-07
  ([FND-84](../decisions/project-foundation.md#fnd-84--rule-abstractions)), and indirect steps
  on 2026-11-08
  ([FND-89](../decisions/project-foundation.md#fnd-89--indirect-effects-stated-by-hand)).

A scenario is a JSON file that people can read and edit
([FND-49](../decisions/project-foundation.md#fnd-49--scenarios)). This page describes format 1, as
far as `I02` needs it. [Scenarios](scenarios.md) owns the format.

## Example

```json
{
    "format": 1,
    "name": "One order, happy path",
    "description": "One order from creation to delivered.",
    "version": "V1.0.0",
    "seed": 42,
    "runUntil": "h00:m05:s00:ms00",
    "restaurants": [
        {
            "id": "restaurant-1",
            "area": "area-1",
            "location": { "latitude": 10.33, "longitude": 20.82 }
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
        { "at": "h00:m00:s01:ms00", "actor": "restaurant-1", "command": "create-order", "order": "A" },
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
| `restaurants` | Yes | The restaurants at the start, which may be an empty list |
| `drivers` | Yes | The drivers at the start, which may be an empty list |
| `rules` | No | [Rule settings](#a-rule-setting) the run starts with, before the first step. They make no commit |
| `steps` | Yes | What the actors do, and when rules change, in time order, which may be an empty list |

### A restaurant

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | Yes | Its name in this scenario, unique among restaurants |
| `area` | Yes | Its service area |
| `location` | Yes | Its `latitude`, from -90 to 90, and `longitude`, from -180 to 180 |

### A driver

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | Yes | Its name in this scenario, unique among drivers |
| `area` | Yes | Its service area |
| `availability` | Yes | `Offline`, `Available`, `Busy`, or `FreeForDelivery` |
| `location` | With `locatedAt` | Its latest location, as for a restaurant |
| `locatedAt` | With `location` | The device time of that location |

### A step

| Field | Required | Meaning |
| --- | --- | --- |
| `at` | Yes | When it happens. Not before the step above it, and not after `runUntil` |
| `actor` | Yes | The restaurant or driver acting |
| `command` | Yes | What they do |
| `order` | Yes | The scenario's own name for the order |
| `after` | No | The `label` of an earlier [indirect step](#an-indirect-step) that led to this action. Its API call then records the indirect commit it follows from |

A step can instead change rules at its time, with `at` and `set` and nothing else:

```json
{ "at": "h00:m10:s00:ms00", "set": [{ "rule": "drivers.dispatch-pass", "parameter": "interval", "value": "h00:m00:s10:ms00" }] }
```

`set` is a list of [rule settings](#a-rule-setting). The change is a config change commit at its
time, and counts as a step.

Steps due at the same time run in the order they are written. An order must be created by an
earlier step before another step can use its name.

| Command | Actor | Does |
| --- | --- | --- |
| `create-order` | Restaurant | Creates the order |
| `request-delivery` | Restaurant | Requests delivery |
| `mark-ready` | Restaurant | Marks the order ready |
| `accept` | Driver | Accepts the delivery request |
| `pick-up` | Driver | Picks the order up |
| `deliver` | Driver | Delivers the order |

### An indirect step

A step can instead state a decision or change outside the service, which the service does not
see, with `indirect` in place of `command`
([FND-89](../decisions/project-foundation.md#fnd-89--indirect-effects-stated-by-hand)):

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
([FND-54](../decisions/project-foundation.md#fnd-54--tunability)).

## Validation

Reading a scenario either gives the scenario, or a list of everything wrong with it, each with
where it is and what is wrong, such as `steps[3].actor: must be a driver for accept`. It never
throws an exception
([FND-22](../decisions/project-foundation.md#fnd-22--error-reporting)). A field the format does not
have is refused, because it is usually a typing mistake.

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
| `src/infrastructure/scenarios/read-rule-settings.ts` | Reads a list of rule settings, with its problems and warnings |
| `src/infrastructure/scenarios/read-indirect-step.ts` | Reads what an indirect step states, and the label an action follows from |
| `src/domain/simulation-engine/clock-time.ts` | Reads and writes times |
