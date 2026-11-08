// Runs the simulator's self-tests, which prove that each correctness check can fail.
// Usage: npm run self-test. Exit code: 0 passed, 1 failed.
import { createServer } from 'vite';

const JSON_INDENT = 2;

// Vite compiles the core's TypeScript. The core has no Angular, so this needs no plugin.
const vite = await createServer({
    configFile: false,
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
});
try {
    const { runSelfTests } = await vite.ssrLoadModule(
        '/src/application/verification/self-tests.ts',
    );
    const report = runSelfTests();
    const reportJson = JSON.stringify(report, null, JSON_INDENT);
    console.log(reportJson);
    process.exitCode = report.isPassed ? 0 : 1;
} finally {
    await vite.close();
}
