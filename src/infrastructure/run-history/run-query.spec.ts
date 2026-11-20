import { describe, expect, it } from 'vitest';

import type { ICommit } from '../../application-core/simulation-engine/commit';
import { CommitKind } from '../../application-core/simulation-engine/commit';
import { latestPlace } from '../../application-core/simulation-engine/run-places';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import type { SessionId } from '../../application-core/simulation-engine/session-id';
import type { RecordVersion } from '../../application-core/run-history/run-query';
import {
    changedModules,
    commitOfEntry,
    commitsOfWork,
    commitsTouching,
    historyOf,
    madeBy,
    RecordKind,
    rootAt,
    StateModule,
    versionAt,
    versionsMadeBy,
    placeMaking,
    versionsAt,
    whenMade,
} from '../../application-core/run-history/run-query';
import type { RecordRef } from '../../application-core/simulation-engine/record-ref';
import {
    keyOf,
    latestVersionsIn,
    recordOfVersion,
    versionIn,
} from '../../application-core/simulation-engine/record-ref';
import type { IRunIndex } from '../../application-core/simulation-engine/run-index';
import { EMPTY_RUN_INDEX, indexOfLine } from '../../application-core/simulation-engine/run-index';
import { toPersistedRun } from '../simulation-engine/persisted-run';
import { toInputOrderName } from '../../application-core/simulation-engine/run-input';
import { toLogSequence } from '../../domain/event-log/numbers';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import { toPosition } from '../../domain/system/math/math';
import { Maker, MakerKind, toWorkId } from '../../domain/system/records/maker';
import {
    forkedRun,
    forkedRunBackOnMain,
    indirectRun,
    oneOrderRun,
    variedRun,
} from '../simulation-engine/sample-runs.testing';

const ONE_ORDER = oneOrderRun();
const RUNS: [string, IRunState][] = [
    ['the one-order run', ONE_ORDER],
    ['the varied run', variedRun()],
    ['the forked run', forkedRun()],
    ['the indirect run', indirectRun()],
];
const A = toInputOrderName('A');
const ORDER_A = ONE_ORDER.cache.orderIds.get(A)!;

/** The current line's commits, oldest first. */
const commitsOf = (run: IRunState): ICommit[] => run.line.commits.valueSeq().toArray();

/** Every job run and API call on a run's current line, once each, in order. */
function sessionsOf(run: IRunState): SessionId[] {
    const sessions = commitsOf(run).flatMap((commit) =>
        commit.session === null ? [] : [commit.session],
    );
    return [...new Set(sessions)];
}

/** Every version a run's latest root holds, with every version before it. */
function everyVersionOf(run: IRunState): RecordVersion[] {
    const latest = latestVersionsIn(run.root);
    return latest.flatMap((version) => historyOf(version as never).toArray() as RecordVersion[]);
}

/** Every version a root holds, latest only. */
function versionsIn(run: IRunState, place: number): Set<RecordVersion> {
    const position = toPosition(place);
    const root = rootAt(run, position);
    const latest = latestVersionsIn(root);
    return new Set(latest);
}

/** When a version was made, by scanning every root for the first that holds it. */
function whenMadeByScan(run: IRunState, version: RecordVersion): SimTime | null {
    if (versionsIn(run, 0).has(version)) {
        return null;
    }
    const commits = commitsOf(run);
    const index = commits.findIndex((_commit, each) => versionsIn(run, each + 1).has(version));
    return commits[index]!.at;
}

/** The commit that wrote each committed log entry, by walking every commit's entries. */
function entryWriters(run: IRunState): { sequence: number; commit: ICommit }[] {
    return commitsOf(run).flatMap((commit) =>
        commit.entries.toArray().map((entry) => ({ sequence: entry.sequence, commit })),
    );
}

/** The place of the first commit whose root holds a version of a record or a later one. */
function placeMakingByScan(run: IRunState, version: RecordVersion): number | null {
    if (versionsIn(run, 0).has(version)) {
        return null;
    }
    const record = recordOfVersion(version);
    const commits = commitsOf(run);
    const index = commits.findIndex(
        (commit) => (versionIn(commit.root, record)?.number ?? 0) >= version.number,
    );
    return index + 1;
}

