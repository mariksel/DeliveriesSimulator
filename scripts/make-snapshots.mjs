// Saves a run of each built-in scenario at "minimum", as the persisted records a saved run keeps,
// for the snapshot tests `npm run check` runs (FND-81, I03-E02-009). Make them again only when a
// new state function version is added. Usage: npm run snapshots -- [--out folder]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';

const DEFAULT_OUT = 'src/infrastructure/verification/snapshots';

function option(name, fallback) {
    const index = process.argv.indexOf(`--${name}`);
    return index < 0 ? fallback : process.argv[index + 1];
}

const out = option('out', DEFAULT_OUT);

// Vite compiles the core's TypeScript. The core has no Angular, so this needs no plugin.
const vite = await createServer({
    configFile: false,
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
});
try {
    const load = (path) => vite.ssrLoadModule(path);
    const { BundledScenarios } = await load('/src/infrastructure/scenarios/bundled-scenarios.ts');
    const { createRun } = await load('/src/application-core/simulation-engine/run-state.ts');
    const { scheduleScenario } = await load(
        '/src/application-core/scenarios/schedule-scenario.ts',
    );
    const { SimulationRun } = await load('/src/application/simulation-engine/simulation-run.ts');
    const { REGISTERED_FUNCTIONS } = await load(
        '/src/infrastructure/simulation-engine/function-registry.ts',
    );
    const { toPersistedRun, atMinimum } = await load(
        '/src/infrastructure/simulation-engine/persisted-run.ts',
    );
    const { SAVED_RUN_SCHEMA_VERSION } = await load(
        '/src/infrastructure/run-history/persisted-saved-run.ts',
    );

    const builtIns = new BundledScenarios();
    mkdirSync(out, { recursive: true });
    const made = builtIns.list().map((builtIn) => {
        const read = builtIns.scenario(builtIn.id);
        if (!read.isOk) {
            throw new Error(`The built-in scenario ${builtIn.id} is invalid.`);
        }
        const { scenario } = read;
        const created = createRun({ seed: scenario.seed, functions: REGISTERED_FUNCTIONS });
        const start = scheduleScenario(created, scenario.start, scenario.steps);
        const run = new SimulationRun(start);
        run.advanceTo(scenario.runUntil);
        const everything = toPersistedRun(run.state);
        const minimum = { ...everything, branches: atMinimum(everything.branches) };
        const body = { schemaVersion: SAVED_RUN_SCHEMA_VERSION, run: minimum };
        const path = join(out, `${builtIn.id}.json`);
        writeFileSync(path, `${JSON.stringify(body)}\n`);
        return { id: builtIn.id, commits: run.state.line.commits.size, path };
    });
    const report = JSON.stringify(made, null, 2);
    console.log(report);
} finally {
    await vite.close();
}
