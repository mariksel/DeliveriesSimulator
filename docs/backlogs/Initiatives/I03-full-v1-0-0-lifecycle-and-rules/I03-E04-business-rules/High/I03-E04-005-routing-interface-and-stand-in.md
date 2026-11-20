# I03-E04-005 — Routing interface and stand-in

| Field | Value |
| --- | --- |
| ID | `I03-E04-005` |
| Parent | [I03-E04 — Business rules](../I03-E04-business-rules-backlog.md) |
| Status | Proposed |
| Priority | High |
| Evidence | Approved; Planned |
| Created | 2026-11-05 |
| Last updated | 2026-11-11 |
| Completed | Not completed |

## Scope

The routing interface that `I07` implements, with a stand-in that routes along the city's
streets from
[I03-E09-005](../../Archive/Done/I03-E09-city-and-map/Archive/Done/High/I03-E09-005-streets-and-routing.md),
in place of the straight line, and a simple failure step that can fail it. A failure falls
back as the rules page says. Each route request is an output commit.

## Acceptance criteria

- A delivery fee band uses the stand-in's distance.
- A failing route uses the fallback the rules page describes.

## Dependencies

- [I03-E04-001 — Money, prices, and commission](I03-E04-001-money-prices-and-commission.md)
- [I03-E09-002 — Delivery addresses](../../Archive/Done/I03-E09-city-and-map/Archive/Done/High/I03-E09-002-delivery-addresses.md)
- [I03-E09-005 — Streets and routing](../../Archive/Done/I03-E09-city-and-map/Archive/Done/High/I03-E09-005-streets-and-routing.md)

## Sources and evidence

- [V1.0.0 business rules](../../../../../design/versions/V1.0.0/business-rules.md)
- [Map and routing](../../../../../design/modules/map-and-routing.md)
- [Project foundation: FND-80](../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-80--planning-stage-i03)
- [Project foundation: FND-90](../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)

## Status history

- 2026-11-05 — Created as Proposed: the user approved the stage's plan in I03-E01-001. It starts
  when its dependencies are Done.
- 2026-11-10 — Still Proposed: it now also depends on I03-E09-002, which gives orders the addresses
  it measures to
  ([FND-90](../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).
- 2026-11-11 — Still Proposed: the stand-in routes along the streets of I03-E09-005, in place of the
  straight line, as the user chose ([FND-90](../../../../../design/decisions/project-foundation/stages-and-process.md#fnd-90--map-and-a-simple-city-brought-forward)).

## Priority history

- 2026-11-05 — Created at High priority, like I02's items, when the user approved the plan.
