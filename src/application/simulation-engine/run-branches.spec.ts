import { describe, expect, it } from 'vitest';

import { isBetweenGroups, latestPlace } from '../../application-core/simulation-engine/run-places';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import {
    forkAt,
    rename,
    switchTo,
    branchesOf,
    branchLinesOf,
    branchLinesSince,
} from '../../application-core/simulation-engine/run-branches';
import { MAIN_BRANCH } from '../../application-core/simulation-engine/branch-id';
import { changesOf } from '../../domain/business-rules/parameter-change.testing';
import {
    DISPATCH_PASS,
    DISPATCH_PASS_INTERVAL,
} from '../../domain/drivers/drivers-rule-definitions';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { toPosition } from '../../domain/system/math/math';
import { oneOrderRun } from './one-order-run.testing';
import { SimulationRun } from './simulation-run';

const MAIN = oneOrderRun();
const LATEST = latestPlace(MAIN);
const SHORT_PASS_MS = 5000;
const FORK_RUNS_TO_MS = 400_000;

/** The first place between groups after a third of the run. */
function groupPlace(run: IRunState): number {
    const ids = run.cache.commitIds.toArray();
    const third = Math.floor(ids.length / 3);
    return (
        ids.findIndex((_id, index) => {
            const place = toPosition(index + 1);
            return index >= third && isBetweenGroups(run, place);
        }) + 1
    );
}

const FIRST_GROUP_PLACE = groupPlace(MAIN);
const FORK_PLACE = toPosition(FIRST_GROUP_PLACE);

/** The run forked at a place, with a shorter dispatch pass, run on. */
function forkedAndRunOn(run: IRunState): IRunState {
    const forked = forkAt(run, FORK_PLACE);
    const live = new SimulationRun(forked);
    const faster = changesOf(DISPATCH_PASS, DISPATCH_PASS_INTERVAL, SHORT_PASS_MS);
    live.changeConfig(faster);
    const end = toSimTime(FORK_RUNS_TO_MS);
    live.advanceTo(end);
    return live.state;
}

