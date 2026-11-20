# I01-E01-002 — Decide candidate capabilities

| Field | Value |
| --- | --- |
| ID | `I01-E01-002` |
| Parent | [I01-E01 — Vision and scope](../../../I01-E01-vision-and-scope-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Undecided |
| Created | 2026-11-03 |
| Last updated | 2026-11-03 |
| Completed | 2026-11-03 |

## Scope

Decide what happens to each candidate below, and how each relates to the capability list in
FND-8. A candidate is not a commitment. Guided walkthroughs are not listed, because FND-8
records that they were offered and not chosen.

### Questions for the user

- For each candidate: required, later, or out of scope?
- Does each one belong to an existing module, or does FND-8 need to change?
- Is a conformance check wanted, and does FND-10 change?
- Are any capabilities missing from this list?
- Which capabilities matter most for the first stage?

### Candidates the user selected for discussion

- **Scenario runner:** scripted, repeatable runs that check an outcome and report pass or fail.
- **Offline dispatch model:** a fast simulation of the dispatch rules, to compare tuning values.
- **Race and ordering explorer:** try different event orderings between the orders and
  deliveries modules, and report which orderings break a rule.
- **Fault injection:** outbox lag, job delays, retries, a crash between two modules' steps,
  dead-lettering, and event expiry. The Fault injection module already exists; what it can
  affect is undecided.
- **Invariant checker:** named rules checked on every step, with each violation linked to the
  event that caused it.
- **Design what-if testing:** try open design questions before they are built, and compare the
  outcomes.
- **Decision explainer:** show why each decision was made at any moment in a run.
- **Time-travel replay:** step forwards and backwards through a run, and repeat it exactly from
  a seed.
- **Real service conformance check:** compare the simulation's logic with the real service.
  FND-10 stands until this is decided: people review the behaviour, and no comparison with
  exported data is planned.
- **Scenario export:** save a failing scenario as a file or link, and turn it into a bug report
  or a test starting point. Under FND-23, an export must not hold identity or real data.

### Further correctness suggestions, not selected yet

- **Fuzzing with shrinking:** random runs that reduce a failure to the smallest scenario that
  still fails.
- **Duplicate and idempotency testing:** repeated commands, repeated events, and a reused key
  with a different body.
- **Rollout simulation:** old and new versions running together, including old event payloads
  and older apps that receive unknown notification kinds.
- **Stuck-order detection:** orders that can never finish, such as a request that no driver is
  eligible for.
- **Coverage map:** which transitions, rules, and error outcomes were exercised, and which
  states cannot be reached.
- **Multiple service instances:** per-instance limits, single-run jobs, and races on a claim.

### Further insight suggestions, not selected yet

- **Cross-module event tracing:** follow one action from command to outbox, inbox, and copy, on
  a sequence diagram.
- **Parameter sweeps:** many runs across tuning values, with charts of the results.
- **Business metrics:** time to assign, delivery time, driver load and fairness, and cash held.
- **Rule traceability:** each rule links to the decision behind it, and undecided behaviour is
  flagged.
- **Rule changelog:** the rule differences between versions, shown as a readable list.
- **Operational cost view:** notifications sent, polling work, and route-provider calls.
- **Manual mode:** the user acts as a driver or restaurant and steps through the flow by hand.

### Answers so far

- The 16 candidates the user selected for discussion or that were suggested for correctness are
  required:
  [FND-34](../../../../../../../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-34--required-capabilities).
  FND-10 is amended to match.
- The insight suggestions and the further suggestions the user asked for are recorded in FND-33
  (out of scope), FND-34 (required), and FND-35 (later).
- Missing capabilities: the list is complete for now.
- Which module owns each capability: decided in I01-E03-006.
- Which capabilities matter most for the first stage: decided in I01-E06-002.

## Acceptance criteria

- The user has answered each question, or explicitly left it undecided.
- The answers are recorded in their owning design documents, and nothing was assumed.
- What is recorded follows FND-23: the documents stay safe to publish.

## Dependencies

- [I01-E01-001 — Confirm purpose and success](I01-E01-001-confirm-purpose-and-success.md)

## Sources and evidence

- [Project foundation: FND-8](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-8--capability-list)
- [Project foundation: FND-10](../../../../../../../../../../../design/decisions/project-foundation/purpose-and-scope.md#fnd-10--checking-against-the-real-service)
- [Project foundation: FND-34](../../../../../../../../../../../design/decisions/project-foundation/capabilities-and-inventory.md#fnd-34--required-capabilities)
- [Open decisions](../../../../../../../../../../../design/governance/open-decisions.md)

## Status history

- 2026-11-03 — Created as Proposed. It starts when its dependencies are answered. No work
  started.
- 2026-11-03 — Moved from Proposed to In Progress: its dependency, I01-E01-001, is Done, and the
  user started it.
- 2026-11-03 — Moved from In Progress to Done on the user's approval: every question is answered
  and recorded in FND-33, FND-34, and FND-35, or moved to I01-E03-006 and I01-E06-002. Archived
  under `Archive/Done/High/`; its epic is archived with it.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved for all I01 items.
