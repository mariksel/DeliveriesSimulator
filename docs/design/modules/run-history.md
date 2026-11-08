# Run history

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a capability in
  [FND-8](../decisions/project-foundation.md#fnd-8--capability-list), and its design in
  [FND-81](../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions). Partly
  implemented: the [timeline](#timeline) of branches and commits,
  [moving and forking](#moving-and-forking), and the [repository](#repository), which maps a run
  to persisted records and back, in memory.
  I03-E02
  builds what follows, and the [implementation roadmap](../roadmap/implementation-roadmap.md)
  says which stage builds the rest.

## Current and approved responsibilities

Shows a run's history as a timeline you can zoom and fork, and saves past runs in browser
storage at a chosen level, so results can be reviewed and compared. The
[Simulation engine](simulation-engine.md#how-a-run-is-held) makes the commits this module keeps.

## Key approved business rules

- Runs are kept until the user deletes them, and migrated across releases
  ([FND-57](../decisions/project-foundation.md#fnd-57--hosting-and-data)).
- A stored run can be saved as a file and opened in another copy of the simulator
  ([FND-58](../decisions/project-foundation.md#fnd-58--stored-records-and-shared-files)).

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries)):

- **Uses:** [Event log](event-log.md) (reads), [Simulation engine](simulation-engine.md)
  (commits), and [Scenarios](scenarios.md) (the scenario version a saved run ran).
- **Used by:** [Analysis](analysis.md) (stored runs), [Versions](versions.md) (stored runs),
  [Import and export](import-and-export.md) (run files), and [Verification](verification.md)
  (saved runs to rerun).
- [Data](../data/persistence.md) describes the storage.

## Timeline

Approved in
[FND-81](../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions). Every
commit can be selected, and the timeline shows simulated time.

- **Zoom:** groups nest in a recursive hierarchy that opens and closes. A group can be one order's
  delivery, or a job run or API call and the commits made during it.
- **Views:** by simulated time, by number, by order, and by driver, over the same commits. A
  commit can appear in more than one, and selecting it goes to the same commit. Plain functions
  work the views out from the commits, so rule functions don't know about them, and a new view
  works on old runs. A switch in the timeline panel picks a view; branches stay columns in every
  view, and the selected commit stays selected when the view changes.
  - **By order:** state commits that changed the order's records, in Orders or in Deliveries'
    copy; API calls and indirect commits that name it; and job runs whose commits changed it. A
    commit that touches no order is not in this view.
  - **By driver:** state commits that changed the driver's record; commits that notified the
    driver of a request, or changed a request sent to them; and the driver's own API calls and
    the indirect effects about them. A commit that touches no driver is not in this view.
  - **Groups by order and by driver:** the order or driver, then each job run or API call, then
    its commits in time order. A job run under an order is shown whole. Opening an order also
    shows its version chain.
  - **Capabilities:** the view by order is Order timeline and Order replay, and the view by
    driver starts Driver timelines, whose driver states, such as availability over the day,
    come in `I07`. Run history owns all three
    ([capability ownership](capability-ownership.md)).
  - **Selecting:** a selected order or driver is highlighted in every timeline view, and a city
    day can be followed live in each.
  - **Built so far:** by time and by number, as the rows' two modes in I03-E02-014;
    I03-E02-015
    makes them views and adds the other two
    ([FND-81](../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions)).
- **Marks:** state commits and each kind of effect commit are marked differently.
- **Gaps:** a large gap between state commits is visible in two displays you can switch between: a
  list with a row stating the gap, and an axis with spacing to scale. A gap is the simulated time
  between two neighbouring rows as shown, after the filter and collapsing, so hiding job runs
  shows the gaps between state commits. One longer than a threshold shows, which starts at 1
  minute and a control on the timeline panel changes. On the axis, spacing grows with the
  logarithm of the gap, from no extra space at the threshold to at most five rows' height for
  the longest gap shown. Gaps show, as a row or on the axis, in the view by time only
  ([FND-81](../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions)).
- **Filter and empty runs:** a filter shows or hides each kind of commit, and neighbouring empty
  job runs collapse into one row you can zoom into. Hiding a kind hides only its own commits, so
  hiding Job leaves the state commits a job run made. A job run with no state commit is empty;
  back-to-back empty runs of any job collapse into one row, which opens to them grouped by job,
  each job's runs collapsed again. The filter, the threshold, and the list or axis choice stay
  with the person watching while the app is open, and are not saved with the run.
- **Branches as columns:** the timeline is also the tree of branches. Each branch has its own
  column, a fork's starting at its fork point, and a commit before a fork point shows once, in the
  column it was made in. Rows line up by time, each simulated time a band as tall as its busiest
  column, or by number, each branch's nth job run or API call on the same rows. A selected commit
  on another branch watches that branch there
  ([FND-87](../decisions/project-foundation.md#fnd-87--forks-and-named-timelines)).
- **As built:** in I03-E02-014, on 2026-11-07 and 2026-11-08
  ([FND-87](../decisions/project-foundation.md#fnd-87--forks-and-named-timelines)):
  - **Place:** the timeline replaced the event list at the bottom of the run workspace, and the
    event list moved to an Events tab.
  - **Tree:** each branch's column sits between its forks, which alternate sides in the order
    they were made. Each branch has a coloured lane, kept by the order it was made, from where
    it starts. Below the row holding a fork's parent commit, a connector row of its own carries
    its line, curving off the parent's lane and down into its own.
  - **Commits:** each commit is a node on its lane, a root of the DAG, opening to its events.
    The commit ending each job run or API call, or made outside one, is a fork point, ringed,
    with a fork icon that starts a branch after it. A state commit shows the module it changed,
    worked out from its root against the one before, and an arrow joins two commits of one job
    run or API call that changed different modules.
  - **Groups:** the job run or API call each commit happened in, under hours and minutes by
    time, or hundreds and tens by number, with a span holding one thing skipped. A closed group
    is a summary node on each lane, with its count, its path through the modules or its number
    of calls, filled when it holds the commit shown, and a button that opens and closes it. A
    zoom switch sets which groups start open, starting with minutes.
  - **Scrolling:** the time and group column stays put while the branches scroll sideways, and
    the headings move with them. Following keeps the commit shown, or zoomed out the group
    holding it, in sight.
  - **Cost:** the grid takes in each branch's new commits as the run goes, as a line only
    grows, and sorts and names a group only when it is shown, so a run as long as a city day
    can be followed live. Grouping by order comes with the views of I03-E02-015.
- **Indirect effects:** in I03-E02-013, on 2026-11-08
  ([FND-89](../decisions/project-foundation.md#fnd-89--indirect-effects-stated-by-hand)), an
  indirect commit's node is hollow, with a dashed edge, named by its kind, and its tooltip says
  the service did not see it. From it to the API call that followed from it, in the same column,
  a hatched strip runs along the lane, ending with how long the service was unaware; a closed
  group holding both ends carries the whole strip. The run controls have an Indirect effect
  button, which opens a short form below them: what happens, who decides, the order, and for a
  late restaurant how much later. Stating it makes an indirect commit at the commit shown,
  forking first from an earlier one.

## Moving and forking

- **Moving:** going to any commit only selects its main root, so it is instant. Going back
  follows a commit's parent. A commit can't list its children, so going forward uses a lookup
  from parent to children, which can be rebuilt from the commits and isn't saved.
- **Between commits:** a time between two commits shows the earlier commit, as nothing changed.
- **Places:** the run's cache keeps every commit's ID in order, and how many log entries the
  commits hold up to each, so going to any commit, by its place from 0 at the start to the
  latest, takes its root and the log as it stood without recalculating anything. A step can be
  one commit, or one job run or API call with the commits made in it
  ([FND-86](../decisions/project-foundation.md#fnd-86--time-travel-replay)).
- **Repeating:** a run repeated from a place starts between job runs and API calls, at the
  nearest such place at or before it, runs on to the latest commit, and is compared with the
  original commit by commit. A config change or an indirect effect made by hand is made again at
  its commit, as no script holds it, and so will a function version switched by hand, which
  I03-E02-026 builds.
- **Forking:** going back to any commit and acting by hand, stating an indirect effect, or
  changing a value starts a new branch, which shares everything before the fork. There is no
  merging. Branches can be named, and a run that has ended can be forked.
- **Branches as built:** a run's history lists its branches, Main first, each with its ID, its
  name, the branch it forked from, and the place it forked at, and holds each branch's own
  commits after its fork. The engine works on the current branch's line of commits as before;
  switching makes another line current and works its cache out again. A fork starts between job
  runs and API calls, at the nearest such place at or before the commit asked, as a job run or
  API call is one piece of work. Commit and session numbers count along each line, so a
  branch's ID with a commit's ID names a commit across the run
  ([FND-87](../decisions/project-foundation.md#fnd-87--forks-and-named-timelines)).
- **Saved with every branch:** a persisted run holds every branch, in the order they were
  made, each with its name, fork point, and own commits, so every commit is kept once, and it
  loads back exactly, whichever branch is current. The digest and the verdict are the current
  branch's.

## Saved runs and levels

A saved run can hold everything, some of it, or the minimum, and can move between those levels
at any time. Keeping everything gives fast lookups, and a lower level saves space and
recalculates what it dropped.

| Level | Holds | Built |
| --- | --- | --- |
| Everything | Every DAG node, and every commit | `I03` |
| Checkpoints | A main root every so many commits, and every commit | The city stage |
| Minimum | The start state, and every commit | `I03` |

- **Every level keeps what can't be recalculated:** each commit's function and arguments, what came
  from outside, such as requests and external outcomes, and indirect effects.
- **Choosing:** a run's level is chosen by hand, and each run shows its level and size. Automatic
  rules can come later.
- **Screens in `I03`:** a Save action that chooses the level, a list of saved runs with each
  one's level and size, Open, moving a run to the other level, Delete, and deleting a branch.
  `I05`'s Stored run management adds the rest
  ([FND-81](../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions)).
- **Saving and opening:** Save asks for a name, filled in with the scenario's name and the date. A
  saved run opens like a live run, paused at its latest commit, and can be moved through, forked,
  and run on. Save sits in the run controls, opening a small form in the page, and pauses the
  run, saves, and resumes it. The saved runs are listed on the Runs and scenarios page. Opening
  one replaces the run being watched, with a warning first if that run is not saved
  (I03-E02-024).
- **Deleting a branch:** only a branch with no forks of its own, never Main, after a confirmation
  in the page, on a live or a saved run; deleting the branch being watched watches its parent.
- **Minimum:** drops each commit's main root, which opening the run rebuilds by running each
  commit again on the root before it. It keeps each commit's log entries, as a state commit's
  entries also need the cause its step gave, and a short digest of each commit's root, which a
  rebuilt root and a snapshot test are checked against.
- **Size:** the bytes a run takes in browser storage, with how many commits and branches it
  holds. A run that doesn't fit is not saved, and a message says so and offers "minimum".
- **Opening at minimum:** may take about as long as running the run, as Repeat does, with a
  progress indicator while the roots are rebuilt.
- **Schema version:** saved runs start at version 1, with a chain of migrations that a test runs
  on a made-up older record.
- **Recalculating:** a run below "everything" needs the function versions it used, so every
  version stays in the code for good
  ([FND-81](../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions)).
- **Testing:** [Verification](verification.md#snapshot-tests) compares a recalculated run with its
  stored states.

## Repository

Nothing is stored directly. The repository owns two mappings, and nothing in Domain knows about
either:

- **Functions:** a state commit holds a direct reference to its function in memory. The repository
  maps each function to a stored ID, which is readable and fixed once assigned, such as
  `orders.pick-up@1`. Functions can be renamed without changing stored data, and any behaviour
  change adds a new version.
- **Records:** every persisted record is its own type, mapped to and from its application record.
  It is named with a `Persisted` prefix, such as `IPersistedOrder`.
- **Arguments:** a state commit holds its function's arguments. A Domain instance passed in,
  such as a restaurant's place or a handoff, is persisted through its own mapping and rebuilt as
  an instance of its class, so a loaded call gets the same kind of value. One taken from the
  parent root, such as the other module's outbox or the config values, is held as the value in
  memory, and persisted as where to find it in the parent root.
- **Versions:** each registered function has a fingerprint test on fixed inputs, so a behaviour
  change fails until a new version is registered. A function is registered under a name and a
  version number, and the highest number is the newest. An old version stays in the code as its
  own copy of the function. The repository owns the mapping from a name and a version to a
  function; Application.Core declares the lookup, which the engine uses during a run and the
  Rules panel to list versions
  (I03-E02-025).
- **Storage:** the repository maps a run to persisted records and back as plain data.
  I03-E02-008
  stores them in browser storage. Until then, each commit is persisted with its whole root, and a
  run is saved only between job runs and API calls.
- **Which functions have IDs:** only those that can make a commit. A function that changes no state
  of its own, such as a job that only asks for follow-ups or a driver command that only calls
  orders, makes no commit, so it has no ID. A commit holding a function with no ID fails to save.

Each module maps its own records and function IDs, and the repository combines them, so no new
dependency appears between the modules. Application defines the repository, and Infrastructure
implements it, as the [layers](../architecture/layers.md#data-and-mapping-flow) page says.

## Code map

| Path | Purpose |
|---|---|
| `src/application-core/run-history/run-repository.ts` | The repository's abstraction |
| `src/infrastructure/run-history/memory-run-repository.ts` | The repository, in memory, until browser storage |
| `src/infrastructure/simulation-engine/persisted-run.ts`, `persisted-main-root.ts`, `persisted-call.ts`, `persisted-indirect-effect.ts` | A run, its roots, each commit's call, and each indirect effect, as persisted records |
| `src/infrastructure/orders/persisted-orders-state.ts`, `orders-functions.ts` | Orders' persisted records, and its functions' stored IDs |
| `src/infrastructure/drivers/persisted-drivers-state.ts`, `deliveries/persisted-deliveries-state.ts`, `deliveries/deliveries-functions.ts` | The persisted records of Drivers and of its Deliveries submodule, and the Deliveries functions' stored IDs |
| `src/infrastructure/simulation-engine/persisted-log-entry.ts`, `src/infrastructure/map-and-routing/persisted-coordinates.ts` | Each kind of log entry and coordinates, persisted; the JSON check of log data |
| `src/infrastructure/system/messaging/persisted-inbox.ts`, `records/persisted-groups.ts`, `json/json-value.ts`, `json/json-data.ts`, `functions/registered-function.ts` | What the modules' mappings share, and the JSON check, which only Infrastructure makes |
| `src/infrastructure/simulation-engine/function-fingerprints.spec.ts` | The pinned fingerprint of each registered function |
| `scripts/stored-ids.spec.mjs` | Checks that nothing in Domain knows a stored ID |
