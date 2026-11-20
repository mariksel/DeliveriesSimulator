// Runs a city-scale scenario through the core, and reports how long it takes (FND-48, FND-73).
// Usage: npm run benchmark -- [--drivers n] [--orders n]. It takes minutes, so it runs on demand.
import { performance } from 'node:perf_hooks';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { createServer } from 'vite';

import { cityScenario } from './city-scenario.mjs';

const DEFAULT_DRIVERS = 200;
const DEFAULT_ORDERS = 2000;
const MS_PER_SECOND = 1000;
const KB_PER_MB = 1024;
const SIMULATED_DAY_SECONDS = 86_400;
const JSON_INDENT = 2;

function option(name, fallback) {
    const index = process.argv.indexOf(`--${name}`);
    return index < 0 ? fallback : Number(process.argv[index + 1]);
}

const round = (value) => Math.round(value * MS_PER_SECOND) / MS_PER_SECOND;

// A full garbage collection, so what the heap holds after it is what is still reachable. Node
// gives it only with --expose-gc, which this turns on here, so the benchmark needs no flag.
setFlagsFromString('--expose-gc');
const collectGarbage = runInNewContext('gc');

/** The heap still in use after full garbage collections, in MB. */
function heldMb() {
    collectGarbage();
    collectGarbage();
    return Math.round(process.memoryUsage().heapUsed / KB_PER_MB / KB_PER_MB);
}

async function timed(action) {
    const start = performance.now();
    const value = await action();
    return { value, seconds: round((performance.now() - start) / MS_PER_SECOND) };
}

const drivers = option('drivers', DEFAULT_DRIVERS);
const orders = option('orders', DEFAULT_ORDERS);

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
    const { readScenario } = await load('/src/infrastructure/scenarios/read-scenario.ts');
    const { createRun } = await load('/src/application-core/simulation-engine/run-state.ts');
    const { scheduleScenario } = await load(
        '/src/application-core/scenarios/schedule-scenario.ts',
    );
    const { SimulationRun } = await load('/src/application/simulation-engine/simulation-run.ts');
    const { runDigest } = await load('/src/application-core/simulation-engine/run-digest.ts');
    const { REGISTERED_FUNCTIONS } = await load(
        '/src/infrastructure/simulation-engine/function-registry.ts',
    );
    const { toPersistedRun, fromPersistedRun, atMinimum } = await load(
        '/src/infrastructure/simulation-engine/persisted-run.ts',
    );
    const { savedBytes } = await load('/src/infrastructure/run-history/saved-run-size.ts');

    /**
     * Saves a run at a level as plain data and loads it back, as the repository does without
     * browser storage: how big it is, how long each way takes, and whether the run came back the
     * same, by its log's digest (FND-81).
     */
    async function savedAndLoaded(run, digest, isMinimum) {
        const saved = await timed(() => {
            const everything = toPersistedRun(run);
            return isMinimum
                ? { ...everything, branches: atMinimum(everything.branches) }
                : everything;
        });
        const bytes = savedBytes(saved.value);
        const loaded = await timed(() => fromPersistedRun(saved.value, REGISTERED_FUNCTIONS));
        const loadedDigest = runDigest(loaded.value.cache.log.entries);
        return {
            mb: Math.round(bytes / KB_PER_MB / KB_PER_MB),
            secondsToSave: saved.seconds,
            secondsToLoad: loaded.seconds,
            isSameRun: loadedDigest === digest,
        };
    }

    const read = await timed(() => {
        const secondCityScenario = cityScenario(drivers, orders);
        return readScenario(secondCityScenario);
    });
    if (!read.value.isOk) {
        const problem = read.value.problems.first();
        throw new Error(`The city scenario is invalid: ${JSON.stringify(problem)}`);
    }
    const { scenario } = read.value;
    const heldBeforeRunMb = heldMb();

    /**
     * Runs the day and measures it while the run holds every root. Only this function holds the
     * run, so once it returns the run can be collected, and only its latest root is kept.
     */
    async function runTheDay() {
        const created = createRun({ seed: scenario.seed, functions: REGISTERED_FUNCTIONS });
        const start = scheduleScenario(created, scenario.start, scenario.steps);
        const run = new SimulationRun(start);
        const ran = await timed(() => run.advanceTo(scenario.runUntil));
        const entries = run.state.cache.log.entries;
        const digest = await timed(() => runDigest(entries));
        const heldWithEveryRootMb = heldMb();
        const everything = await savedAndLoaded(run.state, digest.value, false);
        const minimum = await savedAndLoaded(run.state, digest.value, true);
        return {
            failure: run.failure,
            entries: entries.size,
            refused: entries.count((entry) => entry.kind === 'CommandRefused'),
            delivered: entries.count(
                (entry) => entry.source === 'orders' && entry.kind === 'OrderDelivered',
            ),
            commits: run.state.line.commits.size,
            digest,
            ran,
            heldWithEveryRootMb,
            saved: { everything, minimum },
            latestRoot: run.state.root,
        };
    }

    const day = await runTheDay();
    const heldWithLatestRootMb = heldMb();
    const hasLatestRoot = day.latestRoot !== undefined;

    const stateJson = JSON.stringify(
        {
            drivers,
            orders,
            failure: day.failure,
            entries: day.entries,
            refused: day.refused,
            delivered: day.delivered,
            commits: day.commits,
            digest: day.digest.value,
            secondsToRead: read.seconds,
            secondsToRun: day.ran.seconds,
            secondsToDigest: day.digest.seconds,
            simulatedSecondsPerSecond: Math.round(SIMULATED_DAY_SECONDS / day.ran.seconds),
            peakMemoryMb: Math.round(process.resourceUsage().maxRSS / KB_PER_MB),
            // What the heap holds after full garbage collections: before the run, with the run
            // and every root it keeps, and with only its latest root (FND-81, I03-E02-017).
            heldBeforeRunMb,
            heldWithEveryRootMb: day.heldWithEveryRootMb,
            heldWithLatestRootMb: hasLatestRoot ? heldWithLatestRootMb : null,
            // A saved run at each level, as plain data: its size, and how long it took to save
            // and to load, where "minimum" works every root out again (FND-81, I03-E02-008).
            saved: day.saved,
            node: process.version,
        },
        null,
        JSON_INDENT,
    );
    console.log(stateJson);
    process.exitCode = day.failure === null ? 0 : 1;
} finally {
    await vite.close();
}
