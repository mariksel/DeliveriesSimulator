import { defineConfig } from 'vitest/config';

// Only the core's tests: mutation testing runs them many times, and needs neither a browser nor
// Angular.
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/{domain,application-core,application,infrastructure}/**/*.spec.ts'],
    },
});
