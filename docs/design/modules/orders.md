# Orders

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a capability in
  [FND-8](../decisions/project-foundation.md#fnd-8--capability-list). Partly implemented: the
  happy path's rules and records exist. The
  [implementation roadmap](../roadmap/implementation-roadmap.md) says which stage builds it.

## Current and approved responsibilities

Simulates the real service's orders module: the order lifecycle, its states and transitions, and
its side of the communication with the deliveries module, as each
[version](../versions/README.md) specifies it
([FND-24](../decisions/project-foundation.md#fnd-24--goal-is-correctness)). It holds its own
rules, written with the [Business rules](business-rules.md) abstractions, and works with time
only through [System](system.md), so it never knows it is simulated
([FND-83](../decisions/project-foundation.md#fnd-83--types-owned-by-their-modules)).

## Key approved business rules

- Order detail: products and lines, prices, fees and commission, customers and addresses, and
  restaurants and areas ([FND-38](../decisions/project-foundation.md#fnd-38--order-detail)).
- Each version's lifecycle and allowed transitions, starting with
  [V1.0.0 lifecycle](../versions/V1.0.0/lifecycle.md).
- How it communicates with the deliveries module, starting with
  [V1.0.0 module communication](../versions/V1.0.0/module-communication.md).
- Every order ends in a valid final state, and the two modules agree once events stop
  ([FND-29](../decisions/project-foundation.md#fnd-29--business-correctness),
  [FND-30](../decisions/project-foundation.md#fnd-30--technical-correctness)).
- Restaurants create the orders; customers do not order themselves
  ([FND-33](../decisions/project-foundation.md#fnd-33--out-of-scope)).
- The statuses an order can end in, and its own communication values, for its own inbox
  ([FND-83](../decisions/project-foundation.md#fnd-83--types-owned-by-their-modules)).

## Rules

Orders writes its `V1.0.0` rules with the [Business rules](business-rules.md) abstractions, in
the order below, which the Rules panel lists them in. The communication values are the ones the
[module communication](../versions/V1.0.0/module-communication.md) page states, and the
transitions are the [lifecycle](../versions/V1.0.0/lifecycle.md#transitions)'s, for the statuses
built so far. No source states the valid ranges, so the simulator proposed them and the user
accepted them on 2026-11-07
([FND-84](../decisions/project-foundation.md#fnd-84--rule-abstractions)).

| Rule ID | Kind | Parameter | Default | Valid range |
| --- | --- | --- | --- | --- |
| `orders.inbox` | Calculation, of the next read's time | `interval` | 5 s; a whole number of milliseconds above 0 | 1 s to 1 min |
| `orders.inbox-read-lag` | Limit: an older event is not read | `read-lag` | 60 s | 0 to 5 min |
| `orders.handoff-retry` | Calculation, of the next retry's time | `interval` | 5 s; a whole number of milliseconds above 0 | 1 s to 1 min |
| `orders.handoff-retries-per-run` | Limit | `max-retries` | 100 | 1 to 1,000 |
| `orders.request-delivery` | Check: allowed from Created | — | — | — |
| `orders.mark-ready` | Check: allowed from Created, DeliveryRequested, or DriverAssigned | — | — | — |
| `orders.accept-delivery-request` | Check: allowed from DeliveryRequested | — | — | — |
| `orders.pick-up` | Check: allowed from DriverAssigned | — | — | — |
| `orders.deliver` | Check: allowed from PickedUp | — | — | — |

A transition's check covers only the statuses it is allowed from, and refuses with
`NotAllowedFromStatus`. Its other guards, such as a pending request, the assigned driver, and
readiness, stay in the code, as the user chose.

## Scope so far

The happy path only, as
[FND-67](../decisions/project-foundation.md#fnd-67--scope-of-the-skeleton)
sets out.

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries),
[FND-83](../decisions/project-foundation.md#fnd-83--types-owned-by-their-modules)):

- **Uses:** [Business rules](business-rules.md) (rule abstractions),
  [Payments](payments.md) (money movements), [Drivers](drivers.md) (handoff, cancel,
  events), [Notifications](notifications.md) (restaurant pushes),
  [Restaurants](restaurants.md) (the restaurant an order is from), and [System](system.md)
  (time, randomness, and math).
- **Used by:** [Business view](business-view.md) (order states),
  [Fault injection](fault-injection.md) (breaks steps),
  [Simulation engine](simulation-engine.md) (drives),
  [Restaurants](restaurants.md) (create orders),
  [Drivers](drivers.md) (driver commands, events), [Scenarios](scenarios.md) (the orders a
  scenario's run holds), and [Verification](verification.md) (order states and event kinds).

## Code map

| Path | Purpose |
|---|---|
| `src/domain/orders/order.ts` | An order, as the classes `Order`, its unchanging part, and `OrderVersion`, each state, whose methods are the changes allowed |
| `src/domain/orders/order-status.ts`, `order-event-kind.ts`, `order-refusal.ts` | An order's statuses, event kinds, and refusals |
| `src/domain/orders/orders-state.ts` | Its state, as the class `OrdersState`, whose static methods are the module's commands and jobs, and what a step of it comes to |
| `src/domain/orders/order-event-record.ts`, `orders-outbox-event.ts`, `delivery-copy.ts` | The records it holds, each a class that checks its values, writes itself out for a digest, and compares itself by its fields |
| `src/domain/orders/deliveries-event-copy.ts` | Its own copy of an event it read from deliveries' outbox, keeping only what orders needs |
| `src/domain/orders/send-handoff.ts` | The effect that asks the engine to hand a request to deliveries |
| `src/domain/orders/orders-report.ts` | What it reports having done |
| `src/domain/orders/orders-rule-definitions.ts` | Orders' rules and their parameters, as the [Rules](#rules) table lists them |
| `src/domain/orders/orders-rules.ts` | `OrdersRules`: Orders' rule set, with each value in use read out once as its own type |
| `src/domain/orders/orders-communication.ts` | The code that applies its communication rules: the next inbox read and handoff retry, the read lag, and the retries per run. `order.ts` applies the transitions' checks |
| `src/infrastructure/orders/persisted-orders-rules.ts` | Orders' rule values in use, persisted as a rule set |
| `src/domain/orders/final-order-statuses.ts` | The statuses an order can end in |
| `src/domain/orders/order-event-id.ts` | `OrderEventId`, in a file of its own because deliveries' events hold it too. `OrderId` is beside `Order`, and `OrdersOutboxEventId` beside `OrdersOutboxEvent` |
