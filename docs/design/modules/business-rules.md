# Business rules

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a capability in
  [FND-8](../decisions/project-foundation.md#fnd-8--capability-list), and made a module of rule
  abstractions in
  [FND-83](../decisions/project-foundation.md#fnd-83--types-owned-by-their-modules).
  I03-E04-012
  builds the abstractions. Drivers, Deliveries, and Orders write their rules with them, each in
  its own folder. The
  [implementation roadmap](../roadmap/implementation-roadmap.md) says which stage builds the rest.

## Current and approved responsibilities

The abstractions every module writes its own rules with. It knows no other module's rules: in
the user's words, "the specific modules should build their rules using the busines rules
abstractions"
([FND-83](../decisions/project-foundation.md#fnd-83--types-owned-by-their-modules)). A rule
written this way is visible in the UI, and can be changed by hand or by the simulator, so that
runs can simulate different scenarios
([FND-54](../decisions/project-foundation.md#fnd-54--tunability)). The tools that work on any
module's rules, such as the rule editor, rule traceability, and the decision explainer, belong
here, as [capability ownership](capability-ownership.md) lists.

## The abstractions

The user chose these in
[FND-84](../decisions/project-foundation.md#fnd-84--rule-abstractions):

- **A rule** is named, with parameters: an ID, a name, what it says, the decision or rules page
  it comes from, its kind, and its parameters in order. Its ID is `<module>.<rule-name>`, such as
  `drivers.fresh-location`, fixed once stored and with no version.
- **A parameter** is what people and the simulator change, never the rule's code. It has an ID
  unique within its rule, in kebab-case, a name, what it controls, its kind (a duration in
  milliseconds, a distance in metres, a count, or a multiplier), which values a run can use, its
  default, which is the value the version's rules state, and its valid range.
- **Usable values and the valid range:** a run refuses only a value it cannot use: one not of its
  parameter's kind, or, for a job's interval, one that is not a whole number above 0. A value
  outside the valid range is used, and the Rules panel and scenario reading warn about it
  ([FND-54](../decisions/project-foundation.md#fnd-54--tunability)).
- **A rule set** holds a module's rules in order with the values in use. It changes values by
  rule and parameter ID, refusing an unknown rule or parameter and an unusable value, and lists
  each value in use and those outside their range.
- **Three kinds of rule,** by what applying one gives: a check passes or fails, and the first
  check that fails, in order, is the reason; a calculation gives a value; and a limit says whether
  something is within it. A module applies each with its own code and its own typed values.
- **Which values a run can use,** beyond each kind: any, a whole number above 0 for a job's
  interval, or anything but 0 for a value a rule divides by.
- **Persisted,** a rule set is its values in use, by rule and parameter ID in order; its rules
  are in the code.

## The Rules panel

A tab in the run workspace, beside the Inspector and the Trace, lists Orders', Drivers', and
Deliveries' rules, each module's in the order it applies them: what each says, its source, its
kind, and its parameters' values in use, defaults, and valid ranges. It marks a value changed
from its default and one outside its range, and says that a rule with no parameters is shown but
not tuned
([FND-84](../decisions/project-foundation.md#fnd-84--rule-abstractions)).

A person can type a new value while the run is paused or running, written as a scenario file
writes it: a duration as a time like `h00:m00:s30:ms00`, anything else as a number. A value the
run can use, even outside its range, becomes a config change commit at the run's current time,
and its `ConfigChanged` entry shows in the log; one it cannot use is refused beside the
parameter, with the reason. Which rule decided what is the Rule evaluation log's and the
Decision explainer's, in `I03-E04-007` and `I03-E04-008`.

Planned in Run history's items: a change can name a scenario's labelled indirect effect it
follows from, picked from a list, in `I03-E02-022`; and the panel lists each module's functions
and their versions beside its rules, read through the Simulation engine, and switches one, in
`I03-E02-026`
([FND-81](../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions),
[FND-89](../decisions/project-foundation.md#fnd-89--indirect-effects-stated-by-hand)).

Each module owns its own rules: [Orders](orders.md) the order rules, and [Drivers](drivers.md)
the driver rules. Each pricing rule goes to the module that owns it in the real service, when it
is built
([FND-83](../decisions/project-foundation.md#fnd-83--types-owned-by-their-modules)).

## Key approved business rules

- Each version's rules are in its pages, starting with
  [V1.0.0 business rules](../versions/V1.0.0/business-rules.md)
  ([FND-36](../decisions/project-foundation.md#fnd-36--inventory-per-version)).
- Each undecided option of the real service is an option switch
  ([FND-37](../decisions/project-foundation.md#fnd-37--inventory-coverage)).
- Rules, values, and identifiers may be recorded, described generically
  ([FND-23](../decisions/project-foundation.md#fnd-23--safe-to-publish)).
- The user decides conflicts between sources, one at a time
  ([FND-9](../decisions/project-foundation.md#fnd-9--sources-of-business-rules),
  [FND-39](../decisions/project-foundation.md#fnd-39--source-conflicts-resolved)).

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries),
[FND-83](../decisions/project-foundation.md#fnd-83--types-owned-by-their-modules)):

- **Uses:** [System](system.md), and the [Simulation engine](simulation-engine.md) (the run's
  rules, for the Rules panel,
  [FND-84](../decisions/project-foundation.md#fnd-84--rule-abstractions)). Its abstractions in
  Domain use System only.
- **Used by:** [Verification](verification.md) (criteria), [Versions](versions.md) (rules per
  version), [Orders](orders.md) and [Drivers](drivers.md) (rule abstractions),
  [Payments](payments.md) (pricing rules), the [Simulation engine](simulation-engine.md) (tunes
  rules), and [Scenarios](scenarios.md) (sets rules).
- Rules come from the real service's documentation, code, and people who know it
  ([FND-9](../decisions/project-foundation.md#fnd-9--sources-of-business-rules)). Its name and
  location are not recorded
  ([FND-2](../decisions/project-foundation.md#fnd-2--real-service-not-named)); the user states
  the rules and reviews the simulation
  ([FND-52](../decisions/project-foundation.md#fnd-52--conformance-exchange)).

## Code map

| Path | Purpose |
|---|---|
| `src/domain/business-rules/rule.ts`, `rule-kind.ts` | A rule, its ID, and its kind |
| `src/domain/business-rules/parameter.ts`, `parameter-kind.ts`, `usable-values.ts`, `valid-range.ts`, `numbers.ts` | A parameter, its ID, its kind, the values a run can use, its valid range, and its value |
| `src/domain/business-rules/rule-set.ts`, `rule-value.ts`, `parameter-change.ts` | A module's rules with the values in use, one value in use, and a change to one |
| `src/domain/business-rules/check.ts`, `calculation.ts`, `limit.ts` | The three kinds of rule, as a module's code applies them |
| `src/infrastructure/business-rules/persisted-rule-set.ts` | A rule set's values in use, persisted, and read back against its module's rules |
| `src/domain/business-rules/value-changed.ts` | One value a config change changed, by rule and parameter ID, before and after |
| `src/infrastructure/business-rules/persisted-value-changed.ts` | A changed value, persisted in a `ConfigChanged` log entry |
| `src/ui/business-rules/rules-panel/` | The Rules panel |
| `src/ui/business-rules/rules-view.ts` | What the panel shows, and what a typed value comes to, as tested pure functions |
| `src/domain/business-rules/as-stated.ts` | A parameter and a rule from what a module states, which checks their IDs and numbers |
