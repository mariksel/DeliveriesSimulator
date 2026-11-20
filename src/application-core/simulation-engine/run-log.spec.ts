import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import type { DeliveriesReport } from '../../domain/drivers/deliveries/deliveries-report';
import { DeliveriesReportKind } from '../../domain/drivers/deliveries/deliveries-report';
import { DeliveryEventKind } from '../../domain/drivers/deliveries/delivery-event-kind';
import { DeliveryEventRecord } from '../../domain/drivers/deliveries/delivery-event-record';
import type { RunLogEntry } from './run-log-entry';
import { toDeliveryEventId } from '../../domain/drivers/deliveries/delivery-event-id';
import { toOrderDeliveryId } from '../../domain/drivers/deliveries/order-delivery';
import { toOrderEventId } from '../../domain/orders/order-event-id';
import { toOrderId } from '../../domain/orders/order';
import { OrderVersion } from '../../domain/orders/order';
import { OrderView } from '../../domain/orders/order-view';
import { OrderEventRecord } from '../../domain/orders/order-event-record';
import { OrderEventKind } from '../../domain/orders/order-event-kind';
import type { OrdersReport } from '../../domain/orders/orders-report';
import { OrdersReportKind } from '../../domain/orders/orders-report';
import type { ICause, IRunLog } from './run-log';
import {
    emptyRunLog,
    lastSequence,
    NO_CAUSE,
    writeDeliveriesReports,
    writeOrdersReports,
} from './run-log';
import { toLogSequence } from '../../domain/event-log/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { TEST_MAKER } from '../../domain/system/records/maker.testing';

const ORDER_EVENT = toOrderEventId('order-1:2');
const ORDER_ID = toOrderId('order-1');

/** A log holding one event in orders. */
function logWithOrderEvent(): IRunLog {
    const version = OrderVersion.createNew(ORDER_ID, TEST_MAKER);
    const event = OrderEventRecord.create({
        id: ORDER_EVENT,
        orderId: ORDER_ID,
        kind: OrderEventKind.OrderDeliveryRequest,
        at: toSimTime(0),
        driverId: null,
        deliveriesEventId: null,
    });
    const events = List.of(event);
    const view = OrderView.of(version, events);
    const report: OrdersReport = { kind: OrdersReportKind.EventRecorded, event, view };
    const logEntries = List<RunLogEntry>();
    const reports = List.of(report);
    const log = emptyRunLog(logEntries);
    return writeOrdersReports(log, reports, NO_CAUSE);
}

/**
 * Writes an event in deliveries that matches the one in orders, and gives what its log entry says
 * caused it.
 */
function causeOfMatchingEvent(log: IRunLog, cause: ICause): number | null | undefined {
    const report: DeliveriesReport = {
        kind: DeliveriesReportKind.EventRecorded,
        event: DeliveryEventRecord.create({
            id: toDeliveryEventId('delivery-1:1'),
            orderDeliveryId: toOrderDeliveryId('delivery-1'),
            orderId: ORDER_ID,
            kind: DeliveryEventKind.OrderDeliveryRequest,
            at: toSimTime(0),
            driverId: null,
            ordersEventId: ORDER_EVENT,
        }),
    };
    const reports = List.of(report);
    return writeDeliveriesReports(log, reports, cause).entries.last()?.causedBy;
}

describe('working out what caused a log entry', () => {
    it('links an event to the one it matches, when nothing else is being carried out', () => {
        const log = logWithOrderEvent();

        const secondCauseOfMatchingEvent = causeOfMatchingEvent(log, NO_CAUSE);
        const expected = lastSequence(log);
        expect(secondCauseOfMatchingEvent).toBe(expected);
    });

    it('links an event to the inbox read that made it, not the one it matches', () => {
        const log = logWithOrderEvent();
        const read: ICause = { current: toLogSequence(99), isReadingInbox: true };

        expect(() => causeOfMatchingEvent(log, read)).toThrow('Unknown cause: 99.');
    });
});
