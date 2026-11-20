import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import type { BranchId } from '../../application-core/simulation-engine/branch-id';
import { MAIN_BRANCH } from '../../application-core/simulation-engine/branch-id';
import { headAt } from '../../application-core/simulation-engine/commit-line';
import {
    branchLinesOf,
    forkAt,
    historyOf,
    switchTo,
} from '../../application-core/simulation-engine/run-branches';
import { isBetweenGroups } from '../../application-core/simulation-engine/run-places';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import {
    oneOrderRun,
    twoOrderRun,
} from '../../application/simulation-engine/one-order-run.testing';
import { toInputOrderName } from '../../application-core/simulation-engine/input-names';
import { SimulationRun } from '../../application/simulation-engine/simulation-run';
import type { Position } from '../../domain/system/math/math';
import { toPosition } from '../../domain/system/math/math';
import type { IGridCommit, ITimelineNode, ITimelineRow } from './timeline-grid';
import {
    columnHolding,
    commitNodeAt,
    holdsPlace,
    keysHolding,
    lineThrough,
    NodeKind,
    TimelineView,
    TimelineGrid,
    timelineGrid,
    timelineRows,
} from './timeline-grid';

const MAIN = oneOrderRun();
const END = headAt(MAIN.line);
const COMMITS = MAIN.line.commits.size;
const THIRD = 1 / 3;
const HALF = 1 / 2;

/** The first place after a part of the run that passes a test. */
function placeAfter(run: IRunState, part: number, test: (place: Position) => boolean): Position {
    const ids = run.cache.commitIds.toArray();
    const start = Math.floor(ids.length * part);
    const index = ids.findIndex((_id, at) => {
        const place = toPosition(at + 1);
        return at >= start && test(place);
    });
    return toPosition(index + 1);
}

/** The first place between job runs and API calls after a part of the run. */
const groupPlaceAfter = (run: IRunState, part: number): Position =>
    placeAfter(run, part, (place) => isBetweenGroups(run, place));

/** How many log entries the commit at a place holds. */
function entriesAt(run: IRunState, place: Position): number {
    const id = run.cache.commitIds.get(place - 1);
    const commit = id === undefined ? undefined : run.line.commits.get(id);
    return commit?.entries.size ?? 0;
}

const FORK_PLACE = groupPlaceAfter(MAIN, HALF);

/** A run forked at a place and run on, with nothing changed, to where Main ended. */
function forkedAndRunOn(run: IRunState, place: Position): IRunState {
    const forked = forkAt(run, place);
    const live = new SimulationRun(forked);
    live.advanceTo(END);
    return live.state;
}

/** Every node, at every depth. */
function everyNode(nodes: readonly ITimelineNode[]): readonly ITimelineNode[] {
    return nodes.flatMap((node) => {
        const below = everyNode(node.children);
        return [node, ...below];
    });
}

function nodesOfKind(nodes: readonly ITimelineNode[], kind: NodeKind): readonly ITimelineNode[] {
    const all = everyNode(nodes);
    return all.filter((node) => node.kind === kind);
}

/** The place of a column's first commit under a node, if it has one there. */
const firstPlace = (node: ITimelineNode, column: BranchId): number | undefined =>
    node.commits.get(column)?.[0]?.place;

/** The places of a column's commits, each shown once, on the commit nodes. */
function placesIn(nodes: readonly ITimelineNode[], column: BranchId): readonly number[] {
    const commits = nodesOfKind(nodes, NodeKind.Commit);
    return commits.flatMap((node) => {
        const own = node.commits.get(column) ?? [];
        return own.map((commit) => commit.place);
    });
}

const FORKED = forkedAndRunOn(MAIN, FORK_PLACE);
const FORK = historyOf(FORKED).current;
const MAIN_BRANCHES = branchLinesOf(MAIN).toArray();
const FORKED_BRANCHES = branchLinesOf(FORKED).toArray();

