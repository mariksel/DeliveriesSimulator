import { describe, expect, it } from 'vitest';

import { MAIN_BRANCH } from '../../application-core/simulation-engine/branch-id';
import { branchLinesOf } from '../../application-core/simulation-engine/run-branches';
import { oneOrderRun } from '../../application/simulation-engine/one-order-run.testing';
import { formatClockTime } from '../../domain/simulation-engine/clock-time';
import { toPosition } from '../../domain/system/math/math';
import type { IsOpen, ITimelineRow } from './timeline-grid';
import { NodeKind, timelineGrid, timelineRows, TimelineView } from './timeline-grid';
import { axisSpacePx, GapDisplay, gapHeights, gapsBefore, rowOffsets } from './timeline-gaps';
import { NOTHING_HIDDEN, shownNodes } from './timeline-shown';
import { opensAt, timelineRowViews, TimelineZoom } from './timeline-view';

const RUN = oneOrderRun();
const LINES = branchLinesOf(RUN).toArray();
const GRID = timelineGrid(LINES, TimelineView.ByTime);
const NODES = shownNodes(GRID.nodes, NOTHING_HIDDEN);
const SMALL_MS = 1;

/** Whether a row stands for its commits: a commit, an event, or a closed group. */
const isTimedOrEvent = (row: ITimelineRow, isOpen: IsOpen): boolean =>
    row.entry !== null || row.node.kind === NodeKind.Commit || !isOpen(row.node);

/** The rows at a zoom level, with what opens them. */
function rowsAt(zoom: TimelineZoom): { rows: readonly ITimelineRow[]; isOpen: IsOpen } {
    const isOpen: IsOpen = (node) => opensAt(zoom, node.kind);
    const rows = timelineRows(NODES, isOpen);
    return { rows, isOpen };
}

/** The first and last simulated time of a row's commits. */
function timesOf(row: ITimelineRow): { from: number; to: number } {
    const commits = [...row.node.commits.values()].flat();
    const times = commits.map((gridCommit) => gridCommit.commit.at.milliseconds);
    return { from: Math.min(...times), to: Math.max(...times) };
}

describe('the gaps between rows', () => {
    const { rows, isOpen } = rowsAt(TimelineZoom.Commits);
    const gaps = gapsBefore(rows, isOpen, SMALL_MS);

    it('are found where neighbouring rows lie apart in simulated time', () => {
        const longest = Math.max(...gaps.values());

        expect(gaps.size).toBeGreaterThan(0);
        expect(longest).toBeGreaterThan(SMALL_MS);
    });

    it('each measure from the row before to the next row that holds commits', () => {
        const measured = [...gaps].map(([index, gap]) => {
            const before = rows.slice(0, index).filter((row) => {
                const isTimed = row.node.kind === NodeKind.Commit || !isOpen(row.node);
                return row.entry === null && isTimed;
            });
            const after = rows.slice(index).find((row) => isTimedOrEvent(row, isOpen))!;
            const previous = before.at(-1)!;
            const end = timesOf(previous).to;
            const start = timesOf(after).from;
            return [gap, start - end];
        });

        const wrong = measured.filter(([gap, expected]) => gap !== expected);
        expect(wrong).toEqual([]);
    });

    it('go after the row before and its events, and before any group heading the next', () => {
        const placed = [...gaps.keys()].map((index) => rows[index - 1]);

        const isAfterTimedRow = placed.every(
            (row) => row !== undefined && isTimedOrEvent(row, isOpen),
        );
        expect(isAfterTimedRow).toBe(true);
    });

    it('show only when longer than the threshold', () => {
        const longest = Math.max(...gaps.values());

        const atLongest = gapsBefore(rows, isOpen, longest);
        const below = gapsBefore(rows, isOpen, longest - 1);

        const longestCount = [...gaps.values()].filter((gap) => gap === longest).length;
        expect(atLongest.size).toBe(0);
        expect(below.size).toBe(longestCount);
    });

    it('measure a closed group by the span of its commits', () => {
        const top = rowsAt(TimelineZoom.Middle);

        const middleGaps = gapsBefore(top.rows, top.isOpen, SMALL_MS);

        const isEachPositive = [...middleGaps.values()].every((gap) => gap > SMALL_MS);
        expect(isEachPositive).toBe(true);
    });
});

describe('a gap as drawn', () => {
    it('is a row of its own before the row after it, stating how long it is', () => {
        const { rows, isOpen } = rowsAt(TimelineZoom.Commits);
        const gaps = gapsBefore(rows, isOpen, SMALL_MS);
        const latest = toPosition(RUN.cache.commitIds.size);
        const line = new Map([[MAIN_BRANCH, Number.POSITIVE_INFINITY]]);
        const context = {
            currentBranch: MAIN_BRANCH,
            line,
            place: latest,
            selected: null,
            isOpen,
        };

        const views = timelineRowViews(rows, GRID.columns, { ...context, gaps });

        const gapViews = views.filter((view) => view.gapMs !== null);
        const [first] = gapViews;
        const firstGap = first!.gapMs!;
        const at = views.indexOf(first!);
        expect(gapViews).toHaveLength(gaps.size);
        expect(first!.kind).toBe(NodeKind.Gap);
        expect(first!.label).toBe(`Gap of ${formatClockTime(firstGap)}`);
        expect(views[at + 1]?.gapMs).toBeNull();
        expect(first!.cells[0]?.lane.isOn).toBe(true);
    });
});

describe('the axis', () => {
    const rowPx = 30;
    const minute = 60_000;
    const hour = 3_600_000;

    it.each([
        [minute, 0],
        [hour, 5 * rowPx],
        [Math.sqrt(minute * hour), Math.round(2.5 * rowPx)],
    ])('gives a gap of %s ms %s px, by its logarithm', (gap, expected) => {
        const space = axisSpacePx(gap, minute, hour, rowPx);

        expect(space).toBe(expected);
    });

    it('gives no space when the longest gap shown is not past the threshold', () => {
        const space = axisSpacePx(minute, minute, minute, rowPx);

        expect(space).toBe(0);
    });

    it('sizes only gap rows, and only on the axis', () => {
        const rows = [
            { id: 'a', gapMs: null },
            { id: 'a~gap', gapMs: hour },
            { id: 'b', gapMs: null },
        ];

        const onAxis = gapHeights(rows, GapDisplay.Axis, minute, rowPx);
        const inList = gapHeights(rows, GapDisplay.List, minute, rowPx);

        expect([...onAxis]).toEqual([['a~gap', 5 * rowPx]]);
        expect(inList.size).toBe(0);
    });

    it('starts each row where the one before ends', () => {
        const rows = [
            { id: 'a', gapMs: null },
            { id: 'a~gap', gapMs: hour },
            { id: 'b', gapMs: null },
        ];
        const heights = new Map([['a~gap', 7]]);

        const offsets = rowOffsets(rows, heights, rowPx);

        expect(offsets).toEqual([0, rowPx, rowPx + 7, 2 * rowPx + 7]);
    });
});
