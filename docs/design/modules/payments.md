# Payments

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a capability in
  [FND-8](../decisions/project-foundation.md#fnd-8--capability-list). Not implemented: no source
  exists. The [implementation roadmap](../roadmap/implementation-roadmap.md) says which stage
  builds it.

## Current and approved responsibilities

Simulated money movements: prices charged, cash collected, cash confirmations, and payment
returns. Each pricing rule goes to the module that owns it in the real service, written with
the [Business rules](business-rules.md) abstractions
([FND-83](../decisions/project-foundation.md#fnd-83--types-owned-by-their-modules)).

## Key approved business rules

- Cash only: other payment methods are not simulated until the real service has them
  ([FND-33](../decisions/project-foundation.md#fnd-33--out-of-scope)).
- It only moves money, unless the real service has a pricing rule in its payments
  ([FND-83](../decisions/project-foundation.md#fnd-83--types-owned-by-their-modules)).
- Accepting a return never waits for a payment return
  ([FND-39](../decisions/project-foundation.md#fnd-39--source-conflicts-resolved)).
- Cash reconciles for every order
  ([FND-29](../decisions/project-foundation.md#fnd-29--business-correctness)).

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries)):

- **Uses:** [Business rules](business-rules.md) (pricing rules), for its abstractions.
- **Used by:** [Business view](business-view.md) (cash), [Fault injection](fault-injection.md)
  (breaks steps), [Simulation engine](simulation-engine.md) (drives), and [Orders](orders.md)
  (money movements).

## Code map

No source exists yet. Add paths here when code is added.
