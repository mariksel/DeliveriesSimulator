# Drivers

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a capability in
  [FND-8](../decisions/project-foundation.md#fnd-8--capability-list), as Deliveries, and made the
  module that holds Deliveries in
  [FND-83](../decisions/project-foundation.md#fnd-83--types-owned-by-their-modules). Partly
  implemented: the happy path's dispatch, its rules, and its records exist. The
  [implementation roadmap](../roadmap/implementation-roadmap.md) says which stage builds the
  rest.

## Current and approved responsibilities

Simulates the real service's drivers: their availability, their locations, their commands and
status, their behaviour profiles, and the driver rules, which are eligibility, ranking, and the
order in which drivers are notified
([FND-24](../decisions/project-foundation.md#fnd-24--goal-is-correctness),
[FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries)). It writes its rules with
the [Business rules](business-rules.md) abstractions, and works with time only through
[System](system.md), so it never knows it is simulated
([FND-83](../decisions/project-foundation.md#fnd-83--types-owned-by-their-modules)).

### Deliveries, its submodule

Simulates the real service's deliveries: delivery requests, dispatch, assignments, the
notifications sent to drivers, and the outbox that orders reads. It sits in the Drivers folder
and counts as part of the module, as in the real service.

## Key approved business rules

- Each version's dispatch rules: eligibility, ranking, the notification sequence, and
  acceptance, in [V1.0.0 business rules](../versions/V1.0.0/business-rules.md), with the planned
  dispatch in [V1.1.0-planned-dispatch](../versions/V1.1.0-planned-dispatch/README.md).
- Equal scores are broken by driver ID
  ([FND-68](../decisions/project-foundation.md#fnd-68--equal-scores-and-open-request-order)).
- Driver commands, starting with
  [V1.0.0 actors and commands](../versions/V1.0.0/actors-and-commands.md).
- Rejections, ignores, and when a return may be requested, as the user decided
  ([FND-39](../decisions/project-foundation.md#fnd-39--source-conflicts-resolved)).
- Driver behaviour profiles and their controls
  ([FND-48](../decisions/project-foundation.md#fnd-48--simulation-model)).
- Deliveries holds its own communication values, for its own inbox
  ([FND-83](../decisions/project-foundation.md#fnd-83--types-owned-by-their-modules)).

## Rules

Drivers writes its `V1.0.0` rules with the [Business rules](business-rules.md) abstractions, in
the order below, which is the order eligibility checks them and the Rules panel lists them. Each
value is the one the [V1.0.0 business rules](../versions/V1.0.0/business-rules.md) state. No
source states the valid ranges, so the simulator proposed them and the user accepted them on
2026-11-07
([FND-84](../decisions/project-foundation.md#fnd-84--rule-abstractions)). A run uses a value
outside its range, and warns.

| Rule ID | Kind | Parameter | Default | Valid range |
| --- | --- | --- | --- | --- |
| `drivers.same-area` | Check | — | — | — |
| `drivers.online` | Check | — | — | — |
| `drivers.fresh-location` | Check | `max-age` | 5 min | 1 to 15 min |
| `drivers.near-restaurant` | Check | `max-distance` | 3 km | 0.5 to 10 km |
| `drivers.not-busy` | Check | `busy-at-picked-up-orders` | 5 | 1 to 20 |
| `drivers.not-busy` | Check | `busy-beyond` | 500 m | 0 to 3 km |
| `drivers.ranking-score` | Calculation | `boost-available` | 1 | 0 to 5 |
| `drivers.ranking-score` | Calculation | `boost-busy` | 0.5 | 0 to 5 |
| `drivers.ranking-score` | Calculation | `boost-free-for-delivery` | 2 | 0 to 5 |
| `drivers.ranking-score` | Calculation | `proximity-scale` | 1 km; never 0 | 0.1 to 10 km |
| `drivers.ranking-score` | Calculation | `load-divisor` | 2; never 0 | 0.5 to 10 |
| `drivers.notification-delay` | Calculation | `max-delay` | 2 min | 10 s to 10 min |
| `drivers.notification-delay` | Calculation | `decay` | 5 | 0 to 20 |
| `drivers.outstanding-notifications` | Limit | `max-outstanding` | 5 | 1 to 20 |
| `drivers.notification-delay-limit` | Limit | `max-notification-delay` | 60 s | 0 to 5 min |
| `drivers.dispatch-pass` | Calculation, of the next pass's time | `interval` | 30 s; a whole number of milliseconds above 0 | 5 s to 5 min |

The ranking score's proximity scale and load divisor were constants in the code until the user
made them parameters, on 2026-11-07.

Deliveries, a submodule, writes its own communication rules the same way, with the values the
[module communication](../versions/V1.0.0/module-communication.md) page states and ranges the
user accepted on 2026-11-07:

| Rule ID | Kind | Parameter | Default | Valid range |
| --- | --- | --- | --- | --- |
| `drivers.deliveries.inbox` | Calculation, of the next read's time | `interval` | 5 s; a whole number of milliseconds above 0 | 1 s to 1 min |
| `drivers.deliveries.inbox-read-lag` | Limit: an older event is not read | `read-lag` | 60 s | 0 to 5 min |

## Scope so far

The happy path only, with all of the dispatch rules and no push
([FND-67](../decisions/project-foundation.md#fnd-67--scope-of-the-skeleton)).

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries),
[FND-83](../decisions/project-foundation.md#fnd-83--types-owned-by-their-modules)):

- **Uses:** [Business rules](business-rules.md) (rule abstractions),
  [Map and routing](map-and-routing.md) (distances), [Notifications](notifications.md) (driver
  pushes), [Orders](orders.md) (driver commands, events), [Restaurants](restaurants.md) (where
  restaurants are), and [System](system.md) (time, randomness, and math).
- **Used by:** [Business view](business-view.md) (drivers and dispatch),
  [Scenarios](scenarios.md) (driver profiles), [Fault injection](fault-injection.md) (breaks
  steps), [Simulation engine](simulation-engine.md) (drives), [Orders](orders.md) (handoff,
  cancel, events), [Notifications](notifications.md) (drivers' devices), and
  [Verification](verification.md) (event kinds).

## Code map

| Path | Purpose |
|---|---|
| `src/domain/drivers/drivers-state.ts` | The Drivers state, as the class `DriversState`: each driver, its latest version, and how many orders it holds and has picked up. Its static methods add a driver and move an order's holding |
| `src/domain/drivers/driver.ts` | A driver, in an unchanging part and a version part, its location, and a new driver |
| `src/domain/drivers/numbers.ts` | `Score` and `Factor`, the ranking's score and the boosts' and decay's multipliers, made by creators that check them |
| `src/domain/drivers/drivers-rule-definitions.ts` | Drivers' rules and their parameters, as the [Rules](#rules) table lists them |
| `src/domain/drivers/drivers-rules.ts` | `DriversRules`: Drivers' rule set, with each value in use read out once as its own type |
| `src/domain/drivers/eligibility.ts`, `ranking.ts`, `notification-sequence.ts`, `dispatch-pass.ts` | The code that applies the rules: eligibility as five checks, the ranking score and the notification delay as calculations, the two notification limits, and the next dispatch pass's time |
| `src/domain/drivers/driver-availability.ts` | A driver's availability |
| `src/infrastructure/drivers/persisted-drivers-rules.ts` | Drivers' rule values in use, persisted as a rule set |
| `src/domain/drivers/deliveries/deliveries-state.ts` | The Deliveries state, as the class `DeliveriesState`, whose static methods are the submodule's commands, jobs, and dispatch. A command that reads the drivers takes their state, and one that changes them, such as accepting a request, gives it back too |
| `src/domain/drivers/deliveries/order-delivery.ts`, `notification.ts` | The records it holds, each a class, in an unchanging part and a version part whose methods make its next version |
| `src/domain/drivers/deliveries/delivery-event-kind.ts`, `delivery-event-record.ts`, `deliveries-outbox-event.ts` | Its events, and its outbox, whose events are the class `DeliveriesOutboxEvent`, which orders reads as it is |
| `src/domain/drivers/deliveries/delivery-handoff.ts`, `orders-answer.ts` | What it receives from orders. It reads the orders outbox as `OrdersOutboxEvent` itself |
| `src/domain/drivers/deliveries/call-orders.ts`, `follow-up-kind.ts` | The follow-up that asks the engine to call orders, and the kinds of follow-up |
| `src/domain/drivers/deliveries/driver-refusal.ts` | Why a driver's command is refused |
| `src/domain/drivers/deliveries/delivery-event-id.ts` | `DeliveryEventId`, in a file of its own because orders' events hold it too. `DriverId`, `OrderDeliveryId`, `NotificationId`, and `DeliveriesOutboxEventId` sit beside their classes |
| `src/domain/drivers/deliveries/deliveries-rule-definitions.ts`, `deliveries-rules.ts` | Deliveries' rules and their parameters, and `DeliveriesRules`, its rule set with each value read out as its own type |
| `src/domain/drivers/deliveries/deliveries-communication.ts` | The code that applies them: the next inbox read, and the read lag |
| `src/infrastructure/drivers/deliveries/persisted-deliveries-rules.ts` | Deliveries' rule values in use, persisted as a rule set |
| `src/domain/drivers/deliveries/deliveries-report.ts` | What it reports having done |
| `src/infrastructure/drivers/persisted-drivers-state.ts`, `deliveries/persisted-deliveries-state.ts`, `deliveries/deliveries-functions.ts` | The persisted records of Drivers and of Deliveries, and the Deliveries functions' stored IDs, `drivers.deliveries.<name>@1` |
