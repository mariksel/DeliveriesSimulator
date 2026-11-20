# I03-E04-012 — Rule abstractions

| Field | Value |
| --- | --- |
| ID | `I03-E04-012` |
| Parent | [I03-E04 — Business rules](../../../I03-E04-business-rules-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-07 |
| Last updated | 2026-11-07 |
| Completed | 2026-11-07 |

## Scope

Business rules becomes a generic module of rule abstractions, which knows no other module's
rules. Orders, Drivers, and the other modules write their own rules with these abstractions, so
that each rule is visible in the UI and can be changed by hand or by the simulator, to simulate
different scenarios
([FND-83](../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-83--types-owned-by-their-modules),
[FND-84](../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-84--rule-abstractions)).

A rule is a named rule with parameters: an ID, a name, what it says, its source, typed parameters
with valid ranges, and the code that applies it. People and the simulator change parameters,
never code. Every rule the code applies is written this way; the pricing rules follow when they
are built. A scenario can set parameters at its start and at stated times, and a Rules panel shows
the rules and lets a person change a parameter during a run. Saving tuned rule sets as presets
and versions is the Rule editor's, in `I06`.

## Acceptance criteria

- Business rules' Domain code holds only rule abstractions and uses only System; its Rules
  panel reads the run's rules from the Simulation engine. The user reworded this on 2026-11-07,
  once the module graph gained that edge.
- Every rule of `V1.0.0` that the code applies is written with those abstractions in the module
  that owns it.
- Each rule is shown in the UI, and can be changed there by hand and by the simulator, with the
  change recorded in the run.

## Dependencies

- [I03-E02-019 — Types owned by their modules](../../../../Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-019-types-owned-by-their-modules.md)

## Sources and evidence

- [Project foundation: FND-84](../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-84--rule-abstractions)
- [Project foundation: FND-83](../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-83--types-owned-by-their-modules)
- [Project foundation: FND-54](../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-54--tunability)
- [Business rules](../../../../../../../design/modules/business-rules.md)
- [V1.0.0 business rules](../../../../../../../design/versions/V1.0.0/business-rules.md)

## Internal phases

The user approved the plan below on 2026-11-07.

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `I03-E04-012-P01` | The rule abstractions | Done | 2026-11-07 | Approved; Implemented |
| `I03-E04-012-P02` | Drivers' rules | Done | 2026-11-07 | Approved; Implemented |
| `I03-E04-012-P03` | Orders' and Deliveries' rules | Done | 2026-11-07 | Approved; Implemented |
| `I03-E04-012-P04` | Rules as the run's config values | Done | 2026-11-07 | Approved; Implemented |
| `I03-E04-012-P05` | Scenario steps that set rules | Done | 2026-11-07 | Approved; Implemented |
| `I03-E04-012-P06` | The Rules panel | Done | 2026-11-07 | Approved; Implemented |

### Plan

After each phase, `npm run check` passes and the pinned digests hold, except where P04 says.

1. **P01, the rule abstractions:** in `src/domain/business-rules/`, a rule definition with its
   ID, name, text, source, and typed parameters; a parameter with its kind (a duration, a
   distance, a count, a multiplier, or one per choice, such as the availability boosts), its
   default, and its valid range; a rule set, which holds a module's rules in order with the
   values in use, checks what a run cannot use, and says which values are outside their range;
   and three kinds of rule by what applying one gives: a check (passed, or failed with a reason),
   a calculation (a value), and a limit (within it, or not). The tuned values' checks move into
   the parameters. The module's page and the code style follow.
2. **P02, Drivers' rules:** eligibility as five checks in their order, the score and the
   notification delay as calculations, the notification limits as limits, and the dispatch pass
   interval as a parameter of its own, each with its source in the `V1.0.0` rules page.
   `DispatchValues` gives way to Drivers' rule set. The run's results do not change.
3. **P03, Orders' and Deliveries' rules:** their communication values as parameters of their
   inbox and handoff rules, and the order lifecycle's allowed transitions as checks with no
   parameters, so they show but do not tune.
4. **P04, rules as the run's config values:** the config values in use become each module's rule
   set, and a config change changes parameters by rule ID. Persisted runs and stored call
   arguments follow. A config change's log entry records the changed parameters by rule ID, so the
   digest of a run with a config change changes once; no pinned run has one.
5. **P05, scenario steps that set rules:** the scenario format gains a step that sets parameters
   at a stated time, and a start that sets them before the first step. Reading a scenario checks
   rule IDs and values, and warns on a value outside its range. Each change is a config change
   commit. The scenario format page follows.
6. **P06, the Rules panel:** a panel in the run workspace lists each module's rules in order, with
   what they say, their source, and their parameters' values, defaults, and ranges, marking a value
   outside its range. A person can change a parameter while the run is paused or running, as a
   config change commit; the panel shows the change in the log. The UI pages follow.

### Decisions on the plan

The user chose these on 2026-11-07
([FND-84](../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-84--rule-abstractions)):

- **Rule IDs:** `<module>.<rule-name>`, such as `drivers.fresh-location`, fixed once stored. No
  version suffix: a change to a rule's logic is a new version of the service, which Versions owns.
- **Values outside their range:** the run uses them, as FND-54 allows, and the Rules panel and
  scenario reading warn. Only a value the run cannot use is refused.
- **Where the panel sits:** a tab in the run workspace, beside the Inspector and the Trace.
- **What the panel shows:** each rule's definition, source, values, defaults, ranges, and changes.
  Which rule decided what is the Rule evaluation log's and the Decision explainer's,
  `I03-E04-007` and `I03-E04-008`.

## Status history

- 2026-11-07 — Created as Proposed: the user chose that Business rules stays as a module of rule
  abstractions, and that a new item designs and builds them, planned first. It starts when
  I03-E02-019 is Done.
- 2026-11-07 — Planned: the user chose what a rule is, which rules are in scope, how the
  simulator changes them, and how much UI this item holds (FND-84). The plan waits for the
  user's review.
- 2026-11-07 — In Progress: the user approved the plan and decided its open points: rule IDs, values
  outside their range, where the Rules panel sits, and what it shows (FND-84). P01 started, and
  the other phases are Ready.
- 2026-11-07 — P01 Done: `src/domain/business-rules/` holds the rule, its parameters with their kinds,
  usable values, defaults, and valid ranges, the rule set, and the check, calculation, and limit
  kinds, and uses only System and the core's shared files. `value-checks.ts` stays until the
  tuned values it checks become parameters, in P02 and P03. npm run check passes.
- 2026-11-07 — P02 Done: the user accepted the proposed rule IDs, kinds, and ranges, made the ranking
  score's proximity scale and load divisor parameters, and chose a calculation for the dispatch
  pass (FND-84). `DriversRules` replaces `DispatchValues`, built from Drivers' rule set, and
  eligibility, ranking, the notification sequence, and the dispatch pass apply the rules. A
  run's values are persisted as a rule set. A divisor needed a third kind of usable values,
  anything but 0, added to Business rules. The pinned digests and the city day's digest are
  unchanged, and the day takes as long as before. npm run check passes.
- 2026-11-07 — P03 Done: the user accepted the proposed rules and ranges, and chose that each
  transition's check covers only the statuses it is allowed from (FND-84). `OrdersRules` and
  `DeliveriesRules` replace the communication values; the inbox and retry jobs, the read lags,
  and the retries per run apply them; and `order.ts` applies the five transitions' checks.
  `value-checks.ts` is gone. The pinned digests and the city day's digest are unchanged, at
  48.8 s. npm run check passes.
- 2026-11-07 — P04 Done: the user added three module graph edges: the Simulation engine tunes rules
  and Scenarios sets them through Business rules, and Business rules reads the run's rules from
  the Simulation engine for its panel (FND-84). The run's config values are each module's rules,
  since P02 and P03, persisted as rule sets. A config change takes parameter changes by rule
  ID, sends each to the module that holds the rule, and refuses a rule no module holds; its
  `ConfigChanged` entry holds each changed value before and after, which supersedes FND-81's
  values before and after. No pinned run has a config change, so no pinned digest changed. npm
  run check passes.
- 2026-11-07 — P05 Done: the user chose the format, a top-level `rules` list for the start and a
  step with `set` for a change at its time, with durations in the time notation, and that
  warnings come with the read scenario, in the command line's output and below the run's
  controls (FND-84). Reading checks each rule, parameter, and value, and warns on one outside
  its range; a rules step is a config change commit that counts as a step, and the start's rules
  go into the start root with no commit. Saved runs keep rules steps. npm run check passes.
- 2026-11-07 — P06 Done: a Rules tab in the run workspace lists each module's rules, marks changed
  values and values outside their range, and takes a new value while the run is paused or
  running, as a config change commit, refusing one the run cannot use with its reason. Its
  owner is Business rules, as the user chose. npm run check passes.
- 2026-11-07 — Done: the user reworded the criterion on what Business rules uses, since its Rules
  panel reads the run's rules from the Simulation engine, and every acceptance criterion is met,
  so the item moved to the Done archive.

## Priority history

- 2026-11-07 — Created at High priority, like the other items of this epic.
