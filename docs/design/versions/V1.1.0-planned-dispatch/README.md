# V1.1.0-planned-dispatch — Planned Dispatch

## Version and status

- **Version:** `V1.1.0-planned-dispatch`, an approved design
  ([FND-40](../../decisions/project-foundation.md#fnd-40--kinds-of-version)), based on
  [`V1.0.0`](../V1.0.0/README.md).
- **Sources:** the real service's approved requirements for dispatch notifications and for
  driver reads, and its dispatch design records. None of these changes is built yet.
- **Status:** confirmed by the user on 2026-11-03.
  I01-E02-001
  recorded the confirmation.

## What this version is

`V1.0.0` with the dispatch work that the real service has approved but not built: alerts about
request outcomes, open requests visible to eligible drivers, the other driver notifications,
and the restaurant notifications. Dispatch itself, the ranking, the notification sequence, and
atomic acceptance, is already built in `V1.0.0` and does not change. The user chose these
contents on 2026-11-03.

## Pages

| Topic | Change from `V1.0.0` |
| --- | --- |
| Lifecycle | Unchanged: [V1.0.0 lifecycle](../V1.0.0/lifecycle.md) |
| [Actors and commands](actors-and-commands.md) | Drivers can read the open requests they are eligible for |
| [Events](events.md) | The planned driver and restaurant notifications |
| Business rules | Unchanged: [V1.0.0 business rules](../V1.0.0/business-rules.md) (user decision, 2026-11-03) |
| Module communication | Unchanged: [V1.0.0 module communication](../V1.0.0/module-communication.md) (user decision, 2026-11-03) |
| Failures | Unchanged: [V1.0.0 failures](../V1.0.0/failures.md) (user decision, 2026-11-03) |

## Undecided in this version

These are open in the real service's documents, so the simulator models their options with
option switches ([FND-37](../../decisions/project-foundation.md#fnd-37--inventory-coverage)):

- what each notification contains;
- what delivery and retry guarantees each notification has.

## Not in this version

An alert to the restaurant when no driver is eligible for, or accepts, a request: the real
service's requirements exclude it from the current scope.
