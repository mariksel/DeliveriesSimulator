# Document Governance

How the design graph and the other repository documents are written and
maintained. Version labels are described separately in
[versioning](versioning.md).

## Evidence and status vocabulary

Every document distinguishes source-backed observations from approved
decisions and proposed future work. Use these status terms consistently:

- **Observed:** confirmed in checked-in source at the time of review.
- **Approved:** explicitly recorded in a user-approved decision/plan.
- **Implemented:** behavior/code exists in the workspace; does not itself
  imply deployment.
- **Planned:** present in an approved implementation plan but not
  necessarily implemented.
- **Undecided:** absent approval/evidence; do not treat as a requirement.
- **Superseded/stale:** an earlier document says something inconsistent with
  current source; link the old source and call out the discrepancy.

## Document ownership and graph maintenance

`docs/design/README.md` is the entry point. Module documents link to
dependent capabilities, shared cross-cutting documents, approved decisions,
and relevant source. When a concept has a dependency, add a link at the point
it matters and a reciprocal link when it improves navigation. Keep links
relative and test them when adding or moving pages.

When code changes materially, update the related page and the relevant
version label/status. Do not copy full source plans into this graph;
summarize and link to the authoritative plan/decision record. Do not mark a
decision approved unless its source says it is approved.

Project-specific architecture, design constraints, and business rules belong
in the appropriate design, module, integration, decision, or plan document, not
in agent instruction files such as `CLAUDE.md`, `AGENTS.md`, or
`copilot-instructions.md`. Agent instructions should provide general working
guidance and link to the design-document entry point and relevant authoritative
project documents. When adding project-specific guidance, update the owning
document and ensure agents can discover it through those links rather than
duplicating its content in instructions.

## Conflicts and gaps

If documents conflict with each other or with code, or a rule is ambiguous, stop
and ask the user. Do not choose a side by inference. After clarification, update
code and documents together. Mark an unresolved conflict in the backlog as
`Blocked` with `Undecided` evidence, and record it in
[open decisions](open-decisions.md).

When reviewing or changing code, check that the documents capture its business
logic and architectural decisions accurately and unambiguously. Ask the user when
closing a gap needs an unstated business or architectural decision.

## Markdown line length

Markdown text should fit one screen width. Long lines are hard to read in an
editor and make git diffs hard to review, because a one-word change marks the
whole paragraph as changed. This applies to all Markdown in the repository,
including design documents, backlog records, and indexes.

- Keep lines under 100 characters. Wrap prose by hand, preferably after a
  sentence or clause, so a later edit changes as few lines as possible.
- Indent the continuation lines of a list item to the item's text.
- Never break inside a link: keep its bracketed text and its target on one
  line, and start a new line before the link when it would not fit.
- These may exceed 100 characters when they cannot be wrapped: table rows
  (one row per line), headings, a single long link or path, and lines inside
  code fences.
- Backlog index entries stay on one line each, like table rows, even when
  they exceed 100 characters. This covers the list entries in the
  `*-index.md` and `*-backlog.md` files under `docs/backlogs`; the prose in
  those files is wrapped.

## Editing Markdown safely

These rules apply to every edit under `docs/`, and matter most for AI agents, whose
partial replacements can silently damage a document.

- Read the target file fully, or the whole region you edit, before editing. Never
  edit from memory or from truncated search results.
- Read the owning design documents linked from the record you change.
- Make the smallest edit that works. Never rewrite or regenerate a whole document.
- Match and replace complete lines, from the first character (bullet, number,
  indent, or leading `|`) to the last. Keep the same prefix, indentation, and
  trailing pipe or punctuation. A replacement that starts or ends mid-link,
  mid-bullet, or mid-table-row can delete the link prefix or leading cell, leaving
  a line that begins with a file name and a closing parenthesis.
- Preserve full link syntax (the link text in square brackets directly followed by
  the target in parentheses), list markers and indentation, table pipes and column
  counts, heading levels, code fences, and the em dash (`—`) separators the files
  already use.
- Keep the line endings, trailing newline, and encoding of the existing file.
- Keep one table row per line; escape literal pipes in cells as `\|`.
- Change archived records only through the
  [backlog lifecycle](../../backlogs/system/backlog-system-guide.md#lifecycle-and-evidence-labels).

After every edit, run the
[manual validation](../../backlogs/system/backlog-system-guide.md#manual-validation).
