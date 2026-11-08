import { List, OrderedMap } from 'immutable';

import { isReadByDeliveries } from './deliveries-communication';
import type { DeliveriesRules } from './deliveries-rules';
import type { DriversRules } from '../drivers-rules';
import type { IneligibleReason } from '../eligibility';
import { ineligibleReason } from '../eligibility';
import type { IPastNotification } from '../notification-sequence';
import { nextDriverToNotify } from '../notification-sequence';
import type { IRankedDriver } from '../ranking';
import { rankScore } from '../ranking';
import type { FieldsOf } from '../../system/classes/fields-of';
import type { DeliveryEventId } from './delivery-event-id';
import type { DriverId } from '../driver';
import type { NotificationId } from './notification';
import type { OrderDeliveryId } from './order-delivery';
import type { OrderEventId } from '../../orders/order-event-id';
import type { OrderId } from '../../orders/order';
import { toDeliveryEventId } from './delivery-event-id';
import { toNotificationId } from './notification';
import { toOrderDeliveryId } from './order-delivery';
import { InboxPosition } from '../../system/messaging/inbox-position';
import type { OrdersOutboxEvent } from '../../orders/orders-outbox-event';
import { required } from '../../system/validation/required';
import type { ICallOrders } from './call-orders';
import { DeliveriesOutboxEvent } from './deliveries-outbox-event';
import type { DeliveriesReport } from './deliveries-report';
import { DeliveriesReportKind } from './deliveries-report';
import { DeliveryEventKind } from './delivery-event-kind';
import { DeliveryEventRecord } from './delivery-event-record';
import type { DeliveryHandoff } from './delivery-handoff';
import type { DriverVersion } from '../driver';
import type { IHolding } from '../drivers-state';
import { DriversState } from '../drivers-state';
import type { DriverRefusal } from './driver-refusal';
import { DriverRefusalCode } from './driver-refusal';
import { FollowUpKind } from './follow-up-kind';
import { Notification, NotificationVersion } from './notification';
import { DeliveryState, OrderCopy, OrderDelivery, OrderDeliveryVersion } from './order-delivery';
import type { OrdersAnswer } from './orders-answer';
import type { RestaurantPlace } from '../../restaurants/restaurant-place';
import type { Count } from '../../system/math/math';
import type { IInstant } from '../../system/time/instant';
import { plusOne, toCount } from '../../system/math/math';
import { toDeliveriesOutboxEventId } from './deliveries-outbox-event';
import type { OrdersOutboxEventId } from '../../orders/orders-outbox-event';

/**
 * What a step of deliveries comes to: the new state, what it did, and what the engine must still
 * do.
 */
export interface IDeliveriesStep {
    readonly state: DeliveriesState;
    readonly reports: List<DeliveriesReport>;
    readonly followUps: List<ICallOrders>;
}

/** A step of deliveries that also changed the drivers' counts, which it gives back too. */
export interface IDeliveriesAndDriversStep extends IDeliveriesStep {
    readonly drivers: DriversState;
}

/** A delivery request received: the step, and the order delivery's ID. */
export interface IDeliveryRequestReceived extends IDeliveriesStep {
    readonly orderDeliveryId: OrderDeliveryId;
}

/** A driver's command that was refused, and why. */
export interface IDriverRefused {
    readonly isOk: false;
    readonly refusal: DriverRefusal;
}

/** A driver's command that went ahead, and the event it recorded. */
export interface IDriverCommandDone extends IDeliveriesAndDriversStep {
    readonly isOk: true;
    readonly event: DeliveryEventRecord;
}

/** How a driver's command ended: the step it made, or a refusal. */
export type DriverCommandResult = IDriverCommandDone | IDriverRefused;

/** A driver's command that orders decides: the step asking for the call to orders. */
export interface IOrdersAsked extends IDeliveriesStep {
    readonly isOk: true;
}

/** How a driver's command that orders decides ended: the call asked for, or a refusal. */
export type DriverCallResult = IOrdersAsked | IDriverRefused;

const STATE_AFTER = {
    OrderPickedUp: DeliveryState.PickedUp,
    OrderDelivered: DeliveryState.Delivered,
} as const;

const changesState = (kind: string): kind is keyof typeof STATE_AFTER => kind in STATE_AFTER;

const HELD_STATES: readonly DeliveryState[] = [DeliveryState.Assigned, DeliveryState.PickedUp];

interface IRecorded {
    readonly state: DeliveriesState;
    readonly reports: List<DeliveriesReport>;
    readonly event: DeliveryEventRecord;
}

