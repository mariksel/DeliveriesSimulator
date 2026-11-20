# I03-E02-005 — Direct effect commits and their groups

| Field | Value |
| --- | --- |
| ID | `I03-E02-005` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-05 |
| Completed | 2026-11-05 |

## Scope

Add effect commits for input calls, including refused ones, output calls, and every job run,
including ones that find nothing. All commits made during a job run or while handling an API
call belong to that group, and a commit records which one. Calls between the modules show as
links, and make no commit of their own.

### Outcome

- Every job run and API call now makes an effect commit, in the direct part of the effects
  sub-root, and a refused call has its refusal as its response, with no state commit.
- Each commit records the session it happened in, which is what groups it with its job run or API
  call. The effect commit comes last in its group, because only then is the response, or how many
  state commits the job made, known. Records never change, so it can't be written earlier.
- Nothing makes an output commit yet, as the simulator calls no external service until I03-E04-005
  and I03-E05-001. The kind exists, and is tested.
- A call between the modules makes no commit. Which module a state commit changed can be worked
  out from the commit, so I03-E02-014 can draw the links from that without any stored data.
- A city day makes 254,524 commits: 169,800 state commits, and 84,724 effect commits for its 54,724
  job runs and 30,000 API calls. Both digests hold. It took 47.3 s, with a peak of 1,315 MB and
  728 MB held at the end.

## Acceptance criteria

- Each kind can be told apart, and records what crossed the boundary.
- A refused call has a response and no state commit.
- An effect that is only internal and changes nothing makes no commit.

## Dependencies

- [I03-E02-004 — Work split into transactions](I03-E02-004-work-split-into-transactions.md)

## Sources and evidence

- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [V1.0.0 module communication](../../../../../../../../../design/versions/V1.0.0/module-communication.md)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-05 — Moved from Proposed to Ready: its dependency I03-E02-004 is Done.
- 2026-11-05 — Moved from Ready to In Progress: the user asked to continue.
- 2026-11-05 — Moved from In Progress to Done: job runs and API calls now make effect commits,
  grouped by session. npm run check passes, and both pinned digests hold.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
