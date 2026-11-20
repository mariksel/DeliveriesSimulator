# I03-E09-002 — Delivery addresses

| Field | Value |
| --- | --- |
| ID | `I03-E09-002` |
| Parent | [I03-E09 — City and map](../../../I03-E09-city-and-map-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-10 |
| Last updated | 2026-11-11 |
| Completed | 2026-11-11 |

## Scope

Customers and their delivery addresses, in Restaurants' Customers submodule: each customer
belongs to a restaurant, with stored addresses, each a point, its area, and its stored
distance, which never change once an order has used them
([FND-38](../../../../../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-38--order-detail)).
A scenario lists its customers; an address gives an exact point or only an area, where the
city's seed picks a point. Every create-order step names its customer and address, as in
`V1.0.0` an order always has one. The routing stand-in of
[I03-E04-005](../../../../../../I03-E04-business-rules/High/I03-E04-005-routing-interface-and-stand-in.md)
measures to the address, and the Map view shows a pin at each address.

## Acceptance criteria

- A customer belongs to one restaurant, and an order's customer and address belong to the
  restaurant that places it.
- An address given only by an area gets a point there from the seed, the same on every run.
- A create-order step without a customer and address is refused when the scenario is read.
- The Map view shows each order's address.

## Dependencies

- [I03-E09-001 — Simple city](I03-E09-001-simple-city.md)
- [I03-E09-003 — Map view](I03-E09-003-map-view.md)

## Sources and evidence

- [Orders](../../../../../../../../../design/modules/orders.md)
- [V1.0.0 business rules](../../../../../../../../../design/versions/V1.0.0/business-rules.md)
- [Project foundation: FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)

## Internal phases

The user approved the plan below on 2026-11-11, so the implementer starts at P01. The details are in
[FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward).

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E09-002-P01` | Customers and addresses | Done | 2026-11-11 | Implemented; Tested |
| `I03-E09-002-P02` | Orders carry them | Done | 2026-11-11 | Implemented; Tested |
| `I03-E09-002-P03` | Addresses on the map | Done | 2026-11-11 | Implemented; Tested |

### Plan

After each phase, `npm run check` passes.

1. **P01, customers and addresses:** Restaurants' Customers submodule holds customers, each of a
   restaurant, with stored addresses: a point, its area, and the route along the streets from the
   restaurant when stored. Scenarios list them; every create-order step names its customer and
   address, which must belong to the step's restaurant. Stored scenarios from before are refused,
   saying why. The built-in scenario and the test files gain customers.
2. **P02, orders carry them:** an order holds its customer and address, and the delivery request
   Orders hands to Deliveries carries the address's point, so the driver knows where to go. This
   changes the request event's data, and every run's log. A run's script holds the customers and
   addresses, so saved runs from before are refused, saying why.
3. **P03, addresses on the map:** a house pin at each undelivered order's address; delivered
   parcels faint at their addresses, with a Delivered switch; tests, and the design pages.

## Status history

- 2026-11-10 — Created as Proposed: the user brought the Map view and a simple city forward from
  `I07`, to be built next
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
  It starts when its dependencies are Done.
- 2026-11-11 — Moved from Proposed to Ready: its dependencies, I03-E09-001 and I03-E09-003, are Done.
- 2026-11-11 — Rescoped, still Ready: the user chose customers with stored addresses, and corrected
  that an order always has an address, so a create-order step names its customer and address
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward).
- 2026-11-11 — Moved from Ready to In Progress: the user approved the plan, choosing the route from the
  restaurant as an address's stored distance, a pin while an order is on its way, delivered
  parcels faint with a switch, and refusing older data with no customers ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-11 — P01 Done, still In Progress: scenarios read, store, and check customers and their
  addresses, and stored scenarios from before customers that create orders are refused. Refusing
  older saved runs moved to P02, as a run's script gains customers there
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-11 — P02 Done, still In Progress: orders carry their customer and address, the
  delivery request carries the address's point, and saved runs from before that made orders are
  refused. The user had the state functions' fingerprints updated in place, as the state's shape
  changed
  ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-11 — P03 Done, and the item Done: the Map view pins each order on its way at
  its address, in the restaurants' views, and keeps each delivered order faint there, behind a
  Delivered switch. `npm run check` passes, but for the format of the workspace file, which was
  edited by hand outside this item ([FND-90](../../../../../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).

## Priority history

- 2026-11-10 — Created at High priority, like the rest of the stage, when the user brought the
  map forward.