/** What links an event being recorded to the other module. */
interface IEventLink {
    readonly ordersEventId: OrderEventId | null;
    readonly wasStartedByDeliveries: boolean;
}

/** What one event to record is: which delivery, what kind, when, and by whom. */
interface IEventCall {
    readonly delivery: OrderDeliveryVersion;
    readonly kind: DeliveryEventKind;
    readonly at: IInstant;
    readonly driverId: DriverId | null;
}

/** Who holds a delivery, and who has picked it up, in the state it is in. */
function holdingOf(delivery: OrderDeliveryVersion | undefined): IHolding {
    if (delivery === undefined) {
        return { heldBy: null, pickedUpBy: null };
    }
    const heldBy = HELD_STATES.includes(delivery.state) ? delivery.driverId : null;
    const pickedUpBy = delivery.state === DeliveryState.PickedUp ? delivery.driverId : null;
    return { heldBy, pickedUpBy };
}

/** A delivery saved, and the drivers' counts after it. */
interface ISaved {
    readonly state: DeliveriesState;
    readonly drivers: DriversState;
}

/**
 * The Deliveries submodule of one run: its records. Its commands are its static methods, each
 * taking the state, and the drivers' state where it reads or changes the drivers, and giving the
 * step it makes.
 */
export class DeliveriesState {
    /** Deliveries at the start of a run, with no drivers and no records. */
    static createNew(): DeliveriesState {
        return DeliveriesState.create({
            deliveries: OrderedMap(),
            deliveryVersions: OrderedMap(),
            eventsByOrder: OrderedMap(),
            ordersEventLinks: OrderedMap(),
            outbox: List(),
            inbox: OrderedMap(),
            inboxPosition: InboxPosition.createNew(),
            notificationsByOrder: OrderedMap(),
            notificationVersions: OrderedMap(),
            nextDelivery: toCount(1),
        });
    }

    /** Deliveries from its records. The next delivery's number is from 1. */
    static create(fields: FieldsOf<DeliveriesState>): DeliveriesState {
        if (fields.nextDelivery < 1) {
            throw new RangeError(`Invalid next delivery number: ${fields.nextDelivery}.`);
        }
        return new DeliveriesState(
            fields.deliveries,
            fields.deliveryVersions,
            fields.eventsByOrder,
            fields.ordersEventLinks,
            fields.outbox,
            fields.inbox,
            fields.inboxPosition,
            fields.notificationsByOrder,
            fields.notificationVersions,
            fields.nextDelivery,
        );
    }

    /**
     * Creates the order delivery, its request event, and its copy of the order. A repeat gets the
     * same ID.
     */
    static receiveDeliveryRequest(
        state: DeliveriesState,
        at: IInstant,
        handoff: DeliveryHandoff,
    ): IDeliveryRequestReceived {
        const existing = state.deliveries.get(handoff.orderId);
        if (existing !== undefined) {
            return { ...noStep(state), orderDeliveryId: existing.id };
        }
        const delivery = OrderDelivery.create({
            id: toOrderDeliveryId(`delivery-${state.nextDelivery}`),
            orderId: handoff.orderId,
            restaurant: handoff.restaurant,
        });
        const orderCopy = OrderCopy.create({
            status: handoff.orderStatus,
            version: handoff.orderVersion,
            eventIds: List.of(handoff.requestEventId),
        });
        const version = OrderDeliveryVersion.createNew(delivery, orderCopy);
        const withVersion = state.withDeliveryVersion(version);
        const received = withVersion.with({
            deliveries: state.deliveries.set(delivery.orderId, delivery),
            nextDelivery: plusOne(state.nextDelivery),
        });
        const call = {
            delivery: version,
            kind: DeliveryEventKind.OrderDeliveryRequest,
            at,
            driverId: null,
        };
        const recorded = DeliveriesState.record(received, call, {
            ordersEventId: handoff.requestEventId,
            wasStartedByDeliveries: false,
        });
        return {
            state: recorded.state,
            reports: recorded.reports,
            followUps: List(),
            orderDeliveryId: delivery.id,
        };
    }

    /** The orders with an open request, oldest first, for a dispatch pass to go through. */
    static openRequests(state: DeliveriesState): List<OrderId> {
        return state.deliveryVersions
            .valueSeq()
            .filter((delivery) => delivery.state === DeliveryState.Requested)
            .map((delivery) => delivery.orderId)
            .toList();
    }

