import { List, Range, Set as ImmutableSet } from 'immutable';

import { ParameterChange } from '../../domain/business-rules/parameter-change';
import { TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import type { Count, Position } from '../../domain/system/math/math';
import { toCount, toPosition } from '../../domain/system/math/math';
import type { ICommit } from './commit';
import { changeConfig } from './config-change';
import { EffectKind } from './direct-effect';
import { stateIndirectEffect } from './indirect-commit';
import { rebuildRunCache } from './run-cache';
import type { RunLogEntry } from './run-log-entry';
import { runLogEntriesEqual } from './run-log-entry-digest';
import { commitAt, groupStartAtOrBefore, latestPlace, rootAt } from './run-places';
import type { IRunState } from './run-state';
import { runNextWork } from './run-step';
import type { ICommitLine } from './commit-line';

/** What repeating a run from a place came to (FND-86). */
export interface IRepeatResult {
    /** Where the repeat started: the place asked for, or the nearest group start before it. */
    readonly from: Position;
    /** The latest place, which the repeat ran up to. */
    readonly to: Position;
    /** How many commits the repeat made and compared. */
    readonly compared: Count;
    /** The first place whose commit came out differently, or null when every one is the same. */
    readonly differsAt: Position | null;
    /** What stopped the repeat, if a bug did. */
    readonly failure: string | null;
}

/** A run cut back to a place between groups, its cache worked out again from its commits. */
function cutBackTo(run: IRunState, place: Position): IRunState {
    const commits = run.line.commits.take(place);
    const head = commitAt(run, place)?.id ?? null;
    const sessions = commits
        .valueSeq()
        .map((commit) => commit.session)
        .filter((session) => session !== null);
    const opened = ImmutableSet(sessions).size;
    const line: ICommitLine = {
        ...run.line,
        commits,
        head,
        session: null,
        sessionsOpened: toCount(opened),
    };
    const noEntries = List<RunLogEntry>();
    const cache = rebuildRunCache(line, noEntries);
    const root = rootAt(run, place);
    return { script: run.script, history: run.history, line, root, cache };
}

/** The changes a config change made by hand made, from its log entry, to make again. */
function changesOf(commit: ICommit): List<ParameterChange> {
    const entry = commit.entries.find((each) => each.kind === TechnicalLogKind.ConfigChanged);
    if (entry?.kind !== TechnicalLogKind.ConfigChanged) {
        return List();
    }
    return entry.data.changes.map((changed) =>
        ParameterChange.create({
            ruleId: changed.ruleId,
            parameterId: changed.parameterId,
            value: changed.after,
        }),
    );
}

/**
 * The repeat one step on: the original's next commit again if it was a config change or an
 * indirect effect made by hand, which no script holds, or else the next work due.
 */
function stepOn(original: IRunState, repeat: IRunState): IRunState {
    const next = toPosition(repeat.cache.commitIds.size + 1);
    const commit = commitAt(original, next);
    if (commit === null) {
        return runNextWork(repeat);
    }
    const { effect, indirect } = commit;
    if (effect?.kind === EffectKind.ConfigChange && !effect.isScripted) {
        const changes = changesOf(commit);
        return changeConfig(repeat, commit.at, changes);
    }
    if (indirect !== null && !indirect.isScripted) {
        return stateIndirectEffect(repeat, commit.at, indirect);
    }
    return runNextWork(repeat);
}

/** How far a repeat has got. */
interface IRepeating {
    readonly run: IRunState;
    readonly failure: string | null;
}

function entriesEqual(first: List<RunLogEntry>, second: List<RunLogEntry>): boolean {
    return (
        first.size === second.size &&
        first.every((entry, index) => {
            const other = second.get(index);
            return other !== undefined && runLogEntriesEqual(entry, other);
        })
    );
}

/** Whether two commits came out the same: their ID, kind, time, group, and log entries. */
function commitsEqual(first: ICommit, second: ICommit): boolean {
    return (
        first.id === second.id &&
        first.kind === second.kind &&
        first.at.equals(second.at) &&
        first.session === second.session &&
        entriesEqual(first.entries, second.entries)
    );
}

/** The first place from `from` to `to` whose commits differ, or null. */
function firstDifference(
    original: IRunState,
    repeat: IRunState,
    from: Position,
    to: Position,
): Position | null {
    const places = Range(from + 1, to + 1);
    const differs = places.find((place) => {
        const at = toPosition(place);
        const mine = commitAt(original, at);
        const theirs = repeat.cache.commitIds.size >= place ? commitAt(repeat, at) : null;
        return mine === null || theirs === null || !commitsEqual(mine, theirs);
    });
    return differs === undefined ? null : toPosition(differs);
}

/**
 * Repeats a run from a place, up to its latest commit, and compares each commit the repeat makes
 * with the one the run made. A repeat starts between job runs and API calls, so a place inside
 * one starts from the nearest place before it. Config changes and indirect effects made by hand
 * are made again at their commit, as no script holds them (FND-86, FND-89).
 */
export function repeatFrom(run: IRunState, place: Position): IRepeatResult {
    const from = groupStartAtOrBefore(run, place);
    const to = latestPlace(run);
    const start = cutBackTo(run, from);
    // Each step makes at least one commit, so this many steps always reach the latest place.
    const steps = Range(0, to - from);
    const repeated = steps.reduce<IRepeating>(
        (done, _step) => {
            if (done.failure !== null || done.run.cache.commitIds.size >= to) {
                return done;
            }
            try {
                const stepped = stepOn(run, done.run);
                return { run: stepped, failure: null };
            } catch (error) {
                const failure = error instanceof Error ? error.message : String(error);
                return { run: done.run, failure };
            }
        },
        { run: start, failure: null },
    );
    const made = repeated.run.cache.commitIds.size - from;
    const differsAt = firstDifference(run, repeated.run, from, to);
    const madeAtLeastNone = Math.max(made, 0);
    return {
        from,
        to,
        compared: toCount(madeAtLeastNone),
        differsAt,
        failure: repeated.failure,
    };
}