describe("a run's moments", () => {
    it("give the run's start at place 0, and each commit's root after", () => {
        const commits = commitsOf(ONE_ORDER);
        const places = commits.map((_commit, index) => toPosition(index + 1));

        const first = toPosition(0);
        const start = rootAt(ONE_ORDER, first);
        const roots = places.map((place) => rootAt(ONE_ORDER, place));

        const expected = commits.map((commit) => commit.root);
        expect(start).toBe(ONE_ORDER.line.start);
        expect(roots).toEqual(expected);
    });

    it('name the module a state commit changed, and none for an effect commit', () => {
        const commits = commitsOf(ONE_ORDER);
        const created = commits.findIndex((commit) => commit.kind === CommitKind.State);
        const input = commits.findIndex((commit) => commit.kind === CommitKind.Input);
        const createdAt = toPosition(created);
        const inputAt = toPosition(input);
        const beforeState = rootAt(ONE_ORDER, createdAt);
        const beforeInput = rootAt(ONE_ORDER, inputAt);

        const stateChange = changedModules(beforeState, commits[created]!.root);
        const effectChange = changedModules(beforeInput, commits[input]!.root);

        expect(stateChange).toEqual([StateModule.Orders]);
        expect(effectChange).toEqual([]);
    });
});

describe("a record's versions", () => {
    it("give order A's version at each place, and none before it existed", () => {
        const order = { kind: RecordKind.Order, id: ORDER_A } as const;
        const latest = latestPlace(ONE_ORDER);
        const places = Array.from({ length: latest + 1 }, (_value, place) => toPosition(place));

        const found = places.map((place) => versionAt(ONE_ORDER, order, place));
        const expected = places.map((place) =>
            rootAt(ONE_ORDER, place).state.orders.orderVersions.get(ORDER_A),
        );

        const last = found.at(-1);
        const latestVersion = ONE_ORDER.root.state.orders.orderVersions.get(ORDER_A);
        expect(found[0]).toBeUndefined();
        expect(found).toEqual(expected);
        expect(last).toBe(latestVersion);
    });

    it.each([RecordKind.DeliveryCopy, RecordKind.Delivery])(
        "give order A's %s at the latest place",
        (kind) => {
            const record = { kind, id: ORDER_A } as const;
            const latest = latestPlace(ONE_ORDER);

            const version = versionAt(ONE_ORDER, record, latest);

            expect(version?.number).toBeGreaterThan(1);
        },
    );

    it('give a driver and a notification at the latest place', () => {
        const driver = ONE_ORDER.root.state.drivers.driverVersions.first()!;
        const notification = ONE_ORDER.root.state.deliveries.notificationVersions.first()!;
        const latest = latestPlace(ONE_ORDER);

        const foundDriver = versionAt(
            ONE_ORDER,
            { kind: RecordKind.Driver, id: driver.driverId },
            latest,
        );
        const foundNotification = versionAt(
            ONE_ORDER,
            { kind: RecordKind.Notification, id: notification.notificationId },
            latest,
        );

        expect(foundDriver).toBe(driver);
        expect(foundNotification).toBe(notification);
    });
});

describe('who made what, and when', () => {
    it.each(RUNS)('gives exactly each job run and API call its commits, in %s', (_name, run) => {
        const sessions = sessionsOf(run);

        const found = sessions.map((session) => {
            const workId = toWorkId(session);
            const maker = Maker.work(workId);
            return commitsOfWork(run, maker).toArray();
        });
        const expected = sessions.map((session) =>
            commitsOf(run).filter((commit) => commit.session === session),
        );

        expect(sessions.length).toBeGreaterThan(0);
        expect(found).toEqual(expected);
    });

    it("gives the run's start no commits", () => {
        const start = Maker.runStart();

        const commits = commitsOfWork(ONE_ORDER, start);

        expect(commits.size).toBe(0);
    });

    it.each(RUNS)('says when each version was made as a full scan does, in %s', (_name, run) => {
        const versions = everyVersionOf(run);

        const found = versions.map((version) => whenMade(run, version));
        const expected = versions.map((version) => whenMadeByScan(run, version));

        expect(found).toEqual(expected);
    });

    it.each(RUNS)(
        'gives the place of the commit that made each version as a full scan does, in %s',
        (_name, run) => {
            const versions = everyVersionOf(run);

            const found = versions.map((version) => {
                const record = recordOfVersion(version);
                return placeMaking(run, record, version);
            });

            const expected = versions.map((version) => placeMakingByScan(run, version));
            expect(found).toEqual(expected);
        },
    );

    it("gives an order's versions as they stood at a place, each with its commit", () => {
        const record: RecordRef = { kind: RecordKind.Order, id: ORDER_A };
        const latest = toPosition(ONE_ORDER.cache.commitIds.size);
        const halfWay = Math.floor(latest / 2);
        const half = toPosition(halfWay);
        const start = toPosition(0);

        const all = versionsAt(ONE_ORDER, record, latest);
        const then = versionsAt(ONE_ORDER, record, half);
        const before = versionsAt(ONE_ORDER, record, start);

        const newest = versionIn(ONE_ORDER.root, record);
        const history = historyOf(newest as never);
        const chain = history.toArray();
        const versions = all.map((made) => made.version);
        const isEachMade = all.every((made) => made.place !== null && made.place <= latest);
        const earliest = all.slice(0, then.length);
        expect(versions).toEqual(chain);
        expect(isEachMade).toBe(true);
        expect(then.length).toBeGreaterThan(0);
        expect(then.length).toBeLessThan(all.length);
        expect(then).toEqual(earliest);
        expect(before).toEqual([]);
    });

    it("says the starting drivers were made at the run's start", () => {
        const drivers = ONE_ORDER.line.start.state.drivers.driverVersions.valueSeq().toArray();

        const times = drivers.map((driver) => whenMade(ONE_ORDER, driver));
        const makers = drivers.map((driver) => madeBy(driver).kind);

        const noTimes = drivers.map(() => null);
        const runStarts = drivers.map(() => MakerKind.RunStart);
        expect(times).toEqual(noTimes);
        expect(makers).toEqual(runStarts);
    });

    it.each(RUNS)('gives the commit that wrote each log entry, in %s', (_name, run) => {
        const writers = entryWriters(run);

        const found = writers.map(({ sequence }) => {
            const logSequence = toLogSequence(sequence);
            return commitOfEntry(run, logSequence);
        });

        const expected = writers.map(({ commit }) => commit);
        expect(writers.length).toBeGreaterThan(0);
        expect(found).toEqual(expected);
    });

    it('gives no commit for an entry no commit holds yet', () => {
        const beyond = toLogSequence(ONE_ORDER.cache.log.entries.size);

        const commit = commitOfEntry(ONE_ORDER, beyond);

        expect(commit).toBeNull();
    });
});

