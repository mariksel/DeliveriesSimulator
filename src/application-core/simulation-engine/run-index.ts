import { List, Map as ImmutableMap, Range, Seq } from 'immutable';

import { versionChain } from '../../domain/system/records/version-chain';
import type { ICommit } from './commit';
import type { CommitId } from './commit-id';
import type { ICommitLine } from './commit-line';
import { headRoot } from './commit-line';
import type { IMainRoot } from './main-root';
import type { RecordKey, RecordVersion } from './record-ref';
import { keyOf, latestVersionsIn, recordOfVersion, versionIn } from './record-ref';
import type { SessionId } from './session-id';
import { toSessionId } from './session-id';

/**
 * What each job run or API call made, and every commit that made a version of each record, on a
 * run's current line. It is part of the run's cache, so it is never saved, and it is worked out
 * again from the commits on a fork, a switch, or a load (FND-81). Each record gets a number the
 * first time it is noted, so the lists hold small numbers rather than keys.
 */
export interface IRunIndex {
    /** Every record noted, by its number. */
    readonly records: List<RecordKey>;
    /** Each record's number. */
    readonly numbers: ImmutableMap<RecordKey, number>;
    /**
     * For each job run or API call, the numbers of the records it made versions of, once each.
     * The lists are short plain arrays, which hold a city day's index in far less memory.
     */
    readonly recordsByWork: ImmutableMap<SessionId, readonly number[]>;
    /**
     * For each record's number, the commits that made a version of it, oldest first. A driver's
     * location gains one with every send, so each is a list that grows without being copied.
     */
    readonly commitsByRecord: List<List<CommitId>>;
}

/** The index of a line with no commits. */
export const EMPTY_RUN_INDEX: IRunIndex = {
    records: List(),
    numbers: ImmutableMap(),
    recordsByWork: ImmutableMap(),
    commitsByRecord: List(),
};

const NONE: readonly never[] = Object.freeze([]);

/** Orders record keys, so the index never depends on the order a commit made them in. */
function byKey(first: RecordKey, second: RecordKey): number {
    if (first === second) {
        return 0;
    }
    return first < second ? -1 : 1;
}

/** The index with records noted, each new one given the next number, in the order given. */
function withRecords(index: IRunIndex, keys: readonly RecordKey[]): IRunIndex {
    const unknown = keys.filter((key) => !index.numbers.has(key));
    if (unknown.length === 0) {
        return index;
    }
    const first = index.records.size;
    const numbered = unknown.map((key, offset): [RecordKey, number] => [key, first + offset]);
    const none = unknown.map(() => List<CommitId>());
    return {
        ...index,
        records: index.records.concat(unknown),
        numbers: index.numbers.merge(numbered),
        commitsByRecord: index.commitsByRecord.concat(none),
    };
}

/**
 * The index after a state commit, from the versions its state function made: each record noted,
 * the commit added to each one's commits, and the records added to its job run's or API call's,
 * all at once. The cost follows what changed, so a city day's commits stay fast, even a batch of
 * hundreds of sends (FND-90).
 */
export function noteMade(
    index: IRunIndex,
    commit: CommitId,
    session: SessionId,
    made: List<RecordVersion>,
): IRunIndex {
    if (made.isEmpty()) {
        return index;
    }
    const allKeys = made.toArray().map((version) => {
        const record = recordOfVersion(version);
        return keyOf(record);
    });
    const keys = [...new Set(allKeys)].toSorted(byKey);
    const noted = withRecords(index, keys);
    const numbers = keys.map((key) => noted.numbers.get(key) ?? -1);
    const commitsByRecord = noted.commitsByRecord.withMutations((lists) => {
        numbers.forEach((number) => {
            const commits = lists.get(number) ?? List<CommitId>();
            if (commits.last() !== commit) {
                const added = commits.push(commit);
                lists.set(number, added);
            }
        });
    });
    const works = noted.recordsByWork.get(session) ?? NONE;
    const known = new Set(works);
    const added = numbers.filter((number) => !known.has(number));
    const recordsByWork =
        added.length === 0
            ? noted.recordsByWork
            : noted.recordsByWork.set(session, [...works, ...added]);
    return { ...noted, recordsByWork, commitsByRecord };
}

