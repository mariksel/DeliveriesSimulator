import { describe, expect, it } from 'vitest';

import { pannedBy, viewBoxOf, wheelFactor, ZOOM_STEP, zoomedAt } from './map-zoom';

const FITTED = { x: -50, y: -50, width: 2100, height: 1100 };

describe('zooming the map', () => {
    it('keeps the point under the pointer where it is on the screen', () => {
        const point = { x: 1000, y: 500 };

        const zoomed = zoomedAt(FITTED, FITTED, point, 0.5);

        expect(zoomed).toEqual({ x: 475, y: 225, width: 1050, height: 550 });
        const share = (point.x - zoomed.x) / zoomed.width;
        expect(share).toBeCloseTo((point.x - FITTED.x) / FITTED.width, 12);
    });

    it('goes no closer than a fiftieth of the whole city, and no farther than twice it', () => {
        const point = { x: 0, y: 0 };

        const closest = zoomedAt(FITTED, FITTED, point, 0.0001);
        const farthest = zoomedAt(FITTED, FITTED, point, 100);

        expect(closest.width).toBeCloseTo(FITTED.width / 50, 9);
        expect(farthest.width).toBeCloseTo(FITTED.width * 2, 9);
    });

    it('zooms in for a scroll up, and out by as much for a scroll down', () => {
        const up = wheelFactor(-100);
        const down = wheelFactor(100);

        expect(up).toBe(ZOOM_STEP);
        expect(down * up).toBeCloseTo(1, 12);
    });
});

describe('panning the map', () => {
    it('moves the window against the drag, so the map follows the pointer', () => {
        const panned = pannedBy(FITTED, 100, -40);

        expect(panned).toEqual({ x: -150, y: -10, width: 2100, height: 1100 });
    });

    it('writes a window as a viewBox', () => {
        const viewBox = viewBoxOf(FITTED);

        expect(viewBox).toBe('-50 -50 2100 1100');
    });
});