describe("a run's branches", () => {
    it('start with Main alone, which is current', () => {
        const branches = branchesOf(MAIN).toArray();

        expect(branches).toEqual([
            {
                id: MAIN_BRANCH,
                name: 'Main',
                forkedFrom: null,
                forkedAt: 0,
                commits: LATEST,
                isCurrent: true,
            },
        ]);
    });

    it('fork at a place: the new branch shares every commit before it, the same ones', () => {
        const forked = forkAt(MAIN, FORK_PLACE);

        expect(forked.history.current).toBe('fork-1');
        expect(forked.line.commits.size).toBe(FORK_PLACE);
        const shared = forked.line.commits.valueSeq().toArray();
        const original = MAIN.line.commits.valueSeq().take(FORK_PLACE).toArray();
        const isShared = shared.every((commit, index) => commit === original[index]);
        expect(isShared).toBe(true);
        expect(forked.root).toBe(original.at(-1)!.root);
    });

    it('go on independently: a fork runs on, and Main is as it was', () => {
        const forked = forkedAndRunOn(MAIN);

        const back = switchTo(forked, MAIN_BRANCH);

        expect(forked.line.commits.size).toBeGreaterThan(FORK_PLACE);
        expect(back.line.commits.size).toBe(LATEST);
        const isMainUnchanged = back.line.commits
            .valueSeq()
            .every((commit, index) => commit === MAIN.line.commits.valueSeq().get(index));
        expect(isMainUnchanged).toBe(true);
        expect(back.root).toBe(MAIN.root);
    });

    it("keep a fork's own commits when another branch is current", () => {
        const forked = forkedAndRunOn(MAIN);
        const length = forked.line.commits.size;
        const back = switchTo(forked, MAIN_BRANCH);

        const again = switchTo(back, forked.history.current);

        expect(again.line.commits.size).toBe(length);
        expect(again.root).toBe(forked.root);
        expect(again.cache.log.entries.size).toBe(forked.cache.log.entries.size);
    });

    it("number a fork's commits on from its fork point, so a branch and a commit name it", () => {
        const forked = forkedAndRunOn(MAIN);

        const firstOwn = forked.line.commits.valueSeq().get(FORK_PLACE)!;

        expect(firstOwn.id).toBe(`commit-${FORK_PLACE + 1}`);
        const mainCommit = MAIN.line.commits.valueSeq().get(FORK_PLACE)!;
        expect(mainCommit.id).toBe(firstOwn.id);
        expect(mainCommit).not.toBe(firstOwn);
    });

    it('fork a finished run at its latest commit', () => {
        const atEnd = forkAt(MAIN, LATEST);

        expect(atEnd.line.commits.size).toBe(LATEST);
        expect(atEnd.root).toBe(MAIN.root);
    });

    it('fork inside a job run or API call at the nearest place between them before it', () => {
        const ids = MAIN.cache.commitIds.toArray();
        const inside = ids.findIndex((_id, index) => {
            const place = toPosition(index + 1);
            return !isBetweenGroups(MAIN, place);
        });
        const place = toPosition(inside + 1);

        const forked = forkAt(MAIN, place);

        expect(forked.line.commits.size).toBeLessThan(place);
        const at = toPosition(forked.line.commits.size);
        const isBetween = isBetweenGroups(MAIN, at);
        expect(isBetween).toBe(true);
    });

    it('fork a fork, before or after its own fork point', () => {
        const forked = forkedAndRunOn(MAIN);
        const half = Math.floor(FORK_PLACE / 2);
        const early = toPosition(half);
        const forkEnd = toPosition(forked.line.commits.size);

        const second = forkAt(forked, early);
        const backOnFirst = switchTo(second, forked.history.current);
        const third = forkAt(backOnFirst, forkEnd);

        const summaries = branchesOf(third).toArray();
        const names = summaries.map((summary) => summary.name);
        expect(names).toEqual(['Main', 'Fork 1', 'Fork 2', 'Fork 3']);
        expect(summaries[2]).toMatchObject({ forkedFrom: 'fork-1' });
        expect(summaries[2]!.commits).toBeLessThanOrEqual(early);
        expect(summaries[3]).toMatchObject({ forkedFrom: 'fork-1', isCurrent: true });
    });

    it('list each branch with where it forked and how many commits it holds', () => {
        const forked = forkedAndRunOn(MAIN);

        const summaries = branchesOf(forked).toArray();

        expect(summaries).toMatchObject([
            { id: 'main', name: 'Main', commits: LATEST, isCurrent: false },
            {
                id: 'fork-1',
                name: 'Fork 1',
                forkedFrom: 'main',
                forkedAt: FORK_PLACE,
                commits: forked.line.commits.size,
                isCurrent: true,
            },
        ]);
    });

    it('rename, keeping the ID, and refuse a blank name', () => {
        const forked = forkAt(MAIN, FORK_PLACE);

        const renamed = rename(forked, forked.history.current, '  Faster dispatch ');

        const names = branchesOf(renamed)
            .map((summary) => summary.name)
            .toArray();
        expect(names).toEqual(['Main', 'Faster dispatch']);
        expect(() => rename(forked, MAIN_BRANCH, ' ')).toThrow(RangeError);
    });

    it("give every branch's whole line, the shared commits included, Main's from the history", () => {
        const forked = forkedAndRunOn(MAIN);

        const lines = branchLinesOf(forked).toArray();

        const [main, fork] = lines;
        expect(main).toMatchObject({ id: MAIN_BRANCH, isCurrent: false });
        expect(main?.line.size).toBe(LATEST);
        expect(fork).toMatchObject({ forkedFrom: MAIN_BRANCH, forkedAt: FORK_PLACE });
        expect(fork?.line.size).toBe(forked.line.commits.size);
        const shared = fork?.line.take(FORK_PLACE).toArray();
        const original = main?.line.take(FORK_PLACE).toArray();
        expect(shared).toEqual(original);
    });

    it("grow the current branch's line from an earlier one, and keep the others as they were", () => {
        const forked = forkAt(MAIN, FORK_PLACE);
        const earlier = branchLinesSince(forked, null);
        const live = new SimulationRun(forked);
        const end = toSimTime(FORK_RUNS_TO_MS);
        live.advanceTo(end);

        const later = branchLinesSince(live.state, earlier);

        const whole = branchLinesOf(live.state);
        const lines = later.lines.map((line) => line.line.toArray()).toArray();
        const wholeLines = whole.map((line) => line.line.toArray()).toArray();
        expect(lines).toEqual(wholeLines);
        const main = later.lines.first();
        const earlierMain = earlier.lines.first();
        expect(main).toBe(earlierMain);
    });

    it('switching to the current branch changes nothing', () => {
        const same = switchTo(MAIN, MAIN_BRANCH);

        expect(same).toBe(MAIN);
    });
});
