# Capability Ownership

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved by the user on 2026-11-03, group by group, in I01-E03-006
  ([FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries)), with Deliveries and
  Customers and restaurants renamed to Drivers and Restaurants in
  [FND-83](../decisions/project-foundation.md#fnd-83--types-owned-by-their-modules).
  Order timeline, Order replay, and Driver timelines moved to Run history on 2026-11-08
  ([FND-81](../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions)).
  Partly implemented: each module's page says how much.

Every capability in [FND-34](../decisions/project-foundation.md#fnd-34--required-capabilities)
and [FND-35](../decisions/project-foundation.md#fnd-35--later-capabilities) has one owner,
listed here. "(later)" marks an FND-35 capability. The workspace features belong to the
[UI section](../ui/README.md), not a module.

| Group | Owner | Capabilities |
| --- | --- | --- |
| Running and time | [Simulation engine](simulation-engine.md) | Clock control, Time-travel replay, Snapshot and branch, Determinism check, Responsive while running, Run queue, Large run handling, Multiple service instances, Manual mode, Event injection, State editor, Step debugger, Watch values |
| Scenarios | [Scenarios](scenarios.md) | Scenario runner, Scenario library, Scenario recorder, Scenario validation, Checks from a run, Scenarios from criteria, Scenario timeline editor, Scenario chaining, Readable scenario format, Regression suites, Golden runs, Cross-version scenarios, Batch runs, Load generator, Load profiles, Bulk scenario editing (later) |
| Faults | [Fault injection](fault-injection.md) | Fault injection, Fault presets, Random fault schedules, Race and ordering explorer, Manual reordering, Fuzzing with shrinking, Duplicate and idempotency testing |
| Verification | [Verification](verification.md) | Invariant checker, Model checker, State space browser, Proof report, Counterexample traces, Criteria tracker, Criteria editor, Invariant editor, Coverage map, Scenario coverage report, Violation summary, Stuck-order detection, Drift detector, Simulator self-tests, Coverage goals |
| Versions and comparison | [Versions](versions.md) | Version editor, Version branching, Version validation, Version lock, Version provenance, Version import and export, Version timeline, Version summary, Version picker, Compatibility matrix, Option switches, Assumption toggles, Comparison dashboard, Run diff, Synchronised playback, Trend across versions, Difference explainer, Order across versions, Rule changelog, Rollout simulation, Design what-if testing, Real service conformance check, Tuning presets, Version merge (later) |
| Rules and decisions | [Business rules](business-rules.md) | Rule editor, Rule traceability, Rule dependency graph, Rule conflict detector, Dead rule detector, Rule usage counts, Rule evaluation log, Decision explainer, Decision distribution, Eligibility inspector, Score breakdown, Eligibility funnel, Assumption register, Undecided dependency view |
| Event and record views | [Technical view](technical-view.md) | Event search, Cross-module event tracing, Causality graph, Event flow map, Event kind catalogue, Payload viewer, Data model view, Outbox and inbox inspector, Lag monitor, Retry timeline, Dead-letter view, Pending command view, Copy consistency check, Module disagreement view, Idempotency record view, Command journal, Interaction matrix, Module ownership view, Job schedule view, Instance view, Claims and leases view, Rate limit view, Session and device view, Location track view |
| Business views | [Business view](business-view.md) | Business metrics, Heatmaps, Driver perspective, Restaurant perspective, Staff perspective, Lifecycle state diagram, Allowed actions panel, Custody view, Custody chain, Cash ledger, Order cash chain, Driver utilisation, Restaurant waiting view, Supply and demand view, Response rate view, Notifications per acceptance, Distance distribution, Cash exposure view, Fairness view, Area comparison, Time-of-day view, Open order age view, Reassignment view, Failure and return view, Escalation view, Driver earnings view, Restaurant cash reconciliation, Critical path view, Wait-time breakdown |
| Technical metrics | [Technical view](technical-view.md) | Operational cost view, Message volume view, Contention view, Retry storm detector, Backlog growth warning, Job duration view, Notification failure view, Device reach view, Session churn view, Conflict rate view, Convergence time view, Pending request age view, Replay rate view, Outbox size view, Give-up rate view, Cleanup effect view, Clock skew view, Location freshness view, Status change view |
| Analysis | [Analysis](analysis.md) | Parameter sweeps, Statistics across seeds, Sensitivity analysis, Value optimiser, Metric drill-down, Outlier finder, Failure probability, Hotspot ranking, Time series charts, Offline dispatch model |
| Stored runs | [Run history](run-history.md) | Stored run management, Run labels, Recent items, Batch completion alerts |
| Timelines | [Run history](run-history.md) | Order timeline, Order replay, Driver timelines |
| Files | [Import and export](import-and-export.md) | Scenario export, Scenario import |
| Workspace | [UI section](../ui/README.md) | Linked selection, Search everywhere, Saved views, Help pages, Glossary, Detail level switch, Undo and redo, Run status bar, Dashboard builder (later), Bookmarks (later) |
| Per-order tools | [Orders](orders.md) | Request generation view, Order what-if, Order criteria check |
| Map | [Map and routing](map-and-routing.md) | Map view |
| Dispatch notifications | [Drivers](drivers.md) | Notification sequence view |
| Behaviour profiles | [Drivers](drivers.md) for drivers; [Restaurants](restaurants.md) for restaurants and customers | Actor behaviour profiles |
| Reports | Undecided (U13) | Report generator (later) |

All 192 required and 5 later capabilities are listed exactly once.