    /** A dispatch pass, for one open request: notifies at most one driver, as one transaction. */
    static notifyNextDriver(
        state: DeliveriesState,
        drivers: DriversState,
        orderId: OrderId,
        now: IInstant,
        values: DriversRules,
    ): IDeliveriesStep {
        const deliveryVersion = state.deliveryVersions.get(orderId);
        const delivery = required(deliveryVersion, `the delivery of ${orderId}`);
        const place = state.deliveries.get(orderId);
        const { restaurant } = required(place, `the delivery of ${orderId}`);
        const past = state.pastNotificationsOf(orderId);
        const eligible = DeliveriesState.rankEligible(drivers, restaurant, now, values);
        const driverId = nextDriverToNotify(past, eligible, now, values);
        if (driverId === null) {
            return noStep(state);
        }
        const request = state
            .eventsOf(orderId)
            .find((event) => event.kind === DeliveryEventKind.OrderDeliveryRequest);
        const notification = Notification.create({
            id: toNotificationId(`${delivery.orderDeliveryId}:${driverId}`),
            orderDeliveryId: delivery.orderDeliveryId,
            requestEventId: required(request, `the delivery request of ${orderId}`).id,
            driverId,
            at: now,
        });
        const version = NotificationVersion.createNew(notification.id);
        const notifications = state.notificationsOf(orderId).push(notification);
        const notified = state.with({
            notificationsByOrder: state.notificationsByOrder.set(orderId, notifications),
            notificationVersions: state.notificationVersions.set(notification.id, version),
        });
        return {
            ...noStep(notified),
            reports: List.of<DeliveriesReport>({
                kind: DeliveriesReportKind.NotificationSent,
                notification,
                version,
            }),
        };
    }

    /** The first valid acceptance wins. Any eligible driver may accept, notified or not. */
    static acceptRequest(
        state: DeliveriesState,
        drivers: DriversState,
        at: IInstant,
        orderId: OrderId,
        driverId: DriverId,
        values: DriversRules,
    ): DriverCommandResult {
        const delivery = state.deliveryVersions.get(orderId);
        const place = state.deliveries.get(orderId);
        if (delivery === undefined || place === undefined) {
            return { isOk: false, refusal: DriverRefusalCode.UnknownOrder };
        }
        if (delivery.state !== DeliveryState.Requested) {
            return { isOk: false, refusal: DriverRefusalCode.NoOpenRequest };
        }
        const driver = drivers.versionOf(driverId);
        if (driver === undefined) {
            return { isOk: false, refusal: DriverRefusalCode.UnknownDriver };
        }
        const reason = DeliveriesState.ineligible(drivers, driver, place.restaurant, at, values);
        if (reason !== null) {
            return { isOk: false, refusal: reason };
        }
        const accepted = delivery.next({ state: DeliveryState.Assigned, driverId });
        const saved = DeliveriesState.saveDelivery(state, drivers, accepted);
        const call = {
            delivery: accepted,
            kind: DeliveryEventKind.OrderDeliveryRequestAccepted,
            at,
            driverId,
        };
        const recorded = DeliveriesState.record(saved.state, call, {
            ordersEventId: null,
            wasStartedByDeliveries: true,
        });
        return {
            isOk: true,
            state: recorded.state,
            drivers: saved.drivers,
            reports: recorded.reports,
            followUps: List(),
            event: recorded.event,
        };
    }

    /**
     * A driver picks an order up. Eligibility is not checked on an order the driver already
     * holds.
     */
    static pickUp(
        state: DeliveriesState,
        at: IInstant,
        orderId: OrderId,
        driverId: DriverId,
    ): DriverCallResult {
        const eventKind = DeliveryEventKind.OrderPickedUp;
        return DeliveriesState.askOrders(state, { at, orderId, driverId, eventKind });
    }

    /**
     * A driver delivers an order. Eligibility is not checked on an order the driver already
     * holds.
     */
    static deliver(
        state: DeliveriesState,
        at: IInstant,
        orderId: OrderId,
        driverId: DriverId,
    ): DriverCallResult {
        const eventKind = DeliveryEventKind.OrderDelivered;
        return DeliveriesState.askOrders(state, { at, orderId, driverId, eventKind });
    }

