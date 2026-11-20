# Project foundation — Architecture and code

The stack, layers, modules, storage, checks, and code style.
This is part of the [project foundation](../project-foundation.md), which holds
its version, authority, and undecided questions, and lists where each record is.

## Approved decisions

### FND-3 — Technology stack

The application uses TypeScript, Angular, and Vite.

### FND-4 — Data in browser storage

The project's data lives in browser storage.

### FND-11 — Clean architecture with a framework-free core

The code follows clean architecture style and principles, with a framework-free core.
Dependencies point inward, and the core does not import Angular. It may use Immutable.js
([FND-73](#fnd-73--immutable-architecture)).
[Layers](../../architecture/layers.md) describes the model.

### FND-12 — Custom Vite build

Vite runs the Angular build directly, rather than through the Angular CLI's default setup.

### FND-13 — Layers and source layout

There are four layers: Domain, Application, Infrastructure, and UI. There is no frameworks
layer and no interface adapters layer. Infrastructure implements interfaces defined by
Application. UI calls Application and does its own conversion. The source has one top-level
folder per layer, with module folders inside.
[FND-82](#fnd-82--application-core-layer) adds a fifth layer, Application.Core, between
Application and Domain, which now defines the interfaces Infrastructure implements.

### FND-14 — Vite plugin

The custom Vite build uses `@analogjs/vite-plugin-angular`, without the Analog framework.

### FND-15 — IndexedDB

The browser storage mechanism is IndexedDB.

### FND-16 — Angular version

The application uses Angular 22 with Vite 8.

### FND-17 — Test tools

Vitest tests the core, and tests components through `@analogjs/vitest-angular`. Playwright
runs end-to-end browser tests.

### FND-18 — Use of Domain by outer layers

UI and Infrastructure may use Domain types directly, as well as Application.

### FND-19 — Composition root and dependency inversion

Application depends on abstractions it defines, not on Infrastructure modules. A composition
root outside the four layers binds each abstraction to its Infrastructure implementation at
startup, through Angular's dependency injection. It is the only code that may see every
layer.

### FND-20 — Module placement in layers

A module gets a folder in a layer when it has code there. Its code map is updated then.

### FND-21 — Validation

Each layer checks its own concerns. UI checks form input for quick feedback, Application
checks use-case input, and Domain enforces the rules that must always hold.

### FND-22 — Error reporting

Expected failures, such as an invalid scenario or a full IndexedDB, are returned as typed
results. Exceptions are reserved for bugs. UI shows the results and has one catch-all for
the rest. Failures simulated by Fault injection are ordinary simulation events, not
application errors.

### FND-56 — Module boundaries

- **Drivers:** the Deliveries module owns drivers.
- **Pricing:** Business rules owns every pricing rule: fee bands, commission, and price checks.
  Payments only moves money.
- **Versions module:** a new Versions module owns versions, option switches, comparison, and the
  conformance exchange. This amends [FND-8](purpose-and-scope.md#fnd-8--capability-list).
- **Event log:** the Event log is the single record of a run; the Technical view and Run history
  both read it. [FND-81](run-history.md#fnd-81--runs-as-a-tree-of-state-transitions) amends this:
  commits become the single record, and the log a readable view worked out from them. I03-E02-006
  built this.
- **Customers and restaurants:** restaurants create orders and hand them over, and customers
  receive deliveries; all of them follow behaviour profiles
  ([FND-48](simulation-model.md#fnd-48--simulation-model)).
- **Verification and Analysis modules:** a Verification module owns criteria, invariants, proofs,
  and coverage, and an Analysis module owns analysis across many runs. This amends
  [FND-8](purpose-and-scope.md#fnd-8--capability-list) again.
- **Capability ownership:** each FND-34 and FND-35 capability has one owner, listed in
  [capability ownership](../../modules/capability-ownership.md). Driver behaviour profiles belong
  to Deliveries, and restaurant and customer profiles to Customers and restaurants. The workspace
  features belong to the [UI section](../../ui/README.md). The owner of the later Report generator
  is undecided (U13).
- **Dependencies:** the module dependencies are the graph in the
  [module map](../../modules/README.md#dependency-graph), confirmed on 2026-11-03, which resolves
  the former U8.

The user decided these on 2026-11-03, in I01-E03-006, which resolves the former U7 and U10.

Amended 2026-11-03 by the user: Import and export also uses Run history, for run files
([FND-58](#fnd-58--stored-records-and-shared-files)).

Amended 2026-11-06 and 2026-11-07 by the user, in
[FND-83](#fnd-83--types-owned-by-their-modules): each module holds its own rules, and Business
rules becomes a module of rule abstractions that the others use; Drivers becomes a module, with
Deliveries as its submodule; Restaurants becomes a module, with Customers as its submodule; and
a System module holds the abstractions about time, randomness, and math. I03-E02-019 and
I03-E04-012 build this, and until then the modules above stay as they are.

### FND-57 — Hosting and data

- **Hosting:** local only for now: the development server, or a local build. A hosted deployment
  is undecided (U14).
- **Browsers:** the latest Chromium-based browsers, Firefox, and Safari on desktop.
- **Data lifetime:** runs, scenarios, versions, and tuning presets are kept in the browser until
  the user deletes them.
- **Data changes:** stored data carries a schema version, and a new release migrates older data
  when it loads it.
- **Sharing:** between people, everything is shared as files through Import and export
  ([FND-54](simulation-model.md#fnd-54--tunability), [FND-56](#fnd-56--module-boundaries)).
- **Repository:** the project is a git repository, which the user created on 2026-11-03.

The user decided these on 2026-11-03, in I01-E05-001, which resolves the former U3 and U5.

Amended 2026-11-03 by the user: "everything" means scenarios, with the cities and profiles they
use, versions, tuning presets, and stored runs
([FND-58](#fnd-58--stored-records-and-shared-files)).

### FND-58 — Stored records and shared files

- **Run files:** a stored run can be saved as a file and opened in another copy of the
  simulator. It is not a data export for other tools, which stays out of scope
  ([FND-33](purpose-and-scope.md#fnd-33--out-of-scope)). Import and export uses Run history for it,
  which adds one dependency to the [module map](../../modules/README.md#dependency-graph).
- **Cities and profiles:** custom cities and behaviour profiles are stored records of their own.
  Map and routing owns cities, Deliveries owns driver profiles, and Customers and restaurants
  owns restaurant and customer profiles. A scenario file carries the cities and profiles it uses,
  so they are shared through scenarios.
- **Lifetime:** cities and profiles follow the same rule as other stored data: kept until the
  user deletes them, and migrated across releases ([FND-57](#fnd-57--hosting-and-data)).

The user decided these on 2026-11-03, in I01-E06-001, resolving a conflict between FND-33,
FND-57, and the module pages.

### FND-61 — Node and TypeScript versions

- **Node:** the project runs on Node 22.12 or later, and `.nvmrc` selects 26 for local
  development. Angular 22 lists `^22.22.3`, `^24.15.0`, and `>=26.0.0`; on an earlier Node 22,
  npm only warns, and the build and every check still pass. Dependencies are pinned to releases
  old enough for package mirrors that lag behind npm.
- **TypeScript:** the project uses TypeScript 6.0, the only line Angular 22 accepts.

The user chose Node on 2026-11-03, in I02-E01-001, and lowered the floor to Node 22.12 on
2026-11-20. The TypeScript line follows from
[FND-16](#fnd-16--angular-version).

### FND-62 — Dependency injection and architecture check

- **Abstractions:** Application defines its abstractions as abstract classes. Angular uses each
  class as its injection token, so neither the core nor UI needs a separate token. This details
  [FND-19](#fnd-19--composition-root-and-dependency-inversion).
- **Architecture check:** `npm run check:architecture` checks the dependency rules with
  dependency-cruiser, and compiles the core without browser types, so a browser API in the core
  fails it.
- **First binding:** the wall clock, which the virtual clock's wall-clock mode needs.

The user decided these on 2026-11-03, in I02-E01-002.

### FND-63 — Tests and public-safety check

- **One command:** `npm run check` runs the public-safety check, the format and lint checks, the
  architecture check, the type check of the source and its tests, the unit and component tests with
  their coverage, and the end-to-end tests in Chromium, Firefox, and WebKit.
- **Public-safety check:** it looks for email addresses, Windows drive paths, home folder paths,
  and file URLs in the files git would publish. It keeps no list of private terms.
- **What it does not cover:** it cannot recognise the real service's name or a person's name, and
  it does not read git history or commit authors. Commit authors do hold a person's identity. U14
  decides what else must be checked before anything is published.

The user decided the check's coverage on 2026-11-03, in I02-E01-003.

### FND-69 — Module jobs and the module graph check

- **Jobs:** each module reads its own values from Business rules, and tells the simulation engine
  which jobs to repeat. The engine only runs them, so it has no dependency on Business rules, and
  the confirmed graph is unchanged.
- **Module graph check:** `npm run check:architecture` also fails on any import between modules
  that the [module map](../../modules/README.md#dependency-graph) does not show. It reads the graph
  from that page, so the two cannot drift apart: a new dependency means changing the page first.
- **Scripted actors:** the simulation engine drives them, because the graph gives Scenarios no
  dependency on Orders. A scenario's steps are its input.

The user decided the jobs and the check on 2026-11-04, in I02-E03-004.

### FND-71 — Code style and quality tools

- **Editor settings:** `.editorconfig` holds the [code style](#fnd-72--code-style)'s layout, with
  UTF-8, LF, a final newline, and no trailing whitespace.
- **Line endings:** `.gitattributes` keeps every text file LF on every machine.
- **Formatting:** Prettier formats the code, and reads those settings. It leaves Markdown alone,
  which is wrapped by hand under
  [document governance](../../governance/document-governance.md#markdown-line-length).
- **Linting:** ESLint with typescript-eslint's strict type-checked rules, Angular's rules, and
  Vitest's rules, with the adjustments the
  [code style](../../governance/code-style.md#lint-settings)
  page lists. In source, a value that must exist goes through `required`,
  which throws if it is missing. The compiler also uses `noUncheckedIndexedAccess`.
- **Stylesheets:** Stylelint checks that colours and spacing come from CSS variables.
- **Coverage:** `npm run check` fails below 95% of lines, 90% of branches, or 90% of functions.
- **Mutation testing:** Stryker plants faults in the core and reports the ones the tests miss. It
  takes minutes, so it runs on demand with `npm run test:mutation`, and not in `npm run check`.

The user decided these on 2026-11-04, between I02-E04-002 and I02-E04-003. They are not a backlog
item. This adds to [FND-17](#fnd-17--test-tools) and
[FND-63](#fnd-63--tests-and-public-safety-check).

### FND-72 — Code style

The user chose these on 2026-11-04.

- **Layout:** 4 spaces, single quotes, semicolons, and trailing commas everywhere, up to 120
  characters a line, which the user lowered on 2026-11-05: "we prefer the code ty be styled
  verticaly instead of horizontaly, in general the code line length should stay under 100
  characters". `package.json` and its lock file stay at 2 spaces, as npm writes them, and
  Markdown stays under
  [document governance](../../governance/document-governance.md#markdown-line-length).
- **Braces:** every `if` has braces, even on one line.
- **Typed core:** the user chose on 2026-11-06 that Domain and Application work only with strongly
  typed values: "the applicationa and core layer should not work with json or primitive types,
  instead we prefer strongly typed types. the json parsing and manipulation should be in the
  infrastructure layer like persistence or io in general". This amends
  [FND-65](simulation-model.md#fnd-65--event-log-entries)'s rule that log data is JSON: the JSON
  check moves to persistence. The user then chose how far it goes: fields with a fixed set of values
  or an
  identity get const-object types or branded IDs, and simulated times, durations, counts, and
  amounts get branded number types too. The run digest and the run comparison work over typed
  entries, with no JSON, so every pinned digest changes once. I03-E02-018 does this. For
  indirect effects, which nothing records yet, the user chose on 2026-11-06 a set of kinds that
  starts empty: each kind has its own typed data, and I03-E02-013 adds the first. For scenario
  files, the user chose the same day that Infrastructure reads, parses, and validates them, and
  the port for a chosen file gives Application a typed scenario or its problems. The built-in
  scenarios stay JSON files, in Infrastructure, behind a port that lists them and gives one by
  its ID. The self-tests' known case is a typed scenario, run directly. For the digest, the user
  chose per-kind encoders: each kind of entry, and each module's records, is written field by
  field, and a test checks that every field is written. The run comparison uses typed equality
  per kind, with tests that it and the digest never disagree. For fixed sets and identities, the
  user chose: a scripted step's actor and order name are a branded `ScenarioActor` and
  `ScenarioOrderName`, a scenario's version a branded `VersionId`, and a built-in scenario's ID a
  branded `BuiltInScenarioId`. Output effects become a set of kinds that starts empty, like
  indirect effects, for the item that first calls a provider. Verification uses Orders and
  Deliveries, so its run record holds `OrderStatus` and each module's event kinds. For numbers,
  the user chose branded `SimTime`, `Duration`, `Count`, and `VersionNumber`, plus a
  `LogSequence` for an entry's place, `Metres`, `Seed` and `RandomWord`, `Degrees`, and `Score`.
  Arithmetic goes through typed helpers in Domain, such as `later(at, duration)`, so plain `+` and
  `-` on them stay out of Domain and Core, and the creators check their values and throw.
  Amounts wait for `Money`, which nothing holds yet. On the user's request for more, they added
  `WallTime` for the browser's real clock, kept apart from `SimTime`, `Fraction` for a number from
  0 up to 1, `Factor` for a multiplier such as a boost, a decay, or a clock speed, and `Position`
  for a place in a list. Numbers used only inside a function's own working, such as a hash's
  state or a loop's index, stay plain. A `Duration` must be from 0, so a tuned duration below 0
  becomes something a run cannot use, beside the job intervals; this amends the tuned values'
  invariants below. `Metres` takes any finite number, so a distance limit can still go below 0
  to test extremes, as [FND-54](simulation-model.md#fnd-54--tunability) allows.
- **Numbers, as built:** I03-E02-018-P06 put the types, their creators, and the helpers in
  `src/domain/quantities.ts`, the one file besides `ids.ts` where `as` is allowed. Each layer
  outside Infrastructure takes typed numbers. Infrastructure makes them with the creators when it
  reads a scenario or loads a run, so a stored value a run cannot use fails there. A value
  checked by its type is not checked again: a scripted step's time is now only checked to be a
  whole millisecond, and an inbox that has read nothing reads from the run's start rather than
  from minus infinity, which reads the same events, since none is before the start. A clock
  speed is a `Factor` or `max`, and a run told to go on past its end has no end, rather than an
  infinite one. Constants keep their numbers as stated, in a plain object or a named constant,
  and pass them to the creators, so no unnamed number appears in code.
- **Arguments:** the user chose on 2026-11-05 that a call's result is stored in a local before
  it is passed on, everywhere, tests included, with no exceptions: "we prefer to store the
  resullt of an expression into a local variable firest istead of passing the whole expression
  as a argumetn".
- **Functions:** a top-level function on one line is an arrow function, and anything longer is a
  function declaration. The user chose on 2026-11-05 that a function short enough for one line
  stays an arrow function when the formatter wraps it.
- **Return types:** every function states its return type, unless it is a callback whose type comes
  from where it is passed.
- **Comments:** every exported function, class, type, and constant has a doc comment.
- **Fixed sets of values:** const objects, not enums or unions of literals.
- **Object shapes:** `interface`, and `type` for unions and aliases.
- **Private members:** the `private` keyword, not `#`.
- **Member order:** the user chose on 2026-11-06 the order of a class's members: "the static
  membvers should come fires than fielsts and getters setters than constructors than public
  methods than private methods". So statics come first, static fields before static methods,
  then fields, then getters and setters, then constructors, then public methods, then private
  methods. Among fields, private ones come before public ones; among methods, private ones come
  after public ones. The user then chose that protected members sit between the two, that
  getters and setters go private first, like fields, with a getter and its setter side by side,
  and that statics follow the same access order as instance members. In an Angular class, the
  Angular members, such as inputs, outputs, `inject()`, and queries, lead the fields of their own
  access level: where the two rules met, the user chose access first. It applies to every
  class, tests included. ESLint enforces the order of kinds and access, and review checks the
  Angular part.

ESLint enforces all of these except one: it can check that a long top-level function is not an
arrow function with a block, but not one whose expression spans several lines. The
[code style](../../governance/code-style.md) page holds these and every later rule, with their
sources and status.

### FND-73 — Immutable architecture

- **Core:** Domain is strictly immutable and pure. Application does the orchestration and
  coordination, and may hold mutable services to do it. Its data is immutable too, except where
  that would be a considerable performance problem. An exception needs a benchmark that shows the
  problem, and a comment saying so.
- **Runs:** a run is immutable. Its whole state is one value, and each step returns a new one, so a
  snapshot is just a reference. Work is data, not closures, and the event log is an immutable list.
  Since I03-E02-006, the work due is worked out from the commits and the scenario, and each random
  stream's position sits in the effects sub-root
  ([FND-81](run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)).
- **Modules:** a module is a state type plus pure functions in Domain, not a stateful class. A
  command is a plain function call on that state. Work due is a record, and the engine turns it
  into that call. Follow-ups are data: a step returns what should happen next, and the engine does
  it, so no module calls another.
- **Collections:** Immutable.js, in every layer, with plain `readonly` objects as records.
  `OrderedMap` is used wherever order matters, because `Map` does not keep insertion order. This
  amends [FND-11](#fnd-11--clean-architecture-with-a-framework-free-core): the core may use this
  data library.
- **Not event sourcing:** a run's state is held directly at each commit, and nothing derives state
  from events or from the log. There are no decider patterns, and no special types acting as
  functions. A saved run can be recalculated by calling the same pure functions again
  ([FND-81](run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)). The user reworded this in
  I03-E01-001. On 2026-11-12, in I03-E09-010, the user amended it: state is still held directly,
  but a value a record's own events already record is read from those events, not stored again.
  An order's status, driver, and whether it is ready are read from the order's events.
- **Saving:** a repository maps each persisted record to its application record, and application
  records are never stored directly
  ([FND-81](run-history.md#fnd-81--runs-as-a-tree-of-state-transitions)). Until I03-E02-007 builds
  it, a run's state converts to plain JSON and back exactly.
- **Exceptions:** there is one, `runDigest`, whose benchmark is in
  [Simulation engine](../../modules/simulation-engine.md#performance).
- **Bugs:** a bug inside a run stops it and says where, and the last good state remains.
- **External access:** files, the network, and any other outside dependency stay in Infrastructure,
  at the edge, behind an abstraction that Application defines.
- **Views:** what a view shows is computed by a tested pure function.

The user decided these on 2026-11-04. [Code style](../../governance/code-style.md) holds the rules
that follow from them, and
[I02-E07](../../../backlogs/Initiatives/Archive/Done/I02-end-to-end-skeleton/Archive/Done/I02-E07-style-and-immutable-rework/I02-E07-style-and-immutable-rework-backlog.md)
applies them.

On 2026-11-06 the user amended the Modules and Collections rules: "in general domain types shoul
be clases and not just object or interfaces ... so an order object is allwasy a fully instacne
of a class with validated invariants and all its supported methods". The user then chose:

- **Every Domain type is a class:** entities and their versions, events, outbox rows, and other
  records, and each module's state too, whose commands become its methods. This replaces "a
  module is a state type plus pure functions" and "plain `readonly` objects as records".
- **Immutable instances:** fields are readonly and frozen, and a method returns a new instance,
  so runs stay immutable, a commit still shares what it leaves alone, and a snapshot is still a
  reference.
- **Versions stay apart:** an order is two classes, `Order` for the part that never changes and
  `OrderVersion` for each state, linked to the one before, as the records are now.
- **Two static constructors:** `createNew` makes a new instance, such as an order's first
  version, and `create` rebuilds one from given values, such as stored ones, checking its
  invariants. Values that break an invariant can only come from a bug or corrupt storage, so
  `create` throws. `create` takes the class's fields by name, as `FieldsOf<T>`, and a value that
  is only its fields, such as a place, has `create` alone.
- **Tuned values' invariants:** a set of config values rejects only what a run cannot use: a
  value that is not a finite number, a job interval that is not a whole number of milliseconds
  above 0, and a count that is not a whole number from 0. A value outside its valid range is
  still allowed, with the warning [FND-54](simulation-model.md#fnd-54--tunability) gives.
- **Reading the other module's outbox:** a module takes the other module's outbox event class
  itself, such as Orders taking `DeliveriesOutboxEvent`, and no view interface stands in for
  it. What a module keeps of an event it read is its own class, such as Orders'
  `DeliveriesEventCopy` with only the fields orders keeps.
- **Commands are static methods:** a module's command is a static method of its state class,
  such as `OrdersState.pickUp(state, ...args)`, so a state commit's call, the function registry,
  and the pinned fingerprints work as they do now.
- **Plain frozen classes:** ordinary classes with readonly fields, frozen when made, and a
  private constructor, so only the static constructors make one. Collections inside them stay
  Immutable.js.
- **No interfaces beside them:** the class is the type, so `Order` replaces `IOrder`. Persisted
  types keep their own `IPersisted` interfaces.
- **Outcomes stay unions:** what a command or a change comes to, such as `OrderChange`, a driver
  command's result, orders' answer, or a step with its reports and follow-ups, stays a
  discriminated union of readonly data. The things it carries are class instances.
- **Other plain data:** a run's record and a check's results in Verification are outcomes, and
  stay plain readonly data. So do the bundles a rule reads or gives back, such as the facts
  eligibility needs or a ranked driver. The generic log entry stays a record joined with its
  place in the log, which Application.Core's typed kinds narrow on.
- **Core uses Domain types, never extends them:** in the user's words, "core types should not
  extend domain types, only domain types can extend domain types, core types can only use domain
  types". Core's log data holds a Domain instance in a field, such as an orders event with the
  order's status and version beside it.
- **Where:** a new phase of I03-E02-018, P08, done before its P05 and P06. Its plan, the class
  list and the order of work, is written into the phase for the user to review first.

### FND-82 — Application core layer

The user stated this on 2026-11-06, in I03-E02-018, while choosing where typed log entries live:

> lets add an Application.Core layer it will have a dependency on the domain but the domain cant
> depend on it. so it will esentialy wrap the domain. things that can go in the domain might go
> in the core layer. it will be something between application and domain. all other layers can
> depend on the core layer, the infrastrucutre layrrs should not depend on the aplicaiton layer
> only the core layer. the ui layer can depend on the application layer.

So far this settles:

- **A new layer** sits between Application and Domain. It depends on Domain, and Domain cannot
  depend on it.
- **Every other layer** may depend on it.
- **Infrastructure** does not depend on Application.
- **UI** may depend on Application.

The user then chose:

- **What it holds:** a run's records and the pure steps that move a run on: commits, the main
  root, the timeline, the run's state, effects, config values, the cache, the typed log entry
  kinds, and the step functions. Application keeps the services and use cases, such as the
  service driving a run, the live scenario run, the clock, and the determinism check.
- **Interfaces:** the ones Infrastructure implements, such as the run repository and the wall
  clock, move to the new layer, because Infrastructure does not use Application.
- **Infrastructure** may use the new layer and Domain.
- **UI** may use Application, the new layer, and Domain.
- **Its folder** is `src/application-core`.
- **Its rules:** Domain's strict ones: no `let`, no mutation, and no classes, except abstract
  classes for the interfaces, which Angular uses as injection tokens.
- **Framework-free:** like Domain and Application, it imports no Angular and calls no browser
  API.
- **Application** may use the new layer and Domain.
- **Verification's reading of a run** moves to the new layer, because the typed log entry kinds
  live in its simulation engine folder and Domain cannot use them. Verification's criteria stay in
  Domain. The module map gains one link: Verification uses the Simulation engine, for run
  records.

### FND-83 — Types owned by their modules

The user asked on 2026-11-06 that IDs and other types live in their own modules: "ids and other
types should be on their respective modules and not put together into a shared module". The
user then chose:

- **Scope:** `src/domain/ids.ts` and `src/domain/quantities.ts` are split up. The shared helpers,
  such as `required`, `fields-of`, `version-chain`, `inbox-position`, and `digest-parts`, stay
  where they are.
- **Layout:** each ID sits beside the class it identifies, such as `OrderId` in `order.ts`.
- **Outbox IDs:** `OutboxEventId` splits into one ID for each module's outbox, each owned by that
  module.
- **The business does not know it is simulated:** in the user's words, "order, drivers and other
  domain types should not depend on simulation types dirctly, but the smulation can depend on
  business types, the busines types can depend on some abstraction that bothe modules can agree
  on, for examplte the SimType can be an implementation of an abstract time. in general teh
  domain types should not know they are been simulated, the should just depend on some world
  whose implementation is not known." So the business modules use abstractions, such as time,
  and the Simulation engine provides them: a simulated time is one implementation of an
  abstract time. The Simulation engine may use the business modules' types, and never the
  reverse.
- **A System module, by context:** "the term world is just to explain the concept, dont take it
  too literaly. the abstraction should depend on context, for example types about time, date,
  randomnes, math, etc should be in a system module". There is no World module: the
  abstractions about time, dates, randomness, and math go in a System module.
- **Time is an interface:** the abstract time is an interface, and the Simulation engine's
  `SimTime` implements it. Business code only uses the interface.
- **No Business rules module:** "business rules hould not ba a module on its own, the rules
  should be in their respective module,for example the order module contains the order busines
  rules, the drivers module the drivers business rules and so on". This replaces
  [FND-56](#fnd-56--module-boundaries)'s single catalog of rules: each module holds its own
  rules.
- **Business rules as an abstraction:** the user then revised this on 2026-11-07: "actully the
  business rules module should exist but only as an general abstract module for the purpouse of
  providing simualted rules, it should not know about specific modules rules. instead the
  specific modules should build their rules using the busines rules abstractions. for example
  the orders module should use busines rules types to write its rules. this should be done in a
  way so that that the rules that te orders module wrote are visible on the ui and can be
  modified manualy or automaticly by te simulator so we can simulate different scenarios." So
  Business rules stays, as a generic module of rule abstractions that knows no other module's
  rules. Each module writes its own rules with those abstractions, and the rules are visible in
  the UI and can be changed by hand or by the simulator. The user chose that I03-E02-019 moves
  each rule into its module and leaves Business rules the abstractions that exist today, the
  tuned values' checks, and that a new item in the Business rules epic designs and builds the
  rule abstractions, planned first for the user's review. The "Rules and decisions"
  capabilities stay with Business rules, since they work on any module's rules through the
  abstractions.
- **The System module's contents:** in `src/domain/system/`, abstractions only: time, with
  `Instant` as an interface, a `Duration`, and a clock for reading the time should the business
  ever need it; a random source as an interface, which the seeded random source implements;
  and math types, `Fraction`, `Count`, and `Position`. `VersionNumber` goes beside the version
  chain, `Metres` and `Degrees` to Map and routing, `Score` and `Factor` to the driver rules,
  `LogSequence` to the Event log, and `WallTime`, `Seed`, `RandomWord`, `SimTime`, and a clock
  speed of its own to the Simulation engine.
- **Duration is a value:** an immutable `Duration` class in System, made from milliseconds or
  seconds, since the rules state durations as fixed amounts.
- **Drivers and Deliveries:** "Deliveries should be a submodule of drivers just like in the real
  service". Drivers, in `src/domain/drivers/`, holds drivers, their availability and locations,
  and the driver rules: eligibility, ranking, and the notification order. Its submodule
  Deliveries, in `src/domain/drivers/deliveries/`, holds requests, assignments, notifications,
  and its outbox. In the module graph Drivers is one module, its submodule may use it, and other
  modules use Drivers as a whole.
- **Stored names follow:** log sources, stored function IDs, and the like are renamed to the new
  modules, so every pinned digest is recalculated once. The user chose on 2026-11-07 that a stored function ID
  names the module and its submodule, as the folders do: `drivers.deliveries.<name>@1` for the
  Deliveries submodule and `drivers.<name>@1` for Drivers itself. Delivery events keep the log
  source Deliveries, and driver events, such as a driver's status, location, or availability,
  get a new log source, Drivers. No driver function or driver event exists yet, so every
  stored function becomes `drivers.deliveries.<name>@1`, and every entry keeps the source
  Deliveries.
- **Two states:** the user chose on 2026-11-07 that the module's state splits in two: a
  `DriversState` in Drivers, with the drivers, their versions, and their order counts, and a
  `DeliveriesState` in Deliveries, with the requests, notifications, outbox, and inbox. Both sit
  in the main root. A command that changes both, such as accepting a request, is a Deliveries
  command that takes the drivers' state and gives back both. This changes how a run is
  persisted.
- **Tracking:** a new item in the Run history epic, after I03-E02-018, planned first for the
  user's review.
- **Restaurants and Customers:** "just like in the real service, the rastaurants is its own
  module with customers as submodule". Restaurants takes the place of Customers and restaurants,
  with Customers as its submodule, and owns `RestaurantId` and a restaurant's place.
- **Scripted steps:** a scripted step, with its actor and order name, moves to Scenarios, and the
  Simulation engine runs the steps through an interface of its own, so only Scenarios uses the
  engine. The user chose on 2026-11-07 that the engine defines its own input type, with a
  time, an actor, a command, and an order name of its own, and Scenarios converts each scripted
  step into one when it starts a run. What a run records keeps its shape, so persisted runs and
  digests do not change for it.
- **Pricing rules:** "they should go in their respective module jus like they do on the real
  service". Each pricing rule goes to the module that owns it in the real service, decided when
  it is built.
- **Time's cost:** if time held as objects makes a city day much slower or larger, the numbers
  go to the user before the work goes on.
- **Time, as built:** I03-E02-019-P04 named the interface `IInstant`, as the code style names
  every interface. Each moment carries how long after its timeline's start it is, as a
  `Duration`, so two moments compare whichever implementation made them, and it writes itself out
  for a digest as a plain number did, so no digest changed. A module's persisted records are
  loaded with an `InstantAt`, given by the run's own mapping, so Orders and Drivers never name the
  Simulation engine there either. An inbox now asks whether an event is too old to read, instead
  of working out a time to read from, so it never needs a run's start. The city day kept its
  digest, took 44.0 s against 45.4 s before, and peaked at 1,321 MB against 1,245 MB.
- **Numbers, as built:** I03-E02-019-P05 gave each module a `numbers.ts` with its branded numbers
  and their creators, the only place besides IDs and System's math where `as` is allowed:
  `Metres` and `Degrees` in Map and routing, `Score` and `Factor` in Drivers, `LogSequence` in the
  Event log, and `WallTime`, `Seed`, `RandomWord`, and a clock speed's `SpeedMultiple` in the
  Simulation engine. `VersionNumber` sits in `version-chain.ts`. `src/domain/quantities.ts` is
  gone.
- **IDs in a cycle:** the user chose on 2026-11-07 that where two classes hold each other's IDs,
  so that "beside the class" would make an import cycle, those IDs get a file of their own in
  their module instead: `OrderEventId`, `DeliveryEventId`, `CommitId`, and `SessionId`. Every
  other ID sits beside its class. `AreaId` and `VersionId`, with no class yet, have a file of
  their own in Map and routing and in Versions.
- **Scenarios uses Orders:** the user chose on 2026-11-07 that Scenarios may use Orders, for the
  orders a scenario's run holds, once `OrderId` left the shared file.
- **Rules for both modules:** Orders and Deliveries each hold their own communication values, for
  their own inbox, and the final order statuses go to Orders. As built in I03-E02-019-P03, Orders' values are
  its inbox job interval, its read lag, and its handoff retries, and Deliveries' are its inbox job
  interval and its read lag, with the same `V1.0.0` numbers as before. The config values in use
  hold both sets, so a config change's log entry records both, and its digest changes once.

### FND-84 — Rule abstractions

Business rules is a module of rule abstractions, which each module writes its own rules with
([FND-83](#fnd-83--types-owned-by-their-modules)). The user chose these on 2026-11-07, for
I03-E04-012:

- **A rule:** a named rule with parameters. Each rule is an object with an ID, a name, what it
  says, the decision or rules page it comes from, its typed parameters with their valid ranges,
  and the code that applies it. A module lists its rules in order. People and the simulator change
  a rule's parameters, never its code.
- **The rules written this way:** every rule the code applies: eligibility, ranking, the
  notification delay and limits, the dispatch pass, the communication values (the inbox jobs, the
  read lag, and the handoff retries), and the order lifecycle's allowed transitions. The pricing
  rules follow when they are built.
- **The simulator's changes:** a scenario can set rule parameters at its start and at stated
  times. Each change is a config change commit, so the run stays repeatable
  ([FND-54](simulation-model.md#fnd-54--tunability)). Sweeps across many runs wait for Analysis.
- **The UI:** a Rules panel shows each module's rules, what they say, their source, and their
  current parameters, and lets a person change a parameter during a run, as a config change
  commit. The Rule editor capability, in `I06`, adds saving tuned rule sets as presets and
  versions.
- **Rule IDs:** `<module>.<rule-name>`, such as `drivers.fresh-location`, fixed once stored, as
  stored function IDs are. They carry no version: a change to a rule's logic is a new version of
  the service, which Versions owns.
- **Values outside their range:** a run uses them, as FND-54 allows, and the Rules panel and
  scenario reading warn. Only a value a run cannot use is refused.
- **The panel:** a tab in the run workspace, beside the Inspector and the Trace. It shows each
  rule's definition, source, values, defaults, ranges, and changes; which rule decided what is the
  Rule evaluation log's and the Decision explainer's (`I03-E04-007`, `I03-E04-008`).
- **Valid ranges:** no source states them, so for each module's rules the simulator proposes a
  range for every parameter, and the user reviews it before it goes into the code.
- **Drivers' rules:** the user accepted the proposed rule IDs, kinds, and ranges on 2026-11-07,
  as [Drivers](../../modules/drivers.md#rules) lists them. The ranking score's proximity scale and
  load divisor become parameters too, and the dispatch pass is a calculation, of the next pass's
  time.
- **Orders' and Deliveries' rules:** the user accepted the proposed rule IDs, kinds, and ranges
  on 2026-11-07, as [Orders](../../modules/orders.md#rules) and
  [Drivers](../../modules/drivers.md#rules)
  list them. Each inbox job and the handoff retry job is a calculation of its next run's time, and
  each read lag and the retries per run is a limit. The order lifecycle's allowed transitions are
  one check per transition, for the statuses it is allowed from; the other guards, such as the
  assigned driver and readiness, stay in the code.
- **Module graph:** the user added three edges on 2026-11-07. The Simulation engine tunes rules
  through Business rules, so a config change takes parameter changes by rule ID and routes each
  to the module that owns the rule; Scenarios sets rules through it, so reading a scenario checks
  rule IDs and values; and Business rules uses the Simulation engine for the run's rules, since
  the Rules panel is Business rules', as a tool that works on any module's rules.
- **Rules in a scenario file:** the user chose on 2026-11-07 that a top-level `rules` list sets
  values in the run's start, with no commit, and a step with `set` in place of an actor, a
  command, and an order changes them at its time, as a config change commit. Each entry names a
  rule, a parameter, and a value. A duration is written in the format's time notation; other
  values are plain numbers. Reading a scenario gives its warnings with it, each with its place,
  for a value outside its valid range; the command line prints them. The browser goes straight to
  the live run when a scenario opens, so the user chose on 2026-11-07 that the run workspace
  shows them in a strip right below its run controls, styled like a scenario's problems, until
  another scenario opens.
- **As built:** in I03-E04-012, on 2026-11-07. A person writes a value in the Rules panel as a
  scenario file writes it, and a change made there is a config change commit at the run's
  current time. Drivers' eligibility calls each check by name, since going through the checks as
  a list made the city day about 12% slower.

### FND-85 — System submodules

The user asked on 2026-11-07 that the shared helpers at the root of `src/domain` move into the
System module ([FND-83](#fnd-83--types-owned-by-their-modules)): "helper types like fieldsof,
unreachable, should [not] be in the domain root, instea they should be in the sustem moduel in
their respective submodues, for exapmle timer related type should be in the time submodule,
validation related types in the validations submodule". The user then chose, for I03-E02-020:

- **Submodules:** System holds eight, each a folder in `src/domain/system/`: `time` (`IInstant`,
  `Duration`, the clock, and their test helpers), `randomness` (the random source), `math`
  (`Count`, `Position`, `Fraction`, and `isWhole`), `validation` (`required`, `unreachable`, and
  `refuse`), `classes` (`FieldsOf`, and the `deepFrozen` test helper, since both serve the
  immutable-class pattern), `digests` (how a record is written out for a digest, and `allTrue`),
  `records` (a record's version chain), and `messaging` (how far an inbox has read).
- **The domain root:** it holds module folders only, and the architecture check refuses a file
  added there.
- **Infrastructure's root:** it holds module folders only too. Its shared files move into an
  Infrastructure System folder that mirrors the domain's: `json` (the JSON value and the JSON
  check, which only Infrastructure makes), `records` (how grouped records and counts are
  persisted), `messaging` (a persisted inbox and its position), and `functions` (the stored
  function contract that the modules' functions register with).
- **Tracking:** a new item, I03-E02-020, planned first. The user approved its plan on 2026-11-07.
