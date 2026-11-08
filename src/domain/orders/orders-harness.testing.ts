import type { List } from 'immutable';
import { List as ImmutableList } from 'immutable';

import type { OrdersRules } from './orders-rules';
import { deepFrozen } from '../system/classes/deep-freeze.testing';
import type { DeliveryHandoff } from '../drivers/deliveries/delivery-handoff';
import type { RestaurantPlace } from '../restaurants/restaurant-place';
import type { DriverId } from '../drivers/driver';
import type { OrderDeliveryId } from '../drivers/deliveries/order-delivery';
import type { OrderId } from './order';
import type { DeliveriesOutboxEvent } from '../drivers/deliveries/deliveries-outbox-event';
import type { DeliveriesEventCopy } from './deliveries-event-copy';
import type { DeliveryCopyVersion } from './delivery-copy';
import type { Order, OrderVersion } from './order';
import type { OrderEventRecord } from './order-event-record';
import type { OrdersOutboxEvent } from './orders-outbox-event';
import type { OrdersReport } from './orders-report';
import { OrdersReportKind } from './orders-report';
import { OrdersState } from './orders-state';
import type { IOrdersStep, OrderCommandResult } from './orders-state';
import { instantAt } from '../system/time/instant.testing';

/** Keeps what orders reports, for a test to look at. */
export class RecordingOrdersReports {
    readonly created: { at: number; order: Order; version: OrderVersion }[] = [];
    readonly recorded: { event: OrderEventRecord; version: OrderVersion }[] = [];
    readonly written: OrdersOutboxEvent[] = [];
    readonly read: { at: number; id: string }[] = [];

    note(reports: List<OrdersReport>): void {
        reports.forEach((report) => {
            this.noteOne(report);
        });
    }

    private noteOne(report: OrdersReport): void {
        if (report.kind === OrdersReportKind.OrderCreated) {
            this.created.push({
                at: report.at.sinceStart.milliseconds,
                order: report.order,
                version: report.version,
            });
        } else if (report.kind === OrdersReportKind.EventRecorded) {
            this.recorded.push({ event: report.event, version: report.version });
        } else if (report.kind === OrdersReportKind.OutboxWritten) {
            this.written.push(report.event);
        } else {
            this.read.push({ at: report.at.sinceStart.milliseconds, id: report.event.id });
            this.note(report.caused);
        }
    }
}

/** Stands in for deliveries: answers handoffs as told, and holds an outbox for orders to read. */
export class FakeDeliveriesForOrders {
    answer: OrderDeliveryId | null = null;
    readonly handoffs: DeliveryHandoff[] = [];
    outbox: DeliveriesOutboxEvent[] = [];
}

/**
 * Plays the simulation engine's part for orders in tests. It holds the latest state, carries out
 * the follow-ups, and deep-freezes each state it passes in, so any attempt to change one throws.
 */
export class OrdersHarness {
    private state: OrdersState;

    /** The first outbox event the next read has to look at. */
    get inboxScanFrom(): number {
        return this.state.inboxPosition.scanFrom;
    }

    constructor(
        private readonly reports: RecordingOrdersReports,
        private readonly deliveries: FakeDeliveriesForOrders,
        private readonly values: OrdersRules,
    ) {
        this.state = OrdersState.createNew();
    }

    order(id: OrderId): OrderVersion | undefined {
        return this.state.orderVersionOf(id);
    }

    eventsOf(id: OrderId): OrderEventRecord[] {
        return this.state.eventsOf(id).toArray();
    }

    outboxEvents(): OrdersOutboxEvent[] {
        return this.state.outbox.toArray();
    }

    deliveryCopy(
        id: OrderId,
    ): { orderDeliveryId: OrderDeliveryId; events: DeliveriesEventCopy[] } | undefined {
        const copy = this.state.deliveryCopyOf(id);
        const version = this.state.deliveryCopyVersionOf(id);
        return copy === undefined || version === undefined
            ? undefined
            : { orderDeliveryId: copy.orderDeliveryId, events: version.events.toArray() };
    }

    deliveryCopyVersion(id: OrderId): DeliveryCopyVersion | undefined {
        return this.state.deliveryCopyVersionOf(id);
    }

    latestEventOf(id: OrderId): OrderEventRecord | undefined {
        return this.state.latestEventOf(id);
    }

    createOrder(at: number, restaurant: RestaurantPlace): Order {
        const state = deepFrozen(this.state);
        const secondAt = instantAt(at);
        const created = OrdersState.createOrder(state, secondAt, restaurant);
        this.take(created, at);
        return created.order;
    }

    requestDelivery(at: number, id: OrderId): OrderCommandResult {
        const state = deepFrozen(this.state);
        const secondAt = instantAt(at);
        const requestDelivery = OrdersState.requestDelivery(state, secondAt, id);
        return this.finish(requestDelivery, at, id);
    }

    markReady(at: number, id: OrderId): OrderCommandResult {
        const state = deepFrozen(this.state);
        const secondAt = instantAt(at);
        const markReady = OrdersState.markReady(state, secondAt, id);
        return this.finish(markReady, at, id);
    }

    pickUp(at: number, id: OrderId, driverId: DriverId): OrderCommandResult {
        const state = deepFrozen(this.state);
        const secondAt = instantAt(at);
        const pickUp = OrdersState.pickUp(state, secondAt, id, driverId);
        return this.finish(pickUp, at, id);
    }

    deliver(at: number, id: OrderId, driverId: DriverId): OrderCommandResult {
        const state = deepFrozen(this.state);
        const secondAt = instantAt(at);
        const deliver = OrdersState.deliver(state, secondAt, id, driverId);
        return this.finish(deliver, at, id);
    }

    retryHandoffs(now: number): void {
        const state = deepFrozen(this.state);
        const secondNow = instantAt(now);
        const step = OrdersState.retryHandoffs(state, secondNow, this.values);
        this.take(step, now);
    }

    readDeliveriesOutbox(now: number): void {
        const outbox = ImmutableList(this.deliveries.outbox);
        const state = deepFrozen(this.state);
        OrdersState.dueDeliveriesEvents(state, outbox, this.values).forEach((event) => {
            const state = deepFrozen(this.state);
            const time = instantAt(now);
            const step = OrdersState.readDeliveriesEvent(state, time, event);
            this.take(step, time.sinceStart.milliseconds);
            const ordersState = deepFrozen(this.state);
            const recordDeliveriesEventRead = OrdersState.recordDeliveriesEventRead(
                ordersState,
                event,
                outbox,
                this.values,
            );
            this.take(recordDeliveriesEventRead, now);
        });
    }

    private take(step: IOrdersStep, at: number): void {
        this.state = step.state;
        this.reports.note(step.reports);
        step.followUps.forEach((followUp) => {
            this.deliveries.handoffs.push(followUp.handoff);
            const state = deepFrozen(this.state);
            const time = instantAt(at);
            const answered = OrdersState.completeHandoff(
                state,
                time,
                followUp.handoff.orderId,
                this.deliveries.answer,
            );
            this.state = answered.state;
            this.reports.note(answered.reports);
        });
    }

    private finish(result: OrderCommandResult, at: number, orderId: OrderId): OrderCommandResult {
        if (!result.isOk) {
            return result;
        }
        this.take(result, at);
        return { ...result, version: this.order(orderId) ?? result.version };
    }
}
