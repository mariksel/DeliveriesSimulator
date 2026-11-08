# Integrations

Owns the boundaries with external systems. Each integration has its own page,
created from the [integration template](_integration-template.md).

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved in
  [FND-5](../decisions/project-foundation.md#fnd-5--no-integrations-today). No source exists to
  check it against yet.

## Integration map

- None today. DeliveriesSimulator is self-contained. It calls no real routing or notification
  provider ([FND-33](../decisions/project-foundation.md#fnd-33--out-of-scope)), and the
  conformance exchange with the real service works through files, not a connection
  ([FND-52](../decisions/project-foundation.md#fnd-52--conformance-exchange)).
