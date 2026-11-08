# V1.0.0 — Lifecycle

## Version and status

- **Version:** `V1.0.0`, a built snapshot
  ([FND-40](../../decisions/project-foundation.md#fnd-40--kinds-of-version)).
- **State described:** the real service's working tree on 2026-11-03, including uncommitted
  changes and the module copies, which are built and awaiting the real service's review
  ([FND-45](../../decisions/project-foundation.md#fnd-45--version-folder-layout)).
- **Status:** Observed in the real service's code, and confirmed by the user on 2026-11-03.
  I01-E02-001
  recorded the confirmation.

## States

An order has one status. It starts as `Created`. `Delivered`, `OrderReturned`, and `Cancelled`
are final: no event is allowed after them, except the payment return events after
`OrderReturned`.

| Status | Meaning |
| --- | --- |
| `Created` | The order exists, with no open delivery request and no driver assigned |
| `DeliveryRequested` | A delivery request is open |
| `DriverAssigned` | A driver accepted the request and has not picked the order up |
| `PickedUp` | The driver holds the order |
| `DeliveryAttemptFailed` | A delivery attempt failed; the driver still holds the order |
| `Delivered` | Final: the order was delivered |
| `OrderReturned` | Final: the restaurant accepted the return and holds the order again |
| `Cancelled` | Final: the restaurant cancelled the order |

## Order version

An order starts at version 1, and each saved change adds one. A delivery request adds two: one
when it is saved as pending, without changing the status, and one when deliveries acknowledges
it and the status changes. Observed in the real service's code on 2026-11-04.

## Pending requests and flags

Besides the status, the order's history tracks requests that block other actions while pending:

- a pending reassignment request;
- a pending cash (payment) confirmation request, and whether one was accepted;
- a pending return request;
- a pending payment return request, and whether one was accepted;
- whether readiness has been recorded.

## Transitions

The orders module decides whether each event is allowed and which status follows it. The
deliveries module applies its own rules to the events it decides; those are in the business
rules page, not written yet.

| Event | Allowed from | Status after | Also requires |
| --- | --- | --- | --- |
| `OrderDeliveryRequest` | Created | DeliveryRequested | — |
| `OrderDeliveryRequestCancelled` | DeliveryRequested | Created | — |
| `OrderDeliveryRequestRejected` | DeliveryRequested | Created | — |
| `OrderDeliveryRequestAccepted` | DeliveryRequested | DriverAssigned | — |
| `OrderDeliveryRequestAcceptanceCancelled` | DriverAssigned | Created | No reassignment pending |
| `OrderReady` | Created, DeliveryRequested, DriverAssigned | Unchanged | Recorded at most once |
| `OrderCancelled` | Created | Cancelled | — |
| `OrderPickedUp` | DriverAssigned | PickedUp | Readiness recorded |
| `OrderDelivered` | PickedUp, DeliveryAttemptFailed | Delivered | No confirmation, return, or reassignment pending |
| `OrderDeliveryFailed` | PickedUp | DeliveryAttemptFailed | No confirmation or return pending |
| `OrderDeliveryReassignRequest` | DriverAssigned, PickedUp, DeliveryAttemptFailed | Unchanged | No reassignment, confirmation, or return pending |
| `OrderDeliveryReassignRequestAccepted` | Any non-final | Unchanged; assignment and custody move | A reassignment pending |
| `OrderDeliveryReassignRequestRejected` | Any non-final | Unchanged | A reassignment pending |
| `OrderDeliveryReassignRequestCancelled` | Any non-final | Unchanged | A reassignment pending |
| `OrderPaymentConfirmationRequest` | PickedUp, DeliveryAttemptFailed | Unchanged | No confirmation or return pending |
| `OrderPaymentConfirmationRequestCancelled` | Any non-final | Unchanged | A confirmation pending |
| `OrderPaymentConfirmationAccepted` | Any non-final | Unchanged | A confirmation pending |
| `OrderPaymentConfirmationRejected` | Any non-final | Unchanged | A confirmation pending |
| `OrderReturnedRequest` | DeliveryAttemptFailed | Unchanged | No confirmation, return, or reassignment pending |
| `OrderReturnedRequestAccepted` | Any non-final | OrderReturned | A return pending |
| `OrderReturnedRequestRejected` | Any non-final | Unchanged | A return pending |
| `OrderPaymentReturnRequest` | PickedUp, DeliveryAttemptFailed, OrderReturned | Unchanged | A cash confirmation accepted; no payment return accepted or pending; no confirmation or reassignment pending |
| `OrderPaymentReturnRequestAccepted` | Any, including OrderReturned | Unchanged | A payment return pending |
| `OrderPaymentReturnRequestRejected` | Any, including OrderReturned | Unchanged | A payment return pending |
| `OrderPaymentReturnRequestCancelled` | Any, including OrderReturned | Unchanged | A payment return pending |

## Source conflicts resolved for this version

These follow [FND-39](../../decisions/project-foundation.md#fnd-39--source-conflicts-resolved):
a return can be requested only after a failed delivery attempt, and accepting a return never
waits for a payment return. A driver's rejection closes the request, and an ignore leaves it
open for other drivers.
