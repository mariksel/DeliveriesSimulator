import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173';
/** How many WebKit tests run at once, at most. */
const WEBKIT_WORKERS = 4;

export default defineConfig({
    testDir: 'e2e',
    forbidOnly: true,
    use: { baseURL: BASE_URL },
    projects: [
        { name: 'chromium', use: devices['Desktop Chrome'] },
        { name: 'firefox', use: devices['Desktop Firefox'] },
        // WebKit timed out waiting for elements to settle when it ran many tests at once beside
        // the other browsers, a different test each run, though the page was still; fewer of its
        // tests at a time keeps the end-to-end stage steady.
        { name: 'webkit', use: devices['Desktop Safari'], workers: WEBKIT_WORKERS },
    ],
    webServer: {
        command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
        url: BASE_URL,
    },
});
