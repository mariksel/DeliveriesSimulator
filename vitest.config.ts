import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.spec.ts',
                'src/**/*.testing.ts',
                'src/ui/test-setup.ts',
                'src/composition/main.ts',
            ],
            reporter: ['text-summary', 'html'],
            thresholds: { lines: 95, branches: 90, functions: 90 },
        },
        projects: [
            {
                test: {
                    name: 'core',
                    environment: 'node',
                    include: [
                        'src/{domain,application-core,application,infrastructure}/**/*.spec.ts',
                    ],
                    setupFiles: ['src/domain/system/time/time-equality.testing.ts'],
                },
            },
            {
                plugins: [angular({ tsconfig: 'tsconfig.spec.json' })],
                test: {
                    name: 'ui',
                    environment: 'jsdom',
                    include: ['src/{ui,composition}/**/*.spec.ts'],
                    setupFiles: [
                        'src/ui/test-setup.ts',
                        'src/domain/system/time/time-equality.testing.ts',
                    ],
                },
            },
            {
                test: {
                    name: 'tools',
                    environment: 'node',
                    include: ['scripts/**/*.spec.mjs'],
                },
            },
        ],
    },
});
