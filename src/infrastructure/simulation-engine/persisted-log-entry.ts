import { List } from 'immutable';

import { DeliveryEventKind } from '../../domain/drivers/deliveries/delivery-event-kind';
import type { ILogPosition } from '../../domain/event-log/log-entry';
import { LogSource, TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import { toDriverId } from '../../domain/drivers/driver';
import { toOrderId } from '../../domain/orders/order';
import { toRestaurantId } from '../../domain/restaurants/restaurant-place';
import { OrderEventKind } from '../../domain/orders/order-event-kind';
import type { OrderStatus } from '../../domain/orders/order-status';
import type {
    ICommandIssuedLogRecord,
    ICommandRefusedLogRecord,
    ModuleEventEntry,
    OutboxEntry,
    RunLogEntry,
    RunLogRecord,
} from '../../application-core/simulation-engine/run-log-entry';
import {
    isModuleEvent,
    isOutboxEntry,
} from '../../application-core/simulation-engine/run-log-entry';
import type {
    IPersistedDeliveriesOutboxEvent,
    IPersistedDeliveryEventRecord,
    IPersistedNotification,
} from '../drivers/deliveries/persisted-deliveries-state';
import {
    fromPersistedDeliveriesOutboxEvent,
    fromPersistedDeliveryEvent,
    fromPersistedNotification,
    toPersistedDeliveriesOutboxEvent,
    toPersistedDeliveryEvent,
    toPersistedNotification,
} from '../drivers/deliveries/persisted-deliveries-state';
import { isJsonData } from '../system/json/json-data';
import type {
    IPersistedOrderEventRecord,
    IPersistedOrdersOutboxEvent,
} from '../orders/persisted-orders-state';
import {
    fromPersistedOrderEvent,
    fromPersistedOrdersOutboxEvent,
    toPersistedOrderEvent,
    toPersistedOrdersOutboxEvent,
} from '../orders/persisted-orders-state';
import type { IPersistedValueChanged } from '../business-rules/persisted-value-changed';
import {
    fromPersistedValueChanged,
    toPersistedValueChanged,
} from '../business-rules/persisted-value-changed';
import { toVersionNumber } from '../../domain/system/records/version-chain';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { toOrdersOutboxEventId } from '../../domain/orders/orders-outbox-event';
import { toDeliveriesOutboxEventId } from '../../domain/drivers/deliveries/deliveries-outbox-event';
import type { PersistedIndirectEffect } from './persisted-indirect-effect';
import {
    fromPersistedIndirectEffect,
    toPersistedIndirectEffect,
} from './persisted-indirect-effect';

/** A new order's log data, persisted. */
export interface IPersistedOrderCreatedData {
    readonly id: string;
    readonly restaurantId: string;
    readonly status: OrderStatus;
    readonly version: number;
    readonly isDeliveryRequestPending: boolean;
    readonly isReady: boolean;
    readonly driverId: string | null;
}

/** An orders event's log data, persisted. */
export interface IPersistedOrdersEventData extends IPersistedOrderEventRecord {
    readonly status: OrderStatus;
    readonly version: number;
}

/** A notification's log data, persisted. */
export interface IPersistedNotificationSentData extends IPersistedNotification {
    readonly isOutstanding: boolean;
}

/** A config change's log data, persisted. */
export interface IPersistedConfigChangedData {
    readonly changes: readonly IPersistedValueChanged[];
}

/** One kind of persisted log entry: its source and kind, and its data persisted. */
interface IPersistedRecord<TSource, TKind, TData> {
    readonly source: TSource;
    readonly kind: TKind;
    readonly data: TData;
}

type Orders = typeof LogSource.Orders;
type Deliveries = typeof LogSource.Deliveries;
type Kinds = typeof TechnicalLogKind;

/** What a log entry recorded, persisted, each kind with its own persisted data. */
export type PersistedLogRecord =
    | IPersistedRecord<Orders, Kinds['OrderCreated'], IPersistedOrderCreatedData>
    | IPersistedRecord<Orders, OrderEventKind, IPersistedOrdersEventData>
    | IPersistedRecord<Orders, Kinds['OutboxEventWritten'], IPersistedOrdersOutboxEvent>
    | IPersistedRecord<
          Orders | Deliveries,
          Kinds['InboxEventRead'],
          { readonly outboxEventId: string }
      >
    | IPersistedRecord<Deliveries, DeliveryEventKind, IPersistedDeliveryEventRecord>
    | IPersistedRecord<Deliveries, Kinds['OutboxEventWritten'], IPersistedDeliveriesOutboxEvent>
    | IPersistedRecord<Deliveries, Kinds['NotificationSent'], IPersistedNotificationSentData>
    | IPersistedRecord<
          typeof LogSource.Actors,
          Kinds['CommandIssued'],
          ICommandIssuedLogRecord['data']
      >
    | IPersistedRecord<
          typeof LogSource.Actors,
          Kinds['CommandRefused'],
          ICommandRefusedLogRecord['data']
      >
    | IPersistedRecord<
          typeof LogSource.SimulationEngine,
          Kinds['ConfigChanged'],
          IPersistedConfigChangedData
      >
    | IPersistedRecord<
          typeof LogSource.Actors,
          Kinds['IndirectEffectHappened'],
          PersistedIndirectEffect
      >;

/** A log entry, persisted: where it sits in the log, and what it recorded. */
/** Where an entry sits in the log, persisted with its moment as milliseconds. */
export interface IPersistedLogPosition extends Omit<ILogPosition, 'at'> {
    readonly at: number;
}

/** A log entry, persisted. */
export type PersistedLogEntry = IPersistedLogPosition & PersistedLogRecord;

type PersistedEventRecord = Extract<
    PersistedLogRecord,
    { readonly kind: OrderEventKind | DeliveryEventKind }
>;
type PersistedOutboxRecord = Extract<
    PersistedLogRecord,
    { readonly kind: Kinds['OutboxEventWritten'] }
>;

const MODULE_EVENT_KINDS: readonly string[] = [
    ...Object.values(OrderEventKind),
    ...Object.values(DeliveryEventKind),
];

const isPersistedEvent = (record: PersistedLogRecord): record is PersistedEventRecord =>
    MODULE_EVENT_KINDS.includes(record.kind);

const isPersistedOutbox = (record: PersistedLogRecord): record is PersistedOutboxRecord =>
    record.kind === TechnicalLogKind.OutboxEventWritten;

function toPersistedEventRecord(entry: ModuleEventEntry): PersistedEventRecord {
    if (entry.source === LogSource.Orders) {
        const event = toPersistedOrderEvent(entry.data.event);
        const data = { ...event, status: entry.data.status, version: entry.data.version };
        return { source: entry.source, kind: entry.kind, data };
    }
    const data = toPersistedDeliveryEvent(entry.data);
    return { source: entry.source, kind: entry.kind, data };
}

function toPersistedOutboxRecord(entry: OutboxEntry): PersistedOutboxRecord {
    if (entry.source === LogSource.Orders) {
        const data = toPersistedOrdersOutboxEvent(entry.data);
        return { source: entry.source, kind: entry.kind, data };
    }
    const data = toPersistedDeliveriesOutboxEvent(entry.data);
    return { source: entry.source, kind: entry.kind, data };
}

function unknownKind(entry: never): never {
    throw new Error(
        `A log entry of an unknown kind cannot be persisted: ${JSON.stringify(entry)}.`,
    );
}

function toPersistedRecord(entry: RunLogEntry): PersistedLogRecord {
    if (isModuleEvent(entry)) {
        return toPersistedEventRecord(entry);
    }
    if (isOutboxEntry(entry)) {
        return toPersistedOutboxRecord(entry);
    }
    switch (entry.kind) {
        case TechnicalLogKind.OrderCreated:
            return { source: entry.source, kind: entry.kind, data: { ...entry.data } };
        case TechnicalLogKind.InboxEventRead:
            return { source: entry.source, kind: entry.kind, data: { ...entry.data } };
        case TechnicalLogKind.CommandIssued:
            return { source: entry.source, kind: entry.kind, data: { ...entry.data } };
        case TechnicalLogKind.CommandRefused:
            return { source: entry.source, kind: entry.kind, data: { ...entry.data } };
        case TechnicalLogKind.NotificationSent: {
            const notification = toPersistedNotification(entry.data.notification);
            const data = { ...notification, isOutstanding: entry.data.isOutstanding };
            return { source: entry.source, kind: entry.kind, data };
        }
        case TechnicalLogKind.ConfigChanged: {
            const changes = entry.data.changes.map(toPersistedValueChanged).toArray();
            return { source: entry.source, kind: entry.kind, data: { changes } };
        }
        case TechnicalLogKind.IndirectEffectHappened: {
            const data = toPersistedIndirectEffect(entry.data);
            return { source: entry.source, kind: entry.kind, data };
        }
        default:
            return unknownKind(entry);
    }
}

function fromPersistedEventRecord(record: PersistedEventRecord): RunLogRecord {
    if (record.source === LogSource.Orders) {
        const event = fromPersistedOrderEvent(record.data, toSimTime);
        const version = toVersionNumber(record.data.version);
        const data = { event, status: record.data.status, version };
        return { source: record.source, kind: record.kind, data };
    }
    const data = fromPersistedDeliveryEvent(record.data, toSimTime);
    return { source: record.source, kind: record.kind, data };
}

function fromPersistedOutboxRecord(record: PersistedOutboxRecord): RunLogRecord {
    if (record.source === LogSource.Orders) {
        const data = fromPersistedOrdersOutboxEvent(record.data, toSimTime);
        return { source: record.source, kind: record.kind, data };
    }
    const data = fromPersistedDeliveriesOutboxEvent(record.data, toSimTime);
    return { source: record.source, kind: record.kind, data };
}

function fromPersistedOrderCreated(
    record: Extract<PersistedLogRecord, { readonly kind: Kinds['OrderCreated'] }>,
): RunLogRecord {
    const { data } = record;
    return {
        source: record.source,
        kind: record.kind,
        data: {
            ...data,
            id: toOrderId(data.id),
            restaurantId: toRestaurantId(data.restaurantId),
            driverId: data.driverId === null ? null : toDriverId(data.driverId),
            version: toVersionNumber(data.version),
        },
    };
}

function fromPersistedInboxRead(
    record: Extract<PersistedLogRecord, { readonly kind: Kinds['InboxEventRead'] }>,
): RunLogRecord {
    // Orders reads deliveries' outbox, and deliveries reads orders'.
    const outboxEventId =
        record.source === LogSource.Orders
            ? toDeliveriesOutboxEventId(record.data.outboxEventId)
            : toOrdersOutboxEventId(record.data.outboxEventId);
    return { source: record.source, kind: record.kind, data: { outboxEventId } };
}

function fromPersistedRecord(record: PersistedLogRecord): RunLogRecord {
    if (isPersistedEvent(record)) {
        return fromPersistedEventRecord(record);
    }
    if (isPersistedOutbox(record)) {
        return fromPersistedOutboxRecord(record);
    }
    switch (record.kind) {
        case TechnicalLogKind.OrderCreated:
            return fromPersistedOrderCreated(record);
        case TechnicalLogKind.InboxEventRead:
            return fromPersistedInboxRead(record);
        case TechnicalLogKind.NotificationSent: {
            const notification = fromPersistedNotification(record.data, toSimTime);
            const data = { notification, isOutstanding: record.data.isOutstanding };
            return { source: record.source, kind: record.kind, data };
        }
        case TechnicalLogKind.CommandIssued:
            return { source: record.source, kind: record.kind, data: { ...record.data } };
        case TechnicalLogKind.CommandRefused:
            return { source: record.source, kind: record.kind, data: { ...record.data } };
        case TechnicalLogKind.ConfigChanged: {
            const persisted = List(record.data.changes);
            const changes = persisted.map(fromPersistedValueChanged);
            return { source: record.source, kind: record.kind, data: { changes } };
        }
        case TechnicalLogKind.IndirectEffectHappened: {
            const data = fromPersistedIndirectEffect(record.data);
            return { source: record.source, kind: record.kind, data };
        }
        default:
            return unknownKind(record);
    }
}

/**
 * A log entry, persisted. Its data must be plain data that JSON keeps unchanged, which is checked
 * here, where the log leaves the core.
 */
export function toPersistedLogEntry(entry: RunLogEntry): PersistedLogEntry {
    const record = toPersistedRecord(entry);
    const persisted: PersistedLogEntry = {
        ...record,
        sequence: entry.sequence,
        at: entry.at.sinceStart.milliseconds,
        causedBy: entry.causedBy,
        trace: entry.trace,
    };
    if (!isJsonData(persisted)) {
        throw new RangeError(`Log entry ${entry.sequence} holds data that JSON cannot keep.`);
    }
    return persisted;
}

/** A log entry, from its persisted form. */
export function fromPersistedLogEntry(entry: PersistedLogEntry): RunLogEntry {
    const record = fromPersistedRecord(entry);
    return {
        ...record,
        sequence: entry.sequence,
        at: toSimTime(entry.at),
        causedBy: entry.causedBy,
        trace: entry.trace,
    };
}
