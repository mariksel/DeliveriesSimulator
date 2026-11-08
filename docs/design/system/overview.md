# System Overview

Owns what the system is for, where it ends, and who uses it. Details belong in
the linked architecture, module, and decision pages.

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Approved in the
  [project foundation decisions](../decisions/project-foundation.md). The source so far takes
  one `V1.0.0` order from end to end, in the browser and headless.

## Purpose and boundary

DeliveriesSimulator is a business and technical simulation of an existing deliveries
service and its orders. It is self-contained: it simulates the real service's
behavior and has no integrations today. The real service itself is outside the
boundary and is not named in these documents.

It simulates the real service's delivery algorithms and flows, not the service as a running
system, and everything runs in the frontend. Its goal is the business and technical correctness
of the delivery flow, especially the event communication between the orders and deliveries
modules ([FND-24](../decisions/project-foundation.md#fnd-24--goal-is-correctness)). What it must
do is summarised in the [requirements](../requirements.md).

## Actors and external surfaces

| Actor or system | Surface | Purpose |
|---|---|---|
| Business stakeholders | The application's UI | Study how orders and deliveries behave from a business standpoint |
| Developers | The application's UI | Study how the deliveries service works technically |
| Testers or QA | The application's UI | Check scenarios and expected behavior |
| Trainers or new staff | The application's UI | Learn how the service works |

## High-level flow

This outline follows from the approved records. The real service's own flow is specified per
version, in [versions](../versions/README.md).

1. A [scenario](../modules/scenarios.md) sets the starting state, the steps, and the version and
   its option switches ([FND-49](../decisions/project-foundation.md#fnd-49--scenarios)).
2. The [simulation engine](../modules/simulation-engine.md) runs it in virtual time, repeatably
   ([FND-48](../decisions/project-foundation.md#fnd-48--simulation-model)), and
   [fault injection](../modules/fault-injection.md) can break any step
   ([FND-47](../decisions/project-foundation.md#fnd-47--failures)).
3. The [event log](../modules/event-log.md) records everything, and the
   [business view](../modules/business-view.md) and
   [technical view](../modules/technical-view.md) show it
   ([FND-53](../decisions/project-foundation.md#fnd-53--ui-organisation)).
4. [Verification](../modules/verification.md) checks the run against the correctness criteria
   ([FND-29](../decisions/project-foundation.md#fnd-29--business-correctness),
   [FND-30](../decisions/project-foundation.md#fnd-30--technical-correctness)).
5. [Versions](../modules/versions.md) compares runs of different versions side by side
   ([FND-51](../decisions/project-foundation.md#fnd-51--comparison)), and
   [analysis](../modules/analysis.md) works across many runs
   ([FND-55](../decisions/project-foundation.md#fnd-55--offline-dispatch-model)).
6. [Run history](../modules/run-history.md) keeps runs,
   [import and export](../modules/import-and-export.md) shares files, and the conformance
   exchange checks versions against the real service
   ([FND-52](../decisions/project-foundation.md#fnd-52--conformance-exchange)).

## Capability map

The [module map](../modules/README.md) says what each capability owns:

- [Orders](../modules/orders.md)
- [Drivers](../modules/drivers.md)
- [Restaurants](../modules/restaurants.md)
- [Business rules](../modules/business-rules.md)
- [System](../modules/system.md)
- [Payments](../modules/payments.md)
- [Notifications](../modules/notifications.md)
- [Map and routing](../modules/map-and-routing.md)
- [Simulation engine](../modules/simulation-engine.md)
- [Scenarios](../modules/scenarios.md)
- [Fault injection](../modules/fault-injection.md)
- [Event log](../modules/event-log.md)
- [Run history](../modules/run-history.md)
- [Import and export](../modules/import-and-export.md)
- [Business view](../modules/business-view.md)
- [Technical view](../modules/technical-view.md)
- [Versions](../modules/versions.md)
- [Verification](../modules/verification.md)
- [Analysis](../modules/analysis.md)

## Related source and records

- [Requirements](../requirements.md)
- [Architecture overview](../architecture/overview.md)
- [Open decisions](../governance/open-decisions.md)
- [Project foundation decisions](../decisions/project-foundation.md)