    /** Finishes a driver's command with the answer orders gave to the call. */
    static answerFromOrders(
        state: DeliveriesState,
        drivers: DriversState,
        call: ICallOrders,
        answer: OrdersAnswer,
    ): DriverCommandResult {
        if (!answer.isOk) {
            return { isOk: false, refusal: { orders: answer.refusal } };
        }
        const deliveryVersion = state.deliveryVersions.get(call.orderId);
        const delivery = required(deliveryVersion, `the delivery of ${call.orderId}`);
        const changed = delivery.next({ state: STATE_AFTER[call.eventKind] });
        const saved = DeliveriesState.saveDelivery(state, drivers, changed);
        const eventCall = {
            delivery: changed,
            kind: call.eventKind,
            at: call.at,
            driverId: call.driverId,
        };
        const recorded = DeliveriesState.record(saved.state, eventCall, {
            ordersEventId: answer.eventId,
            wasStartedByDeliveries: false,
        });
        return {
            isOk: true,
            state: recorded.state,
            drivers: saved.drivers,
            reports: recorded.reports,
            followUps: List(),
            event: recorded.event,
        };
    }

    /**
     * What the deliveries inbox job has still to read of the orders outbox, which the engine
     * passes in. An event for an order with no delivery yet is read once it has one. Retries
     * arrive with I04.
     */
    static dueOrdersEvents(
        state: DeliveriesState,
        outbox: List<OrdersOutboxEvent>,
        rules: DeliveriesRules,
    ): List<OrdersOutboxEvent> {
        return outbox
            .slice(state.inboxPosition.scanFrom)
            .filter(
                (event) =>
                    isReadByDeliveries(state.inboxPosition, event.at, rules) &&
                    !state.inbox.has(event.id) &&
                    state.deliveryVersions.has(event.orderId),
            );
    }

    /**
     * Reading an event, first transaction: what it changes here. A failure before the next one
     * reads it again.
     */
    static readOrdersEvent(
        state: DeliveriesState,
        drivers: DriversState,
        now: IInstant,
        event: OrdersOutboxEvent,
    ): IDeliveriesAndDriversStep {
        const deliveryVersion = state.deliveryVersions.get(event.orderId);
        const delivery = required(deliveryVersion, `the delivery of ${event.orderId}`);
        const applied = DeliveriesState.applyOrdersEvent({ state, drivers }, now, event, delivery);
        return {
            ...noStep(applied.state),
            drivers: applied.drivers,
            reports: List.of<DeliveriesReport>({
                kind: DeliveriesReportKind.InboxRead,
                at: now,
                event,
                caused: applied.reports,
            }),
        };
    }

    /** Reading an event, second transaction: the inbox record, which finishes it. */
    static recordOrdersEventRead(
        state: DeliveriesState,
        event: OrdersOutboxEvent,
        outbox: List<OrdersOutboxEvent>,
        rules: DeliveriesRules,
    ): IDeliveriesStep {
        const inbox = state.inbox.set(event.id, event.at);
        const read = state.inboxPosition.withLatestRead(event.at);
        const inboxPosition = read.scannedTo(
            outbox,
            (later) => !isReadByDeliveries(read, later.at, rules) || inbox.has(later.id),
        );
        const recorded = state.with({ inbox, inboxPosition });
        return noStep(recorded);
    }

    /** Saves a delivery whose holding may change, keeping the drivers' counts right. */
    private static saveDelivery(
        state: DeliveriesState,
        drivers: DriversState,
        delivery: OrderDeliveryVersion,
    ): ISaved {
        const before = state.deliveryVersions.get(delivery.orderId);
        const beforeHolding = holdingOf(before);
        const afterHolding = holdingOf(delivery);
        const changed = DriversState.changeHolding(drivers, beforeHolding, afterHolding);
        return { state: state.withDeliveryVersion(delivery), drivers: changed };
    }

    private static ineligible(
        drivers: DriversState,
        driver: DriverVersion,
        restaurant: RestaurantPlace,
        now: IInstant,
        values: DriversRules,
    ): IneligibleReason | null {
        const location = driver.location;
        return ineligibleReason(
            {
                isInRestaurantsArea: driver.areaId === restaurant.areaId,
                isOnline: driver.availability !== null,
                locationAgeMs: location === null ? null : now.since(location.deviceTime),
                distanceMetres:
                    location === null
                        ? null
                        : location.coordinates.straightLineMetresTo(restaurant.coordinates),
                pickedUpOrders: drivers.pickedUpOrdersOf(driver.driverId),
            },
            values,
        );
    }

