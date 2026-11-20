import { defineConfig } from 'vitest/config';

// Only the core's tests: mutation testing runs them many times, and needs neither a browser nor
// Angular.
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/{domain,application-core,application,infrastructure}/**/*.spec.ts'],
        // The same equality for moments and lengths as the core project in vitest.config.ts.
        setupFiles: ['src/domain/system/time/time-equality.testing.ts'],
    },
});