/** Where each job run or API call starts on a line: the index of its first commit. */
function sessionStarts(commits: List<ICommit>): ImmutableMap<SessionId, number> {
    return ImmutableMap<SessionId, number>().withMutations((starts) => {
        commits.forEach((commit, index) => {
            if (commit.session !== null && !starts.has(commit.session)) {
                starts.set(commit.session, index);
            }
        });
    });
}

/** One record a commit made a version of. */
interface IMadeIn {
    readonly commit: CommitId;
    readonly session: SessionId;
    readonly key: RecordKey;
}

/** One version, and the place of the commit that made it. */
interface IMadeAt extends IMadeIn {
    readonly place: number;
}

/**
 * The first commit of a job run or API call whose root holds a record's version, if any does.
 * Versions are compared by number, as a loaded run's roots do not share their version objects.
 */
function placeHolding(
    commits: List<ICommit>,
    start: number,
    session: SessionId,
    version: RecordVersion,
): number | undefined {
    const record = recordOfVersion(version);
    return Range(start, commits.size)
        .takeWhile((place) => commits.get(place)?.session === session)
        .find((place) => {
            const commit = commits.get(place);
            return (
                commit !== undefined && versionIn(commit.root, record)?.number === version.number
            );
        });
}

/** Where one version was made, or nothing for a version of the run's start. */
function madeAt(
    commits: List<ICommit>,
    starts: ImmutableMap<SessionId, number>,
    version: RecordVersion,
): IMadeAt[] {
    const { workId } = version.madeBy;
    if (workId === null) {
        return [];
    }
    const session = toSessionId(workId);
    const start = starts.get(session);
    const place = start === undefined ? undefined : placeHolding(commits, start, session, version);
    const commit = place === undefined ? undefined : commits.get(place);
    if (place === undefined || commit === undefined) {
        return [];
    }
    const record = recordOfVersion(version);
    return [{ place, commit: commit.id, session, key: keyOf(record) }];
}

/** The distinct values of a list, each where it first appears. */
const distinct = <TValue>(values: readonly TValue[]): readonly TValue[] => [...new Set(values)];

/** The commits of a record, dropping a commit noted twice in a row. */
function distinctInRow(commits: readonly CommitId[]): List<CommitId> {
    const kept = commits.filter((commit, place) => place === 0 || commits[place - 1] !== commit);
    return List(kept);
}

/**
 * The index of records made, in the order they were made, built at once. It equals noting them
 * commit by commit with {@link noteMade}, as a run does while it grows.
 */
function indexOfMade(ordered: readonly IMadeIn[]): IRunIndex {
    const allKeys = ordered.map((made) => made.key);
    const keys = distinct(allKeys);
    const records = List(keys);
    const pairs = keys.map((key, number) => [key, number] as const);
    const numbers = ImmutableMap(pairs);
    const numberOf = (key: RecordKey): number => numbers.get(key) ?? -1;
    const byRecord = Seq(ordered).groupBy((made) => made.key);
    const commitsByRecord = records.map((key) => {
        const group = byRecord.get(key);
        const made = group === undefined ? [] : group.toArray();
        const commits = made.map((each) => each.commit);
        return distinctInRow(commits);
    });
    const recordsByWork = Seq(ordered)
        .groupBy((made) => made.session)
        .map((made) => {
            const recordNumbers = made.toArray().map((each) => numberOf(each.key));
            return distinct(recordNumbers);
        })
        .toMap();
    return { records, numbers, recordsByWork, commitsByRecord };
}

/** The index of a line, worked out from its commits, as {@link indexOfCommits} does. */
export function indexOfLine(line: ICommitLine): IRunIndex {
    const commits = line.commits.valueSeq().toList();
    const root = headRoot(line);
    return indexOfCommits(commits, root);
}

/**
 * The index of a line of commits, worked out from its latest root: every version of every
 * record, through its version chain, and the commit of its maker's job run or API call that made
 * it. Nothing is compared root by root, so it costs about as much as the versions there are. It
 * gives the index of a branch that is not current, whose index the run does not keep.
 */
export function indexOfCommits(commits: List<ICommit>, root: IMainRoot): IRunIndex {
    const starts = sessionStarts(commits);
    const made = latestVersionsIn(root).flatMap((latest) =>
        versionChain<RecordVersion>(latest)
            .toArray()
            .flatMap((version) => madeAt(commits, starts, version)),
    );
    const ordered = made.toSorted((first, second) =>
        first.place === second.place ? byKey(first.key, second.key) : first.place - second.place,
    );
    return indexOfMade(ordered);
}
