# Approved Implementation Roadmap

## Version and status

- **Design version:** `D0.6.0`.
- **Scope:** Approved stages from
  [FND-60](../decisions/project-foundation.md#fnd-60--implementation-stages), decided by the
  user on 2026-11-03, stage by stage, in I01-E06-002. Only `I02` and part of `I03` have source
  so far.
- **Rule:** Do not infer any roadmap beyond this scope. See
  [open decisions](../governance/open-decisions.md).

Work lifecycle is tracked in the
backlog; this roadmap remains
authoritative for approved scope, phase dependencies, and status evidence.

## Phase status snapshot

| Phase | Scope | Approved-plan status | Current evidence |
|---|---|---|---|
| `I02` | End-to-end skeleton: 11 capabilities | Approved, complete | The workspace, layers, test tools, simulation core, one order through both modules, the scenario format, the runner, the checks, and the basic technical view exist. The user approved the stage on 2026-11-05 |
| `I03` | Full V1.0.0 lifecycle and rules: 40 capabilities | Approved, in progress | Run history is mostly built: records split into unchanging and version parts, a main root with state and effects sub-roots, one state commit per transaction, effect commits grouped by job run or API call, indirect commits, and a zoomable timeline whose columns are the branches. Time-travel replay, Step debugger, and Snapshot and branch are built; the stage gate confirms them |
| `I04` | Faults, races, and verification: 26 capabilities | Approved, not started | No source |
| `I05` | Stored runs and files: 10 capabilities | Approved, not started | No source |
| `I06` | Versions and comparison: 27 capabilities | Approved, not started | No source |
| `I07` | City, actors, and scale: 30 capabilities | Approved, not started | No source |
| `I08` | Analysis and offline dispatch: 12 capabilities | Approved, not started | No source |
| `I09` | Conformance exchange: 1 capability | Approved, not started | No source |
| `I10` | Remaining views and checks: 35 capabilities | Approved, not started | No source |
| `I11` | Later capabilities: 5 capabilities | Approved, not started | No source |

Each stage ends at the stage gate of
[FND-60](../decisions/project-foundation.md#fnd-60--implementation-stages) before the next one
starts.

## Dependency graph

```text
I02 ──> I03 ──> I04 ──> I05 ──> I06 ──> I07 ──> I08 ──> I09 ──> I10 ──> I11
```

## Capabilities by stage

Each of the 192 capabilities of
[FND-34](../decisions/project-foundation.md#fnd-34--required-capabilities) is built in exactly
one stage, and the five of
[FND-35](../decisions/project-foundation.md#fnd-35--later-capabilities) in `I11`. Each is listed
under the module that owns it, as in [capability ownership](../modules/capability-ownership.md).

### I02 — End-to-end skeleton

One V1.0.0 order end to end, without faults, with a passing or failing scenario.

**Epics:** Project foundation; Simulation core; V1.0.0 happy path; Scenarios and checks; Basic
technical view; Stage gate.

- **[Simulation engine](../modules/simulation-engine.md):** Clock control, Determinism check.
- **[Scenarios](../modules/scenarios.md):** Scenario runner, Readable scenario format, Scenario
  validation.
- **[Verification](../modules/verification.md):** Invariant checker, Simulator self-tests.
- **[Technical view](../modules/technical-view.md):** Outbox and inbox inspector, Cross-module
  event tracing, Payload viewer.
- **[UI section](../ui/README.md):** Run status bar.

### I03 — Full V1.0.0 lifecycle and rules

Every path, command, and rule of V1.0.0, with the views that explain them.

**Epics, intended:** Run history; Paths and commands; Business rules; Push, devices, and jobs;
Explaining views; Run tools and workspace; Stage gate. Run history comes first
([FND-81](../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions)), Manual
mode comes with Paths and commands, and saved scenarios bring browser storage forward from `I05`
([FND-80](../decisions/project-foundation.md#fnd-80--planning-stage-i03)).

- **[Simulation engine](../modules/simulation-engine.md):** Manual mode, Step debugger,
  Time-travel replay, Snapshot and branch.
- **[Scenarios](../modules/scenarios.md):** Scenario library, Scenario recorder, Checks from a
  run.
- **[Verification](../modules/verification.md):** Criteria tracker, Violation summary,
  Stuck-order detection.
- **[Business rules](../modules/business-rules.md):** Rule traceability, Rule evaluation log,
  Decision explainer, Eligibility inspector, Score breakdown, Eligibility funnel.
- **[Drivers](../modules/drivers.md):** Notification sequence view.
- **[Business view](../modules/business-view.md):** Lifecycle state diagram, Allowed actions
  panel, Custody view, Custody chain, Cash ledger, Order cash chain.
- **[Run history](../modules/run-history.md):** Order timeline, Order replay.
- **[Technical view](../modules/technical-view.md):** Event search, Event kind catalogue,
  Command journal, Pending command view, Job schedule view, Data model view, Idempotency record
  view, Copy consistency check, Session and device view, Location track view.
- **[Orders](../modules/orders.md):** Request generation view, Order criteria check.
- **[UI section](../ui/README.md):** Detail level switch, Linked selection, Glossary.

### I04 — Faults, races, and verification

Break every step, explore the known races and give-ups, and report drift.

**Epics, intended:** Fault injection; Races and ordering; Instances and leases; Drift and
verification; Failure views; Stage gate.

- **[Fault injection](../modules/fault-injection.md):** Fault injection, Fault presets, Random
  fault schedules, Race and ordering explorer, Manual reordering, Fuzzing with shrinking,
  Duplicate and idempotency testing.
- **[Simulation engine](../modules/simulation-engine.md):** Event injection, Multiple service
  instances.
- **[Technical view](../modules/technical-view.md):** Instance view, Claims and leases view,
  Rate limit view, Retry timeline, Dead-letter view, Lag monitor, Module disagreement view,
  Causality graph, Clock skew view, Give-up rate view, Retry storm detector, Conflict rate view,
  Convergence time view.
- **[Verification](../modules/verification.md):** Drift detector, Counterexample traces,
  Criteria editor, Invariant editor.

### I05 — Stored runs and files

Keep runs, run batches and suites, and share scenarios and runs as files.

**Epics, intended:** Stored runs and IndexedDB; Batches and suites; Files; Stage gate.

- **[Run history](../modules/run-history.md):** Stored run management, Run labels, Recent items,
  Batch completion alerts.
- **[Import and export](../modules/import-and-export.md):** Scenario export, Scenario import.
- **[Scenarios](../modules/scenarios.md):** Batch runs, Regression suites, Golden runs.
- **[Simulation engine](../modules/simulation-engine.md):** Run queue.

### I06 — Versions and comparison

V1.1.0-planned-dispatch, option switches, editing versions, and comparing them.

**Epics, intended:** Version model and V1.1.0; Version management; Comparison; What-if, rollout,
and assumptions; Stage gate.

- **[Versions](../modules/versions.md):** Version editor, Version branching, Version validation,
  Version lock, Version provenance, Version import and export, Version timeline, Version
  summary, Version picker, Compatibility matrix, Option switches, Assumption toggles, Comparison
  dashboard, Run diff, Synchronised playback, Trend across versions, Difference explainer, Order
  across versions, Rule changelog, Rollout simulation, Design what-if testing, Tuning presets.
- **[Scenarios](../modules/scenarios.md):** Cross-version scenarios.
- **[Business rules](../modules/business-rules.md):** Rule editor, Assumption register,
  Undecided dependency view.
- **[Orders](../modules/orders.md):** Order what-if.

### I07 — City, actors, and scale

The synthetic city, behaviour profiles, city-scale runs, and the business view.

**Epics, intended:** City and map; Profiles and load; Scale; Business metrics and views; Stage
gate.

- **[Map and routing](../modules/map-and-routing.md):** Map view.
- **[Drivers](../modules/drivers.md) and [Restaurants](../modules/restaurants.md):** Actor
  behaviour profiles.
- **[Scenarios](../modules/scenarios.md):** Load generator, Load profiles.
- **[Simulation engine](../modules/simulation-engine.md):** Large run handling, Responsive while
  running.
- **[Business view](../modules/business-view.md):** Business metrics, Heatmaps, Driver
  perspective, Restaurant perspective, Staff perspective, Driver utilisation,
  Restaurant waiting view, Supply and demand view, Response rate view, Notifications per
  acceptance, Distance distribution, Cash exposure view, Fairness view, Area comparison,
  Time-of-day view, Open order age view, Reassignment view, Failure and return view, Escalation
  view, Driver earnings view, Restaurant cash reconciliation, Critical path view, Wait-time
  breakdown.
- **[Run history](../modules/run-history.md):** Driver timelines, whose view by driver comes in
  `I03`.

### I08 — Analysis and offline dispatch

Work across many runs, and the fast dispatch-only model.

**Epics, intended:** Offline dispatch; Multi-run analysis; Charts and drill-down; Stage gate.

- **[Analysis](../modules/analysis.md):** Parameter sweeps, Statistics across seeds, Sensitivity
  analysis, Value optimiser, Metric drill-down, Outlier finder, Failure probability, Hotspot
  ranking, Time series charts, Offline dispatch model.
- **[Business rules](../modules/business-rules.md):** Decision distribution, Rule usage counts.

### I09 — Conformance exchange

Export standard tests for the real service, and analyse its results.

**Epics, intended:** X format; Export and import; Results analysis; Stage gate.

- **[Versions](../modules/versions.md):** Real service conformance check.

### I10 — Remaining views and checks

Proofs, coverage, the remaining technical metrics, and workspace polish.

**Epics, intended:** Proofs; Coverage; Scenario authoring; Rule analysis and debugging;
Technical metrics; Workspace; Stage gate.

- **[Verification](../modules/verification.md):** Model checker, State space browser, Proof
  report, Coverage map, Scenario coverage report, Coverage goals.
- **[Scenarios](../modules/scenarios.md):** Scenarios from criteria, Scenario timeline editor,
  Scenario chaining.
- **[Simulation engine](../modules/simulation-engine.md):** State editor, Watch values.
- **[Business rules](../modules/business-rules.md):** Rule dependency graph, Rule conflict
  detector, Dead rule detector.
- **[Technical view](../modules/technical-view.md):** Event flow map, Interaction matrix, Module
  ownership view, Operational cost view, Message volume view, Contention view, Backlog growth
  warning, Job duration view, Notification failure view, Device reach view, Session churn view,
  Pending request age view, Replay rate view, Outbox size view, Cleanup effect view, Location
  freshness view, Status change view.
- **[UI section](../ui/README.md):** Search everywhere, Saved views, Help pages, Undo and redo.

### I11 — Later capabilities

All five FND-35 capabilities together; U13 is decided when it starts.

**Epics, intended:** Report generator; Version merge; Bulk editing; Dashboards and bookmarks;
Stage gate.

- **Undecided (U13):** Report generator.
- **[Versions](../modules/versions.md):** Version merge.
- **[Scenarios](../modules/scenarios.md):** Bulk scenario editing.
- **[UI section](../ui/README.md):** Dashboard builder, Bookmarks.

## Future versions

Nothing is established beyond these stages. Versions of the real service after
`V1.1.0-planned-dispatch` are added as [versions](../versions/README.md) describes.