describe('the timeline grid', () => {
    it('shows every commit of Main once, in order, in its own column', () => {
        const grid = timelineGrid(MAIN_BRANCHES, TimelineView.ByTime);

        const ids = grid.columns.map((column) => column.id);
        expect(ids).toEqual([MAIN_BRANCH]);
        const places = placesIn(grid.nodes, MAIN_BRANCH);
        const expected = Array.from({ length: COMMITS }, (_, index) => index + 1);
        expect(places).toEqual(expected);
    });

    it('groups commits in job runs and API calls, named from their effect', () => {
        const grid = timelineGrid(MAIN_BRANCHES, TimelineView.ByTime);

        const sessions = nodesOfKind(grid.nodes, NodeKind.Session);
        const kinds = sessions.map((node) => node.label.split(':')[0]);
        const distinct = new Set(kinds);
        const expected = new Set(['Job run', 'API call']);
        expect(distinct).toEqual(expected);
    });

    it('skips a span with only one thing in it', () => {
        const grid = timelineGrid(MAIN_BRANCHES, TimelineView.ByTime);

        const hours = nodesOfKind(grid.nodes, NodeKind.Hour);
        const minutes = nodesOfKind(grid.nodes, NodeKind.Minute);
        const lonely = [...hours, ...minutes].filter((node) => node.children.length < 2);
        expect(lonely).toEqual([]);
    });

    it("gives a fork its own column, starting at its fork point, joined to Main's commit", () => {
        const grid = timelineGrid(FORKED_BRANCHES, TimelineView.ByTime);

        const [main, fork] = grid.columns;
        expect(main?.join).toBeNull();
        expect(fork?.id).toBe(FORK);
        expect(fork?.join).toEqual({ column: MAIN_BRANCH, place: FORK_PLACE });
        const forkPlaces = placesIn(grid.nodes, FORK);
        expect(forkPlaces[0]).toBe(FORK_PLACE + 1);
        const mainPlaces = placesIn(grid.nodes, MAIN_BRANCH);
        expect(mainPlaces).toHaveLength(COMMITS);
    });

    it.each([TimelineView.ByTime, TimelineView.ByNumber])(
        'lines up a fork that changed nothing with Main, row for row, %s',
        (mode) => {
            const grid = timelineGrid(FORKED_BRANCHES, mode);

            const commitNodes = nodesOfKind(grid.nodes, NodeKind.Commit);
            const shared = commitNodes.filter((node) => node.commits.has(FORK));
            const mainPlaces = shared.map((node) => firstPlace(node, MAIN_BRANCH));
            const forkPlaces = shared.map((node) => firstPlace(node, FORK));
            expect(shared).toHaveLength(COMMITS - FORK_PLACE);
            expect(mainPlaces).toEqual(forkPlaces);
        },
    );

    it('groups job runs and API calls by hundreds and tens by number', () => {
        const grid = timelineGrid(MAIN_BRANCHES, TimelineView.ByNumber);

        const hours = nodesOfKind(grid.nodes, NodeKind.Hour);
        const tens = nodesOfKind(grid.nodes, NodeKind.Ten);
        expect(hours).toEqual([]);
        expect(tens[0]?.label).toBe('1–10');
    });

    it('grows, as a run goes, into the grid it would be if built at once', () => {
        const [main] = MAIN_BRANCHES;
        const line = main?.line ?? List();
        const grid = new TimelineGrid(TimelineView.ByTime);
        const steps = [Math.floor(COMMITS * THIRD), Math.floor(COMMITS * HALF), COMMITS];

        steps.forEach((size) => {
            const partial = line.take(size);
            const grown = main === undefined ? [] : [{ ...main, line: partial }];
            grid.update(grown);
        });

        const whole = timelineGrid(MAIN_BRANCHES, TimelineView.ByTime);
        const grownPlaces = placesIn(grid.nodes, MAIN_BRANCH);
        const wholePlaces = placesIn(whole.nodes, MAIN_BRANCH);
        expect(grownPlaces).toEqual(wholePlaces);
        const grownKeys = everyNode(grid.nodes).map((node) => node.key);
        const wholeKeys = everyNode(whole.nodes).map((node) => node.key);
        expect(grownKeys).toEqual(wholeKeys);
    });

    it('lays the branches out as a tree: each between its forks, the first on its right', () => {
        const back = switchTo(FORKED, MAIN_BRANCH);
        const second = forkAt(back, FORK_PLACE);
        const backAgain = switchTo(second, MAIN_BRANCH);
        const third = forkAt(backAgain, FORK_PLACE);
        const branches = branchLinesOf(third).toArray();

        const grid = timelineGrid(branches, TimelineView.ByTime);

        const names = grid.columns.map((column) => column.name);
        expect(names).toEqual(['Fork 2', 'Main', 'Fork 1', 'Fork 3']);
    });

    it('names the module each state commit changed, and the module that called it', () => {
        const grid = timelineGrid(MAIN_BRANCHES, TimelineView.ByTime);
        const commitNodes = nodesOfKind(grid.nodes, NodeKind.Commit);
        const pairs = commitNodes.flatMap((node) => {
            const own = node.commits.get(MAIN_BRANCH) ?? [];
            return own.map((gridCommit) => [gridCommit.place, gridCommit] as const);
        });
        const byPlace = new Map<number, IGridCommit>(pairs);

        // The API call that requests a delivery: Orders, then Deliveries, then Orders again.
        const requested = [7, 8, 9, 10].map((place) => byPlace.get(place));

        const modules = requested.map((gridCommit) => gridCommit?.module);
        const callers = requested.map((gridCommit) => gridCommit?.calledFrom);
        expect(modules).toEqual(['Orders', 'Deliveries', 'Orders', null]);
        expect(callers).toEqual([null, 'Orders', 'Deliveries', null]);
    });

    it("joins a fork of a fork made before its parent's fork point to Main's column", () => {
        const early = groupPlaceAfter(FORKED, THIRD);
        const twice = forkAt(FORKED, early);
        const branches = branchLinesOf(twice).toArray();

        const grid = timelineGrid(branches, TimelineView.ByTime);

        const last = grid.columns.at(-1);
        expect(last?.forkedFrom).toBe(FORK);
        expect(last?.join?.column).toBe(MAIN_BRANCH);
    });

    it("follows a fork of a fork's line to the column holding its shared commits", () => {
        const early = groupPlaceAfter(FORKED, THIRD);
        const twice = forkAt(FORKED, early);
        const branches = branchLinesOf(twice).toArray();
        const grid = timelineGrid(branches, TimelineView.ByTime);
        const current = twice.history.current;

        const through = lineThrough(grid.columns, current);
        const holder = columnHolding(grid.columns, current, early);

        // Made before Fork 1's own fork point, it shares no commit held in Fork 1's column.
        const own = through.get(current);
        const inFork = through.get(FORK);
        const inMain = through.get(MAIN_BRANCH);
        expect(own).toBe(Number.POSITIVE_INFINITY);
        expect(inFork).toBeUndefined();
        expect(inMain).toBe(early);
        expect(holder).toBe(MAIN_BRANCH);
    });
});

