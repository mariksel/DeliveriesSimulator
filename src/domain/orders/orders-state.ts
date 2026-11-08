import { List, OrderedMap } from 'immutable';

import { isReadByOrders, mayRetryAnother } from './orders-communication';
import type { OrdersRules } from './orders-rules';
import { FINAL_ORDER_STATUSES } from './final-order-statuses';
import { DeliveryHandoff } from '../drivers/deliveries/delivery-handoff';
import type { DeliveriesOutboxEvent } from '../drivers/deliveries/deliveries-outbox-event';
import { FollowUpKind } from '../drivers/deliveries/follow-up-kind';
import type { RestaurantPlace } from '../restaurants/restaurant-place';
import type { FieldsOf } from '../system/classes/fields-of';
import type { DeliveryEventId } from '../drivers/deliveries/delivery-event-id';
import type { DriverId } from '../drivers/driver';
import type { OrderDeliveryId } from '../drivers/deliveries/order-delivery';
import type { OrderId } from './order';
import { toOrderEventId } from './order-event-id';
import { toOrderId } from './order';
import { InboxPosition } from '../system/messaging/inbox-position';
import { required } from '../system/validation/required';
import { DeliveriesEventCopy } from './deliveries-event-copy';
import { DeliveryCopy, DeliveryCopyVersion } from './delivery-copy';
import type { OrderChange } from './order';
import { Order, OrderVersion } from './order';
import { OrderEventKind } from './order-event-kind';
import { OrderEventRecord } from './order-event-record';
import { OrderRefusal } from './order-refusal';
import { OrdersOutboxEvent } from './orders-outbox-event';
import type { OrdersReport } from './orders-report';
import { OrdersReportKind } from './orders-report';
import type { ISendHandoff } from './send-handoff';
import type { Count } from '../system/math/math';
import type { IInstant } from '../system/time/instant';
import { plusOne, toCount } from '../system/math/math';
import { toOrdersOutboxEventId } from './orders-outbox-event';
import type { DeliveriesOutboxEventId } from '../drivers/deliveries/deliveries-outbox-event';

/**
 * What a step of orders comes to: the new state, what it did, and what the engine must still do.
 */
export interface IOrdersStep {
    readonly state: OrdersState;
    readonly reports: List<OrdersReport>;
    readonly followUps: List<ISendHandoff>;
}

/** A command on an order that went ahead: the step, and the order as it now stands. */
export interface IOrderCommandDone extends IOrdersStep {
    readonly isOk: true;
    readonly version: OrderVersion;
}

/** How a command on an order ended: the step it made, or a refusal. */
export type OrderCommandResult =
    IOrderCommandDone | { readonly isOk: false; readonly refusal: OrderRefusal };

/** How many orders have reached a final state, of all the orders so far. */
export interface IOrderProgress {
    readonly finished: Count;
    readonly total: Count;
}

/** An order created: the step, and the new order. */
export interface IOrderCreated extends IOrdersStep {
    readonly order: Order;
    readonly version: OrderVersion;
}

interface IChangeOptions {
    readonly shouldWriteOutbox?: boolean;
    readonly deliveriesEventId?: DeliveryEventId;
}

/** What one change to an order is: when, which order, what kind of event, and by whom. */
interface IOrderChangeCall {
    readonly at: IInstant;
    readonly orderId: OrderId;
    readonly kind: OrderEventKind;
    readonly driverId: DriverId | null;
}

/**
 * The orders module of one run: its records. Its commands are its static methods, each taking the
 * state and giving the step it makes.
 */
export class OrdersState {
    /** Orders at the start of a run, with nothing in it. */
    static createNew(): OrdersState {
        return OrdersState.create({
            orders: OrderedMap(),
            orderVersions: OrderedMap(),
            restaurants: OrderedMap(),
            eventsByOrder: OrderedMap(),
            outbox: List(),
            inbox: OrderedMap(),
            inboxPosition: InboxPosition.createNew(),
            copies: OrderedMap(),
            copyVersions: OrderedMap(),
            nextOrder: toCount(1),
        });
    }

    /** Orders from its records. The next order's number is from 1. */
    static create(fields: FieldsOf<OrdersState>): OrdersState {
        if (fields.nextOrder < 1) {
            throw new RangeError(`Invalid next order number: ${fields.nextOrder}.`);
        }
        return new OrdersState(
            fields.orders,
            fields.orderVersions,
            fields.restaurants,
            fields.eventsByOrder,
            fields.outbox,
            fields.inbox,
            fields.inboxPosition,
            fields.copies,
            fields.copyVersions,
            fields.nextOrder,
        );
    }

