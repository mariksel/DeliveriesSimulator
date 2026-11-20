# Restaurants

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a capability in
  [FND-8](../decisions/project-foundation/purpose-and-scope.md#fnd-8--capability-list), as Customers
  and restaurants, and made the module that holds Customers in
  [FND-83](../decisions/project-foundation/architecture-and-code.md#fnd-83--types-owned-by-their-modules).
  Not implemented yet, apart from a restaurant's place, and customers with their stored
  addresses, built in I03-E09-002
  ([FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)). The
  [implementation roadmap](../roadmap/implementation-roadmap.md) says which stage builds the
  rest.

## Current and approved responsibilities

The simulated restaurants, who create orders and hand them over, with their IDs and places. All
of them follow behaviour profiles
([FND-48](../decisions/project-foundation/simulation-model.md#fnd-48--simulation-model)). Drivers
belong to [Drivers](drivers.md)
([FND-56](../decisions/project-foundation/architecture-and-code.md#fnd-56--module-boundaries)). Like
the other business modules, it writes its rules with the [Business rules](business-rules.md)
abstractions and never
knows it is simulated
([FND-83](../decisions/project-foundation/architecture-and-code.md#fnd-83--types-owned-by-their-modules)).

### Customers, its submodule

The simulated customers, who receive deliveries, also following behaviour profiles. It sits in
the Restaurants folder and counts as part of the module, as in the real service.

A customer belongs to one restaurant, which places their orders. Each has one or more stored
delivery addresses: a point, its area, and its stored distance, the route along the city's
streets from the customer's restaurant when the address was stored. An address never changes
once stored, so the routing fallback gives the distance that route had then
([FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
A scenario lists its customers, and each create-order step names its customer and one of their
addresses, which must belong to the restaurant that places the order
([Scenario format](scenario-format.md#a-customer)).

## Key approved business rules

- Restaurants with their locations, staff, service areas, and hours, and customers with their
  addresses
  ([FND-38](../decisions/project-foundation/capabilities-and-inventory.md#fnd-38--order-detail)).
- Restaurant and customer behaviour profiles and their controls
  ([FND-48](../decisions/project-foundation/simulation-model.md#fnd-48--simulation-model)), stored
  as records of their own
  ([FND-58](../decisions/project-foundation/architecture-and-code.md#fnd-58--stored-records-and-shared-files)).
- Restaurants create orders; customers do not order themselves
  ([FND-33](../decisions/project-foundation/purpose-and-scope.md#fnd-33--out-of-scope)).
- Restaurant commands, starting with
  [V1.0.0 actors and commands](../versions/V1.0.0/actors-and-commands.md).

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation/architecture-and-code.md#fnd-56--module-boundaries),
[FND-83](../decisions/project-foundation/architecture-and-code.md#fnd-83--types-owned-by-their-modules)):

- **Uses:** [Orders](orders.md) (create orders), [Map and routing](map-and-routing.md) (where
  they are), and [System](system.md) (time, randomness, and math).
- **Used by:** [Business view](business-view.md) (restaurants and customers),
  [Scenarios](scenarios.md) (restaurant and customer profiles),
  [Simulation engine](simulation-engine.md) (drives the actors),
  [Notifications](notifications.md) (restaurants' devices), [Orders](orders.md) (the restaurant
  an order is from), and [Drivers](drivers.md) (where restaurants are).

## Code map

| Path | Purpose |
|---|---|
| `src/domain/restaurants/restaurant-place.ts` | A restaurant and where it is, as the class `RestaurantPlace` |
| `src/infrastructure/restaurants/persisted-restaurant-place.ts` | A restaurant's place, persisted |
| `src/domain/restaurants/customers/customer.ts` | A customer of one restaurant, as the class `Customer` |
| `src/domain/restaurants/customers/delivery-address.ts` | A customer's stored delivery address, with its stored distance, as the class `DeliveryAddress` |
| `src/infrastructure/restaurants/customers/persisted-customer.ts` | Customers and their addresses, persisted |