describe('the rows of the timeline grid', () => {
    const grid = timelineGrid(MAIN_BRANCHES, TimelineView.ByTime);

    /** Whether a row is the commit row of Main's commit at a place. */
    const isCommitAt = (row: ITimelineRow, place: Position): boolean =>
        row.node.kind === NodeKind.Commit && firstPlace(row.node, MAIN_BRANCH) === place;

    /** The commit row of Main's commit at a place, with its groups open. */
    function commitRowAt(place: Position): ITimelineRow | undefined {
        const keys = keysHolding(grid.nodes, MAIN_BRANCH, place);
        const open = new Set(keys);
        const rows = timelineRows(grid.nodes, open);
        return rows.find((row) => isCommitAt(row, place));
    }

    it('shows only the top level while everything is closed', () => {
        const none = new Set<string>();

        const rows = timelineRows(grid.nodes, none);

        const nodes = rows.map((row) => row.node);
        expect(nodes).toEqual(grid.nodes);
    });

    it('opens the groups holding a commit, down to it', () => {
        const row = commitRowAt(FORK_PLACE);

        expect(row?.node.kind).toBe(NodeKind.Commit);
    });

    it('opens a commit to a row for each of its events', () => {
        const place = placeAfter(MAIN, HALF, (at) => entriesAt(MAIN, at) > 1);
        const commitRow = commitRowAt(place);
        const key = commitRow?.node.key ?? '';
        const keys = keysHolding(grid.nodes, MAIN_BRANCH, place);
        const open = new Set([...keys, key]);

        const rows = timelineRows(grid.nodes, open);

        const events = rows.filter((row) => row.node.key === key && row.entry !== null);
        const count = entriesAt(MAIN, place);
        expect(events).toHaveLength(count);
        const depths = events.map((row) => row.depth - (commitRow?.depth ?? 0));
        const isOneBelow = depths.every((depth) => depth === 1);
        expect(isOneBelow).toBe(true);
    });
});

