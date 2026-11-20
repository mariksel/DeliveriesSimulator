# Project foundation — Correctness and success

What correct means, for the business and technically, what the results decide, and how success is
measured. This is part of the [project foundation](../project-foundation.md), which holds
its version, authority, and undecided questions, and lists where each record is.

## Approved decisions

### FND-29 — Business correctness

A run is correct for the business when all of the following hold. The targets and limits they
refer to are set as [FND-50](simulation-model.md#fnd-50--targets-and-limits) describes.

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
[I01-E01-001](../../../backlogs/Initiatives/Archive/Done/I01-requirements-and-backlog-creation/Archive/Done/I01-E01-vision-and-scope/Archive/Done/High/I01-E01-001-confirm-purpose-and-success.md)
tracks the question.

### FND-30 — Technical correctness

A run is technically correct when all of the following hold. The time bound and clock limits
they refer to are set as [FND-50](simulation-model.md#fnd-50--targets-and-limits) describes.

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
[I01-E01-001](../../../backlogs/Initiatives/Archive/Done/I01-requirements-and-backlog-creation/Archive/Done/I01-E01-vision-and-scope/Archive/Done/High/I01-E01-001-confirm-purpose-and-success.md)
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
[I01-E01-001](../../../backlogs/Initiatives/Archive/Done/I01-requirements-and-backlog-creation/Archive/Done/I01-E01-vision-and-scope/Archive/Done/High/I01-E01-001-confirm-purpose-and-success.md)
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
[I01-E01-001](../../../backlogs/Initiatives/Archive/Done/I01-requirements-and-backlog-creation/Archive/Done/I01-E01-vision-and-scope/Archive/Done/High/I01-E01-001-confirm-purpose-and-success.md)
tracks the question.

### FND-75 — First criteria as judged

- **Evidence:** the checker reads a run from its event log alone, so it judges what the run did and
  not what the code says it did.
- **When:** at the end of a run. Checking the named invariants at every step comes later, with
  those invariants.
- **Settled at the end:** a run that stops with an outbox event unread fails Modules agree and
  Exactly-once effect, following
  [FND-49](simulation-model.md#fnd-49--scenarios).
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
