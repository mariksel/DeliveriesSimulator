import { describe, expect, it } from 'vitest';

import { MAIN_BRANCH } from '../../application-core/simulation-engine/branch-id';
import { headAt } from '../../application-core/simulation-engine/commit-line';
import { branchLinesOf, forkAt } from '../../application-core/simulation-engine/run-branches';
import { isBetweenGroups } from '../../application-core/simulation-engine/run-places';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import { oneOrderRun } from '../../application/simulation-engine/one-order-run.testing';
import { SimulationRun } from '../../application/simulation-engine/simulation-run';
import type { Position } from '../../domain/system/math/math';
import { toPosition } from '../../domain/system/math/math';
import type { ITimelineNode, ITimelineRow } from './timeline-grid';
import {
    keysHolding,
    lineThrough,
    NodeKind,
    RowMode,
    timelineGrid,
    timelineRows,
} from './timeline-grid';
import type { ITimelineContext, ITimelineRowView } from './timeline-view';
import {
    columnHeadings,
    opensAt,
    TimelineZoom,
    timelineRowViews,
    zoomLabel,
} from './timeline-view';

const MAIN = oneOrderRun();
const HALF = 1 / 2;
/** A closed group's summary: its count first, then any calls it holds. */
const COUNTED = /^\d+ commits?( · \d+ calls?| · .+)?$/;

/** The first place between job runs and API calls after half the run. */
function forkPlace(): Position {
    const ids = MAIN.cache.commitIds.toArray();
    const start = Math.floor(ids.length * HALF);
    const index = ids.findIndex((_id, at) => {
        const place = toPosition(at + 1);
        return at >= start && isBetweenGroups(MAIN, place);
    });
    return toPosition(index + 1);
}

const FORK_PLACE = forkPlace();
/** Main forked half way, and the fork run on, with nothing changed, to where Main ended. */
function forkedAndRunOn(): IRunState {
    const forked = forkAt(MAIN, FORK_PLACE);
    const live = new SimulationRun(forked);
    const end = headAt(MAIN.line);
    live.advanceTo(end);
    return live.state;
}

const FORKED = forkedAndRunOn();
const FORK = FORKED.history.current;
const LINES = branchLinesOf(FORKED).toArray();
const GRID = timelineGrid(LINES, RowMode.ByTime);

/** The rows with every group down to a commit of Main open, and that commit too. */
function rowsOpenTo(place: Position, context: ITimelineContext): readonly ITimelineRowView[] {
    const keys = keysHolding(GRID.nodes, MAIN_BRANCH, place);
    const open = new Set(keys);
    const rows: readonly ITimelineRow[] = timelineRows(GRID.nodes, open);
    const isOpen = (node: ITimelineNode): boolean => open.has(node.key);
    return timelineRowViews(rows, GRID.columns, { ...context, isOpen });
}

const MAIN_LINE = lineThrough(GRID.columns, MAIN_BRANCH);
const AT_FORK: ITimelineContext = {
    currentBranch: MAIN_BRANCH,
    line: MAIN_LINE,
    place: FORK_PLACE,
    selected: null,
    isOpen: () => false,
};

