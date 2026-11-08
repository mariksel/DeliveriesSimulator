import { describe, expect, it } from 'vitest';

import { MAX_PANEL_PX, MIN_PANEL_PX, resized } from './panel-size';

describe('resizing a region', () => {
    it('adds the change', () => {
        const secondResized = resized(300, 50);
        expect(secondResized).toBe(350);
    });

    it('stops at the smallest size', () => {
        const secondResized = resized(MIN_PANEL_PX, -1);
        expect(secondResized).toBe(MIN_PANEL_PX);
    });

    it('stops at the largest size', () => {
        const secondResized = resized(MAX_PANEL_PX, 1);
        expect(secondResized).toBe(MAX_PANEL_PX);
    });
});
