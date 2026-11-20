# I03-E02-018 — Typed core

| Field | Value |
| --- | --- |
| ID | `I03-E02-018` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-06 |
| Last updated | 2026-11-06 |
| Completed | 2026-11-06 |

## Scope

Domain and Application work only with strongly typed values. JSON parsing, serializing, and the
JSON check move to Infrastructure, at persistence and other IO. Commits are now the run's record
and the repository owns persistence, so the core no longer needs JSON-shaped data.

- Each kind of log entry has typed data, and the log's JSON check moves to the persisted log
  entry.
- Refusals are typed codes, and an indirect effect's data is typed.
- Scenario files are read and parsed in Infrastructure, which gives Application a typed scenario.
- The run digest and the run comparison work over typed entries, so every pinned digest changes
  once.
- Every Domain type is an immutable class with a private constructor and two static
  constructors, `createNew` and `create`, which check its invariants. A module's state is a class
  too, and its commands are static methods
  ([FND-73](../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-73--immutable-architecture)).
- Fields with a fixed set of values or an identity get const-object types or branded IDs.
- Simulated times, durations, counts, and amounts get branded number types.
- A new layer, Application.Core, holds a run's records, its pure steps, the typed log entry kinds,
  and the interfaces Infrastructure implements
  ([FND-82](../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-82--application-core-layer)).

## Acceptance criteria

- No file in Domain, Application.Core, or Application uses `JsonValue`, `JSON.parse`,
  `JSON.stringify`, or imports a JSON file, and a test checks this.
- Every reader of a log entry gets typed data, with no lookup by string key.
- No Domain type is a plain object literal or an interface: each is an instance of its class,
  made only by its static constructors, and `create` throws on values that break an invariant.
- Every pinned digest is recalculated once, and the docs and tests that hold one are updated.
- The run's results are otherwise unchanged: the same log entries in the same order, and the
  same commits.

## Dependencies

- [I03-E02-007 — Function identity and the repository](I03-E02-007-function-identity-and-the-repository.md)

## Sources and evidence

- [Project foundation: FND-72](../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-72--code-style)
- [Project foundation: FND-65](../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-65--event-log-entries)
- [Project foundation: FND-82](../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-82--application-core-layer)
- [Code style](../../../../../../../../../design/governance/code-style.md)
- [Layers](../../../../../../../../../design/architecture/layers.md)

## Internal phases

