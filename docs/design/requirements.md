# Requirements

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Consolidated on 2026-11-03 in
  I01-E06-001,
  and approved by the user area by area the same day
  ([FND-59](decisions/project-foundation.md#fnd-59--requirements-approved)). Not implemented: no
  source exists.

What the simulator must do, by area. Each line summarises an approved record and links to it;
the linked record is authoritative, and this page adds no rule of its own.

## Purpose and goal

- Simulates the real service's delivery algorithms and flows, not the service as a running
  system, entirely in the frontend
  ([FND-1](decisions/project-foundation.md#fnd-1--purpose-and-boundary),
  [FND-24](decisions/project-foundation.md#fnd-24--goal-is-correctness)).
- The goal is business and technical correctness, especially the event communication between the
  orders and deliveries modules
  ([FND-24](decisions/project-foundation.md#fnd-24--goal-is-correctness)).
- Every event and every technical and business decision is simulatable, visible, and tunable
  ([FND-25](decisions/project-foundation.md#fnd-25--simulatable-visible-and-tunable)).
- Versions of the real service are tested and compared side by side
  ([FND-26](decisions/project-foundation.md#fnd-26--versions-compared-side-by-side)).
- The whole delivery lifecycle is covered, in stages
  ([FND-27](decisions/project-foundation.md#fnd-27--covered-in-stages)).
- The users are business stakeholders, developers, testers or QA, and trainers or new staff
  ([FND-7](decisions/project-foundation.md#fnd-7--users)).

## Correctness and success

- A run is correct for the business
  ([FND-29](decisions/project-foundation.md#fnd-29--business-correctness)) and technically
  ([FND-30](decisions/project-foundation.md#fnd-30--technical-correctness)) when the listed
  criteria hold, within the targets and limits of
  [FND-50](decisions/project-foundation.md#fnd-50--targets-and-limits).
- The results support approving design changes, finding real-service bugs, tuning values, and
  explaining and training
  ([FND-31](decisions/project-foundation.md#fnd-31--decisions-the-results-support)).
- Success is finding real flaws, being trusted for decisions, and keeping up with the real
  service ([FND-32](decisions/project-foundation.md#fnd-32--success)).

## Scope

- The required capabilities
  ([FND-34](decisions/project-foundation.md#fnd-34--required-capabilities)) and the later ones
  ([FND-35](decisions/project-foundation.md#fnd-35--later-capabilities)), each with one owner in
  [capability ownership](modules/capability-ownership.md).
  The [implementation roadmap](roadmap/implementation-roadmap.md) says which stage builds each.
- What is out of scope ([FND-33](decisions/project-foundation.md#fnd-33--out-of-scope)).

## What is simulated

- The real service's behaviour, specified per [version](versions/README.md): as built, as
  approved designs, and with its undecided options as option switches
  ([FND-36](decisions/project-foundation.md#fnd-36--inventory-per-version),
  [FND-37](decisions/project-foundation.md#fnd-37--inventory-coverage)).
- Orders in full detail ([FND-38](decisions/project-foundation.md#fnd-38--order-detail)).
- Full technical detail, the push pipeline, and the device model
  ([FND-46](decisions/project-foundation.md#fnd-46--simulation-detail)).
- Failures, how they are produced, and the drift report
  ([FND-47](decisions/project-foundation.md#fnd-47--failures)).
- Time, repeatability, the synthetic city, scale, and behaviour profiles
  ([FND-48](decisions/project-foundation.md#fnd-48--simulation-model)).
- A run as a timeline of state and effect commits, which can be replayed, forked, saved at chosen
  levels, and recalculated
  ([FND-81](decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions)),
  described in [Simulation engine](modules/simulation-engine.md#how-a-run-is-held) and
  [Run history](modules/run-history.md).
- Where the real service's sources conflict, the user decides, one conflict at a time
  ([FND-9](decisions/project-foundation.md#fnd-9--sources-of-business-rules),
  [FND-39](decisions/project-foundation.md#fnd-39--source-conflicts-resolved)).

## Scenarios, tuning, and analysis

- Scenarios: format, authors, where they run, pass and fail, and the first library
  ([FND-49](decisions/project-foundation.md#fnd-49--scenarios)).
- Values can be tuned during and between runs, with presets and valid ranges
  ([FND-54](decisions/project-foundation.md#fnd-54--tunability)).
- The offline dispatch model
  ([FND-55](decisions/project-foundation.md#fnd-55--offline-dispatch-model)).

## Versions, comparison, and conformance

- Kinds of version, numbers, the first versions, what may differ, lifecycle, and folder layout
  ([FND-40](decisions/project-foundation.md#fnd-40--kinds-of-version) to
  [FND-45](decisions/project-foundation.md#fnd-45--version-folder-layout)).
- Comparison of any number of versions, live and afterwards
  ([FND-51](decisions/project-foundation.md#fnd-51--comparison)).
- The conformance exchange with the real service, through standard files
  ([FND-52](decisions/project-foundation.md#fnd-52--conformance-exchange)).

## Application

- The UI's sections, run workspace, and views
  ([FND-53](decisions/project-foundation.md#fnd-53--ui-organisation)), described in
  [UI](ui/README.md).
- The modules, their boundaries, and their dependencies
  ([FND-56](decisions/project-foundation.md#fnd-56--module-boundaries)), in the
  [module map](modules/README.md).
- TypeScript, Angular 22, a custom Vite 8 build, IndexedDB, Vitest, and Playwright, in a clean
  architecture with a framework-free core
  ([FND-3](decisions/project-foundation.md#fnd-3--technology-stack),
  [FND-11](decisions/project-foundation.md#fnd-11--clean-architecture-with-a-framework-free-core)
  to [FND-22](decisions/project-foundation.md#fnd-22--error-reporting)), described in the
  [architecture overview](architecture/overview.md).
- Local hosting, current desktop browsers, and data kept until deleted and migrated across
  releases ([FND-57](decisions/project-foundation.md#fnd-57--hosting-and-data)); stored records
  and shared files
  ([FND-58](decisions/project-foundation.md#fnd-58--stored-records-and-shared-files)); described
  in [data](data/persistence.md).
- Safe to publish: only identity is private
  ([FND-23](decisions/project-foundation.md#fnd-23--safe-to-publish)).

## Process

- Backlog first: requirements are gathered by asking the user before implementation starts
  ([FND-28](decisions/project-foundation.md#fnd-28--backlog-first)).

## Still undecided

U12, U13, and U14 are open, as the
[project foundation](decisions/project-foundation.md#undecided) lists them. Undecided questions
of the real service become option switches in the version that adds each feature
([versions](versions/README.md#waiting-for-later-versions)). Implementation may start with the
three open ([FND-59](decisions/project-foundation.md#fnd-59--requirements-approved)).
