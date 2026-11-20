# {item-id} — {Item title}

| Field | Value |
| --- | --- |
| ID | `{item-id}` |
| Parent | [{epic-id} — {Epic title}](../{epic-slug}-backlog.md) |
| Status | {Proposed, Ready, In Progress, Blocked, Done, Cancelled, or Delegated} |
| Priority | {Critical, High, Normal, or Low} |
| Evidence | {Observed, Approved, Implemented, Planned, Undecided, or Superseded/stale; several allowed} |
| Aliases | {Old identifiers; delete this row if none} |
| Created | {YYYY-MM-DD} |
| Last updated | {YYYY-MM-DD} |
| Completed | {YYYY-MM-DD, or Not completed} |
| Delegated to | [{component-id} — {Component title}]({relative-path}); {delete this row unless Delegated} |

## Scope

{What this item covers and what it leaves out. Link the decisions that govern it.}

## Acceptance criteria

- {An observable condition that must hold for this item to be Done.}

## Dependencies

- [{item-id} — {Item title}]({relative-path})

{Or: None.}

## Sources and evidence

- [{Source title}]({relative-path})

## Internal phases

{Delete this section unless the source defines phases. Do not invent phases.}

| ID | Source phase | Status | Last updated | Evidence |
| --- | --- | --- | --- | --- |
| `{item-id}-P01` | {Phase title} | {Status} | {YYYY-MM-DD, or blank without phase-specific evidence} | {Evidence label} |

## Status history

- {YYYY-MM-DD} — Created as {Status}. {Reason, with linked evidence.}

## Priority history

- {YYYY-MM-DD} — Created at {Priority} priority. {Reason.}
