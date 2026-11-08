import type { List } from 'immutable';

import type { RunLogEntry } from './run-log-entry';
import { orderOf } from './run-log-entry-order';

/**
 * A breakpoint: the run pauses after the job run or API call that writes an event of its kind,
 * narrowed if wanted to one source module or one order (FND-88). It can be switched off without
 * being removed. Breakpoints belong to the person watching, and are not saved with the run.
 */
export interface IBreakpoint {
    /** Unique among a run's breakpoints, and the same while it exists. */
    readonly id: number;
    /** The event kind it matches, such as OrderPickedUp or CommandRefused. */
    readonly kind: string;
    /** The source module it is narrowed to, such as orders, or null for any. */
    readonly source: string | null;
    /** The order it is narrowed to, such as order-1, or null for any. */
    readonly order: string | null;
    readonly isOn: boolean;
}

/** A breakpoint the run reached, and the event that reached it. */
export interface IBreakpointHit {
    readonly breakpoint: IBreakpoint;
    readonly entry: RunLogEntry;
}

/** Whether an entry matches a breakpoint that is on. */
function matches(
    breakpoint: IBreakpoint,
    entry: RunLogEntry,
    entries: List<RunLogEntry>,
): boolean {
    if (!breakpoint.isOn || entry.kind !== breakpoint.kind) {
        return false;
    }
    if (breakpoint.source !== null && entry.source !== breakpoint.source) {
        return false;
    }
    return breakpoint.order === null || orderOf(entry, entries) === breakpoint.order;
}

/**
 * The first breakpoint the entries a piece of work wrote reach, in the order they were written,
 * or null. `entries` is the whole log, so an entry's order can be found from what caused it.
 */
export function breakpointHit(
    breakpoints: readonly IBreakpoint[],
    written: List<RunLogEntry>,
    entries: List<RunLogEntry>,
): IBreakpointHit | null {
    const isAnyOn = breakpoints.some((breakpoint) => breakpoint.isOn);
    if (!isAnyOn) {
        return null;
    }
    const hits = written.toArray().flatMap((entry) => {
        const breakpoint = breakpoints.find((candidate) => matches(candidate, entry, entries));
        return breakpoint === undefined ? [] : [{ breakpoint, entry }];
    });
    return hits[0] ?? null;
}
