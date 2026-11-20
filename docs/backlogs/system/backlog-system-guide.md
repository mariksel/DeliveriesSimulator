# Backlog System

This document defines how the Markdown backlog is organized, read, and
maintained. AI agents must consult it before changing backlog structure or
records and whenever they execute the backlog maintenance workflow. The project's
agent instructions (`CLAUDE.md`, `AGENTS.md`, `copilot-instructions.md`, or
equivalent) should also link here.

## Authority and evidence

The backlog is canonical for work lifecycle status. Design, decision, and
approved plan documents remain authoritative for product rules, architecture,
and acceptance details. A backlog item must link to those sources and must not
turn an undecided detail into an approved requirement.

Keep work lifecycle separate from evidence/decision status. Evidence labels are
`Observed`, `Approved`, `Implemented`, `Planned`, `Undecided`, and
`Superseded/stale`. Preserve contradictory source claims; represent unresolved
status conflicts as `Blocked` with `Undecided` evidence until the user resolves
them.

## Navigation structure

The hierarchy is Initiative → Epic → Item. Each initiative and epic has a stable
ID and a component-named Markdown index. Name the initiative index
`<initiative-id>-<title-slug>-backlog.md` and the epic index
`<epic-id>-<title-slug>-backlog.md` (for example, `I01-first-release-backlog.md`
and `I01-E01-core-requirements-backlog.md`).

Active initiative directories live under
`Initiatives/<initiative-id>-<title-slug>/`; archived initiative directories live
under `Initiatives/Archive/Done/`, `Initiatives/Archive/Cancelled/`, or
`Initiatives/Archive/Delegated/`. Active epic directories live under their
initiative directory; archived epic directories live under that initiative's
`Archive/Done/`, `Archive/Cancelled/`, or `Archive/Delegated/`.

Name initiative directories, epic directories, and item files with the stable ID
followed by a succinct title slug, using lowercase kebab-case (for example,
`Initiatives/I01-first-release/`, `I01-E01-core-requirements/`, and
`I01-E01-001-define-acceptance-rules.md`). Derive each slug from the canonical
title; retain the words needed to identify its central subject and intent. Do
not truncate mechanically if that makes the title unclear. IDs remain the
authoritative identifiers and do not change when titles or priorities change;
update paths and links when a title slug changes.

Each epic contains four active priority folders (`Critical`, `High`, `Normal`,
`Low`) and an `Archive` folder. Items are individual Markdown files directly
inside a priority folder. An item can contain internal phases; where its source
has no phases, track the item status directly.

Item archives are grouped as `Archive/Done/<priority>/`,
`Archive/Cancelled/<priority>/`, and `Archive/Delegated/<priority>/` within an
epic. `Done` and `Cancelled` archive directories always exist, including empty
ones. Create a `Delegated` archive directory, with its indexes, the first time
something is delegated at that level. An item is moved to
`Archive/Done/<priority>/` immediately when its status becomes `Done`; it is not
kept in the active priority directory while it remains completed. A `Cancelled`
item moves to the `Cancelled` archive in the same way. A delegated item or epic
is completed for its originating component: set its status to `Delegated`, record
the delegated component's ID and link in the item or epic record, and move it to
the matching `Delegated` archive.

Every archive directory has a component-named Markdown index summarizing its
state and children. Name archive indexes `<component-slug>-archive-index.md`,
`<component-slug>-archive-<state>-index.md`, and
`<component-slug>-archive-<state>-<priority>-index.md` at the archive, state, and
state/priority levels respectively. Name active priority indexes
`<component-slug>-priority-<priority>-index.md`. The component slug is the ID
followed by the title slug. The master backlog index is
`development-backlog.md`, the system guide is `system/backlog-system-guide.md`,
and the initiative tree is `Initiatives/initiatives-index.md`.

`Done`, `Cancelled`, and `Delegated` are terminal statuses. An epic with any
non-terminal child remains active, even if other children are archived. An
initiative with any non-terminal epic remains active. When all children of an
epic or initiative are terminal, move it to the archive matching its derived
status: `Done` if any child is `Done`; otherwise `Delegated` if any child is
`Delegated`; otherwise `Cancelled`. A delegated epic's record names the receiving
component. Moving an item because its priority changes must not change its ID;
append the priority change to its history. Update every link when an initiative,
epic, or item moves.

