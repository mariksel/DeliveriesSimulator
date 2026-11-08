/** One column of a table whose columns can be resized. */
export interface IColumn {
    /** Columns in a group with the same key share a width. */
    readonly key: string;
    readonly label: string;
    readonly startPx: number;
    /** Numbers line up on the right. */
    readonly isNumber?: boolean;
}

/** The narrowest a column may get, in pixels. */
export const MIN_COLUMN_PX = 32;
/** The widest a column may get, in pixels. */
export const MAX_COLUMN_PX = 640;
/** How far an arrow key moves a column's edge, in pixels. */
export const COLUMN_ARROW_STEP_PX = 16;

/** A column's new width, kept within its limits. */
export function resizedColumn(px: number, change: number): number {
    const max = Math.max(MIN_COLUMN_PX, px + change);
    return Math.min(MAX_COLUMN_PX, max);
}

/** A column's width: as someone resized it, or as it starts. */
export const columnWidth = (column: IColumn, widths: ReadonlyMap<string, number>): number =>
    widths.get(column.key) ?? column.startPx;

/**
 * The CSS grid for a table's columns. Spare width goes to an empty last track, so the columns stay
 * together.
 */
export const columnsTemplate = (
    columns: readonly IColumn[],
    widths: ReadonlyMap<string, number>,
): string =>
    [...columns.map((column) => `${columnWidth(column, widths)}px`), 'minmax(0, 1fr)'].join(' ');