The user approved these phases on 2026-11-06, when choosing where the work goes, and the
Application.Core layer the same day, which P07 builds first.

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E02-018-P01` | Typed log entries | Done | 2026-11-06 | Approved; Implemented |
| `I03-E02-018-P02` | Typed refusals and effect data | Done | 2026-11-06 | Approved; Implemented |
| `I03-E02-018-P03` | Scenario files read in Infrastructure | Done | 2026-11-06 | Approved; Implemented |
| `I03-E02-018-P04` | Digest and comparison over typed entries | Done | 2026-11-06 | Approved; Implemented |
| `I03-E02-018-P08` | Domain types as immutable classes | Done | 2026-11-06 | Approved; Implemented |
| `I03-E02-018-P05` | Typed fixed sets and identities | Done | 2026-11-06 | Approved; Implemented |
| `I03-E02-018-P06` | Branded times, durations, counts, and amounts | Done | 2026-11-06 | Approved; Implemented |
| `I03-E02-018-P07` | Application.Core layer | Done | 2026-11-06 | Approved; Implemented |

### P08 plan, for the user's review

The rules are in
[FND-73](../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-73--immutable-architecture).
Each class has readonly fields, is frozen when made, has a private constructor, and is made by
`createNew` or `create`; `create` throws on values that break an invariant. Outcomes stay
discriminated unions: changes, command results, orders' answer, steps, reports, and follow-ups.

Classes, by module, in the order of work:

1. **Shared and Simulation engine:** `Coordinates`, `InboxPosition`, `RandomStream`, and
   `SeededRandom`. The version chain becomes a `previous` link and a `number` on each version
   class, and each version class makes its next version with a static method, instead of
   `nextVersion` spreading a plain object.
2. **Business rules:** `DispatchValues` and `CommunicationValues`.
3. **Orders:** `Order`, `OrderVersion`, `DeliveryCopy`, `DeliveryCopyVersion`,
   `OrderEventRecord`, `OrdersOutboxEvent`, `DeliveriesEventForOrders`, `OrderProgress`, and
   `OrdersState`, whose commands become static methods such as `OrdersState.pickUp`.
4. **Deliveries:** `Driver`, `DriverVersion`, `DriverLocation`, `NewDriver`, `Notification`,
   `NotificationVersion`, `OrderDelivery`, `OrderDeliveryVersion`, `OrderCopy`,
   `DeliveryEventRecord`, `DeliveriesOutboxEvent`, `OrdersEventForDeliveries`, `RestaurantPlace`,
   `DeliveryHandoff`, and `DeliveriesState`, with its commands as static methods.
5. **The function registry:** each stored function ID points at its static method. The IDs and
   the pinned fingerprints stay as they are.
6. **Lint and docs:** Domain's `functional/no-classes` rule goes, a rule or review check keeps
   constructors private, and the module pages, code maps, and code style follow.

After each module, `npm run check` passes and the pinned digests and fingerprints hold; after the
last, the city benchmark runs once. Persisted mappings rebuild instances through `create`, and
tests build them through the static constructors or test builders, not object literals.

The user decided the open points on 2026-11-06: Verification's records and results, and the
bundles rules read or give back, stay plain readonly data; the generic log entry stays as it is;
and Application.Core's types never extend a Domain type, so Core's log data holds the Domain
instance in a field.

## Status history

- 2026-11-06 — Created as In Progress: the user asked for it and for the refactoring to start,
  after choosing the rule and its reach in FND-72.
- 2026-11-06 — P07 Done: the Application.Core layer exists, with a run's records, its pure steps,
  and the interfaces Infrastructure implements. The architecture check enforces its rules, and
  npm run check passes.
- 2026-11-06 — P01 Done: each kind of log entry has typed data, defined in Application.Core.
  Verification reads a run's record from typed entries there, and the JSON check moved to the
  persisted log entry. No reader looks up data by key, and the pinned digests hold.
- 2026-11-06 — P02 Done: refusals are typed codes, the script's own beside orders' and
  deliveries', and the user chose a set of indirect effect kinds that starts empty, for
  I03-E02-013 to add the first. `JsonValue` now lives only in Infrastructure, and the log is
  unchanged.
- 2026-11-06 — P03 Done: Infrastructure reads, parses, and validates scenario files, the built-in
  ones included, behind two Core abstractions that give Application a typed scenario. The
  self-tests' known case is a typed scenario, as the user chose, and the pinned digests hold.
- 2026-11-06 — P04 Done: the digest writes each kind of entry out field by field, and the run
  comparison uses typed equality per kind, as the user chose, with tests that every field counts
  and that the two never disagree. Every pinned digest was recalculated once. An ESLint rule
  now fails any JSON parsing, writing, or JSON import in Domain, Application.Core, or
  Application, tests included, which meets the first acceptance criterion.
- 2026-11-06 — P08 added as Proposed: the user chose that every Domain type becomes an immutable
  class, amending FND-73, and that this is a phase of this item, done before P05 and P06.
- 2026-11-06 — P08 In Progress: the user reviewed the plan and decided its open points, and the
  work started with the shared types.
- 2026-11-06 — P08 Done: every Domain type the user named is an immutable class, made only by
  its static constructors, and each module's commands are static methods of its state. The
  stored function IDs, the pinned fingerprints, and the pinned digests hold, and npm run check
  passes. The interfaces left in Domain are outcomes, steps, reports, follow-ups, rule bundles,
  Verification's records, and the generic log entry, as the user chose.
- 2026-11-06 — P05 Done: order statuses in deliveries are `OrderStatus`, a script's actor and
  order name, a scenario's version, and a built-in scenario's ID are branded, output effects are
  a set of kinds that starts empty, and Verification's run record is typed, through new module
  links to Orders and Deliveries, as the user chose. The log and the digests are unchanged.
- 2026-11-06 — P06 Done: simulated times, durations, wall times, counts, version numbers, log
  sequences, positions, distances, angles, seeds, random words, fractions, multipliers, and
  scores are branded numbers, made only by creators that check them, with typed arithmetic, as
  the user chose. Infrastructure makes them when it reads a scenario or loads a run. The log, the
  commits, and every pinned digest are unchanged, the city day keeps its digest, and npm run
  check passes.
- 2026-11-06 — Done: every phase is Done and every acceptance criterion is met, so the item
  moved to the Done archive.

## Priority history

- 2026-11-06 — Created at High priority, like the other items of this epic.
