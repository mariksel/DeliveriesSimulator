# V1.0.0 — Module Communication

## Version and status

- **Version:** `V1.0.0`, a built snapshot
  ([FND-40](../../decisions/project-foundation.md#fnd-40--kinds-of-version)).
- **State described:** the real service's working tree on 2026-11-03
  ([FND-45](../../decisions/project-foundation.md#fnd-45--version-folder-layout)).
- **Status:** Observed in the real service's code, and confirmed by the user on 2026-11-03.
  I01-E02-003
  recorded the confirmation.

The simulation models all of this in full detail, down to individual records, including the push
pipeline and devices
([FND-46](../../decisions/project-foundation.md#fnd-46--simulation-detail)). Every timing and
limit is tunable
([FND-25](../../decisions/project-foundation.md#fnd-25--simulatable-visible-and-tunable)).

## Outboxes

- **Same transaction:** a module writes an outbox event in the same transaction as the change it
  reports. Every order event and every delivery event that takes effect writes exactly one. A
  replayed command writes none. A delivery request and the restaurant's cancel of it are first
  saved as pending, without one, and write it once deliveries acknowledges them.
- **Kinds and payloads:** the kinds are in the [events](events.md) page. Each kind has its own
  payload, at version 1.
- **Retention:** an outbox event expires 7 days after it was written; a daily cleanup deletes
  expired ones.

## Inboxes

Each module has a job that reads the other module's outbox. Both work the same way:

| Step | Rule | Value |
| --- | --- | --- |
| Schedule | The job runs on a fixed schedule, one run at a time | Every 5 seconds |
| What it reads | Every kind except `Unknown`; the refusal kinds are marked read and leave no copy | — |
| Where it starts | From the outbox time of the latest event in its inbox, minus a read lag | Read lag 1 minute |
| Skips | Events already in its inbox or its retry list | — |
| On failure | The event gets a retry record, retried after a delay that doubles after each failure | First after 5 seconds, at most 2 minutes apart |
| Giving up | An event older than the limit is dead-lettered; so is one no longer in the outbox when its retry is due | 15 minutes |
| Finishing | A processed or dead-lettered event goes into the inbox; a successful retry deletes its retry record | — |
| Retention | A daily cleanup deletes inbox and retry records of events older than the limit | 7 days |

Reading one event is two transactions: saving the copy, then the inbox record. A failure between
them leaves the event unread, and reading it again changes nothing because the copy is already
recorded.

## Delivery request handoff

- **Request:** the restaurant's delivery request is saved in orders as pending, then orders calls
  deliveries directly.
- **Receiving:** deliveries creates the order delivery, the delivery request event, and its copy
  of the order with all events so far, then acknowledges with the order delivery's ID, also for
  a repeat.
- **Completing:** orders saves its copy of the order delivery in the same transaction that
  completes the request. A failure rolls back, and the retry gets the same ID.
- **Transient failure:** if deliveries cannot read the order's history, the request stays
  pending.
- **Retry:** a job retries every pending handoff every 5 seconds, up to 100 a run, with no
  backoff and no giving up.

## Restaurant cancel of a delivery request

- **Request:** orders saves the cancel as pending, then calls deliveries directly.
- **Deciding:** deliveries writes the cancel event and its outbox event, or refuses for good if
  a driver already accepted or rejected the request. A request deliveries has not received yet
  is a transient failure.
- **Answer:** a refusal is a conflict for the restaurant, also on a retry with the same key; a
  transient failure tells the restaurant to retry, and the cancel stays pending.
- **Retry:** the handoff job also retries pending cancels every 5 seconds. A refusal found by
  the job is written to the orders outbox as `DeliveryRequestCancelRefused`, because the
  restaurant is no longer waiting.

## Driver commands

| Kind | How it runs |
| --- | --- |
| Decided by deliveries alone | A repeated key replays the earlier answer. Otherwise deliveries checks its rules, then saves the delivery event, an idempotency record, and the outbox event in one transaction. First valid acceptance is enforced by a unique claim. |
| Calling orders | Deliveries first stores a pending command request keyed by the idempotency key, then calls orders directly. On success it saves the delivery event with the orders event ID, its outbox event, and the request as done, in one transaction. |

- **Already recorded:** if the orders event was already recorded by deliveries, from its copy,
  the save is treated as success.
- **Refusal:** a permanent refusal marks the request refused, with the orders error code.
- **Transient failure:** the driver is told to retry, and the request stays pending.
- **Retry job:** every 5 seconds it repeats the orders call of each pending request the driver
  did not retry, 5 seconds after the last attempt, doubling up to 2 minutes, up to 100 a run. At
  15 minutes old the request is dead-lettered. A refusal found by the job writes
  `DriverCommandRefused` to the deliveries outbox.
- **Retention:** finished requests are deleted after 7 days.

## Idempotency

- Order creation, every restaurant command, and every driver command except ignore take an
  idempotency key.
- A repeated key with the same request replays the first answer. The same key with a different
  request is a conflict.
- Records are kept 30 days; an expired record still present answers that the key expired, until
  the cleanup removes it.

## Copies between the modules

Each module's copy of the other's data, and the links between matching events, are described in
the [events](events.md) page.

## Dispatch claims

- A notification is a durable record, claimed under a lock on the delivery request. A unique
  rule allows one per request and driver, and the claim enforces the limit of 5 outstanding
  across instances.
- The push is enqueued keyed by the notification, then the notification is marked enqueued, so a
  repeat after a crash sends nothing new.
- Sending one notification is three transactions: the claim, the enqueue, and the mark.

## Push pipeline

| Step | Rule | Value |
| --- | --- | --- |
| Enqueue | Stores one delivery per distinct device; a repeated sender and key stores nothing | — |
| Schedule | One run at a time across instances | Every 5 seconds |
| Claim | Each due delivery is claimed with a lease and an attempt counter | Lease 2 minutes |
| Send | One provider request per notification, to all its claimed devices | At most 500 devices a request |
| Temporary failure | Retried after a delay that doubles | First after 10 seconds, up to 5 retries |
| Lease expiry | A delivery whose lease runs out without a result is sent again; the device drops the duplicate by its identifier | — |
| Result | A final result stores the sender's callback in the same transaction | Delivered, invalid device, failed, or no recipients |
| Callbacks | Retried until the sender acknowledges, with a doubling delay and no limit; a warning after the stated age | First after 10 seconds, at most 5 minutes apart; warning after 1 hour |
| Invalid device | The sender removes the device's push identifier | — |
| Retention | Notification records are deleted after the stated age | 90 days |

The restaurant notification job reads accepted delivery requests from the orders outbox every 5
seconds, with a 1-minute read lag, and keeps its inbox for 14 days.

## Jobs and schedules

| Job | Schedule |
| --- | --- |
| Dispatch | Every 30 seconds; a tick that overlaps a running pass is skipped |
| Both inboxes, handoff and cancel retry, pending command retry, push sending, restaurant notifications | Every 5 seconds |
| Order idempotency cleanup | Daily at 00:00 UTC |
| Location history periods | Daily at 00:30 UTC |
| Orders outbox cleanup, and restaurant notification inbox cleanup | Daily at 01:00 UTC |
| Push notification cleanup | Daily at 01:30 UTC |
| Deliveries outbox cleanup | Daily at 02:00 UTC |
| Deliveries inbox cleanup | Daily at 02:30 UTC |
| Driver command cleanup | Daily at 03:00 UTC |
| Orders inbox cleanup | Daily at 03:30 UTC |

The scheduler checks for due jobs every 5 seconds, on every instance; a missed tick runs once
after downtime, not once per missed tick.

## Framework and library behaviour

This section was read from the real service's code on 2026-11-05, at the user's request, in
[FND-81](../../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions), which
also says what is simulated and when. The job framework's rules are under
[Jobs and schedules](#jobs-and-schedules), and it stores each run in its own tables.

**Session state cache.** Every signed-in call checks that its session is still valid, in each
instance's memory first and then in a shared table.

| Rule | Value |
| --- | --- |
| Valid or invalid session | 30 seconds in memory, 5 minutes shared |
| Revoked session | As long as a token can still work, at most 15 minutes |
| Randomised | Each time varies by 10% either way |
| Revocation | Overwrites the shared entry and this instance's memory at once |
| Other instances | No notice: their memory can say valid for up to 30 seconds |
| A crash | Empties the shared table |

An expired entry stays until something removes it. A read that finds it expired removes it from
memory, and activity on the cache starts a scan of memory at most once a minute, the library's
default. The library deletes expired entries from the shared table every 30 minutes.

**Rate limits.** Each is a sliding one-minute window in six segments, held in each instance's
memory. A refusal is a 429 with a retry time.

| Limit | Value |
| --- | --- |
| A driver's location batches | 12 a minute, per driver |
| A driver's other calls | 120 a minute, per driver |
| Sign in | 10 a minute, per IP |
| Refresh | 30 a minute, per IP |

**Live connection sweep.** Every 15 seconds, each instance checks its own open connections through
the session state cache and closes invalid ones, so a connection closes within about 45 seconds of
a revocation. A sign-out also closes the session's connections on its own instance at once. A
failed check keeps the connection until the next sweep. This is a background service on each
instance, separate from the scheduled jobs.
