# Project foundation — Capabilities and inventory

The capabilities the simulator needs, and the inventory of the real service it models.
This is part of the [project foundation](../project-foundation.md), which holds
its version, authority, and undecided questions, and lists where each record is.

## Approved decisions

### FND-34 — Required capabilities

The simulator provides these capabilities. Which module of FND-8 owns each one is decided in
[I01-E03-006](../../../backlogs/Initiatives/Archive/Done/I01-requirements-and-backlog-creation/Archive/Done/I01-E03-simulator-behaviour/Archive/Done/High/I01-E03-006-module-boundaries-and-dependencies.md),
and which stage each is built in is in the
[implementation roadmap](../../roadmap/implementation-roadmap.md#capabilities-by-stage), decided in
[I01-E06-002](../../../backlogs/Initiatives/Archive/Done/I01-requirements-and-backlog-creation/Archive/Done/I01-E06-implementation-backlog/Archive/Done/High/I01-E06-002-create-implementation-initiatives.md).

- **Scenario runner:** scripted, repeatable runs that check an outcome and report pass or fail.
- **Offline dispatch model:** a fast simulation of only the dispatch rules, to compare tuning
  values.
- **Race and ordering explorer:** tries different event orderings between the two modules and
  reports which ones break a rule.
- **Fault injection:** adds lag, delays, retries, crashes between steps, give-ups, and expiry to
  a run.
- **Invariant checker:** named rules checked at every step, with each violation linked to the
  event that caused it.
- **Design what-if testing:** runs designs that are open or not built yet, and compares the
  outcomes.
- **Decision explainer:** shows why each decision was made at any moment in a run.
- **Time-travel replay:** step forwards and backwards through a run, and repeat it exactly from
  a seed.
- **Real service conformance check:** compares the simulation's logic with the real service. How
  it works is undecided.
- **Scenario export:** saves a scenario as a file or link that someone else can rerun.
- **Fuzzing with shrinking:** random runs that reduce a failure to the smallest scenario that
  still fails.
- **Duplicate and idempotency testing:** repeated commands, repeated events, and keys reused
  with a different request.
- **Rollout simulation:** old and new versions running together, as during a rollout.
- **Stuck-order detection:** finds orders that can never finish.
- **Coverage map:** shows which transitions, rules, and error outcomes were exercised, and which
  states cannot be reached.
- **Multiple service instances:** several instances of the real service at once, with
  per-instance limits, single-run jobs, and races on a claim.
- **Cross-module event tracing:** follows one action from command to outbox, inbox, and copy,
  shown as a sequence diagram.
- **Parameter sweeps:** many runs across a range of tuning values, with charts of the results.
- **Business metrics:** time to assign, delivery time, driver load and fairness, and cash held.
- **Rule traceability:** each rule links to the decision behind it, and undecided behaviour is
  flagged.
- **Rule changelog:** the rule differences between versions, shown as a readable list.
- **Operational cost view:** notifications sent, polling work, and route-provider calls.
- **Manual mode:** the user acts as a driver or restaurant and steps through the flow by hand.
- **Model checker:** explores every reachable state for small setups, to prove a rule cannot be
  broken.
- **Load generator:** generates many drivers, restaurants, and orders for runs at volume.
- **Map view:** shows drivers, restaurants, and orders moving on a map.
- **Outbox and inbox inspector:** shows each module's outbox, inbox, and retry records at any
  step.
- **Clock control:** pause, speed up, slow down, or step the simulated time.
- **Assumption register:** lists every simulator assumption that does not come from the real
  service.
- **Scenario library:** search, tag, and organise saved scenarios.
- **Comparison dashboard:** shows the metrics of several versions side by side.
- **Scenario recorder:** records a manual-mode session and saves it as a scenario.
- **Event search:** filter and search a run's events by order, actor, kind, or time.
- **Version editor:** create and edit versions in the simulator's interface.
- **Rule editor:** change the rules themselves in the interface, not only their values.
- **Snapshot and branch:** save a run's state at a chosen point, then continue it differently.
- **Heatmaps:** show on the map where orders, waiting, and failures concentrate.
- **Driver timelines:** a timeline for each driver, showing their states and orders.
- **Order timeline:** a timeline for each order, covering everything that happened in both
  modules.
- **Run diff:** compare two runs event by event.
- **Glossary:** explains each term where it appears.
- **Scenario import:** load a scenario file someone else exported.
- **Batch runs:** run many scenarios unattended, then summarise the results.
- **Statistics across seeds:** shows how results are distributed across many seeds, not just one
  run.
- **Scenario validation:** checks that a scenario is well formed before it runs.
- **Checks from a run:** turns an observed run into the expected-outcome checks of a new
  scenario.
- **Version branching:** create a version from another one, and keep track of which version it
  came from.
- **Version validation:** checks that a version's rules are consistent before it runs.
- **Option switches:** switch between the options of an undecided question within a single
  version.
- **Compatibility matrix:** shows which versions can run together.
- **Step debugger:** set breakpoints on events or rules, and pause the run there.
- **Watch values:** follow a value, such as a driver's held orders, throughout a run.
- **Event injection:** add an event by hand at any point in a run.
- **State editor:** edit the state at a snapshot before continuing the run.
- **Payload viewer:** shows each event's payload, for each payload version.
- **Data model view:** shows the data each module keeps.
- **Load profiles:** named setups of areas, drivers, and orders, such as a lunch rush.
- **Actor behaviour profiles:** define how simulated drivers and restaurants behave.
- **Determinism check:** checks that repeating a run with the same seed gives identical results.
- **Simulator self-tests:** the simulator checks its own engine against known cases.
- **Criteria tracker:** shows which correctness criteria pass or fail for each version.
- **Scenario coverage report:** shows which criteria each scenario covers, and which no scenario
  covers.
- **Notification sequence view:** for each request, shows who was notified, when, and why.
- **Eligibility inspector:** for any driver and request, shows the result of each eligibility
  rule.
- **Score breakdown:** shows each part of a driver's dispatch score.
- **Time series charts:** shows how a metric changes over simulated time.
- **Fault presets:** named fault plans, such as an outbox outage or a slow inbox.
- **Random fault schedules:** faults injected at random times during a run.
- **Undecided dependency view:** shows which undecided questions a run's outcome depended on.
- **Lag monitor:** shows how far each inbox is behind the other module's outbox.
- **Retry timeline:** shows each retry, its backoff, and whether it was given up on.
- **Dead-letter view:** lists the events and commands that were given up on, with their reasons.
- **Pending command view:** shows the commands waiting on the other module.
- **Copy consistency check:** at any step, compares each module's copy of the other's data with
  its source.
- **Module disagreement view:** at any step, shows where the two modules disagree about an
  order.
- **Manual reordering:** lets the user choose the order in which pending events are delivered.
- **Idempotency record view:** shows the idempotency records, and which requests were replayed.
- **Lifecycle state diagram:** shows where each order is on the lifecycle state diagram.
- **Allowed actions panel:** shows which actions each actor can take now, and why the others are
  blocked.
- **Custody view:** shows who holds each order, and its cash, at any moment.
- **Cash ledger:** lists every cash movement for each driver.
- **Driver perspective:** see a run as one driver experiences it: their requests,
  notifications, and orders.
- **Restaurant perspective:** see a run as one restaurant experiences it: their orders, drivers,
  and requests.
- **Staff perspective:** see a run as back-office staff see it.
- **Job schedule view:** shows when each background job ran and what it did.
- **Instance view:** shows which service instance handled each piece of work.
- **Claims and leases view:** shows who holds each claim and lease, and when each expires.
- **Rate limit view:** shows each actor's usage against every rate limit.
- **Session and device view:** shows each actor's sessions and registered devices.
- **Event kind catalogue:** lists every event kind, with its payload versions, for each version.
- **Location track view:** shows each driver's recorded track and the time window of each
  recorded point.
- **Scenario timeline editor:** edit a scenario's planned actions on a timeline.
- **Criteria editor:** add and edit correctness criteria in the interface.
- **Invariant editor:** define new invariants in the interface.
- **Scenarios from criteria:** generate scenarios automatically from a criterion.
- **Version timeline:** shows the history of versions alongside the real service's changes.
- **Responsive while running:** heavy runs never freeze the page.
- **Run queue:** queue runs and watch their progress.
- **Stored run management:** see and delete the runs stored in the browser.
- **Tuning presets:** save a set of tuning values and reuse it.
- **Undo and redo:** undo and redo changes made in the editors.
- **Run labels:** name runs and attach labels to them.
- **Large run handling:** runs with very many events stay usable.
- **Coverage goals:** set a target coverage for each version and track progress towards it.
- **Version import and export:** share versions as files.
- **Assumption toggles:** turn a simulator assumption on or off to see its effect.
- **Sensitivity analysis:** shows which tuning values affect an outcome the most.
- **Value optimiser:** searches for the tuning values that best meet the stated targets.
- **Violation summary:** counts the violations of each invariant across many runs.
- **Regression suites:** named sets of scenarios that a version must pass.
- **Golden runs:** approved reference runs that a version's results are compared against.
- **Cross-version scenarios:** runs a scenario written for one version on another, adapting it
  where event kinds differ.
- **Metric drill-down:** click a metric to see the runs and events behind it.
- **Outlier finder:** finds runs whose results are unusual compared with the rest.
- **Trend across versions:** plots a metric across successive versions.
- **Difference explainer:** explains why two versions' outcomes differ, tracing back to the rule
  that changed.
- **Scenario chaining:** start a scenario from another scenario's end state.
- **Failure probability:** estimates how often a rule breaks under random conditions.
- **Hotspot ranking:** ranks rules and steps by how often they appear in failures.
- **Readable scenario format:** scenarios are stored in a documented file format that people can
  read.
- **Rule dependency graph:** shows which inputs and other rules each rule depends on.
- **Causality graph:** shows which events caused which other events in a run.
- **State space browser:** browse the states the model checker found.
- **Proof report:** lists which invariants the model checker proved, and for which setups.
- **Version lock:** freeze an approved version so it can no longer change.
- **Version provenance:** records which documents and decisions each version was built from.
- **Rule conflict detector:** finds rules that can contradict each other.
- **Dead rule detector:** finds rules that never fire in any run.
- **Module ownership view:** shows which module owns each rule and each piece of data.
- **Event flow map:** a diagram of every event kind that flows between the modules.
- **Interaction matrix:** shows which commands and events can interleave with which others.
- **Counterexample traces:** when a proof or check fails, shows the failing trace step by step.
- **Rule usage counts:** shows how often each rule fired, in one run or across a batch.
- **Decision distribution:** shows how often each possible outcome of a decision happened.
- **Critical path view:** shows the chain of steps that set an order's total time.
- **Wait-time breakdown:** shows where each order spent its time: waiting for a driver, being
  prepared, or travelling.
- **Message volume view:** shows the number of events of each kind over time.
- **Contention view:** shows where several actors competed for the same request or claim.
- **Retry storm detector:** finds bursts of retries.
- **Backlog growth warning:** warns when an inbox falls behind faster than it can catch up.
- **Driver utilisation:** shows the share of time each driver spends idle, travelling, and
  waiting.
- **Restaurant waiting view:** shows how long each restaurant waits for drivers.
- **Supply and demand view:** shows orders against available drivers over time, for each area.
- **Response rate view:** shows the share of notifications accepted, rejected, or ignored.
- **Notifications per acceptance:** shows how many notifications each accepted request needed.
- **Distance distribution:** shows how far drivers travel to reach restaurants.
- **Cash exposure view:** shows the cash held by drivers over time.
- **Fairness view:** shows how work and earnings are spread among drivers.
- **Area comparison:** compares metrics across service areas.
- **Time-of-day view:** shows metrics broken down by hour of the day.
- **Open order age view:** shows how long each open order has been waiting, at any point in a
  run.
- **Reassignment view:** shows how often orders move between drivers, and why.
- **Failure and return view:** shows the rates of, and reasons for, failed deliveries and
  returns.
- **Escalation view:** shows the orders that needed a person to step in.
- **Driver earnings view:** shows each driver's earnings over time.
- **Restaurant cash reconciliation:** compares the cash each restaurant confirmed with the cash it
  should have received.
- **Eligibility funnel:** for each request, shows how many drivers pass each eligibility rule
  in turn.
- **Location freshness view:** shows the share of drivers with a fresh location, over time.
- **Status change view:** shows driver status changes over time.
- **Job duration view:** shows how long each pass of a background job takes.
- **Notification failure view:** shows failed and undeliverable notifications over time.
- **Device reach view:** shows the share of notifications that reached at least one device.
- **Session churn view:** shows sign-ins, expiries, and revocations over time.
- **Conflict rate view:** shows how often commands run into conflicts.
- **Convergence time view:** shows how long the modules take to agree after each event.
- **Drift detector:** flags orders where the modules stayed apart for longer than the bound.
- **Pending request age view:** shows how long pending commands wait for the other module.
- **Replay rate view:** shows the share of commands replayed from an idempotency record.
- **Outbox size view:** shows the sizes of the outboxes, inboxes, and retry records over time.
- **Give-up rate view:** shows how often events and commands are given up on, over time.
- **Cleanup effect view:** shows the records each cleanup removed.
- **Clock skew view:** shows the differences between device time and server time.
- **Linked selection:** selecting an order, driver, or event in one view highlights it in every
  other view.
- **Synchronised playback:** play two runs side by side, kept in step on the same simulated
  time.
- **Search everywhere:** search across runs, scenarios, versions, and rules from one place.
- **Saved views:** save a view's settings and come back to it later.
- **Batch completion alerts:** tells the user when a long batch finishes.
- **Help pages:** built-in documentation for the simulator.
- **Detail level switch:** switch between a business level and a technical level of detail.
- **Version picker:** change which version a view shows, from within that view.
- **Recent items:** quick access to recently used runs, scenarios, and versions.
- **Run status bar:** always shows the current version, seed, and simulated time.
- **Request generation view:** shows every delivery request generation of an order, and how each
  ended.
- **Custody chain:** shows an order's full chain of custody over time.
- **Order cash chain:** shows every state of an order's cash: collected, confirmed, and
  returned.
- **Command journal:** lists every command with its idempotency key, result, and replays.
- **Rule evaluation log:** records every rule evaluation with its inputs and result.
- **Version summary:** a one-page summary of a version's rules and values.
- **Order across versions:** shows the same order, in the same scenario, under two versions side
  by side.
- **Order replay:** replays one order's events on their own, without the rest of the run.
- **Order what-if:** change one decision for an order and see what follows from it.
- **Order criteria check:** shows whether one order met every correctness criterion, and which
  it broke.

The user approved these on 2026-11-03; the list is complete for now, and more may be added.
[I01-E01-002](../../../backlogs/Initiatives/Archive/Done/I01-requirements-and-backlog-creation/Archive/Done/I01-E01-vision-and-scope/Archive/Done/High/I01-E01-002-decide-candidate-capabilities.md)
recorded the question.

Amended 2026-11-08 by the user: Order replay shows the commits that touched one order, and its
version chain, as [FND-81](run-history.md#fnd-81--runs-as-a-tree-of-state-transitions) settled, not
one order's events replayed on their own.

### FND-36 — Inventory per version

Each version of the real service gets its own folder of design documents under
`docs/design/versions/<version>/`. The inventory of flows, states, actors, events, and decisions
is that version's specification. How versions are named and created is decided in
[I01-E04-001](../../../backlogs/Initiatives/Archive/Done/I01-requirements-and-backlog-creation/Archive/Done/I01-E04-versioning-and-comparison/Archive/Done/High/I01-E04-001-what-a-version-is.md).

### FND-37 — Inventory coverage

The inventory covers the real service as built, each approved but unbuilt design as its own
version, and each option of the real service's undecided questions, so that each option can be
selected with an option switch.

### FND-38 — Order detail

The simulation models the order in full detail:

- **Products and lines:** products, quantities, and line positions.
- **Prices, fees, and commission:** customer and restaurant prices, delivery fee bands, and
  commission models.
- **Customers and addresses:** customers with their addresses and cities.
- **Restaurants and areas:** restaurants with their locations, staff, service areas, and hours.

### FND-39 — Source conflicts resolved

Where the real service's documents disagree, the user decides which the simulator follows
([FND-9](purpose-and-scope.md#fnd-9--sources-of-business-rules)). Decided so far:

- **Rejected requests:** a driver's rejection closes the request, and an ignore keeps it open
  for other drivers (2026-11-03; recorded under FND-29).
- **When a return may be requested:** the driver holding the order may request a return only
  after a failed delivery attempt, as the real service's code does. The user first chose any
  time after pickup, then corrected it on 2026-11-03 once the code was checked.
- **Return acceptance and payment return:** accepting a return never waits for a payment return,
  as the code does and the revised dispatch rules say; the older text that blocks it is
  superseded (2026-11-03). The FND-29 criterion "Return not gated" stands.
- **Dispatch:** dispatch is under development in the real service. It is modelled both as the
  code has it today and as its planned design, as two versions (2026-11-03).
- **Module copies design:** an earlier conflict about its undecided items U1 to U10 rested on a
  stale reading of the real service's record. The record decides all of them, and the simulator
  follows its decisions, with no option switches for them (corrected 2026-11-03).
