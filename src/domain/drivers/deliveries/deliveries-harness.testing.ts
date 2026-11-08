import type { List } from 'immutable';
import { List as ImmutableList } from 'immutable';

import type { DeliveriesRules } from './deliveries-rules';
import type { DriversRules } from '../drivers-rules';
import { deepFrozen } from '../../system/classes/deep-freeze.testing';
import type { DriverId } from '../driver';
import type { NotificationId } from './notification';
import type { OrderDeliveryId } from './order-delivery';
import type { OrderEventId } from '../../orders/order-event-id';
import type { OrderId } from '../../orders/order';
import type { ICallOrders } from './call-orders';
import type { DeliveriesOutboxEvent } from './deliveries-outbox-event';
import type { DeliveriesReport } from './deliveries-report';
import { DeliveriesReportKind } from './deliveries-report';
import { DeliveriesState } from './deliveries-state';
import type {
    DriverCallResult,
    IDeliveriesAndDriversStep,
    IDeliveriesStep,
} from './deliveries-state';
import type { DeliveryEventRecord } from './delivery-event-record';
import type { DeliveryHandoff } from './delivery-handoff';
import type { DriverCommandResult } from './deliveries-state';
import type { DriverVersion, NewDriver } from '../driver';
import { DriversState } from '../drivers-state';
import type { Notification, NotificationVersion } from './notification';
import type { OrderDelivery, OrderDeliveryVersion } from './order-delivery';
import type { OrdersAnswer } from './orders-answer';
import type { OrdersOutboxEvent } from '../../orders/orders-outbox-event';
import { instantAt } from '../../system/time/instant.testing';

/** Keeps what deliveries reports, for a test to look at. */
export class RecordingDeliveriesReports {
    readonly events: DeliveryEventRecord[] = [];
    readonly notifications: Notification[] = [];
    readonly written: DeliveriesOutboxEvent[] = [];
    readonly read: string[] = [];

    note(reports: List<DeliveriesReport>): void {
        reports.forEach((report) => {
            this.noteOne(report);
        });
    }

    private noteOne(report: DeliveriesReport): void {
        if (report.kind === DeliveriesReportKind.EventRecorded) {
            this.events.push(report.event);
        } else if (report.kind === DeliveriesReportKind.OutboxWritten) {
            this.written.push(report.event);
        } else if (report.kind === DeliveriesReportKind.NotificationSent) {
            this.notifications.push(report.notification);
        } else {
            this.read.push(report.event.id);
            this.note(report.caused);
        }
    }
}

/** Stands in for orders: answers calls as told, and holds an outbox for deliveries to read. */
export class FakeOrdersForDeliveries {
    answer: OrdersAnswer;
    readonly calls: string[] = [];
    outbox: OrdersOutboxEvent[] = [];

    constructor(eventId: OrderEventId) {
        this.answer = { isOk: true, eventId };
    }
}

/** A driver's command that went ahead, with the event it recorded. */
type DoneCommand =
    | { readonly isOk: true; readonly event: DeliveryEventRecord | null }
    | Extract<DriverCommandResult, { isOk: false }>;

/** What a command or a call to orders came to, either of which may refuse. */
type DriverResult = DriverCommandResult | DriverCallResult;

/**
 * Plays the simulation engine's part for deliveries in tests. It holds the latest state, carries
 * out the follow-ups, and deep-freezes each state it passes in, so any attempt to change one
 * throws.
 */
export class DeliveriesHarness {
    private state: DeliveriesState;
    private drivers: DriversState;

    /** The first outbox event the next read has to look at. */
    get inboxScanFrom(): number {
        return this.state.inboxPosition.scanFrom;
    }

    constructor(
        private readonly reports: RecordingDeliveriesReports,
        private readonly orders: FakeOrdersForDeliveries,
        private readonly driversRules: DriversRules,
        private readonly communicationValues: DeliveriesRules,
    ) {
        this.state = DeliveriesState.createNew();
        this.drivers = DriversState.createNew();
    }

    /**
     * How many orders a driver holds and has picked up: first as counted, then from the deliveries
     * themselves.
     */
    driverCounts(id: DriverId): { held: number[]; pickedUp: number[] } {
        const mine = this.state.deliveryVersions
            .valueSeq()
            .filter((delivery) => delivery.driverId === id);
        const inState = (name: string): number =>
            mine.count((delivery) => delivery.state === name);
        return {
            held: [this.drivers.heldOrdersOf(id), inState('Assigned') + inState('PickedUp')],
            pickedUp: [this.drivers.pickedUpOrdersOf(id), inState('PickedUp')],
        };
    }

    delivery(id: OrderId): OrderDeliveryVersion | undefined {
        return this.state.deliveryVersionOf(id);
    }

