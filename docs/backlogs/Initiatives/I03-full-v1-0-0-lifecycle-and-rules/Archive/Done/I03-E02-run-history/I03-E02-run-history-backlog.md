# I03-E02 — Run history

Restructures a run into commits over a main root with two sub-roots, so runs can be replayed,
forked, saved at chosen levels, and compared. Everything later in the stage builds on it. FND-81
stays authoritative for its behaviour and acceptance details.

## Epic summary

- **Non-archived**
  - No non-archived items.
- **Archived**
  - [I03-E02-009 — Snapshot tests](Archive/Done/High/I03-E02-009-snapshot-tests.md) — Archived — Done — Last updated: 2026-11-10 — Priority: High
    - Phases:
      - `I03-E02-009-P01` — Rerunning with own and newest versions, in the core — Done — Last updated: 2026-11-10
      - `I03-E02-009-P02` — The repository's saved runs, in `npm run check` — Done — Last updated: 2026-11-10
      - `I03-E02-009-P03` — The Snapshot test action — Done — Last updated: 2026-11-10
  - [I03-E02-026 — Implementation change and the use step](Archive/Done/High/I03-E02-026-implementation-change-and-the-use-step.md) — Archived — Done — Last updated: 2026-11-10 — Priority: High
    - Phases:
      - `I03-E02-026-P01` — The implementation change commit, and schema version 2 — Done — Last updated: 2026-11-10
      - `I03-E02-026-P02` — The `use` step — Done — Last updated: 2026-11-10
      - `I03-E02-026-P03` — Switching in the Rules panel, forks, and Repeat — Done — Last updated: 2026-11-10
  - [I03-E02-024 — Saved-run screens and deleting branches](Archive/Done/High/I03-E02-024-saved-run-screens-and-deleting-branches.md) — Archived — Done — Last updated: 2026-11-10 — Priority: High
    - Phases:
      - `I03-E02-024-P01` — Save, from the run controls — Done — Last updated: 2026-11-10
      - `I03-E02-024-P02` — The list of saved runs, and opening one — Done — Last updated: 2026-11-10
      - `I03-E02-024-P03` — Deleting a branch — Done — Last updated: 2026-11-10
  - [I03-E02-008 — Saved runs at two levels](Archive/Done/High/I03-E02-008-saved-runs-at-two-levels.md) — Archived — Done — Last updated: 2026-11-09 — Priority: High
    - Phases:
      - `I03-E02-008-P01` — Asynchronous storage in IndexedDB, with a schema version — Done — Last updated: 2026-11-09
      - `I03-E02-008-P02` — "Minimum", rebuilt from calls with progress — Done — Last updated: 2026-11-09
      - `I03-E02-008-P03` — Moving between levels, measured on a city day — Done — Last updated: 2026-11-09
      - `I03-E02-008-P04` — The shared form at "everything" — Done — Last updated: 2026-11-09
  - [I03-E02-015 — Timeline views](Archive/Done/High/I03-E02-015-timeline-views.md) — Archived — Done — Last updated: 2026-11-09 — Priority: High
    - Phases:
      - `I03-E02-015-P01` — The orders and drivers each commit touched — Cancelled — Last updated: 2026-11-09
      - `I03-E02-015-P02` — The views by order and by driver — Done — Last updated: 2026-11-09
      - `I03-E02-015-P03` — The switch, the highlight, and an order's versions — Done — Last updated: 2026-11-09
      - `I03-E02-015-P04` — A city day followed live, and the pages — Done — Last updated: 2026-11-09
  - [I03-E02-016 — Gaps, filter, and collapsed runs](Archive/Done/High/I03-E02-016-gaps-filter-and-collapsed-runs.md) — Archived — Done — Last updated: 2026-11-09 — Priority: High
    - Phases:
      - `I03-E02-016-P01` — The filter, and collapsed empty job runs — Done — Last updated: 2026-11-09
      - `I03-E02-016-P02` — Gap rows and the threshold — Done — Last updated: 2026-11-09
      - `I03-E02-016-P03` — The axis, with rows of varying height — Done — Last updated: 2026-11-09
  - [I03-E02-021 — Links across the sub-roots](Archive/Done/High/I03-E02-021-links-across-the-sub-roots.md) — Archived — Done — Last updated: 2026-11-09 — Priority: High
    - Phases:
      - `I03-E02-021-P01` — Versions that name the work that made them — Done — Last updated: 2026-11-09
      - `I03-E02-021-P02` — Effects that list the versions they read — Done — Last updated: 2026-11-09
      - `I03-E02-021-P03` — The maker survives saving — Done — Last updated: 2026-11-09
      - `I03-E02-021-P04` — One query module — Done — Last updated: 2026-11-09
      - `I03-E02-021-P05` — An index for city scale — Done — Last updated: 2026-11-09
  - [I03-E02-022 — Indirect effect labels and config change links](Archive/Done/High/I03-E02-022-indirect-effect-labels-and-config-change-links.md) — Archived — Done — Last updated: 2026-11-09 — Priority: High
    - Phases:
      - `I03-E02-022-P01` — A config change that follows from an indirect commit — Done — Last updated: 2026-11-09
      - `I03-E02-022-P02` — Labels in the form, and picking one in the Rules panel — Done — Last updated: 2026-11-09
  - [I03-E02-023 — Versioned scenario storage](Archive/Done/High/I03-E02-023-versioned-scenario-storage.md) — Archived — Done — Last updated: 2026-11-09 — Priority: High
    - Phases:
      - `I03-E02-023-P01` — Scenario versions, in the core — Done — Last updated: 2026-11-09
      - `I03-E02-023-P02` — Their storage in IndexedDB — Done — Last updated: 2026-11-09
  - [I03-E02-025 — Function versions](Archive/Done/High/I03-E02-025-function-versions.md) — Archived — Done — Last updated: 2026-11-09 — Priority: High
    - Phases:
      - `I03-E02-025-P01` — The registry by name and version, and the lookup — Done — Last updated: 2026-11-09
      - `I03-E02-025-P02` — Calling through the versions a run holds — Done — Last updated: 2026-11-09
  - [I03-E02-011 — Step debugger](Archive/Done/High/I03-E02-011-step-debugger.md) — Archived — Done — Last updated: 2026-11-08 — Priority: High
    - Phases:
      - `I03-E02-011-P01` — Breakpoints and what they match, in the core — Done — Last updated: 2026-11-08
      - `I03-E02-011-P02` — The run pauses at a hit, and goes on — Done — Last updated: 2026-11-08
      - `I03-E02-011-P03` — The Breakpoints tab, and setting one from an event — Done — Last updated: 2026-11-08
  - [I03-E02-013 — Indirect effects stated by hand](Archive/Done/High/I03-E02-013-indirect-effects-stated-by-hand.md) — Archived — Done — Last updated: 2026-11-08 — Priority: High
    - Phases:
      - `I03-E02-013-P01` — The indirect commit, in the core — Done — Last updated: 2026-11-08
      - `I03-E02-013-P02` — Stating one in a scenario and in a live run — Done — Last updated: 2026-11-08
      - `I03-E02-013-P03` — The action, and the unaware span on the timeline — Done — Last updated: 2026-11-08
  - [I03-E02-014 — Zoomable timeline](Archive/Done/High/I03-E02-014-zoomable-timeline.md) — Archived — Done — Last updated: 2026-11-08 — Priority: High
    - Phases:
      - `I03-E02-014-P05` — Forks renamed branches — Done — Last updated: 2026-11-07
      - `I03-E02-014-P01` — The grid of branches and commits, worked out — Done — Last updated: 2026-11-07
      - `I03-E02-014-P02` — The watched run shows any commit of any branch — Done — Last updated: 2026-11-07
      - `I03-E02-014-P03` — The timeline panel in place of the event list — Done — Last updated: 2026-11-07
      - `I03-E02-014-P04` — Links between modules, and the pages — Done — Last updated: 2026-11-08
  - [I03-E02-002 — Records split with version chains](Archive/Done/High/I03-E02-002-records-split-with-version-chains.md) — Archived — Done — Last updated: 2026-11-07 — Priority: High
  - [I03-E02-010 — Time-travel replay](Archive/Done/High/I03-E02-010-time-travel-replay.md) — Archived — Done — Last updated: 2026-11-07 — Priority: High
    - Phases:
      - `I03-E02-010-P01` — Moving between commits, and repeating from one, in the core — Done — Last updated: 2026-11-07
      - `I03-E02-010-P02` — The watched run moves, and repeats from where it is — Done — Last updated: 2026-11-07
      - `I03-E02-010-P03` — Back, Forward, the slider, and Repeat from here — Done — Last updated: 2026-11-07
  - [I03-E02-012 — Forks and named timelines](Archive/Done/High/I03-E02-012-forks-and-named-timelines.md) — Archived — Done — Last updated: 2026-11-07 — Priority: High
    - Phases:
      - `I03-E02-012-P01` — A run as a tree of timelines, in the core — Done — Last updated: 2026-11-07
      - `I03-E02-012-P02` — Saved runs and verdicts for every timeline — Done — Last updated: 2026-11-07
      - `I03-E02-012-P03` — The watched run forks, switches, and renames — Done — Last updated: 2026-11-07
      - `I03-E02-012-P04` — The Timelines tab and Fork here — Done — Last updated: 2026-11-07
  - [I03-E02-017 — Measure a city day with commits](Archive/Done/High/I03-E02-017-measure-a-city-day-with-commits.md) — Archived — Done — Last updated: 2026-11-07 — Priority: High
  - [I03-E02-019 — Types owned by their modules](Archive/Done/High/I03-E02-019-types-owned-by-their-modules.md) — Archived — Done — Last updated: 2026-11-07 — Priority: High
    - Phases:
      - `I03-E02-019-P01` — Module map and pages — Done — Last updated: 2026-11-07
      - `I03-E02-019-P02` — Modules moved into place — Done — Last updated: 2026-11-07
      - `I03-E02-019-P03` — Rules into their modules — Done — Last updated: 2026-11-07
      - `I03-E02-019-P04` — The System module and time as an interface — Done — Last updated: 2026-11-07
      - `I03-E02-019-P05` — Branded numbers to their owners — Done — Last updated: 2026-11-07
      - `I03-E02-019-P06` — IDs beside their classes — Done — Last updated: 2026-11-07
  - [I03-E02-020 — System submodules](Archive/Done/High/I03-E02-020-system-submodules.md) — Archived — Done — Last updated: 2026-11-07 — Priority: High
    - Phases:
      - `I03-E02-020-P01` — System's own files into time, randomness, and math — Done — Last updated: 2026-11-07
      - `I03-E02-020-P02` — The helpers into validation, classes, and digests — Done — Last updated: 2026-11-07
      - `I03-E02-020-P03` — The version chain and the inbox position into records and messaging — Done — Last updated: 2026-11-07
      - `I03-E02-020-P04` — Infrastructure's shared files into its System submodules — Done — Last updated: 2026-11-07
  - [I03-E02-006 — Simulator data worked out](Archive/Done/High/I03-E02-006-simulator-data-worked-out.md) — Archived — Done — Last updated: 2026-11-06 — Priority: High
  - [I03-E02-007 — Function identity and the repository](Archive/Done/High/I03-E02-007-function-identity-and-the-repository.md) — Archived — Done — Last updated: 2026-11-06 — Priority: High
  - [I03-E02-018 — Typed core](Archive/Done/High/I03-E02-018-typed-core.md) — Archived — Done — Last updated: 2026-11-06 — Priority: High
    - Phases:
      - `I03-E02-018-P01` — Typed log entries — Done — Last updated: 2026-11-06
      - `I03-E02-018-P07` — Application.Core layer — Done — Last updated: 2026-11-06
      - `I03-E02-018-P02` — Typed refusals and effect data — Done — Last updated: 2026-11-06
      - `I03-E02-018-P03` — Scenario files read in Infrastructure — Done — Last updated: 2026-11-06
      - `I03-E02-018-P04` — Digest and comparison over typed entries — Done — Last updated: 2026-11-06
      - `I03-E02-018-P08` — Domain types as immutable classes — Done — Last updated: 2026-11-06
      - `I03-E02-018-P05` — Typed fixed sets and identities — Done — Last updated: 2026-11-06
      - `I03-E02-018-P06` — Branded times, durations, counts, and amounts — Done — Last updated: 2026-11-06
  - [I03-E02-001 — Run history design page](Archive/Done/High/I03-E02-001-run-history-design-page.md) — Archived — Done — Last updated: 2026-11-05 — Priority: High
  - [I03-E02-003 — Commits and the main root](Archive/Done/High/I03-E02-003-commits-and-the-main-root.md) — Archived — Done — Last updated: 2026-11-05 — Priority: High
  - [I03-E02-004 — Work split into transactions](Archive/Done/High/I03-E02-004-work-split-into-transactions.md) — Archived — Done — Last updated: 2026-11-05 — Priority: High
  - [I03-E02-005 — Direct effect commits and their groups](Archive/Done/High/I03-E02-005-direct-effect-commits-and-their-groups.md) — Archived — Done — Last updated: 2026-11-05 — Priority: High

## Active priorities

- [Critical](Critical/I03-E02-run-history-priority-critical-index.md)
- [High](High/I03-E02-run-history-priority-high-index.md)
- [Normal](Normal/I03-E02-run-history-priority-normal-index.md)
- [Low](Low/I03-E02-run-history-priority-low-index.md)

## Archive

- [Archive](Archive/I03-E02-run-history-archive-index.md)
