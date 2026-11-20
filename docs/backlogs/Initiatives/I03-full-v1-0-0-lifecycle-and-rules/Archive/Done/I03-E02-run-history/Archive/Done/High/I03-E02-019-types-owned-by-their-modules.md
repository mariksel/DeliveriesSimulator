# I03-E02-019 — Types owned by their modules

| Field | Value |
| --- | --- |
| ID | `I03-E02-019` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-06 |
| Last updated | 2026-11-07 |
| Completed | 2026-11-07 |

## Scope

Each type lives in the module it belongs to, and the business modules do not know they are
simulated
([FND-83](../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-83--types-owned-by-their-modules)).

- `src/domain/ids.ts` and `src/domain/quantities.ts` are split up. Each ID sits beside the class
  it identifies, and `OutboxEventId` becomes one ID for each module's outbox.
- A System module holds the abstractions about time, randomness, and math. Time is an
  interface, `Instant`, which the Simulation engine's `SimTime` implements, and `Duration` is a
  value class. The business modules use only these.
- Each module holds its own rules. Business rules keeps only the abstractions that exist
  today, the tuned values' checks; the rule abstractions themselves are
  [I03-E04-012](../../../../../../I03-E04-business-rules/Archive/Done/High/I03-E04-012-rule-abstractions.md).
- Drivers becomes a module, with Deliveries as its submodule.
- Stored names, such as log sources and stored function IDs, follow the new modules, so every
  pinned digest changes once.

The shared helpers in `src/domain/`, such as `required`, `fields-of`, `version-chain`,
`inbox-position`, and `digest-parts`, stay where they are.

## Acceptance criteria

- `src/domain/ids.ts` and `src/domain/quantities.ts` no longer exist, and
  `src/domain/business-rules/` holds no module's rules.
- No business module (Orders, Drivers with Deliveries, Map and routing, Restaurants with
  Customers) imports anything from the Simulation engine or Scenarios, and the architecture
  check enforces this.
- Business code reads and moves time only through `Instant` and `Duration`.
- The module map, every affected module page, and the capability ownership page show the new
  modules, and the architecture check reads the new graph.
- A pinned digest changes only where a name the log records changes, and the run's results are
  otherwise unchanged: the same entries in the same order, and the same commits. The user reworded
  this on 2026-11-07, since no renamed name is in the log.
- The city benchmark is run and recorded, with time held as objects.

## Dependencies

- [I03-E02-018 — Typed core](I03-E02-018-typed-core.md)

## Sources and evidence

- [Project foundation: FND-83](../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-83--types-owned-by-their-modules)
- [Project foundation: FND-56](../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-56--module-boundaries)
- [Project foundation: FND-72](../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-72--code-style)
- [Capability and module map](../../../../../../../../../design/modules/README.md)
- [Code style](../../../../../../../../../design/governance/code-style.md)

## Internal phases

