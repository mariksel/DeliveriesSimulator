import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { appendEntry } from '../../domain/event-log/event-log';
import type {
    RunLogEntry,
    RunLogRecord,
} from '../../application-core/simulation-engine/run-log-entry';
import type { ITraceStep } from './trace-views';
import { laneX, rowY, TraceArrow, traceLines, traceOf } from './trace-views';
import { toLogSequence } from '../../domain/event-log/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';

/** An entry built loosely, as these tests do not care about every field of its data. */
interface ILooseEntry {
    readonly at: number;
    readonly source: string;
    readonly kind: string;
    readonly data: unknown;
    readonly causedBy?: number | undefined;
}

/** Logs a loosely built entry as a run's typed entry. */
function looseAppend(log: List<RunLogEntry>, entry: ILooseEntry): List<RunLogEntry> {
    const at = toSimTime(entry.at);
    const causedBy = entry.causedBy === undefined ? undefined : toLogSequence(entry.causedBy);
    return appendEntry(
        log,
        at,
        { source: entry.source, kind: entry.kind, data: entry.data } as RunLogRecord,
        causedBy,
    );
}

function logOf(...entries: ILooseEntry[]): List<RunLogEntry> {
    const logEntries = List<RunLogEntry>();
    return entries.reduce<List<RunLogEntry>>((log, entry) => looseAppend(log, entry), logEntries);
}

const entry = (
    at: number,
    source: string,
    kind: string,
    data: object,
    causedBy?: number,
): ILooseEntry => ({
    at,
    source,
    kind,
    data,
    causedBy,
});

/**
 * One action, with a direct call between the modules and an outbox event each way, and another
 * action after it.
 */
const FIRST_ENTRY = entry(0, 'actors', 'CommandIssued', { name: 'request' });
const SECOND_ENTRY = entry(0, 'orders', 'OrderDeliveryRequest', { event: { id: 'order-1:2' } }, 0);
const THIRD_ENTRY = entry(0, 'deliveries', 'OrderDeliveryRequest', { id: 'delivery-1:1' }, 1);
const FOURTH_ENTRY = entry(
    0,
    'orders',
    'OutboxEventWritten',
    { id: 'orders-outbox-1', kind: 'OrderDeliveryRequest' },
    1,
);
const FIFTH_ENTRY = entry(
    0,
    'deliveries',
    'OutboxEventWritten',
    { id: 'deliveries-outbox-1', kind: 'OrderDeliveryRequest' },
    2,
);
const SIXTH_ENTRY = entry(
    3000,
    'deliveries',
    'InboxEventRead',
    { outboxEventId: 'orders-outbox-1' },
    3,
);
const SEVENTH_ENTRY = entry(9000, 'actors', 'CommandIssued', { name: 'ready' });
const EIGHTH_ENTRY = entry(9000, 'actors', 'CommandRefused', { name: 'ready', refusal: 'no' }, 6);
const LOG = logOf(
    FIRST_ENTRY, // 0
    SECOND_ENTRY, // 1
    THIRD_ENTRY, // 2
    FOURTH_ENTRY, // 3
    FIFTH_ENTRY, // 4
    SIXTH_ENTRY, // 5
    SEVENTH_ENTRY, // 6
    EIGHTH_ENTRY, // 7
);

const stepsFor = (selected: number): readonly ITraceStep[] => traceOf(LOG, selected)!.steps;
const stepOf = (selected: number, sequence: number): ITraceStep =>
    stepsFor(selected).find((step) => step.sequence === sequence)!;

