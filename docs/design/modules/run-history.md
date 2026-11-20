# Run history

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a capability in
  [FND-8](../decisions/project-foundation/purpose-and-scope.md#fnd-8--capability-list), and its
  design in
  [FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions).
  Partly implemented: the [timeline](#timeline) of branches and commits,
  [moving and forking](#moving-and-forking), and the [repository](#repository), which maps a run
  to persisted records and back, in memory.
  [I03-E02](../../backlogs/Initiatives/I03-full-v1-0-0-lifecycle-and-rules/Archive/Done/I03-E02-run-history/I03-E02-run-history-backlog.md)
  builds what follows, and the [implementation roadmap](../roadmap/implementation-roadmap.md)
  says which stage builds the rest.

## Current and approved responsibilities

Shows a run's history as a timeline you can zoom and fork, and saves past runs in browser
storage at a chosen level, so results can be reviewed and compared. The
[Simulation engine](simulation-engine.md#how-a-run-is-held) makes the commits this module keeps.

## Key approved business rules

- Runs are kept until the user deletes them, and migrated across releases
  ([FND-57](../decisions/project-foundation/architecture-and-code.md#fnd-57--hosting-and-data)).
- A stored run can be saved as a file and opened in another copy of the simulator
  ([FND-58](../decisions/project-foundation/architecture-and-code.md#fnd-58--stored-records-and-shared-files)).

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation/architecture-and-code.md#fnd-56--module-boundaries)):

- **Uses:** [Event log](event-log.md) (reads), [Simulation engine](simulation-engine.md)
  (commits), [Scenarios](scenarios.md) (the scenario version a saved run ran), and
  [Orders](orders.md) and [Drivers](drivers.md) (the records its queries name).
- **Used by:** [Analysis](analysis.md) (stored runs), [Versions](versions.md) (stored runs),
  [Import and export](import-and-export.md) (run files), and [Verification](verification.md)
  (saved runs to rerun).
- [Data](../data/persistence.md) describes the storage.

## Timeline

Approved in
[FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions).
Every commit can be selected, and the timeline shows simulated time.

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
  - **As built:** in
    [I03-E02-015](../../backlogs/Initiatives/I03-full-v1-0-0-lifecycle-and-rules/Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-015-timeline-views.md),
    on 2026-11-09, the rows' two modes of I03-E02-014 became the views by time and by number,
    beside the views by order and by driver
    ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)):
    - **Switch:** By time, By number, By order, and By driver sit above the timeline, and the
      zoom switch names its levels for the view: Orders (or Drivers), Work, and Commits by order
      and by driver. The commit shown and the event selected stay as they were.
    - **What goes under an order or a driver:** a job run or API call goes under the orders and
      drivers whose records it made versions of, from the run's index, and those its effect read,
      such as the order and driver a call names; it is shown whole under each. A notification
      counts for its driver, from the entry that sent it. An indirect commit goes under the order
      it names, and a driver ignoring a request under that driver. A config change goes under
      none. Orders and drivers are listed in the order the run first touched them.
    - **Branches:** each branch's column holds its own commits, as in the other views. The current
      branch uses the run's index; another branch's index is worked out from its commits when
      its column is first drawn.
    - **Selecting:** an order's or a driver's row has a Highlight button. It highlights that
      order's or driver's commits, and every closed group holding one, in every view, until it is
      pressed again or cleared. For an order, the Inspector tab also shows its versions in
      Orders, Orders' copy of its delivery, and its delivery in Deliveries, as they stood at the
      commit shown, each linked to the commit that made it.
    - **Grids:** the views by time and by number are kept from a run's start. The views by order
      and by driver are made the first time they are chosen, then kept up to date, as keeping
      all four from the start holds about 500 MB more on a city day.
    - **Cost:** measured on 2026-11-09 on a city day of 254,524 commits, on a development PC with
      Node, and accepted by the user. Rows are worked out again on each change while the run is
      followed:

      | View | Top groups | Rows at the middle zoom | Working out the rows, middle zoom | At the top zoom | At Commits | Making its grid |
      |---|---|---|---|---|---|---|
      | By time | 25 hours | 1,465 | 74 ms | 87 ms | 2.0 s | from the start |
      | By number | 848 hundreds | 9,321 | 107 ms | 141 ms | 2.0 s | from the start |
      | By order | 5,000 orders | 85,000 | about 450 ms | 193 ms | 3.0 s | 2.9 s, on first use |
      | By driver | 500 drivers | 26,470 | 193 ms | 59 ms | 1.1 s | 1.9 s, on first use |

      Finding the spans the service was unaware, which every view does, took 130 ms of this and
      now takes about 55 ms. A cache of the rows' views can come in an item of its own.
- **Marks:** state commits and each kind of effect commit are marked differently.
- **Gaps:** a large gap between state commits is visible in two displays you can switch between: a
  list with a row stating the gap, and an axis with spacing to scale. A gap is the simulated time
  between two neighbouring rows as shown, after the filter and collapsing, so hiding job runs
  shows the gaps between state commits. One longer than a threshold shows, which starts at 1
  minute and a control on the timeline panel changes. On the axis, spacing grows with the
  logarithm of the gap, from no extra space at the threshold to at most five rows' height for
  the longest gap shown. Gaps show, as a row or on the axis, in the view by time only
  ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)).
- **Filter and empty runs:** a filter shows or hides each kind of commit, and neighbouring empty
  job runs collapse into one row you can zoom into. Hiding a kind hides only its own commits, so
  hiding Job leaves the state commits a job run made. A job run with no state commit is empty;
  back-to-back empty runs of any job collapse into one row, which opens to them grouped by job,
  each job's runs collapsed again. The filter, the threshold, and the list or axis choice stay
  with the person watching while the app is open, and are not saved with the run.
- **Gaps and filter as built:** in
  [I03-E02-016](../../backlogs/Initiatives/I03-full-v1-0-0-lifecycle-and-rules/Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-016-gaps-filter-and-collapsed-runs.md),
  on 2026-11-09
  ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)):
  - **Filter:** State, API calls, Job runs, Config changes, and Indirect buttons show or hide
    each kind of commit in every view. A group left with no commit shown is not drawn. A commit
    shown or selected that the filter hides still marks the group holding it, and the way to it
    still opens.
  - **Collapsed runs:** two or more back-to-back empty job runs at one level become one row, "n
    empty job runs", which opens to a row for each job, in the order each first ran, holding
    that job's runs. Whether a run is empty does not depend on the filter. No zoom level opens
    these rows, the Commits zoom included; they open by hand, or to show the commit shown or the
    event selected, as the user chose.
  - **Gaps:** in the view by time, a row states each gap longer than the threshold, "Gap of"
    its length, just after the row before it, or after that row's events. A gap is measured
    between rows that stand for commits: commits and closed groups. A Gaps over list offers
    10 s, 30 s, 1 min, 5 min, 15 min, and 1 h, starting at 1 min. List or Axis switches the
    display; on the axis, a gap row is as tall as its gap is worth, with the lanes running
    through it, and no other row changes height.
  - **Scrolling:** the timeline's virtual scroll takes where each row starts, worked out from
    the rows' heights, in place of one fixed height, so following and scrolling to a commit
    work on the axis too.
  - **Kept with the person:** the filter, the threshold, and the display stay in the run
    workspace's store while the app is open, in every view and every run, and are not saved.
  - **Cost:** on a city day at the Commits zoom, collapsing takes the rows from 340,713 to
    317,991; working out the rows as shown takes about 165 ms, against 137 ms before; the gaps
    about 230 ms, and the axis's offsets about 140 ms more, on top of the 2 s the rows' views
    take there. At the middle zoom, with about 1,500 rows, they cost a few milliseconds.
- **Branches as columns:** the timeline is also the tree of branches. Each branch has its own
  column, a fork's starting at its fork point, and a commit before a fork point shows once, in the
  column it was made in. Rows line up by time, each simulated time a band as tall as its busiest
  column, or by number, each branch's nth job run or API call on the same rows. A selected commit
  on another branch watches that branch there
  ([FND-87](../decisions/project-foundation/run-history.md#fnd-87--forks-and-named-timelines)).
- **As built:** in I03-E02-014, on 2026-11-07 and 2026-11-08
  ([FND-87](../decisions/project-foundation/run-history.md#fnd-87--forks-and-named-timelines)):
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
    can be followed live.
- **Indirect effects:** in I03-E02-013, on 2026-11-08
  ([FND-89](../decisions/project-foundation/run-history.md#fnd-89--indirect-effects-stated-by-hand)),
  an indirect commit's node is hollow, with a dashed edge, named by its kind, and its tooltip says
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
  ([FND-86](../decisions/project-foundation/run-history.md#fnd-86--time-travel-replay)).
- **Querying:** one module of pure functions answers questions about a run's current line: the
  commit and root at a place, which modules changed between two roots, a record's version at a
  place and its history, who made a version and when, the commits a job run or API call made,
  the commit that wrote a log entry, the records a job run or API call made versions of, and the
  commits that touched a record. A job run's or API call's commits sit together, so they are
  found by halving, and the last two read the index in the run's cache, which is never saved.
  The timeline's module badges use its comparison of two roots. On a city day every query
  answers in microseconds; the
  [Simulation engine](simulation-engine.md#records-and-references) describes the index
  ([I03-E02-021](../../backlogs/Initiatives/I03-full-v1-0-0-lifecycle-and-rules/Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-021-links-across-the-sub-roots.md),
  [FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)).
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
  ([FND-87](../decisions/project-foundation/run-history.md#fnd-87--forks-and-named-timelines)).
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
  one's level and size, Open, moving a run to the other level, Delete, a
  [Snapshot test](verification.md#snapshot-tests) action, and deleting a branch.
  `I05`'s Stored run management adds the rest
  ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)).
- **Saving and opening:** Save asks for a name, filled in with the scenario's name and the date. A
  saved run opens like a live run, paused at its latest commit, and can be moved through, forked,
  and run on. Save sits in the run controls, opening a small form in the page, and pauses the
  run, saves, and resumes it. The saved runs are listed on the Runs and scenarios page. Opening
  one replaces the run being watched, with a warning first if that run is not saved
  ([I03-E02-024](../../backlogs/Initiatives/I03-full-v1-0-0-lifecycle-and-rules/Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-024-saved-run-screens-and-deleting-branches.md)).
  A run is not saved when it has commits and is no longer the run as it was last saved or
  opened; a run with no commits has nothing to lose. A saved run opens with the scenario version
  it ran, paused at its latest commit, or ended and judged if it had reached the scenario's end.
- **Deleting a branch:** only a branch with no forks of its own, never Main, after a confirmation
  in the page, on a live or a saved run; deleting the branch being watched watches its parent.
  A saved run and the run opened from it hold the same branches, so deleting one also deletes it
  from the saved run the run came from or was last saved as, rewritten under its ID at its level,
  with the rest as it was saved; a run that matched its saved run still does. A branch made after
  saving is only in the run being watched. The trash icon sits in the branch's column heading.
- **Everything, as stored:** shares structure as memory does. A saved commit holds only its
  root's change from its parent root: each keyed collection's set and removed entries, each
  list's added items, or all its items when it changed otherwise, and the config values,
  function versions, and randomness only when they changed. A version is saved down to the one
  the parent root holds, and the direct or indirect effect a commit adds is held once, in the
  commit. Loading applies each change to its parent root, so loaded roots share structure again.
  A tenth of a city day, 74,624 commits, saves in 35 MB, where every root written whole would
  take about 410 GB
  ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)).
- **Finding a commit's change:** memory needs no diff, but nothing records which parts a change
  copied, so saving compares each root with its parent's. It walks Immutable's internal tree of
  each changed List or OrderedMap beside the parent's and skips each node the two share, so it
  costs about what the commit changed: about a second for a tenth of a city day. Only this search
  reads Immutable's private fields; when they are not the shape it expects, it checks each entry,
  which is slower but finds the same change. An outbox event a call read is looked for from the
  outbox's end, where its latest events are.
- **Minimum:** drops each commit's root change, which opening the run rebuilds by running each
  commit again on the root before it. It keeps each commit's log entries, as a state commit's
  entries also need the cause its step gave, and a digest of each commit's change chained with
  the one before it on its line, which a rebuilt root and a snapshot test are checked against.
  Opening it runs each state commit's call again on its module's state in the root before it,
  and adds each effect or indirect commit's own effect, as the engine did; a root whose change
  does not match its digest stops the load. A tenth of a city day takes 26 MB at minimum, against
  35 MB at everything, as calls, effects, and log entries, which minimum keeps, are most of a
  run, and opens in about 4 seconds, against 2, close to the 4 seconds the run took. A whole city
  day takes 146 MB at minimum and 242 MB at everything, and opens in 56 seconds, against 11, where
  the run took 55
  ([performance](simulation-engine.md#performance)).
- **Moving between levels:** a saved run keeps its ID. Moving down drops each commit's change
  for its chained digest; moving up works every root out again, telling its progress, and saves
  each change. A run that no longer fits keeps its old level, and the move says why.
- **Size:** the bytes a run takes in browser storage, with how many commits and branches it
  holds, counted commit by commit, as a city day written out as one text would pass the
  longest text JavaScript holds. A run that doesn't fit is not saved, and a message says so and offers "minimum".
- **Opening at minimum:** may take about as long as running the run, as Repeat does, with a
  progress indicator while the roots are rebuilt. The repository restores a run in chunks of
  2,000 commits, pausing between them and telling how many commits of how many are done.
- **Schema version:** saved runs started at version 1, and are at version 2 since I03-E02-026
  added the implementation change and its log entry, which a version 1 run never holds, so a
  version 1 record reads as it is; the database opens its stores again at the new version, and
  each record is migrated as it is read. They are at version 3 since I03-E09-001, which gives each
  run's script a city: a version 2 run gets one square area around its restaurants and starting
  drivers, 500 metres beyond them, named as the one area they use, and one whose places use
  several areas is refused, saying why
  ([FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
  They are at version 4 since I03-E09-002, which gives each order its customer and address: a
  version 3 run that made no order reads as it is, and one that made orders is refused, saying
  why, as nothing is made up for it. They are at version 5 since I03-E09-009, which sends a
  driver with no stop due to their area's waiting point: each rider of a version 4 run is marked
  to stay where they finish, so the run goes on as it was run. They are at version 6 since
  I03-E09-008, which gives a driver's status and location versions of their own: a version 5
  run with no drivers reads as it is, and one with drivers is refused, saying why, as nothing is
  made up for it. They are at version 7 since I03-E09-010, which reads an order's status from
  its events: a version 6 run with orders kept as before is refused, saying why. They are at
  version 8 since its P02, which gives Deliveries' copy of an order versions of its own: a
  version 7 run with deliveries kept as before is refused, saying why. There is a chain of
  migrations that a test runs on a made-up older record.
- **Recalculating:** a run below "everything" needs the function versions it used, so every
  version stays in the code for good
  ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)).
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
  memory, and persisted as where to find it in the parent root. The maker a call passes is
  persisted as its own text, its kind and its work's ID, like any other value.
- **Links:** each persisted version keeps its maker. A version an effect read is persisted as its
  record's kind and ID and its number, and found again on load in the version chain of the root
  that holds the effect. The run's index is never saved: loading works it out again.
- **Versions:** each registered function has a fingerprint test on fixed inputs, so a behaviour
  change fails until a new version is registered. A function is registered under a name and a
  version number, and its stored ID is made from the two, such as `orders.pick-up@1`; the
  highest number is the newest. The repository owns the mapping from a name and a version to a
  function, as a table of every version of every function; Application.Core declares the
  lookup, `FunctionLookup`, which a run carries and the Rules panel will use to list versions.
  The three functions that change no state have a name and versions but no stored ID
  ([I03-E02-025](../../backlogs/Initiatives/I03-full-v1-0-0-lifecycle-and-rules/Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-025-function-versions.md)).
  A run switches a function's version with an implementation change commit, from a scenario's `use`
  step or the Rules panel, and saved runs keep each switch
  ([I03-E02-026](../../backlogs/Initiatives/I03-full-v1-0-0-lifecycle-and-rules/Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-026-implementation-change-and-the-use-step.md)).
- **Where an old version lives:** when a function's behaviour changes, its current body is first
  copied into its module's `versions` folder in Domain, as `<function>-v<n>.ts` exporting
  `<function>V<n>`, such as `src/domain/orders/versions/mark-ready-v1.ts` exporting
  `markReadyV1`, and registered there under its old number, with its fingerprint pinned as it
  was. The method on the module's state then holds the new body, registered under the next
  number. A version is never removed, so any saved run can be worked out again. Twice, when no
  saved run could replay differently, the user had the pins updated in place instead: once before
  any run was saved, and once when orders came to hold their address, which changed the state's
  shape and made every saved run with an order refused
  ([FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- **Storage:** the repository maps a run to persisted records and back as plain data, each
  commit with its root's change, as [saved runs](#saved-runs-and-levels) describes, and stores
  them in the IndexedDB database `deliveries-simulator-runs`: each run's body in one store and
  what is told of it without loading it, its name, level, scenario version, time, and size, in
  another. Each save gets its own ID; names may repeat. A run is saved only between job runs and
  API calls, and its scenario is stored first, as a version the saved run notes using
  ([I03-E02-008](../../backlogs/Initiatives/I03-full-v1-0-0-lifecycle-and-rules/Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-008-saved-runs-at-two-levels.md)).
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
| `src/application-core/run-history/run-query.ts` | The queries over a run's commits, records, and makers, and a record's versions at a place, each with the commit that made it |
| `src/application-core/run-history/calendar.ts`, `src/infrastructure/run-history/browser-calendar.ts` | The date and time a run is saved at, and the browser's, where a watched run's wall clock only measures time passing |
| `src/application-core/run-history/saved-run.ts`, `src/application/run-history/saved-runs.ts` | What is told of a saved run, a save's outcome, and saving or deleting a run with the scenario version it ran |
| `src/infrastructure/run-history/indexed-db-run-repository.ts`, `persisted-saved-run.ts`, `saved-run-size.ts` | The repository in IndexedDB, a saved run's stored records, schema version, and migrations, and its size |
| `src/infrastructure/simulation-engine/persisted-run.ts`, `persisted-main-root.ts`, `persisted-call.ts`, `persisted-indirect-effect.ts`, `persisted-version-read.ts` | A run, the start root, each commit's root change, call, and indirect effect, and each version an effect read, as persisted records |
| `src/infrastructure/simulation-engine/persisted-run-city.ts` | The city a run saved before cities gets, around its restaurants and starting drivers |
| `src/application-core/simulation-engine/rebuild-root.ts` | A commit's root worked out again from the root before it: its call run again, or its own effect added |
| `src/infrastructure/system/records/persisted-changes.ts`, `changed-entries.ts` | A collection's or a value's change from its parent's, and the search through Immutable's internal tree that skips what the two share |
| `src/infrastructure/simulation-engine/function-registry.ts` | Every version of every state function, by name, and the repository's lookup over them, which every run is made with ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)) |
| `src/infrastructure/orders/persisted-orders-state.ts`, `orders-functions.ts` | Orders' persisted records, and its functions' stored IDs |
| `src/infrastructure/drivers/persisted-drivers-state.ts`, `deliveries/persisted-deliveries-state.ts`, `deliveries/deliveries-functions.ts` | The persisted records of Drivers and of its Deliveries submodule, and the Deliveries functions' stored IDs |
| `src/infrastructure/simulation-engine/persisted-log-entry.ts`, `src/infrastructure/map-and-routing/persisted-coordinates.ts` | Each kind of log entry and coordinates, persisted; the JSON check of log data |
| `src/infrastructure/system/messaging/persisted-inbox.ts`, `records/persisted-groups.ts`, `json/json-value.ts`, `json/json-data.ts`, `functions/registered-function.ts` | What the modules' mappings share, and the JSON check, which only Infrastructure makes |
| `src/infrastructure/simulation-engine/function-fingerprints.spec.ts` | The pinned fingerprint of each registered function |
| `scripts/stored-ids.spec.mjs` | Checks that nothing in Domain knows a stored ID |
