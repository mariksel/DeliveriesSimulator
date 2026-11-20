import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import type { ICommit } from '../../application-core/simulation-engine/commit';
import { CommitKind } from '../../application-core/simulation-engine/commit';
import type { IMainRoot } from '../../application-core/simulation-engine/main-root';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import type { Maker } from '../../domain/system/records/maker';
import { MakerKind } from '../../domain/system/records/maker';
import { oneOrderRun, variedRun } from './sample-runs.testing';

/** Any of the five versions: all that matters here is what made it. */
interface IMade {
    readonly madeBy: Maker;
}

/** A version a commit made, and that commit. */
interface IMadeIn {
    readonly version: IMade;
    readonly commit: ICommit;
}

/** Every latest version a root holds, of the five kinds. */
function versionsOf(root: IMainRoot): List<IMade> {
    const { orders, drivers, deliveries } = root.state;
    const maps = [
        orders.orderVersions,
        orders.copyVersions,
        drivers.driverVersions,
        deliveries.deliveryVersions,
        deliveries.notificationVersions,
    ];
    return List<IMade>().withMutations((all) => {
        maps.forEach((map) => map.forEach((version) => all.push(version)));
    });
}

/** Each version each commit made: in its root, and not, as the same object, in the one before. */
function madeIn(run: IRunState): List<IMadeIn> {
    const commits = run.line.commits.valueSeq().toList();
    return commits.flatMap((commit, index) => {
        const parent = index === 0 ? run.line.start : commits.get(index - 1)!.root;
        const before = versionsOf(parent).toSet();
        const fresh = versionsOf(commit.root).filter((version) => !before.has(version));
        return fresh.map((version) => ({ version, commit }));
    });
}

/** The kind of the effect commit that ends a commit's job run or API call. */
function sessionKindOf(run: IRunState, commit: ICommit): CommitKind | undefined {
    return run.line.commits
        .valueSeq()
        .find((each) => each.session === commit.session && each.effect !== null)?.kind;
}

const RUNS: [string, IRunState][] = [
    ['the one-order run', oneOrderRun()],
    ['the varied run', variedRun()],
];

/** For each sample run and each kind of work, the work each version names, and what made it. */
const CASES = RUNS.flatMap(([name, run]) =>
    [CommitKind.Input, CommitKind.Job].map((kind) => {
        const made = madeIn(run).filter(({ commit }) => sessionKindOf(run, commit) === kind);
        return {
            name,
            kind,
            named: made.map(({ version }) => version.madeBy.workId).toArray(),
            sessions: made.map(({ commit }) => commit.session).toArray(),
        };
    }),
);

describe("the makers of a run's versions", () => {
    it.each(CASES)('name the $kind work that made them, in $name', ({ named, sessions }) => {
        expect(named.length).toBeGreaterThan(0);
        expect(named).toEqual(sessions);
    });

    it("name the run's start for the starting drivers", () => {
        const run = oneOrderRun();
        const drivers = run.line.start.state.drivers.driverVersions.valueSeq().toArray();

        const kinds = drivers.map((version) => version.madeBy.kind);

        const distinct = [...new Set(kinds)];
        expect(kinds.length).toBeGreaterThan(0);
        expect(distinct).toEqual([MakerKind.RunStart]);
    });

    it('keep a version no commit changed as the same object, with its maker', () => {
        const run = oneOrderRun();
        const start = run.line.start.state.drivers.driverVersions.first()!;
        const last = run.line.commits.last()!.root.state.drivers.driverVersions;

        const kept = last.get(start.driverId);

        expect(kept).toBe(start);
    });
});