/** Every record a root holds, of the five kinds. */
function recordsIn(run: IRunState): RecordRef[] {
    return latestVersionsIn(run.root).map(recordOfVersion);
}

/** The commits that changed a record, by comparing each root with the one before. */
function touchingByScan(run: IRunState, record: RecordRef): ICommit[] {
    const commits = commitsOf(run);
    return commits.filter((commit, index) => {
        const before = index === 0 ? run.line.start : commits[index - 1]!.root;
        return versionIn(before, record) !== versionIn(commit.root, record);
    });
}

/** The records a job run or API call changed, by the same comparison. */
function madeByScan(run: IRunState, session: SessionId): string[] {
    const records = recordsIn(run);
    const touched = records.filter((record) =>
        touchingByScan(run, record).some((commit) => commit.session === session),
    );
    return touched.map(keyOf).sort();
}

/** An index as plain, ordered values, so two built differently compare equal. */
function plainIndex(index: IRunIndex): unknown {
    const keyAt = (number: number): string => index.records.get(number)!;
    const works = index.recordsByWork
        .map((numbers) => numbers.map(keyAt).sort())
        .toOrderedMap()
        .sortBy((_keys, session) => session)
        .toJS();
    const records = index.records
        .toOrderedMap()
        .mapEntries(([number, key]) => [key, [...index.commitsByRecord.get(number)!]])
        .sortBy((_commits, key) => key)
        .toJS();
    return { works, records };
}

describe("the run's index", () => {
    it('lists exactly the records each job run and API call made versions of', () => {
        const sessions = sessionsOf(ONE_ORDER);

        const found = sessions.map((session) => {
            const workId = toWorkId(session);
            const maker = Maker.work(workId);
            return versionsMadeBy(ONE_ORDER, maker).map(keyOf).toArray().sort();
        });
        const expected = sessions.map((session) => madeByScan(ONE_ORDER, session));

        expect(found).toEqual(expected);
    });

    it("lists nothing for the run's start", () => {
        const start = Maker.runStart();

        const records = versionsMadeBy(ONE_ORDER, start);

        expect(records.size).toBe(0);
    });

    it.each(RUNS)(
        'gives the commits that touched each record as a full scan does, in %s',
        (_name, run) => {
            const records = recordsIn(run);

            const found = records.map((record) => commitsTouching(run, record).toArray());
            const expected = records.map((record) => touchingByScan(run, record));

            expect(records.length).toBeGreaterThan(0);
            expect(found).toEqual(expected);
        },
    );

    it.each([
        ['after a fork, run on', forkedRun()],
        ['after switching back to Main', forkedRunBackOnMain()],
    ])('equals one built from scratch %s', (_name, run) => {
        const scratch = indexOfLine(run.line);

        const kept = plainIndex(run.cache.index);
        const built = plainIndex(scratch);

        expect(kept).toEqual(built);
    });

    it('is not saved with the run', () => {
        const run = ONE_ORDER;
        const withoutIndex = { ...run, cache: { ...run.cache, index: EMPTY_RUN_INDEX } };

        const saved = toPersistedRun(run);
        const savedWithout = toPersistedRun(withoutIndex);

        expect(saved).toEqual(savedWithout);
    });
});