describe('the timeline as drawn', () => {
    it('heads each column with its branch, where it came from, and what its controls do', () => {
        const headings = columnHeadings(GRID.columns);

        expect(headings).toMatchObject([
            { id: MAIN_BRANCH, origin: 'The first branch', isCurrent: false },
            {
                id: FORK,
                origin: `From Main at commit ${FORK_PLACE}`,
                isCurrent: true,
                renameLabel: 'Rename Fork 1',
            },
        ]);
    });

    it('marks the commit shown, dims the later ones, and shows where a fork leaves', () => {
        const rows = rowsOpenTo(FORK_PLACE, AT_FORK);

        const commitCells = rows
            .filter((row) => row.kind === NodeKind.Commit && !row.isEvent)
            .flatMap((row) => row.cells)
            .filter((cell) => cell.column === MAIN_BRANCH && cell.place !== null);
        const shown = commitCells.find((cell) => cell.isShown);
        expect(shown?.place).toBe(FORK_PLACE);
        expect(shown?.forks).toEqual(['Fork 1']);
        const later = commitCells.filter((cell) => cell.isLater).map((cell) => cell.place);
        const isEveryLaterAfter = later.every((place) => (place ?? 0) > FORK_PLACE);
        expect(isEveryLaterAfter).toBe(true);
    });

    it("gives a fork a connector row below its parent's commit, its line curving into its lane", () => {
        const rows = rowsOpenTo(FORK_PLACE, AT_FORK);

        const joinRow = rows.findIndex((row) =>
            row.cells.some((cell) => cell.column === FORK && cell.lane.isStartFromLeft),
        );
        const mainCells = rows.map((row) => row.cells[0]);
        const forkCells = rows.map((row) => row.cells[1]);
        const isMainOnThroughout = mainCells.every((cell) => cell?.lane.isOn === true);
        const isForkOffBefore = forkCells
            .slice(0, joinRow + 1)
            .every((cell) => cell?.lane.isOn === false);
        const isForkOnAfter = forkCells
            .slice(joinRow + 1)
            .every((cell) => cell?.lane.isOn === true);
        expect(joinRow).toBeGreaterThanOrEqual(0);
        expect(isMainOnThroughout).toBe(true);
        expect(isForkOffBefore).toBe(true);
        expect(isForkOnAfter).toBe(true);
        const connector = rows[joinRow];
        expect(connector?.isConnector).toBe(true);
        expect(connector?.label).toBe('Fork 1 branches off');
        const leaving = mainCells[joinRow]?.lane;
        expect(leaving).toMatchObject({ isLeavingRight: true, crossing: 1 });
        const joinPlace = mainCells[joinRow - 1]?.place;
        expect(joinPlace).toBe(FORK_PLACE);
    });

    it("puts a fork's connector above a closed group that holds its own commits too", () => {
        const none = new Set<string>();
        const rows = timelineRows(GRID.nodes, none);

        const views = timelineRowViews(rows, GRID.columns, AT_FORK);

        const [connector, hour] = views;
        expect(connector?.isConnector).toBe(true);
        const forkInConnector = connector?.cells[1]?.lane;
        expect(forkInConnector).toMatchObject({ isOn: false, isStartFromLeft: true });
        const forkInHour = hour?.cells[1];
        expect(forkInHour?.lane.isOn).toBe(true);
        expect(forkInHour?.count).toBeGreaterThan(0);
    });

    it("says where a fork's first commit came from", () => {
        const first = toPosition(FORK_PLACE + 1);
        const keys = keysHolding(GRID.nodes, FORK, first);
        const open = new Set(keys);
        const rows = timelineRows(GRID.nodes, open);

        const everyOpen = { ...AT_FORK, isOpen: (): boolean => true };
        const views = timelineRowViews(rows, GRID.columns, everyOpen);

        const cells = views.flatMap((row) => row.cells);
        const firstOfFork = cells.find((cell) => cell.column === FORK && cell.place === first);
        expect(firstOfFork?.from).toBe(`from Main #${FORK_PLACE}`);
    });

    it("counts each column's commits on a closed group, and leaves empty columns blank", () => {
        const none = new Set<string>();
        const rows = timelineRows(GRID.nodes, none);

        const views = timelineRowViews(rows, GRID.columns, AT_FORK);

        const texts = views.flatMap((row) => row.cells.map((cell) => cell.text));
        const isCountOrBlank = texts.every((text) => text === '' || COUNTED.test(text));
        expect(isCountOrBlank).toBe(true);
    });
});

describe('zooming the timeline', () => {
    it.each([
        [TimelineZoom.Top, RowMode.ByTime, 'Hours'],
        [TimelineZoom.Middle, RowMode.ByTime, 'Minutes'],
        [TimelineZoom.Top, RowMode.ByNumber, 'Hundreds'],
        [TimelineZoom.Middle, RowMode.ByNumber, 'Tens'],
        [TimelineZoom.Commits, RowMode.ByNumber, 'Commits'],
    ])('calls %s by %s %s', (zoom, mode, label) => {
        const named = zoomLabel(zoom, mode);

        expect(named).toBe(label);
    });

    it('opens nothing at the top, the top groups in the middle, and every group for commits', () => {
        const kinds = Object.values(NodeKind);

        const opened = [TimelineZoom.Top, TimelineZoom.Middle, TimelineZoom.Commits].map((zoom) =>
            kinds.filter((kind) => opensAt(zoom, kind)),
        );

        expect(opened).toEqual([
            [],
            [NodeKind.Hour, NodeKind.Hundred],
            [NodeKind.Hour, NodeKind.Minute, NodeKind.Hundred, NodeKind.Ten, NodeKind.Session],
        ]);
    });

    it('draws a closed group as a summary of each column, marking the one holding the commit shown', () => {
        const none = new Set<string>();
        const rows = timelineRows(GRID.nodes, none);

        const views = timelineRowViews(rows, GRID.columns, AT_FORK);

        const mainCells = views.map((row) => row.cells[0]);
        const counts = mainCells.map((cell) => cell?.count ?? 0);
        const total = counts.reduce((sum, count) => sum + count, 0);
        const holding = mainCells.filter((cell) => cell?.hasShown === true);
        expect(total).toBe(MAIN.line.commits.size);
        expect(holding).toHaveLength(1);
    });
});