    /** Creates an order for a restaurant. */
    static createOrder(
        state: OrdersState,
        at: IInstant,
        restaurant: RestaurantPlace,
    ): IOrderCreated {
        const id = toOrderId(`order-${state.nextOrder}`);
        const order = Order.create({ id, restaurantId: restaurant.id });
        const version = OrderVersion.createNew(order.id);
        const created = state.with({
            orders: state.orders.set(order.id, order),
            orderVersions: state.orderVersions.set(order.id, version),
            restaurants: state.restaurants.set(order.id, restaurant),
            nextOrder: plusOne(state.nextOrder),
        });
        return {
            state: created,
            reports: List.of<OrdersReport>({
                kind: OrdersReportKind.OrderCreated,
                at,
                order,
                version,
            }),
            followUps: List(),
            order,
            version,
        };
    }

    /**
     * Saves the request as pending, and asks for the handoff to deliveries. A failed handoff stays
     * pending.
     */
    static requestDelivery(
        state: OrdersState,
        at: IInstant,
        orderId: OrderId,
    ): OrderCommandResult {
        const call = { at, orderId, kind: OrderEventKind.OrderDeliveryRequest, driverId: null };
        const requested = OrdersState.applyChange(
            state,
            call,
            (version) => version.requestDelivery(),
            {
                shouldWriteOutbox: false,
            },
        );
        if (!requested.isOk) {
            return requested;
        }
        const handoff = OrdersState.handoffFor(requested.state, at, requested.version);
        return { ...requested, followUps: List.of(handoff) };
    }

    /**
     * Finishes a handoff with what deliveries answered: its order delivery's ID, or null on a
     * transient failure.
     */
    static completeHandoff(
        state: OrdersState,
        at: IInstant,
        orderId: OrderId,
        orderDeliveryId: OrderDeliveryId | null,
    ): IOrdersStep {
        if (orderDeliveryId === null) {
            return noStep(state);
        }
        const orderVersion = state.orderVersions.get(orderId);
        const version = required(orderVersion, `order ${orderId}`);
        const completed = version.completeDeliveryRequest();
        if (!completed.isAllowed) {
            throw new Error(`Handoff of ${orderId} refused: ${completed.refusal}.`);
        }
        const requestEvent = OrdersState.requestEventOf(state, orderId);
        const copy = DeliveryCopy.create({ orderId, orderDeliveryId });
        const copyVersion = DeliveryCopyVersion.createNew(orderId);
        const handedOff = state.with({
            orderVersions: state.orderVersions.set(orderId, completed.version),
            copies: state.copies.set(orderId, copy),
            copyVersions: state.copyVersions.set(orderId, copyVersion),
        });
        const written = OrdersState.writeOutbox(
            handedOff,
            at,
            requestEvent,
            completed.version,
            null,
        );
        return { state: written.state, reports: List.of(written.report), followUps: List() };
    }

    /** Records that an order is ready. */
    static markReady(state: OrdersState, at: IInstant, orderId: OrderId): OrderCommandResult {
        const call = { at, orderId, kind: OrderEventKind.OrderReady, driverId: null };
        return OrdersState.applyChange(state, call, (version) => version.markReady());
    }

    /** A driver picks an order up. The engine calls this when deliveries asks. */
    static pickUp(
        state: OrdersState,
        at: IInstant,
        orderId: OrderId,
        driverId: DriverId,
    ): OrderCommandResult {
        const call = { at, orderId, kind: OrderEventKind.OrderPickedUp, driverId };
        return OrdersState.applyChange(state, call, (version) => version.pickUp(driverId));
    }

    /** A driver delivers an order. The engine calls this when deliveries asks. */
    static deliver(
        state: OrdersState,
        at: IInstant,
        orderId: OrderId,
        driverId: DriverId,
    ): OrderCommandResult {
        const call = { at, orderId, kind: OrderEventKind.OrderDelivered, driverId };
        return OrdersState.applyChange(state, call, (version) => version.deliver(driverId));
    }

    /** The job that retries every delivery request still pending, up to the limit in one run. */
    static retryHandoffs(state: OrdersState, now: IInstant, rules: OrdersRules): IOrdersStep {
        const pending = state.orderVersions
            .valueSeq()
            .filter((version) => version.isDeliveryRequestPending)
            .takeWhile((_version, index) => {
                const retried = toCount(index);
                return mayRetryAnother(retried, rules);
            });
        return {
            ...noStep(state),
            followUps: pending
                .map((version) => OrdersState.handoffFor(state, now, version))
                .toList(),
        };
    }

