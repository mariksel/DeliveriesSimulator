# UI

Owns the application's views and how users move between them. What each view shows
is owned by its module page.

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved for the section and the stack, in
  [FND-6](../decisions/project-foundation.md#fnd-6--design-sections) and
  [FND-3](../decisions/project-foundation.md#fnd-3--technology-stack), and for its sections, run
  workspace, and views in [FND-53](../decisions/project-foundation.md#fnd-53--ui-organisation).
  The source holds the application shell, the sections, the Run status bar, and the run workspace
  in its first form, with the basic technical view.

## Current design

The UI is an Angular application written in TypeScript and built with Vite. Its sections,
run workspace, and views are approved in
[FND-53](../decisions/project-foundation.md#fnd-53--ui-organisation).

The application shell has a left sidebar with all the sections, on lazy-loaded routes, a light
theme from CSS variables, and hand-written components that use Angular's CDK
([FND-76](../decisions/project-foundation.md#fnd-76--application-shell-and-components)).

## Workspace features

Linked selection, search everywhere, saved views, help pages, the glossary, the detail-level
switch, undo and redo, and the run status bar belong to the UI section, as will the later
dashboard builder and bookmarks
([capability ownership](../modules/capability-ownership.md)).

## Views

| View | Shows | Status |
|---|---|---|
| [Business view](../modules/business-view.md) | The simulation in business terms, such as rules and outcomes | Approved |
| [Technical view](../modules/technical-view.md) | The simulation in technical terms, such as states and events | Approved |

## Code map

| Path | Purpose |
|---|---|
| `src/ui/styles.css` | The light theme's colours and spacing, as CSS variables |
| `src/ui/shell/app/` | The application shell: the sidebar, the current section, and the status bar |
| `src/ui/shell/routes.ts`, `sections.ts` | The sections, each on a lazy-loaded route |
| `src/ui/shell/empty-section/` | The page of a section not built yet |
| `src/ui/shell/tooltip/` | The app's own tooltip, which every control that does something carries: shown on hover and keyboard focus after a short delay, over any panel that scrolls, gone on leaving, a click, or Escape ([FND-76](../decisions/project-foundation.md#fnd-76--application-shell-and-components)) |
| `src/ui/shell/icons/` | The app's icons: the fork, the pencil, and the breakpoint's dot |
| `src/ui/simulation-engine/breakpoints-panel/` | The Breakpoints tab: the breakpoints the run pauses at, each with a switch and a remove icon, a form to add one by kind, source, and order, and the one the run last stopped at ([FND-88](../decisions/project-foundation.md#fnd-88--step-debugger)) |
| `src/ui/runs/runs-page/` | Picks a scenario, which opens the run workspace |
| `src/ui/workspace/run-workspace/` | The run workspace: the run's controls, with Back, Forward, the step size, the commit slider, Latest, Repeat from here, Fork here as a fork icon ([FND-86](../decisions/project-foundation.md#fnd-86--time-travel-replay)), and Indirect effect, which opens the form to state one below them ([FND-89](../decisions/project-foundation.md#fnd-89--indirect-effects-stated-by-hand)), the scenario's warnings below them, a main area with the Inspector, the Trace, the [Rules panel](../modules/business-rules.md#the-rules-panel), and the Events tab with the event list, the timeline below them, and a detail panel |
| `src/ui/run-history/timeline-panel/` | The timeline: a column for each branch, laid out as a tree with each branch between its forks, with its own coloured lane from where it starts and a curved line from its parent's commit on a connector row of its own; headings that watch their branch, with where it forked and a rename icon; commits as nodes, each a root of the DAG, with a fork icon on each fork point, a badge for the module a state commit changed and arrows for calls between modules, left of the lane; groups as shaded bands that open and close across every column, each a summary node with its count while closed; a zoom switch for hours, minutes, or commits, or hundreds, tens, or commits; rows by time or by number; a time and group column that stays put while the branches scroll sideways; and following the commit shown ([FND-87](../decisions/project-foundation.md#fnd-87--forks-and-named-timelines)) |
| `src/ui/run-history/timeline-grid.ts`, `timeline-view.ts` | The timeline's grid, worked out from every branch's commits as they come, and what each row and cell shows, as tested functions ([FND-87](../decisions/project-foundation.md#fnd-87--forks-and-named-timelines)) |
| `src/ui/run-history/unaware-spans.ts` | Which rows each span the service was unaware falls on, from an indirect commit to the call that followed from it, and how long it was ([FND-89](../decisions/project-foundation.md#fnd-89--indirect-effects-stated-by-hand)) |
| `src/ui/run-history/indirect-effect-form/` | The form that states an indirect effect at the commit shown: the kinds in words, who can decide, the scenario's orders, and how much later for a late restaurant ([FND-89](../decisions/project-foundation.md#fnd-89--indirect-effects-stated-by-hand)) |
| `src/ui/workspace/scenario-warnings.ts` | The lines the workspace shows for a scenario's warnings, as a tested pure function |
| `src/ui/workspace/status-bar/` | The Run status bar |
| `src/ui/workspace/watched-run-store.ts` | Turns each change in the run session into a signal |
| `src/ui/workspace/run-view.ts`, `shortcuts.ts`, `panel-size.ts` | What a run shows, what a key does, and how a region resizes, as tested pure functions |
| `src/ui/test-setup.ts` | Sets up Angular's test environment for component tests |
