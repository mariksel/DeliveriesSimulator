# Project foundation — Purpose and scope

What the simulator is for, who uses it, what it covers, and what it leaves out.
This is part of the [project foundation](../project-foundation.md), which holds
its version, authority, and undecided questions, and lists where each record is.

## Approved decisions

### FND-1 — Purpose and boundary

DeliveriesSimulator is a business and technical simulation of an existing deliveries
service and its orders. It simulates that service in a self-contained manner.

### FND-2 — Real service not named

These documents do not name the real service. They call it "the real service".

Amended 2026-11-03 by the user: the documents do not record its name or location either, which
resolves the former U1. See [FND-23](stages-and-process.md#fnd-23--safe-to-publish).

Amended 2026-11-20 by the user: the real service has the same owner as this project, so its
documentation and source code are used as rule sources
([FND-9](#fnd-9--sources-of-business-rules)) with the owner's consent. See
[Ownership](../../../../README.md#ownership).

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
[modules](../../modules/README.md). Drivers and guided walkthroughs were offered as modules
and not chosen.

Amended 2026-11-03 by the user: the Versions, Verification, and Analysis modules are added, and
the Deliveries module owns drivers ([FND-56](architecture-and-code.md#fnd-56--module-boundaries)).

### FND-9 — Sources of business rules

Business rules are taken from the real service's documentation, its source code, and the
people who know it. If these sources conflict,
[document governance](../../governance/document-governance.md#conflicts-and-gaps) applies: ask
the user, and do not choose one by inference.

Confirmed 2026-11-03 by the user: every conflict, including one between the real service's
documents and its code, is presented to the user one at a time. No source wins by default.
Resolved conflicts are listed in
[FND-39](capabilities-and-inventory.md#fnd-39--source-conflicts-resolved).

### FND-10 — Checking against the real service

People who know the real service review the simulation's behavior against it. No
comparison with exported data from the service is planned.

Amended 2026-11-03 by the user: a real service conformance check is required. See
[FND-34](capabilities-and-inventory.md#fnd-34--required-capabilities). A comparison with the real
service is therefore planned, in addition to people reviewing the behaviour. How it works is decided
in
[FND-52](simulation-model.md#fnd-52--conformance-exchange).

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
  The one exception is the conformance exchange
  ([FND-52](simulation-model.md#fnd-52--conformance-exchange)),
  decided on 2026-11-03.
- **Price and fee breakdown:** a view of how each order's price and fee were worked out is not
  provided.
- **Role layouts:** ready-made layouts for business and technical users are not provided.
- **Business-language explanations:** technical events are not translated into business terms.

The user approved these on 2026-11-03; more may be added.
[I01-E01-001](../../../backlogs/Initiatives/Archive/Done/I01-requirements-and-backlog-creation/Archive/Done/I01-E01-vision-and-scope/Archive/Done/High/I01-E01-001-confirm-purpose-and-success.md)
tracks the question.

Amended 2026-11-03 by the user: a stored run may be saved as a file and opened in another copy
of the simulator. That is not a results data export for other tools
([FND-58](architecture-and-code.md#fnd-58--stored-records-and-shared-files)).

### FND-35 — Later capabilities

These capabilities are wanted, but not in the first stages. When they are built is decided in
I01-E06-002.

- **Report generator:** turns a run or a comparison into a written report.
- **Version merge:** combine the changes from two versions into one.
- **Bulk scenario editing:** change many scenarios at once.
- **Dashboard builder:** arrange chosen views into a custom dashboard.
- **Bookmarks:** bookmark moments in a run and jump back to them.

The user approved these on 2026-11-03; more may be added.
[I01-E01-002](../../../backlogs/Initiatives/Archive/Done/I01-requirements-and-backlog-creation/Archive/Done/I01-E01-vision-and-scope/Archive/Done/High/I01-E01-002-decide-candidate-capabilities.md)
tracks the question.
