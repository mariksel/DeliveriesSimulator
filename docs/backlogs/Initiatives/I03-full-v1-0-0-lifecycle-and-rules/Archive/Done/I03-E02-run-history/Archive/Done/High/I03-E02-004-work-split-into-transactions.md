# I03-E02-004 — Work split into transactions

| Field | Value |
| --- | --- |
| ID | `I03-E02-004` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-05 |
| Completed | 2026-11-05 |

## Scope

One state commit is one call of one pure function, matching one transaction in the real service.
Today's steps split to match: a handoff into its three transactions, an event read into the copy
and the inbox record, and a notification into the claim, the enqueue, and the mark. The commits
of one action run back to back at one simulated time.

It also renames `DomainEffect` a follow-up, in the code, FND-73, the layers page, and code style.

### Outcome

- A commit now happens as each transaction is applied, so one step makes as many commits as it has
  transactions. A run's state holds its timeline.
- Reading an event is two calls, the copy and then the inbox record, and a dispatch pass notifies
  one request at a time. Commands were already separate calls.
- Two transactions have no state to change yet, so they make no commit, as FND-81 says: the pending
  request of a driver's command, which I03-E03-005 adds, and a notification's enqueue and mark,
  which I03-E05-001 adds. A pickup is two commits until then.
- A city day makes 169,800 commits, up from 59,046, with the same digest. That is 48.5 s, up from
  41.9 s, as there are nearly three times as many commits, with a peak of 1,177 MB and 630 MB held.
- A commit compares with the root it came from. Comparing with the latest commit failed for a run
  loaded from JSON, which loses sharing, so I03-E02-007's repository has to keep sharing.
- `DomainEffect` is now `FollowUp`, in the code and the docs.

## Acceptance criteria

- Each kind of work makes the commits that module communication describes.
- The log's contents don't change, so the pinned digest still holds, or any change to it is
  explained.
- `npm run benchmark` shows no slowdown that isn't explained.

## Dependencies

- [I03-E02-003 — Commits and the main root](I03-E02-003-commits-and-the-main-root.md)

## Sources and evidence

- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [V1.0.0 module communication](../../../../../../../../../design/versions/V1.0.0/module-communication.md)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-05 — Moved from Proposed to Ready: its dependency I03-E02-003 is Done.
- 2026-11-05 — Moved from Ready to In Progress: the user asked to continue.
- 2026-11-05 — Moved from In Progress to Done: each transaction now makes one state commit, and
  npm run check passes. Both pinned digests hold.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
