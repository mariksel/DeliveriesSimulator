# Project Foundation

## Version and authority

- **Design version:** `D0.6.0`.
- **Scope:** The whole project, at its pre-implementation baseline.
- **Approval:** Approved by the user on 2026-11-03, while adopting the documentation
  template. Items under [Undecided](#undecided) are not approved.
- **Implementation status:** Approved, not implemented. The first initiative,
  I01,
  gathered the requirements. The
  [implementation roadmap](../roadmap/implementation-roadmap.md) tracks the stages, from `I02`.
- **Current behavior:** An empty application. The source holds only the workspace.

## Problem

The design documents need project facts, and there is no source to observe them from.
This record holds what the user stated, so the other pages can link to one source.

## Approved decisions

### FND-1 — Purpose and boundary

DeliveriesSimulator is a business and technical simulation of an existing deliveries
service and its orders. It simulates that service in a self-contained manner.

### FND-2 — Real service not named

These documents do not name the real service. They call it "the real service".

Amended 2026-11-03 by the user: the documents do not record its name or location either, which
resolves the former U1. See [FND-23](#fnd-23--safe-to-publish).

### FND-3 — Technology stack

The application uses TypeScript, Angular, and Vite.

### FND-4 — Data in browser storage

The project's data lives in browser storage.

### FND-5 — No integrations today

The Integrations section stays, with an empty map. There are no integrations today.

### FND-6 — Design sections

The design keeps the Data and Integrations sections and adds a UI section. The template's
optional Interfaces section is removed.

### FND-7 — Users

The users are business stakeholders, developers, testers or QA, and trainers or new staff.

### FND-8 — Capability list

The capabilities are Orders, Deliveries, Customers and restaurants, Business rules, Payments,
Notifications, Map and routing, Simulation engine, Scenarios, Fault injection, Event log,
Run history, Import and export, Business view, and Technical view. Each has a page in
[modules](../modules/README.md). Drivers and guided walkthroughs were offered as modules
and not chosen.

Amended 2026-11-03 by the user: the Versions, Verification, and Analysis modules are added, and
the Deliveries module owns drivers ([FND-56](#fnd-56--module-boundaries)).

### FND-9 — Sources of business rules

Business rules are taken from the real service's documentation, its source code, and the
people who know it. If these sources conflict, the user decides, and no source is chosen by
inference.

Confirmed 2026-11-03 by the user: every conflict, including one between the real service's
documents and its code, is presented to the user one at a time. No source wins by default.
Resolved conflicts are listed in [FND-39](#fnd-39--source-conflicts-resolved).

### FND-10 — Checking against the real service

People who know the real service review the simulation's behavior against it. No
comparison with exported data from the service is planned.

Amended 2026-11-03 by the user: a real service conformance check is required. See
[FND-34](#fnd-34--required-capabilities). A comparison with the real service is therefore
planned, in addition to people reviewing the behaviour. How it works is decided in
[FND-52](#fnd-52--conformance-exchange).

### FND-11 — Clean architecture with a framework-free core

The code follows clean architecture style and principles, with a framework-free core.
Dependencies point inward, and the core does not import Angular. It may use Immutable.js
([FND-73](#fnd-73--immutable-architecture)).
[Layers](../architecture/layers.md) describes the model.

### FND-12 — Custom Vite build

Vite runs the Angular build directly, rather than through the Angular CLI's default setup.

### FND-13 — Layers and source layout

There are four layers: Domain, Application, Infrastructure, and UI. There is no frameworks
layer and no interface adapters layer. Infrastructure implements interfaces defined by
Application. UI calls Application and does its own conversion. The source has one top-level
folder per layer, with module folders inside.
[FND-82](#fnd-82--application-core-layer) adds a fifth layer, Application.Core, between
Application and Domain, which now defines the interfaces Infrastructure implements.

### FND-14 — Vite plugin

The custom Vite build uses `@analogjs/vite-plugin-angular`, without the Analog framework.

### FND-15 — IndexedDB

The browser storage mechanism is IndexedDB.

### FND-16 — Angular version

The application uses Angular 22 with Vite 8.

### FND-17 — Test tools

Vitest tests the core, and tests components through `@analogjs/vitest-angular`. Playwright
runs end-to-end browser tests.

### FND-18 — Use of Domain by outer layers

UI and Infrastructure may use Domain types directly, as well as Application.

### FND-19 — Composition root and dependency inversion

Application depends on abstractions it defines, not on Infrastructure modules. A composition
root outside the four layers binds each abstraction to its Infrastructure implementation at
startup, through Angular's dependency injection. It is the only code that may see every
layer.

### FND-20 — Module placement in layers

A module gets a folder in a layer when it has code there. Its code map is updated then.

### FND-21 — Validation

Each layer checks its own concerns. UI checks form input for quick feedback, Application
checks use-case input, and Domain enforces the rules that must always hold.

### FND-22 — Error reporting

Expected failures, such as an invalid scenario or a full IndexedDB, are returned as typed
results. Exceptions are reserved for bugs. UI shows the results and has one catch-all for
the rest. Failures simulated by Fault injection are ordinary simulation events, not
application errors.

### FND-23 — Safe to publish

The project must be safe to expose publicly. It does not expose private information, and the
real service's name stays generic. What counts as private beyond its name and location is
undecided (U9); until then, these documents do not record the real service's rules, values, or
internal identifiers.

Amended 2026-11-03 by the user, deciding U9: only identity is private. That is the real
service's name and location, the people involved, and real data. Its rules, values, event names,
and identifiers may be recorded, described generically, so versions of the real service can ship
with the simulator.

### FND-24 — Goal is correctness

The simulator simulates the delivery algorithms and flows, not the service as a running system,
and everything runs in the frontend. Its goal is the business and technical correctness of the
delivery flow, especially the event-driven communication between the orders and deliveries
modules.

### FND-25 — Simulatable, visible, and tunable

The events and all internal technical and business decisions are simulatable, visible, and
tunable in the simulator.

### FND-26 — Versions compared side by side

The real service is under development and will change over time. The architecture takes this
into account and provides version capabilities, so that multiple versions can be tested and
compared side by side.

### FND-27 — Covered in stages

The simulator covers the whole delivery lifecycle, delivered in stages.

### FND-28 — Backlog first

Implementation does not start directly. The first initiative,
I01,
gathers requirements by asking the user and creates the implementation initiatives. This
foundation is its baseline: it asks only what is still open, and a conflict with a decision is
raised with the user.

### FND-29 — Business correctness

A run is correct for the business when all of the following hold. The targets and limits they
refer to are set as [FND-50](#fnd-50--targets-and-limits) describes.

- **Valid final state:** every order ends in a valid final state, such as delivered, cancelled,
  or returned, and none is stuck forever.
- **Rules are enforced:** eligibility, acceptance, allowed transitions, and who may do what hold
  at every step.
- **Right outcome:** each order gets the outcome the business expects: a suitable driver, the
  correct fees, and cash that reconciles.
- **Performance targets:** business measures stay within targets, such as time to assign a
  driver, delivery time, and how fairly work is spread.
- **Single custody:** at every moment exactly one party holds the order and its cash, and every
  handover is recorded.
- **Actors are informed:** every driver and restaurant gets the notifications and answers they
  should, when they should.
- **Auditable history:** every state change can be traced to an event and to an actor that was
  allowed to make it.
- **Undecided is flagged:** when a run reaches behaviour the real service has not decided, the
  simulator reports it instead of quietly producing a result.
- **Clear responsibility:** every failure or delay can be attributed to a responsible party: the
  restaurant, the driver, or the system.
- **Customer promise kept:** what the customer was told, such as the price or the arrival
  estimate, matches what happened.
- **Correct reversal:** cancellations, returns, and payment returns restore the right state,
  money, and custody.
- **Exact boundaries:** rules behave as specified exactly at their thresholds.
- **Defined precedence:** when two actions collide, such as a cancel arriving with an accept,
  which one wins is specified.
- **Final means final:** nothing changes after a final state, except allowed follow-ups such as
  a payment return.
- **Same case, same outcome:** the same situation gives the same result in any service area or
  at any time of day, unless a rule says otherwise.
- **Fair to restaurants:** no restaurant's orders are delayed again and again compared with others.
- **Assignment stability:** an accepted assignment changes only through an allowed reassignment,
  never silently.
- **Eligible notifications:** drivers are notified only of requests they could accept when
  notified.
- **Timely escalation:** an order that cannot progress is escalated to a person within a stated
  time.
- **Locked details stay locked:** order details that lock at acceptance or delivery never change
  afterwards.
- **Peak load behaviour:** every rule still holds at peak volume, such as the lunch rush.
- **Requests get answers:** every request, such as a payment confirmation, return, or
  reassignment, ends answered or cancelled, never pending forever.
- **Confirmed handovers:** every physical handover, whether pickup, delivery, or return, is
  confirmed by the party receiving it.
- **Decline without penalty:** a driver can decline a request without penalty, unless a rule
  says otherwise.
- **Consented transfers:** an order moves to another driver only when that driver accepts it.
- **Minimal waiting:** drivers do not wait at restaurants, and food does not wait for drivers,
  beyond a target.
- **Fee matches distance:** every order's delivery fee follows the distance rules of its service
  area.
- **Driver earnings correct:** each driver's earnings follow the fee rules for the orders they
  delivered.
- **Commission in effect:** a restaurant's commission follows the rule in effect on the order's
  date.
- **Contact details protected:** customer details are shown only to the driver holding the
  order, and only while needed.
- **Travel-time shocks:** every rule still holds when travel times rise sharply, such as in bad
  weather or heavy traffic.
- **Offline mid-delivery:** a driver who goes offline mid-delivery keeps their orders and the
  duties that come with them.
- **Price fixed at creation:** the customer's price is set when the order is created and never
  changes afterwards.
- **Correct rounding:** money amounts round as the currency rules say, and every total equals
  the sum of its parts.
- **Area boundaries:** orders and drivers at or beyond a service area's edge are handled as the
  rules say.
- **Valid delivery address:** an order is delivered only to a valid, stored address.
- **Separate adjustments:** any change to money after delivery is recorded as its own approved
  entry and never overwrites the original.
- **Missing items handled:** a delivery with missing or wrong items follows the stated process.
- **Service hours respected:** orders placed outside a restaurant's or area's working hours are
  handled as the rules say.
- **Driver breaks respected:** drivers are not offered requests during their required breaks.
- **Right driver at pickup:** the driver who picks up an order is the one assigned to it.
- **Late order actions:** a late order triggers the stated actions, such as notifying people or
  offering compensation.
- **Correct compensation:** any compensation to customers or restaurants follows the stated rules.
- **Restaurant pause handled:** a restaurant that pauses or closes still completes the orders it
  has accepted.
- **Same status everywhere:** every actor sees the same status for an order once updates have
  arrived.
- **Customer absent handled:** when the customer cannot be reached at delivery, the stated
  process is followed: waiting, contacting them, or recording a failure.
- **Paid only once:** a customer never pays twice for the same order.
- **Reasons recorded:** every cancellation, rejection, and failure records a valid reason.
- **Pause and resume dispatch:** dispatch can be paused for an area, such as in a storm, and
  resumed without losing orders.
- **Pickup at the restaurant:** a pickup is accepted only when the driver is at the restaurant.
- **Availability honoured:** the availability a driver chooses, such as busy or free for
  delivery, is respected when requests are offered.
- **Never-ready orders resolved:** an order the restaurant never marks ready is resolved as the
  rules say.
- **Grouping rules:** when one driver carries several orders together, the grouping follows the
  stated rules.
- **Fair feedback:** only a party involved in an order can leave feedback on it, and only once.
- **Process before speed:** when following the rules and delivering fast conflict, the rules win
  and the conflict is reported.
- **One open request:** an order has at most one open delivery request at any time.
- **One pending transfer:** an order has at most one pending reassignment request at any time.
- **Counted once:** reports count every order exactly once, in its final state.
- **Safe routes only:** drivers are never offered requests that need travel the rules define as
  unsafe.
- **No pickup before ready:** an order can be picked up only after the restaurant marks it ready.
- **No cancel after pickup:** a restaurant cannot cancel an order once it has been picked up.
- **Confirmations carry over:** an accepted cash confirmation stays valid when the order moves
  to another driver.
- **Transfer blocks delivery:** while a transfer to another driver is pending, the current
  driver cannot complete the delivery.
- **Enough detail to decide:** a notified driver sees enough of the order to decide whether to
  accept it.
- **Held orders limit:** a driver never holds more orders at once than the rules allow.
- **Request needs an order:** a delivery request can exist only for an order that already
  exists.
- **Ready only once:** an order's readiness is recorded at most once.
- **Failure only after pickup:** a failed delivery can be recorded only after pickup, and only
  while no cash confirmation or return request is pending.
- **Return blocks other actions:** while a return request is pending, delivery, failure,
  confirmation requests, and transfers are blocked.
- **Cancel only while unassigned:** a restaurant can cancel only while no request is open, no
  driver is assigned, and the order has not been picked up.
- **Failed driver keeps custody:** after a failed attempt the driver keeps the order, and may
  try again, request a return, request a confirmation, or transfer it.
- **New request before pickup:** a new delivery request can be made only before pickup, after a
  rejection, a cancelled request, or a driver cancelling their acceptance.
- **One target per transfer:** a transfer request names exactly one eligible driver.
- **Rejected return retryable:** after a return request is rejected, the driver may submit a
  new one.
- **Rejected confirmation closes:** a rejected cash confirmation is closed, and trying again is
  a new request.
- **Return only by custodian:** only the driver currently holding the order may request a
  return.
- **One payment return each:** each accepted cash confirmation has at most one accepted payment
  return.
- **Payment return by holder:** once a return is accepted, only the driver who held the order
  at that point may request a payment return.
- **Confirmation before transfer:** a pending cash confirmation must be resolved before a
  transfer can be requested.
- **Accepted return is final:** an accepted return makes the order final as returned, and
  custody goes back to the restaurant.
- **Rejection closes request:** when a driver rejects a request, it stays closed until the
  restaurant makes a new one. An ignore, by contrast, keeps the request open for other eligible
  drivers. The user decided this on 2026-11-03, where the real service's documents disagreed;
  its older dispatch text is superseded for the simulator.
- **Busy driver excluded:** a driver carrying many picked-up orders far from the restaurant is
  not offered new requests.
- **Other area excluded:** a driver from a different service area is never offered the request.
- **Offline driver excluded:** an offline driver is never offered requests.
- **Stale location excludes:** a driver whose last known location is too old is not offered
  requests.
- **Too far excluded:** a driver too far from the restaurant is not offered the request.
- **Transfer moves custody:** when the target driver accepts a transfer, both the assignment
  and custody move to them.
- **Rejected transfer stays:** a rejected or cancelled transfer leaves the order with the
  original driver, who may try again.
- **Eligible-only acceptance:** only a driver who is eligible at that moment can accept a
  request.
- **Valid status changes:** a driver goes online, goes offline, or changes availability only as
  the rules allow; availability changes only while online.
- **Offline clears availability:** going offline clears the driver's availability choice.
- **Online starts available:** a driver who comes online starts as available.
- **Area change blocked:** a driver's service area cannot change while they hold an active
  order.
- **Expected prices checked:** an order is created only if the prices the restaurant expects match
  the current prices.
- **Quantity limits:** every product line's quantity stays within the stated limits.
- **Customer price includes fee:** the customer's price is the products' customer prices plus
  the delivery fee.
- **Handover amount:** the cash a driver hands over to the restaurant equals the order's
  restaurant-price subtotal.
- **Preparation time limits:** an order's preparation time stays within the stated range.
- **Customer belongs to restaurant:** an order's customer and address belong to the restaurant who
  places it.
- **Records stay unchanged:** customer and address records do not change once an order has used
  them.
- **Answers only while pending:** a restaurant can accept or reject a request only while it is
  still pending.
- **Restaurant answer beats late cancel:** a restaurant's answer to a payment return still counts
  when the driver cancelled the request after the answer.
- **Staff assignment needs acceptance:** an assignment made by back-office staff takes effect
  only once the driver accepts it.
- **Restaurant sees who is coming:** the restaurant sees the assigned driver's name and phone
  number.
- **Order area is restaurant's:** an order belongs to the service area of the restaurant who placed
  it.
- **Locations hidden from restaurants:** restaurants see pickup and delivery estimates, but never a
  driver's location.
- **Staff transfer any time:** back-office staff can request a reassignment in any state that is
  not final.
- **Return request cancellable:** the driver who submitted a return request can cancel it while
  pending, without affecting any payment return.
- **Cash summary correct:** a driver's cash summary shows the cash collected, confirmed, and
  returned, and the figures match their orders.
- **Transferred orders read-only:** a driver can still see orders transferred away from them,
  read-only.
- **Unique driver contacts:** each driver's email and phone number is unique among drivers.
- **Drivers never deleted:** driver records are kept and never deleted.
- **Staff-only account changes:** only back-office staff create and edit driver accounts;
  drivers cannot edit their own.
- **Live map accurate:** back-office staff see each driver's latest location and status.
- **Supported cities only:** an address in a supported country must name one of its supported
  cities.
- **At least one product:** an order contains at least one product.
- **Customers per restaurant:** each restaurant keeps its own customers, not shared with other
  restaurants.
- **Staff act for own restaurant:** restaurant staff can act only on their own restaurant's orders.
- **Other restaurants' orders hidden:** an order that belongs to another restaurant is reported as
  not found.
- **Acceptance notifies staff:** when a driver accepts an order, the restaurant's signed-in staff
  are notified.
- **Several addresses:** a customer can have several addresses, and any of them can be used for
  an order.
- **Single currency:** each order's amounts are all in one currency, and currencies are never
  mixed.
- **Local times:** times are shown in the restaurant's local time zone.
- **Receipts match:** every delivered order's receipt matches the prices recorded for it.
- **Restaurant contact for driver:** the assigned driver can see the restaurant's phone number.
- **Unconfirmed cash visible:** staff can see the cash each driver holds that has not been
  confirmed yet.
- **Payment return amount:** a payment return gives back exactly the amount that was confirmed.
- **Payment return any time:** a payment return may be requested before or after the return
  itself is accepted.
- **Return not gated:** accepting a return does not wait for a payment return.
- **Re-request after driver cancel:** after a driver cancels their acceptance, the restaurant
  may make a new request or cancel.
- **Pickup needs acceptance:** an order can be picked up only after a driver has accepted it.
- **Confirmation only after pickup:** a cash confirmation can be requested only after pickup.
- **Driver cancels own confirmation:** only the driver who requested a cash confirmation can
  cancel it while pending, with a reason.

The user approved these on 2026-11-03 and asked for further suggestions, so more criteria may be
added.
I01-E01-001
tracks the question.

### FND-30 — Technical correctness

A run is technically correct when all of the following hold. The time bound and clock limits
they refer to are set as [FND-50](#fnd-50--targets-and-limits) describes.

- **Modules agree:** once events stop flowing, the orders and deliveries modules agree on every
  order's state.
- **Exactly-once effect:** no event is lost, and none takes effect twice, even when it is
  delivered more than once.
- **Survives failures:** the flow stays correct under retries, delays, reordering, crashes
  between steps, and expired events.
- **Invariants at every step:** the named invariants hold at every intermediate step, not only
  at the end of a run.
- **Bounded convergence:** the modules agree within a stated time after the last event, not only
  eventually.
- **Version compatibility:** events written by one version are read correctly by another while
  both run during a rollout.
- **Concurrency safety:** parallel service instances and jobs never both claim the same work.
- **Heals or reports:** after a failure the flow recovers by itself, or reports exactly what
  needs fixing by hand.
- **Causal order:** an effect never appears before its cause in either module.
- **Clock tolerance:** behaviour stays correct when device and server clocks differ within the
  stated limits.
- **Bounded resources:** outboxes, inboxes, and retry records never grow without limit, and
  cleanup removes only what is safe to remove.
- **Diagnosable failures:** every failure leaves enough of a trace to find its cause afterwards.
- **Atomic save:** each module saves its change and its outbox event together, or neither.
- **No stale overwrite:** versions and sequence numbers only move forward, and an older write
  never replaces a newer one.
- **Idempotency rules hold:** reusing a key with a different request is rejected, and expired
  keys behave as specified.
- **Stated degradation:** when a dependency such as routing or notifications is down, the flow
  carries on or fails in a stated way.
- **Replay stability:** replaying an old run on a new version gives the same result, unless a
  rule was changed on purpose.
- **Privacy by design:** each module holds only the personal data it needs, and only for as long
  as it needs it.
- **Poison event isolation:** one event that keeps failing never blocks the events behind it.
- **Graceful load:** under load spikes, polling and retries slow down in a controlled way
  instead of overloading the system.
- **Validated payloads:** every event payload is checked when read, and unknown fields or kinds
  are handled as the policy says.
- **Calendar boundaries:** daily jobs, dates, and durations behave correctly across midnight,
  daylight-saving changes, and month ends.
- **Defined tie-breaking:** ties, such as equal scores or identical timestamps, are broken in a
  defined way.
- **Restart safety:** restarting a service instance in the middle of a job loses no work and
  repeats none.
- **Per-order ordering:** events for the same order are applied in order, even when other
  orders' events are mixed in.
- **Retries as stated:** retries follow the stated schedule and stop at the stated limit.
- **Visible dead letters:** an event that is given up on is recorded and visible, never silently
  dropped.
- **Linked events:** every event on one side is linked to its matching event on the other side.
- **Read your own writes:** an actor who completes an action sees its effect the next time they
  read.
- **No notification spam:** nobody receives the same notification more often than a stated
  limit.
- **Unique identifiers:** every identifier is unique, and no two events share one.
- **Stored data upgrades:** data stored by an older version is still read correctly after an
  upgrade.
- **Rate limits hold:** per-actor rate limits hold, and requests over the limit get the stated
  answer.
- **Notification order:** a later notification, such as a cancellation, never arrives before the
  one it follows.
- **Bounded latency:** every step answers within a target response time.
- **Bounded queue age:** no queued event waits longer than a stated time before its first
  attempt.
- **Clean expiry:** expired records are removed on schedule, and nothing reads them after
  expiry.
- **Lease takeover:** when a worker's lease on a job expires, exactly one other worker takes it
  over.
- **Consistent reads:** a read never shows a mix of the states before and after one change.
- **Safe version retirement:** an old version can be retired without losing work still in
  progress.
- **Unchangeable history:** history cannot be changed once written, apart from the stated
  exceptions that fill in a value later.
- **Client compatibility:** client apps built for an older interface keep working within the
  same interface version.
- **Clean logs:** logs and events never contain credentials, and contain no more personal data
  than they need.
- **Revoked access stops:** a signed-out or revoked session cannot perform any action.
- **Throughput target:** the system handles a stated number of orders per minute.
- **Truthful health checks:** an instance reports itself unhealthy exactly when it cannot do its
  work.
- **Safe settings changes:** a setting changed at runtime takes effect consistently across all
  instances.
- **Validated settings:** invalid settings are rejected at startup instead of failing later.
- **Timeouts everywhere:** every call to another component has a timeout and a stated outcome
  when it expires.
- **Consistent restore:** after data is restored from a backup, the two modules return to a
  consistent state.
- **Size limits:** events, requests, and notifications stay within their stated size limits.
- **Stable feature switches:** a feature switch gives the same answer for an order throughout
  its life.
- **Stable pagination:** paged reads never skip or repeat items when data changes between pages.
- **Distance precision:** locations and distances keep enough precision that boundary decisions
  come out the same everywhere.
- **Idempotent cleanup:** running a cleanup twice does no harm.
- **Bounded fan-out:** one event never triggers an unlimited amount of work.
- **No hidden coupling:** the modules communicate only through their published interfaces and
  events.
- **Lag is visible:** the delay between one module publishing an event and the other reading it
  is measured and shown.
- **Backlog drains safely:** after an outage, the backlog is processed in order without
  overloading the system.
- **Copies match source:** each module's read-only copy of the other's data matches its source
  once events settle.
- **Single writer:** every record has exactly one module that writes it.
- **Deterministic scoring:** the same inputs always produce the same dispatch score and order.
- **Partial failure:** when one module is down, the other keeps doing whatever it safely can.
- **No locks across calls:** no lock is held while one module waits for a call to the other.
- **Acknowledged handoffs:** every handoff from one module to the other is acknowledged, and an
  unacknowledged one is retried.
- **Duplicate window:** duplicates are detected for at least as long as they can still arrive.
- **Read lag is safe:** an inbox that reads behind the latest events never misses an event
  published inside that window.
- **First valid accept wins:** exactly one acceptance wins for each request, even when several
  arrive at once.
- **Version stamping:** every event records the version that produced it.
- **Pending recorded first:** a command that needs the other module is recorded as pending
  before that module is called.
- **Refusal is final:** a permanent refusal is recorded with its reason and is never retried.
- **Notification claimed first:** a notification is claimed before it is sent, so a repeat after
  a crash sends nothing new.
- **Outstanding notification cap:** at most a stated number of drivers hold an unanswered
  notification for the same request.
- **Ignore releases a slot:** when a driver ignores a request, only their notification slot is
  released and the request stays open.
- **Retry after expiry:** an event no longer in the outbox when its retry is due is given up on,
  and the give-up is recorded.
- **One location per window:** location history keeps at most one point per driver for each
  time window.
- **Retry records cleared:** once a retry succeeds, its retry record is removed.
- **Best-ranked first:** the first notification goes to the best-ranked eligible driver, and
  later ones never skip ahead of a better-ranked driver.
- **Over-limit delay skipped:** a driver whose notification delay is over the limit is never
  notified.
- **Every device reached:** a notification goes to all of the person's registered devices.
- **Invalid device removed:** a device the notification provider rejects as invalid is removed
  from the person's devices.
- **Staggered daily jobs:** daily cleanup jobs never start at the same moment.
- **Callbacks retried:** result callbacks to the module that sent a notification are retried
  until it acknowledges them.
- **Failed pushes reported:** a push that still fails after all its retries is reported as a
  failure.
- **No-recipient reported:** a notification for someone with no registered devices is reported.
- **Duplicate pushes droppable:** every push carries an identifier, so a device can drop a copy
  it already received.
- **Ignore is repeatable:** ignoring the same request twice succeeds and changes nothing the
  second time.
- **No-op not recorded:** asking for the status a driver already has records nothing.
- **Conflict-safe status:** simultaneous status changes never overwrite each other; the loser
  retries, then reports a conflict.
- **Location time limits:** location points that are too old, or too far in the future, are
  rejected.
- **Late points fill gaps:** a late location point can fill an empty history window but never
  replaces a stored point.
- **Login lockout:** repeated failed logins lock the account for a stated time.
- **Reset ends sessions:** a password reset ends all of the account's sessions.
- **Creation replays:** repeating an order creation with the same key returns the original order
  instead of creating a second one.
- **Version conflicts reported:** a change to an order that was modified after it was read is
  rejected as a version conflict.
- **No partial reads:** a read that finds related data missing fails explicitly instead of
  returning partial data.
- **Fallback only when allowed:** when routing is unavailable, the stored-distance fallback is
  used only for the stated kinds of failure.
- **Cancel asks deliveries:** a restaurant's cancel of a delivery request first asks deliveries,
  and is refused if a driver already accepted or rejected it.
- **Refused stays refused:** retrying a refused restaurant cancel with the same key gets the same
  refusal.
- **Irrelevant orders skipped:** deliveries reads orders events only for orders that have a
  delivery request.
- **Refusals published:** a command refused after the driver stopped waiting publishes the
  refusal, so the driver still learns of it.
- **Pending calls repeat safely:** the background job repeats a pending call with the same key,
  so the other module returns the same result.
- **Lost save recovers:** if a call succeeds but saving its result fails, the retry gets the
  replayed result and saves it.
- **Early pickup retried:** a pickup that arrives before orders has processed the acceptance is
  refused, and the driver retries it.
- **Late cancel refused:** a driver who cancels their acceptance after the pickup succeeded is
  refused by deliveries itself.
- **Failures readable by staff:** back-office staff can read failed and undeliverable
  notifications.
- **Same rules on every channel:** a location sent over the live connection follows the same
  rules as one sent in a batch.
- **Refresh reuse revokes:** using a refresh token a second time revokes the whole session.
- **Token lifetimes:** access tokens expire after their stated lifetime, and the refresh window
  slides as stated.
- **Authenticated connections:** live connections accept only valid driver sessions.
- **History newest first:** an order's event history is listed newest first, with a defined
  tie-breaker.
- **Identity from session:** the acting driver or restaurant always comes from their session,
  never from the request itself.
- **Stable error codes:** every known failure returns a stable, published error code.
- **Versioned interfaces:** every route sits under an explicit interface version.
- **One device per session:** each session is linked to at most one device.
- **Mixed-version gate:** during a rollout, an older instance does not apply rules it does not
  know about.
- **Retry-after on limits:** a request over a rate limit is told how long to wait before trying
  again.
- **Reach any instance:** a message for a driver reaches them whichever service instance they
  are connected to.
- **Trace identifiers:** one action carries the same trace identifier through both modules.
- **No internal errors shown:** detailed internal errors are never shown to users in production.
- **Fallback travel time:** when routing falls back to stored distances, travel time is derived
  at the stated speed and rounding.
- **Published interface specs:** each interface version publishes its own specification.
- **Device type fixed:** a device stays registered with the type it first had, and a
  registration with another type is rejected.
- **Background delivery:** a push reaches the device even when the app is closed.
- **Unknown kinds ignored:** an app that receives a notification kind it does not know ignores
  it and logs it.
- **Valid starting data:** the example data a new environment starts with satisfies every rule.
- **Actor types separated:** a session for one kind of user, such as a driver, is rejected on
  endpoints meant for another kind.
- **No account enumeration:** a failed login never reveals whether the account exists.
- **Injection safe:** input can never change the queries or commands the system runs.
- **Browser-safe tokens:** browser apps keep refresh tokens where page scripts cannot read them.
- **Generations separate:** each new delivery request starts a new generation, and every
  notification belongs to exactly one generation.
- **Outbox for every event:** every order event and every delivery event that takes effect writes
  exactly one outbox event in its own module. A replayed command writes none, and a delivery
  request and the restaurant's cancel of it write theirs once deliveries acknowledges them. The
  user widened this from delivery events on 2026-11-03, in I01-E06-002, after it was checked
  against `V1.0.0`.
- **Payload per kind:** each event kind has its own versioned payload.
- **Inbox start point:** an inbox starts reading from its last processed event's time, minus the
  read lag.
- **Handoff copies earlier events:** when an order is handed over, its existing ready and cancel
  events are copied in the same save as the delivery request.
- **Fresh state each pass:** each dispatch pass re-checks eligibility and ranking from the
  current shared state.
- **One notification per pass:** each pass notifies at most one driver for each request.
- **Delayed later notifications:** a later notification waits until the previous one's time plus
  that driver's delay has passed.
- **Failed dispatch isolated:** if dispatching one request fails, the other requests still go
  ahead.

The user approved these on 2026-11-03 and asked for further suggestions, so more criteria may be
added.
I01-E01-001
tracks the question.

### FND-31 — Decisions the results support

The simulator's results support these decisions:

- **Approve design changes:** check a proposed change to the real service, or an undecided
  design question, before it is built.
- **Find real-service bugs:** find flaws in the real service's logic and report them.
- **Tune values:** choose dispatch and timing values by comparing runs and versions.
- **Explain and train:** show stakeholders and new staff how the flow works and why.
- **Release readiness:** decide whether a new version of the real service is ready to ship, by
  checking it for regressions against earlier versions.
- **Incident analysis:** reproduce a reported problem from its description to understand its
  cause, without real data.
- **Capacity planning:** estimate how many drivers an area needs for a given order volume.
- **Prioritise fixes:** decide which risks and gaps in the real service to fix first.
- **Simplify the design:** find rules or mechanisms that never change an outcome.
- **Set alert thresholds:** choose the monitoring limits that separate normal retries from a
  real problem.
- **Explain trade-offs:** show business stakeholders what a technical choice costs, in business
  terms.
- **Choose real-service tests:** decide which scenarios to turn into tests for the real service.
- **Document the service:** produce accurate diagrams and rule descriptions of the real service
  from the simulator.
- **Plan rollouts:** decide the order of a rollout, and how long mixed versions may run
  together.
- **Estimate running costs:** estimate notification, routing, and infrastructure costs for a
  given order volume.
- **Agree service levels:** set delivery-time commitments with restaurants, based on simulated
  results.
- **Compare policies:** choose between business policies, such as whether a driver may hold
  several orders at once, by comparing their outcomes.
- **Set retention periods:** choose how long outbox, inbox, idempotency, and history records are
  kept.
- **Choose job schedules:** choose polling intervals and how often each background job runs.
- **Plan area expansion:** decide whether a new service area's distances and driver numbers
  work before launching it.
- **Evaluate incentives:** test driver incentive or fee rules before introducing them.
- **Compare providers:** choose between providers, such as routing or notification services, by
  simulating their speed and failures.
- **Tune notifications:** decide what to notify people about, and when, so notifications stay
  useful instead of noisy.
- **Size infrastructure:** decide how many service instances and workers the expected load
  needs.
- **Plan driver shifts:** decide when, and how many, drivers should be online.
- **Check restaurant settings:** check that a restaurant's preparation times and location work
  before they go live.
- **Settle disputes:** settle disputes between restaurants and drivers by reconstructing what
  happened.
- **Back-office overrides:** decide when and how staff step in to reassign or close orders by
  hand.
- **Fraud rules:** test rules that flag suspicious driver or restaurant behaviour before turning
  them on.
- **Customer messaging:** decide what customers are told about their order, and when.
- **Choose what to monitor:** decide which measures production monitoring tracks.
- **Reporting figures:** produce the figures needed for financial or regulatory reports.
- **Gradual feature rollout:** decide whether to turn a feature on for some areas or restaurants
  first.
- **Choose dispatch strategy:** choose between ways of offering requests to drivers, such as
  one at a time or several at once.
- **Order priority rules:** decide whether some orders, such as large or late ones, are
  dispatched first.
- **Set driver limits:** decide the most orders, or the most cash, a driver may hold at once.
- **Plan maintenance windows:** decide when maintenance can happen with the least impact.
- **Support staffing:** decide how many support staff are needed to handle escalations.
- **Test delivery fees:** test changes to customer delivery fees before introducing them.
- **Assess new order types:** assess new kinds of order, such as scheduled or grouped orders,
  before supporting them.
- **Write runbooks:** work out the steps operators follow when something goes wrong.
- **Retire unused flows:** decide whether a rarely used flow can be removed.
- **Test recovery plans:** decide whether a disaster-recovery plan meets its time targets.
- **Choose error messages:** decide what each failure tells the person who meets it.
- **Driver training topics:** decide what to train drivers on, based on where failures happen.
- **Plan holiday operations:** decide how to run exceptional days, such as holidays or big
  events.
- **Driver vehicle mix:** decide the mix of bikes, scooters, and cars an area needs.
- **Split areas into zones:** decide whether to divide a service area into smaller zones for
  dispatch.
- **Choose business KPIs:** decide which business measures the company tracks.
- **Driver app priorities:** decide which driver app features matter most, based on where the
  flow fails.
- **Preparation time guidance:** advise restaurants on realistic preparation times.
- **Rating rules:** test driver and restaurant rating rules before introducing them.
- **Driver payout schedule:** decide how often drivers are paid out, based on the cash they
  hold.
- **Plan data migrations:** decide how to move stored data between versions safely.
- **App support window:** decide how long older driver and restaurant apps stay supported.
- **Explain incidents:** produce clear explanations of what happened for the restaurants and
  drivers affected.
- **Choose copy scope:** decide which of the other module's data each module keeps a copy of.
- **Call or event:** decide whether each interaction between the modules is a direct call or an
  event.
- **Rule ownership:** decide which module owns each rule.
- **Consistency trade-offs:** decide where it is acceptable for the modules to agree only
  eventually, and where it is not.
- **Documentation gaps:** decide which undocumented rules to write down first.
- **Simulator version set:** decide which versions of the real service the simulator keeps.
- **Per-area rules:** decide whether different service areas need different rules or values.
- **Prioritise open decisions:** decide which of the real service's undecided questions to
  settle first.
- **Cash handling rules:** test changes to the cash confirmation and payment return rules before
  making them.
- **Notification channels:** choose which channel each notification uses, such as a push message
  or a live connection.
- **Score inputs:** decide which factors the dispatch score takes into account.
- **Restaurant cancel window:** decide how late in the flow a restaurant may still cancel.
- **Busy rule thresholds:** decide when a driver counts as too busy to be offered new requests.
- **Reassignment policy:** decide who may start a transfer, and what limits apply to it.
- **Feedback use:** decide how feedback from restaurants about drivers is used.
- **Push retry policy:** decide how many times, and how often, failed pushes are retried.
- **Device limits:** decide how many devices a driver or restaurant may register.
- **Consequences of ignoring:** decide whether ignoring requests has any consequences.
- **Driver shortage response:** decide what happens when an area has too few drivers, such as
  widening the search radius.
- **Location freshness limit:** decide how old a driver's location can be before they are
  excluded.
- **Location sampling rate:** decide how often drivers send their location, weighing accuracy
  against battery use and cost.
- **Availability effect:** decide how much each availability choice changes a driver's ranking.
- **Price change policy:** decide what happens when a price changes between the restaurant seeing
  it and placing the order.
- **Commission models:** choose between commission models for restaurants.
- **Routing fallback speed:** decide what travel speed to assume when routing is unavailable.
- **Order size limits:** decide the most items, and the largest quantities, an order may hold.
- **Idempotency key lifetime:** decide how long a repeated request is still recognised as a
  repeat.
- **ETA refresh interval:** decide how often estimates are recomputed, weighing accuracy against
  routing cost.
- **Cash summary period:** decide what period a driver's cash summary covers.
- **Session lifetimes:** decide how long sessions and refresh windows last.
- **Feedback visibility:** decide who can see feedback left about drivers and restaurants.
- **Live map refresh:** decide how often staff see driver positions update.
- **Error code catalogue:** decide which failures get a published error code.
- **Account unlock policy:** decide whether locked accounts unlock automatically, or only when
  staff unlock them.
- **Alert routing:** decide who is alerted about which kind of failure.
- **Partition schedule:** decide how location history is split into periods, and when old
  periods are dropped.
- **Supported cities:** decide which cities are supported.
- **Rate limit levels:** decide the request limits for each kind of user and endpoint.
- **Tracing coverage:** decide which steps of the flow are traced.
- **Environment set:** decide which environments exist, and what each one is for.
- **Back-office roles:** decide which back-office roles exist, and what each may do.
- **Restaurant notification recipients:** decide which of a restaurant's staff are notified about
  which events.
- **Starting data:** decide which example restaurants, drivers, and areas a new environment
  starts with.
- **Unknown notification kinds:** decide what apps do with notification kinds they do not
  recognise.
- **Dead-letter handling:** decide what happens to events that are given up on, and who reviews
  them.
- **Read lag size:** decide how far behind the latest events each inbox reads.

The user approved these on 2026-11-03 and asked for further suggestions, so more decisions may
be added.
I01-E01-001
tracks the question.

### FND-32 — Success

The simulator is a success when:

- **Finds real flaws:** it finds flaws in the real service's logic before they reach production.
- **Trusted for decisions:** the team uses its results to approve or reject changes to the real
  service.
- **Keeps up with changes:** each new version of the real service is simulated within a stated
  time of being designed or built. The time is undecided (U12).
- **Explains the flow:** new team members and stakeholders understand the delivery flow from it.
- **Catches regressions:** a change that breaks an approved rule is caught before release.
- **Faster design decisions:** open design questions are settled faster with simulated evidence.
- **Fewer incidents:** problems in the delivery flow reach production less often once the
  simulator is in use.
- **Matches reviewed behaviour:** people who know the real service confirm that the simulation
  behaves as it does.
- **Used routinely:** the team runs it as a normal part of design and release work.
- **Cheap to update:** adding a new version of the real service takes little effort.
- **Every rule covered:** every approved rule has at least one scenario that checks it.
- **Answers in minutes:** a typical question can be answered with the simulator within minutes.
- **Shared vocabulary:** business and technical people use the simulator's terms when they talk
  about the flow.
- **Found before built:** design flaws are found before implementation starts.
- **Reproducible reports:** every reported issue comes with a scenario anyone can rerun.
- **Version differences clear:** the difference between two versions can be explained from a
  comparison run.
- **Evidence at release:** each release of the real service ships with simulated evidence
  attached.
- **Safe to show publicly:** it can be demonstrated publicly without exposing anything private.
- **Few false alarms:** reported violations are real problems, and rarely errors in the
  simulator itself.
- **Faster onboarding:** new team members become productive sooner.
- **Done means scenarios pass:** a change to the real service counts as done only when its
  scenarios pass in the simulator.
- **Gaps listed:** every undecided behaviour in the real service is listed and tracked.
- **Open to contributors:** people outside the core team can add scenarios.
- **Traceable rules:** every rule in the simulator names the decision it comes from.
- **Comparable over time:** results of the same scenario stay comparable across months.
- **Fast enough to explore:** a run finishes quickly enough to try out ideas interactively.
- **Trusted by stakeholders:** business stakeholders accept its results as evidence.
- **Conflicts surfaced:** every conflict between the real service's documents and its code is
  found and raised.
- **Decision history kept:** past decisions, and the simulated evidence behind them, stay
  available.
- **Same in every browser:** results come out the same in every supported browser.
- **Useful to testers:** testers use it to design test cases for the real service.
- **Evidence for reviewers:** its results can be given to reviewers or auditors as evidence.
- **Runs on a laptop:** it runs on an ordinary laptop, with no hosting cost.
- **Clearer documents:** the real service's documents become clearer because of it.
- **Explains causes:** every result shows why it happened, not only what happened.
- **Every live version covered:** every version of the real service still running in production
  has a matching version in the simulator.
- **Clear at a glance:** stakeholders can read the outcome of a run at a glance.
- **Growing scenario library:** the scenario library grows with every incident and every change.
- **Feeds the backlog:** its findings become items in the real service's backlog.
- **Simulated before built:** every new feature of the real service is simulated before it is
  built.
- **Trusted defaults:** its default values match the real service's current values.
- **Readable versions:** a version's rules can be read without reading any code.
- **Questions become scenarios:** any question about the flow can be turned into a scenario that
  answers it.
- **All commands covered:** every driver and restaurant command in the real service is simulated.
- **All event kinds covered:** every kind of event in both modules is simulated.
- **All races reproducible:** every known race between the two modules can be reproduced.
- **All failures injectable:** every listed failure mode can be injected into a run.
- **Automatic difference report:** the simulator itself points out what differs between two
  versions' runs.
- **Fix path for findings:** each flaw found is linked to the decision needed to fix it.
- **Version per approved change:** every approved change to the real service gets its own
  version in the simulator.
- **All states reachable:** every order state can be reached in at least one run.
- **All transitions exercised:** every allowed transition is exercised by at least one scenario.
- **All error outcomes covered:** every published error outcome appears in at least one
  scenario.
- **All actors simulated:** every actor is simulated: drivers, restaurants, staff, and the
  system's own jobs.
- **All jobs simulated:** every background job in the real service is simulated.
- **All decisions tunable:** every business and technical decision in the domain inventory is
  simulated and can be tuned.
- **Approved designs runnable:** every design that is approved but not built yet can be run as
  its own version.
- **All notifications covered:** every kind of notification the real service sends is simulated.
- **All payload versions covered:** every payload version of every event kind is simulated.
- **All eligibility outcomes covered:** every reason a driver can be ineligible appears in at
  least one scenario.
- **All idempotency outcomes covered:** replay, key conflict, and expired key each appear in at
  least one scenario.
- **All give-up paths covered:** every way an event or command can be given up on appears in at
  least one scenario.
- **All boundaries tested:** every threshold is tested at its value, just below it, and just
  above it.
- **All settings reachable:** every tunable setting can be changed in the simulator.
- **Adjacent versions run together:** every pair of consecutive versions can run side by side,
  as during a rollout.
- **All copies covered:** every kind of data one module copies from the other is simulated.
- **All retry schedules covered:** every retry schedule runs to its limit in at least one
  scenario.
- **All job failures covered:** every background job can be made to fail, and its recovery is
  checked.
- **All rate limits reached:** every rate limit is reached in at least one scenario.
- **All session outcomes covered:** sign-in, refresh, sign-out, expiry, and revocation each
  appear in at least one scenario.
- **All status changes covered:** every driver status change, including going online, going
  offline, and each availability, appears in at least one scenario.
- **All push outcomes covered:** delivered, invalid device, failed, and no recipients each
  appear in at least one scenario.
- **All race orderings tried:** for every known race, each possible order of the two events has
  been tried.
- **All cleanups verified:** every cleanup removes exactly the records it should, and nothing
  else.
- **All crash points covered:** a crash can be injected between every pair of steps that save
  data or call the other module.
- **All duplicates covered:** every event and command can be delivered twice within a scenario.
- **All delays covered:** every message can be delayed past its read lag within a scenario.
- **All permissions tried:** each actor tries every command, both those they are allowed and
  those they are not.
- **All money paths covered:** every way cash moves appears in at least one scenario.
- **All lifecycle paths covered:** every path from creation to a final state appears in at least
  one scenario.
- **All undecided items exercised:** every undecided item in the real service has a scenario
  showing its options.
- **All load levels covered:** scenarios run at every volume, from quiet periods to peak.
- **All driver counts covered:** scenarios run with anything from no drivers to many.
- **All area layouts covered:** scenarios include several service areas, and restaurants near an
  area's edge.
- **All clock skews covered:** scenarios include device clocks running both ahead and behind,
  within the limits.
- **Combined failures covered:** scenarios include two failures happening at the same time.
- **Long-running scenarios:** some runs cover several simulated days, to catch the effects of
  retention and cleanup.
- **All empty cases covered:** scenarios include no drivers, no orders, and no registered
  devices.
- **Calendar edges covered:** scenarios run across midnight, daylight-saving changes, and month
  ends.
- **All restaurant behaviours covered:** scenarios include restaurants who answer quickly, slowly,
  or never.
- **All driver behaviours covered:** scenarios include drivers who accept, reject, ignore, go
  offline, or never respond.
- **All connection conditions covered:** scenarios include slow, dropped, and reordered
  connections between the apps and the service.
- **All device counts covered:** scenarios include people with no devices, one device, or many.
- **All order shapes covered:** scenarios include orders with one line or many, and with very
  high or zero prices.
- **All fee bands covered:** scenarios include orders in every delivery fee band.
- **All commission models covered:** scenarios include every commission model.
- **Many seeds per scenario:** each scenario is run with many different random seeds.
- **All transfer outcomes covered:** accepted, rejected, and cancelled transfers each appear in
  at least one scenario.
- **All return outcomes covered:** accepted, rejected, and cancelled return requests each appear
  in at least one scenario.
- **All confirmation outcomes covered:** accepted, rejected, and cancelled cash confirmations
  each appear in at least one scenario.
- **All payment return outcomes covered:** requested, accepted, rejected, and cancelled payment
  returns each appear in at least one scenario.
- **All restaurant cancel outcomes covered:** a restaurant's cancel being accepted, refused, left
  pending, and retried each appear in at least one scenario.
- **All handoff outcomes covered:** a handoff being received, left pending, retried, and failing
  each appear in at least one scenario.
- **All pending command outcomes covered:** a pending command finishing as done, refused, or
  given up each appear in at least one scenario.
- **All pickup outcomes covered:** a pickup succeeding, being too early because the order is not
  ready, arriving before the acceptance is processed, and being made by the wrong driver each
  appear in at least one scenario.
- **All delivery outcomes covered:** delivered, failed, blocked by a pending transfer, and
  blocked by a pending return each appear in at least one scenario.
- **All acceptance outcomes covered:** winning the request, losing a race, being ineligible, and
  finding the request already closed each appear in at least one scenario.
- **All cancel acceptance outcomes covered:** a driver's cancel of their acceptance being
  allowed, refused after pickup, and refused during a pending transfer each appear in at least
  one scenario.
- **All ignore outcomes covered:** a request being ignored, and an ignore with no notification
  to ignore, each appear in at least one scenario.
- **All status command outcomes covered:** a status change that applies, one that changes
  nothing, one rejected because the driver is offline, and one that hits a conflict each appear
  in at least one scenario.
- **All device registration outcomes covered:** a device registering, a session already linked
  to another device, and a type mismatch each appear in at least one scenario.
- **All login outcomes covered:** a successful login, wrong credentials, and a locked account
  each appear in at least one scenario.
- **All reject outcomes covered:** rejecting an open request, being ineligible to reject, and
  finding the request already closed each appear in at least one scenario.
- **All transfer request outcomes covered:** a transfer request being sent, the target being
  ineligible, the target not existing, and another transfer already pending each appear in at
  least one scenario.
- **All failure report outcomes covered:** a failure being recorded, being blocked by a pending
  confirmation or return, and being refused before pickup each appear in at least one scenario.
- **All driver request outcomes covered:** confirmation, return, and payment return requests
  each appear accepted, already pending, and refused for the wrong state or the wrong driver.
- **All order creation outcomes covered:** an order being created, a price mismatch, an unknown
  customer, address, or product, and a replayed creation each appear in at least one scenario.
- **All restaurant answer outcomes covered:** accepting, rejecting, answering something no longer
  pending, and replaying an answer each appear in at least one scenario.
- **All delivery request outcomes covered:** a delivery request being made, being refused while
  another is open, and being made again after a rejection each appear in at least one scenario.
- **All ready outcomes covered:** marking an order ready before acceptance, after acceptance,
  and a second time each appear in at least one scenario.
- **All order cancel outcomes covered:** a restaurant cancelling while the order is unassigned,
  being refused while a request is open, and being refused after pickup each appear in at least
  one scenario.
- **All read outcomes covered:** an order being found, not found, and hidden because it belongs
  to another restaurant each appear in at least one scenario.
- **All history read outcomes covered:** an empty history, an ordered history, and an unknown
  order each appear in at least one scenario.
- **All staff status outcomes covered:** staff changing a driver's status appears with every
  possible outcome.
- **All account management outcomes covered:** creating and editing drivers, changing an email,
  resetting a password, and each kind of conflict appear in at least one scenario.
- **All push registration outcomes covered:** registering for push, and registering from a
  device that is not registered, each appear in at least one scenario.
- **All unlock outcomes covered:** unlocking a locked account, and unlocking one that is not
  locked, each appear in at least one scenario.
- **All dispatch pass outcomes covered:** a pass with no candidates, with the cap reached, that
  notifies someone, whose delay is not due, and that loses the claim each appear in at least one
  scenario.
- **All inbox outcomes covered:** an event being processed, skipped as a duplicate, skipped as
  irrelevant, failing and retried, and given up on each appear in at least one scenario.
- **Overlapping job runs covered:** a job run that starts while the previous run is still going
  appears in at least one scenario.
- **All partition job outcomes covered:** creating a new history period, dropping an old one,
  and having nothing to do each appear in at least one scenario.
- **All send attempt outcomes covered:** a send succeeding, its lease expiring and being resent,
  being retried, and failing for good each appear in at least one scenario.
- **All callback outcomes covered:** a callback being acknowledged, failing and being retried,
  and having no handler each appear in at least one scenario.
- **All restaurant push outcomes covered:** a restaurant push being sent, a restaurant with no
  staff devices, and an event already pushed each appear in at least one scenario.
- **Job schedule drift covered:** a job running late, or skipping a run, appears in at least one
  scenario.
- **All copy outcomes covered:** a copy being created at handoff, updated from the outbox, and
  used to recreate a missing own event each appear in at least one scenario.
- **All estimate outcomes covered:** an arrival estimate being computed, reused within its
  interval, and unavailable each appear in at least one scenario.
- **All driver read outcomes covered:** open requests shown only to eligible drivers, active
  orders, history including transferred orders, and the cash summary each appear in at least one
  scenario.
- **All feedback outcomes covered:** feedback being left, a second attempt being refused, and an
  uninvolved party being refused each appear in at least one scenario.
- **All staff reassignment outcomes covered:** a staff reassignment that the target driver
  accepts, and one they reject, each appear in at least one scenario.

The user approved these on 2026-11-03 and asked for further suggestions, so more may be added.
I01-E01-001
tracks the question.

### FND-33 — Out of scope

These are out of scope for the simulator:

- **Production monitoring:** it is not a monitoring or alerting tool for the running real
  service.
- **Non-cash payments:** payment methods other than cash are not simulated until the real
  service has them.
- **App screens:** it does not reproduce the driver, restaurant, or back-office app screens, only
  their actions.
- **Customer ordering:** customers placing orders themselves is not simulated; in the real
  service, restaurants create the orders.
- **Live third-party services:** no calls are made to real routing or notification providers.
- **Accounting and invoicing:** bookkeeping, invoices, and taxes are not simulated.
- **Driver recruitment:** recruiting drivers, onboarding them, and their contracts are not
  simulated.
- **Support tooling:** support tickets and customer chat are not simulated.
- **Simulator mobile app:** the simulator itself is not built as a phone app.
- **Shared live editing:** several people editing the same run at the same time is not
  supported.
- **Measuring the real service:** it does not measure the real service's actual speed or
  capacity.
- **Changing the real service:** it never changes the real service's code or documents.
- **Device hardware:** GPS accuracy, battery behaviour, and other phone hardware are not
  simulated.
- **Legal certification:** it does not certify legal or regulatory compliance.
- **Kitchen operations:** how restaurants prepare orders is not simulated beyond the preparation
  time.
- **Detailed traffic:** street-level traffic is not modelled in detail; travel times are
  generated instead.
- **Staff admin screens:** back-office account and settings management is not simulated.
- **Demand forecasting:** predicting future order demand is not part of it.
- **Promotions:** discounts and promotions are not simulated.
- **Restaurant onboarding:** restaurant sign-up and contracts are not simulated.
- **Customer accounts:** customer sign-in and customer accounts are not simulated.
- **Single-language interface:** the simulator's own interface is in one language.
- **Chat between people:** messaging between drivers, restaurants, and staff is not simulated.
- **Multi-company setup:** serving several delivery companies from one simulator is not
  supported.
- **Fleet management:** vehicle upkeep, fuel, and similar fleet concerns are not simulated.
- **Payroll processing:** actually paying drivers is not processed; payout rules can still be
  compared.
- **Marketplace orders:** orders arriving from other platforms or marketplaces are not
  simulated.
- **Penetration testing:** it does not attack or probe the real service for security weaknesses.
- **Scheduled orders:** orders placed for a later time are not simulated until the real service
  has them.
- **Multi-restaurant orders:** one order collected from several restaurants is not simulated.
- **Replacing source control:** it does not replace git or other version control for scenarios
  and versions.
- **Production data import:** importing data from the running real service is not supported,
  even when anonymised.
- **Driver navigation:** turn-by-turn navigation for drivers is not simulated.
- **Real weather or traffic feeds:** live weather and traffic data are not used.
- **Customer ratings:** customers rating drivers or restaurants is not simulated.
- **Desktop app:** the simulator is not built as an installable desktop application.
- **Memberships:** customer memberships and subscription plans are not simulated.
- **Annotations:** adding notes at points in a run for others to see is not supported.
- **Results data export:** exporting results as data files for other tools is not supported.
  The one exception is the conformance exchange ([FND-52](#fnd-52--conformance-exchange)),
  decided on 2026-11-03.
- **Price and fee breakdown:** a view of how each order's price and fee were worked out is not
  provided.
- **Role layouts:** ready-made layouts for business and technical users are not provided.
- **Business-language explanations:** technical events are not translated into business terms.

The user approved these on 2026-11-03; more may be added.
I01-E01-001
tracks the question.

Amended 2026-11-03 by the user: a stored run may be saved as a file and opened in another copy
of the simulator. That is not a results data export for other tools
([FND-58](#fnd-58--stored-records-and-shared-files)).

### FND-34 — Required capabilities

The simulator provides these capabilities. Which module of FND-8 owns each one is decided in
I01-E03-006,
and which stage each is built in is in the
[implementation roadmap](../roadmap/implementation-roadmap.md#capabilities-by-stage), decided in
I01-E06-002.

- **Scenario runner:** scripted, repeatable runs that check an outcome and report pass or fail.
- **Offline dispatch model:** a fast simulation of only the dispatch rules, to compare tuning
  values.
- **Race and ordering explorer:** tries different event orderings between the two modules and
  reports which ones break a rule.
- **Fault injection:** adds lag, delays, retries, crashes between steps, give-ups, and expiry to
  a run.
- **Invariant checker:** named rules checked at every step, with each violation linked to the
  event that caused it.
- **Design what-if testing:** runs designs that are open or not built yet, and compares the
  outcomes.
- **Decision explainer:** shows why each decision was made at any moment in a run.
- **Time-travel replay:** step forwards and backwards through a run, and repeat it exactly from
  a seed.
- **Real service conformance check:** compares the simulation's logic with the real service. How
  it works is undecided.
- **Scenario export:** saves a scenario as a file or link that someone else can rerun.
- **Fuzzing with shrinking:** random runs that reduce a failure to the smallest scenario that
  still fails.
- **Duplicate and idempotency testing:** repeated commands, repeated events, and keys reused
  with a different request.
- **Rollout simulation:** old and new versions running together, as during a rollout.
- **Stuck-order detection:** finds orders that can never finish.
- **Coverage map:** shows which transitions, rules, and error outcomes were exercised, and which
  states cannot be reached.
- **Multiple service instances:** several instances of the real service at once, with
  per-instance limits, single-run jobs, and races on a claim.
- **Cross-module event tracing:** follows one action from command to outbox, inbox, and copy,
  shown as a sequence diagram.
- **Parameter sweeps:** many runs across a range of tuning values, with charts of the results.
- **Business metrics:** time to assign, delivery time, driver load and fairness, and cash held.
- **Rule traceability:** each rule links to the decision behind it, and undecided behaviour is
  flagged.
- **Rule changelog:** the rule differences between versions, shown as a readable list.
- **Operational cost view:** notifications sent, polling work, and route-provider calls.
- **Manual mode:** the user acts as a driver or restaurant and steps through the flow by hand.
- **Model checker:** explores every reachable state for small setups, to prove a rule cannot be
  broken.
- **Load generator:** generates many drivers, restaurants, and orders for runs at volume.
- **Map view:** shows drivers, restaurants, and orders moving on a map.
- **Outbox and inbox inspector:** shows each module's outbox, inbox, and retry records at any
  step.
- **Clock control:** pause, speed up, slow down, or step the simulated time.
- **Assumption register:** lists every simulator assumption that does not come from the real
  service.
- **Scenario library:** search, tag, and organise saved scenarios.
- **Comparison dashboard:** shows the metrics of several versions side by side.
- **Scenario recorder:** records a manual-mode session and saves it as a scenario.
- **Event search:** filter and search a run's events by order, actor, kind, or time.
- **Version editor:** create and edit versions in the simulator's interface.
- **Rule editor:** change the rules themselves in the interface, not only their values.
- **Snapshot and branch:** save a run's state at a chosen point, then continue it differently.
- **Heatmaps:** show on the map where orders, waiting, and failures concentrate.
- **Driver timelines:** a timeline for each driver, showing their states and orders.
- **Order timeline:** a timeline for each order, covering everything that happened in both
  modules.
- **Run diff:** compare two runs event by event.
- **Glossary:** explains each term where it appears.
- **Scenario import:** load a scenario file someone else exported.
- **Batch runs:** run many scenarios unattended, then summarise the results.
- **Statistics across seeds:** shows how results are distributed across many seeds, not just one
  run.
- **Scenario validation:** checks that a scenario is well formed before it runs.
- **Checks from a run:** turns an observed run into the expected-outcome checks of a new
  scenario.
- **Version branching:** create a version from another one, and keep track of which version it
  came from.
- **Version validation:** checks that a version's rules are consistent before it runs.
- **Option switches:** switch between the options of an undecided question within a single
  version.
- **Compatibility matrix:** shows which versions can run together.
- **Step debugger:** set breakpoints on events or rules, and pause the run there.
- **Watch values:** follow a value, such as a driver's held orders, throughout a run.
- **Event injection:** add an event by hand at any point in a run.
- **State editor:** edit the state at a snapshot before continuing the run.
- **Payload viewer:** shows each event's payload, for each payload version.
- **Data model view:** shows the data each module keeps.
- **Load profiles:** named setups of areas, drivers, and orders, such as a lunch rush.
- **Actor behaviour profiles:** define how simulated drivers and restaurants behave.
- **Determinism check:** checks that repeating a run with the same seed gives identical results.
- **Simulator self-tests:** the simulator checks its own engine against known cases.
- **Criteria tracker:** shows which correctness criteria pass or fail for each version.
- **Scenario coverage report:** shows which criteria each scenario covers, and which no scenario
  covers.
- **Notification sequence view:** for each request, shows who was notified, when, and why.
- **Eligibility inspector:** for any driver and request, shows the result of each eligibility
  rule.
- **Score breakdown:** shows each part of a driver's dispatch score.
- **Time series charts:** shows how a metric changes over simulated time.
- **Fault presets:** named fault plans, such as an outbox outage or a slow inbox.
- **Random fault schedules:** faults injected at random times during a run.
- **Undecided dependency view:** shows which undecided questions a run's outcome depended on.
- **Lag monitor:** shows how far each inbox is behind the other module's outbox.
- **Retry timeline:** shows each retry, its backoff, and whether it was given up on.
- **Dead-letter view:** lists the events and commands that were given up on, with their reasons.
- **Pending command view:** shows the commands waiting on the other module.
- **Copy consistency check:** at any step, compares each module's copy of the other's data with
  its source.
- **Module disagreement view:** at any step, shows where the two modules disagree about an
  order.
- **Manual reordering:** lets the user choose the order in which pending events are delivered.
- **Idempotency record view:** shows the idempotency records, and which requests were replayed.
- **Lifecycle state diagram:** shows where each order is on the lifecycle state diagram.
- **Allowed actions panel:** shows which actions each actor can take now, and why the others are
  blocked.
- **Custody view:** shows who holds each order, and its cash, at any moment.
- **Cash ledger:** lists every cash movement for each driver.
- **Driver perspective:** see a run as one driver experiences it: their requests,
  notifications, and orders.
- **Restaurant perspective:** see a run as one restaurant experiences it: their orders, drivers,
  and requests.
- **Staff perspective:** see a run as back-office staff see it.
- **Job schedule view:** shows when each background job ran and what it did.
- **Instance view:** shows which service instance handled each piece of work.
- **Claims and leases view:** shows who holds each claim and lease, and when each expires.
- **Rate limit view:** shows each actor's usage against every rate limit.
- **Session and device view:** shows each actor's sessions and registered devices.
- **Event kind catalogue:** lists every event kind, with its payload versions, for each version.
- **Location track view:** shows each driver's recorded track and the time window of each
  recorded point.
- **Scenario timeline editor:** edit a scenario's planned actions on a timeline.
- **Criteria editor:** add and edit correctness criteria in the interface.
- **Invariant editor:** define new invariants in the interface.
- **Scenarios from criteria:** generate scenarios automatically from a criterion.
- **Version timeline:** shows the history of versions alongside the real service's changes.
- **Responsive while running:** heavy runs never freeze the page.
- **Run queue:** queue runs and watch their progress.
- **Stored run management:** see and delete the runs stored in the browser.
- **Tuning presets:** save a set of tuning values and reuse it.
- **Undo and redo:** undo and redo changes made in the editors.
- **Run labels:** name runs and attach labels to them.
- **Large run handling:** runs with very many events stay usable.
- **Coverage goals:** set a target coverage for each version and track progress towards it.
- **Version import and export:** share versions as files.
- **Assumption toggles:** turn a simulator assumption on or off to see its effect.
- **Sensitivity analysis:** shows which tuning values affect an outcome the most.
- **Value optimiser:** searches for the tuning values that best meet the stated targets.
- **Violation summary:** counts the violations of each invariant across many runs.
- **Regression suites:** named sets of scenarios that a version must pass.
- **Golden runs:** approved reference runs that a version's results are compared against.
- **Cross-version scenarios:** runs a scenario written for one version on another, adapting it
  where event kinds differ.
- **Metric drill-down:** click a metric to see the runs and events behind it.
- **Outlier finder:** finds runs whose results are unusual compared with the rest.
- **Trend across versions:** plots a metric across successive versions.
- **Difference explainer:** explains why two versions' outcomes differ, tracing back to the rule
  that changed.
- **Scenario chaining:** start a scenario from another scenario's end state.
- **Failure probability:** estimates how often a rule breaks under random conditions.
- **Hotspot ranking:** ranks rules and steps by how often they appear in failures.
- **Readable scenario format:** scenarios are stored in a documented file format that people can
  read.
- **Rule dependency graph:** shows which inputs and other rules each rule depends on.
- **Causality graph:** shows which events caused which other events in a run.
- **State space browser:** browse the states the model checker found.
- **Proof report:** lists which invariants the model checker proved, and for which setups.
- **Version lock:** freeze an approved version so it can no longer change.
- **Version provenance:** records which documents and decisions each version was built from.
- **Rule conflict detector:** finds rules that can contradict each other.
- **Dead rule detector:** finds rules that never fire in any run.
- **Module ownership view:** shows which module owns each rule and each piece of data.
- **Event flow map:** a diagram of every event kind that flows between the modules.
- **Interaction matrix:** shows which commands and events can interleave with which others.
- **Counterexample traces:** when a proof or check fails, shows the failing trace step by step.
- **Rule usage counts:** shows how often each rule fired, in one run or across a batch.
- **Decision distribution:** shows how often each possible outcome of a decision happened.
- **Critical path view:** shows the chain of steps that set an order's total time.
- **Wait-time breakdown:** shows where each order spent its time: waiting for a driver, being
  prepared, or travelling.
- **Message volume view:** shows the number of events of each kind over time.
- **Contention view:** shows where several actors competed for the same request or claim.
- **Retry storm detector:** finds bursts of retries.
- **Backlog growth warning:** warns when an inbox falls behind faster than it can catch up.
- **Driver utilisation:** shows the share of time each driver spends idle, travelling, and
  waiting.
- **Restaurant waiting view:** shows how long each restaurant waits for drivers.
- **Supply and demand view:** shows orders against available drivers over time, for each area.
- **Response rate view:** shows the share of notifications accepted, rejected, or ignored.
- **Notifications per acceptance:** shows how many notifications each accepted request needed.
- **Distance distribution:** shows how far drivers travel to reach restaurants.
- **Cash exposure view:** shows the cash held by drivers over time.
- **Fairness view:** shows how work and earnings are spread among drivers.
- **Area comparison:** compares metrics across service areas.
- **Time-of-day view:** shows metrics broken down by hour of the day.
- **Open order age view:** shows how long each open order has been waiting, at any point in a
  run.
- **Reassignment view:** shows how often orders move between drivers, and why.
- **Failure and return view:** shows the rates of, and reasons for, failed deliveries and
  returns.
- **Escalation view:** shows the orders that needed a person to step in.
- **Driver earnings view:** shows each driver's earnings over time.
- **Restaurant cash reconciliation:** compares the cash each restaurant confirmed with the cash it
  should have received.
- **Eligibility funnel:** for each request, shows how many drivers pass each eligibility rule
  in turn.
- **Location freshness view:** shows the share of drivers with a fresh location, over time.
- **Status change view:** shows driver status changes over time.
- **Job duration view:** shows how long each pass of a background job takes.
- **Notification failure view:** shows failed and undeliverable notifications over time.
- **Device reach view:** shows the share of notifications that reached at least one device.
- **Session churn view:** shows sign-ins, expiries, and revocations over time.
- **Conflict rate view:** shows how often commands run into conflicts.
- **Convergence time view:** shows how long the modules take to agree after each event.
- **Drift detector:** flags orders where the modules stayed apart for longer than the bound.
- **Pending request age view:** shows how long pending commands wait for the other module.
- **Replay rate view:** shows the share of commands replayed from an idempotency record.
- **Outbox size view:** shows the sizes of the outboxes, inboxes, and retry records over time.
- **Give-up rate view:** shows how often events and commands are given up on, over time.
- **Cleanup effect view:** shows the records each cleanup removed.
- **Clock skew view:** shows the differences between device time and server time.
- **Linked selection:** selecting an order, driver, or event in one view highlights it in every
  other view.
- **Synchronised playback:** play two runs side by side, kept in step on the same simulated
  time.
- **Search everywhere:** search across runs, scenarios, versions, and rules from one place.
- **Saved views:** save a view's settings and come back to it later.
- **Batch completion alerts:** tells the user when a long batch finishes.
- **Help pages:** built-in documentation for the simulator.
- **Detail level switch:** switch between a business level and a technical level of detail.
- **Version picker:** change which version a view shows, from within that view.
- **Recent items:** quick access to recently used runs, scenarios, and versions.
- **Run status bar:** always shows the current version, seed, and simulated time.
- **Request generation view:** shows every delivery request generation of an order, and how each
  ended.
- **Custody chain:** shows an order's full chain of custody over time.
- **Order cash chain:** shows every state of an order's cash: collected, confirmed, and
  returned.
- **Command journal:** lists every command with its idempotency key, result, and replays.
- **Rule evaluation log:** records every rule evaluation with its inputs and result.
- **Version summary:** a one-page summary of a version's rules and values.
- **Order across versions:** shows the same order, in the same scenario, under two versions side
  by side.
- **Order replay:** replays one order's events on their own, without the rest of the run.
- **Order what-if:** change one decision for an order and see what follows from it.
- **Order criteria check:** shows whether one order met every correctness criterion, and which
  it broke.

The user approved these on 2026-11-03; the list is complete for now, and more may be added.
I01-E01-002
recorded the question.

Amended 2026-11-08 by the user: Order replay shows the commits that touched one order, and its
version chain, as [FND-81](#fnd-81--runs-as-a-tree-of-state-transitions) settled, not one order's
events replayed on their own.

### FND-35 — Later capabilities

These capabilities are wanted, but not in the first stages. When they are built is decided in
I01-E06-002.

- **Report generator:** turns a run or a comparison into a written report.
- **Version merge:** combine the changes from two versions into one.
- **Bulk scenario editing:** change many scenarios at once.
- **Dashboard builder:** arrange chosen views into a custom dashboard.
- **Bookmarks:** bookmark moments in a run and jump back to them.

The user approved these on 2026-11-03; more may be added.
I01-E01-002
tracks the question.

### FND-36 — Inventory per version

Each version of the real service gets its own folder of design documents under
`docs/design/versions/<version>/`. The inventory of flows, states, actors, events, and decisions
is that version's specification. How versions are named and created is decided in
I01-E04-001.

### FND-37 — Inventory coverage

The inventory covers the real service as built, each approved but unbuilt design as its own
version, and each option of the real service's undecided questions, so that each option can be
selected with an option switch.

### FND-38 — Order detail

The simulation models the order in full detail:

- **Products and lines:** products, quantities, and line positions.
- **Prices, fees, and commission:** customer and restaurant prices, delivery fee bands, and
  commission models.
- **Customers and addresses:** customers with their addresses and cities.
- **Restaurants and areas:** restaurants with their locations, staff, service areas, and hours.

### FND-39 — Source conflicts resolved

Where the real service's documents disagree, the user decides which the simulator follows
([FND-9](#fnd-9--sources-of-business-rules)). Decided so far:

- **Rejected requests:** a driver's rejection closes the request, and an ignore keeps it open
  for other drivers (2026-11-03; recorded under FND-29).
- **When a return may be requested:** the driver holding the order may request a return only
  after a failed delivery attempt, as the real service's code does. The user first chose any
  time after pickup, then corrected it on 2026-11-03 once the code was checked.
- **Return acceptance and payment return:** accepting a return never waits for a payment return,
  as the code does and the revised dispatch rules say; the older text that blocks it is
  superseded (2026-11-03). The FND-29 criterion "Return not gated" stands.
- **Dispatch:** dispatch is under development in the real service. It is modelled both as the
  code has it today and as its planned design, as two versions (2026-11-03).
- **Module copies design:** an earlier conflict about its undecided items U1 to U10 rested on a
  stale reading of the real service's record. The record decides all of them, and the simulator
  follows its decisions, with no option switches for them (corrected 2026-11-03).

### FND-40 — Kinds of version

A version is one of these kinds. The kind is recorded with the version; it is not part of the
number.

- **Built snapshot:** the real service as built, at a point in time.
- **Historical snapshot:** a past state of the real service, rebuilt from its history.
- **Approved design:** a design the real service has approved but not built yet.
- **What-if variation:** a variation of another version: tuned values, chosen option switches,
  or edited rules.
- **Proposal:** a change someone suggests that is not approved, tested before it goes to the
  real service.

### FND-41 — Version numbers

Versions are numbered with the `V` prefix and SemVer, for example `V1.0.0`, as an independent
label in [versioning](../governance/versioning.md). The size of the change sets the number:

- **Major:** a change to the flow or to the modules: which module does what, or how they
  communicate.
- **Minor:** a change to rules or to events and their payloads.
- **Patch:** a change to values only.

A version that is not built carries a pre-release tag naming it, such as
`V1.1.0-planned-dispatch`, until it is built. A version's folder under `docs/design/versions/`
is named after its full number.

### FND-42 — First versions

The first versions are these. The other approved but unbuilt features come later.

- **`V1.0.0`:** the real service as built today, including today's dispatch.
- **`V1.1.0-planned-dispatch`:** dispatch as its planned design describes it.
- **`V2.0.0-module-copies`:** dropped on 2026-11-03 by the user, because the module copies are
  already built in `V1.0.0`.

### FND-43 — What may differ between versions

Versions may differ in values, in rules, in event kinds and their payloads, and in the flow and
modules.

### FND-44 — Version lifecycle

- **Who:** anyone using the simulator can create a version.
- **Triggers:** a change to the real service's code, an approved design, a settled undecided
  item, or a proposal someone wants to test.
- **Support:** built and historical snapshots stay runnable. Approved designs, what-if
  variations, and proposals can be retired once they are built or rejected.

### FND-45 — Version folder layout

- **Pages by topic:** each version folder has a README for the version, and pages for its
  lifecycle, actors and commands, events, business rules, module communication, and failures.
- **Later versions describe changes only:** a version after `V1.0.0` describes only what differs
  from the version it is based on, and links to it.
- **Built state by date:** a built snapshot records the date of the state it describes, and
  nothing else about the real service's source.
- **`V1.0.0` is the working tree:** it describes the real service's code as it stands on disk
  on 2026-11-03, including changes not yet committed.

### FND-46 — Simulation detail

- **Full technical detail:** transactions, polling, leases and claims, service instances, and
  each module's records, down to individual rows.
- **Push pipeline:** sending, retries, invalid devices, and callbacks are simulated.
- **Full device model:** devices can be offline or in the background, and can receive
  duplicates. Apps are simulated actors acting through behaviour profiles, with no screens.
  Device hardware stays out of scope ([FND-33](#fnd-33--out-of-scope)).

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
  of the real service ran the tests, by date only ([FND-45](#fnd-45--version-folder-layout)). It
  also records when each event and answer happened; the steps the tests could not carry out, and
  why; unexpected errors and relevant log lines, free of private data; and the settings the tests
  ran with.
- **Versioned:** the exchange format has its own label, `X`, for example `X1.0.0`, in
  [versioning](../governance/versioning.md).
- **Updates:** new versions are drafted from changes to the real service's documents or code, and
  confirmed by a person ([FND-44](#fnd-44--version-lifecycle)).
- **Who reviews:** the user states the rules and reviews the simulation, which resolves the
  former U2.

The user decided these on 2026-11-03, in I01-E04-003; the contents of both formats are complete
for now.

### FND-53 — UI organisation

- **Navigation:** top-level sections, and a run workspace with docked panels that opens for a run.
- **Main view:** a run opens on the city map with a shared event timeline under it.
- **Business and technical views:** separate views. The detail-level switch moves between them for
  the same run, moment, and selection, and each view also has its own detail levels.
- **Sections:**
  - **Runs and scenarios:** start runs, browse the scenario library, and see run history and batch
    results.
  - **Versions:** the version timeline, editor, summaries, and compatibility matrix.
  - **Comparisons:** comparison dashboards and run differences.
  - **City, profiles, and conformance:** edit cities and behaviour profiles, and handle the
    conformance exchange files.
  - **Criteria and coverage:** the criteria tracker, criteria and invariant editors, the coverage
    map, and coverage goals.
  - **Analysis:** parameter sweeps, sensitivity analysis, the value optimiser, and statistics
    across seeds.
  - **Assumptions and open questions:** the assumption register, undecided items, option switches,
    and documentation gaps.
  - **Faults and races:** fault presets, the race explorer, and the model checker with its proof
    reports.
  - **Findings:** the flaws found, their fix paths, and the items they feed into the real
    service's backlog.
  - **Stored data:** stored runs, import and export, and storage use.

The user decided these on 2026-11-03, in I01-E03-002, which resolves the former U6. The list of
sections is complete for now.

### FND-54 — Tunability

- **When:** values can change during a run and between runs. A change during a run is recorded
  as an event in it, so the run stays repeatable.
- **Presets and versions:** a tuning preset is a set of values applied to any version, without
  making a new one. Saving a tuned setup as a version makes a what-if variation
  ([FND-40](#fnd-40--kinds-of-version)).
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

### FND-56 — Module boundaries

- **Drivers:** the Deliveries module owns drivers.
- **Pricing:** Business rules owns every pricing rule: fee bands, commission, and price checks.
  Payments only moves money.
- **Versions module:** a new Versions module owns versions, option switches, comparison, and the
  conformance exchange. This amends [FND-8](#fnd-8--capability-list).
- **Event log:** the Event log is the single record of a run; the Technical view and Run history
  both read it. [FND-81](#fnd-81--runs-as-a-tree-of-state-transitions) amends this: commits become
  the single record, and the log a readable view worked out from them. I03-E02-006 built this.
- **Customers and restaurants:** restaurants create orders and hand them over, and customers
  receive deliveries; all of them follow behaviour profiles ([FND-48](#fnd-48--simulation-model)).
- **Verification and Analysis modules:** a Verification module owns criteria, invariants, proofs,
  and coverage, and an Analysis module owns analysis across many runs. This amends
  [FND-8](#fnd-8--capability-list) again.
- **Capability ownership:** each FND-34 and FND-35 capability has one owner, listed in
  [capability ownership](../modules/capability-ownership.md). Driver behaviour profiles belong
  to Deliveries, and restaurant and customer profiles to Customers and restaurants. The workspace
  features belong to the [UI section](../ui/README.md). The owner of the later Report generator
  is undecided (U13).
- **Dependencies:** the module dependencies are the graph in the
  [module map](../modules/README.md#dependency-graph), confirmed on 2026-11-03, which resolves the
  former U8.

The user decided these on 2026-11-03, in I01-E03-006, which resolves the former U7 and U10.

Amended 2026-11-03 by the user: Import and export also uses Run history, for run files
([FND-58](#fnd-58--stored-records-and-shared-files)).

Amended 2026-11-06 and 2026-11-07 by the user, in
[FND-83](#fnd-83--types-owned-by-their-modules): each module holds its own rules, and Business
rules becomes a module of rule abstractions that the others use; Drivers becomes a module, with
Deliveries as its submodule; Restaurants becomes a module, with Customers as its submodule; and
a System module holds the abstractions about time, randomness, and math. I03-E02-019 and
I03-E04-012 build this, and until then the modules above stay as they are.

### FND-57 — Hosting and data

- **Hosting:** local only for now: the development server, or a local build. A hosted deployment
  is undecided (U14).
- **Browsers:** the latest Chromium-based browsers, Firefox, and Safari on desktop.
- **Data lifetime:** runs, scenarios, versions, and tuning presets are kept in the browser until
  the user deletes them.
- **Data changes:** stored data carries a schema version, and a new release migrates older data
  when it loads it.
- **Sharing:** between people, everything is shared as files through Import and export
  ([FND-54](#fnd-54--tunability), [FND-56](#fnd-56--module-boundaries)).
- **Repository:** the project is a git repository, which the user created on 2026-11-03.

The user decided these on 2026-11-03, in I01-E05-001, which resolves the former U3 and U5.

Amended 2026-11-03 by the user: "everything" means scenarios, with the cities and profiles they
use, versions, tuning presets, and stored runs
([FND-58](#fnd-58--stored-records-and-shared-files)).

### FND-58 — Stored records and shared files

- **Run files:** a stored run can be saved as a file and opened in another copy of the
  simulator. It is not a data export for other tools, which stays out of scope
  ([FND-33](#fnd-33--out-of-scope)). Import and export uses Run history for it, which adds one
  dependency to the [module map](../modules/README.md#dependency-graph).
- **Cities and profiles:** custom cities and behaviour profiles are stored records of their own.
  Map and routing owns cities, Deliveries owns driver profiles, and Customers and restaurants
  owns restaurant and customer profiles. A scenario file carries the cities and profiles it uses,
  so they are shared through scenarios.
- **Lifetime:** cities and profiles follow the same rule as other stored data: kept until the
  user deletes them, and migrated across releases ([FND-57](#fnd-57--hosting-and-data)).

The user decided these on 2026-11-03, in I01-E06-001, resolving a conflict between FND-33,
FND-57, and the module pages.

### FND-59 — Requirements approved

- **Approved:** the requirements, summarised in [requirements](../requirements.md), are complete
  and correct, area by area.
- **Open questions:** implementation may start with U12, U13, and U14 open. U13 is decided when
  the report generator is built, U14 before anything is published, and U12 once versions are
  being added.

The user decided these on 2026-11-03, in I01-E06-001.

### FND-60 — Implementation stages

- **First stage:** an end-to-end skeleton. The project setup, and one `V1.0.0` order going end to
  end without faults: the restaurant creates it, and it is dispatched, accepted, picked up, and
  delivered, through both modules' outboxes and inboxes. It has the virtual clock, the event log,
  a basic technical view, and a scenario that passes or fails on four criteria: Valid final state,
  Modules agree, Exactly-once effect, and Outbox for every event.
- **Stage gate:** a stage is complete, and the next one starts, only when its built-in scenarios
  pass in the browser and headless; the user has run it and approved it; the design pages, code
  maps, and statuses match the code, with Implemented evidence; and the unit, component, and
  end-to-end tests pass, with the architecture and public-safety checks.
- **Order:** correctness first. Each stage is one initiative:
  1. `I02` End-to-end skeleton.
  2. `I03` Full `V1.0.0` lifecycle and rules: every path, command, and rule.
  3. `I04` Faults, races, and verification: fault injection, the known races C1 to C4 and R1 to
     R4, the give-ups D1 to D4, invariants, and the drift report.
  4. `I05` Stored runs and files: run history, and import and export.
  5. `I06` Versions and comparison: `V1.1.0-planned-dispatch` and option switches.
  6. `I07` City, actors, and scale: behaviour profiles, the map, and the business view.
  7. `I08` Analysis and the offline dispatch model.
  8. `I09` The conformance exchange.
  9. `I10` Remaining views and checks: the model checker, coverage, and metrics.
  10. `I11` The later capabilities of [FND-35](#fnd-35--later-capabilities), all five together.
     U13 is decided when it starts.
- **Capabilities by stage:** each FND-34 capability is built in one stage, as the
  [implementation roadmap](../roadmap/implementation-roadmap.md#capabilities-by-stage) lists them.
- **Backlog detail:** `I02` is written in full, with epics and items. Each of `I03` to `I11` has
  one epic with one planning item until it starts, because the backlog derives an epic's status
  from its items. Its intended epics are in the
  [implementation roadmap](../roadmap/implementation-roadmap.md#capabilities-by-stage), and are
  created when it starts, so they reflect what the earlier stages taught.
- **Priority:** the `I02` items are High, and the planning items are Normal until each stage
  starts.

The user decided these on 2026-11-03, in I01-E06-002.

### FND-61 — Node and TypeScript versions

- **Node:** the project uses Node 26 or later. Angular 22 supports `^22.22.3`, `^24.15.0`, and
  `>=26.0.0`.
- **TypeScript:** the project uses TypeScript 6.0, the only line Angular 22 accepts.

The user chose Node on 2026-11-03, in I02-E01-001. The TypeScript line follows from
[FND-16](#fnd-16--angular-version).

### FND-62 — Dependency injection and architecture check

- **Abstractions:** Application defines its abstractions as abstract classes. Angular uses each
  class as its injection token, so neither the core nor UI needs a separate token. This details
  [FND-19](#fnd-19--composition-root-and-dependency-inversion).
- **Architecture check:** `npm run check:architecture` checks the dependency rules with
  dependency-cruiser, and compiles the core without browser types, so a browser API in the core
  fails it.
- **First binding:** the wall clock, which the virtual clock's wall-clock mode needs.

The user decided these on 2026-11-03, in I02-E01-002.

### FND-63 — Tests and public-safety check

- **One command:** `npm run check` runs the public-safety check, the format and lint checks, the
  architecture check, the type check of the source and its tests, the unit and component tests with
  their coverage, and the end-to-end tests in Chromium, Firefox, and WebKit.
- **Public-safety check:** it looks for email addresses, Windows drive paths, home folder paths,
  and file URLs in the files git would publish. It keeps no list of private terms.
- **What it does not cover:** it cannot recognise the real service's name or a person's name, and
  it does not read git history or commit authors. Commit authors do hold a person's identity. U14
  decides what else must be checked before anything is published.

The user decided the check's coverage on 2026-11-03, in I02-E01-003.

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
  [FND-72](#fnd-72--code-style) amends this: each kind of entry has typed data, and the JSON check
  is made where the log is persisted.
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

### FND-67 — Scope of the skeleton

- **Order detail:** in `I02`, an order holds only what the path needs: its ID, restaurant, status,
  version, readiness, driver, and events. The rest of [FND-38](#fnd-38--order-detail) arrives in
  `I03`, and FND-38 is unchanged.
- **Idempotency:** `I02`'s commands take no idempotency keys, because nothing on its path repeats.
  They arrive in `I03`.
- **Dispatch:** `I02` has all of `V1.0.0`'s eligibility, ranking, and notification sequence
  rules. A notification is a durable record; pushes and devices arrive in `I03`. A driver's status
  and location come from the scenario.
- **Communication:** `I02` has both outboxes, both inbox jobs, the handoff and its retry, and the
  direct calls. Inbox retries, dead letters, pending driver commands, cleanups, and refused events
  arrive with `I03` and `I04`; until then, an event the path cannot handle stops the run with an
  error rather than being lost.

The user decided these on 2026-11-04, in I02-E03-001.

### FND-68 — Equal scores and open request order

- **Finding:** the real service sorts drivers by score with no tie-break, over a database read
  with no order, so drivers with equal scores are notified in an undefined order. This breaks
  the Defined tie-breaking criterion of [FND-30](#fnd-30--technical-correctness), and is to be
  reported to the real service ([FND-31](#fnd-31--decisions-the-results-support)).
- **In `V1.0.0`:** the simulator breaks a tie by the lowest driver ID, and goes through open
  requests oldest first, so a run stays repeatable.
- **Later:** other tie rules become option switches when `I06` adds them.

The user decided these on 2026-11-04, in I02-E03-002.

### FND-69 — Module jobs and the module graph check

- **Jobs:** each module reads its own values from Business rules, and tells the simulation engine
  which jobs to repeat. The engine only runs them, so it has no dependency on Business rules, and
  the confirmed graph is unchanged.
- **Module graph check:** `npm run check:architecture` also fails on any import between modules
  that the [module map](../modules/README.md#dependency-graph) does not show. It reads the graph
  from that page, so the two cannot drift apart: a new dependency means changing the page first.
- **Scripted actors:** the simulation engine drives them, because the graph gives Scenarios no
  dependency on Orders. A scenario's steps are its input.

The user decided the jobs and the check on 2026-11-04, in I02-E03-004.

### FND-70 — Scenario format

- **Times:** a scenario writes simulated time as `h00:m05:s00:ms00`, with each unit labelled. `ms`
  is a count of milliseconds, so `ms05` is 5 milliseconds.
- **Contents:** the [scenario format](../modules/scenario-format.md) page describes the fields.
  Each file names its version and seed, so a run can be repeated exactly.
- **Validation:** reading a file reports everything wrong with it, as a typed result. A field the
  format does not have is refused, because it is usually a typing mistake.

The user decided the time format on 2026-11-04, in I02-E04-001.

### FND-71 — Code style and quality tools

- **Editor settings:** `.editorconfig` holds the [code style](#fnd-72--code-style)'s layout, with
  UTF-8, LF, a final newline, and no trailing whitespace.
- **Line endings:** `.gitattributes` keeps every text file LF on every machine.
- **Formatting:** Prettier formats the code, and reads those settings. It leaves Markdown alone,
  which is wrapped by hand to under 100 characters a line.
- **Linting:** ESLint with typescript-eslint's strict type-checked rules, Angular's rules, and
  Vitest's rules, with the adjustments the [code style](../governance/code-style.md#lint-settings)
  page lists. In source, a value that must exist goes through `required`,
  which throws if it is missing. The compiler also uses `noUncheckedIndexedAccess`.
- **Stylesheets:** Stylelint checks that colours and spacing come from CSS variables.
- **Coverage:** `npm run check` fails below 95% of lines, 90% of branches, or 90% of functions.
- **Mutation testing:** Stryker plants faults in the core and reports the ones the tests miss. It
  takes minutes, so it runs on demand with `npm run test:mutation`, and not in `npm run check`.

The user decided these on 2026-11-04, between I02-E04-002 and I02-E04-003. They are not a backlog
item. This adds to [FND-17](#fnd-17--test-tools) and
[FND-63](#fnd-63--tests-and-public-safety-check).

### FND-72 — Code style

The user chose these on 2026-11-04.

- **Layout:** 4 spaces, single quotes, semicolons, and trailing commas everywhere, up to 120
  characters a line, which the user lowered on 2026-11-05: "we prefer the code ty be styled
  verticaly instead of horizontaly, in general the code line length should stay under 100
  characters". `package.json` and its lock file stay at 2 spaces, as npm writes them, and
  Markdown stays under 100 characters a line, wrapped by hand.
- **Braces:** every `if` has braces, even on one line.
- **Typed core:** the user chose on 2026-11-06 that Domain and Application work only with strongly
  typed values: "the applicationa and core layer should not work with json or primitive types,
  instead we prefer strongly typed types. the json parsing and manipulation should be in the
  infrastructure layer like persistence or io in general". This amends
  [FND-65](#fnd-65--event-log-entries)'s rule that log data is JSON: the JSON check moves to
  persistence. The user then chose how far it goes: fields with a fixed set of values or an
  identity get const-object types or branded IDs, and simulated times, durations, counts, and
  amounts get branded number types too. The run digest and the run comparison work over typed
  entries, with no JSON, so every pinned digest changes once. I03-E02-018 does this. For
  indirect effects, which nothing records yet, the user chose on 2026-11-06 a set of kinds that
  starts empty: each kind has its own typed data, and I03-E02-013 adds the first. For scenario
  files, the user chose the same day that Infrastructure reads, parses, and validates them, and
  the port for a chosen file gives Application a typed scenario or its problems. The built-in
  scenarios stay JSON files, in Infrastructure, behind a port that lists them and gives one by
  its ID. The self-tests' known case is a typed scenario, run directly. For the digest, the user
  chose per-kind encoders: each kind of entry, and each module's records, is written field by
  field, and a test checks that every field is written. The run comparison uses typed equality
  per kind, with tests that it and the digest never disagree. For fixed sets and identities, the
  user chose: a scripted step's actor and order name are a branded `ScenarioActor` and
  `ScenarioOrderName`, a scenario's version a branded `VersionId`, and a built-in scenario's ID a
  branded `BuiltInScenarioId`. Output effects become a set of kinds that starts empty, like
  indirect effects, for the item that first calls a provider. Verification uses Orders and
  Deliveries, so its run record holds `OrderStatus` and each module's event kinds. For numbers,
  the user chose branded `SimTime`, `Duration`, `Count`, and `VersionNumber`, plus a
  `LogSequence` for an entry's place, `Metres`, `Seed` and `RandomWord`, `Degrees`, and `Score`.
  Arithmetic goes through typed helpers in Domain, such as `later(at, duration)`, so plain `+` and
  `-` on them stay out of Domain and Core, and the creators check their values and throw.
  Amounts wait for `Money`, which nothing holds yet. On the user's request for more, they added
  `WallTime` for the browser's real clock, kept apart from `SimTime`, `Fraction` for a number from
  0 up to 1, `Factor` for a multiplier such as a boost, a decay, or a clock speed, and `Position`
  for a place in a list. Numbers used only inside a function's own working, such as a hash's
  state or a loop's index, stay plain. A `Duration` must be from 0, so a tuned duration below 0
  becomes something a run cannot use, beside the job intervals; this amends the tuned values'
  invariants below. `Metres` takes any finite number, so a distance limit can still go below 0
  to test extremes, as [FND-54](#fnd-54--tunability) allows.
- **Numbers, as built:** I03-E02-018-P06 put the types, their creators, and the helpers in
  `src/domain/quantities.ts`, the one file besides `ids.ts` where `as` is allowed. Each layer
  outside Infrastructure takes typed numbers. Infrastructure makes them with the creators when it
  reads a scenario or loads a run, so a stored value a run cannot use fails there. A value
  checked by its type is not checked again: a scripted step's time is now only checked to be a
  whole millisecond, and an inbox that has read nothing reads from the run's start rather than
  from minus infinity, which reads the same events, since none is before the start. A clock
  speed is a `Factor` or `max`, and a run told to go on past its end has no end, rather than an
  infinite one. Constants keep their numbers as stated, in a plain object or a named constant,
  and pass them to the creators, so no unnamed number appears in code.
- **Arguments:** the user chose on 2026-11-05 that a call's result is stored in a local before
  it is passed on, everywhere, tests included, with no exceptions: "we prefer to store the
  resullt of an expression into a local variable firest istead of passing the whole expression
  as a argumetn".
- **Functions:** a top-level function on one line is an arrow function, and anything longer is a
  function declaration. The user chose on 2026-11-05 that a function short enough for one line
  stays an arrow function when the formatter wraps it.
- **Return types:** every function states its return type, unless it is a callback whose type comes
  from where it is passed.
- **Comments:** every exported function, class, type, and constant has a doc comment.
- **Fixed sets of values:** const objects, not enums or unions of literals.
- **Object shapes:** `interface`, and `type` for unions and aliases.
- **Private members:** the `private` keyword, not `#`.
- **Member order:** the user chose on 2026-11-06 the order of a class's members: "the static
  membvers should come fires than fielsts and getters setters than constructors than public
  methods than private methods". So statics come first, static fields before static methods,
  then fields, then getters and setters, then constructors, then public methods, then private
  methods. Among fields, private ones come before public ones; among methods, private ones come
  after public ones. The user then chose that protected members sit between the two, that
  getters and setters go private first, like fields, with a getter and its setter side by side,
  and that statics follow the same access order as instance members. In an Angular class, the
  Angular members, such as inputs, outputs, `inject()`, and queries, lead the fields of their own
  access level: where the two rules met, the user chose access first. It applies to every
  class, tests included. ESLint enforces the order of kinds and access, and review checks the
  Angular part.

ESLint enforces all of these except one: it can check that a long top-level function is not an
arrow function with a block, but not one whose expression spans several lines. The
[code style](../governance/code-style.md) page holds these and every later rule, with their sources
and status.

### FND-73 — Immutable architecture

- **Core:** Domain is strictly immutable and pure. Application does the orchestration and
  coordination, and may hold mutable services to do it. Its data is immutable too, except where
  that would be a considerable performance problem. An exception needs a benchmark that shows the
  problem, and a comment saying so.
- **Runs:** a run is immutable. Its whole state is one value, and each step returns a new one, so a
  snapshot is just a reference. Work is data, not closures, and the event log is an immutable list.
  Since I03-E02-006, the work due is worked out from the commits and the scenario, and each random
  stream's position sits in the effects sub-root
  ([FND-81](#fnd-81--runs-as-a-tree-of-state-transitions)).
- **Modules:** a module is a state type plus pure functions in Domain, not a stateful class. A
  command is a plain function call on that state. Work due is a record, and the engine turns it
  into that call. Follow-ups are data: a step returns what should happen next, and the engine does
  it, so no module calls another.
- **Collections:** Immutable.js, in every layer, with plain `readonly` objects as records.
  `OrderedMap` is used wherever order matters, because `Map` does not keep insertion order. This
  amends [FND-11](#fnd-11--clean-architecture-with-a-framework-free-core): the core may use this
  data library.
- **Not event sourcing:** a run's state is held directly at each commit, and nothing derives state
  from events or from the log. There are no decider patterns, and no special types acting as
  functions. A saved run can be recalculated by calling the same pure functions again
  ([FND-81](#fnd-81--runs-as-a-tree-of-state-transitions)). The user reworded this in I03-E01-001.
- **Saving:** a repository maps each persisted record to its application record, and application
  records are never stored directly
  ([FND-81](#fnd-81--runs-as-a-tree-of-state-transitions)). Until I03-E02-007 builds it, a run's
  state converts to plain JSON and back exactly.
- **Exceptions:** there is one, `runDigest`, whose benchmark is in
  [Simulation engine](../modules/simulation-engine.md#performance).
- **Bugs:** a bug inside a run stops it and says where, and the last good state remains.
- **External access:** files, the network, and any other outside dependency stay in Infrastructure,
  at the edge, behind an abstraction that Application defines.
- **Views:** what a view shows is computed by a tested pure function.

The user decided these on 2026-11-04. [Code style](../governance/code-style.md) holds the rules
that follow from them, and
I02-E07
applies them.

On 2026-11-06 the user amended the Modules and Collections rules: "in general domain types shoul
be clases and not just object or interfaces ... so an order object is allwasy a fully instacne
of a class with validated invariants and all its supported methods". The user then chose:

- **Every Domain type is a class:** entities and their versions, events, outbox rows, and other
  records, and each module's state too, whose commands become its methods. This replaces "a
  module is a state type plus pure functions" and "plain `readonly` objects as records".
- **Immutable instances:** fields are readonly and frozen, and a method returns a new instance,
  so runs stay immutable, a commit still shares what it leaves alone, and a snapshot is still a
  reference.
- **Versions stay apart:** an order is two classes, `Order` for the part that never changes and
  `OrderVersion` for each state, linked to the one before, as the records are now.
- **Two static constructors:** `createNew` makes a new instance, such as an order's first
  version, and `create` rebuilds one from given values, such as stored ones, checking its
  invariants. Values that break an invariant can only come from a bug or corrupt storage, so
  `create` throws. `create` takes the class's fields by name, as `FieldsOf<T>`, and a value that
  is only its fields, such as a place, has `create` alone.
- **Tuned values' invariants:** a set of config values rejects only what a run cannot use: a
  value that is not a finite number, a job interval that is not a whole number of milliseconds
  above 0, and a count that is not a whole number from 0. A value outside its valid range is
  still allowed, with the warning [FND-54](#fnd-54--tunability) gives.
- **Reading the other module's outbox:** a module takes the other module's outbox event class
  itself, such as Orders taking `DeliveriesOutboxEvent`, and no view interface stands in for
  it. What a module keeps of an event it read is its own class, such as Orders'
  `DeliveriesEventCopy` with only the fields orders keeps.
- **Commands are static methods:** a module's command is a static method of its state class,
  such as `OrdersState.pickUp(state, ...args)`, so a state commit's call, the function registry,
  and the pinned fingerprints work as they do now.
- **Plain frozen classes:** ordinary classes with readonly fields, frozen when made, and a
  private constructor, so only the static constructors make one. Collections inside them stay
  Immutable.js.
- **No interfaces beside them:** the class is the type, so `Order` replaces `IOrder`. Persisted
  types keep their own `IPersisted` interfaces.
- **Outcomes stay unions:** what a command or a change comes to, such as `OrderChange`, a driver
  command's result, orders' answer, or a step with its reports and follow-ups, stays a
  discriminated union of readonly data. The things it carries are class instances.
- **Other plain data:** a run's record and a check's results in Verification are outcomes, and
  stay plain readonly data. So do the bundles a rule reads or gives back, such as the facts
  eligibility needs or a ranked driver. The generic log entry stays a record joined with its
  place in the log, which Application.Core's typed kinds narrow on.
- **Core uses Domain types, never extends them:** in the user's words, "core types should not
  extend domain types, only domain types can extend domain types, core types can only use domain
  types". Core's log data holds a Domain instance in a field, such as an orders event with the
  order's status and version beside it.
- **Where:** a new phase of I03-E02-018, P08, done before its P05 and P06. Its plan, the class
  list and the order of work, is written into the phase for the user to review first.

### FND-74 — Driver and restaurant vocabulary

The domain's words are `driver` and `restaurant`, replacing `courier` and `merchant`. The user
decided this on 2026-11-04, as these are still general names, so
[FND-23](#fnd-23--safe-to-publish) still holds. The rename covers the code, the design documents,
the Customers and merchants module's name, and the backlog, including finished items and their file
names. The scenario format changes too, with no alias for the old field names.

I02-E07-001 applied it on 2026-11-04. In finished items it changed the words only, so their dates
stay as they were and they have no new history entry.

### FND-75 — First criteria as judged

- **Evidence:** the checker reads a run from its event log alone, so it judges what the run did and
  not what the code says it did.
- **When:** at the end of a run. Checking the named invariants at every step comes later, with
  those invariants.
- **Settled at the end:** a run that stops with an outbox event unread fails Modules agree and
  Exactly-once effect, following
  [FND-49](#fnd-49--scenarios).
- **An order not finished:** a scenario that stops before an order reaches a final state fails
  Valid final state, even if nothing else went wrong.
- **No orders:** a run with no orders passes, since nothing went wrong, and its verdict says that
  no orders were judged, so a scenario that creates none by mistake is easy to spot.
- **Not yet acknowledged:** a delivery request deliveries has not acknowledged has no outbox event,
  which [FND-30](#fnd-30--technical-correctness) allows.
- **How to judge "took effect twice":** two events in a module that match the same event in the
  other, or an event recorded twice.

These apply FND-29, FND-30, and FND-49 to the first four criteria, in I02-E04-003. The user
reviewed and accepted them on 2026-11-05, adding the note on a run with no orders.

### FND-76 — Application shell and components

- **Navigation:** a left sidebar holds the top-level sections of
  [FND-53](#fnd-53--ui-organisation).
- **Sections:** all ten appear from the start, each on its own lazy-loaded route. A section not
  built yet has an empty page that says what will go there.
- **Theme:** light only. Colours come from CSS variables, so a theme can be added later.
- **Components:** hand-written components styled with those variables, using Angular's CDK for
  behaviour that is hard to get right, such as virtual scrolling, docking, and accessibility.
- **Run workspace, first form:** a main area with the event timeline under it and a detail panel on
  the right, in fixed places, and resizable by dragging. Real docking comes when there are enough
  panels to need it.
- **Starting a run:** picking a scenario opens the workspace paused at time 0, and the user starts
  it.
- **Speed:** preset buttons for `1x`, `10x`, `60x`, `600x`, and `max`, and a box for any other
  multiple.
- **Status bar:** the version, seed, simulated time, and the run's state, as
  [FND-34](#fnd-34--required-capabilities) and the first item require, and also the speed, the
  number of log entries, how many orders have finished, and whether the run passed once it has
  ended. Time is written as in scenario files: `h00:m05:s00:ms00`.
- **A run's end:** the clock stops at the time the scenario states, and the verdict shows. A button
  runs on past that, and the verdict stays as it was at the stated end. Another starts a fresh run.
- **Leaving a run:** moving to another section pauses a running run, and coming back resumes it.
- **Keyboard:** Space starts and pauses, S steps, and 1 to 5 choose the speed presets, unless the
  focus is in a text box. Space leaves a focused button to do its own job.

The user decided these on 2026-11-04, in I02-E05-001.

On 2026-11-07 the user added: "in general all ui component the perform an action sholuld contain
some kind of tooltip". Every control that does something, such as a button, a tab, a link, a
slider, or a divider that resizes, has a tooltip saying what it does. It is the app's own styled
tooltip, in the theme's colours, shown on hover and on keyboard focus after a short delay, and
above any panel that scrolls. The code style holds the rule, and review checks it.

On 2026-11-05 the user added these about how controls look:

- **Groups:** controls that belong together look joined, sharing their borders. These are the
  speed presets, the inspector's view toggles, and the speed box with its Set button.
- **Start button:** it stands out from the other buttons and shows the run's state, by icon as well
  as colour: ready, running, paused, ended, and failed.
- **States:** every control shows its state, such as hovered, pressed, focused, chosen, disabled,
  or wrong. A typed speed in use is marked in its box, as a chosen preset is, and choosing a preset
  clears the box and any error.
- **Follow button:** a small round button with a down arrow, floating at the bottom right of the
  event list.
- **Table columns:** in the event list and both views of the inspector, column widths can be
  resized by dragging, so a cut-off column can be widened. By module, a column resizes in all four
  tables at once, so they stay lined up. Widths last while the app stays open, and a reload resets
  them.
- **Smallest window:** the workspace keeps the width a 1280-pixel window leaves beside the
  sidebar. Below that it scrolls sideways, and the sidebar stays in place, so nothing is out of
  reach.
- **Table text:** 12 pixels in the event list and in both views of the inspector.
- **Status bar:** the run's state is a small pill coloured as the Start button is. Labels are grey
  and values dark.
- **Verdict:** a coloured banner says Passed or Failed, and each criterion has a green tick or a
  red cross, with any violations listed under it.
- **Sources:** each source in the event list is a small tinted badge in its own colour: orders
  teal, deliveries purple, actors grey. They no longer look like links.
- **Dividers:** a 1-pixel line that thickens and turns blue on hover or drag. The area that can be
  grabbed stays 6 pixels wide.
- **Read links:** blue, and underlined only on hover or keyboard focus.
- **Paused label:** the main button says Start when ready, Pause while running, and Resume when
  paused.
- **Runs page:** each built-in scenario is a card with its name and an Open button. A scenario file
  can be chosen or dropped on a dashed area.
- **Empty sections:** a section not built yet keeps its heading, and shows its description and a
  small "Not built yet" badge in a soft centred panel.
- **Workspace:** it fills the space up to the sidebar and status bar. The controls are a toolbar
  with a line beneath, and tables in every panel run edge to edge with the same padding inside.
- **Table spacing:** columns stay together at set widths from the left, and spare width goes to an
  empty area at the right. Numbers and times use digits of equal width, and `#` and Caused by align
  to the right.

### FND-77 — Event list and Payload viewer

- **The list:** every entry of the log, oldest first, with its number, simulated time, source
  module, kind, order, and what caused it. An entry that does not name its order shows the order of
  what caused it.
- **Following:** the list follows the newest entry while a run goes. Scrolling up or pressing an
  entry stops that, and a Follow button turns it back on. It stops on the press, not the click:
  in a moving list, a row that moves before the release would get no click.
- **Detail panel:** two tabs, Event and Verdict. Selecting an entry opens Event, and a run ending
  opens Verdict.
- **Payload viewer:** the entry's own facts, then its data as indented JSON, exactly as stored,
  with a Copy button. Caused by and Trace are links that select those entries.

The user decided these on 2026-11-04, in I02-E05-002.

### FND-78 — Outbox and inbox inspector

- **Place:** the first tab of the run workspace's main area. The city map becomes another tab
  beside it when it arrives.
- **Two views, with a toggle:** by flow, with a table for each direction, and each event's writing
  and reading on one row; and by module, with each module's outbox and inbox listed separately.
- **Each row:** the outbox event, its kind and order, when it was written and read, and how long it
  waited, or has waited so far. An event still waiting is highlighted, and each table's heading has
  its counts.
- **Clicking:** a row selects its outbox entry, and its read time is a link to the inbox read.
- **Retry records:** [FND-34](#fnd-34--required-capabilities) also asks for these. They arrive with
  retries, which the skeleton does not have yet.

The user decided these on 2026-11-04, in I02-E05-003.

### FND-79 — Cross-module event tracing

- **What it shows:** selecting an event shows every step of its trace, which is the whole action,
  and highlights the chain of causes and effects through the selected event. With nothing selected,
  a short hint says to select an event.
- **Form:** a sequence diagram with five lanes: the actor, the orders module, the orders outbox and
  inbox, the deliveries outbox and inbox, and the deliveries module.
- **Where:** a tab in the main area, beside the inspector. It follows the selected event, and the
  Payload viewer has a Show trace button that opens it.
- **Time:** one even row per step, with its time, and a mark such as `+25 s` where time passes
  between steps.
- **Rows:** each row has its time and label on the left, and a dot in its lane on the right, with
  the arrows joining the dots.
- **Step labels:** the entry's number and what happened in plain words: `#3 OrderDeliveryRequest`,
  `#6 Written: OrderDeliveryRequest`, `#8 Read: OrderDeliveryRequest`. The full ID shows on hover.
- **Clicking:** a step selects its entry, and the diagram stays on the same trace.
- **Arrows:** one per step, from its cause. Dashed from an outbox write to the inbox read that
  picks it up, and solid otherwise. The highlighted path is thicker and blue.
- **During a run:** new steps appear as they happen. An outbox write not yet read shows `waiting`
  in the inspector's amber, with a dashed arrow that stops short.

The user decided these on 2026-11-05, in I02-E05-004.

### FND-80 — Planning stage I03

The user chose these on 2026-11-05, in I03-E01-001.

- **Order of work:** the roadmap's epics, with Manual mode built in the first epic, so each path
  can be tried by hand as it arrives.
- **Built-in scenarios:** one for each path, about 10 to 15, with every command in at least one.
- **Retries before faults:** the retry jobs and the Pending command view are built in I03. A
  scenario can mark one call as failing, so a retry can be seen. I04's fault injection replaces
  that step.
- **Saved scenarios:** the Scenario library and Scenario recorder save to IndexedDB in I03, with
  the schema version and migration of [FND-57](#fnd-57--hosting-and-data). I05 extends that
  storage to runs and files.
- **Money:** amounts are whole minor units, held in a branded `Money` type. Rounding happens only
  where a rule divides.
- **Locations:** each driver in a scenario has an optional send interval, a preset or a value from
  5 seconds to 5 minutes, and steps can send a specific point or batch. I06 and I07 feed the same
  setting later.
- **Routing:** a stand-in provider returns the straight-line distance from restaurant to address,
  behind the interface I07 implements with streets. The simple failure step can make it fail.

### FND-81 — Runs as a tree of state transitions

The user stated this on 2026-11-05, in I03-E01-001, and settled the details there and in
I03-E02-001. The design is in
[Simulation engine](../modules/simulation-engine.md#how-a-run-is-held) and
[Run history](../modules/run-history.md). In the user's words:

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
[module communication](../versions/V1.0.0/module-communication.md#framework-and-library-behaviour)
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
[FND-80](#fnd-80--planning-stage-i03):

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
  adds two links to the [module map](../modules/README.md#dependency-graph): Run history to
  Simulation engine, and Verification to Run history.
- **The record of a run:** commits are the single record of a run, which amends
  [FND-56](#fnd-56--module-boundaries). The Event log stays a readable view worked out from them,
  with the contents it has today, so [FND-65](#fnd-65--event-log-entries) stands. Indirect effects
  add new log kinds when they are used.
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

- **Named streams stay:** [FND-66](#fnd-66--seeded-randomness) is unchanged. Stored effects are
  enough to replay a run, but the seed is still needed to make new commits the same way again.
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
  [FND-54](#fnd-54--tunability)'s tuning event shows in the log.
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
  [FND-57](#fnd-57--hosting-and-data)'s "kept until the user deletes them" for versions in use. A
  built-in scenario is stored the same way when a run of it is saved. I03-E02-008 builds this
  storage, and I03-E03-002's Scenario library builds on it.
- **Stage gate:** I03-E08-001 also waits for I03-E02-009 and I03-E02-016, where Run history's
  open work ends.
- **Run history uses Scenarios:** a new link in the
  [module graph](../modules/README.md#dependency-graph), for the scenario version a saved run
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

### FND-82 — Application core layer

The user stated this on 2026-11-06, in I03-E02-018, while choosing where typed log entries live:

> lets add an Application.Core layer it will have a dependency on the domain but the domain cant
> depend on it. so it will esentialy wrap the domain. things that can go in the domain might go
> in the core layer. it will be something between application and domain. all other layers can
> depend on the core layer, the infrastrucutre layrrs should not depend on the aplicaiton layer
> only the core layer. the ui layer can depend on the application layer.

So far this settles:

- **A new layer** sits between Application and Domain. It depends on Domain, and Domain cannot
  depend on it.
- **Every other layer** may depend on it.
- **Infrastructure** does not depend on Application.
- **UI** may depend on Application.

The user then chose:

- **What it holds:** a run's records and the pure steps that move a run on: commits, the main
  root, the timeline, the run's state, effects, config values, the cache, the typed log entry
  kinds, and the step functions. Application keeps the services and use cases, such as the
  service driving a run, the live scenario run, the clock, and the determinism check.
- **Interfaces:** the ones Infrastructure implements, such as the run repository and the wall
  clock, move to the new layer, because Infrastructure does not use Application.
- **Infrastructure** may use the new layer and Domain.
- **UI** may use Application, the new layer, and Domain.
- **Its folder** is `src/application-core`.
- **Its rules:** Domain's strict ones: no `let`, no mutation, and no classes, except abstract
  classes for the interfaces, which Angular uses as injection tokens.
- **Framework-free:** like Domain and Application, it imports no Angular and calls no browser
  API.
- **Application** may use the new layer and Domain.
- **Verification's reading of a run** moves to the new layer, because the typed log entry kinds
  live in its simulation engine folder and Domain cannot use them. Verification's criteria stay in
  Domain. The module map gains one link: Verification uses the Simulation engine, for run
  records.

### FND-83 — Types owned by their modules

The user asked on 2026-11-06 that IDs and other types live in their own modules: "ids and other
types should be on their respective modules and not put together into a shared module". The
user then chose:

- **Scope:** `src/domain/ids.ts` and `src/domain/quantities.ts` are split up. The shared helpers,
  such as `required`, `fields-of`, `version-chain`, `inbox-position`, and `digest-parts`, stay
  where they are.
- **Layout:** each ID sits beside the class it identifies, such as `OrderId` in `order.ts`.
- **Outbox IDs:** `OutboxEventId` splits into one ID for each module's outbox, each owned by that
  module.
- **The business does not know it is simulated:** in the user's words, "order, drivers and other
  domain types should not depend on simulation types dirctly, but the smulation can depend on
  business types, the busines types can depend on some abstraction that bothe modules can agree
  on, for examplte the SimType can be an implementation of an abstract time. in general teh
  domain types should not know they are been simulated, the should just depend on some world
  whose implementation is not known." So the business modules use abstractions, such as time,
  and the Simulation engine provides them: a simulated time is one implementation of an
  abstract time. The Simulation engine may use the business modules' types, and never the
  reverse.
- **A System module, by context:** "the term world is just to explain the concept, dont take it
  too literaly. the abstraction should depend on context, for example types about time, date,
  randomnes, math, etc should be in a system module". There is no World module: the
  abstractions about time, dates, randomness, and math go in a System module.
- **Time is an interface:** the abstract time is an interface, and the Simulation engine's
  `SimTime` implements it. Business code only uses the interface.
- **No Business rules module:** "business rules hould not ba a module on its own, the rules
  should be in their respective module,for example the order module contains the order busines
  rules, the drivers module the drivers business rules and so on". This replaces
  [FND-56](#fnd-56--module-boundaries)'s single catalog of rules: each module holds its own
  rules.
- **Business rules as an abstraction:** the user then revised this on 2026-11-07: "actully the
  business rules module should exist but only as an general abstract module for the purpouse of
  providing simualted rules, it should not know about specific modules rules. instead the
  specific modules should build their rules using the busines rules abstractions. for example
  the orders module should use busines rules types to write its rules. this should be done in a
  way so that that the rules that te orders module wrote are visible on the ui and can be
  modified manualy or automaticly by te simulator so we can simulate different scenarios." So
  Business rules stays, as a generic module of rule abstractions that knows no other module's
  rules. Each module writes its own rules with those abstractions, and the rules are visible in
  the UI and can be changed by hand or by the simulator. The user chose that I03-E02-019 moves
  each rule into its module and leaves Business rules the abstractions that exist today, the
  tuned values' checks, and that a new item in the Business rules epic designs and builds the
  rule abstractions, planned first for the user's review. The "Rules and decisions"
  capabilities stay with Business rules, since they work on any module's rules through the
  abstractions.
- **The System module's contents:** in `src/domain/system/`, abstractions only: time, with
  `Instant` as an interface, a `Duration`, and a clock for reading the time should the business
  ever need it; a random source as an interface, which the seeded random source implements;
  and math types, `Fraction`, `Count`, and `Position`. `VersionNumber` goes beside the version
  chain, `Metres` and `Degrees` to Map and routing, `Score` and `Factor` to the driver rules,
  `LogSequence` to the Event log, and `WallTime`, `Seed`, `RandomWord`, `SimTime`, and a clock
  speed of its own to the Simulation engine.
- **Duration is a value:** an immutable `Duration` class in System, made from milliseconds or
  seconds, since the rules state durations as fixed amounts.
- **Drivers and Deliveries:** "Deliveries should be a submodule of drivers just like in the real
  service". Drivers, in `src/domain/drivers/`, holds drivers, their availability and locations,
  and the driver rules: eligibility, ranking, and the notification order. Its submodule
  Deliveries, in `src/domain/drivers/deliveries/`, holds requests, assignments, notifications,
  and its outbox. In the module graph Drivers is one module, its submodule may use it, and other
  modules use Drivers as a whole.
- **Stored names follow:** log sources, stored function IDs, and the like are renamed to the new
  modules, so every pinned digest is recalculated once. The user chose on 2026-11-07 that a stored function ID
  names the module and its submodule, as the folders do: `drivers.deliveries.<name>@1` for the
  Deliveries submodule and `drivers.<name>@1` for Drivers itself. Delivery events keep the log
  source Deliveries, and driver events, such as a driver's status, location, or availability,
  get a new log source, Drivers. No driver function or driver event exists yet, so every
  stored function becomes `drivers.deliveries.<name>@1`, and every entry keeps the source
  Deliveries.
- **Two states:** the user chose on 2026-11-07 that the module's state splits in two: a
  `DriversState` in Drivers, with the drivers, their versions, and their order counts, and a
  `DeliveriesState` in Deliveries, with the requests, notifications, outbox, and inbox. Both sit
  in the main root. A command that changes both, such as accepting a request, is a Deliveries
  command that takes the drivers' state and gives back both. This changes how a run is
  persisted.
- **Tracking:** a new item in the Run history epic, after I03-E02-018, planned first for the
  user's review.
- **Restaurants and Customers:** "just like in the real service, the rastaurants is its own
  module with customers as submodule". Restaurants takes the place of Customers and restaurants,
  with Customers as its submodule, and owns `RestaurantId` and a restaurant's place.
- **Scripted steps:** a scripted step, with its actor and order name, moves to Scenarios, and the
  Simulation engine runs the steps through an interface of its own, so only Scenarios uses the
  engine. The user chose on 2026-11-07 that the engine defines its own input type, with a
  time, an actor, a command, and an order name of its own, and Scenarios converts each scripted
  step into one when it starts a run. What a run records keeps its shape, so persisted runs and
  digests do not change for it.
- **Pricing rules:** "they should go in their respective module jus like they do on the real
  service". Each pricing rule goes to the module that owns it in the real service, decided when
  it is built.
- **Time's cost:** if time held as objects makes a city day much slower or larger, the numbers
  go to the user before the work goes on.
- **Time, as built:** I03-E02-019-P04 named the interface `IInstant`, as the code style names
  every interface. Each moment carries how long after its timeline's start it is, as a
  `Duration`, so two moments compare whichever implementation made them, and it writes itself out
  for a digest as a plain number did, so no digest changed. A module's persisted records are
  loaded with an `InstantAt`, given by the run's own mapping, so Orders and Drivers never name the
  Simulation engine there either. An inbox now asks whether an event is too old to read, instead
  of working out a time to read from, so it never needs a run's start. The city day kept its
  digest, took 44.0 s against 45.4 s before, and peaked at 1,321 MB against 1,245 MB.
- **Numbers, as built:** I03-E02-019-P05 gave each module a `numbers.ts` with its branded numbers
  and their creators, the only place besides IDs and System's math where `as` is allowed:
  `Metres` and `Degrees` in Map and routing, `Score` and `Factor` in Drivers, `LogSequence` in the
  Event log, and `WallTime`, `Seed`, `RandomWord`, and a clock speed's `SpeedMultiple` in the
  Simulation engine. `VersionNumber` sits in `version-chain.ts`. `src/domain/quantities.ts` is
  gone.
- **IDs in a cycle:** the user chose on 2026-11-07 that where two classes hold each other's IDs,
  so that "beside the class" would make an import cycle, those IDs get a file of their own in
  their module instead: `OrderEventId`, `DeliveryEventId`, `CommitId`, and `SessionId`. Every
  other ID sits beside its class. `AreaId` and `VersionId`, with no class yet, have a file of
  their own in Map and routing and in Versions.
- **Scenarios uses Orders:** the user chose on 2026-11-07 that Scenarios may use Orders, for the
  orders a scenario's run holds, once `OrderId` left the shared file.
- **Rules for both modules:** Orders and Deliveries each hold their own communication values, for
  their own inbox, and the final order statuses go to Orders. As built in I03-E02-019-P03, Orders' values are
  its inbox job interval, its read lag, and its handoff retries, and Deliveries' are its inbox job
  interval and its read lag, with the same `V1.0.0` numbers as before. The config values in use
  hold both sets, so a config change's log entry records both, and its digest changes once.

### FND-84 — Rule abstractions

Business rules is a module of rule abstractions, which each module writes its own rules with
([FND-83](#fnd-83--types-owned-by-their-modules)). The user chose these on 2026-11-07, for
I03-E04-012:

- **A rule:** a named rule with parameters. Each rule is an object with an ID, a name, what it
  says, the decision or rules page it comes from, its typed parameters with their valid ranges,
  and the code that applies it. A module lists its rules in order. People and the simulator change
  a rule's parameters, never its code.
- **The rules written this way:** every rule the code applies: eligibility, ranking, the
  notification delay and limits, the dispatch pass, the communication values (the inbox jobs, the
  read lag, and the handoff retries), and the order lifecycle's allowed transitions. The pricing
  rules follow when they are built.
- **The simulator's changes:** a scenario can set rule parameters at its start and at stated
  times. Each change is a config change commit, so the run stays repeatable
  ([FND-54](#fnd-54--tunability)). Sweeps across many runs wait for Analysis.
- **The UI:** a Rules panel shows each module's rules, what they say, their source, and their
  current parameters, and lets a person change a parameter during a run, as a config change
  commit. The Rule editor capability, in `I06`, adds saving tuned rule sets as presets and
  versions.
- **Rule IDs:** `<module>.<rule-name>`, such as `drivers.fresh-location`, fixed once stored, as
  stored function IDs are. They carry no version: a change to a rule's logic is a new version of
  the service, which Versions owns.
- **Values outside their range:** a run uses them, as FND-54 allows, and the Rules panel and
  scenario reading warn. Only a value a run cannot use is refused.
- **The panel:** a tab in the run workspace, beside the Inspector and the Trace. It shows each
  rule's definition, source, values, defaults, ranges, and changes; which rule decided what is the
  Rule evaluation log's and the Decision explainer's (`I03-E04-007`, `I03-E04-008`).
- **Valid ranges:** no source states them, so for each module's rules the simulator proposes a
  range for every parameter, and the user reviews it before it goes into the code.
- **Drivers' rules:** the user accepted the proposed rule IDs, kinds, and ranges on 2026-11-07,
  as [Drivers](../modules/drivers.md#rules) lists them. The ranking score's proximity scale and
  load divisor become parameters too, and the dispatch pass is a calculation, of the next pass's
  time.
- **Orders' and Deliveries' rules:** the user accepted the proposed rule IDs, kinds, and ranges
  on 2026-11-07, as [Orders](../modules/orders.md#rules) and [Drivers](../modules/drivers.md#rules)
  list them. Each inbox job and the handoff retry job is a calculation of its next run's time, and
  each read lag and the retries per run is a limit. The order lifecycle's allowed transitions are
  one check per transition, for the statuses it is allowed from; the other guards, such as the
  assigned driver and readiness, stay in the code.
- **Module graph:** the user added three edges on 2026-11-07. The Simulation engine tunes rules
  through Business rules, so a config change takes parameter changes by rule ID and routes each
  to the module that owns the rule; Scenarios sets rules through it, so reading a scenario checks
  rule IDs and values; and Business rules uses the Simulation engine for the run's rules, since
  the Rules panel is Business rules', as a tool that works on any module's rules.
- **Rules in a scenario file:** the user chose on 2026-11-07 that a top-level `rules` list sets
  values in the run's start, with no commit, and a step with `set` in place of an actor, a
  command, and an order changes them at its time, as a config change commit. Each entry names a
  rule, a parameter, and a value. A duration is written in the format's time notation; other
  values are plain numbers. Reading a scenario gives its warnings with it, each with its place,
  for a value outside its valid range; the command line prints them. The browser goes straight to
  the live run when a scenario opens, so the user chose on 2026-11-07 that the run workspace
  shows them in a strip right below its run controls, styled like a scenario's problems, until
  another scenario opens.
- **As built:** in I03-E04-012, on 2026-11-07. A person writes a value in the Rules panel as a
  scenario file writes it, and a change made there is a config change commit at the run's
  current time. Drivers' eligibility calls each check by name, since going through the checks as
  a list made the city day about 12% slower.

### FND-85 — System submodules

The user asked on 2026-11-07 that the shared helpers at the root of `src/domain` move into the
System module ([FND-83](#fnd-83--types-owned-by-their-modules)): "helper types like fieldsof,
unreachable, should [not] be in the domain root, instea they should be in the sustem moduel in
their respective submodues, for exapmle timer related type should be in the time submodule,
validation related types in the validations submodule". The user then chose, for I03-E02-020:

- **Submodules:** System holds eight, each a folder in `src/domain/system/`: `time` (`IInstant`,
  `Duration`, the clock, and their test helpers), `randomness` (the random source), `math`
  (`Count`, `Position`, `Fraction`, and `isWhole`), `validation` (`required`, `unreachable`, and
  `refuse`), `classes` (`FieldsOf`, and the `deepFrozen` test helper, since both serve the
  immutable-class pattern), `digests` (how a record is written out for a digest, and `allTrue`),
  `records` (a record's version chain), and `messaging` (how far an inbox has read).
- **The domain root:** it holds module folders only, and the architecture check refuses a file
  added there.
- **Infrastructure's root:** it holds module folders only too. Its shared files move into an
  Infrastructure System folder that mirrors the domain's: `json` (the JSON value and the JSON
  check, which only Infrastructure makes), `records` (how grouped records and counts are
  persisted), `messaging` (a persisted inbox and its position), and `functions` (the stored
  function contract that the modules' functions register with).
- **Tracking:** a new item, I03-E02-020, planned first. The user approved its plan on 2026-11-07.

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

## Superseded when implemented

These stay in force until the item named builds what replaces them. Once it has, the row says when:

| Statement | Replaced by | When |
| --- | --- | --- |
| [FND-73](#fnd-73--immutable-architecture): scheduled work and each random stream's position are in a run's state | Worked out, or held in the effects sub-root ([FND-81](#fnd-81--runs-as-a-tree-of-state-transitions)) | I03-E02-006, built 2026-11-06 |
| [FND-56](#fnd-56--module-boundaries): the Event log holds a run's record | Commits hold it, and the log is worked out from them ([FND-81](#fnd-81--runs-as-a-tree-of-state-transitions)) | I03-E02-006, built 2026-11-06 |
| [FND-83](#fnd-83--types-owned-by-their-modules): the shared helpers, such as `required` and `fields-of`, stay at the root of `src/domain` | Each sits in a System submodule, and the Domain and Infrastructure roots hold module folders only ([FND-85](#fnd-85--system-submodules)) | I03-E02-020, built 2026-11-07 |
| [FND-81](#fnd-81--runs-as-a-tree-of-state-transitions): a `ConfigChanged` entry holds the values before and after | It holds each changed value, by rule and parameter ID, before and after; the commit's effect still holds every module's rules before and after ([FND-84](#fnd-84--rule-abstractions)) | I03-E04-012, built 2026-11-07 |

## Undecided

| ID | Question | Why it matters |
| --- | --- | --- |
| U12 | How soon after a new version of the real service is designed or built must the simulator support it? | FND-32 measures success by it |
| U13 | Which module owns the later Report generator? | Decided when it is built (FND-35) |
| U14 | Where is the project hosted and published, and how is FND-23 checked before it is? | The project must stay safe to publish (FND-23); the check in FND-63 cannot see names, git history, or commit authors |

## Rule for resolving an unknown

Resolve each item through a user-approved decision, then move it into
[Approved decisions](#approved-decisions) and update
[open decisions](../governance/open-decisions.md). Do not build on an undecided
item.
