# Simulation engine

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved as a capability in
  [FND-8](../decisions/project-foundation/purpose-and-scope.md#fnd-8--capability-list). Partly
  implemented: the clock, working out the work due, seeded randomness, and the determinism check
  exist. The
  [implementation roadmap](../roadmap/implementation-roadmap.md) says which stage builds it.
  [How a run is held](#how-a-run-is-held) is approved, and
  [I03-E02](../../backlogs/Initiatives/I03-full-v1-0-0-lifecycle-and-rules/Archive/Done/I03-E02-run-history/I03-E02-run-history-backlog.md)
  builds it. So far, records are split, and a run keeps one state commit per transaction, an
  effect commit for each job run, API call, and config change, and an indirect commit for each
  indirect effect, over a main root that holds only its two sub-roots. The simulator's own data
  is worked out from the commits and the scenario, or held in the effects sub-root. Output and
  library effects, and implementation changes, are not built yet.

## Current and approved responsibilities

The simulated clock, the start, pause, and speed controls, and the event loop that
drives the other modules.

## Key approved business rules

- Virtual time by default, which can be paused, sped up, slowed down, or stepped, with a
  wall-clock mode; the same version, scenario, and seed give the same run
  ([FND-48](../decisions/project-foundation/simulation-model.md#fnd-48--simulation-model)).
- Speed is a multiple of real time or `max`, and starts at `60x`. It never changes a run's work or
  its order ([FND-64](../decisions/project-foundation/simulation-model.md#fnd-64--clock-speed)).
  Stepping gives the same run too: a run ends only once nothing is left due at or before its stated
  end.
- All randomness comes from named streams of the run's seed
  ([FND-66](../decisions/project-foundation/simulation-model.md#fnd-66--seeded-randomness)).
- A run handles a city: hundreds of drivers and thousands of orders in a simulated day
  ([FND-48](../decisions/project-foundation/simulation-model.md#fnd-48--simulation-model)).
- Full technical detail: transactions, polling, leases and claims, and service instances
  ([FND-46](../decisions/project-foundation/simulation-model.md#fnd-46--simulation-detail)).
- Runs interactively, and headless for batches and checks
  ([FND-49](../decisions/project-foundation/simulation-model.md#fnd-49--scenarios)).
- A value changed during a run is recorded as an event in it
  ([FND-54](../decisions/project-foundation/simulation-model.md#fnd-54--tunability)).
- The offline dispatch model uses this engine, with instant module communication and no faults
  ([FND-55](../decisions/project-foundation/simulation-model.md#fnd-55--offline-dispatch-model)).
- **Step debugger:** a breakpoint matches an event kind, narrowed if wanted to one source module
  or one order, and can be switched off without being removed. A job run or API call runs in one
  go, so a run pauses after the one that writes an event a breakpoint matches, showing the commit
  that wrote it, and Resume and Step go on from the latest commit. While a breakpoint is on, the
  work checks each piece's new entries; with none on, it runs as before. Breakpoints belong to
  the person watching, are kept when the run starts again, and are not saved with the run.
  Breakpoints on rules come with the Rule evaluation log, I03-E04-007
  ([FND-88](../decisions/project-foundation/run-history.md#fnd-88--step-debugger)).

## Dependencies

From the confirmed [dependency graph](README.md#dependency-graph)
([FND-56](../decisions/project-foundation/architecture-and-code.md#fnd-56--module-boundaries)):

- **Uses:** [Orders](orders.md) (drives), [Drivers](drivers.md) (drives),
  [Restaurants](restaurants.md) (drives the actors),
  [Payments](payments.md) (drives), [Notifications](notifications.md) (drives),
  [Map and routing](map-and-routing.md) (moves drivers), [Event log](event-log.md) (writes
  every event), [Fault injection](fault-injection.md) (applies faults), and
  [Business rules](business-rules.md) (tunes rules).
- **Used by:** [Technical view](technical-view.md) (instances and jobs), [Analysis](analysis.md)
  (many runs), [Scenarios](scenarios.md) (supplies run inputs),
  [Fault injection](fault-injection.md) (skews clocks), [Run history](run-history.md)
  (commits), and [Business rules](business-rules.md) (the run's rules, for the Rules panel).

## How a run is held

Approved in
[FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions),
and built except for output and library effects, implementation changes, and what
[Records and references](#records-and-references) marks as not built. A run is a line of
commits. Each commit points at a main root, and each main root is the root of an immutable DAG
that shares everything unchanged with the roots before it.
Moving through a run moves between existing roots, as moving between commits does in git.

```text
commit 3 ──parent──> commit 2 ──parent──> commit 1      the line of commits: one commit, one main root
   │ root
   ▼
main root
 ├─> state sub-root ──> orders, deliveries, and their records
 └─> effects sub-root
      ├─> direct part ──> input calls, output calls, job runs, library effects, config changes,
      │                   the config values, and the version of each state function in use
      ├─> indirect part ──> decisions and changes outside the service
      └─> randomness part ──> the seed, and where each named stream has got to
```

### Commits

Every commit makes a new main root. What differs is which sub-root it replaces, and it reuses the
other as it is.

| | State commit | Effect commit |
| --- | --- | --- |
| Matches | One transaction in the real service | An operation that can affect the outside world, or the service's own state |
| New state sub-root | Yes | No |
| New effects sub-root | No | Yes |
| Holds | The one pure function it ran, and its arguments | Its kind, and what crossed the boundary |

- **A state commit holds its call:** a direct reference to the module function it ran, and its
  arguments after the module's state. Calling it again on the parent root gives the commit's state
  exactly, and a test shows this for every function that can make a commit. Only the
  [repository](run-history.md#repository) knows a function's stored ID.
- **One transaction, one commit.** A transaction doing several things is one commit, and an
  event-driven operation is several.
  [Module communication](../versions/V1.0.0/module-communication.md) says where each transaction
  starts and ends.
- **State means the real service's state.** The state sub-root holds nothing that exists only in
  the simulator, so two moments with the same state sub-root have identical state, by one pointer
  comparison. A test on every run shows that each commit changes only its own sub-root.
- **A true effect changes something.** An effect that is only internal, and changes neither
  internal nor external state, makes no commit. A cache hit is one example.
- **The commits of one action** run back to back at one simulated time in `I03`. `I04` lets other
  work land between them.

### Kinds of effect

The dividing line is whether the service took part.

| Group | Kind | Examples | Records |
| --- | --- | --- | --- |
| Direct | Input | A consumer's API call, including a refused one | The caller, the request, and the response |
| Direct | Output | A call to the push or routing provider | The request and its outcome |
| Direct | Job | Every job run, even one that finds nothing, because each run's record is visible outside the job | Which job ran, and what it did |
| Direct | Library | A cache entry removed, or a call changing the cache | What the library did |
| Direct | Config change | Rule parameters changed during a run, by rule ID | Every module's rules before and after |
| Direct | Implementation change | State functions switched to other versions during a run, by name | The version of every function before and after |
| Indirect | Indirect | A driver ignoring a delivery request, a restaurant running late with an order, or a customer not taking an order; later, a phone going offline | Who decided, the order, and for a late restaurant how much later it expects to be ready |

- **Indirect effects** cover decisions and changes that can alter what happens later, and not
  continuous movement. The service can't see them, so the simulator knows more than the service
  does. A direct effect records which indirect effect led to it, when that is known. `I03` states
  them by hand, in scenario steps and Manual mode, and behaviour profiles add them later. Each
  kind of indirect effect has its own typed data
  ([FND-72](../decisions/project-foundation/architecture-and-code.md#fnd-72--code-style)). There are
  three kinds: a driver ignores a request, a restaurant runs late, and a customer won't take an
  order
  ([FND-89](../decisions/project-foundation/run-history.md#fnd-89--indirect-effects-stated-by-hand)).
- **An indirect commit** states one. It changes only the indirect part of the effects sub-root,
  and shares the state, the direct part, and the randomness with the root before it. It happens
  outside any job run or API call, at a time no earlier than the latest commit and once no work is
  due before it, as a config change does. It writes an `IndirectEffectHappened` entry from the
  actors, which the service did not see, and holds it. An indirect effect can have a label, which
  a later input names to say it follows from it; an API call's effect, and a config change's,
  records the indirect commit it follows from, or nothing. A label can be given by hand too,
  through the form, and may not repeat one the run uses, scripted or by hand
  ([I03-E02-022](../../backlogs/Initiatives/I03-full-v1-0-0-lifecycle-and-rules/Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-022-indirect-effect-labels-and-config-change-links.md)).
  A fork can start at an indirect commit, to explore a different
  decision.
- **Stating one:** a scenario's [indirect step](scenario-format.md#an-indirect-step) is one of the
  script's inputs, and its commit counts as a step run; a later action names its label with
  `after`, and the run looks the label up among its indirect commits. A live run states one by
  hand at the commit shown, forking first when an earlier commit is shown, as a rule change does.
  A repeat states a hand-made one again at its commit.
- **Output effects** are a set of kinds that starts empty too, as nothing calls a provider yet.
  The item that first calls the push or routing provider adds its kind, with typed data, and adds
  it to the direct effects, so a commit kind for it appears then.
- **Calls between the modules** show as links. The call makes no commit of its own: the pending
  request it usually creates is the commit, and a call that creates no state or effect makes none.
- **A cache** behaves as the real library does. A time limit passing is no event. A commit happens
  when the library removes an entry, or when a call changes the cache. Cached state lives in the
  direct part.
- **Tuning** rule parameters during a run makes a config change commit, and the values a run
  starts with sit in its start root without one. A script's step can change rules too, as a
  config change commit that counts as a step run. A config change records the indirect commit it
  follows from, when a script's step names its label in `after` or a person picks one in the
  Rules panel, and Repeat from here keeps it. A change names a rule and a parameter by ID,
  and goes to the module that holds the rule; a rule no module holds is refused
  ([FND-84](../decisions/project-foundation/architecture-and-code.md#fnd-84--rule-abstractions)).
- **Function versions:** the direct part holds the version of each state function a run uses, by
  name, starting at the newest, and saved runs keep it. A run carries the lookup that finds a
  function by name and version, handed in when it is created or loaded and never saved, and
  every state call takes its function through it, at the version the root holds
  ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)).
  Switching a function's version during a run is an implementation change, a planned kind:
  `I03-E02-026` builds the `ImplementationChange` commit, with its `FunctionVersionSwitched` log
  entry. A scenario's `use` step can switch a version, and so can
  a person in the Rules panel, forking first when an earlier commit is shown, as rule changes do
  ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)).
- **Groups:** a commit stores which job run or API call it happened in, and those commits group
  under it on the timeline. The effect commit comes last in its group, because only then is the
  response, or how much the job did, known.

### Records and references

The record split and version chains are built, and so are copies that hold only what their module
knows: orders' copy of a deliveries event keeps the fields orders has, not the deliveries record.
Collections keyed by the parent's ID, links across the modules, and the in-memory form are built
too. Order items are not records yet:
[I03-E04-002](../../backlogs/Initiatives/I03-full-v1-0-0-lifecycle-and-rules/I03-E04-business-rules/High/I03-E04-002-order-creation-validation.md)
makes them. Links across the sub-roots are built, by
[I03-E02-021](../../backlogs/Initiatives/I03-full-v1-0-0-lifecycle-and-rules/Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-021-links-across-the-sub-roots.md).

- **Two parts:** every record that changes splits into an unchanging part and a version part, such
  as `Order` and `OrderVersion`. Events and outbox rows never change, so they have no version
  part: a match with the other module found after an event was recorded is held as a separate link.
  A version's number is today's order version, which the outbox already carries. Deliveries' copy
  of an order is a record of its own, `OrderCopy`, apart from the delivery's version, as it
  changes when Orders' events arrive.
- **Parts that change at different rates:** each has versions of its own, so the part that
  changes most often keeps its versions small. A driver's status and their location each extend
  the driver with a version chain of their own, as the records `DriverStatus` and
  `DriverLocation`, and a send makes only a small location version; the driver's full view is
  all of them together ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)).
  An order's status, driver, and readiness are read from its events, not stored again in its
  version ([FND-73](../decisions/project-foundation/architecture-and-code.md#fnd-73--immutable-architecture)).
- **Version chains:** the state holds the latest version of each record, and each version links
  directly to its previous one, so an order's history is a short walk.
- **Between records:** a child holds its parent's ID, and points at the unchanging part unless a
  specific state matters. An order item is its own record with an `orderId`. Records can then
  point at an order without being copied when it changes.
- **In the structure:** a parent references its child, from main root to sub-root to collection,
  and a collection keyed by the parent's ID finds a record's children. A child can't point up at
  its root, because every new root would then need a new copy of it.
- **Across the sub-roots:** effects point directly at state, such as the exact `OrderVersion` a
  call saw, and state holds an effect's ID, so the pointer comparison above still holds.
- **Makers:** every record version names its maker, the job run or API call that made it, as a
  `Maker` that System defines, as Domain cannot know the Simulation engine's IDs. A job run or
  API call opens with one maker, which every call in it passes last to a state function that
  makes versions. A scenario's starting drivers name the run's start. Each state function's
  result also lists the versions it made, which the run's index takes in.
- **Reads:** an API call's or job run's effect lists the versions it read, which the engine works
  out as it ends: as they stood before it, the order and driver a call names, the records it
  made versions of, and the drivers it notified. A record only looked at, and not changed, is
  not listed, and a config change or an implementation change lists none
  ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)).
- **Switching versions** of state functions during a run makes an implementation change commit,
  which puts the versions in use that every later state call goes through, in the direct part
  beside the config values. It happens at a time no earlier than the latest commit, once no work
  is due before it, as a config change does, and writes a `FunctionVersionSwitched` entry from
  the Simulation engine for each function whose version changed, with its name and its versions
  before and after; a version the run's lookup does not hold is refused. A scenario's
  [use step](scenario-format.md#a-step) is one of the script's inputs, and its commit counts as
  a step run; a person switches one by hand in the
  [Rules panel](business-rules.md#the-rules-panel), forking first from an earlier commit, and
  Repeat from here makes a hand-made switch again
  ([I03-E02-026](../../backlogs/Initiatives/I03-full-v1-0-0-lifecycle-and-rules/Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-026-implementation-change-and-the-use-step.md)).
- **The index:** the run's cache keeps, for each job run or API call, the records it made
  versions of, and for each record, the commits that made a version of it. It takes in each
  state commit's made versions as the run grows, and is worked out again from the latest root's
  version chains and their makers on a fork, a switch, or a load. Its lists are short plain
  arrays: a city day's index holds 24 MB, where Immutable sets and lists held 55 MB.
- **Across the modules:** records may hold followable links, and the timeline, views, and checks
  follow them freely. A module's rule functions receive only their own module's state and copies,
  so drift stays visible.
- **In memory:** custom nodes for the roots and where a node needs customising, and Immutable.js
  for general collections and where performance matters.

### What the main root does not hold

The main root holds exactly its two sub-roots. A run holds only its scenario's script, with the
city it happens in and the restaurants' customers and their addresses
([FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)), its line
of commits, the root it has reached, and the cache beside that line, which is never saved and is
rebuilt from the commits on loading. The simulator data a run held beside its root until
`I03-E02-006` went here:

| Was beside the root | Where it went |
| --- | --- |
| Clock | Worked out: the commit's time. The service driving the run holds how far it has moved past the latest commit, which is not saved |
| Job due times | Worked out: the job's last run in the direct part, plus its interval. The cache beside the line of commits finds each job's last run |
| Scripted steps left | Worked out: the scenario, plus the input commits made so far, which the cache counts |
| Scenario's names for orders | Worked out: the create order call's response. The cache finds an order by its name |
| Log | Worked out: each commit holds the entries it wrote. A cache beside the line of commits serves its lookups, and is not saved |
| Random stream positions | Effects sub-root, in its randomness part, because only effect commits draw. A commit that draws saves the new positions with its own change |
| Values tuned during a run | Direct part. Rule functions receive them as an argument |
| Simulated actors' plans | Indirect part |
| Inbox scan shortcut | State sub-root, beside the inbox records. It moves only inside a state commit, and exists only for speed |

Work due at one moment runs in the order a schedule used to give it: a job's first run, then the
scenario's steps, then jobs in the order of their latest runs. The pinned digests show that the
worked-out order matches exactly. A job whose interval is tuned shorter, so that its next run has
already passed, is due at once.

A driver's app sending its location is work too: the script's riders say how often each driver's
app sends, and a send is due that long after the app's latest one, or after the start, while the
driver is online and has a location. Every send due at one moment is one piece of work and one
API call, `send-locations`, holding each app's send in the order of the drivers in the script,
with one log entry listing them and no one actor; so a day makes one send commit each interval,
whatever the number of drivers. Sends due at a moment come after everything else due then. The
call is about no order, which no step gives, so it does not count as a step run; the cache keeps
each app's latest send. Each send reports where the driver's ride has them. A run saved before
sends were batched holds one `send-location` call for each send, and still loads and replays.

Riding drivers are simulated actors, whose plans the indirect part holds. After a driver's
accept, pick-up, or delivery succeeds, the engine makes an indirect commit, `driver-sets-off`,
with the route along the streets to their nearest due stop and their speed; where they are at
any moment is worked out along it. With no stop due, as after their last delivery, the commit is
`driver-goes-to-wait` instead, with the route to their service area's waiting point; a driver
already there, or one from a run saved before waiting points, stays where they are. A driver
begins where the scenario puts them. A scripted pick-up or delivery whose driver has not arrived,
or whose earlier step on the same order waits, becomes an indirect commit,
`driver-acts-on-arrival`, which counts as its step, so the rest of the script runs at its times.
The call itself is work due when the driver's latest ride reaches that stop, after the script's
steps due then; its input commit follows from the waiting commit, and is not a step run. The cache
keeps each driver's latest ride and the steps waiting. A step with `atItsTime` runs at its time,
and with no city or no rider nothing waits
([FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)). A run with no riders, as the engine's own tests start, sends nothing.

### Follow-ups

A step returns what should happen next as data, and the engine turns that into the next call, so
no module calls another. These are named follow-ups, to keep "effect" for effect commits.

### Memory

Every commit keeps its main root in memory, which `I07` revisits at a full city day. A city day
now makes 254,524 commits, of which 169,800 are state commits, and holds about 749 MB once the
run ends. Pending requests and the push pipeline should take that to about 324,000 commits.
[I03-E02-017](../../backlogs/Initiatives/I03-full-v1-0-0-lifecycle-and-rules/Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-017-measure-a-city-day-with-commits.md)
measures it properly.

## Performance

`npm run benchmark` runs a city through the core in Node: by default 200 drivers and 2,000 orders
in a simulated day, with every driver's app sending every 30 seconds.
[FND-48](../decisions/project-foundation/simulation-model.md#fnd-48--simulation-model) sizes a
city at hundreds of drivers and thousands of orders; the default was 500 and 5,000 until sends
came, and the user lowered it to 200 and 2,000 in I03-E09-008
([FND-90](../decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
`--drivers` and `--orders` change the size. It runs on demand, and not in `npm run check`. Each
driver starts with a location sent at the start, which their app keeps fresh.

Measured on 2026-11-12, on a development PC with Node 26, with Node's default heap, the default
day ran in 58 s, at about 1,500 simulated seconds a second, with 146,084 commits and 90,480 log
entries; it delivered all 2,000 orders with none refused, and its digest is `554aa5c6d0461cfa`.
It held 656 MB with every root, 199 MB with only the latest, and peaked at 2.8 GB. Saved at
"everything" it took 417 MB, 8 s to save and 14 s to load; at "minimum", 261 MB, 7 s and 29 s.
A 500-driver, 5,000-order day ran in 215 s, with 275,284 commits, held 1,506 MB, and took
1,025 MB saved at "everything"; saving it and loading it back at both levels needs more than
Node's default heap of 4 GB.

Sends first made the day far slower: on 2026-11-11 a 50-driver day took 110 s instead of 25 s,
with 362,624 commits instead of 74,624, and a 200-driver day ran out of memory. I03-E09-008 sent
every app due at a moment in one call, gave a driver's status and location versions of their own,
and made the run's index, its due sends, a driver's due stops, and the reads found again on
loading cost what changed rather than what had gone before.

The measurements below were taken before drivers' apps sent their locations.

Measured on 2026-11-04, on a development PC with Node 26. Each column is seconds to run the day:

| Drivers and orders | Mutable design | Immutable, with full scans | Immutable, with indexes |
| --- | --- | --- | --- |
| 50 and 200 | 1.7 | 5.6 | 1.5 |
| 100 and 500 | 5.7 | 22.8 | 2.7 |
| 200 and 1,000 | 17.7 | 117.9 | 5.0 |
| 500 and 5,000 | Stopped after 500 | Not run | 38.1 |

The first two columns also include reading the scenario and the digest, which took about a second
or less at those sizes. All three gave the same digest wherever more than one finished.

At the full size, a run writes 204,800 log entries, delivers all 5,000 orders, moves at about 2,265
simulated seconds per real second, and peaks at 641 MB. Holding the finished state takes about
130 MB. Most of the remaining time is dispatch ranking drivers.

Splitting records so that each version links to its previous one keeps old versions in memory.
On 2026-11-05, the same city day went from 40.1 s and a peak of 649 MB to 41.8 s and 794 MB,
with the same digest, `7958d5c3f0bc7e68`. Keeping every commit's main root then took the peak to
1,037 MB, and 511 MB is still held once the run ends, at 41.9 s with the same digest, for 59,046
commits. One commit per transaction made that 169,800 commits, at 48.5 s, a peak of 1,177 MB,
and 630 MB held, still with the same digest. Effect commits for each job run and API call made
it 254,524 commits, at 47.3 s, a peak of 1,315 MB, and 728 MB held, again with the same digest.

Working the simulator's data out from the commits kept the same 254,524 commits and the same
digest. Measured on 2026-11-06 against the code just before it, on the same PC, the day took
45.2 s instead of 49.8 s, and held 726 MB instead of 706 MB after a full garbage collection. The
peak went from 1,320 MB to 1,482 MB, mostly from short-lived values. Each commit holds its own
log entries, in a list of their own, because a slice of the whole log kept far more of it alive:
with slices, the peak was 1,561 MB.

Each state commit holding its function and arguments kept the same digest. The day took 41.9 s,
held 749 MB after a full garbage collection, 23 MB more than before, and peaked at 1,536 MB.

On 2026-11-06 the digest stopped using JSON
([FND-72](../decisions/project-foundation/architecture-and-code.md#fnd-72--code-style)): each entry
is written out field by field, by its kind, so the digest changed once, to `6673c9a1ec7fb42f`, with
the same
204,800 entries and all 5,000 orders delivered. The day took 46.1 s and peaked at 1,440 MB.
Making every Domain type an immutable class, frozen when made, kept the same digest. With Orders
done the day took 49.5 s and peaked at 1,275 MB, and with Deliveries too, 46.7 s and 1,456 MB.
Branded numbers, checked when made, also kept the same digest: the day took 45.8 s and peaked at
1,258 MB. Splitting the drivers' state from the Deliveries state kept it too, at 48.1 s and the
same peak. Holding every time as a `SimTime` object, and every length as a `Duration`, kept the
digest as well: the day took 44.0 s, against 45.4 s just before, and peaked at 1,321 MB instead of
1,245 MB.

On 2026-11-07, writing Drivers' rules with the Business rules abstractions kept the digest, at
49.2 s against 47.6 s to 49.4 s for the code just before it, measured on the same PC that day.
Going through the eligibility checks as a list first made the day about 12% slower: a single call
site that calls five different functions cannot be inlined. Calling each check by name removed
that, so Drivers does
([FND-84](../decisions/project-foundation/architecture-and-code.md#fnd-84--rule-abstractions)).
Writing Orders' and Deliveries' rules the same way also kept the digest, at 48.8 s and a peak of
1,250 MB.

The benchmark also reports what the heap holds after full garbage collections: before the run,
with the run and every root its commits keep, and with only its latest root, together with the
number of commits. Measured on 2026-11-07 for
[I03-E02-017](../../backlogs/Initiatives/I03-full-v1-0-0-lifecycle-and-rules/Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-017-measure-a-city-day-with-commits.md),
on the same PC as the measurements above, the city day made 254,524 commits and 204,800 log
entries, delivered all 5,000 orders with the same digest, and took 51.9 s, at 1,665 simulated
seconds per real second, with a peak of 976 MB. The heap held 25 MB before the run, 761 MB with
every root, and 119 MB with only the latest root. The estimate in
[FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)
was about 1,046 MB with every root and 108 MB with the latest only: keeping every root costs about
640 MB for the day, less than estimated, and the latest root alone about what was estimated.
`I07` revisits keeping every root with these numbers.

Keeping every commit's place for time-travel replay kept the same digest and time, at 51.9 s,
and took what the heap held with every root from 761 MB to 771 MB.

These results decide the question in
[FND-73](../decisions/project-foundation/architecture-and-code.md#fnd-73--immutable-architecture):

- **Run state stays immutable.** The slowness came from scanning whole lists, which the mutable
  design did too. Indexes in the state fixed it: each order's events and notifications, each
  driver's order counts, and how far each inbox has read.
- **One exception: the digest's hash.** Its loop, in `textDigest`, uses local variables, although
  the function is pure from outside. On a city's log, the version without them took 8.5 s and
  pushed the peak to 1.6 GB, and the loop takes 0.15 s, with a peak of 641 MB in the full run. The
  same digest came from both.

Nothing here measures a browser, or sets a target. That belongs with Responsive while running and
Large run handling.

Measured on 2026-11-09, on the same PC, before and after
[I03-E02-021](../../backlogs/Initiatives/I03-full-v1-0-0-lifecycle-and-rules/Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-021-links-across-the-sub-roots.md)
added makers, effect reads, and the run's index, three runs of each, taken in turn:

| Measure | Before | After |
|---|---|---|
| Seconds to run the day, middle of six | 55.7 | 56.5 |
| Seconds to run the day, fastest | 50.4 | 54.4 |
| MB held with every root | 778 | 826 |
| Run digest | `6673c9a1ec7fb42f` | `6673c9a1ec7fb42f` |

One run takes from 50 to 63 seconds on this PC, more than the difference measured. A CPU
profile puts 2.5 s of a 71 s run, 3.5%, in the new code: noting what each commit made, and
working out what each job run or API call read. Working the index out again for a fork, a
switch, or a load takes 2.4 s. Every query of the Run history's query module answers in
microseconds; the commits that touched each of the 5,000 orders take 80 ms in all, where
comparing every root took about 26 minutes.

The benchmark also saves the run at each level as plain data and loads it back, checking the
loaded run's digest. Measured on 2026-11-09 for
[I03-E02-008](../../backlogs/Initiatives/I03-full-v1-0-0-lifecycle-and-rules/Archive/Done/I03-E02-run-history/Archive/Done/High/I03-E02-008-saved-runs-at-two-levels.md),
the city day ran in 55.4 s with the same digest, `6673c9a1ec7fb42f`, and both levels gave the
same run back:

| Level | MB | Seconds to save | Seconds to load |
|---|---|---|---|
| Everything | 242 | 8.1 | 11.4 |
| Minimum | 146 | 10.1 | 56.3 |

Loading at minimum works every root out again, so it takes about as long as the run. Holding the
saved forms and the loaded runs beside the run took the peak from about 1 GB to 2.9 GB.

## Code map

| Path | Purpose |
|---|---|

| `src/domain/simulation-engine/seeded-random.ts`, `random-stream.ts` | The run's named streams of random numbers |
| `src/domain/simulation-engine/clock-time.ts` | Reads and writes simulated time, as h00:m05:s00:ms00 |
| `src/application-core/simulation-engine/compare-runs.ts` | Finds the first difference between two runs, comparing entries by their typed fields |
| `src/application-core/simulation-engine/run-digest.ts`, `src/domain/simulation-engine/text-digest.ts` | A short fingerprint of a whole run, and the hash it uses |
| `src/application-core/simulation-engine/run-log-entry-digest.ts` | Writes each kind of entry out field by field for the digest, and compares two entries by their typed fields. Tests check that the two never disagree |
| `src/domain/system/digests/digest-parts.ts` | How a record is written out for a digest. Each record in the log writes itself out and compares itself by its fields, with `digestPart` and `equals` |
| `scripts/benchmark-city.mjs`, `scripts/city-scenario.mjs` | The city-scale benchmark, and the scenario it runs |
| `src/application/simulation-engine/determinism-check.ts` | The Determinism check |
| `src/application/simulation-engine/simulation-clock.ts`, `clock-speed.ts`, `clocked-work.ts` | Clock control: start, pause, speed, step, and tick, and halting where the work stopped at a breakpoint |
| `src/application-core/simulation-engine/breakpoints.ts` | The step debugger's breakpoints, and which one, if any, the entries a piece of work wrote reach ([FND-88](../decisions/project-foundation/run-history.md#fnd-88--step-debugger)) |
| `src/application-core/simulation-engine/run-log-entry-order.ts` | The order a log entry is about: its own, or its cause's |
| `src/application/simulation-engine/simulation-run.ts` | The service that holds a run's latest state, moves it on one step at a time, and stops on a bug |
| `src/application-core/simulation-engine/main-root.ts`, `commit.ts`, `commit-id.ts`, `session-id.ts`, `direct-effect.ts`, `commit-line.ts` | The main root with its two sub-roots, whose state part holds Orders, Drivers, and Deliveries; a commit; what an effect commit records; and a run's line of commits |
| `src/application-core/simulation-engine/run-state.ts`, `run-work.ts`, `run-failure.ts` | A run: its script, line of commits, root, and cache; the kinds of work and the jobs' intervals; and the bug that stopped it |
| `src/application-core/simulation-engine/due-work.ts` | Works out the next work due from the commits, the config values, and the scenario |
| `src/application-core/simulation-engine/ride.ts`, `riding.ts` | A riding driver's decisions, setting off, going to wait, and acting on arrival, with where a ride has them and when it arrives; and setting off for the nearest due stop, or the area's waiting point with none due, and making a step wait |
| `src/application-core/simulation-engine/rider.ts`, `location-send.ts` | A driver as the simulator rides them, with how often their app sends and how fast they ride, and performing the sends of every app due at one moment as one API call |
| `src/application-core/simulation-engine/run-cache.ts` | The cache beside the line of commits: the log, and the lookups worked out from the commits |
| `src/application-core/simulation-engine/run-index.ts` | The index in the cache: the records each job run or API call made versions of, and the commits that made each record's versions ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)) |
| `src/application-core/simulation-engine/session-maker.ts`, `record-ref.ts`, `record-version.ts`, `effect-reads.ts` | The maker of the versions a call makes; a record by its kind and ID, and a version of any record; and what a job run or API call read |
| `src/application-core/simulation-engine/run-history.ts`, `run-branches.ts`, `branch-id.ts` | A run's branches: forking at a place, switching, renaming, deleting a branch with no forks of its own, and the list the tree shows ([FND-87](../decisions/project-foundation/run-history.md#fnd-87--forks-and-named-timelines)) |
| `src/application-core/simulation-engine/run-places.ts`, `run-repeat.ts` | Time-travel replay: a run's places, from the start to the latest commit, each giving its commit, root, and log at once, and repeating a run from a place, compared commit by commit ([FND-86](../decisions/project-foundation/run-history.md#fnd-86--time-travel-replay)) |
| `src/application-core/simulation-engine/indirect-effect.ts`, `indirect-commit.ts` | The kinds of indirect effect, each with its typed data; and the indirect commit that states one |
| `src/application-core/simulation-engine/run-values.ts`, `config-change.ts`, `run-value-changes.ts` | The config values in use, each module's rules; the config change commit; and how its changes reach the module that holds each rule |
| `src/application-core/simulation-engine/implementation-change.ts` | The implementation change commit, which switches state functions to other versions during a run (FND-81) |
| `src/application-core/simulation-engine/run-step.ts`, `run-commands.ts`, `follow-up.ts`, `command-outcome.ts` | The pure steps of a run, carrying out the modules' effects, and the typed refusals: the script's own, orders', and deliveries' |
| `src/application-core/simulation-engine/run-log.ts`, `run-log-entry.ts` | Writes what the modules report to the log as typed entries, working out what caused each. An entry's data uses Domain records and never extends them: an orders event's data holds the event, with the order's status and version beside it |
| `src/application-core/simulation-engine/forged-entries.ts` | Records forged on purpose, which the Simulator self-tests break a known good log with |
| `src/application-core/simulation-engine/function-name.ts`, `function-lookup.ts` | Each state function's name and type, the lookup a run carries to find one by name and version, the versions a run starts with, and the function a call goes through ([FND-81](../decisions/project-foundation/run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)) |
| `src/application-core/simulation-engine/state-call.ts` | The pure function a state commit ran, and its arguments |
| `src/application-core/simulation-engine/run-input.ts`, `input-names.ts`, `input-command.ts`, `run-inputs.ts` | The engine's own form of an input, a command from outside at a stated time, rules to change, or an indirect effect; the names an input gives actors, orders, and indirect effects; and performing a command as the restaurant or driver. Scenarios converts its steps into these ([FND-83](../decisions/project-foundation/architecture-and-code.md#fnd-83--types-owned-by-their-modules)) |
| `src/domain/simulation-engine/numbers.ts` | `WallTime`, `Seed`, `RandomWord`, and `SpeedMultiple`, the clock speed's own multiple of real time, made by creators that check them |
| `src/domain/simulation-engine/sim-time.ts` | `SimTime`, the simulated time, which implements System's `IInstant` ([FND-83](../decisions/project-foundation/architecture-and-code.md#fnd-83--types-owned-by-their-modules)) |
| `src/application-core/simulation-engine/wall-clock.ts` | The abstraction for real elapsed time |
| `src/infrastructure/simulation-engine/browser-wall-clock.ts` | Its browser implementation |
