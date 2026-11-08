# System

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved in
  [FND-83](../decisions/project-foundation.md#fnd-83--types-owned-by-their-modules), and built
  in
  I03-E02-019.
  The clock and the random source are interfaces nothing calls yet.
  [FND-85](../decisions/project-foundation.md#fnd-85--system-submodules) split it into eight
  submodules and moved the shared helpers of the Domain and Infrastructure roots into them;
  I03-E02-020
  built that on 2026-11-07.

## Current and approved responsibilities

The abstractions about time, randomness, and math that the business modules use, so that they
never know they are simulated. In the user's words, the business modules "should just depend on
some world whose implementation is not known"
([FND-83](../decisions/project-foundation.md#fnd-83--types-owned-by-their-modules)). It holds
abstractions only. The [Simulation engine](simulation-engine.md) provides their
implementations: a simulated time is one implementation of time.

It also holds what every module shares, so that no layer's root holds a file of its own
([FND-85](../decisions/project-foundation.md#fnd-85--system-submodules)). Each kind of thing is a
submodule, a folder in `src/domain/system/`:

| Submodule | Holds |
| --- | --- |
| `time` | `IInstant`, `Duration`, the clock, and their test helpers |
| `randomness` | The random source |
| `math` | `Count`, `Position`, `Fraction`, and `isWhole` |
| `validation` | The checks for a bug: `required`, `unreachable`, and `refuse` |
| `classes` | `FieldsOf`, which a Domain class is made from, and the `deepFrozen` test helper |
| `digests` | How a record is written out for a digest, and `allTrue` |
| `records` | A record's version chain and its version number |
| `messaging` | How far an inbox has read |

Infrastructure's shared code is System's too, in `src/infrastructure/system/`: `json` (the JSON
value and the JSON check, which only Infrastructure makes), `records` (how grouped records and
counts are persisted), `messaging` (a persisted inbox and its position), and `functions` (the
stored function contract that the modules' functions register with). The architecture check
refuses a file added directly in `src/domain` or `src/infrastructure`.

## Key approved business rules

- **Time:** `IInstant` is an interface, which the Simulation engine's `SimTime` implements.
  Business code compares and moves times only through it. Each moment knows how long after the
  start of its timeline it is, so moments from different implementations compare. Loading saved
  moments takes an `InstantAt`, a function that gives the moment so many milliseconds after the
  start, so a module's persisted records never name the Simulation engine.
- **Durations:** `Duration` is an immutable value class, made from milliseconds or seconds, since
  the rules state durations as fixed amounts.
- **A clock:** an interface for reading the time, should a business module ever need to.
- **Randomness:** a random source is an interface, which the Simulation engine's seeded random
  source implements.
- **Math:** `Fraction`, `Count`, and `Position`.
- **Records:** a record that changes keeps a chain of versions, each linked to the one before
  ([FND-81](../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions)).
- **Messaging:** an inbox's position says where it starts scanning and the latest event it has
  read, so it can leave out events older than its read lag.

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph):

- **Uses:** no other module.
- **Used by:** every module.

## Code map

| Path | Purpose |
|---|---|
| `src/domain/system/time/instant.ts` | The abstract moment, `IInstant`, with the later and earlier of two moments, sorting by time, and `InstantAt` |
| `src/domain/system/time/duration.ts` | A length of time, as the value class `Duration` |
| `src/domain/system/math/math.ts` | `Count`, `Position`, and `Fraction`, branded numbers made by creators that check them |
| `src/domain/system/time/clock.ts`, `randomness/random-source.ts` | The clock and the random source, as interfaces |
| `src/domain/system/time/instant.testing.ts` | A moment for the business modules' tests, which may not use the simulated time |
| `src/domain/system/validation/required.ts`, `unreachable.ts`, `refuse.ts` | The checks for a bug: a value that must exist, a case the compiler proved cannot happen, and a number that breaks its rule |
| `src/domain/system/classes/fields-of.ts`, `deep-freeze.testing.ts` | The fields a Domain class is made from, and, for tests, a deep-frozen copy of a value |
| `src/domain/system/records/version-chain.ts` | A record's version number, and the checks on its chain of versions |
| `src/domain/system/messaging/inbox-position.ts` | How far an inbox has read |
| `src/infrastructure/system/json/`, `records/`, `messaging/`, `functions/` | Infrastructure's shared code: the JSON check, persisted record groups and counts, a persisted inbox, and the stored function contract |
| `src/domain/system/digests/digest-parts.ts` | How a record is written out for a digest, and the check typed equality is built from |
| `src/domain/system/time/time-equality.testing.ts` | For tests, a moment or a length equals its number of milliseconds, and moments compare whichever implementation made them |
