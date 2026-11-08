import type { DeliveriesOutboxEvent } from '../../domain/drivers/deliveries/deliveries-outbox-event';
import { DeliveryEventKind } from '../../domain/drivers/deliveries/delivery-event-kind';
import type { DeliveryEventRecord } from '../../domain/drivers/deliveries/delivery-event-record';
import type { Notification } from '../../domain/drivers/deliveries/notification';
import type { LogEntry } from '../../domain/event-log/log-entry';
import { LogSource, TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import type { DriverId } from '../../domain/drivers/driver';
import type { OrderId } from '../../domain/orders/order';
import type { RestaurantId } from '../../domain/restaurants/restaurant-place';
import type { InputActor, InputOrderName } from './run-input';
import { OrderEventKind } from '../../domain/orders/order-event-kind';
import type { OrderEventRecord } from '../../domain/orders/order-event-record';
import type { OrderStatus } from '../../domain/orders/order-status';
import type { OrdersOutboxEvent } from '../../domain/orders/orders-outbox-event';
import type { CommandRefusal } from './command-outcome';
import type { List } from 'immutable';

import type { ValueChanged } from '../../domain/business-rules/value-changed';
import type { InputCommand } from './input-command';
import type { IndirectEffect } from './indirect-effect';
import type { VersionNumber } from '../../domain/system/records/version-chain';
import type { OrdersOutboxEventId } from '../../domain/orders/orders-outbox-event';
import type { DeliveriesOutboxEventId } from '../../domain/drivers/deliveries/deliveries-outbox-event';

/** A new order, as orders logs it. */
export interface IOrderCreatedData {
    readonly id: OrderId;
    readonly restaurantId: RestaurantId;
    readonly status: OrderStatus;
    readonly version: VersionNumber;
    readonly isDeliveryRequestPending: boolean;
    readonly isReady: boolean;
    readonly driverId: DriverId | null;
}

/** An orders event, with the order's status and version after it. */
export interface IOrdersEventData {
    readonly event: OrderEventRecord;
    readonly status: OrderStatus;
    readonly version: VersionNumber;
}

/** An outbox event an inbox read. */
export interface IInboxReadData {
    readonly outboxEventId: OrdersOutboxEventId | DeliveriesOutboxEventId;
}

/** A notification sent to a driver, and whether it is still waiting for an answer. */
export interface INotificationSentData {
    readonly notification: Notification;
    readonly isOutstanding: boolean;
}

/** What a command was about. */
export interface ICommandSubject {
    readonly order: InputOrderName;
}

/** A command an actor issued. */
export interface ICommandIssuedData {
    readonly actor: InputActor;
    readonly name: InputCommand;
    readonly data: ICommandSubject;
}

/** A command the service refused, and why. */
export interface ICommandRefusedData {
    readonly actor: InputActor;
    readonly name: InputCommand;
    readonly refusal: CommandRefusal;
}

/** Each value a config change changed, by rule and parameter ID, before and after (FND-84). */
export interface IConfigChangedData {
    readonly changes: List<ValueChanged>;
}

/** Orders created an order. */
export interface IOrderCreatedLogRecord {
    readonly source: typeof LogSource.Orders;
    readonly kind: typeof TechnicalLogKind.OrderCreated;
    readonly data: IOrderCreatedData;
}

/** Orders recorded one of its events. */
export interface IOrdersEventLogRecord {
    readonly source: typeof LogSource.Orders;
    readonly kind: OrderEventKind;
    readonly data: IOrdersEventData;
}

/** Orders wrote to its outbox. */
export interface IOrdersOutboxLogRecord {
    readonly source: typeof LogSource.Orders;
    readonly kind: typeof TechnicalLogKind.OutboxEventWritten;
    readonly data: OrdersOutboxEvent;
}

/** A module read an event from the other module's outbox. */
export interface IInboxReadLogRecord {
    readonly source: typeof LogSource.Orders | typeof LogSource.Deliveries;
    readonly kind: typeof TechnicalLogKind.InboxEventRead;
    readonly data: IInboxReadData;
}

/** Deliveries recorded one of its events. */
export interface IDeliveriesEventLogRecord {
    readonly source: typeof LogSource.Deliveries;
    readonly kind: DeliveryEventKind;
    readonly data: DeliveryEventRecord;
}

/** Deliveries wrote to its outbox. */
export interface IDeliveriesOutboxLogRecord {
    readonly source: typeof LogSource.Deliveries;
    readonly kind: typeof TechnicalLogKind.OutboxEventWritten;
    readonly data: DeliveriesOutboxEvent;
}

/** Deliveries sent a driver a notification. */
export interface INotificationSentLogRecord {
    readonly source: typeof LogSource.Deliveries;
    readonly kind: typeof TechnicalLogKind.NotificationSent;
    readonly data: INotificationSentData;
}

/** An actor issued a command. */
export interface ICommandIssuedLogRecord {
    readonly source: typeof LogSource.Actors;
    readonly kind: typeof TechnicalLogKind.CommandIssued;
    readonly data: ICommandIssuedData;
}

/** The service refused an actor's command. */
export interface ICommandRefusedLogRecord {
    readonly source: typeof LogSource.Actors;
    readonly kind: typeof TechnicalLogKind.CommandRefused;
    readonly data: ICommandRefusedData;
}

/** A config value was tuned during the run. */
export interface IConfigChangedLogRecord {
    readonly source: typeof LogSource.SimulationEngine;
    readonly kind: typeof TechnicalLogKind.ConfigChanged;
    readonly data: IConfigChangedData;
}

/**
 * A decision or change outside the service, which the actors made and the service did not see
 * (FND-89).
 */
export interface IIndirectEffectLogRecord {
    readonly source: typeof LogSource.Actors;
    readonly kind: typeof TechnicalLogKind.IndirectEffectHappened;
    readonly data: IndirectEffect;
}

/** Everything a run logs, each kind with its own typed data. */
export type RunLogRecord =
    | IOrderCreatedLogRecord
    | IOrdersEventLogRecord
    | IOrdersOutboxLogRecord
    | IInboxReadLogRecord
    | IDeliveriesEventLogRecord
    | IDeliveriesOutboxLogRecord
    | INotificationSentLogRecord
    | ICommandIssuedLogRecord
    | ICommandRefusedLogRecord
    | IConfigChangedLogRecord
    | IIndirectEffectLogRecord;

/** One entry of a run's log, with its typed data. */
export type RunLogEntry = LogEntry<RunLogRecord>;

/** An entry for one of a module's own events, in either module. */
export type ModuleEventEntry = LogEntry<IOrdersEventLogRecord | IDeliveriesEventLogRecord>;

/** An entry for an outbox write, in either module. */
export type OutboxEntry = LogEntry<IOrdersOutboxLogRecord | IDeliveriesOutboxLogRecord>;

/** An entry for an inbox read, in either module. */
export type InboxReadEntry = LogEntry<IInboxReadLogRecord>;

const MODULE_EVENT_KINDS: readonly string[] = [
    ...Object.values(OrderEventKind),
    ...Object.values(DeliveryEventKind),
];

/** Whether an entry is one of a module's own events, rather than a technical entry. */
export const isModuleEvent = (entry: RunLogEntry): entry is ModuleEventEntry =>
    MODULE_EVENT_KINDS.includes(entry.kind);

/** Whether an entry is an outbox write. */
export const isOutboxEntry = (entry: RunLogEntry): entry is OutboxEntry =>
    entry.kind === TechnicalLogKind.OutboxEventWritten;

/** Whether an entry is an inbox read. */
export const isInboxRead = (entry: RunLogEntry): entry is InboxReadEntry =>
    entry.kind === TechnicalLogKind.InboxEventRead;

/** The event record a module event entry holds, from either module. */
export const eventRecordOf = (entry: ModuleEventEntry): OrderEventRecord | DeliveryEventRecord =>
    entry.source === LogSource.Orders ? entry.data.event : entry.data;
