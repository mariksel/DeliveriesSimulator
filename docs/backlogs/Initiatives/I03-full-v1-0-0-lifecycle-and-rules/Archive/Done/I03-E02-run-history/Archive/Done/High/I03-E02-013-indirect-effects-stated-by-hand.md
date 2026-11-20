# I03-E02-013 — Indirect effects stated by hand

| Field | Value |
| --- | --- |
| ID | `I03-E02-013` |
| Parent | [I03-E02 — Run history](../../../I03-E02-run-history-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-05 |
| Last updated | 2026-11-08 |
| Completed | 2026-11-08 |

## Scope

Add the indirect commit kind, for decisions and changes the service takes no part in, such as a
customer deciding not to pick up. Scenario steps and Manual mode can state one by hand, and
behaviour profiles add them automatically at the city stage. A direct effect records which
indirect effect led to it, when that is known. The set of indirect effect kinds starts empty,
so this item adds the first kind, with its typed data
([FND-72](../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-72--code-style)).

The user chose on 2026-11-08 ([FND-89](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-89--indirect-effects-stated-by-hand)) three first kinds: a driver ignores a delivery
request, a restaurant runs late with an order, and a customer won't take an order. A scenario
step states one with a label a later direct step can follow from, and the run workspace has a
State an indirect effect action. Manual mode builds on that action later.

## Acceptance criteria

- An indirect commit changes the indirect part only, and is marked as something the service
  can't see.
- The timeline shows how long the service was unaware, from the decision to the direct effect it
  led to.
- A fork at an indirect commit can explore a different decision.

## Dependencies

- [I03-E02-012 — Forks and named timelines](I03-E02-012-forks-and-named-timelines.md)

## Sources and evidence

- [Project foundation: FND-81](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
- [Scenarios](../../../../../../../../../design/modules/scenarios.md)
- [Customers and restaurants](../../../../../../../../../design/modules/restaurants.md)
- [Project foundation: FND-89](../../../../../../../../../design/decisions/project-foundation/run-history.md#fnd-89--indirect-effects-stated-by-hand)

## Internal phases

The user approved the plan below on 2026-11-08.

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E02-013-P01` | The indirect commit, in the core | Done | 2026-11-08 | Approved; Implemented |
| `I03-E02-013-P02` | Stating one in a scenario and in a live run | Done | 2026-11-08 | Approved; Implemented |
| `I03-E02-013-P03` | The action, and the unaware span on the timeline | Done | 2026-11-08 | Approved; Implemented |

### Plan

The user chose the first kinds, how they are stated by hand, how a direct effect names the one
it follows from, and how the timeline shows the service unaware (FND-89). After each phase,
`npm run check` passes and the pinned digests hold.

1. **P01, the core:** the indirect effects become a fixed set of three, each with typed data:
   a driver ignores a request, with the driver and the order; a restaurant runs late, with the
   restaurant, the order, and how much later it expects to be ready; and a customer won't take
   an order, with the order. An indirect commit, a new commit kind, adds one to the indirect
   part only, and writes a log entry for it, from the actors, marked as unseen by the service.
   A direct effect can record the indirect commit that led to it. Saved runs keep both.
2. **P02, stating them:** a scenario step states one, such as
   `{ "at": "h00:m00:s45:ms00", "indirect": "driver-ignores-request", "actor": "driver-1",
   "order": "A", "label": "ignored" }`, and a direct step can say `"after": "ignored"`.
   Reading a scenario checks the kind, its data, and that every label followed from is stated
   earlier. A live run states one at the commit shown, forking first when an earlier commit is
   shown.
3. **P03, the browser:** a State an indirect effect action in the run controls opens a short
   form for the kind and its data. On the timeline an indirect commit's node is hollow and
   marked as unseen by the service, and a hatched band runs from it to the direct commit it led
   to, with how long the service was unaware. The Scenario format, Run history, and Simulation
   engine pages and the end-to-end tests follow.

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-07 — Moved from Proposed to Ready: its dependency I03-E02-012 is Done.
- 2026-11-08 — Planned: the user chose three first kinds, a scenario step and a workspace action
  to state them, labels a direct step follows from, and a hatched band for how long the service
  was unaware (FND-89). The plan waits for the user's review.
- 2026-11-08 — In Progress: the user approved the plan, with how much later a late restaurant
  expects to be ready, and indirect effects as records the scenario's later steps follow from.
  P01 started.
- 2026-11-08 — P01 Done: the indirect effects are three kinds, each with typed data, and an
  indirect commit states one, changing the indirect part only and writing an
  `IndirectEffectHappened` entry from the actors. An API call's effect can record the indirect
  commit it follows from, and saved runs keep both. A fork can start at an indirect commit. The
  Simulation engine, Event log, and Run history pages and FND-89 describe it as built.
  `npm run check` passes. P02 started.
- 2026-11-08 — P02 Done: a scenario's indirect step states one of the three kinds, with an
  optional label, as an indirect commit that counts as a step run, and an action's `after`
  names the label its API call follows from. Reading a scenario checks the kind, its actor, its
  order, a late restaurant's delay, repeated labels, and that every label followed from is
  stated earlier. A live run states one at the commit shown, forking first from an earlier one,
  and a repeat states a hand-made one again. The Scenario format, Scenarios, Simulation engine,
  and Run history pages and FND-89 describe it as built. `npm run check` passes apart from a
  WebKit fork test that timed out once and passed on reruns. P03 started.
- 2026-11-08 — P03 Done: an Indirect effect button in the run controls opens a short form for what
  happens, who decides, the order, and how much later for a late restaurant, offering the
  scenario's names; stating it makes an indirect commit at the commit shown, forking first from
  an earlier one. On the timeline an indirect commit's node is hollow, with a dashed edge, named
  by its kind, and its tooltip says the service did not see it; a hatched strip runs from it to
  the call that followed from it, in the same column, ending with how long the service was
  unaware. The Run history and UI pages and FND-89 describe it as built. `npm run check` passes.
- 2026-11-08 — Done: every acceptance criterion is met. An indirect commit changes the indirect part
  only and is marked as unseen by the service; the timeline shows how long the service was
  unaware, from the decision to the call it led to; and a fork can start at an indirect commit to
  explore a different decision. The item moved to the Done archive.

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
