import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BrowserTicker } from './browser-ticker';

describe('BrowserTicker', () => {
    let frames: Map<number, () => void>;

    /** Draws one frame: runs what was waiting for it. */
    function drawFrame(): void {
        const waiting = [...frames.values()];
        frames.clear();
        waiting.forEach((callback) => {
            callback();
        });
    }

    beforeEach(() => {
        frames = new Map();
        let next = 0;
        vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
            next += 1;
            frames.set(next, callback);
            return next;
        });
        vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('calls back on each frame', () => {
        const ticker = new BrowserTicker();
        const onTick = vi.fn();
        ticker.start(onTick);

        drawFrame();
        drawFrame();

        expect(onTick).toHaveBeenCalledTimes(2);
    });

    it('stops calling back when stopped', () => {
        const ticker = new BrowserTicker();
        const onTick = vi.fn();
        ticker.start(onTick);

        ticker.stop();
        drawFrame();

        expect(onTick).not.toHaveBeenCalled();
    });

    it('can be stopped from inside its own callback', () => {
        const ticker = new BrowserTicker();
        const onTick = vi.fn(() => {
            ticker.stop();
        });
        ticker.start(onTick);

        drawFrame();
        drawFrame();

        expect(onTick).toHaveBeenCalledTimes(1);
    });

    it('replaces an earlier callback when started again', () => {
        const ticker = new BrowserTicker();
        const first = vi.fn();
        const second = vi.fn();
        ticker.start(first);

        ticker.start(second);
        drawFrame();

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledTimes(1);
    });

    it('does nothing when stopped while already stopped', () => {
        expect(() => {
            new BrowserTicker().stop();
        }).not.toThrow();
    });
});