describe('the views by order and by driver', () => {
    const byTime = timelineGrid(MAIN_BRANCHES, TimelineView.ByTime);
    const byOrder = timelineGrid(MAIN_BRANCHES, TimelineView.ByOrder);
    const byDriver = timelineGrid(MAIN_BRANCHES, TimelineView.ByDriver);
    const orderName = toInputOrderName('A');
    const orderId = MAIN.cache.orderIds.get(orderName)!;
    const onMainByOrder = placesIn(byOrder.nodes, MAIN_BRANCH);

    /** Each job run's or API call's places in Main's column, by its key's last part. */
    function sessionPlaces(nodes: readonly ITimelineNode[]): Map<string, readonly number[]> {
        const sessions = nodesOfKind(nodes, NodeKind.Session);
        const pairs = sessions.map((node) => {
            const own = node.commits.get(MAIN_BRANCH) ?? [];
            const parts = node.key.split('/');
            const name = parts.at(-1) ?? '';
            const places = own.map((commit) => commit.place);
            return [name, places] as const;
        });
        return new Map(pairs);
    }

    it('groups by order, naming each by its ID', () => {
        const top = byOrder.nodes.map((node) => [node.kind, node.label, node.subject]);

        expect(top).toEqual([[NodeKind.Order, `Order ${orderId}`, orderId]]);
    });

    it('shows each job run or API call under an order whole, as the view by time does', () => {
        const underOrder = sessionPlaces(byOrder.nodes);
        const byTimeSessions = sessionPlaces(byTime.nodes);

        const names = [...underOrder.keys()];
        const asByTime = names.map((name) => byTimeSessions.get(name));
        const asByOrder = names.map((name) => underOrder.get(name));
        expect(names.length).toBeGreaterThan(0);
        expect(asByOrder).toEqual(asByTime);
    });

    it('leaves out the commits that touched no order', () => {
        const shown = placesIn(byOrder.nodes, MAIN_BRANCH);

        expect(shown.length).toBeGreaterThan(0);
        expect(shown.length).toBeLessThan(COMMITS);
    });

    it('groups by driver', () => {
        const top = byDriver.nodes.map((node) => [node.kind, node.label]);

        expect(top).toEqual([[NodeKind.Driver, 'Driver driver-1']]);
    });

    it('puts a job run that touched two orders under both, the same commits under each', () => {
        const two = twoOrderRun();
        const lines = branchLinesOf(two).toArray();

        const grid = timelineGrid(lines, TimelineView.ByOrder);

        const [first, second] = grid.nodes.map((node) => sessionPlaces([node]));
        const firstNames = [...first!.keys()];
        const shared = firstNames.filter((name) => second!.has(name));
        const underFirst = shared.map((name) => first!.get(name));
        const underSecond = shared.map((name) => second!.get(name));
        expect(grid.nodes).toHaveLength(2);
        expect(shared.length).toBeGreaterThan(0);
        expect(underFirst).toEqual(underSecond);
    });

    it('works out the index of a branch that is not current, giving what it showed while current', () => {
        const forked = timelineGrid(FORKED_BRANCHES, TimelineView.ByOrder);

        const onMain = placesIn(forked.nodes, MAIN_BRANCH);

        expect(onMain).toEqual(onMainByOrder);
    });

    it("adds a fork's own commits only, in its own column", () => {
        const forked = timelineGrid(FORKED_BRANCHES, TimelineView.ByOrder);

        const onFork = placesIn(forked.nodes, FORK);

        const isOwn = onFork.every((place) => place > FORK_PLACE);
        expect(onFork.length).toBeGreaterThan(0);
        expect(isOwn).toBe(true);
    });

    it('opens the order holding a commit, down to it, and finds its commit node', () => {
        const [order] = byOrder.nodes;
        const own = order!.commits.get(MAIN_BRANCH)!;
        const place = own.at(-1)!.place;

        const keys = keysHolding(byOrder.nodes, MAIN_BRANCH, place);
        const node = commitNodeAt(byOrder.nodes, MAIN_BRANCH, place);

        const found = firstPlace(node!, MAIN_BRANCH);
        expect(keys[0]).toBe(order!.key);
        expect(node!.kind).toBe(NodeKind.Commit);
        expect(found).toBe(place);
    });
});

describe("finding a place among a column's commits", () => {
    const grid = timelineGrid(MAIN_BRANCHES, TimelineView.ByOrder);
    const own = grid.nodes[0]!.commits.get(MAIN_BRANCH)!;
    const held = own.map((commit) => commit.place);
    const places = new Set<number>(held);
    const every = Array.from({ length: COMMITS }, (_, at) => at + 1);
    const missing = toPosition(every.find((place) => !places.has(place))!);

    it.each(held)('finds place %s, which it holds', (place) => {
        const isHeld = holdsPlace(own, place);

        expect(isHeld).toBe(true);
    });

    it('does not find a place it skips, nor any place in no commits', () => {
        const isInOwn = holdsPlace(own, missing);
        const isInNone = holdsPlace(undefined, missing);
        const isInEmpty = holdsPlace([], missing);

        expect([isInOwn, isInNone, isInEmpty]).toEqual([false, false, false]);
    });
});
