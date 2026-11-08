import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173';

export default defineConfig({
    testDir: 'e2e',
    forbidOnly: true,
    use: { baseURL: BASE_URL },
    projects: [
        { name: 'chromium', use: devices['Desktop Chrome'] },
        { name: 'firefox', use: devices['Desktop Firefox'] },
        { name: 'webkit', use: devices['Desktop Safari'] },
    ],
    webServer: {
        command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
        url: BASE_URL,
    },
});
