# I03-E09-007 — Demonstration scenario

| Field | Value |
| --- | --- |
| ID | `I03-E09-007` |
| Parent | [I03-E09 — City and map](../../../I03-E09-city-and-map-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-11 |
| Last updated | 2026-11-11 |
| Completed | 2026-11-11 |

## Scope

A second built-in scenario, listed first on the start page, that demonstrates the whole process
as it is built so far. The one-order scenario stays as the small case the tests pin. Nothing
opens by itself on start
([FND-49](../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-49--scenarios)).

It shows, in one run:

- **Many orders and drivers:** several restaurants, customers, and addresses across the city's
  areas, with orders overlapping in time, dispatch choosing among several drivers, and a driver
  in another area never eligible.
- **Why each driver is picked:** drivers the rules turn down, one offline, one whose location is
  too old, one too far from the restaurant, and one busy carrying an order far away; and two
  drivers at the same distance ranked by availability.
- **Indirect effects:** a driver ignores a request, so the next driver is notified, and a
  restaurant runs late. A customer who won't take an order is left out until the failed-delivery
  path, [I03-E03-007](../../../../../../I03-E03-paths-and-commands/High/I03-E03-007-failed-delivery-path.md),
  can settle that order.
- **Refusals and changes:** a command the service refuses, such as a pick-up before the order is
  ready, and rule changes partway through. A function-version switch is left out, as every state
  function has only version 1 so far.
- **Two drivers race:** both accept the same request; the second is refused.
- **Stuck, then freed by a rule:** a request no driver can take waits until a rule change widens
  the maximum distance, and is then dispatched.
- **Customers and order paths:** a customer with two addresses and repeat orders, two customers of
  one restaurant, and an order marked ready before its delivery is requested.
- **Every stage at once:** about three quarters of the way through, orders are at every stage,
  so the map shows every view at once; every order then finishes, so the run passes the
  correctness criteria.

## Acceptance criteria

- The start page lists the demonstration scenario first, and the one-order scenario after it.
- Running it shows each situation above, and it passes the correctness criteria.
- Its run is pinned, and saved at "minimum" with the other kept snapshot runs.

## Dependencies

- [I03-E09-002 — Delivery addresses](I03-E09-002-delivery-addresses.md)

## Sources and evidence

- [Scenarios](../../../../../../../../../design/modules/scenarios.md)
- [Scenario format](../../../../../../../../../design/modules/scenario-format.md)
- [Project foundation: FND-49](../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-49--scenarios)

## Status history

- 2026-11-11 — Created as In Progress: the user asked for the scenario shown first on starting
  the app to demonstrate the whole process, and chose a new scenario listed first, the
  situations above, and nothing opening by itself. As orders left under way at the end fail the
  valid final state criterion, the user then chose every stage partway with every order
  finishing, and left out a customer who won't take an order until it can be settled
  ([FND-49](../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-49--scenarios)).
- 2026-11-11 — Done: the start page lists the demonstration first, a busy lunch of ten
  orders in a four-area city that shows each situation above and passes every criterion; its
  digest is pinned, and its run is kept at "minimum" with the one-order run. `npm run check`
  passes, but for the format of the workspace file, which was edited by hand outside this item
  ([FND-49](../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-49--scenarios)).

## Priority history

- 2026-11-11 — Created at High priority, as the scenario anyone sees first.
