import { List, Range } from 'immutable';

import type { LogSequence } from '../../domain/event-log/numbers';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import type { Position } from '../../domain/system/math/math';
import { toPosition } from '../../domain/system/math/math';
import type { Maker } from '../../domain/system/records/maker';
import type { IVersion } from '../../domain/system/records/version-chain';
import { versionChain } from '../../domain/system/records/version-chain';
import { required } from '../../domain/system/validation/required';
import type { ICommit } from '../simulation-engine/commit';
import type { IMainRoot } from '../simulation-engine/main-root';
import type { RecordRef, RecordVersion } from '../simulation-engine/record-ref';
import { keyOf, recordOf, RecordKind, versionIn } from '../simulation-engine/record-ref';
import { commitAt, placeOfEntry, rootAt } from '../simulation-engine/run-places';
import type { IRunState } from '../simulation-engine/run-state';
import type { SessionId } from '../simulation-engine/session-id';
import { sessionNumberOf, toSessionId } from '../simulation-engine/session-id';

/*
 * One place to ask a run about its moments, its records, and who made what (FND-81). Every
 * function is pure, and reads the run's current line.
 */

export { commitAt, rootAt, RecordKind };
export type { RecordRef, RecordVersion };

/** The modules whose state a commit can change, in the order a change is named by. */
export const StateModule = {
    Orders: 'Orders',
    Deliveries: 'Deliveries',
    Drivers: 'Drivers',
} as const;

/** One of the values of {@link StateModule}. */
export type StateModule = (typeof StateModule)[keyof typeof StateModule];

/** Which modules' state differs between two roots, in {@link StateModule} order. */
export function changedModules(before: IMainRoot, after: IMainRoot): readonly StateModule[] {
    const changed = [
        before.state.orders !== after.state.orders ? StateModule.Orders : null,
        before.state.deliveries !== after.state.deliveries ? StateModule.Deliveries : null,
        before.state.drivers !== after.state.drivers ? StateModule.Drivers : null,
    ];
    return changed.filter((module) => module !== null);
}

/** A record's version at a place, or undefined before it existed. */
export function versionAt(
    run: IRunState,
    record: RecordRef,
    place: Position,
): RecordVersion | undefined {
    const root = rootAt(run, place);
    return versionIn(root, record);
}

/** A record's versions up to this one, oldest first. */
export const historyOf = <TVersion extends IVersion<TVersion>>(
    version: TVersion,
): List<TVersion> => versionChain(version);

/** What made a version: a job run or API call, or the run's start. */
export const madeBy = (version: { readonly madeBy: Maker }): Maker => version.madeBy;

/** The commit at an index of the current line, from 0 for the first. */
function commitAtIndex(run: IRunState, index: number): ICommit {
    const found = run.cache.commitIds.get(index);
    const id = required(found, `the commit at index ${index}`);
    const commit = run.line.commits.get(id);
    return required(commit, `commit ${id}`);
}

/** The number of the job run or API call a commit belongs to, by its index, or null for none. */
function sessionNumberAt(run: IRunState, index: number): number | null {
    const { session } = commitAtIndex(run, index);
    return session === null ? null : sessionNumberOf(session);
}

/** The first index from one, below an end, whose commit belongs to a job run or API call. */
const nextInSession = (run: IRunState, from: number, end: number): number =>
    Range(from, end).find((index) => sessionNumberAt(run, index) !== null) ?? end;

/**
 * The first index from `low` to `high` whose commit belongs to a job run or API call numbered at
 * least `target`, or `high` when none does, found by halving. Session numbers grow along a line,
 * and the few commits outside any session are skipped over.
 */
function firstSessionFrom(run: IRunState, target: number, low: number, high: number): number {
    if (low >= high) {
        return high;
    }
    const middle = Math.floor((low + high) / 2);
    const known = nextInSession(run, middle, high);
    if (known === high) {
        const left = firstSessionFrom(run, target, low, middle);
        return left === middle ? high : left;
    }
    const found = sessionNumberAt(run, known);
    const number = required(found, 'a session number');
    if (number < target) {
        return firstSessionFrom(run, target, known + 1, high);
    }
    const left = firstSessionFrom(run, target, low, middle);
    return left === middle ? known : left;
}

