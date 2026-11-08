import type { List } from 'immutable';

import type { LogEntry } from '../../domain/event-log/log-entry';
import { LogSource } from '../../domain/event-log/log-vocabulary';
import { toDeliveryEventId } from '../../domain/drivers/deliveries/delivery-event-id';
import { toDriverId } from '../../domain/drivers/driver';
import { toOrderEventId } from '../../domain/orders/order-event-id';
import { required } from '../../domain/system/validation/required';
import type { IRunCheck } from '../../domain/verification/check-run';
import { Criterion } from '../../domain/verification/criterion';
import type {
    IDeliveriesEventLogRecord,
    IOrdersEventLogRecord,
    IOrdersOutboxLogRecord,
    InboxReadEntry,
    ModuleEventEntry,
    RunLogEntry,
} from '../../application-core/simulation-engine/run-log-entry';
import {
    eventRecordOf,
    isInboxRead,
    isModuleEvent,
    isOutboxEntry,
} from '../../application-core/simulation-engine/run-log-entry';
import {
    forgedDeliveriesEvent,
    forgedOrdersOutboxEvent,
} from '../../application-core/simulation-engine/forged-entries';
import { checkRun } from '../../application-core/verification/check-run';
import { runScenario } from '../scenarios/scenario-runner';
import { SELF_TEST_CASE } from '../scenarios/self-test-case';
import { toLogSequence } from '../../domain/event-log/numbers';
import { toVersionNumber } from '../../domain/system/records/version-chain';
import { toOrdersOutboxEventId } from '../../domain/orders/orders-outbox-event';
import { toDeliveriesOutboxEventId } from '../../domain/drivers/deliveries/deliveries-outbox-event';

const DELIVERED = 'OrderDelivered';
const ORDERS = LogSource.Orders;
const DELIVERIES = LogSource.Deliveries;

/**
 * What one self-test found: a criterion it set out to break, and whether the checker reported
 * that.
 */
export interface ISelfTestResult {
    readonly criterion: Criterion;
    readonly name: string;
    readonly isReported: boolean;
}

/**
 * How the self-tests came out. The checker can be trusted when a good run passes and each break is
 * reported.
 */
export interface ISelfTestReport {
    readonly isKnownGoodRunPassing: boolean;
    readonly results: readonly ISelfTestResult[];
    readonly isPassed: boolean;
}

type Breaking = (entries: List<RunLogEntry>) => List<RunLogEntry>;

interface ISelfTest {
    readonly criterion: Criterion;
    readonly name: string;
    readonly breakIt: Breaking;
}

type ModuleSource = typeof ORDERS | typeof DELIVERIES;
type OrdersEventEntry = LogEntry<IOrdersEventLogRecord>;
type DeliveriesEventEntry = LogEntry<IDeliveriesEventLogRecord>;
type OrdersOutboxEntry = LogEntry<IOrdersOutboxLogRecord>;

const isOrdersEvent = (entry: RunLogEntry): entry is OrdersEventEntry =>
    isModuleEvent(entry) && entry.source === ORDERS;

const isDeliveriesEvent = (entry: RunLogEntry): entry is DeliveriesEventEntry =>
    isModuleEvent(entry) && entry.source === DELIVERIES;

const isOrdersOutbox = (entry: RunLogEntry): entry is OrdersOutboxEntry =>
    isOutboxEntry(entry) && entry.source === ORDERS;

/** The latest entry a test looks for, which the known good run always has. */
function latest<TEntry extends RunLogEntry>(
    entries: List<RunLogEntry>,
    isWanted: (entry: RunLogEntry) => entry is TEntry,
    what: string,
): TEntry {
    const found = entries.filter(isWanted).last();
    return required(found, what);
}

const delivered = (entry: RunLogEntry): boolean => entry.kind === DELIVERED;

const latestOrdersDelivered = (entries: List<RunLogEntry>): OrdersEventEntry =>
    latest(
        entries,
        (entry): entry is OrdersEventEntry => isOrdersEvent(entry) && delivered(entry),
        'a delivered event in orders',
    );

const latestDeliveriesDelivered = (entries: List<RunLogEntry>): DeliveriesEventEntry =>
    latest(
        entries,
        (entry): entry is DeliveriesEventEntry => isDeliveriesEvent(entry) && delivered(entry),
        'a delivered event in deliveries',
    );

const latestRead = (entries: List<RunLogEntry>, source: ModuleSource): InboxReadEntry =>
    latest(
        entries,
        (entry): entry is InboxReadEntry => isInboxRead(entry) && entry.source === source,
        `an inbox read in ${source}`,
    );

const latestOrdersOutbox = (entries: List<RunLogEntry>): OrdersOutboxEntry =>
    latest(entries, isOrdersOutbox, 'an outbox event in orders');

/** The log with one entry replaced. */
const replaced = (
    entries: List<RunLogEntry>,
    old: RunLogEntry,
    changed: RunLogEntry,
): List<RunLogEntry> => entries.map((entry) => (entry === old ? changed : entry));

/** The log with a copy of an entry added at its end. */
const appended = (entries: List<RunLogEntry>, entry: RunLogEntry): List<RunLogEntry> =>
    entries.push({ ...entry, sequence: toLogSequence(entries.size) });

/**
 * Removes an entry, and the entries that only make sense with it: its outbox event, and the
 * reading of that.
 */
function withoutEventAndWhatFollows(
    entries: List<RunLogEntry>,
    gone: ModuleEventEntry,
): List<RunLogEntry> {
    const outbox = entries
        .filter(isOutboxEntry)
        .find((entry) => entry.data.eventId === eventRecordOf(gone).id);
    const outboxId = outbox?.data.id;
    return entries.filter(
        (entry) =>
            entry !== gone &&
            entry !== outbox &&
            !(isInboxRead(entry) && entry.data.outboxEventId === outboxId),
    );
}