    /**
     * What the orders inbox job has still to read of the deliveries outbox, which the engine
     * passes in.
     */
    static dueDeliveriesEvents(
        state: OrdersState,
        outbox: List<DeliveriesOutboxEvent>,
        rules: OrdersRules,
    ): List<DeliveriesOutboxEvent> {
        return outbox
            .slice(state.inboxPosition.scanFrom)
            .filter(
                (event) =>
                    isReadByOrders(state.inboxPosition, event.at, rules) &&
                    !state.inbox.has(event.id),
            );
    }

    /**
     * Reading an event, first transaction: what it changes here. A failure before the next one
     * reads it again.
     */
    static readDeliveriesEvent(
        state: OrdersState,
        now: IInstant,
        event: DeliveriesOutboxEvent,
    ): IOrdersStep {
        const applied = OrdersState.applyDeliveriesEvent(state, now, event);
        return {
            ...noStep(applied.state),
            reports: List.of<OrdersReport>({
                kind: OrdersReportKind.InboxRead,
                at: now,
                event,
                caused: applied.reports,
            }),
        };
    }

    /** Reading an event, second transaction: the inbox record, which finishes it. */
    static recordDeliveriesEventRead(
        state: OrdersState,
        event: DeliveriesOutboxEvent,
        outbox: List<DeliveriesOutboxEvent>,
        rules: OrdersRules,
    ): IOrdersStep {
        const inbox = state.inbox.set(event.id, event.at);
        const read = state.inboxPosition.withLatestRead(event.at);
        const inboxPosition = read.scannedTo(
            outbox,
            (later) => !isReadByOrders(read, later.at, rules) || inbox.has(later.id),
        );
        const recorded = state.with({ inbox, inboxPosition });
        return noStep(recorded);
    }

    private static writeOutbox(
        state: OrdersState,
        at: IInstant,
        event: OrderEventRecord,
        version: OrderVersion,
        startedEventId: DeliveryEventId | null,
    ): { readonly state: OrdersState; readonly report: OrdersReport } {
        const outboxEvent = OrdersOutboxEvent.create({
            id: toOrdersOutboxEventId(`orders-outbox-${state.outbox.size + 1}`),
            eventId: event.id,
            orderId: event.orderId,
            kind: event.kind,
            at,
            driverId: event.driverId,
            orderVersion: version.number,
            orderStatus: version.status,
            startedEventId,
        });
        return {
            state: state.with({ outbox: state.outbox.push(outboxEvent) }),
            report: { kind: OrdersReportKind.OutboxWritten, event: outboxEvent },
        };
    }

    private static applyChange(
        state: OrdersState,
        call: IOrderChangeCall,
        decide: (version: OrderVersion) => OrderChange,
        options: IChangeOptions = {},
    ): OrderCommandResult {
        const { at, orderId } = call;
        const version = state.orderVersions.get(orderId);
        if (version === undefined) {
            return { isOk: false, refusal: OrderRefusal.UnknownOrder };
        }
        const result = decide(version);
        if (!result.isAllowed) {
            return { isOk: false, refusal: result.refusal };
        }
        const event = OrderEventRecord.create({
            id: toOrderEventId(`${orderId}:${result.version.number}`),
            orderId,
            kind: call.kind,
            at,
            driverId: call.driverId,
            deliveriesEventId: options.deliveriesEventId ?? null,
        });
        const events = state.eventsOf(orderId).push(event);
        const changed = state.with({
            orderVersions: state.orderVersions.set(orderId, result.version),
            eventsByOrder: state.eventsByOrder.set(orderId, events),
        });
        const recorded: OrdersReport = {
            kind: OrdersReportKind.EventRecorded,
            event,
            version: result.version,
        };
        const done: IOrderCommandDone = {
            isOk: true,
            version: result.version,
            state: changed,
            reports: List.of(recorded),
            followUps: List(),
        };
        if (options.shouldWriteOutbox === false) {
            return done;
        }
        const startedEventId = options.deliveriesEventId ?? null;
        const written = OrdersState.writeOutbox(
            changed,
            at,
            event,
            result.version,
            startedEventId,
        );
        return { ...done, state: written.state, reports: done.reports.push(written.report) };
    }

    private static requestEventOf(state: OrdersState, orderId: OrderId): OrderEventRecord {
        const request = state
            .eventsOf(orderId)
            .find((event) => event.kind === OrderEventKind.OrderDeliveryRequest);
        return required(request, `the delivery request of ${orderId}`);
    }

    private static handoffFor(
        state: OrdersState,
        at: IInstant,
        version: OrderVersion,
    ): ISendHandoff {
        const restaurant = state.restaurants.get(version.orderId);
        const handoff = DeliveryHandoff.create({
            orderId: version.orderId,
            restaurant: required(restaurant, `the restaurant of ${version.orderId}`),
            requestEventId: OrdersState.requestEventOf(state, version.orderId).id,
            orderVersion: version.number,
            orderStatus: version.status,
        });
        return { kind: FollowUpKind.SendHandoff, at, handoff };
    }

