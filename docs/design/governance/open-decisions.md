# Open Decisions and Explicit Unknowns

## Version and status

- **Design version:** `D0.6.0`.
- **Status:** Known gaps based on current source and linked approved planning
  records. This is not a proposal list; it prevents undocumented assumptions
  from becoming architecture.

| Topic | What is established | What remains undecided or gated | Authority / link |
|---|---|---|---|
| Public safety | The project is safe to publish. Only identity is private: the real service's name and location, the people involved, and real data. Its rules, values, event names, and identifiers may be recorded, described generically | How identity is kept out and checked before publishing (U14); the [public-safety check](../decisions/project-foundation.md#fnd-63--tests-and-public-safety-check) finds patterns only, in current files | [Project foundation](../decisions/project-foundation.md#fnd-23--safe-to-publish) |
| Correctness | What business and technical correctness mean, and which decisions the results support | Any further criteria; the targets and limits are set in [FND-50](../decisions/project-foundation.md#fnd-50--targets-and-limits) | [Project foundation](../decisions/project-foundation.md#fnd-29--business-correctness) |
| Success and scope | What makes the simulator a success, and what is out of scope | How soon a new version of the real service must be supported (U12), and any further items | [Project foundation](../decisions/project-foundation.md#fnd-32--success) |
| Source of business rules | Rules come from the real service's documentation, source code, and people who know it, and those people review the simulation. The user gives the location outside these documents, and states the rules and reviews the simulation ([FND-52](../decisions/project-foundation.md#fnd-52--conformance-exchange)) | None | [Business rules](../modules/business-rules.md) |
| Browser storage details | Data lives in IndexedDB | None: data is kept until deleted and migrated across releases ([FND-57](../decisions/project-foundation.md#fnd-57--hosting-and-data)); cities and profiles are records of their own, and runs can be shared as files ([FND-58](../decisions/project-foundation.md#fnd-58--stored-records-and-shared-files)) | [Data](../data/persistence.md) |
| Hosting and publishing | TypeScript, Angular 22, a custom Vite 8 build, Vitest, and Playwright; local only for now; current desktop browsers ([FND-57](../decisions/project-foundation.md#fnd-57--hosting-and-data)) | Where it is hosted and published, and how FND-23 is checked first (U14) | [Architecture overview](../architecture/overview.md) |
| UI structure | A UI section with a business view and a technical view | None: sections, the run workspace, and the views are set in [FND-53](../decisions/project-foundation.md#fnd-53--ui-organisation) | [UI](../ui/README.md) |
| Module boundaries | The capability list | None: drivers, pricing, and the Versions module are set in [FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries) | [Modules](../modules/README.md) |
| Module dependencies | The full graph in the [module map](../modules/README.md#dependency-graph), confirmed 2026-11-03, with the run files dependency of [FND-58](../decisions/project-foundation.md#fnd-58--stored-records-and-shared-files) | None | [Modules](../modules/README.md) |
| Module business rules | Each module page links its approved rules; the real service's rules are specified per [version](../versions/README.md) | None | [Modules](../modules/README.md) |
| Versions | Multiple versions can be tested and compared side by side | None: versions are defined in FND-40 to FND-44, and the Versions module owns them ([FND-56](../decisions/project-foundation.md#fnd-56--module-boundaries)) | [Project foundation](../decisions/project-foundation.md#fnd-26--versions-compared-side-by-side) |
| Inventory | Kept per version, covering built behaviour, approved designs, and undecided options; order detail in full | None: versions are named in FND-41, and the inventory is in the [version pages](../versions/README.md) | [Project foundation](../decisions/project-foundation.md#fnd-36--inventory-per-version) |
| First initiative | I01 gathers requirements and creates the implementation initiatives | None: the stages are in the [implementation roadmap](../roadmap/implementation-roadmap.md) | I01 |
| Run history memory | Every commit keeps its main root in memory, and a saved run has levels ([FND-81](../decisions/project-foundation.md#fnd-81--runs-as-a-tree-of-state-transitions)) | Whether a browser can hold a full city day this way is not measured. `I07` revisits it, and adds checkpoints | I03-E02-017 |

## Rule for resolving an unknown

Resolve an unknown through a user-approved decision record or an explicit
approved plan. Link that record here and update the affected design, module, or
UI page. A code implementation can establish current behavior, but should
not silently be presented as a user-approved product policy.