See the remainder of this guide for the identifier, item-field, status, phase
roll-up, alias, synchronization, and manual-validation conventions.

## Identifiers and aliases

Use stable, priority-independent identifiers:

- Initiative: `I01`
- Epic: `I01-E01`
- Item: `I01-E01-001`
- Internal item phase: `I01-E01-001-P01`

Include the ID and a succinct, recognizable title slug in the item filename (for
example, `I01-E01-001-define-acceptance-rules.md`); include the ID and title slug
in initiative and epic directory names as described in
[Navigation structure](#navigation-structure). Use the component-named index
filename pattern defined there instead of a generic `README.md`. Allocate item
sequence numbers within the epic; do not encode priority or lifecycle state into
IDs. An item's ID does not change when its title, priority, or status changes.

Record old identifiers as aliases in the canonical item's `Aliases` field and
link old source locations to the canonical item. One legacy ID may alias
multiple canonical items when its original scope spans them. Do not create a
duplicate item just to preserve an old identifier.

## Item record

Each item is one Markdown file. Its H1 is `<ID> — <Title>`, followed by a field
table and sections in this order. The [item template](templates/item.md) shows
the layout.

| Field | Use |
| --- | --- |
| `ID` | Stable item ID. |
| `Parent` | Link to the epic index. |
| `Status` | One lifecycle status. |
| `Priority` | `Critical`, `High`, `Normal`, or `Low`. |
| `Evidence` | One or more evidence labels. |
| `Aliases` | Old identifiers. Only when the item has any. |
| `Created` | Date the item was created. |
| `Last updated` | Date anything in the item last changed. |
| `Completed` | Completion date, or `Not completed`. |
| `Delegated to` | Link to the receiving component. Only when `Delegated`. |

Sections:

1. `Scope`
2. `Acceptance criteria`
3. `Dependencies`
4. `Sources and evidence`
5. `Internal phases`, only when the source defines phases
6. `Status history`
7. `Priority history`

Write records and indexes within the
[Markdown line length](../../design/governance/document-governance.md#markdown-line-length)
limit.

Do not add `Owner` or `Review date` fields. Use ISO 8601 calendar dates
(`YYYY-MM-DD`). Update `Last updated` whenever anything in the item changes.
`Status history` and `Priority history` are append-only: record new entries with
the date of the change and enough linked evidence to explain it; do not rewrite
or delete prior history entries.

## Lifecycle and evidence labels

Lifecycle status describes the current work state and must be one of:

| Status | Use |
| --- | --- |
| `Proposed` | Captured, but not yet ready to start. |
| `Ready` | Scope and prerequisites are sufficiently clear to begin. An item becomes `Ready` once its dependencies are `Done`; its open questions are settled when it is planned. |
| `In Progress` | Work has started and is not complete. |
| `Blocked` | Work cannot proceed or its status/scope has an unresolved conflict. |
| `Done` | The approved acceptance criteria are complete. |
| `Cancelled` | The user explicitly approved cancelling the work. |
| `Delegated` | The work was reassigned to another backlog component. Completed for this component; must reference the delegated component. Archived under `Archive/Delegated/`. |

Evidence/decision labels describe the evidence attached to an item and are
separate from lifecycle status: `Observed`, `Approved`, `Implemented`,
`Planned`, `Undecided`, and `Superseded/stale`. Preserve conflicting source
evidence and mark it `Undecided`; do not select a side without user direction.
Cancellation is never inferred from inactivity or supersession and requires
explicit user approval.

## Phase status and item roll-up

For an item with source-defined phases, track each phase using the lifecycle
statuses and derive the item status in this order:

1. `Done` when all phases are `Done`.
2. Otherwise, `Blocked` when any phase is `Blocked`.
3. Otherwise, `In Progress` when any phase is `In Progress` or `Done` while other phases remain.
4. Otherwise, `Ready` when any phase is `Ready`.
5. Otherwise, `Proposed`.

The second rule preserves blockers even when other phases have completed. If an
item has no source-defined phases, set its lifecycle status directly from the
source record and evidence. Do not invent phases to make an item fit the roll-up
rule.

## Initiative summary hierarchy

Each initiative's component-named backlog index keeps its overview, includes a
metadata table with `ID`, `Status`, `Priority`, `Created`, `Last updated`, and
`Completed`, and provides a complete, always-expanded status tree with two root
sections: `Non-archived` and `Archived`. Derive metadata by the same rules as
initiative rows in the master index below. Represent the hierarchy with nested
Markdown lists: roots contain epics, epics contain items, and phase-bearing
items contain their source-defined phases. Show items without phases as leaf
entries within their epic. Repeat an epic beneath both roots when it has child
items in both states. Under each epic, list every item in that root and all
source-defined phases for those items. In the `Archived` root, mark each
archived item `Archived — <lifecycle status>` (for example, `Archived — Done`)
so archive placement is distinct from its lifecycle status. Active epic
ancestors included only to provide a path to archived descendants must be marked
`Active context — not archived` and retain their actual active status. An item
appears once under its parent epic only; do not duplicate it at the initiative
root or beneath another epic. Link each epic and item to its canonical index or
record.

Each epic's component-named backlog index provides a complete, always-expanded
item summary using the same `Non-archived` and `Archived` roots. The hierarchy
is root → item → source-defined phases; items without phases are leaves. Include
each item beneath exactly one root according to its physical archive location
and lifecycle status, and include its phases beneath it when present. Mark
archived items `Archived — <lifecycle status>` so archive placement is distinct
from lifecycle status. An epic with items in both states has items in both
roots; an epic whose items are all archived has an empty-state message under
`Non-archived` and its items under `Archived`. Display status, last-updated
date, and priority for each item, and status and last-updated date for each
phase; leave phase dates blank unless supported by phase-specific evidence. Link
items to their canonical records. Preserve the existing priority/archive
navigation and overview sections after the summary.

Display status, last-updated date, and priority for every epic and item; display
status and last-updated date for every phase. An epic's date is the latest
`Last updated` date among the items shown beneath that epic in that root. For an
active epic, derive status from those items using this precedence: `Blocked`,
`In Progress`, `Ready`, then `Proposed`. For an archived epic, show `Done` if any
child item is `Done`; otherwise show `Delegated` if any child item is
`Delegated`; otherwise show `Cancelled`. Derive epic priority as the highest
priority among its displayed children (`Critical`, `High`, `Normal`, `Low`).
These are summary-only values; do not add inferred lifecycle fields to epic
records.

Sort epics and items by `Last updated` descending, then priority (`Critical`,
`High`, `Normal`, `Low`), then stable ID ascending. Phase records include a
`Last updated` column. Leave it blank when the source does not establish a
phase-specific date; blank dates sort after recorded dates, then by inherited
item priority and phase ID. Do not copy an item's date into a phase date without
phase-specific evidence. Update initiative summaries whenever item/phase status,
date, priority, archive placement, or hierarchy changes.

The `Initiatives/initiatives-index.md` index also provides a complete,
always-expanded tree with `Non-archived` and `Archived` roots. Its hierarchy stops
at the item level: roots contain initiatives, initiatives contain epics, and
epics contain items; do not include item phases. These roots represent the
physical archive state of initiatives: list an initiative under `Archived` only
if its directory has actually been moved into `Initiatives/Archive/Done/`,
`Initiatives/Archive/Cancelled/`, or `Initiatives/Archive/Delegated/` after all
its epics are terminal. Never repeat an active initiative under `Archived` merely
because it has archived epics or items. Under `Non-archived`, include all of each
active initiative's epics and items; mark a physically archived epic
`Archived — <lifecycle status>` and every archived item
`Archived — <lifecycle status>`, preserving its lifecycle status separately. This
keeps archived descendants visible without misrepresenting their active
ancestors. Link each initiative, epic, and item to its canonical component-named
index or record.

Initiative rows display ID in the linked label, status, priority, `Created`,
`Last updated`, and `Completed`. Derive `Created` as the earliest `Created` date
among all descendant items and `Last updated` as the latest descendant item
`Last updated` date; calculate these across the entire initiative, independent of
the current root. Derive initiative priority as the highest priority among all
descendant items. Derive status from all epics: use `Blocked`, `In Progress`,
`Ready`, then `Proposed` when any epic is nonterminal; otherwise use `Done` if any
epic is `Done`, `Delegated` if any epic is `Delegated`, and `Cancelled` if all
epics are `Cancelled`. Set `Completed` to the latest descendant item completion
date only when every epic is terminal; otherwise show `Not completed`. For
initiative rows in both roots, repeat the same overall initiative metadata. Use
root-specific item and epic projections, metadata, and sorting rules as defined
above. Keep the index's navigation links to initiative archives in addition to
the tree.

### Index entry formats

Each index entry stays on one line. Entries use these forms:

```text
- [I01 — Title](path) — In Progress — Priority: High — Created: 2026-01-10 — Last updated: 2026-01-20
  - [I01-E01 — Title](path) — In Progress — Last updated: 2026-01-20 — Priority: High
    - [I01-E01-002 — Title](path) — Ready — Last updated: 2026-01-20 — Priority: High
      - Phases:
        - `I01-E01-002-P01` — Title — Done — Last updated: 2026-01-18
    - [I01-E01-001 — Title](path) — Archived — Done — Last updated: 2026-01-15 — Priority: Normal
```

## Creating records

Copy the matching template from [templates](templates) and replace every
`{placeholder}`. A link that still contains a placeholder is not a broken link
until the placeholder is filled in, but no placeholder may remain in a record.

| Template | Creates |
| --- | --- |
| [item.md](templates/item.md) | One item, in a priority folder |
| [initiative-backlog.md](templates/initiative-backlog.md) | The initiative index |
| [initiative-archive-index.md](templates/initiative-archive-index.md) | `Archive/` inside an initiative |
| [initiative-archive-state-index.md](templates/initiative-archive-state-index.md) | `Archive/<state>/` inside an initiative |
| [epic-backlog.md](templates/epic-backlog.md) | The epic index |
| [epic-priority-index.md](templates/epic-priority-index.md) | Each of the four priority folders |
| [epic-archive-index.md](templates/epic-archive-index.md) | `Archive/` inside an epic |
| [epic-archive-state-index.md](templates/epic-archive-state-index.md) | `Archive/<state>/` inside an epic |
| [epic-archive-state-priority-index.md](templates/epic-archive-state-priority-index.md) | `Archive/<state>/<priority>/` inside an epic |

A new initiative starts with its index, an archive index, and `Done` and
`Cancelled` state indexes. A new epic starts with its index, four priority
indexes, an archive index, and `Done` and `Cancelled` state indexes with four
priority indexes each.

## Keeping records and indexes synchronized

A change to an item's status, date, priority, archive location, or phases must
update, in the same change:

1. The epic backlog index (`<epic>-backlog.md`).
2. The priority index of the folder the item is in or moves to, and of the one
   it leaves.
3. The initiative backlog index (`<initiative>-backlog.md`) and its metadata
   table.
4. The master `Initiatives/initiatives-index.md`.

Reposition an entry when its date changes, following the sort order above. Each
item appears under exactly one root (`Non-archived` or `Archived`) of its epic
index. When a status becomes `Done`, `Cancelled`, or `Delegated`, move the file to
its archive in the same change and fix every link that pointed at the old path.

## Manual validation

Run these checks after every edit under `docs/`, for every file changed. A broken
link is a failed edit; do not report the task complete until the checks pass.

- Every relative link resolves to an existing file.
- No line holds a link fragment that lost its start, such as a line beginning with
  a file name and a closing parenthesis.
- Every row of a table has the same number of columns, and no plain text line
  sits between table rows.
- Every code fence is closed.
- In the diff, every changed line keeps its original prefix: bullet, number,
  indent, leading table pipe, or link start.
- After a move or rename, a search of the repository finds no link to the old
  path.
- Index entries are in the required sort order after a date change.
- Dates are ISO 8601 and the history entry exists.
- No `{placeholder}` remains in a record.

Problems in files you did not edit are existing damage: do not hide them and do
not guess a repair; report them to the user.

## Initiatives

- [Initiatives index](../Initiatives/initiatives-index.md)
