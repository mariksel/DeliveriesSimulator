import type { List } from 'immutable';

import type { RunLogEntry } from '../../application-core/simulation-engine/run-log-entry';
import { LogSource, TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import { formatClockTime } from '../../domain/simulation-engine/clock-time';
import { eventKindOf, idOf } from './event-views';
import { formatWait } from './inspector-views';

/** The diagram's lanes, left to right. */
export const TRACE_LANES: readonly string[] = [
    'Actor',
    'Orders',
    'Orders outbox and inbox',
    'Deliveries outbox and inbox',
    'Deliveries',
];

const ACTOR_LANE = 0;
const ORDERS_LANE = 1;
const ORDERS_BOXES_LANE = 2;
const DELIVERIES_BOXES_LANE = 3;
const DELIVERIES_LANE = 4;

/** The height of one step, which the stylesheet also sets. */
export const TRACE_ROW_PX = 28;
/** The width of one lane, which the stylesheet also sets, as five of these. */
export const TRACE_LANE_PX = 68;

/** How far an arrow stops short of the centre of its step's dot. */
const HEAD_GAP_PX = 7;
const HALF = 0.5;

/** How a step's arrow from its cause looks. */
export const TraceArrow = {
    None: 'None',
    Solid: 'Solid',
    /** From an outbox write to the inbox read that picks it up, which happens later. */
    Dashed: 'Dashed',
} as const;

/** One of the values of {@link TraceArrow}. */
export type TraceArrow = (typeof TraceArrow)[keyof typeof TraceArrow];

/** One step of a trace, as the diagram shows it. */
export interface ITraceStep {
    readonly sequence: number;
    readonly time: string;
    /** How long after the step before it, when any time passed. */
    readonly gap: string | null;
    readonly label: string;
    /** The entry's full ID, if it has one, and its label, which a narrow row may cut short. */
    readonly hover: string;
    readonly lane: number;
    /** The row and lane of what caused it, if anything in this trace did. */
    readonly cause: { readonly row: number; readonly lane: number } | null;
    readonly arrow: TraceArrow;
    /** It is the selected entry, or one of its causes or effects. */
    readonly isOnPath: boolean;
    /** Its arrow joins two steps on the path. */
    readonly isArrowOnPath: boolean;
    readonly isSelected: boolean;
    /** An outbox write nothing has read yet. */
    readonly isWaiting: boolean;
}

/** The whole action that the selected entry belongs to. */
export interface ITraceView {
    /** The sequence number of the entry that began it. */
    readonly root: number;
    readonly steps: readonly ITraceStep[];
}

/** One straight line of an arrow, in pixels within the lanes. */
export interface ITraceLine {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
    readonly isDashed: boolean;
    readonly isOnPath: boolean;
    readonly hasHead: boolean;
}

/** Actors and the simulation engine act from outside the service, so they share a lane. */
function laneOf(entry: RunLogEntry): number {
    if (entry.source === LogSource.Actors || entry.source === LogSource.SimulationEngine) {
        return ACTOR_LANE;
    }
    const isOrders = entry.source === LogSource.Orders;
    if (
        entry.kind === TechnicalLogKind.OutboxEventWritten ||
        entry.kind === TechnicalLogKind.InboxEventRead
    ) {
        return isOrders ? ORDERS_BOXES_LANE : DELIVERIES_BOXES_LANE;
    }
    return isOrders ? ORDERS_LANE : DELIVERIES_LANE;
}

function labelOf(entry: RunLogEntry, cause: RunLogEntry | undefined): string {
    if (entry.kind === TechnicalLogKind.CommandIssued) {
        return `Command: ${entry.data.name}`;
    }
    if (entry.kind === TechnicalLogKind.CommandRefused) {
        return `Refused: ${entry.data.name}`;
    }
    if (entry.kind === TechnicalLogKind.OutboxEventWritten) {
        return `Written: ${entry.data.kind}`;
    }
    if (entry.kind === TechnicalLogKind.InboxEventRead) {
        const readKind = cause === undefined ? null : eventKindOf(cause);
        return `Read: ${readKind ?? ''}`;
    }
    return entry.kind;
}

const causeOf = (entry: RunLogEntry, entries: List<RunLogEntry>): RunLogEntry | undefined =>
    entry.causedBy === null ? undefined : entries.get(entry.causedBy);

function hoverOf(entry: RunLogEntry, label: string): string {
    const id = idOf(entry);
    return id === null ? label : `${id}: ${label}`;
}

function causesOf(entry: RunLogEntry, entries: List<RunLogEntry>): readonly number[] {
    const cause = causeOf(entry, entries);
    return cause === undefined ? [] : [cause.sequence, ...causesOf(cause, entries)];
}

/** The selected entry, its causes, and everything that followed from it. */
function pathThrough(
    chosen: RunLogEntry,
    steps: readonly RunLogEntry[],
    entries: List<RunLogEntry>,
): ReadonlySet<number> {
    const initialValue = new Set([chosen.sequence]);
    const effects = steps.reduce<ReadonlySet<number>>(
        (path, entry) =>
            entry.causedBy !== null && path.has(entry.causedBy)
                ? new Set([...path, entry.sequence])
                : path,
        initialValue,
    );
    return new Set([...effects, ...causesOf(chosen, entries)]);
}

function gapBetween(previous: RunLogEntry | undefined, entry: RunLogEntry): string | null {
    if (previous === undefined || previous.at.equals(entry.at)) {
        return null;
    }
    const wait = entry.at.since(previous.at);
    return `+${formatWait(wait.milliseconds)}`;
}

function arrowOf(entry: RunLogEntry, cause: RunLogEntry | undefined): TraceArrow {
    if (cause === undefined) {
        return TraceArrow.None;
    }
    const isThroughBoxes =
        entry.kind === TechnicalLogKind.InboxEventRead &&
        cause.kind === TechnicalLogKind.OutboxEventWritten;
    return isThroughBoxes ? TraceArrow.Dashed : TraceArrow.Solid;
}

/** The trace of the selected entry, or null when nothing is selected. */
export function traceOf(entries: List<RunLogEntry>, selected: number | null): ITraceView | null {
    const chosen = selected === null ? undefined : entries.get(selected);
    if (chosen === undefined) {
        return null;
    }
    // An entry's position in the log is its sequence number, so nothing in this trace comes before
    // its start.
    const inTrace = entries
        .slice(chosen.trace)
        .filter((entry) => entry.trace === chosen.trace)
        .toArray();
    const path = pathThrough(chosen, inTrace, entries);
    const rowOfEach = inTrace.map((entry, row): [number, number] => [entry.sequence, row]);
    const rows = new Map(rowOfEach);
    const readCauses = inTrace
        .filter((entry) => entry.kind === TechnicalLogKind.InboxEventRead)
        .map((entry) => entry.causedBy);
    const read = new Set(readCauses);
    return {
        root: chosen.trace,
        steps: inTrace.map((entry, row) => {
            const cause = causeOf(entry, entries);
            const causeRow = cause === undefined ? undefined : rows.get(cause.sequence);
            const label = labelOf(entry, cause);
            return {
                sequence: entry.sequence,
                time: formatClockTime(entry.at.sinceStart.milliseconds),
                gap: gapBetween(inTrace[row - 1], entry),
                label: labelOf(entry, cause),
                hover: hoverOf(entry, label),
                lane: laneOf(entry),
                cause:
                    cause === undefined || causeRow === undefined
                        ? null
                        : { row: causeRow, lane: laneOf(cause) },
                arrow: arrowOf(entry, cause),
                isOnPath: path.has(entry.sequence),
                isArrowOnPath:
                    path.has(entry.sequence) && cause !== undefined && path.has(cause.sequence),
                isSelected: entry.sequence === chosen.sequence,
                isWaiting:
                    entry.kind === TechnicalLogKind.OutboxEventWritten &&
                    !read.has(entry.sequence),
            };
        }),
    };
}

/** Where the centre of a lane is. */
export const laneX = (lane: number): number => (lane + HALF) * TRACE_LANE_PX;

/** Where the centre of a row is. */
export const rowY = (row: number): number => (row + HALF) * TRACE_ROW_PX;

function arrowLines(step: ITraceStep, row: number): readonly ITraceLine[] {
    const { cause } = step;
    if (cause === null) {
        return [];
    }
    const shared = { isDashed: step.arrow === TraceArrow.Dashed, isOnPath: step.isArrowOnPath };
    const fromX = laneX(cause.lane);
    const toY = rowY(row);
    if (cause.lane === step.lane) {
        const y2 = toY - HEAD_GAP_PX;
        return [{ ...shared, x1: fromX, y1: rowY(cause.row), x2: fromX, y2, hasHead: true }];
    }
    const toX = laneX(step.lane);
    const x2 = toX - Math.sign(toX - fromX) * HEAD_GAP_PX;
    return [
        { ...shared, x1: fromX, y1: rowY(cause.row), x2: fromX, y2: toY, hasHead: false },
        { ...shared, x1: fromX, y1: toY, x2, y2: toY, hasHead: true },
    ];
}

/** A write still waiting points towards the other module's inbox, and stops short of it. */
function waitingLine(step: ITraceStep, row: number): readonly ITraceLine[] {
    if (!step.isWaiting) {
        return [];
    }
    const direction = step.lane === ORDERS_BOXES_LANE ? 1 : -1;
    const x1 = laneX(step.lane);
    const y = rowY(row);
    return [
        {
            x1,
            y1: y,
            x2: x1 + (direction * TRACE_LANE_PX) / 2,
            y2: y,
            isDashed: true,
            isOnPath: false,
            hasHead: false,
        },
    ];
}

/** The lines of a trace's arrows. Those on the path come last, so they are drawn on top. */
export function traceLines(steps: readonly ITraceStep[]): readonly ITraceLine[] {
    const lines = steps.flatMap((step, row) => [
        ...arrowLines(step, row),
        ...waitingLine(step, row),
    ]);
    return [...lines.filter((line) => !line.isOnPath), ...lines.filter((line) => line.isOnPath)];
}
