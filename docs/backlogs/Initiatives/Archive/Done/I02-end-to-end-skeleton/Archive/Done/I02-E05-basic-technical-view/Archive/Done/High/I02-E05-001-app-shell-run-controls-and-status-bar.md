# I02-E05-001 — App shell, run controls, and status bar

| Field | Value |
| --- | --- |
| ID | `I02-E05-001` |
| Parent | [I02-E05 — Basic technical view](../../../I02-E05-basic-technical-view-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-03 |
| Last updated | 2026-11-04 |
| Completed | 2026-11-04 |

## Scope

The application shell, the run workspace in its first form, the clock's controls, and the Run
status bar.

### Outcome

- A user starts, pauses, steps, and changes the speed of a run from the browser, with buttons, a
  typed speed, or the keyboard. Tests check this in Chromium, Firefox, and WebKit.
- The status bar shows the run's state and simulated time, and also the version, seed, speed,
  number of log entries, orders finished, and the verdict.
- A run watched at any speed gives the digest a headless run gives, so speed changes only how it is
  watched. Tests check this at four speeds, and stepped all the way.
- The user decided the shell on 2026-11-04, as FND-76 records: a left sidebar with all ten
  sections, a light theme, and fixed regions with resizable dividers. Docking and the map come
  later.
- Nothing has measured how a large run behaves in a browser. A run goes on the page's own thread,
  so a heavy one may make the page less responsive. That belongs with Responsive while running.

## Acceptance criteria

- A user starts, pauses, steps, and changes the speed of a run from the browser.
- The status bar shows the run's state and simulated time.

## Dependencies

- [I02-E07-003 — Snapshots and performance benchmark](../../../../I02-E07-style-and-immutable-rework/Archive/Done/High/I02-E07-003-snapshots-and-performance-benchmark.md)
- [I02-E04-002 — Runner, browser and headless](../../../../I02-E04-scenarios-and-checks/Archive/Done/High/I02-E04-002-runner-browser-and-headless.md)

## Sources and evidence

- [Project foundation: FND-53](../../../../../../../../../../../design/decisions/project-foundation/ui.md#fnd-53--ui-organisation)
- [UI](../../../../../../../../../../../design/ui/README.md)

## Status history

- 2026-11-03 — Created as Proposed, in I01-E06-002. It starts when its dependencies are Done.
- 2026-11-04 — Moved from Proposed to Ready: its dependency, I02-E04-002, is Done.
- 2026-11-04 — Moved from Ready to Proposed: it now waits for the immutable rework, I02-E07-003,
  by the user's decision.
- 2026-11-04 — Moved from Proposed to Ready: its dependencies are Done.
- 2026-11-04 — Moved from Ready to In Progress: the user asked to continue.
- 2026-11-04 — Moved from In Progress to Done, on the user's request: its acceptance criteria
  are met, as the outcome records. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-03 — Created at High priority, as the user approved in I01-E06-002.