The user approved the phases and the plan below on 2026-11-06.

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E02-019-P01` | Module map and pages | Done | 2026-11-07 | Approved; Implemented |
| `I03-E02-019-P02` | Modules moved into place | Done | 2026-11-07 | Approved; Implemented |
| `I03-E02-019-P03` | Rules into their modules | Done | 2026-11-07 | Approved; Implemented |
| `I03-E02-019-P04` | The System module and time as an interface | Done | 2026-11-07 | Approved; Implemented |
| `I03-E02-019-P05` | Branded numbers to their owners | Done | 2026-11-07 | Approved; Implemented |
| `I03-E02-019-P06` | IDs beside their classes | Done | 2026-11-07 | Approved; Implemented |

### Plan

The docs come first, because the architecture check reads the module graph. Then the folders
move, so later phases put types where they end up. After each phase, `npm run check` passes.

1. **P01, module map and pages:** the graph gains System, which uses nothing and which every
   module may use; Drivers, which takes Deliveries' place and its edges; and Restaurants, which
   takes the place of Customers and restaurants. Business rules stays, as the module of rule
   abstractions the others use. The pages follow: a System page, a Drivers page with a
   Deliveries section, a Restaurants page with a Customers section, each module's own rules on
   its page, and the capability ownership page. A submodule sits inside its module's folder, so
   the architecture check treats it as part of that module.
2. **P02, modules moved into place:** drivers, their availability and locations go to
   `src/domain/drivers/`, and requests, assignments, notifications, and the outbox to
   `src/domain/drivers/deliveries/`. A restaurant's place goes to `src/domain/restaurants/`.
   Scripted steps, with their actor and order name, go to Scenarios, and the Simulation engine
   runs them through an interface of its own. Application.Core, Infrastructure, and the tests
   follow. Log sources and stored function IDs are renamed to the modules that own them, and
   every pinned digest is recalculated once.
3. **P03, rules into their modules:** eligibility, ranking, the notification order, and the
   dispatch values go to Drivers; each of Orders and Deliveries gets its own communication
   values, for its own inbox; the final order statuses go to Orders.
4. **P04, System and time:** `src/domain/system/` holds `Instant`, an interface; `Duration`, a
   value class; a clock interface; a random source interface; and `Fraction`, `Count`, and
   `Position`. The Simulation engine's `SimTime` implements `Instant` and its seeded random
   source implements the random source. Business code compares and moves times only through
   `Instant`'s methods. Infrastructure persists a time through `SimTime`, which it recognises
   with a type check, since `as` is not allowed. The digest writes the same milliseconds, so it
   does not change, and the benchmark records the cost of time as objects.
5. **P05, numbers to their owners:** `VersionNumber` beside the version chain, `Metres` and
   `Degrees` in Map and routing, `Score` and `Factor` in Drivers, `LogSequence` in the Event log,
   and `WallTime`, `Seed`, `RandomWord`, and a clock speed of its own in the Simulation engine.
   `src/domain/quantities.ts` goes.
6. **P06, IDs beside their classes:** each ID and its creator move to the file of the class it
   identifies, and `OutboxEventId` becomes one ID per module's outbox. `src/domain/ids.ts`
   goes, and the lint exception for `as` moves to the creators where they now are.

### Decided points

The user decided the open points on 2026-11-06
([FND-83](../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-83--types-owned-by-their-modules)):

- **Restaurants:** Restaurants is a module of its own, with Customers as its submodule, in place
  of Customers and restaurants. It owns `RestaurantId` and a restaurant's place, and Orders and
  Drivers use it.
- **Scripted steps:** they move to Scenarios, with their actor and order name, and the
  Simulation engine runs them through an interface of its own.
- **Pricing rules:** each goes to the module that owns it in the real service, when it is built.
- **Business rules stays:** on 2026-11-07 the user revised the plan: Business rules stays, as a
  generic module of rule abstractions, and keeps its edges; I03-E04-012 builds the abstractions.
  The "Rules and decisions" capabilities stay with it.
- **Speed:** the benchmark runs after P04, and the user sees the numbers before P05 starts.

## Status history

- 2026-11-06 — Created as Proposed: the user asked for types to live in their own modules, and
  chose how in FND-83. The plan waits for the user's review.
- 2026-11-06 — In Progress: the user decided the open points and asked for the work to go on;
  P01 started.
- 2026-11-07 — Scope revised: the user chose that Business rules stays, as a module of rule
  abstractions that I03-E04-012 builds, so this item moves each rule into its module and leaves
  Business rules the tuned values' checks.
- 2026-11-07 — P01 Done: the module map shows System, Drivers with its Deliveries submodule, and
  Restaurants with its Customers submodule, and Business rules as the module of rule
  abstractions. The Drivers, Restaurants, System, and Business rules pages say so, every link
  follows the renamed pages, and the architecture check reads the new graph, including what
  every module uses. Until P02 moves the code, the Deliveries folders are outside any module, so
  the check does not cover them.
- 2026-11-07 — P02 Done: the code is in `src/*/drivers/`, with Deliveries in its `deliveries/`
  folder, and a restaurant's place in `src/*/restaurants/`. The drivers' state is its own class,
  `DriversState`, beside `DeliveriesState` in the main root, as the user chose; a Deliveries
  command that reads or changes the drivers takes their state, and gives it back when it changes
  it. The stored function IDs are `drivers.deliveries.<name>@1`, with new pinned fingerprints, so
  a run saved before this no longer loads. Scenarios holds the scripted step, and converts each
  into the engine's own input, as the user chose. No log source changed, since no driver event
  exists yet, so every pinned digest and the city day's digest stay the same; the day took
  48.1 s. npm run check passes, with a longer timeout for the one test that writes out a whole
  run at every step.
- 2026-11-07 — P03 Done: eligibility, ranking, the notification sequence, the dispatch values,
  and a driver's availability are in Drivers, and the final order statuses in Orders. Orders and
  Deliveries each have their own communication values, for their own inbox, in the config values
  in use, as the user chose. Business rules holds only the tuned values' checks. No pinned digest
  changed, since no pinned run has a config change, and the city day kept its digest, at 45.4 s.
  npm run check passes.
- 2026-11-07 — P04 Done: System holds `IInstant`, an interface, `Duration`, a value class, a
  clock and a random source as interfaces, and `Count`, `Position`, and `Fraction`. The Simulation
  engine's `SimTime` implements `IInstant`, and no business module names it. Every pinned digest
  and fingerprint holds, and the city day kept its digest, at 44.0 s and a peak of 1,321 MB, so
  the numbers go to the user before P05, as agreed. npm run check passes.
- 2026-11-07 — P05 Done: the user saw P04's numbers and asked for the work to go on. Each module's
  branded numbers are in its own `numbers.ts`, `VersionNumber` beside the version chain, and a
  clock speed has its own `SpeedMultiple`; `src/domain/quantities.ts` is gone. npm run check
  passes.
- 2026-11-07 — P06 Done: each ID sits beside the class it identifies, and `OutboxEventId` is one ID for
  each module's outbox. As the user chose, `OrderEventId`, `DeliveryEventId`, `CommitId`, and
  `SessionId`, which two classes hold of each other, have files of their own, and Scenarios may
  use Orders. `src/domain/ids.ts` is gone, and the `as` exception follows the creators. npm run
  check passes.
- 2026-11-07 — Done: the user reworded the criterion on pinned digests, since none changed, and every
  other acceptance criterion is met, so the item moved to the Done archive.

## Priority history

- 2026-11-06 — Created at High priority, like the other items of this epic.
