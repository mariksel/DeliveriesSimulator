# V1.1.0-planned-dispatch — Actors and Commands

## Version and status

- **Version:** `V1.1.0-planned-dispatch`, an approved design
  ([FND-40](../../decisions/project-foundation.md#fnd-40--kinds-of-version)), based on
  [`V1.0.0`](../V1.0.0/README.md).
- **Sources:** the real service's approved requirements for dispatch notifications and for
  driver reads, and its dispatch design records. None of these changes is built yet.
- **Status:** confirmed by the user on 2026-11-03.
  I01-E02-001
  recorded the confirmation.

## Changes from V1.0.0

Everything in [V1.0.0 actors and commands](../V1.0.0/actors-and-commands.md) applies, with one
addition.

| Actor | Addition |
| --- | --- |
| Driver | Reads the open delivery requests they are eligible for, with the customer details, including requests they were not notified about. Only eligible drivers see a request. |
