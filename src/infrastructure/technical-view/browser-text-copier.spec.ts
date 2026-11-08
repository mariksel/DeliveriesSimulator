import { afterEach, describe, expect, it, vi } from 'vitest';

import { BrowserTextCopier } from './browser-text-copier';

describe('BrowserTextCopier', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('copies to the clipboard, and says it worked', async () => {
        const writeText = vi.fn(() => Promise.resolve());
        vi.stubGlobal('navigator', { clipboard: { writeText } });

        const didCopy = await new BrowserTextCopier().copy('the text');

        expect(didCopy).toBe(true);
        expect(writeText).toHaveBeenCalledWith('the text');
    });

    it('says so when the browser refuses', async () => {
        vi.stubGlobal('navigator', {
            clipboard: {
                writeText: () => {
                    const reason = new Error('refused');
                    return Promise.reject(reason);
                },
            },
        });

        const isCopied = await new BrowserTextCopier().copy('the text');
        expect(isCopied).toBe(false);
    });
});