/** The commits of one job run or API call on the current line, which sit together. */
function commitsOfSession(run: IRunState, session: SessionId): List<ICommit> {
    const { size } = run.cache.commitIds;
    const target = sessionNumberOf(session);
    const first = firstSessionFrom(run, target, 0, size);
    return Range(first, size)
        .map((index) => commitAtIndex(run, index))
        .takeWhile((commit) => commit.session === session)
        .toList();
}

/** The commits a job run or API call made, oldest first; the run's start made none. */
export function commitsOfWork(run: IRunState, maker: Maker): List<ICommit> {
    if (maker.workId === null) {
        return List();
    }
    const session = toSessionId(maker.workId);
    return commitsOfSession(run, session);
}

/**
 * The place of the commit that made a version of a record, on the current line, or null for a
 * version of the run's start. It is the first commit of the version's job run or API call whose
 * root holds that version or a later one, as one commit can make two versions of a record.
 */
export function placeMaking(
    run: IRunState,
    record: RecordRef,
    version: RecordVersion,
): Position | null {
    const { workId } = version.madeBy;
    if (workId === null) {
        return null;
    }
    const session = toSessionId(workId);
    const { size } = run.cache.commitIds;
    const target = sessionNumberOf(session);
    const first = firstSessionFrom(run, target, 0, size);
    const index = Range(first, size)
        .takeWhile((at) => commitAtIndex(run, at).session === session)
        .find((at) => {
            const { root } = commitAtIndex(run, at);
            const held = versionIn(root, record)?.number ?? 0;
            return held >= version.number;
        });
    return index === undefined ? null : toPosition(index + 1);
}

/** A version of a record, and the place of the commit that made it, or null for the start. */
export interface IMadeVersion {
    readonly version: RecordVersion;
    readonly place: Position | null;
    /** The root the version was made in, or the run's start: the record as it stood then. */
    readonly root: IMainRoot;
}

/**
 * A record's versions as they stood at a place, oldest first, each with the place of the commit
 * that made it, as the Inspector shows an order's (FND-81). None before the record existed.
 */
export function versionsAt(
    run: IRunState,
    record: RecordRef,
    place: Position,
): readonly IMadeVersion[] {
    const latest = versionAt(run, record, place);
    if (latest === undefined) {
        return [];
    }
    const chain = versionChain<RecordVersion>(latest).toArray();
    return chain.map((version) => {
        const made = placeMaking(run, record, version);
        const root = made === null ? run.line.start : rootAt(run, made);
        return { version, place: made, root };
    });
}

/** When a version was made: its job run's or API call's time, or null for the run's start. */
export function whenMade(run: IRunState, version: { readonly madeBy: Maker }): SimTime | null {
    const commits = commitsOfWork(run, version.madeBy);
    return commits.first()?.at ?? null;
}

/** The commit that wrote a log entry, or null when no commit holds it yet. */
export function commitOfEntry(run: IRunState, sequence: LogSequence): ICommit | null {
    const place = placeOfEntry(run, sequence);
    const commit = commitAt(run, place);
    if (commit === null) {
        return null;
    }
    const found = run.cache.entriesUpTo.get(place - 1);
    const held = required(found, 'a count');
    return sequence < held ? commit : null;
}

/** The commit of the current line with an ID. */
function commitOf(run: IRunState, id: ICommit['id']): ICommit {
    const commit = run.line.commits.get(id);
    return required(commit, `commit ${id}`);
}

/**
 * The records a job run or API call made versions of, from the index in the run's cache; the
 * run's start made the versions the run began with, which no work made.
 */
export function versionsMadeBy(run: IRunState, maker: Maker): List<RecordRef> {
    if (maker.workId === null) {
        return List();
    }
    const session = toSessionId(maker.workId);
    const { index } = run.cache;
    const numbers = index.recordsByWork.get(session) ?? [];
    const records = numbers.map((number) => {
        const found = index.records.get(number);
        const key = required(found, `record ${number}`);
        return recordOf(key);
    });
    return List(records);
}

/** The commits that made a version of a record, oldest first, from the index in the cache. */
export function commitsTouching(run: IRunState, record: RecordRef): List<ICommit> {
    const key = keyOf(record);
    const { index } = run.cache;
    const number = index.numbers.get(key);
    const ids = number === undefined ? undefined : index.commitsByRecord.get(number);
    const commits = (ids ?? List()).map((id) => commitOf(run, id));
    return List(commits);
}
