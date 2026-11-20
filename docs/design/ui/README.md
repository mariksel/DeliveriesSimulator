# UI

Owns the application's views and how users move between them. What each view shows
is owned by its module page.

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved for the section and the stack, in
  [FND-6](../decisions/project-foundation/purpose-and-scope.md#fnd-6--design-sections) and
  [FND-3](../decisions/project-foundation/architecture-and-code.md#fnd-3--technology-stack), and for
  its sections, run workspace, and views in
  [FND-53](../decisions/project-foundation/ui.md#fnd-53--ui-organisation).
  The source holds the application shell, the sections, the Run status bar, and the run workspace
  in its first form, with the basic technical view.

## Current design

The UI is an Angular application written in TypeScript and built with Vite. Its sections,
run workspace, and views are approved in
[FND-53](../decisions/project-foundation/ui.md#fnd-53--ui-organisation).

The application shell has a left sidebar with all the sections, on lazy-loaded routes, a light
theme from CSS variables, and hand-written components that use Angular's CDK
([FND-76](../decisions/project-foundation/ui.md#fnd-76--application-shell-and-components)).

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
| `src/ui/shell/tooltip/` | The app's own tooltip, which every control that does something carries: shown on hover and keyboard focus after a short delay, over any panel that scrolls, letting the pointer through to whatever it covers, gone on leaving, a click, or Escape ([FND-76](../decisions/project-foundation/ui.md#fnd-76--application-shell-and-components)) |
| `src/ui/shell/icons/` | The app's icons: the fork, the pencil, and the breakpoint's dot |
| `src/ui/simulation-engine/breakpoints-panel/` | The Breakpoints tab: the breakpoints the run pauses at, each with a switch and a remove icon, a form to add one by kind, source, and order, and the one the run last stopped at ([FND-88](../decisions/project-foundation/run-history.md#fnd-88--step-debugger)) |
| `src/ui/runs/runs-page/` | Picks a scenario, which opens the run workspace, and lists the saved runs below the built-in scenarios, newest first, each with Open, Move to the other level, Snapshot test, and Delete; the snapshot test says on the row whether every state commit matched with the run's own versions and the newest, or which differed first, which opening the run then shows; Open, Move, and Delete each ask first in the row, Open only when the run being watched has changes not saved, and opening shows how many commits are loaded ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)) |
| `src/ui/runs/runs-page/saved-run-row.ts` | What a saved run's row shows: its name, level, size in KB or MB, commits, branches, and when it was saved, and what its snapshot tests found, as tested functions |
| `src/ui/workspace/run-workspace/` | The run workspace: the run's controls, with Back, Forward, the step size, the commit slider, Latest, Repeat from here, Fork here as a fork icon ([FND-86](../decisions/project-foundation/run-history.md#fnd-86--time-travel-replay)), Indirect effect, which opens the form to state one below them ([FND-89](../decisions/project-foundation/run-history.md#fnd-89--indirect-effects-stated-by-hand)), and Save, which opens the form to save the run in the same place, closing the other, and then says the name it was saved under ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)), the scenario's warnings below them, a main area with the Inspector, the Trace, the [Rules panel](../modules/business-rules.md#the-rules-panel), and the Events tab with the event list, the timeline below them, and a detail panel |
| `src/ui/run-history/timeline-panel/` | The timeline: a column for each branch, laid out as a tree with each branch between its forks, with its own coloured lane from where it starts and a curved line from its parent's commit on a connector row of its own; headings that watch their branch, with where it forked, a rename icon, and, on a branch no other forks from, other than Main, a delete icon that asks first in the heading ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)); commits as nodes, each a root of the DAG, with a fork icon on each fork point, a badge for the module a state commit changed and arrows for calls between modules, left of the lane; groups as shaded bands that open and close across every column, each a summary node with its count while closed; a zoom switch whose levels each view names; a switch between the views by time, by number, by order, and by driver, with a Highlight button on each order's or driver's row ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)); a filter showing or hiding each kind of commit, and, by time, a Gaps over threshold and a List or Axis switch for gaps ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)); a time and group column that stays put while the branches scroll sideways; and following the commit shown ([FND-87](../decisions/project-foundation/run-history.md#fnd-87--forks-and-named-timelines)) |
| `src/ui/run-history/timeline-grid.ts`, `timeline-view.ts` | The timeline's grid, worked out from every branch's commits as they come, and what each row and cell shows, as tested functions ([FND-87](../decisions/project-foundation/run-history.md#fnd-87--forks-and-named-timelines)) |
| `src/ui/run-history/timeline-subjects.ts` | Which orders or drivers each commit goes under in the views by order and by driver, walking a branch's line with its index ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)) |
| `src/ui/run-history/record-versions/`, `record-versions-view.ts` | The selected order's versions in the Inspector tab, each linked to the commit that made it, and what each row shows, as a tested function ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)) |
| `src/ui/run-history/timeline-shown.ts` | The timeline's nodes as shown: the kinds the filter hides left out, and back-to-back empty job runs collapsed into one row that opens to them by job, kept while a level does not change ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)) |
| `src/ui/run-history/timeline-gaps.ts` | The gaps between the rows as shown, past a threshold, and on the axis the space each takes and where each row starts ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)) |
| `src/ui/run-history/timeline-panel/row-offsets-scroll.ts` | Virtual scrolling for rows of varying height, from where each row starts, which the timeline uses in place of one fixed row height |
| `src/ui/run-history/unaware-spans.ts` | Which rows each span the service was unaware falls on, from an indirect commit to the call that followed from it, and how long it was ([FND-89](../decisions/project-foundation/run-history.md#fnd-89--indirect-effects-stated-by-hand)) |
| `src/ui/run-history/indirect-effect-form/` | The form that states an indirect effect at the commit shown: the kinds in words, who can decide, the scenario's orders, and how much later for a late restaurant ([FND-89](../decisions/project-foundation/run-history.md#fnd-89--indirect-effects-stated-by-hand)) |
| `src/ui/run-history/save-run-form/` | The form that saves the run being watched: the name offered, the scenario's name and the date and time in the person's own time zone, the level, and, when the run does not fit, why, with Save at minimum |
| `src/ui/workspace/map-view/map-scene.ts`, `map-marks.ts` | What the Map view draws at the commit shown, as tested functions: the city's areas, each with its waiting point, and its streets, worked out from its seed, each restaurant with its view of its orders and the parcels there, and each driver at the last location they sent, with their track and the route they still have to ride to their next stop or their area's waiting point, the requests notified and not answered, those accepted, and the parcels with them; each address orders go to, with the orders on their way there and those delivered there; and each kind of mark drawn one by one up to five, or as one badge with its count ([FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)) |
| `src/ui/workspace/map-view/map-layer.ts`, `map-drawing.ts` | The four kinds of order view the map's switches show or hide, and what the Map tab draws, as a tested function: the areas, the streets as two paths, main roads and local ones, each area's waiting point as a faint dashed ring on its crossing, over the streets, the tracks, each driver's route still to go with the drivers' views, a mark for each restaurant and driver and for each order view, a house pin at the address of each order on its way and a faint mark for each delivered there, drawn under everything else, a badge past five of a kind, each with its tooltip and what clicking it selects, in SVG units that are metres with north up; icons about 28 pixels across at the whole city, growing as the map zooms in to at most twice that, and everything not part of the selection faded |
| `src/ui/workspace/map-view/map-zoom.ts` | The part of the map in view, as tested functions: zooming around the pointer, from a fiftieth of the whole city to twice it, and panning with a drag |
| `src/ui/workspace/map-view/map-panel/` | The Map tab, the first of the main area, which a run opens on: the switches for the restaurants' views, which hold the address pins, the drivers' views, the physical orders, and the delivered ones, and Fit; the city drawn in SVG, with each driver as a rider on a bike and each restaurant as a restaurant front, which the wheel zooms around the pointer and a drag on the map pans; a selected order's or driver's marks with a thick amber halo; clicking a driver or an order, or an order in a badge's list, selects it as the timeline's views do; and the drivers with no location yet, named below ([FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)) |
| `src/ui/workspace/scenario-warnings.ts` | The lines the workspace shows for a scenario's warnings, as a tested pure function |
| `src/ui/workspace/status-bar/` | The Run status bar |
| `src/ui/workspace/watched-run-store.ts` | Turns each change in the run session into a signal, and keeps the timeline's grids, its view, the order or driver selected, its filter, and how gaps show |
| `src/ui/workspace/run-view.ts`, `shortcuts.ts`, `panel-size.ts` | What a run shows, what a key does, and how a region resizes, as tested pure functions |
| `src/ui/test-setup.ts` | Sets up Angular's test environment for component tests |
