# Project foundation — Run history

Runs as a tree of state transitions, and replaying, forking, and debugging them.
This is part of the [project foundation](../project-foundation.md), which holds
its version, authority, and undecided questions, and lists where each record is.

## Approved decisions

### FND-81 — Runs as a tree of state transitions

The user stated this on 2026-11-05, in I03-E01-001, and settled the details there and in
I03-E02-001. The design is in
[Simulation engine](../../modules/simulation-engine.md#how-a-run-is-held) and
[Run history](../../modules/run-history.md). In the user's words:

> the runs should be able to play the events similar to what event sourcing would achive, but
> the aplicaiton architecture should not be built with event patterns, no deciter patters an
> things like that, we prefer to use pure functions and not spetial types that act like
> functions. basicly we should be storing all state transitions and be able to replay them, the
> state should be immutable so that branching and sharing can happen through copy on write
> mechanisms. a run with all branches should look like a tree. and we should be able to replay
> and go backward and forwards in the tree. similar to git. the functions/commands should be
> versioned so we dont have to store them we just need to be able to identify which funtion to
> call.

On persistence and function identity:

> we should be able to rename the functions, so any persistence layer should be able to map from
> static funtions to the stored functiond id, he persistence layer should be responsible for the
> mapping, similar to a repository layer, the repository should contin all the mapping ids and
> also all the records that are persisted should be mapped to the correspoinding applicaiton
> record, we shold not store the applicaiton record directly.

On the state structure and records:

> one important fact is that there is not just one root in the tree, so it is more like a
> dircted acyclic graph, so verytime a change is made, a new root is generated that references
> the changed nodes and all the unchaged nodes are resused since they are immutable, this is the
> general that immutalbe datastructures are usually implemented, with a copy on wright mechanism
> and sharing of state since state is immutable so that we dont have to copy the whole tree. so
> when we replay the event we just navigate the DAG structure. also the records should be
> designed in two parts the part that never changes during the lifetime of the record and the
> version parts that contain changed states of the record, for example an order with have a non
> changing record that holds all the state of the order that naver changes as we perform cow
> mutations and every time we want to make a change to the order by createin a new version of
> the vhanging parts. A naming conention would be Order for the non changing part and
> OrderVersion for the changing part. when we create references between records we have to
> consider weather to referance teh non changing part or the changing part. in general when we
> reference the changing part we also want to reference the non changing part. but if the
> concete does not care about the change it just needs a reference to the order than we just
> referance the non changing part.

On timelines and the structure beneath them:

> the tree navigation is the historical view of the chagens, a nood on this tree is esentialy
> the roots of the DAG underlaying structure that contains the state, so if the change happens
> only in one timeline thean we just get a linear secentual like of all the states that the DAG
> sa on at that time, but if we start forking the the changes so basicly we dont update the
> existing timeline but we start to create alternative timelines with independet changes which
> means will ahve independet DAG structure but which still share nodes between the, since even
> the forket dimeline tree is still a biger DAG made by smaller DAGs, so tere is a distinctions
> between the tree like structure taht shous the time based historical view and diferent
> timeline paths and the underlying DAG immutable cow strucutre the power the implementation and
> state transitions and persistence of the simulations states.

The user asked for a design document with diagrams and tradeoffs before deciding the details.
The rest of this record holds the answers so far. What it doesn't answer is not designed yet.

The user confirmed this reading of the statements above:

- State is a DAG. A change creates a new root that points at the changed nodes and reuses every
  unchanged one.
- History is a tree of timeline nodes on top of it, and a node is essentially one root. A fork
  starts an alternative timeline whose nodes still share with the original.
- Replay moves between existing roots, as moving between commits does in git.
- `Order` never changes. `OrderVersion` holds what changes, and each change adds a new one.
- A reference chooses a part: `Order` when change doesn't matter, and `OrderVersion` with
  `Order` when a particular state does.
- Functions are plain and pure, with no decider or event patterns and no special types acting as
  functions. They are versioned and only need to be identifiable.
- A repository owns persistence. It maps static functions to stored IDs, so functions can be
  renamed, and maps every persisted record to its application record. Application records are
  never stored directly.

Roots in memory: every timeline node keeps its root, and I07 revisits this when it reaches a full
city day. Measured on today's code, that day holds about 1,046 MB with every root, against 108 MB
with the latest only. I03-E02-017 measured it again with real commits on 2026-11-07: 761 MB with
every root and 119 MB with the latest only, as the Simulation engine's performance section
records.

The DAG in memory, in the user's words:

> of both, use custom nodes for root or when hight customisation is needed, and use immutable js
> for general collections and when performance is needed.

The timeline's structure, in the user's words:

> every dag root should be selectable in the timeline but the timeline should have an
> hierarchical structure that acts as zoom in and out. so for exampe an order delivery can be a
> grup of nodes hat is collapsed to only show the higleve view but we can expand it to zoom in
> and it migt show the direct dag node or another group of collapsed nodes the we can zoom in to
> , so a hierarchical recursive structure.

What creates a root, in the user's words:

> a root is crated everytime there is a state change, beacuse only a state chagne progresses the
> state history, if there are no state changes that the statre history stys the same. this is
> independent of wall time which is allways progressing, so the timeline needs to show teh wall
> time and at whet tiem the state transition happend and any larg gap between state transitions
> should be visible. we shuuld call a state transition a state commit so every time there is a
> state commit a new dag root is created

What one commit holds, in the user's words:

> a commint should match the real service commit, any change the would cause the real service to
> chagne state so a transations the performs multiple operations is one commit beacuse only on
> atomic operation was performed, but an event drien operation is multiple comits because
> multiple transactions and state transitions would happen in the real service.

Side effect commits, in the user's words:

> besite state commits we also have side effect commits. a side effecto commit is any operation
> the does not necessary cause a state transition but can still have an effect on the external
> state of the system. a background job run is recorder as a side effect commit because it can
> have an effect on the system. an api call also can have side effects, a coll from a consumer
> to our serice is still an effect beacuse different responses that the consumer gets from our
> service can produce different effects. any framework or library related sidefect shoul still
> be recorder. for example the caching library can have an effecto n the chched state by
> expiring a cached key. the state commits and sideffect commits should be distinguishable in
> the timeline since those act diferently. also input effects like an api call from the
> consumer, on output effect such ass an api call to an external service an a background job
> should be distinguishable. all commits that happern during a backgroudn job session shoul be
> groupd to galler snd should be able to zoom in and out.

The structure beneath the two kinds of commit, in the user's words:

> the main roog DAG shoul cotian tow sub root DAGs one for the sate commints and one for the
> effect commitns

Direct and indirect effects, in the user's words:

> we should split the commited effects into two parts the indirect and direct effects, the
> direct effects are what we have now, that are effects that are coused by a direct comuication
> with the service like an api call. the indirect effect are effect the are not caused by a
> direct comunication with the service, like the fact that te customer decidet to not pick up
> the order, there is not direct call to the service that can cause an effect but still this has
> an effect on the service.

The user chose these on the same day:

- **Main root:** it holds exactly the state and effects sub-roots, with no third part for the
  simulator. The clock, job due times, remaining script, scenario names, and log are worked out
  from commits, the scenario, and the two sub-roots.
- **Direct effects:** input calls, output calls, job runs, and library effects are all direct.
  Direct means the service took part, and indirect means it took no part.
- **Effects sub-root:** it holds two parts, one direct and one indirect, so a commit copies only
  its own part. The main root stays at two sub-roots.
- **Indirect effects recorded:** decisions and changes that can alter what happens later, such as
  a customer deciding not to pick up, a driver deciding to ignore a request, or a phone going
  offline. Continuous movement is not recorded, only its results.

- **References between records:** a child holds its parent's ID, and points at the unchanging
  part unless a specific state matters. An order item is its own record with an `orderId`.
- **References in the structure:** a parent references its child, from main root to sub-root to
  collection, and a collection keyed by the parent's ID finds a record's children. A commit
  references the earlier commit.
- **Across the sub-roots:** records in the effects and state sub-roots may point at each other, in
  both directions.
- **API calls:** an input commit groups the commits made while handling it, as a job session does.
- **Framework and library effects:** the user asked for the real service's code to be analysed to
  find them, as the docs of `V1.0.0` mention none.

The real service's code, read on 2026-11-05 at the user's request, shows the following. The docs of
`V1.0.0` already covered the job framework, and
[module communication](../../versions/V1.0.0/module-communication.md#framework-and-library-behaviour)
now holds the rest:

- **Session state cache:** every signed-in call checks its session, in each instance's memory and
  then in a shared table. Valid or invalid lasts 30 seconds in memory and 5 minutes shared. Revoked
  lasts as long as a token can still work, at most 15 minutes. Each time varies by 10% either way.
  Another instance can accept a signed-out session's calls for up to 30 seconds, and the shared
  table is emptied after a crash.
- **Rate limits:** a sliding one-minute window in six segments, in each instance's memory. Per
  driver, 120 calls and 12 location batches a minute. Per IP, 10 logins and 30 refreshes a
  minute. A refusal is a 429 with a retry time.
- **Job framework:** one run of each job at a time across instances, an overlapping occurrence
  stops at once, and the framework never retries. Schedules are checked every 5 seconds.
- **Live connection sweep:** every 15 seconds, each instance checks its open connections through
  the session cache and closes invalid ones, so a connection closes within about 45 seconds.
- **Transactions:** reading one outbox event is two transactions, saving the copy and then the
  inbox record. Sending one notification from a dispatch pass is three: the claim, the enqueue,
  and marking it enqueued.

Library effects get built in two stages. I03 builds the library commit kind, the session cache, and
the rate limits for one instance. I04 adds the cross-instance delays, skipped job runs, and the
connection sweep, along with multiple instances. The commits of one action run back to back at one
simulated time in I03, and letting other work land between them comes with I04.

When a cache change is a commit, in the user's words:

> it should behave like the real chaching library behaves, so if the caching livrary removes and
> expirte key thatn its is an event, if the user makes a call to the cache and it causes the
> cache to change state, that is and event. but a ttl that has expired is not an event until
> something explicitly treagers someting to activate te ttl and cause an expirey record to be
> removed

Calls between the modules and what counts as an effect, in the user's words:

> a link betwen modules should be shown, also when a module makes a call to the other module it
> usually create a pending request which should be treated a commit, otherwise if not state or
> effect is created than no commit. in general effect that are only internal and dont have an
> effect on the external state or the internal state are not considered as true effects.

Asked whether a job run that changes nothing is a commit, the user answered:

> job runs do have an effect beacuse avery job run is recorder and show in the admin dashboard

So every job run is a commit, because its record is visible outside the job. The dashboard is
planned, not built yet: the real service's job framework stores each run in its own tables today.
The user also chose:

- **State to effect links:** state holds the effect's ID, and effects may point directly at state,
  so one pointer comparison still shows that two moments have identical state.
- **Cause links:** a direct effect records which indirect effect led to it, when that is known.
- **Indirect effects in I03:** I03 builds the commit kind, plus scenario steps and Manual mode that
  state one by hand. Behaviour profiles add them automatically later.

Neighbouring empty job runs collapse into one row you can zoom into, and a filter shows or hides
each kind of commit. A state commit holds a direct reference to its function, so a rename is
automatic and only the repository knows stored IDs.

What a saved run holds, in the user's words:

> all of this so that we can choose to keep everything or comprese it to some of hte date or to
> the minmum and recalculate everything. for example we might chose to save everything at the
> bingining so we can have fast loockups, but after a while whe might choose to comprase it by
> some amount to reduce consumed space. ang later wi might choose to sill save everything. so we
> should be able to move between different compression levels. also this can be usefull for
> snapshot tasting to test breaking changes fo the stateles run against the statefull run and
> make sure they all produce the same result

The user then chose:

- **Function IDs:** a stored ID is readable and fixed once assigned, such as `orders.pick-up@1`.
  Any behaviour change adds a new version, and the old one stays while a saved run below
  "everything" needs it.
- **Snapshot tests:** a test reruns a saved run with both its own function versions and the newest
  ones. The first shows that recalculating is exact, and the second shows the first commit a
  breaking change affects.
- **Choosing a level:** a saved run's level is chosen by hand, and each run shows its level and
  size. Automatic rules can come later.
- **When levels get built:** I03 saves runs at "everything" and "minimum", moves between them, and
  runs the snapshot test. Checkpoints come at the city stage.

The user then chose:

- **Which records split:** every record that changes splits into an unchanging part and a version
  part. A version's number is today's order version, which the outbox already carries. Events and
  outbox rows never change, so they have no version part.
- **Parts that change at different rates:** added on 2026-11-12, while making drivers' location
  sends cheap (I03-E09-008). Where parts of a record change at different rates, each has its own
  versions, so the part that changes most often keeps its versions small. A driver's unchanging
  part never changes, their version changes now and then, and details such as their location and
  their online or offline status are each a versioned model of their own, extending the driver.
  The full view of a driver is all of these together.
- **Forks:** they arrive in I03, with no merging. Going back to any commit and acting by hand,
  stating an indirect effect, or changing a value starts a new timeline. Timelines can be named,
  and a run that has ended can be forked. Snapshot and branch moves here from I04.
- **References across the modules:** records may hold followable links across the modules, and the
  timeline, views, and verification checks follow them freely. A module's rule functions receive
  only their own module's state and copies, so drift stays visible.
- **Order replay:** it shows the commits that touched the order, and its version chain.
- **Early views:** I03 builds Violation summary and Criteria tracker for one run and `V1.0.0`,
  shaped so later stages extend them to many.

On where old versions live, the user asked:

> if we only store the latest version we esentaly have a linked list, whereas the all versions
> aproach looks like a 2d array, so i dont see the point why isnt the linked list enought

So the user chose the linked list. Each root holds the latest version of each record, and each
version holds a direct link to its previous one.

The user also settled how I03 is organised, which changes the order of work in
[FND-80](stages-and-process.md#fnd-80--planning-stage-i03):

- **Run history first:** it is I03's first epic, and Paths and commands with Manual mode comes
  straight after it.
- **Item size:** one item per view or tool, with commands and rules grouped by path, and a built-in
  scenario proving each path.
- **Commands:** I03 covers all of them, including sessions, driver status, devices, and back-office
  driver accounts and login lockout, with account management kept simple.

The user also settled how this fits the existing design, in I03-E02-001:

- **Ownership:** the Simulation engine owns commits and the main root, because it makes them. Run
  history owns the timeline, saved levels, and the storage of forks. Verification owns snapshot
  tests. Each module maps its own records and function IDs, and the repository combines them. This
  adds two links to the [module map](../../modules/README.md#dependency-graph): Run history to
  Simulation engine, and Verification to Run history.
- **The record of a run:** commits are the single record of a run, which amends
  [FND-56](architecture-and-code.md#fnd-56--module-boundaries). The Event log stays a readable view
  worked out from them, with the contents it has today, so
  [FND-65](simulation-model.md#fnd-65--event-log-entries) stands.
  Indirect effects add new log kinds when they are used.
- **Main roots:** every commit makes a new main root, because a new sub-root needs a new parent
  pointing at it.
- **Groups:** a commit stores which job run or API call it happened in, because that is a fact
  about the run. This is the one exception to groups saving nothing extra.
- **Tuned values:** a value changed during a run is a direct effect commit. The current values sit
  in the direct part, and rule functions receive them as an argument.
- **Random streams:** only effect commits draw random numbers, so stream positions live in the
  effects sub-root, and the state sub-root stays purely the real service's state.
- **Naming:** `DomainEffect` is renamed a follow-up, so "effect" means only effect commits.

Timeline time: the timeline shows simulated time, which the user chose when asked which time
"wall time" meant above. A large gap between commits is visible in both of two displays that the
user can switch between: a list with a row stating the gap, and an axis with spacing to scale.

Timeline groups: the timeline has several views over the same roots, and a root can appear in more
than one. I03 builds three: by order, by simulated time, and by driver. Plain functions work the
groups out from the timeline for display, so rule functions don't know about them, nothing extra
is saved, and a new grouping works on old runs.

The user settled these on 2026-11-05, in I03-E02-006:

- **Lookups for worked-out data:** each job's last run, how many scripted steps have run, and the
  scenario's names for orders sit in the cache beside the timeline, with the log's lookups. The
  cache is rebuilt from the commits and never saved, so the roots hold only the service's state and
  effects.
- **The clock between commits:** the service driving a run holds how far its clock has moved past
  the latest commit. That position is not part of a run's data, so a loaded run starts at its
  latest commit's time.

What kind of commit a tuned value makes, in the user's words:

> it depends what is been tuned, if tuning is bout some config value, that it is a config change
> event, if it is about some service lgorithm implementation changing than it is an implementation
> change event.

The user then chose:

- **Config change:** a fifth direct kind, beside input, output, job, and library. Every value
  tunable today, the dispatch and communication values, is a config value, so tuning one makes a
  config change commit. The current values sit in the direct part.
- **Implementation change:** a planned kind, built once functions have stored IDs and versions in
  I03-E02-007, because it names the function version to switch to.
- **Starting values:** the values a run's settings give sit in its start root, as its starting
  drivers do, and make no commit. Only a change during the run makes a config change commit.

On randomness, the user asked whether storing effects was not enough, and suggested scoped
randomness:

> would it be useful tha have different types of random effects such ass a global random effect
> that affects everyone, a local randomne effect tha only affects some specific sone lile a
> restaurnst an all actor that are in that zone, or an acto specific random effect such as a
> randomnes tha only affects a specific custtomer or driver

After comparing one sequence moving with every root, named streams, and keyed draws, the user chose
on 2026-11-06:

- **Named streams stay:** [FND-66](simulation-model.md#fnd-66--seeded-randomness) is unchanged.
  Stored effects are enough to replay a run, but the seed is still needed to make new commits the
  same way again.
- **A randomness part:** the effects sub-root holds a third part, `randomness`, beside the direct
  and indirect parts, with the seed and each stream's position. This amends the effects sub-root's
  two parts above. Drawing is no commit of its own: a commit whose event draws saves the new
  positions in its root, and later commits share them.
- **Scopes:** a stream can belong to the whole city, one area, or one actor, so a shared outcome
  such as rain over one zone can affect everyone there. Each scope draws only its own outcomes, and
  narrower scopes read wider ones' outcomes without drawing from them. Which scopes exist, and how
  areas are defined, are decided with behaviour profiles.
- **Random outcomes:** an outcome is an indirect effect, in the indirect part, and records the
  stream it was drawn from.

Once I03-E02-006 was built, the user chose on 2026-11-06:

- **Config changes in the log:** a config change also writes a `ConfigChanged` entry to the Event
  log, from the simulation engine, with the values before and after. That is how
  [FND-54](simulation-model.md#fnd-54--tunability)'s tuning event shows in the log.
- **The old scheduler:** runs work their next work out, so the schedule that held waiting work is
  deleted, along with its tests.

The user chose these the same day, in I03-E02-007:

- **The repository's first job:** it maps a run to persisted records and back, in memory, as
  plain data, and replaces the generic JSON encoding. I03-E02-008 stores those records in
  IndexedDB, with the levels and the schema version.
- **Guarding versions:** each registered function runs on fixed inputs, and a test pins a
  fingerprint of its output. A behaviour change fails that test until a new version is
  registered, or the change is shown to make no difference.
- **Arguments from the parent root:** in memory, a commit holds the value, such as the other
  module's outbox or the config values, which costs nothing because it is shared. The persisted
  form records where to find it in the parent root, so a saved commit never copies it.
- **Naming:** a persisted record's type is its application type with a `Persisted` prefix, such as
  `IPersistedOrder` and `IPersistedCommit`.

The user chose these on 2026-11-08, while reviewing what I03-E02 still needs:

- **Implementation change:** I03-E02-007 gave functions stored IDs but did not build this kind.
  I03-E02-009 builds it, with the function versions its snapshot tests need.
- **Saved runs in the browser:** I03-E02-008 builds a Save action that chooses the level, a list
  of saved runs showing each one's level and size, Open, moving a run to the other level, and
  Delete. `I05`'s Stored run management adds the rest.
- **What "minimum" drops:** each commit's main root and its log entries. Opening the run rebuilds
  both by running each commit again on the root before it.
- **Size:** the bytes the run takes in browser storage, with how many commits and branches it
  holds.
- **Schema version:** saved runs start at version 1, with a chain of migrations that a test runs
  on a made-up older record.
- **Function versions:** the repository registers each function under a name and a version
  number, and the highest number is the newest. An old version stays in the code as its own copy
  of the function.
- **Old versions kept for good:** every function version stays in the code, so any saved run can
  be recalculated. This replaces the earlier choice that an old version stays only while a saved
  run below "everything" needs it.
- **Where snapshot tests run:** as automated tests, which `npm run check` runs over saved runs kept
  in the repository, and as a Snapshot test action on a saved run in the app. The repository keeps
  one saved run for each built-in scenario, at the minimum level, made again only when a new
  function version is added.
- **Rerunning with the newest versions:** each stored call runs again with the newest version of
  its function, on the recalculated root before it, and the first commit whose result differs is
  reported. Stored calls after it may no longer match what the new version would really do.
- **Switching a version:** a scenario step can switch a function's version, and so can a person
  in the run workspace, forking first when an earlier commit is shown, as rule changes do. Each
  switch is an implementation change commit.
- **Four views:** by simulated time, by number, by order, and by driver. The two ways of lining
  rows up in [FND-87](#fnd-87--forks-and-named-timelines) become two views, so I03 builds four
  where this record said three. A switch in the timeline panel picks one. Branches stay columns
  in every view, the rows group by order or by driver in those views, and the selected commit
  stays selected when the view changes.
- **What an order holds:** state commits that changed its records, in Orders or in Deliveries'
  copy of it; API calls and indirect commits that name it; and job runs whose commits changed
  it. A commit can sit under several orders, and one that touches no order is not in this view.
- **What a driver holds:** state commits that changed the driver's record; commits that notified
  the driver of a request, or changed a request sent to them; and the driver's own API calls and
  the indirect effects about them. A commit that touches no driver is not in this view.
- **Groups in those views:** an order or a driver, then each job run or API call, then its
  commits in time order. A job run under an order is shown whole, with its commits for other
  orders too.
- **Selecting orders and drivers:** I03-E02-015 also highlights a selected order or driver in the
  timeline views. I03-E07-007 links the other views to it.
- **Fast enough:** a city day can be followed live in every view, and switching views takes about
  as long as switching the rows' mode does today.
- **Which gap:** the simulated time between two neighbouring rows as they are shown, after the
  filter and collapsing, so hiding job runs shows the gaps between state commits. This refines
  "a large gap between state commits" above.
- **Threshold:** a gap longer than it shows; it starts at 1 minute of simulated time, and a
  control on the timeline panel changes it.
- **The axis:** spacing grows with the logarithm of the gap, so a minute and an hour both show
  without a long gap filling the screen. Gaps show, as a row or on the axis, in the view by time
  only; the other views keep rows of one height and no gap rows.
- **Empty job runs:** a job run that made no state commit is empty. Back-to-back empty runs on a
  branch, of any job, collapse into one row; opening it shows them grouped by job, each job's runs
  collapsed again.
- **Hiding a kind:** hides only the commits of that kind. Hiding Job hides each job run's own
  effect commit, and the state commits it made still show, grouped as before.
- **Kept with the person:** the filter, the threshold, and the choice of list or axis stay as the
  person watching left them while the app is open, as breakpoints do, and are not saved with the
  run.

Reviewing those answers against the code the same day, the user changed one and added three:

- **Log entries kept:** a state commit's entries come from its call's result and from the cause
  its step gave, so running the stored call again cannot rebuild them. The minimum drops each
  commit's main root only, and keeps its log entries. This replaces "what minimum drops" above.
- **Removing a branch:** I03-E02-008 lets a person delete a branch, which
  [FND-87](#fnd-87--forks-and-named-timelines) left for later.
- **Links across the sub-roots:** effects pointing at the state they saw, and state holding an
  effect's ID, were approved above but not built or tracked. A new item, I03-E02-021, builds them.
- **Timeline capabilities:** the view by order is Order timeline and Order replay, and opening an
  order there also shows its version chain. The view by driver starts Driver timelines, whose
  driver states, such as availability over the day, stay in `I07`. The three move to Run history
  from Business view and Orders. I03-E06-007 and I03-E06-018 are delegated to I03-E02-015.
- **Opening a saved run:** it opens in the run workspace like a live run, paused at its latest
  commit, and can be moved through, forked, and run on.
- **A saved run's name:** Save asks for one, filled in with the scenario's name and the date.
  Renaming comes with `I05`'s Run labels.
- **Switching a version in a scenario:** a step with `use` in place of an actor, a command, and an
  order, listing each function and the version to switch to, as a `set` step lists rule changes:
  `{ "at": "h00:m10:s00:ms00", "use": [{ "function": "orders.pick-up", "version": 2 }] }`.
- **Switching a version by hand:** in the Rules panel, which lists each module's functions and
  their versions beside its rules. A version switched by hand is made again on Repeat, as a
  config change made by hand is.
- **Order of work:** I03-E02-021 and I03-E02-022 come before I03-E02-008, so saved runs' schema
  version 1 already holds their links. I03-E02-009 follows 008 with schema version 2 and its
  migration, for the implementation change commits, which also proves the migration path.
- **Saved runs in the repository:** each is a saved run's persisted records written as a JSON
  file, with its schema version, the same records browser storage holds.
- **Scenarios shared by saved runs:** a saved run keeps its whole scenario, shared rather than
  copied, in the user's words "scenarions should follow the same imutablity strucutre so the
  same scenario can be shared by multiple runs instead of be copied for each run". A scenario
  splits as a record does: an unchanging `Scenario`, and a `ScenarioVersion` for each edit. A
  saved run points at the exact version, stored once and shared, which stays while any saved run
  uses it, even after the scenario is deleted. This narrows
  [FND-57](architecture-and-code.md#fnd-57--hosting-and-data)'s "kept until the user deletes them"
  for versions in use. A built-in scenario is stored the same way when a run of it is saved.
  I03-E02-008 builds this
  storage, and I03-E03-002's Scenario library builds on it.
- **Stage gate:** I03-E08-001 also waits for I03-E02-009 and I03-E02-016, where Run history's
  open work ends.
- **Run history uses Scenarios:** a new link in the
  [module graph](../../modules/README.md#dependency-graph), for the scenario version a saved run
  ran. Scenarios does not use Run history, so it makes no cycle.
- **Function versions in the Rules panel:** the Simulation engine exposes the versions it can
  run, and the panel reads them there, as it reads the run's rules, so no new link is needed.

The user answered the last open questions before planning the same day:

- **Which links across the sub-roots:** every effect, whether an API call, a job run, or a config
  change, points at every record version it read, and every record version records the job run
  or API call that made it. Domain cannot know the Simulation engine's IDs, so a version holds an
  ID type that System defines.
- **Newest versions and recorded switches:** a snapshot test with the newest versions uses the
  newest version of each function except where the run switched one; from a switch on, the
  switched version is used, as recorded.
- **Opening a run saved at "minimum":** it may take about as long as running it, as
  [FND-86](#fnd-86--time-travel-replay) accepted for Repeat, with a progress indicator while the
  roots are rebuilt.
- **Storage full:** when a run doesn't fit in browser storage, nothing is saved, and a message
  says so and offers saving at "minimum".
- **The axis's limits:** a gap at the threshold adds no space, and the longest gap shown adds at
  most five rows' height.

Reviewing what implementers still needed, the user chose the same day:

- **What a snapshot test compares at "minimum":** each commit of a run saved at "minimum" keeps a
  short digest of its root, and a rerun with the run's own versions compares digests commit by
  commit.
- **Fingerprints after I03-E02-021:** making each record version name the work that made it
  changes every state function's output. Version 1's pins are updated in place this once, as no
  run has ever been saved, so nothing can need the old behaviour. After that, the rule holds: a
  behaviour change adds a new version.
- **Deleting a branch:** only a branch with no forks of its own can be deleted, and never Main.
  If it is the branch being watched, the branch it forked from is watched, at its latest commit.
  It works on a live run and a saved run alike, after a confirmation in the page.
- **Where the digest comes in:** I03-E02-008 defines "minimum" with the per-commit digest from
  the start, in schema version 1.
- **Looking up a function by name and version:** the repository owns the mapping. Application.Core
  declares the lookup, as it declares `RunRepository`, because it may not import Infrastructure,
  and the repository implements it from its registry. The engine uses it during a run, to find
  the function a `use` step or a switch in the Rules panel names, and the Rules panel uses it to
  list each function's versions.
- **Views after the links:** I03-E02-015 depends on I03-E02-021, and finds the orders and drivers
  a commit touched from 021's links instead of comparing each root with the one before.
- **A scenario's identity:** a scenario is identified by its name. Identical content is the same
  version, and different content under the same name is a new version. I03-E03-002 may give
  scenarios IDs of their own later.
- **Where saving happens:** Save sits in the run controls and opens a small form in the page with
  the name and level, as the indirect effect form does. The saved runs are listed on the Runs and
  scenarios page, below the built-in scenarios.
- **Saving or opening while a run plays:** Save pauses the run, saves, and resumes it. Opening a
  saved run replaces the run being watched, with a warning first if that run is not saved.
- **Testing browser storage:** the `fake-indexeddb` development package is added, so the storage
  adapters have unit tests and coverage needs no exclusions.
- **Zoom by order and by driver:** the zoom switch offers Orders (or Drivers), Work, and Commits:
  each order or driver closed, each opened to its job runs and API calls, or everything open.
- **An order's version chain:** selecting an order in the view by order shows its versions in the
  Inspector, each linked to the commit that made it.
- **A hidden selection:** when the filter hides the selected commit's kind, the selection stays,
  and the nearest shown row is marked as holding it, as a closed group is.
- **What an effect read:** each step returns the record versions it read, so the list is explicit
  and testable. An API call reads its order and the records its command touches; a job run reads
  the inbox events it handles and the records they touch. A config change reads rule values, not
  records, so it lists none.
- **A repeated label by hand:** the indirect effect form refuses a label already used in the run,
  scripted or by hand, as a scenario refuses two indirect steps with one label.
- **The repository's saved runs:** one JSON file per built-in scenario in
  `src/infrastructure/verification/snapshots/`, made by a script in `scripts/`, run again when a
  new function version is added.
- **Names of the new kinds:** the implementation change is the `ImplementationChange` effect and
  commit kind, as this record names it, and writes a `FunctionVersionSwitched` log entry from the
  Simulation engine, with the function's name and its versions before and after.
- **Smaller items:** no item of the epic holds more than about three phases. I03-E02-008 splits
  into I03-E02-023 Versioned scenario storage, I03-E02-008 Saved runs at two levels, which keeps
  the storage and the levels, and I03-E02-024 Saved-run screens and deleting branches.
  I03-E02-009 splits into I03-E02-025 Function versions, I03-E02-026 Implementation change and
  the use step, and I03-E02-009 Snapshot tests. I03-E02-015 and I03-E02-016 stay whole.
- **Function versions first:** I03-E02-025 comes before I03-E02-008, so schema version 1 already
  holds which version of each function a run uses. The implementation change, I03-E02-026,
  follows 008 with schema version 2 and its migration.
- **Plans recorded now:** each open item's phases are written in as its approved plan, so its
  implementer starts at P01. Screens are still reviewed from screenshots, and city-day numbers
  that miss a target still go to the user.
- **The Scenario library:** I03-E03-002 depends on I03-E02-023, as it builds on that storage.

Planning I03-E02-021 against the code, the user chose:

- **Versions made at a run's start:** a scenario's starting drivers are made before any job run or
  API call, so their first versions name the run's start as their maker, a value of its own, and
  every version still names one.
- **What a dispatch pass read:** a dispatch pass ranks every eligible driver, and listing each
  would add hundreds of references to every pass of a city day. It lists only the requests and
  drivers it acted on. This narrows "every record version it read" above for the dispatch pass;
  every other job run and API call still lists all it read.

On 2026-11-09 the user widened I03-E02-021's goal to a way of querying a run's DAG that stays fast
on a city day, and chose:

- **One query module:** Run history's Application.Core holds `run-query.ts`, pure functions over
  a run: the commit and the root at a place, which modules changed between two roots, a record's
  version at a place and its history, who made a version and when, the commits a job run or API
  call made, the commit that wrote a log entry, the records a job run or API call made versions
  of, and the commits that touched a record. The timeline's private module comparison moves
  there.
- **The maker:** an immutable Domain class in System, with one static constructor for a job run
  or API call and one for the run's start. Only state functions that make versions take one. A
  saved call stores its maker as its own text, like any other value argument.
- **An index for city scale:** the run's cache keeps, for each job run or API call, the records it
  made versions of, and for each record, the commits that made a version of it. It learns what a
  commit made from what its state function made, not by comparing roots. Like the rest of the
  cache, it is never saved and is worked out again on a fork or a switch. With it, a city day runs
  at most 5% slower and holds at most 50 MB more.
- **Effect reads, last:** effects listing the versions they read stay in I03-E02-021, as its last
  piece of work, with the choices above.
- **Events and outbox rows:** they name no maker for now. The commit that wrote one is found from
  its log entry.
- **Timeline views:** I03-E02-015 reads the commits that touched each order and driver from
  021's index, so its own index is not built.
- **Run history uses Orders and Drivers:** the query module names records by their modules' IDs,
  so the [module graph](../../modules/README.md#dependency-graph) gains links from Run history to
  Orders and Drivers, for the records its queries name. Neither uses Run history, so they make
  no cycle.
- **What an effect read, derived:** the Simulation engine works an API call's or job run's reads
  out itself, rather than each state function declaring them. They are, as they stood before it,
  the versions of the records it made versions of, the order a call names, and the drivers it
  acted on, such as the driver who accepts or is notified. A record only looked at, and not
  changed, is not listed. This replaces "each step returns the record versions it read" above.
- **Versions only:** an effect lists record versions, not the inbox events a job run handled,
  which stay findable from its log entries.

Building I03-E02-015 on 2026-11-09 and measuring it on a city day, the user chose:

- **The views' redraw:** by order at the middle zoom, Work, a city day shows about 85,000 rows,
  which take about 450 ms to work out again on each change while the run is followed, against
  about 75 ms by time and 110 ms by number. This is accepted and recorded; a cache for the rows'
  views can be an item of its own later. This qualifies "switching views takes about as long as
  switching the rows' mode does" above.
- **Grids made on first use:** the views by time and by number are kept from a run's start; the
  views by order and by driver are made the first time they are chosen, then kept up to date, as
  keeping them all from the start holds about 500 MB more on a city day. The first switch to one
  of them on a city day takes a few seconds.

Building I03-E02-016 on 2026-11-09, the user chose:

- **Collapsed runs at the Commits zoom:** the Commits zoom opens every group except collapsed
  empty job runs and the job groups inside them, which open by hand, or to show the commit shown
  or the event selected. On a city day most job runs are empty, so this keeps the rows down.

Building I03-E02-023 on 2026-11-09, the user chose:

- **A scenario version's content:** every field of the scenario as the app reads it: its name,
  description, version, seed, `runUntil`, start, and steps, compared in the form the app writes
  them, so whitespace and key order in a file do not count, and an edited description is a new
  version.
- **Version numbers:** each name's versions are numbered from 1. A deleted scenario whose
  versions saved runs still use keeps its numbering: storing the name again carries on from its
  last number, and content identical to a kept version gets that version back. Once none is in
  use, the name goes with them, and a later one starts at 1.
- **As built (I03-E02-023):** the stored scenario and its versions are plain records in
  Application.Core, whose only classes are the abstractions Infrastructure implements
  ([FND-82](architecture-and-code.md#fnd-82--application-core-layer)), so the `Scenario` and
  `ScenarioVersion` named above are `IStoredScenario` and `IScenarioVersion`. Infrastructure works
  out each version's
  content key from its persisted form; the core compares keys only. A saved run notes and
  releases its use of a version by an ID of its own, which I03-E02-008 gives it.

Building I03-E02-025 on 2026-11-09, the user chose:

- **How the engine reaches the lookup:** a run carries it. The lookup Application.Core declares
  and the repository implements is handed in when a run is created or loaded, and kept beside
  the run's cache, never saved; the run's root saves only the version number of each function.
  Core tests use a testing lookup holding today's functions.
- **As built (I03-E02-025):** all 17 functions the engine calls have a name and versions, the
  three that change no state with no stored ID. The direct part holds `functionVersions`, saved
  with each root; the lookup is a typed table of every version of every function, so each call
  keeps its argument types. An old version's copy lives in its module's Domain `versions`
  folder, as the Run history page's Repository section says. No digest or fingerprint changed.

Building I03-E02-008 on 2026-11-09, the user chose:

- **A saved run's identity:** each save gets its own ID from the repository, and its name is a
  label only, so two saved runs can share a name and saving never overwrites one. The ID is what
  a stored scenario version notes as using it.
- **The digest at minimum:** a chain over changes. Each commit's digest combines the one before
  it with the digest of what the commit changed: the record versions it made, or its effect. It
  costs about as much as the changes, and a rebuilt root whose change differs fails at that
  commit and every one after. A digest of each whole root would take about 1.5 hours on a tenth
  of a city day, where one root written out is 11 MB.
- **Saved runs share structure:** the saved form shares structure as memory does, so a record
  version or an effect is written once, not once for every commit that holds it. The form
  I03-E02-007 built, each commit with its whole root, was a first step, never meant to be kept:
  on a tenth of a city day it would take about 410 GB. Schema version 1 starts in the shared
  form.
- **How a save finds each commit's change:** memory needs no diff, as each change copies only
  what it touches, but storage writes whole what it is given, and nothing records which parts a
  change copied. Checking each entry of every changed collection took 7.5 seconds on a tenth of a
  city day, saved in 35 MB, and grows with collection size times commits, about 7 minutes on a
  whole one. The save instead walks Immutable's internal tree beside the parent's and skips each
  node the two share, so it costs about what the commit changed. The saved form stays plain
  records of this project's own; only the search reads Immutable's private fields, and when they
  are not the shape it expects it checks each entry instead, which is slower but gives the same
  change.
- **As built (I03-E02-008, P01 and P04):** saved runs live in the IndexedDB database
  `deliveries-simulator-runs`, a run's body apart from what is told of it, at schema version 1,
  whose first migration reads branches stored as timelines. A saved commit holds its root's change
  and its own effect once; on a tenth of a city day, 74,624 commits, the run saves in 35 MB in
  about a second and loads in about two. Checking each entry took 18.5 seconds before the search
  and 7.5 with entries walked side by side; looking for a call's outbox event from the outbox's
  end, where a call's event almost always is, took loading from 3.6 to 2 seconds.
- **As built (I03-E02-008, P02):** at minimum each commit keeps a digest of its change, chained
  along its line with `textDigest`, in place of the change. Opening it runs each call again
  through Application.Core's rebuild, which names a call's function by the version the run's
  lookup holds, and checks each root's change against its digest. A tenth of a city day takes
  26 MB at minimum against 35 at everything, and opens in about 4 seconds against 2; every root
  matched its digest.
- **As built (I03-E02-008, P03):** a saved run moves between levels under its ID, keeping its
  old level when the moved run does not fit, and its size is counted commit by commit. A city
  day, 254,524 commits, takes 242 MB at everything, saved in 8 seconds and loaded in 11, and
  146 MB at minimum, saved in 10 and loaded in 56, where the run took 55; both gave the same run.
- **As built (I03-E02-024, P01):** Save in the run controls opens a form below them, offering the
  scenario's name and the date and time, and the level; a running run pauses while it saves and
  then goes on, and a run that does not fit keeps the form open with why, and Save at minimum. A
  saved run's time is read from a calendar, in Application.Core and the browser, since the wall
  clock a watched run uses only measures time passing; I03-E02-008 had stored that by mistake.
- **Deleting a branch of a saved run:** a saved run and the run opened from it hold the same
  branches, so deleting a branch removes it from the run being watched and from the saved run it
  was opened from or last saved as, which is rewritten under its ID at its level. The rest of the
  saved run stays as it was saved, even when the run being watched has changed since, and a
  branch made after saving is only in the run being watched. Chosen by the user on 2026-11-10,
  building I03-E02-024.
- **As built (I03-E02-024, P02):** the Runs and scenarios page lists saved runs newest first,
  each with Open, a move to the other level, and Delete, each asking first in the row; Open asks
  only when the run being watched has changes not saved, which is when it has commits and is no
  longer the run as last saved or opened. A saved run opens with its scenario version, paused at
  its latest commit or ended and judged, and opening shows the commits loaded.
- **As built (I03-E02-024, P03):** a trash icon in the heading of each branch with no forks of
  its own, never Main, asks first in the heading; deleting the branch being watched watches the
  one it forked from at its latest commit. The watched run notes the saved run it came from or
  was last saved as, and the stored copy loses the branch in its persisted form, at either level,
  leaving the other branches and their digests as saved; a test shows this gives the same run as
  deleting the branch in memory.
- **As built (I03-E02-026, P01):** an implementation change is a direct effect holding the
  version of every function before and after, which puts the versions in use, as a config
  change puts its values in use; it writes a `FunctionVersionSwitched` entry for each function
  whose version changed. Saved runs are at schema version 2, and a version 1 record reads as it
  is, as it never holds one.
- **As built (I03-E02-026, P02):** a scenario's `use` step is read with each function and
  version checked against the registry, scheduled as one of the script's inputs, and made an
  implementation change that counts as a step run; stored scenarios and a saved run's script keep
  it. Stored scenarios stay at schema version 1, as a use step only adds to what they hold.
- **As built (I03-E02-026, P03):** the Rules panel lists Orders' and Deliveries' state functions
  below their rules, with the version in use at the commit shown and every version the lookup
  holds, and switches one, forking first from an earlier commit; Repeat from here switches every
  function to the versions a hand-made switch put in use, which writes the same entries.
- **As built (I03-E02-009, P01):** a snapshot test reruns each branch's own state commits on
  their stored parent roots, with the run's own versions or the newest, keeping a function the
  run switched at the recorded version from the switch on, and compares each state with the
  stored one field by field, the parts they share being the same objects. A run saved at minimum
  that no longer matches its digest stops opening with an error naming the branch, place, and
  commit, which the test reports as the first difference. A version 2 of mark ready registered
  only in a test is caught at the first commit that marks an order ready.
- **As built (I03-E02-009, P02):** `npm run snapshots` keeps a run of each built-in scenario at
  minimum, as JSON, which formatting leaves as written; `npm run check` opens and reruns each with
  its own versions and the newest, and checks the script still makes the file kept.
- **As built (I03-E02-009, P03):** each saved run in the list has a Snapshot test action, which
  opens the run once, reruns it both ways, and says on its row whether every state commit
  matched or which differed first; opening the run afterwards shows that commit.

### FND-86 — Time-travel replay

The user chose these on 2026-11-07, for I03-E02-010, building on the moving rules of
[FND-81](#fnd-81--runs-as-a-tree-of-state-transitions):

- **Moving:** Back and Forward buttons beside Step, and a slider over the run's commits, with a
  Latest button that returns to the newest commit. Selecting an event in the log also moves to
  the commit that wrote it. The status bar says which commit is shown.
- **Step size:** a toggle chooses whether Back and Forward move one commit, or one job run or
  API call with the commits made in it.
- **Running while back:** Start and Step are disabled while an earlier commit is shown, until the
  person goes to the latest. Acting from an earlier commit starts a new timeline, which forks add
  in I03-E02-012.
- **Repeating:** a Repeat from here action recalculates the run from the commit shown up to the
  latest commit's time, and says whether every commit and log entry came out the same. A city
  day repeated from early on takes about as long as running it, with the page busy meanwhile,
  which the user accepted for now.
- **Selecting an event:** it opens the event's detail, and moves the run to the commit that
  wrote it, so every view shows the state then.
- **As built:** in I03-E02-010, on 2026-11-07. The event list and the trace keep showing the
  whole log, with the events after the commit shown dimmed, so a person can still select a later
  event and a trace still follows its action to the end. The Inspector, the status bar, and the
  Rules panel show the run as it stood. Keeping every commit's place costs about 10 MB on a city
  day.

### FND-87 — Forks and named timelines

The user chose these on 2026-11-07, for I03-E02-012, building on the forking rules of
[FND-81](#fnd-81--runs-as-a-tree-of-state-transitions) and the moving of
[FND-86](#fnd-86--time-travel-replay):

- **What forks:** changing a rule while an earlier commit is shown starts a new timeline at that
  commit, and a Fork here button starts one with no change, which Start and Step then run on.
  Acting by hand and stating an indirect effect will fork the same way when they are built.
- **The tree:** a Timelines tab beside Outbox and inbox, Trace, and Rules shows each timeline
  under the one it forked from, with its name, where it forked, and its commits, and marks the
  one being watched. Selecting a timeline switches to it.
- **Names:** the first timeline is Main, and each new one Fork n, which a person can rename in
  the tree. A name is a label; a timeline's ID stays fixed.
- **Per timeline:** each timeline is judged when it reaches the scenario's end, with its own
  verdict and digest, and the status bar and every view show the timeline being watched.
- **IDs:** in the user's words, "use the timeline fork id so that the timeline id + commit id are
  globaly unique". A commit's and a session's numbers count along their own timeline's line of
  commits, so a fork goes on from its fork point, and a timeline's ID with a commit's ID names
  that commit across the whole run. Within one line the IDs stay unique, so a repeat still
  matches commits by their IDs and groups.
- **Removing timelines:** not in I03-E02-012; it can come later.
- **The tree, reworked:** the user asked on 2026-11-07 that "the branch selection should be
  larger not just the text, it makes hard and confusing to knwo where to click to select the
  branch the fork button shold be in the branch itselfe, so each branch contians a fork icon".
  The whole row of a timeline selects it, and each row has a fork icon. On the timeline being
  watched it forks at the commit shown; on another it forks at that timeline's latest commit.
  Fork here stays in the run controls, as the user chose, and shows the same fork icon.
- **Branches made of commits:** the user said on 2026-11-07 that "the timeline branch should show
  every dag root as a sequence of events", which is the view FND-81 describes: the tree of
  timelines and the timeline of commits are one view. Each branch shows its own line of commits
  in order, with each fork leaving its parent's line at its fork commit, and every commit
  selectable within the zoom groups of FND-81. I03-E02-012 built the tree with one summary line
  per timeline, and I03-E02-014 had planned the commits and groups for one line only, so the plan
  left this gap. The user chose, on 2026-11-07:
  - **Layout:** vertical, and in the user's words "everybranch should have its own vertical area
    column sow there is no overlap between rows so that two events that happen at the same time
    are shoun at the same horizontal line and not one above the other".
  - **Place:** it replaces the event list at the bottom of the run workspace. The event list
    stays as FND-77 describes it, as the user chose, moved to an Events tab in the main area
    beside Outbox and inbox, Trace, and Rules, so every entry can still be scanned with its
    number, time, source, kind, order, and cause.
  - **A commit:** expands to the events it holds, so the events stay reachable there.
  - **Backlog:** I03-E02-014 is rescoped to build it.
  - **Rows:** two modes a person switches between. By time, each simulated time is a band, in
    which each branch lists its commits at that time in order, and the band is as tall as the
    busiest branch. By commit number, row n holds commit n of each branch, whatever its time.
  - **Shared commits:** a commit before a fork point shows once, in the parent's column. The
    fork's column starts at its fork point, joined by a line to the parent's commit, as in git.
  - **Zoom:** a group opens and closes across every column at once, so the rows stay lined up.
    Its groups are the job run or API call each commit happened in, nested under spans of
    simulated time: an hour holds its minutes, and a minute holds the job runs and API calls in
    it, and a span with only one thing in it is skipped. Orders overlap in time, so grouping by
    order comes with the by-order view of I03-E02-015. By commit number, each branch's nth job
    run or API call sits on the same rows, as their numbers count along each branch, and inside
    it the commits line up by their order in it, so groups still open across every column. Hours
    and minutes line up only by time, so by commit number hundreds and then tens of job runs and
    API calls group them instead.
  - **Selecting:** a commit in another timeline's column watches that timeline and shows that
    commit.
  - **Open by default:** groups start closed, except the one holding the commit shown. While the
    run plays, the view follows the newest commit until a person scrolls or selects, as the
    event list did.
  - **Branches:** each fork was called a timeline, which clashed with the timeline as the view.
    Main, Fork 1, and the others are now branches, in the UI, the pages, and the code, so a run
    has one timeline whose columns are its branches. A saved run still reads, as only names
    change. Where this record and FND-81 say timeline for a fork, read branch.
  - **Reading it as a tree:** the user said on 2026-11-07 that "when i hover sometines the
    contrast is bad, the tree doesn not look like tree its not clear wher the branching happend,
    somethings are hard to click beacuse the click are is too small or its not clear what is
    clickable". Each branch's column has its own coloured lane, Main's from the top and a fork's
    from its fork point, where a line leaves the parent's commit and turns down into the fork's
    lane, as in a git graph; commits sit on their lane. A group's whole row opens it, a commit's
    whole label opens its events, rows are taller, everything that can be chosen looks it, and
    hovering never hides the colours of the commit shown or the event selected.
  - **Laid out as a tree:** the user asked on 2026-11-07 that "the parent root should stay in the
    middle and all branches should autoalign themselfe sho tha is starts looking like a tree
    structure, kind of like a binary tree but ofcourse there might be more the two sub
    branches". Each branch's column sits between its forks, which alternate sides in the order
    they were made, the first to the right, so the earliest stay nearest; each fork's own forks
    are laid out around it the same way. A fork's line leaves its parent towards its side, and
    each lane runs down the middle of its column.
  - **Commits, roots, and fork points:** the user chose on 2026-11-07 that each commit is a root
    of the DAG, as FND-81 has it, and is labelled so; that commits are nodes on their lane and
    groups are shaded bands with no node; and, in the user's words, "mark the fork point, the
    fork icon should be shown at the place where the forking happens not at the timeline
    header". A fork starts between job runs and API calls, so the commit ending each one, or a
    commit made outside one, is a fork point: its node is ringed, and its fork icon starts a
    branch there. The headings keep the name and a rename icon, and Fork here stays in the run
    controls.
  - **Scrolling sideways:** the user said the vertical scroll bar and the time and group column
    went out of sight when scrolling sideways. The time and group column stays put, the
    vertical scroll bar stays at the edge of the panel, and the headings move with the columns.
  - **Zooming out:** the user said on 2026-11-07 that "wen things are zoomed out, nothing is sow
    on the timeline, at leas there should be sone kind o compresed symmary node which can be
    expanded and collapsed, also there should be a mode swicher so i ca switch from haurly,
    minutly or comitly view". A closed group draws a summary node on each lane it holds commits
    of, with how many, marked when it holds the commit shown; it opens and closes the group. A
    zoom switch, Hours, Minutes, or Commits by time, and Hundreds, Tens, or Commits by number,
    sets which groups start open, starting with Minutes; opening or closing one by hand goes on
    top, until the zoom or the rows' mode changes. Groups no longer open by themselves to the
    commit shown, which following finds as the summary node holding it, unless an event is
    selected, whose commit opens.
  - **Curves and headings:** the user said on 2026-11-07 that "teh timeline click only works if
    clck the header text instea of the whole header tab. the tree should use curved lines
    insetad of hard corners, whic means that where there is a fork that row probably shoud be a
    bit taller so that the lines dont overlap". A whole heading watches its branch. Below the row
    a fork leaves its parent at, the fork has a connector row of its own, where its line curves
    off the parent's lane, runs across, and curves down into its lane; rows keep one height, as
    the scrolling needs, and the connector row gives the curves the room a taller row would.
  - **Calls between modules:** the user chose on 2026-11-08 that each state commit shows a badge
    for the module it changed, worked out by comparing its root with the one before, and that
    where the next commit in the same job run or API call changed another module, an arrow on the
    right of the column links the two, naming the module called. A closed job run or API call
    shows the modules it went through after its count, such as Orders → Deliveries → Orders, and
    a closed hour or minute how many calls it holds. Nothing for this is saved.
  - **Fixes after review:** on 2026-11-08 the user asked to fix what the screenshots showed. A
    state commit's module badge and a call's arrow sit left of the lane, where nothing else is
    drawn, so the commit's text keeps the room on the right; the arrow points at the badge of the
    module called, and the commit's tooltip says which module called it. Changing the zoom or
    the rows' mode applies as chosen, and the way down to a selected event opens again only when
    an event is selected. A fork's connector row goes above the row it leaves from when that row
    also holds some of the fork's own commits, as a closed group does, so its line runs into
    them. Columns are narrower, so four branches fit a usual window; text that does not fit ends
    in an ellipsis, with the whole of it in the tooltip.
  - **The Timelines tab:** removed. Each column's heading carries its branch's name, where it
    forked, the fork icon, and Rename, so the timeline itself is the tree.
- **As built:** in I03-E02-012, on 2026-11-07. A job run or API call is one piece of work, so a
  fork starts between them, at the nearest such place at or before the commit shown, as a repeat
  does. A fork goes on paused at its latest commit, and a fork of a fork may start before or
  after that fork's own fork point. A saved run keeps every timeline and every commit once.

### FND-88 — Step debugger

The user chose these on 2026-11-08, for I03-E02-011, building on the moving of
[FND-86](#fnd-86--time-travel-replay):

- **Events now, rules later:** breakpoints on events come in I03-E02-011. Breakpoints on rules
  need a record of each rule's evaluation, which the Rule evaluation log, I03-E04-007, makes, so
  they come with it.
- **What a breakpoint matches:** an event kind, such as OrderPickedUp or CommandRefused,
  narrowed if wanted to one source module or one order. Several can be on at once, and each can
  be switched off without removing it.
- **Where they are set:** a Breakpoints tab in the main area lists them, to add, switch on or
  off, and remove; and each event in the Events tab and on the timeline has a pause on this kind
  icon.
- **On a hit:** a job run or API call runs in one go, so the run pauses after the one that wrote
  the event. It shows the commit that wrote it, as time travel does, selects the event, and says
  which breakpoint it hit. Resume goes on to the next hit.
- **As built:** in I03-E02-011, on 2026-11-08. While a breakpoint is on, the work checks each
  piece's new entries, at max speed and when catching up on time alike, and the clock halts
  where the work stopped. The commit shown at a hit can be earlier than the latest, so Resume
  and Step stay enabled there and go on from the latest commit. A breakpoint on the kind alone
  shows its event's dot filled, and the dot removes it again. Breakpoints are kept when the run
  starts again.

### FND-89 — Indirect effects stated by hand

The user chose these on 2026-11-08, for I03-E02-013, building on the direct and indirect effects
of [FND-81](#fnd-81--runs-as-a-tree-of-state-transitions):

- **The first kinds:** three, each a decision the service takes no part in and learns of only
  through what happens next: a driver ignores a delivery request, a restaurant runs late with an
  order, and a customer won't take an order. The last leads to the driver's failed-delivery
  report, which comes with I03-E03-007; until then it can be stated and leads nowhere.
- **Stating one by hand:** a scenario step can state one, and the run workspace has a State an
  indirect effect action, which states one at the commit shown, forking first when an earlier
  commit is shown, as FND-87 says. Manual mode builds on the action later.
- **Cause links:** an indirect step has a label, and a later direct step can say it follows from
  that label; the direct commit then records the indirect commit that led to it. Nothing is
  worked out or guessed.
- **How long the service was unaware:** on the timeline, a hatched band in the branch's column
  runs from the indirect commit, marked as unseen by the service, to the direct commit it led
  to, with how long that was.
- **As built, the core (P01):** `IndirectEffect` replaced the empty set with the three kinds,
  with kebab-case names as the input commands have, so a scenario names them the same way. An
  indirect commit is a commit kind of its own, `Indirect`, outside any session, which changes the
  indirect part only and holds an `IndirectEffectHappened` log entry from the actors. Only an API
  call's effect records what it follows from, as scenario direct steps are API calls; a config
  change is the user's own act. Saved runs keep both.
- **As built, stating them (P02):** an indirect step is a third kind of script input. Its effect
  says whether a script stated it, as a config change does, so a scripted one counts as a step
  run and a repeat states a hand-made one again. A label maps to its indirect commit in the run's
  cache, the latest when two share one, which a scenario cannot do. A late restaurant's `lateBy`
  is a time like the other durations, and must be more than none.
- **As built, the browser (P03):** the form offers the scenario's drivers, restaurants, and the
  orders its steps create, and a statement made by hand has no label. The band is drawn only when
  the indirect commit and the call are in the same column; a call on a fork that follows from an
  indirect commit before the fork records it, but shows no band.
- **Reviewed by the user, 2026-11-08:** the band staying in one column, and the effect and its
  log entry saying whether a script stated it, are confirmed. Two choices change:
  - **Labels by hand:** the form asks for an optional label, so a later step can follow from an
    effect stated by hand. Only Manual mode's actions (I03-E03-001) can name such a label; the
    Rules panel offers scripted labels only.
  - **Config changes link back:** a config change can record the indirect commit it follows
    from, as an API call does. A scenario's `set` step takes `after` with a label, and the Rules
    panel offers the labelled indirect effects to pick from.
  - **Tracking:** a new item, I03-E02-022, makes both changes; I03-E02-013 stays Done as built.
- **As built, labels and config change links (I03-E02-022, 2026-11-09):** a config change's
  effect records `followsFrom`, as an API call's does, and saved runs keep it. A rules input and
  a scenario's `set` step take `after`, checked against the labels of earlier indirect steps,
  and saved scripts keep it. Repeat from here makes a config change made by hand again with the
  link it had. The form's Label is optional, trimmed, and refused when the run already uses it,
  scripted or by hand. The Rules panel's Changes follow from list offers the scenario's labels
  whose indirect commit is made by the commit shown; a change picked there, made from an earlier
  commit, forks first, as rule changes do, and the label is found again on the fork. The band
  showing how long the service was unaware still runs to API calls only.
