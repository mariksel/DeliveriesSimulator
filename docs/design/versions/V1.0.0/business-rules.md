# V1.0.0 — Business Rules

## Version and status

- **Version:** `V1.0.0`, a built snapshot
  ([FND-40](../../decisions/project-foundation.md#fnd-40--kinds-of-version)).
- **State described:** the real service's working tree on 2026-11-03
  ([FND-45](../../decisions/project-foundation.md#fnd-45--version-folder-layout)).
- **Status:** Observed in the real service's code, and confirmed by the user on 2026-11-03.
  I01-E02-002
  recorded the confirmation.

Every value and rule on this page is tunable
([FND-25](../../decisions/project-foundation.md#fnd-25--simulatable-visible-and-tunable)), and
rules can be replaced, not only their values (the Rule editor in
[FND-34](../../decisions/project-foundation.md#fnd-34--required-capabilities) ). Every decision
shows why it was made (the Decision explainer). The allowed transitions of an order are in the
[lifecycle](lifecycle.md).

## Eligibility

A driver is eligible for a request when every rule holds. The rules are checked in this order,
and the first that fails is the reason given:

| Order | Rule | Value |
| --- | --- | --- |
| 1 | The driver's service area is the restaurant's | — |
| 2 | The driver is online, in any availability | — |
| 3 | The driver's latest location is fresh, by its device time; no location counts as stale | At most 5 minutes old |
| 4 | The straight-line distance to the restaurant is short enough | Under 3 km |
| 5 | The driver is not busy: busy means carrying many picked-up orders while far from the restaurant | Busy at 5 or more picked-up orders and over 500 m away |

- **Distance:** straight-line, on a sphere with a radius of 6,371 km, in metres, not rounded.
- **Picked-up orders:** orders `PickedUp` or `DeliveryAttemptFailed` whose latest accepted
  assignment is the driver's.
- **Where it is checked:** accepting or rejecting a request, being the target of a reassignment
  request, and accepting a reassignment. Commands on orders the driver already holds do not
  check eligibility, so going offline never blocks them.

## Ranking

Each eligible driver gets a score between 0 and 1. A higher score is notified first.

| Part | Rule | Value |
| --- | --- | --- |
| Proximity | `e^(-distance in km)`, distance to the restaurant | — |
| Load | `e^(-held orders / 2)` | Held orders are those `DriverAssigned`, `PickedUp`, or `DeliveryAttemptFailed` with the driver's latest accepted assignment |
| Score | Proximity × load × the availability boost, capped at 1 | Available × 1, Busy × 0.5, FreeForDelivery × 2 |
| Delay | `maximum delay × e^(-decay × score)`; never zero | Maximum delay 2 minutes, decay 5 |

Equal scores are not ordered: the real service sorts by score alone, over a database read with
no order. The simulator breaks a tie by the lowest driver ID, and goes through open requests
oldest first
([FND-68](../../decisions/project-foundation.md#fnd-68--equal-scores-and-open-request-order)).

## Notification sequence

A dispatch pass runs every 30 seconds. For each open request it re-checks eligibility and
ranking from current state, then notifies at most one driver:

- **Outstanding limit:** nothing is sent while 5 drivers hold an unanswered notification for
  the request. Only an explicit ignore frees a slot.
- **No repeats:** a driver is never notified twice about the same request generation. A new
  delivery request starts a new generation.
- **First notification:** sent at once, to the best-ranked eligible driver.
- **Later notifications:** to the best-ranked remaining driver whose delay is at most 60
  seconds, once the previous notification's time plus that delay has passed. A lower-ranked
  driver never overtakes a better-ranked one.
- **Claimed first:** a notification is claimed before it is sent, so a repeated pass sends
  nothing new.
- **Open request:** a request is open while the latest of its request, cancel, acceptance, and
  rejection events is the request itself. Readiness and the order being cancelled do not close
  it.

## Acceptance and the decisions deliveries makes alone

| Event | Requires | Who may |
| --- | --- | --- |
| Accept a request | An open request; the driver is eligible. The first valid acceptance wins; later ones are refused as a conflict | Any eligible driver |
| Reject a request | An open request; the driver is eligible; a reason. The rejection closes the request | Any eligible driver |
| Ignore a notification | A notification the driver holds for the open request. No event; the request stays open | The notified driver |
| Cancel an acceptance | The order is assigned and not picked up, delivered, or returned; no reassignment pending | The assigned driver |
| Accept or reject a reassignment | A pending reassignment; accepting also needs eligibility | Its target driver |
| Cancel a reassignment request | A pending reassignment | The driver who requested it |
| Cancel a payment return request | A pending payment return request; a reason | The driver who requested it |

A reason is trimmed, must not be blank, and is at most 500 characters.

## Driver status and location

- **Status:** a driver is `Offline`, or `Online` with one availability: `Available`, `Busy`, or
  `FreeForDelivery`. Going online starts as `Available`; going offline drops the availability;
  the availability changes only while online. Asking for the current status records nothing.
- **When locations are kept:** while the driver is online, or holds an active order. Otherwise
  a location is refused.
- **Point limits:** a point's device time is at most 24 hours old and at most 1 minute in the
  future. A batch holds 1 to 100 points.
- **Current location:** the point with the newest device time; a late batch never replaces a
  fresher position.
- **History:** at most one point per driver in each 30-second window, aligned to the epoch. The
  first point stored for a window wins; a late point may fill an empty window.

## Orders and prices

| Rule | Value |
| --- | --- |
| Quantity of each product line | 1 to 999 |
| Preparation time | 0 to 120 minutes; the unit was confirmed by the user on 2026-11-03 |
| Product line positions | Exactly 1 to the number of lines |
| Expected prices | Must match the current prices, or the order is refused |
| Restaurant price | The sum of each line's restaurant price × quantity |
| Customer price | The sum of each line's customer price × quantity, plus the delivery fee |
| Delivery fee band | The band of the restaurant's service area whose range covers the estimated distance, both ends included. Where bands overlap, the one starting lowest wins, then the oldest. No band means the order is refused |
| Commission | Markup: none, because the margin is in the customer prices. Percentage, or markup and percentage: the restaurant price × the percentage |
| Cash handed to the restaurant | The order's restaurant price |
| Estimated distance | The routing provider's route distance; if the provider fails temporarily, the stored address distance, with travel time at 20 km/h |
| Currency | One fixed currency |
