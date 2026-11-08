/** The smallest a resizable region may get, in pixels. */
export const MIN_PANEL_PX = 120;
/** The largest a resizable region may get, in pixels. */
export const MAX_PANEL_PX = 700;
/** How far an arrow key moves a divider, in pixels. */
export const ARROW_STEP_PX = 16;

/** A region's new size, kept within its limits. */
export function resized(size: number, change: number): number {
    const max = Math.max(MIN_PANEL_PX, size + change);
    return Math.min(MAX_PANEL_PX, max);
}