const SELF_TESTS: readonly ISelfTest[] = [
    {
        criterion: Criterion.ValidFinalState,
        name: 'an order that ends before it is delivered',
        breakIt: (entries): List<RunLogEntry> => {
            const last = latestOrdersDelivered(entries);
            return entries.filter((entry) => entry.sequence < last.sequence);
        },
    },
    {
        criterion: Criterion.ModulesAgree,
        name: 'an event that only one module has',
        breakIt: (entries): List<RunLogEntry> => {
            const gone = latestDeliveriesDelivered(entries);
            return withoutEventAndWhatFollows(entries, gone);
        },
    },
    {
        criterion: Criterion.ModulesAgree,
        name: 'modules that name different drivers',
        breakIt: (entries): List<RunLogEntry> => {
            const event = latestDeliveriesDelivered(entries);
            const driverId = toDriverId('someone-else');
            const data = forgedDeliveriesEvent(event.data, { driverId });
            return replaced(entries, event, { ...event, data });
        },
    },
    {
        criterion: Criterion.ModulesAgree,
        name: 'an outbox event left unread at the end',
        breakIt: (entries): List<RunLogEntry> => {
            const read = latestRead(entries, DELIVERIES);
            return entries.filter((entry) => entry !== read);
        },
    },
    {
        criterion: Criterion.ModulesAgree,
        name: "a copy of the order that is behind orders' own",
        breakIt: (entries): List<RunLogEntry> => {
            const last = latestOrdersOutbox(entries);
            // With its version lowered, the newest event deliveries read says the order is a
            // version behind.
            const orderVersion = toVersionNumber(last.data.orderVersion - 1);
            const data = forgedOrdersOutboxEvent(last.data, { orderVersion });
            return replaced(entries, last, { ...last, data });
        },
    },
    {
        criterion: Criterion.ExactlyOnceEffect,
        name: 'an outbox event read twice',
        breakIt: (entries): List<RunLogEntry> => {
            const read = latestRead(entries, DELIVERIES);
            return appended(entries, read);
        },
    },
    {
        criterion: Criterion.ExactlyOnceEffect,
        name: 'an outbox event never read',
        breakIt: (entries): List<RunLogEntry> => {
            const read = latestRead(entries, ORDERS);
            return entries.filter((entry) => entry !== read);
        },
    },
    {
        criterion: Criterion.ExactlyOnceEffect,
        name: 'a read of an event nobody wrote',
        breakIt: (entries): List<RunLogEntry> => {
            const read = latestRead(entries, ORDERS);
            const outboxEventId = toDeliveriesOutboxEventId('nobody-wrote-this');
            return appended(entries, { ...read, data: { outboxEventId } });
        },
    },
    {
        criterion: Criterion.ExactlyOnceEffect,
        name: 'an event taking effect twice',
        breakIt: (entries): List<RunLogEntry> => {
            const event = latestDeliveriesDelivered(entries);
            const id = toDeliveryEventId('a-second-effect');
            const data = forgedDeliveriesEvent(event.data, { id });
            return appended(entries, { ...event, data });
        },
    },
    {
        criterion: Criterion.ExactlyOnceEffect,
        name: 'an event recorded twice',
        breakIt: (entries): List<RunLogEntry> => {
            const event = latestOrdersDelivered(entries);
            return appended(entries, event);
        },
    },
    {
        criterion: Criterion.OutboxForEveryEvent,
        name: 'an event with no outbox event',
        breakIt: (entries): List<RunLogEntry> => {
            const event = latestOrdersDelivered(entries);
            return entries.filter(
                (entry) => !(isOrdersOutbox(entry) && entry.data.eventId === event.data.event.id),
            );
        },
    },
    {
        criterion: Criterion.OutboxForEveryEvent,
        name: 'an event with two outbox events',
        breakIt: (entries): List<RunLogEntry> => {
            const outbox = latestOrdersOutbox(entries);
            const id = toOrdersOutboxEventId('a-second-outbox-event');
            const data = forgedOrdersOutboxEvent(outbox.data, { id });
            return appended(entries, { ...outbox, data });
        },
    },
    {
        criterion: Criterion.OutboxForEveryEvent,
        name: 'an outbox event for an event nobody recorded',
        breakIt: (entries): List<RunLogEntry> => {
            const outbox = latestOrdersOutbox(entries);
            const eventId = toOrderEventId('nobody-recorded-this');
            const data = forgedOrdersOutboxEvent(outbox.data, { eventId });
            return appended(entries, { ...outbox, data });
        },
    },
];

function knownGoodLog(): List<RunLogEntry> {
    const result = runScenario(SELF_TEST_CASE);
    if (!result.isOk) {
        const messages = result.problems.map((problem) => problem.message).join('; ');
        throw new Error(`The self-tests' known case cannot run: ${messages}.`);
    }
    return result.run.entries;
}

/**
 * Proves each check can fail: breaks a known good run in each way, and sees whether the checker
 * reports it.
 */
export function runSelfTests(
    check: (entries: List<RunLogEntry>) => IRunCheck = checkRun,
): ISelfTestReport {
    const entries = knownGoodLog();
    const isKnownGoodRunPassing = check(entries).isPassed;
    const results = SELF_TESTS.map(({ criterion, name, breakIt }) => {
        const secondBreakIt = breakIt(entries);
        const broken = check(secondBreakIt);
        const found = broken.results.find((result) => result.criterion === criterion);
        return { criterion, name, isReported: found !== undefined && !found.violations.isEmpty() };
    });
    return {
        isKnownGoodRunPassing,
        results,
        isPassed: isKnownGoodRunPassing && results.every((r) => r.isReported),
    };
}
