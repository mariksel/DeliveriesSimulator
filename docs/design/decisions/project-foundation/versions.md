# Project foundation — Versions

Kinds of version, their numbers, lifecycle, and folder layout.
This is part of the [project foundation](../project-foundation.md), which holds
its version, authority, and undecided questions, and lists where each record is.

## Approved decisions

### FND-40 — Kinds of version

A version is one of these kinds. The kind is recorded with the version; it is not part of the
number.

- **Built snapshot:** the real service as built, at a point in time.
- **Historical snapshot:** a past state of the real service, rebuilt from its history.
- **Approved design:** a design the real service has approved but not built yet.
- **What-if variation:** a variation of another version: tuned values, chosen option switches,
  or edited rules.
- **Proposal:** a change someone suggests that is not approved, tested before it goes to the
  real service.

### FND-41 — Version numbers

Versions are numbered with the `V` prefix and SemVer, for example `V1.0.0`, as an independent
label in [versioning](../../governance/versioning.md). The size of the change sets the number:

- **Major:** a change to the flow or to the modules: which module does what, or how they
  communicate.
- **Minor:** a change to rules or to events and their payloads.
- **Patch:** a change to values only.

A version that is not built carries a pre-release tag naming it, such as
`V1.1.0-planned-dispatch`, until it is built. A version's folder under `docs/design/versions/`
is named after its full number.

### FND-42 — First versions

The first versions are these. The other approved but unbuilt features come later.

- **`V1.0.0`:** the real service as built today, including today's dispatch.
- **`V1.1.0-planned-dispatch`:** dispatch as its planned design describes it.
- **`V2.0.0-module-copies`:** dropped on 2026-11-03 by the user, because the module copies are
  already built in `V1.0.0`.

### FND-43 — What may differ between versions

Versions may differ in values, in rules, in event kinds and their payloads, and in the flow and
modules.

### FND-44 — Version lifecycle

- **Who:** anyone using the simulator can create a version.
- **Triggers:** a change to the real service's code, an approved design, a settled undecided
  item, or a proposal someone wants to test.
- **Support:** built and historical snapshots stay runnable. Approved designs, what-if
  variations, and proposals can be retired once they are built or rejected.

### FND-45 — Version folder layout

- **Pages by topic:** each version folder has a README for the version, and pages for its
  lifecycle, actors and commands, events, business rules, module communication, and failures.
- **Later versions describe changes only:** a version after `V1.0.0` describes only what differs
  from the version it is based on, and links to it.
- **Built state by date:** a built snapshot records the date of the state it describes, and
  nothing else about the real service's source.
- **`V1.0.0` is the working tree:** it describes the real service's code as it stands on disk
  on 2026-11-03, including changes not yet committed.