    private static rankEligible(
        drivers: DriversState,
        restaurant: RestaurantPlace,
        now: IInstant,
        values: DriversRules,
    ): List<IRankedDriver> {
        return drivers.driverVersions
            .valueSeq()
            .toList()
            .flatMap((driver) => {
                const { location, availability } = driver;
                if (
                    location === null ||
                    availability === null ||
                    DeliveriesState.ineligible(drivers, driver, restaurant, now, values) !== null
                ) {
                    return [];
                }
                const distance = location.coordinates.straightLineMetresTo(restaurant.coordinates);
                const held = drivers.heldOrdersOf(driver.driverId);
                return [
                    {
                        driverId: driver.driverId,
                        score: rankScore(distance, held, availability, values),
                    },
                ];
            });
    }

    private static record(state: DeliveriesState, call: IEventCall, link: IEventLink): IRecorded {
        const { delivery, kind, at, driverId } = call;
        const events = state.eventsOf(delivery.orderId);
        const event = DeliveryEventRecord.create({
            id: toDeliveryEventId(`${delivery.orderDeliveryId}:${events.size + 1}`),
            orderDeliveryId: delivery.orderDeliveryId,
            orderId: delivery.orderId,
            kind,
            at,
            driverId,
            ordersEventId: link.ordersEventId,
        });
        const outboxEvent = DeliveriesOutboxEvent.create({
            id: toDeliveriesOutboxEventId(`deliveries-outbox-${state.outbox.size + 1}`),
            eventId: event.id,
            orderDeliveryId: delivery.orderDeliveryId,
            orderId: delivery.orderId,
            kind,
            at,
            driverId,
            wasStartedByDeliveries: link.wasStartedByDeliveries,
        });
        const withEvent = events.push(event);
        const recorded = state.with({
            eventsByOrder: state.eventsByOrder.set(delivery.orderId, withEvent),
            outbox: state.outbox.push(outboxEvent),
        });
        return {
            state: recorded,
            reports: List<DeliveriesReport>([
                { kind: DeliveriesReportKind.EventRecorded, event },
                { kind: DeliveriesReportKind.OutboxWritten, event: outboxEvent },
            ]),
            event,
        };
    }

    /**
     * Orders decides these, so this only checks the driver holds the order, and asks for the
     * call.
     */
    private static askOrders(
        state: DeliveriesState,
        call: Omit<ICallOrders, 'kind'>,
    ): DriverCallResult {
        const delivery = state.deliveryVersions.get(call.orderId);
        if (delivery === undefined) {
            return { isOk: false, refusal: DriverRefusalCode.UnknownOrder };
        }
        if (delivery.driverId !== call.driverId) {
            return { isOk: false, refusal: DriverRefusalCode.NotTheAssignedDriver };
        }
        const followUp: ICallOrders = {
            kind: FollowUpKind.CallOrders,
            at: call.at,
            orderId: call.orderId,
            driverId: call.driverId,
            eventKind: call.eventKind,
        };
        return { isOk: true, ...noStep(state), followUps: List.of(followUp) };
    }

    /** Every event updates the copy. Only an event with no match here also adds one. */
    private static applyOrdersEvent(
        { state, drivers }: ISaved,
        now: IInstant,
        event: OrdersOutboxEvent,
        delivery: OrderDeliveryVersion,
    ): IDeliveriesAndDriversStep {
        const orderCopy = delivery.orderCopy.withEvent(
            event.eventId,
            event.orderVersion,
            event.orderStatus,
        );
        const updated = delivery.next({ orderCopy });
        const withCopy = state.withDeliveryVersion(updated);
        const isRecorded = withCopy
            .eventsOf(event.orderId)
            .some((own) => withCopy.ordersEventOf(own) === event.eventId);
        if (isRecorded) {
            return { ...noStep(withCopy), drivers };
        }
        if (event.startedEventId !== null) {
            const linked = withCopy.withOrdersEventLink(
                event.orderId,
                event.startedEventId,
                event.eventId,
            );
            return { ...noStep(linked), drivers };
        }
        if (event.kind !== DeliveryEventKind.OrderReady && !changesState(event.kind)) {
            throw new Error(`Deliveries does not handle ${event.kind} yet.`);
        }
        const changed = changesState(event.kind)
            ? updated.inState(STATE_AFTER[event.kind])
            : updated.inState(updated.state);
        const saved = DeliveriesState.saveDelivery(withCopy, drivers, changed);
        const call = { delivery: changed, kind: event.kind, at: now, driverId: event.driverId };
        const recorded = DeliveriesState.record(saved.state, call, {
            ordersEventId: event.eventId,
            wasStartedByDeliveries: false,
        });
        return {
            state: recorded.state,
            drivers: saved.drivers,
            reports: recorded.reports,
            followUps: List(),
        };
    }

