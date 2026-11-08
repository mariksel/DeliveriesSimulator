import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vite';

export default defineConfig({
    // The plugin skips type checking by default, which lets a build pass with type errors.
    plugins: [angular({ disableTypeChecking: false })],
});
