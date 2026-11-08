import type { List } from 'immutable';
import { Range } from 'immutable';

import type { LogSequence } from '../../domain/event-log/numbers';
import type { Position } from '../../domain/system/math/math';
import { toPosition } from '../../domain/system/math/math';
import { required } from '../../domain/system/validation/required';
import type { ICommit } from './commit';
import type { IMainRoot } from './main-root';
import type { RunLogEntry } from './run-log-entry';
import type { IRunState } from './run-state';

/**
 * A place in a run's history is how many of its commits are shown: 0 is the start, before any
 * commit, and the latest place shows every commit. Going to a place takes the commit's root and
 * the log up to it, with nothing recalculated (FND-81, FND-86).
 */

/** The latest place: every commit. */
export const latestPlace = (run: IRunState): Position => toPosition(run.cache.commitIds.size);

/** Moves a place within the run's places, from the start to the latest. */
export function placeWithin(run: IRunState, place: number): Position {
    const latest = latestPlace(run);
    const whole = Math.round(place);
    const atLeastStart = Math.max(whole, 0);
    const within = Math.min(atLeastStart, latest);
    return toPosition(within);
}

/** The commit a place shows, or null at the start. */
export function commitAt(run: IRunState, place: Position): ICommit | null {
    if (place === 0) {
        return null;
    }
    const found = run.cache.commitIds.get(place - 1);
    const id = required(found, `the commit at place ${place}`);
    const commit = run.line.commits.get(id);
    return required(commit, `commit ${id}`);
}

/** The main root a place shows. */
export function rootAt(run: IRunState, place: Position): IMainRoot {
    const commit = commitAt(run, place);
    return commit === null ? run.line.start : commit.root;
}

/**
 * The log as it stood at a place. At the latest place it is the whole log, the entries written
 * since the latest commit included.
 */
export function logAt(run: IRunState, place: Position): List<RunLogEntry> {
    const { entries } = run.cache.log;
    if (place === latestPlace(run)) {
        return entries;
    }
    if (place === 0) {
        return entries.clear();
    }
    const found = run.cache.entriesUpTo.get(place - 1);
    const count = required(found, 'a count');
    return entries.slice(0, count);
}

/** The first index from `low` to `high` whose count reaches past a sequence, found by halving. */
function firstReaching(
    counts: List<number>,
    sequence: LogSequence,
    low: number,
    high: number,
): number {
    if (low >= high) {
        return low;
    }
    const middle = Math.floor((low + high) / 2);
    const found = counts.get(middle);
    const count = required(found, 'a count');
    return count > sequence
        ? firstReaching(counts, sequence, low, middle)
        : firstReaching(counts, sequence, middle + 1, high);
}

/** The place whose commit wrote a log entry: the first place at which the log holds it. */
export function placeOfEntry(run: IRunState, sequence: LogSequence): Position {
    const counts = run.cache.entriesUpTo;
    const index = firstReaching(counts, sequence, 0, counts.size);
    return index === counts.size ? latestPlace(run) : toPosition(index + 1);
}

/**
 * Whether a place is between job runs and API calls: at the start, at the latest, or after a
 * commit that ends its job run or API call, or that belongs to none.
 */
export function isBetweenGroups(run: IRunState, place: Position): boolean {
    const commit = commitAt(run, place);
    if (commit === null || commit.session === null || place === latestPlace(run)) {
        return true;
    }
    const after = toPosition(place + 1);
    const next = commitAt(run, after);
    return next?.session !== commit.session;
}

function isGroupEnd(run: IRunState, candidate: number): boolean {
    const place = toPosition(candidate);
    return isBetweenGroups(run, place);
}

/** The nearest place between groups before a place, or the start. */
export function previousGroupPlace(run: IRunState, place: Position): Position {
    if (place === 0) {
        return place;
    }
    const before = Range(place - 1, 0, -1);
    const found = before.find((candidate) => isGroupEnd(run, candidate)) ?? 0;
    return toPosition(found);
}

/** The nearest place between groups after a place, or the latest. */
export function nextGroupPlace(run: IRunState, place: Position): Position {
    const latest = latestPlace(run);
    if (place >= latest) {
        return latest;
    }
    const after = Range(place + 1, latest);
    const found = after.find((candidate) => isGroupEnd(run, candidate)) ?? latest;
    const within = Math.min(found, latest);
    return toPosition(within);
}

/** The nearest place between groups at or before a place, where a repeat can start from. */
export function groupStartAtOrBefore(run: IRunState, place: Position): Position {
    return isBetweenGroups(run, place) ? place : previousGroupPlace(run, place);
}

/** How far a step Back or Forward moves (FND-86). */
export const StepSize = {
    /** One commit. */
    Commit: 'Commit',
    /** One job run or API call, with the commits made in it. */
    Group: 'Group',
} as const;

/** One of the values of {@link StepSize}. */
export type StepSize = (typeof StepSize)[keyof typeof StepSize];

/** The place one step before a place. */
export function placeBefore(run: IRunState, place: Position, size: StepSize): Position {
    if (size === StepSize.Group) {
        return previousGroupPlace(run, place);
    }
    const before = place - 1;
    return placeWithin(run, before);
}

/** The place one step after a place. */
export function placeAfter(run: IRunState, place: Position, size: StepSize): Position {
    if (size === StepSize.Group) {
        return nextGroupPlace(run, place);
    }
    const after = place + 1;
    return placeWithin(run, after);
}
