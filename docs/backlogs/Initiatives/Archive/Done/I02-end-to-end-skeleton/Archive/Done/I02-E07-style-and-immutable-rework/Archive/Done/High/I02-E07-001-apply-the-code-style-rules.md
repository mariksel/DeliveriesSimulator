# I02-E07-001 — Apply the code style rules

| Field | Value |
| --- | --- |
| ID | `I02-E07-001` |
| Parent | [I02-E07 — Style and immutable rework](../../../I02-E07-style-and-immutable-rework-backlog.md) |
| Status | Done |
| Priority | High |
| Evidence | Approved; Implemented |
| Created | 2026-11-04 |
| Last updated | 2026-11-04 |
| Completed | 2026-11-04 |

## Scope

Everything on the code style page marked Planned that does not depend on the immutable design:
the remaining lint rules, naming, distinct ID types, one concept per file, and the Angular rules
for today's one component. It also renames `courier` and `merchant` to `driver` and `restaurant`
in the code, the scenario format, the design documents, the Customers and merchants module, and the
backlog, including finished items and their file names.

### Outcome

- 43 rules on the code style page are now Applied, and the tools named there check them. Rules that
  depend on the immutable design stay Planned, for I02-E07-002 and I02-E07-003.
- Rules were tested by breaking them on purpose in temporary files, and each named tool caught its
  breaks. OnPush is Angular 22's default, so its rule flags a component that opts out.
- `courier` and `merchant` became `driver` and `restaurant` everywhere, as FND-74 records.
- The digest of `e2e/fixtures/one-order.json` changed twice, on purpose: from `c1c82407d680eea3`
  to `16acd99eb1641f80` with the rename, then to `824be9ddc2eee257` with the boolean field names,
  which log entries hold. Mapping those names back gives `c1c82407d680eea3` again, so the runs are
  the same.
- `SeededRandom`'s two pinned sequences named after the old words were recomputed with a separate
  implementation, which first reproduced the old numbers.
- `npm run check` passes, with 487 unit and component tests and 9 end-to-end tests. Stryker scores
  97.65%, up from 97.55%. Its 23 uncaught mutants are message wording or have no effect on
  behaviour.

## Acceptance criteria

- Each rule is applied, and the tools named on the page check it.
- `npm run check` passes, and the scenario's digest is unchanged, or any change is explained. The
  rename changes it, because the digest covers IDs and field names, so this is done as its own step
  and the new digest recorded.
- The page's status column is up to date.

## Dependencies

- [I02-E04-002 — Runner, browser and headless](../../../../I02-E04-scenarios-and-checks/Archive/Done/High/I02-E04-002-runner-browser-and-headless.md)

## Sources and evidence

- [Code style](../../../../../../../../../../../design/governance/code-style.md)
- [Project foundation: FND-72](../../../../../../../../../../../design/decisions/project-foundation/architecture-and-code.md#fnd-72--code-style)
- [Project foundation: FND-74](../../../../../../../../../../../design/decisions/project-foundation/simulation-model.md#fnd-74--driver-and-restaurant-vocabulary)

## Status history

- 2026-11-04 — Created as Proposed, on the user's decision. It starts when its dependencies are
  Done.
- 2026-11-04 — Moved from Proposed to Ready: its dependency, I02-E04-002, is Done.
- 2026-11-04 — Moved from Ready to In Progress: the user started the item.
- 2026-11-04 — Moved from In Progress to Done, on the user's request: its acceptance criteria
  are met, as the outcome records. Archived under `Archive/Done/High/`.

## Priority history

- 2026-11-04 — Created at High priority, like the rest of I02.