describe('which steps a trace has', () => {
    it('has nothing when nothing is selected', () => {
        const trace = traceOf(LOG, null);
        expect(trace).toBeNull();
    });

    it('has nothing for an entry the log does not have', () => {
        const trace = traceOf(LOG, 99);
        expect(trace).toBeNull();
    });

    it('has every step of the action, in order, from any step in it', () => {
        const secondStepsFor = stepsFor(5).map((step) => step.sequence);
        expect(secondStepsFor).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('leaves out other actions', () => {
        const secondStepsFor = stepsFor(6).map((step) => step.sequence);
        expect(secondStepsFor).toEqual([6, 7]);
    });

    it('says which entry began it', () => {
        expect(traceOf(LOG, 5)?.root).toBe(0);
    });
});

describe('the path through the selected entry', () => {
    it('has its causes and its effects, and not what ran alongside', () => {
        const onPath = stepsFor(3)
            .filter((step) => step.isOnPath)
            .map((step) => step.sequence);

        expect(onPath).toEqual([0, 1, 3, 5]);
    });

    it('marks only the selected entry as selected', () => {
        const selected = stepsFor(3)
            .filter((step) => step.isSelected)
            .map((step) => step.sequence);

        expect(selected).toEqual([3]);
    });

    it('marks an arrow only when both its ends are on the path', () => {
        expect(stepOf(3, 3).isArrowOnPath).toBe(true);
        expect(stepOf(3, 2).isArrowOnPath).toBe(false);
        expect(stepOf(3, 0).isArrowOnPath).toBe(false);
    });
});

describe('what each step shows', () => {
    it.each<[number, string]>([
        [0, 'Command: request'],
        [1, 'OrderDeliveryRequest'],
        [3, 'Written: OrderDeliveryRequest'],
        [5, 'Read: OrderDeliveryRequest'],
    ])('labels entry %s as %s', (sequence, label) => {
        expect(stepOf(0, sequence).label).toBe(label);
    });

    it('labels a refused command', () => {
        expect(stepOf(6, 7).label).toBe('Refused: ready');
    });

    it('puts a config change in the actors lane, as it comes from outside the service', () => {
        const changed = entry(0, 'simulation-engine', 'ConfigChanged', { before: {}, after: {} });
        const log = logOf(changed);

        const trace = traceOf(log, 0);

        expect(trace?.steps[0]?.lane).toBe(0);
    });

    it.each<[number, string]>([
        [3, 'orders-outbox-1: Written: OrderDeliveryRequest'],
        [5, 'orders-outbox-1: Read: OrderDeliveryRequest'],
        [0, 'Command: request'],
    ])('shows entry %s in full on hover as %s', (sequence, hover) => {
        expect(stepOf(0, sequence).hover).toBe(hover);
    });

    it.each<[number, number]>([
        [0, 0],
        [1, 1],
        [3, 2],
        [4, 3],
        [5, 3],
        [2, 4],
    ])('puts entry %s in lane %s', (sequence, lane) => {
        expect(stepOf(0, sequence).lane).toBe(lane);
    });

    it('marks the time that passed since the step before', () => {
        expect(stepOf(0, 5).gap).toBe('+3 s');
    });

    it('marks no gap at the same moment, or for the first step', () => {
        expect(stepOf(0, 1).gap).toBeNull();
        expect(stepOf(0, 0).gap).toBeNull();
    });

    it('marks an outbox write nothing has read as waiting', () => {
        expect(stepOf(0, 4).isWaiting).toBe(true);
    });

    it('does not mark one that has been read', () => {
        expect(stepOf(0, 3).isWaiting).toBe(false);
    });

    it.each<[number, TraceArrow]>([
        [0, TraceArrow.None],
        [1, TraceArrow.Solid],
        [2, TraceArrow.Solid],
        [3, TraceArrow.Solid],
        [5, TraceArrow.Dashed],
    ])('gives entry %s a %s arrow', (sequence, arrow) => {
        expect(stepOf(0, sequence).arrow).toBe(arrow);
    });
});

describe('the lines of the arrows', () => {
    const steps = stepsFor(3);
    const lines = traceLines(steps);

    it('goes down from the cause, then across to the step, with one head', () => {
        const toOrders = lines.filter((line) => line.x1 === laneX(0));

        const secondToOrders = toOrders.map((line) => line.hasHead);
        expect(secondToOrders).toEqual([false, true]);
        expect(toOrders[0]).toMatchObject({ y1: rowY(0), y2: rowY(1), x2: laneX(0) });
        expect(toOrders[1]).toMatchObject({ y1: rowY(1), y2: rowY(1) });
    });

    it('stops an arrow short of its dot, whichever way it points', () => {
        const rightwards = lines.find((line) => line.hasHead && line.x1 === laneX(0))!;

        const num = laneX(1);
        expect(rightwards.x2).toBeLessThan(num);
    });

    it('draws those on the path last', () => {
        const onPath = lines.map((line) => line.isOnPath);

        const index = onPath.indexOf(true);
        const num = onPath.lastIndexOf(false);
        expect(index).toBeGreaterThan(num);
    });

    it('dashes the arrow from an outbox write to its read', () => {
        const dashed = lines.filter((line) => line.isDashed && line.isOnPath);

        expect(dashed).toHaveLength(2);
    });

    it('points a waiting write towards the other module, and stops short', () => {
        const fromDeliveries = lines.find(
            (line) => line.isDashed && line.x1 === laneX(3) && line.y1 === rowY(4),
        )!;

        const num = laneX(3);
        expect(fromDeliveries.x2).toBeLessThan(num);
        const secondLaneX = laneX(2);
        expect(fromDeliveries.x2).toBeGreaterThan(secondLaneX);
    });

    it('points a waiting write from orders the other way', () => {
        const written = entry(0, 'orders', 'OutboxEventWritten', {
            id: 'o',
            kind: 'OrderReady',
        });
        const log = logOf(written);

        const [line] = traceLines(traceOf(log, 0)!.steps);

        expect(line!.x2).toBeGreaterThan(line!.x1);
    });

    it('goes straight down within a lane', () => {
        const ready = entry(0, 'orders', 'OrderReady', { event: {} });
        const readyAgain = entry(0, 'orders', 'OrderReady', { event: {} }, 0);
        const log = logOf(ready, readyAgain);

        const [line] = traceLines(traceOf(log, 0)!.steps);

        expect(line).toMatchObject({ x1: laneX(1), x2: laneX(1), hasHead: true });
        const num = rowY(1);
        expect(line!.y2).toBeLessThan(num);
    });
});
