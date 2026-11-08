# V1.1.0-planned-dispatch — Events

## Version and status

- **Version:** `V1.1.0-planned-dispatch`, an approved design
  ([FND-40](../../decisions/project-foundation.md#fnd-40--kinds-of-version)), based on
  [`V1.0.0`](../V1.0.0/README.md).
- **Sources:** the real service's approved requirements for dispatch notifications and for
  driver reads, and its dispatch design records. None of these changes is built yet.
- **Status:** confirmed by the user on 2026-11-03.
  I01-E02-001
  recorded the confirmation.

## Changes from V1.0.0

The event kinds and outbox kinds of [V1.0.0 events](../V1.0.0/events.md) do not change. This
version adds notifications, which are sent because of those events. Each must reach the device
even when the app is in the background or closed.

## Driver notifications

| Notification | Change |
| --- | --- |
| New delivery request | Built in `V1.0.0` |
| A request the driver was notified about was claimed by another driver, or closed | New: lets the alert be dismissed |
| The driver lost eligibility, with the reason, such as a stale location or being outside the area | New |
| Reassignment: the target, when a request is made to them and when the requester cancels it | New |
| Reassignment: the requester, when the target accepts or rejects | New |
| Reassignment: the original driver, when the assignment and custody move | New |
| The restaurant's decision on the driver's cash confirmation, return, or payment return request | New |
| The order was marked ready | New |
| The restaurant cancelled the delivery request | New |

## Restaurant notifications

| Notification | Change |
| --- | --- |
| A delivery request was accepted | Built in `V1.0.0` |
| A delivery request was rejected | New |
| An accepted assignment was cancelled | New |
| A reassignment was accepted | New; other reassignment steps are not notified |
| The order was picked up, delivered, or a delivery failed | New |
| A cash confirmation, return, or payment return request was made, or cancelled | New |
| Live events in the restaurant's open portal | New |