    deliveryPlace(id: OrderId): OrderDelivery | undefined {
        return this.state.deliveryOf(id);
    }

    driverVersion(id: DriverId): DriverVersion | undefined {
        return this.drivers.versionOf(id);
    }

    notificationVersion(id: NotificationId): NotificationVersion | undefined {
        return this.state.notificationVersions.get(id);
    }

    eventsOf(id: OrderId): DeliveryEventRecord[] {
        return this.state.eventsOf(id).toArray();
    }

    notificationsOf(id: OrderId): Notification[] {
        return this.state.notificationsOf(id).toArray();
    }

    /**
     * The orders event that an event of this order is matched with, by its position among them.
     */
    ordersEventOf(id: OrderId, position: number): OrderEventId | null | undefined {
        const event = this.state.eventsOf(id).get(position);
        return event === undefined ? undefined : this.state.ordersEventOf(event);
    }

    outboxEvents(): DeliveriesOutboxEvent[] {
        return this.state.outbox.toArray();
    }

    addDriver(driver: NewDriver): void {
        const drivers = deepFrozen(this.drivers);
        this.drivers = DriversState.addDriver(drivers, driver);
    }

    receiveDeliveryRequest(at: number, handoff: DeliveryHandoff): OrderDeliveryId {
        const state = deepFrozen(this.state);
        const secondAt = instantAt(at);
        const received = DeliveriesState.receiveDeliveryRequest(state, secondAt, handoff);
        this.take(received);
        return received.orderDeliveryId;
    }

    dispatchPass(now: number): void {
        const state = deepFrozen(this.state);
        DeliveriesState.openRequests(state).forEach((orderId) => {
            const state = deepFrozen(this.state);
            const time = instantAt(now);
            const drivers = deepFrozen(this.drivers);
            const step = DeliveriesState.notifyNextDriver(
                state,
                drivers,
                orderId,
                time,
                this.driversRules,
            );
            this.take(step);
        });
    }

    acceptRequest(at: number, id: OrderId, driverId: DriverId): DoneCommand {
        const state = deepFrozen(this.state);
        const secondAt = instantAt(at);
        const drivers = deepFrozen(this.drivers);
        const acceptRequest = DeliveriesState.acceptRequest(
            state,
            drivers,
            secondAt,
            id,
            driverId,
            this.driversRules,
        );
        return this.finish(acceptRequest);
    }

    pickUp(at: number, id: OrderId, driverId: DriverId): DoneCommand {
        const state = deepFrozen(this.state);
        const secondAt = instantAt(at);
        const pickUp = DeliveriesState.pickUp(state, secondAt, id, driverId);
        return this.finish(pickUp);
    }

    deliver(at: number, id: OrderId, driverId: DriverId): DoneCommand {
        const state = deepFrozen(this.state);
        const secondAt = instantAt(at);
        const deliver = DeliveriesState.deliver(state, secondAt, id, driverId);
        return this.finish(deliver);
    }

    readOrdersOutbox(now: number): void {
        const outbox = ImmutableList(this.orders.outbox);
        const state = deepFrozen(this.state);
        DeliveriesState.dueOrdersEvents(state, outbox, this.communicationValues).forEach(
            (event) => {
                const state = deepFrozen(this.state);
                const time = instantAt(now);
                const drivers = deepFrozen(this.drivers);
                const step = DeliveriesState.readOrdersEvent(state, drivers, time, event);
                this.take(step);
                const deliveriesState = deepFrozen(this.state);
                const recordOrdersEventRead = DeliveriesState.recordOrdersEventRead(
                    deliveriesState,
                    event,
                    outbox,
                    this.communicationValues,
                );
                this.take(recordOrdersEventRead);
            },
        );
    }

    private take(step: IDeliveriesStep | IDeliveriesAndDriversStep): void {
        this.state = step.state;
        if ('drivers' in step) {
            this.drivers = step.drivers;
        }
        this.reports.note(step.reports);
    }

    private callOrders(call: ICallOrders): DoneCommand {
        const verb = call.eventKind === 'OrderPickedUp' ? 'pickUp' : 'deliver';
        const at = call.at.sinceStart.milliseconds;
        this.orders.calls.push(`${verb} ${at} ${call.orderId} ${call.driverId}`);
        const state = deepFrozen(this.state);
        const drivers = deepFrozen(this.drivers);
        const answerFromOrders = DeliveriesState.answerFromOrders(
            state,
            drivers,
            call,
            this.orders.answer,
        );
        return this.finish(answerFromOrders);
    }

    private finish(result: DriverResult): DoneCommand {
        if (!result.isOk) {
            return result;
        }
        this.take(result);
        const call = result.followUps.first();
        const event = 'event' in result ? result.event : null;
        return call === undefined ? { isOk: true, event } : this.callOrders(call);
    }
}
