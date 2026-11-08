// Runs a scenario headless, with the same core the browser uses, and judges the run (FND-49).
// Usage: npm run scenario -- <file>, or npm run scenario -- --built-in <id>.
// Exit code: 0 passed, 1 failed or refused, 2 could not start.
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

const USAGE = 'Usage: npm run scenario -- <file>, or npm run scenario -- --built-in <id>';
const JSON_INDENT = 2;
const EXIT_FAILED = 1;
const EXIT_CANNOT_START = 2;

const [first, second] = process.argv.slice(EXIT_CANNOT_START);
const builtInId = first === '--built-in' ? second : undefined;
if (first === undefined || (first === '--built-in' && second === undefined)) {
    console.error(USAGE);
    process.exit(EXIT_CANNOT_START);
}

let text;
if (builtInId === undefined) {
    try {
        text = readFileSync(first, 'utf8');
    } catch {
        console.error(`Cannot read ${first}`);
        process.exit(EXIT_CANNOT_START);
    }
}

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
    const { checkScenario } = await load('/src/application/verification/check-scenario.ts');
    // Reading and parsing the file is Infrastructure's, as in the browser.
    const { parseScenarioText } = await load('/src/infrastructure/scenarios/parse-scenario.ts');
    const { BundledScenarios } = await load('/src/infrastructure/scenarios/bundled-scenarios.ts');
    const library = new BundledScenarios();
    const read = builtInId === undefined ? parseScenarioText(text) : library.scenario(builtInId);
    const result = checkScenario(read);
    if (result.isOk) {
        const { run, check, isPassed } = result.checked;
        const stateJson = JSON.stringify(
            {
                isOk: true,
                isPassed,
                name: run.scenario.name,
                seed: run.scenario.seed,
                entries: run.entries.size,
                digest: run.digest,
                failure: run.failure,
                // What reading the scenario warned about, such as a rule value outside its range.
                warnings: read.isOk ? (read.warnings?.toArray() ?? []) : [],
                criteria: check.results,
                ordersJudged: check.ordersJudged,
            },
            null,
            JSON_INDENT,
        );
        console.log(stateJson);
        process.exitCode = isPassed ? 0 : EXIT_FAILED;
    } else {
        const secondText = JSON.stringify(
            { isOk: false, problems: result.problems },
            null,
            JSON_INDENT,
        );
        console.log(secondText);
        process.exitCode = EXIT_FAILED;
    }
} finally {
    await vite.close();
}
