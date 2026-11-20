## Documentation

- Before analyzing or implementing a feature, consult the relevant pages from
  the design entry point, docs/design/README.md. Keep code and these documents
  synchronized when a change alters documented behavior or structure.
- Before changing backlog records or structure, read
  docs/backlogs/system/backlog-system-guide.md. For a task tracked in the
  backlog, use its canonical item for current lifecycle status.
- Before writing or changing code, read docs/design/governance/code-style.md.
- Before changing documents, read docs/design/governance/document-governance.md.
  Run the manual validation in the backlog system guide after every edit.
- Project-specific architecture, design constraints, and business rules belong
  in their owning documents. These instructions link to those documents and do
  not duplicate their content.
- If documentation and code conflict, or the correct interpretation is
  ambiguous, do not choose one by inference. Present the specific conflict and
  ask the user. After clarification, update code and documents together.
- When reviewing or changing code, check that its business logic and
  architectural decisions are documented accurately. Ask the user when closing a
  gap needs an unstated business or architectural decision.
- Assign stable hierarchical work IDs: I01, I01-E01, I01-E01-001,
  I01-E01-001-P01. Priority can change and is never part of an ID.
