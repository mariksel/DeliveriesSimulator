import type { List } from 'immutable';

import type { DeliveriesOutboxEvent } from '../drivers/deliveries/deliveries-outbox-event';
import type { Order, OrderVersion } from './order';
import type { OrderEventRecord } from './order-event-record';
import type { OrdersOutboxEvent } from './orders-outbox-event';
import type { IInstant } from '../system/time/instant';

/** What orders can report having done. */
export const OrdersReportKind = {
    OrderCreated: 'OrderCreated',
    EventRecorded: 'EventRecorded',
    OutboxWritten: 'OutboxWritten',
    InboxRead: 'InboxRead',
} as const;

/** One of the values of {@link OrdersReportKind}. */
export type OrdersReportKind = (typeof OrdersReportKind)[keyof typeof OrdersReportKind];

/** An order created. */
export interface IOrderCreatedReport {
    readonly kind: typeof OrdersReportKind.OrderCreated;
    readonly at: IInstant;
    readonly order: Order;
    readonly version: OrderVersion;
}

/** An event added to the module's event table, with the order as it then stood. */
export interface IOrderEventRecordedReport {
    readonly kind: typeof OrdersReportKind.EventRecorded;
    readonly event: OrderEventRecord;
    readonly version: OrderVersion;
}

/** An event added to the orders outbox. */
export interface IOrdersOutboxWrittenReport {
    readonly kind: typeof OrdersReportKind.OutboxWritten;
    readonly event: OrdersOutboxEvent;
}

/** An event read from the deliveries outbox, with what reading it caused. */
export interface IOrdersInboxReadReport {
    readonly kind: typeof OrdersReportKind.InboxRead;
    readonly at: IInstant;
    readonly event: DeliveriesOutboxEvent;
    readonly caused: List<OrdersReport>;
}

/** What orders did in a step, in order. The simulation engine writes it to the log. */
export type OrdersReport =
    | IOrderCreatedReport
    | IOrderEventRecordedReport
    | IOrdersOutboxWrittenReport
    | IOrdersInboxReadReport;
