# V1.0.0 — Failures

## Version and status

- **Version:** `V1.0.0`, a built snapshot
  ([FND-40](../../decisions/project-foundation.md#fnd-40--kinds-of-version)).
- **State described:** the real service's working tree on 2026-11-03
  ([FND-45](../../decisions/project-foundation.md#fnd-45--version-folder-layout)).
- **Status:** Observed in the real service's code and documents, and confirmed by the user on
  2026-11-03.
  I01-E02-004
  recorded the confirmation.

Each entry names the failure, what the real service does, and what can still go wrong. The IDs
are the simulator's, except C1 to C4, which are the real service's own conflict cases. The
mechanisms are in the [module communication](module-communication.md) page.

## Races between the modules

| ID | Race | What happens |
| --- | --- | --- |
| C1 | A driver picks up before orders has applied the acceptance | Orders sees no assigned driver and refuses with a conflict; the driver retries |
| C2 | A driver cancels the acceptance after the pickup succeeded | Deliveries has recorded the pickup and refuses the cancel itself |
| C3 | The orders call succeeds, but saving the deliveries state fails | The request stays pending; a retry with the same key gets the orders result again, and deliveries saves it. The inbox can also recreate the event from its copy |
| C4 | The restaurant cancels while orders has not applied the acceptance, or the rejection | Orders asks deliveries first; deliveries refuses, and orders answers the restaurant with a conflict |
| R1 | Several drivers accept the same request at once | The first valid acceptance wins; the others are refused as a conflict |
| R2 | Two status changes for one driver at once | The change is compare-and-swap; the loser retries up to three times against the newer status, then reports a conflict |
| R3 | Location points arrive late or out of order | The newest device time wins for the current location; the first point stored wins each history window |
| R4 | Events are read out of order | Only a newer version replaces a copy's stored status |

## Give-ups that can leave the modules apart

| ID | Failure | What happens | What can still go wrong |
| --- | --- | --- | --- |
| D1 | An inbox keeps failing on one event | After 15 minutes the event is dead-lettered and never applied | The reading module's state and copy stay behind the other's, for example orders still shows a request open that deliveries has assigned |
| D2 | An event leaves the outbox before it is read | It expires after 7 days; a retry due after that dead-letters it | As D1; a copy made from history then has no version |
| D3 | A pending driver command fails for 15 minutes | It is dead-lettered | If orders did apply it, deliveries recreates its own event when the inbox reads it; if that also fails, the modules stay apart |
| D4 | A handoff or restaurant cancel can never succeed | The job retries every 5 seconds with no backoff and no giving up | The request stays pending forever, and nothing reports it |

## Duplicates and repeats

- **Repeated commands:** idempotency keys replay the first answer; a key reused with a different
  request is a conflict.
- **Repeated reads:** the read lag makes an inbox see events again; events already in its inbox
  are skipped.
- **Repeated dispatch passes:** a notification is claimed before it is sent, so a repeat sends
  nothing new.
- **Repeated pushes:** a push whose lease runs out is sent again; the device drops the copy by
  its identifier.
- **Repeated callbacks:** a callback can arrive more than once, with the same identifier.

## Timing and clocks

- **Stale locations:** a driver whose location is more than 5 minutes old drops out of
  dispatch; the send interval is an option switch ([V1.0.0](README.md)).
- **Device clocks:** points more than 24 hours old or 1 minute in the future are refused.
- **Missed ticks:** a job tick missed during downtime runs once afterwards; an overlapping
  dispatch tick is skipped.

## Outside failures

- **Routing provider:** a temporary failure falls back to the stored address distance; other
  failures refuse the order, as unavailable or as a bad answer.
- **Push provider:** temporary failures are retried up to 5 times; an invalid device is removed;
  other errors are permanent failures.
- **Devices:** a device can be offline, in the background, or receive duplicates
  ([FND-46](../../decisions/project-foundation.md#fnd-46--simulation-detail)).

## Data problems

- **Unknown kinds:** an outbox event of a kind the reader does not know is not read.
- **Missing related data:** an order read that finds related data missing fails explicitly,
  rather than returning part of the order.
- **No fee band:** an order whose distance no delivery fee band covers is refused.
