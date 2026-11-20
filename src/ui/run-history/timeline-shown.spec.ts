import { describe, expect, it } from 'vitest';

import { MAIN_BRANCH } from '../../application-core/simulation-engine/branch-id';
import { CommitKind } from '../../application-core/simulation-engine/commit';
import { branchLinesOf } from '../../application-core/simulation-engine/run-branches';
import { oneOrderRun } from '../../application/simulation-engine/one-order-run.testing';
import type { Position } from '../../domain/system/math/math';
import type { IGridCommit, ITimelineNode } from './timeline-grid';
import {
    commitNodeAt,
    groupsHolding,
    NodeKind,
    timelineGrid,
    timelineRows,
    TimelineView,
} from './timeline-grid';
import type { HiddenKinds } from './timeline-shown';
import { NOTHING_HIDDEN, shownNodes } from './timeline-shown';
import { timelineRowViews } from './timeline-view';

const RUN = oneOrderRun();
const LINES = branchLinesOf(RUN).toArray();
const GRID = timelineGrid(LINES, TimelineView.ByTime);
const HIDE_JOBS: HiddenKinds = new Set([CommitKind.Job]);
const HIDE_STATE: HiddenKinds = new Set([CommitKind.State]);

/** Every node, at every depth, as shown. */
function everyNode(nodes: readonly ITimelineNode[]): readonly ITimelineNode[] {
    return nodes.flatMap((node) => {
        const below = everyNode(node.children);
        return [node, ...below];
    });
}

const mainCommits = (node: ITimelineNode): readonly IGridCommit[] =>
    node.commits.get(MAIN_BRANCH) ?? [];

const kindsIn = (node: ITimelineNode): readonly CommitKind[] =>
    mainCommits(node).map((gridCommit) => gridCommit.commit.kind);

/** Whether a node is a job run that made no state commit. */
function isEmptyRun(node: ITimelineNode): boolean {
    const kinds = kindsIn(node);
    return node.kind === NodeKind.Session && kinds.every((kind) => kind === CommitKind.Job);
}

/**
 * Whether any level shows two empty job runs side by side, which should have collapsed. Inside a
 * collapsed row, a job's runs sit together on purpose, so it does not look there.
 */
function hasRunsSideBySide(nodes: readonly ITimelineNode[]): boolean {
    const isHere = nodes.some(
        (node, at) => at > 0 && isEmptyRun(node) && isEmptyRun(nodes[at - 1]!),
    );
    const below = nodes.filter((node) => node.kind !== NodeKind.EmptyRuns);
    return isHere || below.some((node) => hasRunsSideBySide(node.children));
}

describe('back-to-back empty job runs', () => {
    const shown = shownNodes(GRID.nodes, NOTHING_HIDDEN);
    const all = everyNode(shown);
    const collapsed = all.filter((node) => node.kind === NodeKind.EmptyRuns);

    it('collapse into one row, so no two show side by side', () => {
        const isSideBySide = hasRunsSideBySide(shown);

        expect(collapsed.length).toBeGreaterThan(0);
        expect(isSideBySide).toBe(false);
    });

    it("open to them grouped by job, each group holding that job's runs", () => {
        const [first] = collapsed;
        const jobs = first!.children;

        const kinds = jobs.map((job) => job.kind);
        const runs = jobs.flatMap((job) => job.children);
        const isEachEmpty = runs.every(isEmptyRun);
        const labels = jobs.map((job) => job.label);
        const isEachJobs = kinds.every((kind) => kind === NodeKind.JobRuns);
        const isEachNamed = labels.every((label) => / empty runs?$/.test(label));
        expect(isEachJobs).toBe(true);
        expect(isEachEmpty).toBe(true);
        expect(first!.label).toBe(`${runs.length} empty job runs`);
        expect(isEachNamed).toBe(true);
    });

    it('hold every commit of their runs, in order, so each stays selectable', () => {
        const [first] = collapsed;
        const runs = first!.children.flatMap((job) => job.children);

        const places = mainCommits(first!).map((gridCommit) => gridCommit.place);
        const fromRuns = runs.flatMap(mainCommits).map((gridCommit) => gridCommit.place);
        const sorted = fromRuns.toSorted((one, other) => one - other);
        expect(places).toEqual(sorted);
    });

    it('stay apart when only one is alone between other rows', () => {
        const sizes = collapsed.map((node) => {
            const runs = node.children.flatMap((job) => job.children);
            return runs.length;
        });

        const isEachTwoOrMore = sizes.every((size) => size >= 2);
        expect(isEachTwoOrMore).toBe(true);
    });
});

describe('the filter', () => {
    it("hides only its kind's commits, and drops a group left with none", () => {
        const shown = shownNodes(GRID.nodes, HIDE_JOBS);

        const all = everyNode(shown);
        const kinds = all.flatMap(kindsIn);
        const runsLeft = all.filter((node) => node.kind === NodeKind.EmptyRuns);
        expect(kinds).not.toContain(CommitKind.Job);
        expect(kinds).toContain(CommitKind.State);
        expect(runsLeft).toEqual([]);
    });

    it('collapses by what a job run made, whatever the filter hides', () => {
        const shown = shownNodes(GRID.nodes, HIDE_STATE);

        const all = everyNode(shown);
        const runs = all.filter((node) => node.kind === NodeKind.EmptyRuns);
        const plain = shownNodes(GRID.nodes, NOTHING_HIDDEN);
        const plainAll = everyNode(plain);
        const plainRuns = plainAll.filter((node) => node.kind === NodeKind.EmptyRuns);
        const keys = runs.map((node) => node.key);
        const plainKeys = plainRuns.map((node) => node.key);
        expect(keys).toEqual(plainKeys);
    });

    it('still finds the group holding a hidden commit, and marks it as holding the commit shown', () => {
        const shown = shownNodes(GRID.nodes, HIDE_STATE);
        const stateCommit = RUN.line.commits.find((commit) => commit.kind === CommitKind.State)!;
        const index = RUN.cache.commitIds.indexOf(stateCommit.id);
        const place = (index + 1) as Position;

        const groups = groupsHolding(shown, MAIN_BRANCH, place);
        const node = commitNodeAt(shown, MAIN_BRANCH, place);
        const keys = groups.map((group) => group.key);
        const open = new Set(keys);
        const rows = timelineRows(shown, open);
        const views = timelineRowViews(rows, GRID.columns, {
            currentBranch: MAIN_BRANCH,
            line: new Map([[MAIN_BRANCH, Number.POSITIVE_INFINITY]]),
            place,
            selected: null,
            isOpen: (each) => open.has(each.key),
        });

        const marked = views.filter((view) => view.cells[0]?.hasShown === true);
        expect(groups.length).toBeGreaterThan(0);
        expect(node).toBeUndefined();
        expect(marked.at(-1)?.key).toBe(groups.at(-1)?.key);
    });
});
