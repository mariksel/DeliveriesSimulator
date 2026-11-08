# Versions

Each version of the real service's delivery logic has a folder here, named after its full number
([FND-41](../decisions/project-foundation.md#fnd-41--version-numbers)). A version's pages are
its specification ([FND-36](../decisions/project-foundation.md#fnd-36--inventory-per-version)).
Versions after `V1.0.0` describe only what differs from the version they are based on.

| Version | Kind | Based on | Status |
| --- | --- | --- | --- |
| [`V1.0.0`](V1.0.0/README.md) | Built snapshot, 2026-11-03 | — | All six topic pages confirmed |
| [`V1.1.0-planned-dispatch`](V1.1.0-planned-dispatch/README.md) | Approved design | `V1.0.0` | Confirmed |
| `V2.0.0-module-copies` | — | — | Dropped on 2026-11-03: the module copies are built in `V1.0.0` |

## Waiting for later versions

These undecided questions belong to approved features of the real service that are not built
yet. They become option switches in the version that adds each feature (user decision,
2026-11-03):

| Feature | Undecided questions |
| --- | --- |
| Return request cancellation | Whether a driver may submit a new return request after cancelling one |
| Driver reads beyond open requests | History filters, sort order, and page limits; the cash summary period and fields; whether the original driver keeps access to a transferred order's history |
| Back-office reassignment | Its event names and actor attribution; whether staff may cancel a pending one; whether a pending payment return blocks it |
| Arrival estimates | What is shown when the routing provider fails |
