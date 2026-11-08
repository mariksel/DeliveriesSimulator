import type { LogSequence } from './numbers';
import type { IInstant } from '../system/time/instant';

/**
 * What a writer logs: the module that recorded it, what kind of entry it is, and its data. Each
 * kind has its own typed data, which the module that writes it defines.
 */
export interface ILogRecord {
    /** The module that recorded it. */
    readonly source: string;
    readonly kind: string;
    readonly data: unknown;
}

/** Where an entry sits in a run's record, which the log works out as it is written. */
export interface ILogPosition {
    /** Its position in the log, from 0. */
    readonly sequence: LogSequence;
    /** Simulated time, in whole milliseconds. It never decreases along the log. */
    readonly at: IInstant;
    /** The sequence number of the entry that directly caused this one, or null. */
    readonly causedBy: LogSequence | null;
    /**
     * The sequence number of the entry that began this chain of causes: its own, if nothing caused
     * it.
     */
    readonly trace: LogSequence;
}

/** One entry of a run's record: a logged record at its place. It never changes once written. */
export type LogEntry<TRecord extends ILogRecord = ILogRecord> = TRecord & ILogPosition;
