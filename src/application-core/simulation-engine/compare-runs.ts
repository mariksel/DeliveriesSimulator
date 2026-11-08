import type { List } from 'immutable';
import { Range } from 'immutable';

import type { RunLogEntry } from './run-log-entry';
import { runLogEntriesEqual } from './run-log-entry-digest';
import type { LogSequence } from '../../domain/event-log/numbers';
import { toLogSequence } from '../../domain/event-log/numbers';

/** Where two runs first differ, and what each had there. */
export interface IRunDifference {
    /** Where the two runs first differ. */
    readonly sequence: LogSequence;
    /** Each run's entry there, or null when that run had already ended. */
    readonly first: RunLogEntry | null;
    readonly second: RunLogEntry | null;
}

const entryOf = (log: List<RunLogEntry>, sequence: LogSequence): RunLogEntry | null =>
    log.get(sequence) ?? null;

/** Whether two runs hold the same entry at a place, or have both ended by it. */
function isSameAt(
    first: List<RunLogEntry>,
    second: List<RunLogEntry>,
    sequence: LogSequence,
): boolean {
    const entry = entryOf(first, sequence);
    const secondEntry = entryOf(second, sequence);
    if (entry === null || secondEntry === null) {
        return entry === secondEntry;
    }
    return runLogEntriesEqual(entry, secondEntry);
}

/** The first place two runs differ, or null when they match event for event. */
export function firstDifference(
    first: List<RunLogEntry>,
    second: List<RunLogEntry>,
): IRunDifference | null {
    const end = Math.max(first.size, second.size);
    const sequences = Range(0, end).map(toLogSequence);
    const sequence = sequences.find((index) => !isSameAt(first, second, index));
    return sequence === undefined
        ? null
        : { sequence, first: entryOf(first, sequence), second: entryOf(second, sequence) };
}
