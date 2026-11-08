# V1.0.0 — Actors and Commands

## Version and status

- **Version:** `V1.0.0`, a built snapshot
  ([FND-40](../../decisions/project-foundation.md#fnd-40--kinds-of-version)).
- **State described:** the real service's working tree on 2026-11-03, including uncommitted
  changes and the module copies, which are built and awaiting the real service's review
  ([FND-45](../../decisions/project-foundation.md#fnd-45--version-folder-layout)).
- **Status:** Observed in the real service's code, and confirmed by the user on 2026-11-03.
  I01-E02-001
  recorded the confirmation.

## Actors

- **Restaurant staff:** create orders, request and cancel delivery, mark orders ready, cancel
  orders, and answer the driver's requests.
- **Drivers:** set their status, send their location, and act on the orders they are offered or
  hold.
- **Back-office staff:** manage driver accounts, change a driver's status, and unlock
  accounts.
- **The system:** background jobs that dispatch requests, read each module's outbox, retry, send
  notifications, and clean up.

## Restaurant commands

Every command except order creation names the order and takes an idempotency key.

| Command | Route segment | Decided by | Result |
| --- | --- | --- | --- |
| Create an order | — | Orders | Order created as `Created` |
| Request delivery | `delivery-request` | Orders, then handed off to deliveries | `OrderDeliveryRequest` |
| Mark ready | `ready` | Orders | `OrderReady` |
| Cancel the delivery request | `cancel-delivery-request` | Deliveries decides first; orders records the answer | `OrderDeliveryRequestCancelled`, or a refusal |
| Cancel the order | `cancel` | Orders | `OrderCancelled` |
| Accept or reject a cash confirmation | `payment-confirmation/accept`, `/reject` | Orders | `OrderPaymentConfirmationAccepted` or `Rejected` |
| Accept or reject a return | `return-request/accept`, `/reject` | Orders | `OrderReturnedRequestAccepted` or `Rejected` |
| Accept or reject a payment return | `payment-return-request/accept`, `/reject` | Orders | `OrderPaymentReturnRequestAccepted` or `Rejected` |

## Driver commands on an order

Each takes an idempotency key, except ignore. Commands deliveries decides alone answer with the
delivery event; commands that call orders store a pending request first, then answer with the
orders result.

| Command | Route segment | Decided by | Result |
| --- | --- | --- | --- |
| Accept the delivery request | `delivery-request/accept` | Deliveries alone | `OrderDeliveryRequestAccepted` |
| Reject the delivery request | `delivery-request/reject` | Deliveries alone | `OrderDeliveryRequestRejected` |
| Ignore the notification | `delivery-request/ignore` | Deliveries alone | No event; frees the notification slot |
| Cancel the acceptance | `assignment/cancel` | Deliveries alone | `OrderDeliveryRequestAcceptanceCancelled` |
| Pick up | `pickup` | Orders, called by deliveries | `OrderPickedUp` |
| Deliver | `deliver` | Orders, called by deliveries | `OrderDelivered` |
| Report a failed delivery | `delivery-failure` | Orders, called by deliveries | `OrderDeliveryFailed` |
| Request a cash confirmation | `payment-confirmation-request` | Orders, called by deliveries | `OrderPaymentConfirmationRequest` |
| Cancel the cash confirmation | `payment-confirmation-request/cancel` | Orders, called by deliveries | `OrderPaymentConfirmationRequestCancelled` |
| Request a reassignment | `reassignment-request` | Orders, called by deliveries | `OrderDeliveryReassignRequest` |
| Cancel the reassignment request | `reassignment-request/cancel` | Deliveries alone | `OrderDeliveryReassignRequestCancelled` |
| Accept a reassignment (target) | `reassignment-request/accept` | Deliveries alone | `OrderDeliveryReassignRequestAccepted` |
| Reject a reassignment (target) | `reassignment-request/reject` | Deliveries alone | `OrderDeliveryReassignRequestRejected` |
| Request a return | `return-request` | Orders, called by deliveries | `OrderReturnedRequest` |
| Request a payment return | `payment-return-request` | Orders, called by deliveries | `OrderPaymentReturnRequest` |
| Cancel the payment return | `payment-return-request/cancel` | Deliveries alone | `OrderPaymentReturnRequestCancelled` |

## Other driver commands

- **Status:** go online, go offline, and set the availability to available, busy, or free for
  delivery; also read the current state.
- **Location:** send one point over the live connection, or a batch of points as a fallback.
- **Devices:** register the device, and register it for push notifications.
- **Sessions:** sign in, refresh, and sign out.

## Back-office commands

- **Driver accounts:** create, edit, change the email, and reset the password.
- **Driver status:** the same status commands as drivers, for any driver.
- **Login lockout:** read and unlock.

## System jobs

| Job | Runs | Does |
| --- | --- | --- |
| Dispatch | Every 30 seconds | Re-checks eligibility and rank, and notifies at most one driver per open request |
| Deliveries inbox | Every 5 seconds | Reads the orders outbox, all kinds except `Unknown` |
| Orders inbox | Every 5 seconds | Reads the deliveries outbox |
| Handoff retry | Every 5 seconds | Retries delivery request handoffs still pending |
| Pending command retry | Every 5 seconds | Repeats pending orders calls of driver commands |
| Push sending | Every 5 seconds | Sends due notifications and calls the senders' handlers |
| Restaurant notifications | Every 5 seconds | Turns accepted delivery requests into restaurant pushes |
| Cleanups | Daily | Remove expired outbox, inbox, retry, idempotency, notification, and location records |
