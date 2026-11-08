# DeliveriesSimulator

A browser-based simulator of a food-delivery service's delivery algorithms and flows: orders,
drivers, dispatch, and the event communication between the orders and deliveries modules.
It runs entirely in the frontend, is deterministic (seeded randomness), and keeps every run as a
tree of commits, so a run can be stepped back and forth through time, forked, and compared.

## Requirements

- Node.js 26 or later (see `.nvmrc`)

## Getting started

```bash
npm install
npm run dev        # start the app (Vite)
```

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the development server |
| `npm run build` | Production build into `dist/` |
| `npm test` | Unit and component tests (Vitest) |
| `npm run test:coverage` | Tests with coverage |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npm run test:mutation` | Mutation tests (Stryker) |
| `npm run lint` | ESLint |
| `npm run check:architecture` | Layer and dependency rules (dependency-cruiser) and core type check |
| `npm run check:types` | Type check of the source and its tests |
| `npm run check:public-safety` | Looks for private text in the files git would publish |
| `npm run check` | Every check above, in order |
| `npm run scenario` | Run a scenario from the command line |
| `npm run benchmark` | City-scale benchmark (`-- --drivers n --orders n`) |
| `npm run self-test` | Simulator self-tests |

## Documentation

Design, architecture and decisions are in [`docs/`](docs/README.md); start with
[`docs/design/README.md`](docs/design/README.md).

## License

[MIT](LICENSE)
