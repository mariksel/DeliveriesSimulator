# Project Foundation

## Version and authority

- **Design version:** `D0.6.0`.
- **Scope:** The whole project, at its pre-implementation baseline.
- **Approval:** Approved by the user on 2026-11-03, while adopting the documentation
  template. Items under [Undecided](#undecided) are not approved.
- **Implementation status:** Approved, not implemented. The first initiative,
  [I01](../../backlogs/Initiatives/Archive/Done/I01-requirements-and-backlog-creation/I01-requirements-and-backlog-creation-backlog.md),
  gathered the requirements. The
  [implementation roadmap](../roadmap/implementation-roadmap.md) tracks the stages, from `I02`.
- **Current behavior:** An empty application. The source holds only the workspace.

## Problem

The design documents need project facts, and there is no source to observe them from.
This record holds what the user stated, so the other pages can link to one source.

## Approved decisions

On 2026-11-10, at the user's request, the records moved out of this document into topic
files, as it had grown too long to read. Each record keeps its ID, heading, and wording, so a
link names the topic file and the record's anchor. The records are grouped by topic:

- [Purpose and scope](project-foundation/purpose-and-scope.md) — What the simulator is for, who uses
  it, what it covers, and what it leaves out.
- [Correctness and success](project-foundation/correctness-and-success.md) — What correct means, for
  the business and technically, what the results decide, and how success is measured.
- [Capabilities and inventory](project-foundation/capabilities-and-inventory.md) — The capabilities
  the simulator needs, and the inventory of the real service it models.
- [Versions](project-foundation/versions.md) — Kinds of version, their numbers, lifecycle, and
  folder layout.
- [Simulation model](project-foundation/simulation-model.md) — How a run is simulated: its detail,
  failures, scenarios, comparisons, time, randomness, and the event log.
- [Architecture and code](project-foundation/architecture-and-code.md) — The stack, layers, modules,
  storage, checks, and code style.
- [User interface](project-foundation/ui.md) — How the UI is organised, the application shell, and
  the inspectors.
- [Stages and process](project-foundation/stages-and-process.md) — How the work is staged and
  planned, and the rule that keeps the project safe to publish.
- [Run history](project-foundation/run-history.md) — Runs as a tree of state transitions, and
  replaying, forking, and debugging them.

| ID | Decision | File |
| --- | --- | --- |
| [FND-1](project-foundation/purpose-and-scope.md#fnd-1--purpose-and-boundary) | Purpose and boundary | Purpose and scope |
| [FND-2](project-foundation/purpose-and-scope.md#fnd-2--real-service-not-named) | Real service not named | Purpose and scope |
| [FND-3](project-foundation/architecture-and-code.md#fnd-3--technology-stack) | Technology stack | Architecture and code |
| [FND-4](project-foundation/architecture-and-code.md#fnd-4--data-in-browser-storage) | Data in browser storage | Architecture and code |
| [FND-5](project-foundation/purpose-and-scope.md#fnd-5--no-integrations-today) | No integrations today | Purpose and scope |
| [FND-6](project-foundation/purpose-and-scope.md#fnd-6--design-sections) | Design sections | Purpose and scope |
| [FND-7](project-foundation/purpose-and-scope.md#fnd-7--users) | Users | Purpose and scope |
| [FND-8](project-foundation/purpose-and-scope.md#fnd-8--capability-list) | Capability list | Purpose and scope |
| [FND-9](project-foundation/purpose-and-scope.md#fnd-9--sources-of-business-rules) | Sources of business rules | Purpose and scope |
| [FND-10](project-foundation/purpose-and-scope.md#fnd-10--checking-against-the-real-service) | Checking against the real service | Purpose and scope |
| [FND-11](project-foundation/architecture-and-code.md#fnd-11--clean-architecture-with-a-framework-free-core) | Clean architecture with a framework-free core | Architecture and code |
| [FND-12](project-foundation/architecture-and-code.md#fnd-12--custom-vite-build) | Custom Vite build | Architecture and code |
| [FND-13](project-foundation/architecture-and-code.md#fnd-13--layers-and-source-layout) | Layers and source layout | Architecture and code |
| [FND-14](project-foundation/architecture-and-code.md#fnd-14--vite-plugin) | Vite plugin | Architecture and code |
| [FND-15](project-foundation/architecture-and-code.md#fnd-15--indexeddb) | IndexedDB | Architecture and code |
| [FND-16](project-foundation/architecture-and-code.md#fnd-16--angular-version) | Angular version | Architecture and code |
| [FND-17](project-foundation/architecture-and-code.md#fnd-17--test-tools) | Test tools | Architecture and code |
| [FND-18](project-foundation/architecture-and-code.md#fnd-18--use-of-domain-by-outer-layers) | Use of Domain by outer layers | Architecture and code |
| [FND-19](project-foundation/architecture-and-code.md#fnd-19--composition-root-and-dependency-inversion) | Composition root and dependency inversion | Architecture and code |
| [FND-20](project-foundation/architecture-and-code.md#fnd-20--module-placement-in-layers) | Module placement in layers | Architecture and code |
| [FND-21](project-foundation/architecture-and-code.md#fnd-21--validation) | Validation | Architecture and code |
| [FND-22](project-foundation/architecture-and-code.md#fnd-22--error-reporting) | Error reporting | Architecture and code |
| [FND-23](project-foundation/stages-and-process.md#fnd-23--safe-to-publish) | Safe to publish | Stages and process |
| [FND-24](project-foundation/purpose-and-scope.md#fnd-24--goal-is-correctness) | Goal is correctness | Purpose and scope |
| [FND-25](project-foundation/purpose-and-scope.md#fnd-25--simulatable-visible-and-tunable) | Simulatable, visible, and tunable | Purpose and scope |
| [FND-26](project-foundation/purpose-and-scope.md#fnd-26--versions-compared-side-by-side) | Versions compared side by side | Purpose and scope |
| [FND-27](project-foundation/stages-and-process.md#fnd-27--covered-in-stages) | Covered in stages | Stages and process |
| [FND-28](project-foundation/stages-and-process.md#fnd-28--backlog-first) | Backlog first | Stages and process |
| [FND-29](project-foundation/correctness-and-success.md#fnd-29--business-correctness) | Business correctness | Correctness and success |
| [FND-30](project-foundation/correctness-and-success.md#fnd-30--technical-correctness) | Technical correctness | Correctness and success |
| [FND-31](project-foundation/correctness-and-success.md#fnd-31--decisions-the-results-support) | Decisions the results support | Correctness and success |
| [FND-32](project-foundation/correctness-and-success.md#fnd-32--success) | Success | Correctness and success |
| [FND-33](project-foundation/purpose-and-scope.md#fnd-33--out-of-scope) | Out of scope | Purpose and scope |
| [FND-34](project-foundation/capabilities-and-inventory.md#fnd-34--required-capabilities) | Required capabilities | Capabilities and inventory |
| [FND-35](project-foundation/purpose-and-scope.md#fnd-35--later-capabilities) | Later capabilities | Purpose and scope |
| [FND-36](project-foundation/capabilities-and-inventory.md#fnd-36--inventory-per-version) | Inventory per version | Capabilities and inventory |
| [FND-37](project-foundation/capabilities-and-inventory.md#fnd-37--inventory-coverage) | Inventory coverage | Capabilities and inventory |
| [FND-38](project-foundation/capabilities-and-inventory.md#fnd-38--order-detail) | Order detail | Capabilities and inventory |
| [FND-39](project-foundation/capabilities-and-inventory.md#fnd-39--source-conflicts-resolved) | Source conflicts resolved | Capabilities and inventory |
| [FND-40](project-foundation/versions.md#fnd-40--kinds-of-version) | Kinds of version | Versions |
| [FND-41](project-foundation/versions.md#fnd-41--version-numbers) | Version numbers | Versions |
| [FND-42](project-foundation/versions.md#fnd-42--first-versions) | First versions | Versions |
| [FND-43](project-foundation/versions.md#fnd-43--what-may-differ-between-versions) | What may differ between versions | Versions |
| [FND-44](project-foundation/versions.md#fnd-44--version-lifecycle) | Version lifecycle | Versions |
| [FND-45](project-foundation/versions.md#fnd-45--version-folder-layout) | Version folder layout | Versions |
| [FND-46](project-foundation/simulation-model.md#fnd-46--simulation-detail) | Simulation detail | Simulation model |
| [FND-47](project-foundation/simulation-model.md#fnd-47--failures) | Failures | Simulation model |
| [FND-48](project-foundation/simulation-model.md#fnd-48--simulation-model) | Simulation model | Simulation model |
| [FND-49](project-foundation/simulation-model.md#fnd-49--scenarios) | Scenarios | Simulation model |
| [FND-50](project-foundation/simulation-model.md#fnd-50--targets-and-limits) | Targets and limits | Simulation model |
| [FND-51](project-foundation/simulation-model.md#fnd-51--comparison) | Comparison | Simulation model |
| [FND-52](project-foundation/simulation-model.md#fnd-52--conformance-exchange) | Conformance exchange | Simulation model |
| [FND-53](project-foundation/ui.md#fnd-53--ui-organisation) | UI organisation | User interface |
| [FND-54](project-foundation/simulation-model.md#fnd-54--tunability) | Tunability | Simulation model |
| [FND-55](project-foundation/simulation-model.md#fnd-55--offline-dispatch-model) | Offline dispatch model | Simulation model |
| [FND-56](project-foundation/architecture-and-code.md#fnd-56--module-boundaries) | Module boundaries | Architecture and code |
| [FND-57](project-foundation/architecture-and-code.md#fnd-57--hosting-and-data) | Hosting and data | Architecture and code |
| [FND-58](project-foundation/architecture-and-code.md#fnd-58--stored-records-and-shared-files) | Stored records and shared files | Architecture and code |
| [FND-59](project-foundation/stages-and-process.md#fnd-59--requirements-approved) | Requirements approved | Stages and process |
| [FND-60](project-foundation/stages-and-process.md#fnd-60--implementation-stages) | Implementation stages | Stages and process |
| [FND-61](project-foundation/architecture-and-code.md#fnd-61--node-and-typescript-versions) | Node and TypeScript versions | Architecture and code |
| [FND-62](project-foundation/architecture-and-code.md#fnd-62--dependency-injection-and-architecture-check) | Dependency injection and architecture check | Architecture and code |
| [FND-63](project-foundation/architecture-and-code.md#fnd-63--tests-and-public-safety-check) | Tests and public-safety check | Architecture and code |
| [FND-64](project-foundation/simulation-model.md#fnd-64--clock-speed) | Clock speed | Simulation model |
| [FND-65](project-foundation/simulation-model.md#fnd-65--event-log-entries) | Event log entries | Simulation model |
| [FND-66](project-foundation/simulation-model.md#fnd-66--seeded-randomness) | Seeded randomness | Simulation model |
| [FND-67](project-foundation/stages-and-process.md#fnd-67--scope-of-the-skeleton) | Scope of the skeleton | Stages and process |
| [FND-68](project-foundation/simulation-model.md#fnd-68--equal-scores-and-open-request-order) | Equal scores and open request order | Simulation model |
| [FND-69](project-foundation/architecture-and-code.md#fnd-69--module-jobs-and-the-module-graph-check) | Module jobs and the module graph check | Architecture and code |
| [FND-70](project-foundation/simulation-model.md#fnd-70--scenario-format) | Scenario format | Simulation model |
| [FND-71](project-foundation/architecture-and-code.md#fnd-71--code-style-and-quality-tools) | Code style and quality tools | Architecture and code |
| [FND-72](project-foundation/architecture-and-code.md#fnd-72--code-style) | Code style | Architecture and code |
| [FND-73](project-foundation/architecture-and-code.md#fnd-73--immutable-architecture) | Immutable architecture | Architecture and code |
| [FND-74](project-foundation/simulation-model.md#fnd-74--driver-and-restaurant-vocabulary) | Driver and restaurant vocabulary | Simulation model |
| [FND-75](project-foundation/correctness-and-success.md#fnd-75--first-criteria-as-judged) | First criteria as judged | Correctness and success |
| [FND-76](project-foundation/ui.md#fnd-76--application-shell-and-components) | Application shell and components | User interface |
| [FND-77](project-foundation/ui.md#fnd-77--event-list-and-payload-viewer) | Event list and Payload viewer | User interface |
| [FND-78](project-foundation/ui.md#fnd-78--outbox-and-inbox-inspector) | Outbox and inbox inspector | User interface |
| [FND-79](project-foundation/ui.md#fnd-79--cross-module-event-tracing) | Cross-module event tracing | User interface |
| [FND-80](project-foundation/stages-and-process.md#fnd-80--planning-stage-i03) | Planning stage I03 | Stages and process |
| [FND-81](project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions) | Runs as a tree of state transitions | Run history |
| [FND-82](project-foundation/architecture-and-code.md#fnd-82--application-core-layer) | Application core layer | Architecture and code |
| [FND-83](project-foundation/architecture-and-code.md#fnd-83--types-owned-by-their-modules) | Types owned by their modules | Architecture and code |
| [FND-84](project-foundation/architecture-and-code.md#fnd-84--rule-abstractions) | Rule abstractions | Architecture and code |
| [FND-85](project-foundation/architecture-and-code.md#fnd-85--system-submodules) | System submodules | Architecture and code |
| [FND-86](project-foundation/run-history.md#fnd-86--time-travel-replay) | Time-travel replay | Run history |
| [FND-87](project-foundation/run-history.md#fnd-87--forks-and-named-timelines) | Forks and named timelines | Run history |
| [FND-88](project-foundation/run-history.md#fnd-88--step-debugger) | Step debugger | Run history |
| [FND-89](project-foundation/run-history.md#fnd-89--indirect-effects-stated-by-hand) | Indirect effects stated by hand | Run history |
| [FND-90](project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward) | Map and a simple city brought forward | Stages and process |

## Superseded when implemented

These stay in force until the item named builds what replaces them. Once it has, the row says when:

| Statement | Replaced by | When |
| --- | --- | --- |
| [FND-73](project-foundation/architecture-and-code.md#fnd-73--immutable-architecture): scheduled work and each random stream's position are in a run's state | Worked out, or held in the effects sub-root ([FND-81](project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)) | I03-E02-006, built 2026-11-06 |
| [FND-56](project-foundation/architecture-and-code.md#fnd-56--module-boundaries): the Event log holds a run's record | Commits hold it, and the log is worked out from them ([FND-81](project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)) | I03-E02-006, built 2026-11-06 |
| [FND-83](project-foundation/architecture-and-code.md#fnd-83--types-owned-by-their-modules): the shared helpers, such as `required` and `fields-of`, stay at the root of `src/domain` | Each sits in a System submodule, and the Domain and Infrastructure roots hold module folders only ([FND-85](project-foundation/architecture-and-code.md#fnd-85--system-submodules)) | I03-E02-020, built 2026-11-07 |
| [FND-81](project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions): a `ConfigChanged` entry holds the values before and after | It holds each changed value, by rule and parameter ID, before and after; the commit's effect still holds every module's rules before and after ([FND-84](project-foundation/architecture-and-code.md#fnd-84--rule-abstractions)) | I03-E04-012, built 2026-11-07 |

## Undecided

| ID | Question | Why it matters |
| --- | --- | --- |
| U12 | How soon after a new version of the real service is designed or built must the simulator support it? | FND-32 measures success by it |
| U13 | Which module owns the later Report generator? | Decided when it is built (FND-35) |
| U14 | Where is the project hosted and published, and how is FND-23 checked before it is? | The project must stay safe to publish (FND-23); the check in FND-63 cannot see names, git history, or commit authors |

## Rule for resolving an unknown

Resolve each item through a user-approved decision, then move it into
[Approved decisions](#approved-decisions) and update
[open decisions](../governance/open-decisions.md). Do not build on an undecided
item.
