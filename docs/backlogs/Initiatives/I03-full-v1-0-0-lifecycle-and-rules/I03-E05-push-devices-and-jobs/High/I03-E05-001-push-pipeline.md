# I03-E05-001 — Push pipeline

| Field | Value |
| --- | --- |
| ID | `I03-E05-001` |
| Parent | [I03-E05 — Push, devices, and jobs](../I03-E05-push-devices-and-jobs-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-05 |
| Completed | Not completed |

## Scope

Enqueuing, the claim and lease, sending, temporary failures and their retries, lease expiry,
results, sender callbacks, and invalid devices. Each provider request is an output commit, and
no real provider is called.

It also adds a notification's other two transactions, the enqueue and the mark, so one notification
goes from one commit to three, as module communication says.

## Acceptance criteria

- A built-in scenario covers a delivered push, a retried one, and an invalid device.
- A push's journey shows as commits within its job run group.
- The values match module communication.

## Dependencies

- [I03-E03-013 — Devices and push registration](../../I03-E03-paths-and-commands/High/I03-E03-013-devices-and-push-registration.md)

## Sources and evidence

- [V1.0.0 module communication](../../../../../design/versions/V1.0.0/module-communication.md)
- [Notifications](../../../../../design/modules/notifications.md)
- [Project foundation: FND-46](../../../../../design/decisions/project-foundation/simulation-model.md#fnd-46--simulation-detail)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
