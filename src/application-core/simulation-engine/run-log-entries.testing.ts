import { List } from 'immutable';

import { toParameterValue } from '../../domain/business-rules/numbers';
import { ValueChanged } from '../../domain/business-rules/value-changed';
import {
    DISPATCH_PASS,
    DISPATCH_PASS_INTERVAL,
} from '../../domain/drivers/drivers-rule-definitions';
import { DeliveryEventKind } from '../../domain/drivers/deliveries/delivery-event-kind';
import { DeliveryEventRecord } from '../../domain/drivers/deliveries/delivery-event-record';
import { Notification } from '../../domain/drivers/deliveries/notification';
import { appendEntry } from '../../domain/event-log/event-log';
import { LogSource, TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import { toDeliveryEventId } from '../../domain/drivers/deliveries/delivery-event-id';
import { toDriverId } from '../../domain/drivers/driver';
import { toNotificationId } from '../../domain/drivers/deliveries/notification';
import { toOrderDeliveryId } from '../../domain/drivers/deliveries/order-delivery';
import { toOrderEventId } from '../../domain/orders/order-event-id';
import { toOrderId } from '../../domain/orders/order';
import { toRestaurantId } from '../../domain/restaurants/restaurant-place';
import { toInputActor, toInputOrderName } from './run-input';
import { DeliveriesOutboxEvent } from '../../domain/drivers/deliveries/deliveries-outbox-event';
import type { FieldsOf } from '../../domain/system/classes/fields-of';
import { OrderEventKind } from '../../domain/orders/order-event-kind';
import { OrderEventRecord } from '../../domain/orders/order-event-record';
import { OrdersOutboxEvent } from '../../domain/orders/orders-outbox-event';
import { OrderStatus } from '../../domain/orders/order-status';
import type { CommandRefusal } from './command-outcome';
import type { IndirectEffect } from './indirect-effect';
import type {
    ICommandIssuedLogRecord,
    ICommandRefusedLogRecord,
    IConfigChangedLogRecord,
    IDeliveriesEventLogRecord,
    IDeliveriesOutboxLogRecord,
    IIndirectEffectLogRecord,
    IInboxReadLogRecord,
    INotificationSentLogRecord,
    IOrderCreatedLogRecord,
    IOrdersEventLogRecord,
    IOrdersOutboxLogRecord,
    RunLogEntry,
    RunLogRecord,
} from './run-log-entry';
import { toLogSequence } from '../../domain/event-log/numbers';
import { toVersionNumber } from '../../domain/system/records/version-chain';
import { RUN_START, toSimTime } from '../../domain/simulation-engine/sim-time';
import { toOrdersOutboxEventId } from '../../domain/orders/orders-outbox-event';
import { toDeliveriesOutboxEventId } from '../../domain/drivers/deliveries/deliveries-outbox-event';

/** A typed entry at a place in the log, caused by nothing unless a test says otherwise. */
export const entryOf = (
    sequence: number,
    record: RunLogRecord,
    position: {
        readonly at?: number;
        readonly causedBy?: number | null;
        readonly trace?: number;
    } = {},
): RunLogEntry => ({
    ...record,
    sequence: toLogSequence(sequence),
    at: toSimTime(position.at ?? 0),
    causedBy:
        position.causedBy === undefined || position.causedBy === null
            ? null
            : toLogSequence(position.causedBy),
    trace: toLogSequence(position.trace ?? sequence),
});

/** A log of these records, each at its time, with each cause as given. */
export function logOf(
    ...records: readonly (readonly [at: number, record: RunLogRecord, causedBy?: number])[]
): List<RunLogEntry> {
    const empty = List<RunLogEntry>();
    return records.reduce((log, [at, record, causedBy]) => {
        const cause = causedBy === undefined ? undefined : toLogSequence(causedBy);
        const secondAt = toSimTime(at);
        return appendEntry(log, secondAt, record, cause);
    }, empty);
}

/** A new order in orders. */
export const orderCreated = (
    data: Partial<IOrderCreatedLogRecord['data']> = {},
): IOrderCreatedLogRecord => ({
    source: LogSource.Orders,
    kind: TechnicalLogKind.OrderCreated,
    data: {
        id: toOrderId('A'),
        restaurantId: toRestaurantId('restaurant'),
        status: OrderStatus.Created,
        version: toVersionNumber(1),
        isDeliveryRequestPending: false,
        isReady: false,
        driverId: null,
        ...data,
    },
});

/** An orders event's fields, and the order's status and version after it, for a test. */
type OrdersEventFields = Partial<FieldsOf<OrderEventRecord>> & {
    readonly status?: OrderStatus;
    readonly version?: number;
};

/** An event orders recorded. */
export function ordersEvent(fields: OrdersEventFields = {}): IOrdersEventLogRecord {
    const kind = fields.kind ?? OrderEventKind.OrderDelivered;
    const event = OrderEventRecord.create({
        id: fields.id ?? toOrderEventId('order-event'),
        orderId: fields.orderId ?? toOrderId('A'),
        kind,
        at: fields.at ?? RUN_START,
        driverId: fields.driverId ?? null,
        deliveriesEventId: fields.deliveriesEventId ?? null,
    });
    const status = fields.status ?? OrderStatus.Delivered;
    return {
        source: LogSource.Orders,
        kind,
        data: { event, status, version: toVersionNumber(fields.version ?? 1) },
    };
}

/** An event deliveries recorded. */
export function deliveriesEvent(
    data: Partial<FieldsOf<DeliveryEventRecord>> = {},
): IDeliveriesEventLogRecord {
    const kind = data.kind ?? DeliveryEventKind.OrderDelivered;
    return {
        source: LogSource.Deliveries,
        kind,
        data: DeliveryEventRecord.create({
            id: toDeliveryEventId('delivery-event'),
            orderDeliveryId: toOrderDeliveryId('delivery'),
            orderId: toOrderId('A'),
            kind,
            at: toSimTime(0),
            driverId: null,
            ordersEventId: null,
            ...data,
        }),
    };
}

/** An outbox event orders wrote. */
export const ordersOutbox = (
    data: Partial<FieldsOf<OrdersOutboxEvent>> = {},
): IOrdersOutboxLogRecord => ({
    source: LogSource.Orders,
    kind: TechnicalLogKind.OutboxEventWritten,
    data: OrdersOutboxEvent.create({
        id: toOrdersOutboxEventId('orders-outbox'),
        eventId: toOrderEventId('order-event'),
        orderId: toOrderId('A'),
        kind: OrderEventKind.OrderDelivered,
        at: toSimTime(0),
        driverId: null,
        orderVersion: toVersionNumber(1),
        orderStatus: OrderStatus.Delivered,
        startedEventId: null,
        ...data,
    }),
});

/** An outbox event deliveries wrote. */
export const deliveriesOutbox = (
    data: Partial<FieldsOf<DeliveriesOutboxEvent>> = {},
): IDeliveriesOutboxLogRecord => ({
    source: LogSource.Deliveries,
    kind: TechnicalLogKind.OutboxEventWritten,
    data: DeliveriesOutboxEvent.create({
        id: toDeliveriesOutboxEventId('deliveries-outbox'),
        eventId: toDeliveryEventId('delivery-event'),
        orderDeliveryId: toOrderDeliveryId('delivery'),
        orderId: toOrderId('A'),
        kind: DeliveryEventKind.OrderDelivered,
        at: toSimTime(0),
        driverId: null,
        wasStartedByDeliveries: false,
        ...data,
    }),
});

/** A module reading an outbox event. */
export const inboxRead = (
    source: IInboxReadLogRecord['source'],
    outboxEventId: string,
): IInboxReadLogRecord => ({
    source,
    kind: TechnicalLogKind.InboxEventRead,
    // Orders reads deliveries' outbox, and deliveries reads orders'.
    data: {
        outboxEventId:
            source === LogSource.Orders
                ? toDeliveriesOutboxEventId(outboxEventId)
                : toOrdersOutboxEventId(outboxEventId),
    },
});

/** A notification deliveries sent. */
export function notificationSent(
    data: Partial<FieldsOf<Notification>> & { readonly isOutstanding?: boolean } = {},
): INotificationSentLogRecord {
    const { isOutstanding = true, ...fields } = data;
    const notification = Notification.create({
        id: toNotificationId('notification'),
        orderDeliveryId: toOrderDeliveryId('delivery'),
        requestEventId: toDeliveryEventId('delivery-event'),
        driverId: toDriverId('driver'),
        at: toSimTime(0),
        ...fields,
    });
    return {
        source: LogSource.Deliveries,
        kind: TechnicalLogKind.NotificationSent,
        data: { notification, isOutstanding },
    };
}

/** A command an actor issued. */
export const commandIssued = (
    name: ICommandIssuedLogRecord['data']['name'],
    order = 'A',
    actor = 'actor',
): ICommandIssuedLogRecord => ({
    source: LogSource.Actors,
    kind: TechnicalLogKind.CommandIssued,
    data: {
        actor: toInputActor(actor),
        name,
        data: { order: toInputOrderName(order) },
    },
});

/** A command the service refused. */
export const commandRefused = (
    name: ICommandRefusedLogRecord['data']['name'],
    refusal: CommandRefusal,
    actor = 'actor',
): ICommandRefusedLogRecord => ({
    source: LogSource.Actors,
    kind: TechnicalLogKind.CommandRefused,
    data: { actor: toInputActor(actor), name, refusal },
});

const V1_DISPATCH_PASS_MS = 30_000;
const FASTER_DISPATCH_PASS_MS = 10_000;

/** A config change of the dispatch pass's interval, from V1.0.0's 30 seconds to 10. */
export function configChanged(): IConfigChangedLogRecord {
    const before = toParameterValue(V1_DISPATCH_PASS_MS);
    const after = toParameterValue(FASTER_DISPATCH_PASS_MS);
    const changed = ValueChanged.create({
        ruleId: DISPATCH_PASS.id,
        parameterId: DISPATCH_PASS_INTERVAL.id,
        before,
        after,
    });
    return {
        source: LogSource.SimulationEngine,
        kind: TechnicalLogKind.ConfigChanged,
        data: { changes: List([changed]) },
    };
}

/** The actors' log entry for an indirect effect, which the service did not see. */
export const indirectEffectHappened = (data: IndirectEffect): IIndirectEffectLogRecord => ({
    source: LogSource.Actors,
    kind: TechnicalLogKind.IndirectEffectHappened,
    data,
});
