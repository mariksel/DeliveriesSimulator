# V1.0.0 — Built Today

## Version and status

- **Version:** `V1.0.0`, a built snapshot
  ([FND-40](../../decisions/project-foundation.md#fnd-40--kinds-of-version)).
- **State described:** the real service's working tree on 2026-11-03, including uncommitted
  changes and the module copies, which are built and awaiting the real service's review
  ([FND-45](../../decisions/project-foundation.md#fnd-45--version-folder-layout)).
- **Status:** Observed in the real service's code, and confirmed by the user on 2026-11-03.
  I01-E02-001
  recorded the confirmation.

## What this version is

The real service as its code stands on 2026-11-03. It includes the rename of the orders types to
the restaurants names, and the module copies design, which is built and awaiting the real
service's review. The planned dispatch is `V1.1.0-planned-dispatch`.

## Undecided in this version

The real service has not decided how often the driver app sends its location. A location older
than 5 minutes makes a driver ineligible, so the interval decides how often drivers drop out
of dispatch. The simulator models it as an option switch with presets and a tunable value (user
decision, 2026-11-03):

- **Presets:** every 10 seconds while connected; every 60 seconds in the background; only when
  the driver moves.
- **Tunable value:** any interval from 5 seconds to 5 minutes, which actor behaviour profiles
  can vary per driver.

The batch fallback holds at most 100 points, so its size is decided.

## Pages

| Page | Covers | Item |
| --- | --- | --- |
| [Lifecycle](lifecycle.md) | Order states, transitions, and pending requests | I01-E02-001 |
| [Actors and commands](actors-and-commands.md) | Who acts, through which commands, and which module decides | I01-E02-001 |
| [Events](events.md) | Every event kind and outbox kind in both modules | I01-E02-001 |
| [Business rules](business-rules.md) | Eligibility, ranking, the notification sequence, acceptance, status and location, orders and prices | I01-E02-002 |
| [Module communication](module-communication.md) | Outboxes, inboxes, retries, idempotency, handoff, push, jobs | I01-E02-003 |
| [Failures](failures.md) | Races, give-ups, duplicates, timing, outside failures, data problems | I01-E02-004 |
