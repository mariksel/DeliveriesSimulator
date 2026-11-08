import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Only the repository knows a function's stored ID, such as 'orders.pick-up@1', so functions can
// be renamed and Domain stays free of persistence (FND-81).
const STORED_ID = /['"`][a-z]+(-[a-z]+)*\.[a-z]+(-[a-z]+)*@\d+['"`]/;

function sources(folder) {
    return readdirSync(folder, { withFileTypes: true, recursive: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
        .map((entry) => join(entry.parentPath, entry.name));
}

describe('nothing in Domain knows a stored function ID', () => {
    const files = sources('src/domain');

    it('finds Domain', () => {
        expect(files.length).toBeGreaterThan(0);
    });

    it.each(files)('%s', (file) => {
        const text = readFileSync(file, 'utf8');
        expect(text).not.toMatch(STORED_ID);
    });

    it.each(["'orders.pick-up@1'", '"deliveries.notify-next-driver@2"'])(
        'would catch %s',
        (text) => {
            expect(text).toMatch(STORED_ID);
        },
    );
});
