# Versioning

How design and architecture versions are labeled and changed.

## Version types are independent

The design graph uses semantic-version-style labels, but each label names its
own subject. It is invalid to infer that a change to one label changes another
subject.

| Prefix | Subject | Example |
|---|---|---|
| `D` | Design-document set and its decision/detail content | `D1.0.0` |
| `A` | Software architecture baseline | `A1.0.0` |
| `V` | A simulated version of the real service's delivery logic ([FND-41](../decisions/project-foundation.md#fnd-41--version-numbers)) | `V1.0.0` |
| `X` | The conformance exchange format ([FND-52](../decisions/project-foundation.md#fnd-52--conformance-exchange)) | `X1.0.0` |

Add a row for any other subject the project versions independently, such as an
external contract, a data schema, or a product scope label.

Versions are written with a type prefix even if context might otherwise
disambiguate. `1.0.0` denotes the initial documented baseline only when
qualified as, for example, `A1.0.0`.

## Change policy

Use SemVer semantics for each labeled dimension:

- **Major:** incompatible change to that dimension's documented contract or governing structure.
- **Minor:** backward-compatible capability or design addition.
- **Patch:** correction or clarification that does not alter the contract.
