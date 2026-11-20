import type { IsOpen, ITimelineNode, ITimelineRow } from './timeline-grid';
import { NodeKind } from './timeline-grid';

/** How long a gap must be to show, as the timeline starts: 1 minute of simulated time (FND-81). */
export const DEFAULT_GAP_THRESHOLD_MS = 60_000;

/** The span of simulated time a row's commits cover, across every column. */
interface ISpan {
    readonly from: number;
    readonly to: number;
}

/**
 * The simulated time a node's commits span, across every column, or null for none. Each column's
 * commits are in time order, so only its first and last are read, in one pass with nothing built,
 * as it runs for every row on every change.
 */
function spanOf(node: ITimelineNode): ISpan | null {
    let from = Number.POSITIVE_INFINITY;
    let to = Number.NEGATIVE_INFINITY;
    node.commits.forEach((own) => {
        const first = own[0];
        const last = own.at(-1);
        if (first !== undefined && last !== undefined) {
            from = Math.min(from, first.commit.at.milliseconds);
            to = Math.max(to, last.commit.at.milliseconds);
        }
    });
    return from > to ? null : { from, to };
}

/**
 * Whether a row stands for its commits as shown: a commit, or a closed group. An open group's
 * own row heads the rows below it, and an event belongs to its commit, so neither counts.
 */
const isTimed = (row: ITimelineRow, isOpen: IsOpen): boolean =>
    row.entry === null && (row.node.kind === NodeKind.Commit || !isOpen(row.node));

/**
 * The gaps to show (FND-81): for each row that starts after a gap longer than the threshold, the
 * gap's length in simulated milliseconds, by the index of the row it goes before. A gap is the
 * time between two neighbouring rows as shown, after the filter and collapsing, so it goes just
 * after the earlier row and its events, before any group heading the later one opens.
 */
export function gapsBefore(
    rows: readonly ITimelineRow[],
    isOpen: IsOpen,
    thresholdMs: number,
): ReadonlyMap<number, number> {
    const gaps = new Map<number, number>();
    let previousEnd: number | null = null;
    let after = 0;
    rows.forEach((row, index) => {
        if (row.entry !== null) {
            after = index + 1;
            return;
        }
        if (!isTimed(row, isOpen)) {
            return;
        }
        const span = spanOf(row.node);
        if (span === null) {
            return;
        }
        const gap = previousEnd === null ? 0 : span.from - previousEnd;
        if (gap > thresholdMs) {
            gaps.set(after, gap);
        }
        previousEnd = Math.max(previousEnd ?? span.to, span.to);
        after = index + 1;
    });
    return gaps;
}

/** How the view by time shows gaps: as rows stating them, or as space to scale (FND-81). */
export const GapDisplay = {
    List: 'List',
    Axis: 'Axis',
} as const;

/** One of the values of {@link GapDisplay}. */
export type GapDisplay = (typeof GapDisplay)[keyof typeof GapDisplay];

/** The most space the longest gap shown takes on the axis, in rows' height (FND-81). */
const MOST_ROWS_FOR_A_GAP = 5;

/**
 * The space a gap takes on the axis, in pixels: growing with the logarithm of the gap, from none
 * at the threshold to five rows' height for the longest gap shown (FND-81).
 */
export function axisSpacePx(
    gapMs: number,
    thresholdMs: number,
    longestMs: number,
    rowHeightPx: number,
): number {
    if (longestMs <= thresholdMs || gapMs <= thresholdMs) {
        return 0;
    }
    const share = Math.log(gapMs / thresholdMs) / Math.log(longestMs / thresholdMs);
    const most = MOST_ROWS_FOR_A_GAP * rowHeightPx;
    return Math.round(Math.min(share, 1) * most);
}

/** A row as the offsets need it: its ID, and the gap it states, if it is a gap row. */
interface IRowSize {
    readonly id: string;
    readonly gapMs: number | null;
}

/**
 * Each row's height in pixels, by its ID, for the rows whose height is not one row's: on the
 * axis, a gap row takes the space its gap is worth; in the list, every row is one row high.
 */
export function gapHeights(
    rows: readonly IRowSize[],
    display: GapDisplay,
    thresholdMs: number,
    rowHeightPx: number,
): ReadonlyMap<string, number> {
    const heights = new Map<string, number>();
    if (display === GapDisplay.List) {
        return heights;
    }
    const gapRows = rows.filter((row) => row.gapMs !== null);
    const longest = gapRows.reduce((most, row) => Math.max(most, row.gapMs ?? 0), 0);
    gapRows.forEach((row) => {
        const space = axisSpacePx(row.gapMs ?? 0, thresholdMs, longest, rowHeightPx);
        heights.set(row.id, space);
    });
    return heights;
}

/**
 * Where each row starts, from the top, in pixels, and where the last ends: one more than the
 * rows. A virtual scroll with rows of varying height finds what to draw from these.
 */
export function rowOffsets(
    rows: readonly IRowSize[],
    heights: ReadonlyMap<string, number>,
    rowHeightPx: number,
): readonly number[] {
    const offsets = new Array<number>(rows.length + 1);
    let top = 0;
    offsets[0] = top;
    const isEven = heights.size === 0;
    rows.forEach((row, index) => {
        top += isEven ? rowHeightPx : (heights.get(row.id) ?? rowHeightPx);
        offsets[index + 1] = top;
    });
    return offsets;
}
