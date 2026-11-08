import { List, OrderedMap } from 'immutable';

import type { RunLogEntry } from './run-log-entry';
import type { OrderId } from '../../domain/orders/order';
import type { IndirectLabel, InputOrderName } from './run-input';
import type { IndirectEffect } from './indirect-effect';
import type { ICommit } from './commit';
import type { CommitId } from './commit-id';
import type { DirectEffect } from './direct-effect';
import { EffectKind } from './direct-effect';
import type { IRunLog } from './run-log';
import { emptyRunLog, withWrittenEntry } from './run-log';
import type { RunJob } from './run-work';
import type { ICommitLine } from './commit-line';
import type { Count, Position } from '../../domain/system/math/math';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import { NO_COUNT, plusOne, toCount, toPosition } from '../../domain/system/math/math';

/** A job's latest run: when, and its place among the commits, which orders work due together. */
export interface IJobRun {
    readonly at: SimTime;
    readonly position: Position;
}

/**
 * What a run works out from its commits, kept beside the line for fast lookups. It is never
 * saved: {@link rebuildRunCache} makes it again from the commits.
 */
export interface IRunCache {
    /** The event log: every commit's entries, then any written since the latest commit. */
    readonly log: IRunLog;
    /** How many of the log's entries the commits hold. */
    readonly committedEntries: Count;
    readonly lastJobRuns: OrderedMap<RunJob, IJobRun>;
    /**
     * How many scripted steps have run: the input commits, and the config change and indirect
     * commits a step made.
     */
    readonly stepsRun: Count;
    /** The indirect commit each label names, the latest when two share one (FND-89). */
    readonly indirectLabels: OrderedMap<IndirectLabel, CommitId>;
    /** The real ID of each order the scenario named, from the create order call's response. */
    readonly orderIds: OrderedMap<InputOrderName, OrderId>;
    /** Every commit's ID, oldest first, so a commit is found by its place at once (FND-86). */
    readonly commitIds: List<CommitId>;
    /** How many log entries the commits hold up to and including each one, in the same order. */
    readonly entriesUpTo: List<Count>;
}

/** A cache for a run with no commits yet, for a given empty log. */
export const emptyRunCache = (entries: List<RunLogEntry>): IRunCache => ({
    log: emptyRunLog(entries),
    committedEntries: NO_COUNT,
    lastJobRuns: OrderedMap(),
    stepsRun: NO_COUNT,
    indirectLabels: OrderedMap(),
    orderIds: OrderedMap(),
    commitIds: List(),
    entriesUpTo: List(),
});

/** The cache with a new commit's place noted, after its entries are taken. */
export const notePlace = (cache: IRunCache, id: CommitId): IRunCache => ({
    ...cache,
    commitIds: cache.commitIds.push(id),
    entriesUpTo: cache.entriesUpTo.push(cache.committedEntries),
});

/** The entries written since the latest commit, which the next commit holds. */
export interface IPendingEntries {
    readonly entries: List<RunLogEntry>;
    readonly cache: IRunCache;
}

/** Shared by every commit that writes nothing, which most job runs do. */
const NO_ENTRIES = List<RunLogEntry>();

/**
 * Takes the entries written since the latest commit, for the commit being made. They are copied
 * into a list of their own, as a slice of the whole log would keep far more of it in memory.
 */
export function takePendingEntries(cache: IRunCache): IPendingEntries {
    const { entries } = cache.log;
    const pending = entries.slice(cache.committedEntries).toArray();
    return {
        entries: pending.length === 0 ? NO_ENTRIES : List(pending),
        cache: { ...cache, committedEntries: toCount(entries.size) },
    };
}

function noteInput(cache: IRunCache, effect: DirectEffect): IRunCache {
    if (effect.kind === EffectKind.ConfigChange && effect.isScripted) {
        const stepsRun = plusOne(cache.stepsRun);
        return { ...cache, stepsRun };
    }
    if (effect.kind !== EffectKind.Input) {
        return cache;
    }
    const { response } = effect;
    const orderIds =
        response.isOk && response.orderId !== null
            ? cache.orderIds.set(effect.order, response.orderId)
            : cache.orderIds;
    const stepsRun = plusOne(cache.stepsRun);
    return { ...cache, stepsRun, orderIds };
}

/** The cache after an effect commit, at its place among the commits. */
export function noteEffectCommit(
    cache: IRunCache,
    effect: DirectEffect,
    position: Position,
): IRunCache {
    if (effect.kind === EffectKind.Job) {
        const run: IJobRun = { at: effect.at, position };
        return { ...cache, lastJobRuns: cache.lastJobRuns.set(effect.job, run) };
    }
    return noteInput(cache, effect);
}

/** The cache after an indirect commit: a step run if a script stated it, and its label noted. */
export function noteIndirectCommit(
    cache: IRunCache,
    indirect: IndirectEffect,
    id: CommitId,
): IRunCache {
    const stepsRun = indirect.isScripted ? plusOne(cache.stepsRun) : cache.stepsRun;
    const { label } = indirect;
    const indirectLabels =
        label === null ? cache.indirectLabels : cache.indirectLabels.set(label, id);
    return { ...cache, stepsRun, indirectLabels };
}

function noteCommit(cache: IRunCache, commit: ICommit, position: Position): IRunCache {
    const log = commit.entries.reduce(withWrittenEntry, cache.log);
    const committedEntries = toCount(log.entries.size);
    const written = { ...cache, log, committedEntries };
    const logged = notePlace(written, commit.id);
    if (commit.indirect !== null) {
        return noteIndirectCommit(logged, commit.indirect, commit.id);
    }
    return commit.effect === null ? logged : noteEffectCommit(logged, commit.effect, position);
}

/** Works the cache out again from a line's commits. */
export function rebuildRunCache(line: ICommitLine, entries: List<RunLogEntry>): IRunCache {
    const empty = emptyRunCache(entries);
    return line.commits.valueSeq().reduce<IRunCache>((cache, commit, index) => {
        const position = toPosition(index + 1);
        return noteCommit(cache, commit, position);
    }, empty);
}
