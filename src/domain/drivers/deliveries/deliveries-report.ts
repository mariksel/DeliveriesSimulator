import type { List } from 'immutable';

import type { DeliveriesOutboxEvent } from './deliveries-outbox-event';
import type { OrdersOutboxEvent } from '../../orders/orders-outbox-event';
import type { DeliveryEventRecord } from './delivery-event-record';
import type { Notification, NotificationVersion } from './notification';
import type { IInstant } from '../../system/time/instant';

/** What deliveries can report having done. */
export const DeliveriesReportKind = {
    EventRecorded: 'EventRecorded',
    OutboxWritten: 'OutboxWritten',
    NotificationSent: 'NotificationSent',
    InboxRead: 'InboxRead',
} as const;

/** One of the values of {@link DeliveriesReportKind}. */
export type DeliveriesReportKind =
    (typeof DeliveriesReportKind)[keyof typeof DeliveriesReportKind];

/** An event added to the module's event table. */
export interface IDeliveryEventRecordedReport {
    readonly kind: typeof DeliveriesReportKind.EventRecorded;
    readonly event: DeliveryEventRecord;
}

/** An event added to the deliveries outbox. */
export interface IDeliveriesOutboxWrittenReport {
    readonly kind: typeof DeliveriesReportKind.OutboxWritten;
    readonly event: DeliveriesOutboxEvent;
}

/** A driver notified about a request. */
export interface INotificationSentReport {
    readonly kind: typeof DeliveriesReportKind.NotificationSent;
    readonly notification: Notification;
    readonly version: NotificationVersion;
}

/** An event read from the orders outbox, with what reading it caused. */
export interface IDeliveriesInboxReadReport {
    readonly kind: typeof DeliveriesReportKind.InboxRead;
    readonly at: IInstant;
    readonly event: OrdersOutboxEvent;
    readonly caused: List<DeliveriesReport>;
}

/** What deliveries did in a step, in order. The simulation engine writes it to the log. */
export type DeliveriesReport =
    | IDeliveryEventRecordedReport
    | IDeliveriesOutboxWrittenReport
    | INotificationSentReport
    | IDeliveriesInboxReadReport;