    declare private readonly brand: never;

    private constructor(
        readonly deliveries: OrderedMap<OrderId, OrderDelivery>,
        /** Each delivery's latest version. */
        readonly deliveryVersions: OrderedMap<OrderId, OrderDeliveryVersion>,
        /** Each order's events, oldest first. */
        readonly eventsByOrder: OrderedMap<OrderId, List<DeliveryEventRecord>>,
        /**
         * The orders event matching an event, found after it was recorded. Events themselves
         * never change.
         */
        readonly ordersEventLinks: OrderedMap<DeliveryEventId, OrderEventId>,
        readonly outbox: List<DeliveriesOutboxEvent>,
        readonly inbox: OrderedMap<OrdersOutboxEventId, IInstant>,
        readonly inboxPosition: InboxPosition,
        /** The notifications sent about each order, oldest first. */
        readonly notificationsByOrder: OrderedMap<OrderId, List<Notification>>,
        /** Each notification's latest version. */
        readonly notificationVersions: OrderedMap<NotificationId, NotificationVersion>,
        readonly nextDelivery: Count,
    ) {
        Object.freeze(this);
    }

    /** The part of an order's delivery that never changes, if it has one. */
    deliveryOf(orderId: OrderId): OrderDelivery | undefined {
        return this.deliveries.get(orderId);
    }

    /** The latest version of an order's delivery, if it has one. */
    deliveryVersionOf(orderId: OrderId): OrderDeliveryVersion | undefined {
        return this.deliveryVersions.get(orderId);
    }

    /** The events recorded for an order, oldest first. */
    eventsOf(orderId: OrderId): List<DeliveryEventRecord> {
        return this.eventsByOrder.get(orderId) ?? List();
    }

    /** The notifications sent about an order, oldest first. */
    notificationsOf(orderId: OrderId): List<Notification> {
        return this.notificationsByOrder.get(orderId) ?? List();
    }

    /** What the notification rules need of the notifications sent about an order, oldest first. */
    pastNotificationsOf(orderId: OrderId): List<IPastNotification> {
        return this.notificationsOf(orderId).map((notification) => {
            const notificationVersion = this.notificationVersions.get(notification.id);
            return {
                driverId: notification.driverId,
                at: notification.at,
                isOutstanding: required(
                    notificationVersion,
                    `the version of notification ${notification.id}`,
                ).isOutstanding,
            };
        });
    }

    /**
     * The orders event matching an event: the one known when it was recorded, or the one linked
     * since.
     */
    ordersEventOf(event: DeliveryEventRecord): OrderEventId | null {
        return this.ordersEventLinks.get(event.id) ?? event.ordersEventId;
    }

    /**
     * Saves a delivery's latest version. A change that may move who holds it goes through
     * `saveDelivery`, which keeps the drivers' counts right.
     */
    private withDeliveryVersion(delivery: OrderDeliveryVersion): DeliveriesState {
        return this.with({
            deliveryVersions: this.deliveryVersions.set(delivery.orderId, delivery),
        });
    }

    /** Links an event to its match in orders, leaving the event itself as it was recorded. */
    private withOrdersEventLink(
        orderId: OrderId,
        eventId: DeliveryEventId,
        ordersEventId: OrderEventId,
    ): DeliveriesState {
        const own = this.eventsOf(orderId).find((recorded) => recorded.id === eventId);
        const event = required(own, `delivery event ${eventId}`);
        return this.with({ ordersEventLinks: this.ordersEventLinks.set(event.id, ordersEventId) });
    }

    /** The state with some of its records replaced. */
    private with(changes: Partial<FieldsOf<DeliveriesState>>): DeliveriesState {
        const fields = this.fields();
        return DeliveriesState.create({ ...fields, ...changes });
    }

    private fields(): FieldsOf<DeliveriesState> {
        return {
            deliveries: this.deliveries,
            deliveryVersions: this.deliveryVersions,
            eventsByOrder: this.eventsByOrder,
            ordersEventLinks: this.ordersEventLinks,
            outbox: this.outbox,
            inbox: this.inbox,
            inboxPosition: this.inboxPosition,
            notificationsByOrder: this.notificationsByOrder,
            notificationVersions: this.notificationVersions,
            nextDelivery: this.nextDelivery,
        };
    }
}

const noStep = (state: DeliveriesState): IDeliveriesStep => ({
    state,
    reports: List(),
    followUps: List(),
});
