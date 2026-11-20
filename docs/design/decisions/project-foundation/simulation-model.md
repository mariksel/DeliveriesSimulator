# Project foundation — Simulation model

How a run is simulated: its detail, failures, scenarios, comparisons, time, randomness, and the
event log. This is part of the [project foundation](../project-foundation.md), which holds
its version, authority, and undecided questions, and lists where each record is.

## Approved decisions

### FND-46 — Simulation detail

- **Full technical detail:** transactions, polling, leases and claims, service instances, and
  each module's records, down to individual rows.
- **Push pipeline:** sending, retries, invalid devices, and callbacks are simulated.
- **Full device model:** devices can be offline or in the background, and can receive
  duplicates. Apps are simulated actors acting through behaviour profiles, with no screens.
  Device hardware stays out of scope ([FND-33](purpose-and-scope.md#fnd-33--out-of-scope)).

The user decided these on 2026-11-03, in I01-E02-003.

### FND-47 — Failures

- **Priority:** races, give-ups, duplicates and timing, and outside failures and data problems
  all matter.
- **How failures are produced:** by hand, at random, and explored systematically.
- **Fault injection reaches every step:** any step that saves data, calls the other module or a
  provider, runs a job, or sends a message, and clocks and devices.
- **Drift report:** when the modules drift apart, the simulator reports which order and which
  part of its state differ, the cause traced back to its fault, how long they have been apart
  against the convergence bound, and what each actor sees wrongly as a result.

The user decided these on 2026-11-03, in I01-E02-004.

### FND-48 — Simulation model

- **Time:** virtual time by default, which can be paused, sped up, slowed down, or stepped, with
  a mode that runs at wall-clock speed.
- **Repeatability:** the same version, scenario, and seed always give the same run, event for
  event.
- **Geography:** a synthetic city, generated from a seed and settings such as size, number of
  areas, and restaurant density, and editable by hand. The simulator draws it itself, and drivers
  move along its streets.
- **Scale:** a run handles a city: hundreds of drivers and thousands of orders in a simulated
  day.
- **Behaviour profiles:** the simulator ships default profiles, and anyone using it can create
  or edit their own. The lists were completed for now on 2026-11-03; more controls may be added.
- **A driver profile controls:**
  - **Responses:** how often they accept, reject, or ignore a request, and how long they take to
    answer.
  - **Movement:** travel speed, waiting at restaurants and customers, and how often a delivery
    fails.
  - **Shifts and status:** when they are online, and which availability they choose.
  - **App and device:** the location send interval, being in the background or offline, and
    retrying commands.
  - **Transfers:** how often they request a reassignment, to whom, and how they answer as the
    target.
  - **Cash handling:** when they request cash confirmations and payment returns, and how much
    cash they carry before handing it over.
  - **After a failed attempt:** whether they try again, request a return, or transfer the order.
  - **Mistakes:** duplicate taps, late or missed pickup and delivery reports, and wrong-order
    actions.
  - **Workload limits:** how many orders they will hold at once before refusing more.
  - **Area preference:** staying near certain restaurants or parts of the city.
  - **Grouping orders:** whether they carry several orders on one trip.
  - **Breaks:** when, and for how long, they take breaks.
  - **Pickup patience:** how long they wait at a restaurant for an order that is not ready before
    cancelling their acceptance.
  - **Absent customers:** how long they wait, and what they do, when the customer cannot be
    reached.
  - **Route choice:** whether they take the shortest route through the synthetic city, or
    familiar streets.
  - **Alert handling:** how they react when a request they were notified about is claimed or
    closed.
  - **Cancelling after accepting:** how often they cancel an acceptance, for example when the
    restaurant turns out to be far away.
  - **Reading open requests:** how often they check open requests they were not notified about.
  - **Location gaps:** periods when the app sends no location, such as in a tunnel or with a
    poor connection.
  - **Distance threshold:** accepting only requests from restaurants within a chosen distance.
  - **Experience level:** new and experienced drivers, with different speeds and mistake rates.
- **A restaurant profile controls:**
  - **Order flow:** how many orders arrive, when, and of what size.
  - **Preparation:** preparation times, and how far the real time differs from the estimate.
  - **Answers:** how quickly, and how, they answer cash confirmations, returns, and payment
    returns.
  - **Cancellations:** how often they cancel delivery requests or orders.
  - **Marking ready:** when they mark orders ready: early, late, or never.
  - **Opening hours and pauses:** when they are open, and when they pause or close.
  - **Request timing:** whether they request delivery as soon as the order is created, or later.
  - **Re-requesting:** whether, and how quickly, they request delivery again after a rejection
    or a cancelled acceptance.
  - **Order contents:** which products are ordered, in what quantities, and at what prices.
  - **Staff and devices:** how many staff are signed in, and on which devices, which decides who
    gets restaurant notifications.
  - **Disputes:** rejecting confirmations or returns that should have been accepted.
  - **Price changes:** changing prices between seeing them and placing the order, which causes
    price mismatches.
  - **Placement:** where restaurants sit in the synthetic city: clustered in the centre, or spread
    out to the edges.
  - **Weekly patterns:** order volumes that differ by weekday, weekend, and season.
  - **Acting on notifications:** whether staff act on pushes at once, or only when they look at
    the portal.
  - **Concurrent staff:** two staff answering the same request at the same moment.
  - **Peak slowdown:** preparation slowing down when many orders arrive at once.
  - **Request resets:** cancelling a delivery request and making it again, to try for a quicker
    driver.
  - **Early ready marks:** marking an order ready before it is, so drivers end up waiting.
  - **Handover delays:** keeping the driver waiting after they arrive, even when the order is
    ready.
  - **Unattended periods:** times when the restaurant is open but nobody answers requests.
  - **Duplicate orders:** entering the same order twice.
  - **Data entry errors:** wrong customer details or products entered when creating an order.
  - **Reacting to refusals:** what they do when a cancel or an order is refused: wait, retry, or
    give up.
  - **Reacting to outages:** whether, and how soon, they retry when told the service is
    temporarily unavailable.
  - **Customer records:** whether they reuse an existing customer and address, or create new
    ones each time.
- **A customer profile controls:**
  - **Reachability:** whether the customer can be reached at delivery.
  - **Address accuracy:** how accurate the customer address is.
  - **Location:** where customers are relative to restaurants.
  - **Response time:** how long they take to answer when the driver contacts them.
  - **Payment problems:** being unable or unwilling to pay cash, which leads to a failed
    delivery or a return.
  - **Change requests:** asking to change the address or the order after it has been accepted.
  - **Availability times:** being at the address only during certain hours.
  - **Complaints:** reporting missing items or a wrong order after delivery.

The user decided these on 2026-11-03, in I01-E03-001.

On 2026-11-11 the user kept this scale as the goal but deferred it: drivers' apps sending every 30
seconds (FND-90) made a 200-driver day run out of memory, so for now the city benchmark runs 50
drivers and 500 orders, and I03-E09-008 restores hundreds of drivers before `I07`. On 2026-11-12,
in I03-E09-008, the user lowered the benchmark's day to 200 drivers and 2,000 orders, which runs
in about a minute inside Node's default heap; a 500-driver day runs too, but saving it and loading
it back needs more.

### FND-49 — Scenarios

- **Format:** a scenario is stored as JSON, in a documented format that people can read.
- **Authors:** anyone using the simulator writes, records, or generates scenarios; the simulator
  also ships a built-in library for each version; and scenarios are generated from criteria, from
  fuzzing, and from the race explorer.
- **Where they run:** interactively in the browser, and unattended, by running the same core
  headless, for batches and checks.
- **Pass and fail:** a scenario passes when all of these that it uses hold:
  - **Criteria hold:** the applicable FND-29 and FND-30 criteria hold throughout the run.
  - **Expected outcome:** the final states, events, and answers the scenario expects.
  - **Matches golden run:** the run matches an approved reference run.
  - **Statistical bounds:** across many seeds, the metrics stay within stated bounds.
  - **Settled at the end:** when the run ends, the modules agree and no work is left pending.
  - **Deadlines:** every order reaches a final state within a stated simulated time.
  - **Expected differences:** between two versions, the differences are exactly those the
    scenario expects.
- **First built-in library:** every lifecycle path without faults; the known races C1 to C4 and
  R1 to R4; the give-ups D1 to D4; and a city-scale busy day with default profiles.

The user decided these on 2026-11-03, in I01-E03-004.

On 2026-11-11 the user asked for the scenario shown first on starting the app to demonstrate the
whole process. They chose a second built-in scenario, listed first, keeping the one-order scenario
as the small case the tests pin, with nothing opening by itself. It shows many orders and drivers
across the areas; why each driver is or is not picked; indirect effects; a refused command and rule
changes; two drivers racing to accept; a request stuck until a rule change frees it; a customer
with two addresses and repeat orders, and an order ready before its request; and orders at every
stage partway through. As orders still under way when a run ends fail the valid final state
criterion, the user chose every stage partway, with every order then finishing, so the demo
passes. A customer who won't take an order is left out until the failed-delivery path can settle
it, and a function-version switch until a function has a second version (I03-E09-007).

### FND-50 — Targets and limits

- **Convergence bound:** tunable per version and per scenario, 1 minute by default.
- **Business performance targets:** such as time to assign and delivery time, are stated by each
  scenario or load profile. There are no global defaults.
- **Clock limits:** each scenario states the clock skew it tests.

The user decided these on 2026-11-03, in I01-E03-004, which resolves the former U11.

### FND-51 — Comparison

- **Inputs:** compared runs use the same scenario, adapted where event kinds differ: with the same
  seed for exact differences, and across many seeds for statistics.
- **How many:** any number of versions at once.
- **When:** live, with runs played side by side in step, and afterwards, on finished runs.
- **What a comparison shows:**
  - **Event traces:** the events of the runs, aligned, with the first point where they diverge.
  - **Decisions:** where the same decision came out differently, and why, traced to the rule
    that changed.
  - **Final states:** each order's end state, and the state of each module.
  - **Metrics and criteria:** business metrics, and which correctness criteria pass or fail in
    each version.
  - **Timing:** how long each step took in each version, such as time to assign or to converge.
  - **Messaging load:** messages, retries, and give-ups in each version.
  - **Actor experience:** what each driver and restaurant saw or received differently.
  - **Failure rates:** across many seeds, how often each version violates criteria or drifts.
  - **Option switch effects:** which outcomes depend on which option switches, in each version.
- **Changed event kinds:** renamed or split kinds are mapped to each other, and kinds that exist in
  only one version are marked added or removed.

The user decided these on 2026-11-03, in I01-E04-002; the list is complete for now.

### FND-52 — Conformance exchange

The conformance check works through an exchange of standard files:

1. The simulator exports scenarios in a standard test format.
2. The real service turns them into automated tests and runs them, on its own side.
3. The real service returns the results in a standard results format.
4. The simulator imports the results and analyses them against its own runs.

- **Exported test format:** the starting state (restaurants, drivers, customers, areas, values,
  and the clock); the steps, each actor command and timed event in order with its inputs; the
  expected answer, or refusal and its code, of each command; and the events each module should
  record, with the states expected at chosen points. It also records which simulator version,
  option switches, and seed produced the expectations; how the scenario's identifiers map to the
  real service's test data; how soon, and within what margin, each outcome should happen; and the
  criteria and invariants the tests should also check.
- **Returned results format:** the actual answers; the actual events and states at the same
  points; whether each expectation held, with the difference where it did not; and which state
  of the real service ran the tests, by date only
  ([FND-45](versions.md#fnd-45--version-folder-layout)). It
  also records when each event and answer happened; the steps the tests could not carry out, and
  why; unexpected errors and relevant log lines, free of private data; and the settings the tests
  ran with.
- **Versioned:** the exchange format has its own label, `X`, for example `X1.0.0`, in
  [versioning](../../governance/versioning.md).
- **Updates:** new versions are drafted from changes to the real service's documents or code, and
  confirmed by a person ([FND-44](versions.md#fnd-44--version-lifecycle)).
- **Who reviews:** the user states the rules and reviews the simulation, which resolves the
  former U2.

The user decided these on 2026-11-03, in I01-E04-003; the contents of both formats are complete
for now.

### FND-54 — Tunability

- **When:** values can change during a run and between runs. A change during a run is recorded
  as an event in it, so the run stays repeatable.
- **Presets and versions:** a tuning preset is a set of values applied to any version, without
  making a new one. Saving a tuned setup as a version makes a what-if variation
  ([FND-40](versions.md#fnd-40--kinds-of-version)).
- **Sharing:** tuned setups are saved in the browser and shared as files, like scenarios.
- **Ranges:** each value has a valid range, and version validation warns when a value is outside
  it. A value may go outside its range on purpose, to test extremes.

The user decided these on 2026-11-03, in I01-E03-003.

### FND-55 — Offline dispatch model

- **Questions it answers:** which drivers are eligible and notified, in what order, and who
  accepts; how fast the first notification and the acceptance come; how work spreads across
  drivers; and where and when requests have no eligible driver.
- **Mode:** the same engine as full runs, with module communication made instant and faults
  turned off, so it stays consistent with them.
- **Results:** timing distributions, notification counts and outstanding notifications over time,
  orders and earnings per driver, and unassigned requests over time and on the map.
- **Input:** generated from the synthetic city and the profiles, or taken from a scenario's
  starting state.

The user decided these on 2026-11-03, in I01-E03-005.

### FND-64 — Clock speed

- **Speed:** a run's speed is a multiple of real time, or `max`, which jumps from one piece of
  scheduled work to the next without waiting. `1x` is the wall-clock mode of
  [FND-48](#fnd-48--simulation-model).
- **Defaults:** an interactive run starts at `60x`, one simulated minute per real second. A
  headless run uses `max`.
- **No effect on results:** speed changes only how quickly a run is watched, never its work or
  the order of that work.
- **Same-time order:** work due at the same simulated time runs in the order it was scheduled,
  which [FND-48](#fnd-48--simulation-model)'s repeatability needs.

The user decided the speed and its default on 2026-11-04, in I02-E02-001.

### FND-65 — Event log entries

- **Each entry holds:** its sequence number, simulated time, source module, kind, data, what
  directly caused it, and its trace.
- **Trace:** the entry that began the chain of causes. The log works it out from the cause, so
  callers cannot give an inconsistent one.
- **Unchangeable:** entries can be added, and never changed or removed.
- **Data:** it must survive being stored as JSON unchanged, so the log refuses anything else.
  [FND-72](architecture-and-code.md#fnd-72--code-style) amends this: each kind of entry has typed
  data, and the JSON check is made where the log is persisted.
- **Not logged:** speed, pausing, and stepping, because they do not change a run
  ([FND-64](#fnd-64--clock-speed)). A job that finds nothing to do is not logged either.
- **Causes:** a command causes what it does. An outbox write is caused by its event, an inbox read
  by that outbox write, and an event made while reading an inbox by that read. An event made from
  a direct call's answer is caused by the event in the module that answered.

The user decided the entry's contents on 2026-11-04, in I02-E02-003.

### FND-66 — Seeded randomness

- **Named streams:** the run's seed gives each actor or purpose its own stream of random numbers.
  An extra draw in one stream leaves every other stream unchanged, so comparing versions on the
  same seed ([FND-51](#fnd-51--comparison)) shows only their real differences.
- **Algorithm:** xoshiro128**, started through SplitMix32 from the seed and the stream's name.
  Stored and golden runs depend on this exact sequence, so changing it changes every run.
- **Nothing from outside the run:** the core uses no `Math.random`, date, or `crypto`, and a test
  checks this.

The user decided the named streams on 2026-11-04, in I02-E02-002.

### FND-68 — Equal scores and open request order

- **Finding:** the real service sorts drivers by score with no tie-break, over a database read
  with no order, so drivers with equal scores are notified in an undefined order. This breaks
  the Defined tie-breaking criterion of
  [FND-30](correctness-and-success.md#fnd-30--technical-correctness), and is to be
  reported to the real service
  ([FND-31](correctness-and-success.md#fnd-31--decisions-the-results-support)).
- **In `V1.0.0`:** the simulator breaks a tie by the lowest driver ID, and goes through open
  requests oldest first, so a run stays repeatable.
- **Later:** other tie rules become option switches when `I06` adds them.

The user decided these on 2026-11-04, in I02-E03-002.

### FND-70 — Scenario format

- **Times:** a scenario writes simulated time as `h00:m05:s00:ms00`, with each unit labelled. `ms`
  is a count of milliseconds, so `ms05` is 5 milliseconds.
- **Contents:** the [scenario format](../../modules/scenario-format.md) page describes the fields.
  Each file names its version and seed, so a run can be repeated exactly.
- **Validation:** reading a file reports everything wrong with it, as a typed result. A field the
  format does not have is refused, because it is usually a typing mistake.

The user decided the time format on 2026-11-04, in I02-E04-001.

### FND-74 — Driver and restaurant vocabulary

The domain's words are `driver` and `restaurant`, replacing `courier` and `merchant`. The user
decided this on 2026-11-04, as these are still general names, so
[FND-23](stages-and-process.md#fnd-23--safe-to-publish) still holds. The rename covers the code, the
design documents, the Customers and merchants module's name, and the backlog, including finished
items and their file
names. The scenario format changes too, with no alias for the old field names.

I02-E07-001 applied it on 2026-11-04. In finished items it changed the words only, so their dates
stay as they were and they have no new history entry.
