/** The part of the map in view, in SVG units, which are metres, with north up (FND-90). */
export interface IViewWindow {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

/** A point on the map, in SVG units. */
export interface IMapPoint {
    readonly x: number;
    readonly y: number;
}

/** How far one notch of the wheel zooms: in, to this share of the width, or out by its inverse. */
export const ZOOM_STEP = 0.8;
/** The closest the map zooms in: this share of the fitted width. */
const CLOSEST = 0.02;
/** The farthest the map zooms out: this many times the fitted width. */
const FARTHEST = 2;

/** A window as an SVG `viewBox`. */
export const viewBoxOf = (view: IViewWindow): string =>
    `${view.x} ${view.y} ${view.width} ${view.height}`;

/**
 * The window zoomed by a factor around a point, which stays where it is on the screen: below 1
 * zooms in, above 1 out. It goes no closer than a fiftieth of the fitted width, and no farther
 * than twice it.
 */
export function zoomedAt(
    view: IViewWindow,
    fitted: IViewWindow,
    point: IMapPoint,
    factor: number,
): IViewWindow {
    const lowest = (fitted.width * CLOSEST) / view.width;
    const highest = (fitted.width * FARTHEST) / view.width;
    const atLeast = Math.max(factor, lowest);
    const scale = Math.min(atLeast, highest);
    return {
        x: point.x - (point.x - view.x) * scale,
        y: point.y - (point.y - view.y) * scale,
        width: view.width * scale,
        height: view.height * scale,
    };
}

/** The window moved so the map follows a drag of this many SVG units right and down. */
export const pannedBy = (view: IViewWindow, right: number, down: number): IViewWindow => ({
    ...view,
    x: view.x - right,
    y: view.y - down,
});

/** The wheel's zoom factor for a scroll: in for a scroll up, out for one down. */
export const wheelFactor = (deltaY: number): number => (deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