    private static applyDeliveriesEvent(
        state: OrdersState,
        now: IInstant,
        event: DeliveriesOutboxEvent,
    ): IOrdersStep {
        const copy = state.copyVersions.get(event.orderId);
        if (copy === undefined) {
            throw new Error(`No delivery copy for ${event.orderId}.`);
        }
        const copied = DeliveriesEventCopy.createNew(event);
        const nextCopy = copy.withEvent(copied);
        const withCopy = state.with({
            copyVersions: state.copyVersions.set(event.orderId, nextCopy),
        });
        if (!event.wasStartedByDeliveries) {
            return noStep(withCopy);
        }
        const driverId = event.driverId;
        if (event.kind !== OrderEventKind.OrderDeliveryRequestAccepted || driverId === null) {
            throw new Error(`Orders does not handle ${event.kind} yet.`);
        }
        const call = {
            at: now,
            orderId: event.orderId,
            kind: OrderEventKind.OrderDeliveryRequestAccepted,
            driverId,
        };
        const result = OrdersState.applyChange(
            withCopy,
            call,
            (version) => version.acceptDeliveryRequest(driverId),
            { deliveriesEventId: event.eventId },
        );
        // Refusals and retries are off the happy path, and arrive with I04.
        if (!result.isOk) {
            throw new Error(`Orders refused ${event.eventId}: ${result.refusal}.`);
        }
        return { state: result.state, reports: result.reports, followUps: List() };
    }

    declare private readonly brand: never;

    private constructor(
        readonly orders: OrderedMap<OrderId, Order>,
        /** Each order's latest version. */
        readonly orderVersions: OrderedMap<OrderId, OrderVersion>,
        readonly restaurants: OrderedMap<OrderId, RestaurantPlace>,
        /** Each order's events, oldest first. */
        readonly eventsByOrder: OrderedMap<OrderId, List<OrderEventRecord>>,
        readonly outbox: List<OrdersOutboxEvent>,
        readonly inbox: OrderedMap<DeliveriesOutboxEventId, IInstant>,
        readonly inboxPosition: InboxPosition,
        readonly copies: OrderedMap<OrderId, DeliveryCopy>,
        /** The latest version of each copy. */
        readonly copyVersions: OrderedMap<OrderId, DeliveryCopyVersion>,
        readonly nextOrder: Count,
    ) {
        Object.freeze(this);
    }

    /** How far the run's orders have got. */
    progress(): IOrderProgress {
        const finished = this.orderVersions
            .valueSeq()
            .count((version) => FINAL_ORDER_STATUSES.includes(version.status));
        return { finished: toCount(finished), total: toCount(this.orderVersions.size) };
    }

    /** The part of an order that never changes, if it exists. */
    orderOf(id: OrderId): Order | undefined {
        return this.orders.get(id);
    }

    /** An order's latest version, if it exists. */
    orderVersionOf(id: OrderId): OrderVersion | undefined {
        return this.orderVersions.get(id);
    }

    /** The events recorded for an order, oldest first. */
    eventsOf(orderId: OrderId): List<OrderEventRecord> {
        return this.eventsByOrder.get(orderId) ?? List();
    }

    /** The part of orders' copy of an order's delivery that never changes, if it has one. */
    deliveryCopyOf(orderId: OrderId): DeliveryCopy | undefined {
        return this.copies.get(orderId);
    }

    /** The latest version of orders' copy of an order's delivery, if it has one. */
    deliveryCopyVersionOf(orderId: OrderId): DeliveryCopyVersion | undefined {
        return this.copyVersions.get(orderId);
    }

    /** The latest event recorded for an order, which a direct call answers with. */
    latestEventOf(orderId: OrderId): OrderEventRecord | undefined {
        return this.eventsOf(orderId).last();
    }

    /** The state with some of its records replaced. */
    private with(changes: Partial<FieldsOf<OrdersState>>): OrdersState {
        const fields = this.fields();
        return OrdersState.create({ ...fields, ...changes });
    }

    private fields(): FieldsOf<OrdersState> {
        return {
            orders: this.orders,
            orderVersions: this.orderVersions,
            restaurants: this.restaurants,
            eventsByOrder: this.eventsByOrder,
            outbox: this.outbox,
            inbox: this.inbox,
            inboxPosition: this.inboxPosition,
            copies: this.copies,
            copyVersions: this.copyVersions,
            nextOrder: this.nextOrder,
        };
    }
}

const noStep = (state: OrdersState): IOrdersStep => ({
    state,
    reports: List(),
    followUps: List(),
});
