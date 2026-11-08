# V1.0.0 — Events

## Version and status

- **Version:** `V1.0.0`, a built snapshot
  ([FND-40](../../decisions/project-foundation.md#fnd-40--kinds-of-version)).
- **State described:** the real service's working tree on 2026-11-03, including uncommitted
  changes and the module copies, which are built and awaiting the real service's review
  ([FND-45](../../decisions/project-foundation.md#fnd-45--version-folder-layout)).
- **Status:** Observed in the real service's code, and confirmed by the user on 2026-11-03.
  I01-E02-001
  recorded the confirmation.

## Event kinds

Both modules use the same 25 event kinds, named alike. Each module keeps its own record of every
kind, and a read-only copy of the other module's order or delivery and its events. The module
that decides an event writes it first; the other records it when it reads the decider's outbox,
or from the call that decided it.

| Kind | Started by | Decided by |
| --- | --- | --- |
| `OrderDeliveryRequest` | Restaurant | Orders |
| `OrderDeliveryRequestCancelled` | Restaurant | Deliveries |
| `OrderDeliveryRequestRejected` | Driver | Deliveries |
| `OrderDeliveryRequestAccepted` | Driver | Deliveries |
| `OrderDeliveryRequestAcceptanceCancelled` | Driver | Deliveries |
| `OrderReady` | Restaurant | Orders |
| `OrderCancelled` | Restaurant | Orders |
| `OrderPickedUp` | Driver | Orders |
| `OrderDelivered` | Driver | Orders |
| `OrderDeliveryFailed` | Driver | Orders |
| `OrderDeliveryReassignRequest` | Driver | Orders |
| `OrderDeliveryReassignRequestAccepted` | Target driver | Deliveries |
| `OrderDeliveryReassignRequestRejected` | Target driver | Deliveries |
| `OrderDeliveryReassignRequestCancelled` | Driver | Deliveries |
| `OrderPaymentConfirmationRequest` | Driver | Orders |
| `OrderPaymentConfirmationRequestCancelled` | Driver | Orders |
| `OrderPaymentConfirmationAccepted` | Restaurant | Orders |
| `OrderPaymentConfirmationRejected` | Restaurant | Orders |
| `OrderReturnedRequest` | Driver | Orders |
| `OrderReturnedRequestAccepted` | Restaurant | Orders |
| `OrderReturnedRequestRejected` | Restaurant | Orders |
| `OrderPaymentReturnRequest` | Driver | Orders |
| `OrderPaymentReturnRequestAccepted` | Restaurant | Orders |
| `OrderPaymentReturnRequestRejected` | Restaurant | Orders |
| `OrderPaymentReturnRequestCancelled` | Driver | Deliveries |

## Outbox kinds

- **Orders outbox:** the 25 event kinds, plus `DeliveryRequestCancelRefused`, written when
  deliveries refuses a restaurant's cancel of a delivery request.
- **Deliveries outbox:** the 25 event kinds, plus `DriverCommandRefused`, written when a pending
  driver command is refused after the driver stopped waiting.
- **`Unknown`:** both outboxes reserve `Unknown` for a kind the reader does not recognise; the
  readers skip it. Each module reads every other kind the other publishes; the two refusal kinds
  are marked read and leave no copy.

## Copies in this version

Each module keeps a read-only copy of the other's data, so neither needs to call the other for
history:

- **Deliveries' copy of the order:** the order's core fields, recipient, products, delivery
  details, and price details, copied by value. It is made once at handoff from the orders read,
  with all events so far; after that, only the orders outbox updates it, and only a newer
  version replaces the stored status.
- **Orders' copy of the delivery:** made when deliveries acknowledges the handoff, and saved in
  the same transaction that completes the request. Its events arrive through the deliveries
  outbox.
- **A missing own event:** when deliveries reads a driver command event that it has not
  recorded itself, it stores the copy, creates its own event from it, and marks any pending
  command request Done, all in one transaction.
- **Links:** each copy stores the IDs of the source event and of the matching event on the other
  side.
- **Order history before its outbox event:** a copy made from history has no version until its
  outbox event is read, and keeps none if that event has expired.

How these steps run and retry is in the [module communication](module-communication.md) page.
