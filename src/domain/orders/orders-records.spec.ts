import { List, OrderedMap } from 'immutable';
import { describe, expect, it } from 'vitest';

import { DeliveriesOutboxEvent } from '../drivers/deliveries/deliveries-outbox-event';
import { toDeliveryEventId } from '../drivers/deliveries/delivery-event-id';
import { toOrderDeliveryId } from '../drivers/deliveries/order-delivery';
import { toOrderEventId } from './order-event-id';
import { toOrderId } from './order';
import { InboxPosition } from '../system/messaging/inbox-position';
import { DeliveriesEventCopy } from './deliveries-event-copy';
import { DeliveryCopyVersion } from './delivery-copy';
import { OrderVersion } from './order';
import { OrderEventRecord } from './order-event-record';
import { OrdersOutboxEvent } from './orders-outbox-event';
import { OrdersState } from './orders-state';
import { toVersionNumber } from '../system/records/version-chain';
import { toCount } from '../system/math/math';
import { instantAt } from '../system/time/instant.testing';
import { toOrdersOutboxEventId } from './orders-outbox-event';
import { toDeliveriesOutboxEventId } from '../drivers/deliveries/deliveries-outbox-event';

const ORDER = toOrderId('order-1');

const event = (at: number): OrderEventRecord =>
    OrderEventRecord.create({
        id: toOrderEventId('order-1:2'),
        orderId: ORDER,
        kind: 'OrderReady',
        at: instantAt(at),
        driverId: null,
        deliveriesEventId: null,
    });

const outbox = (orderVersion: number): OrdersOutboxEvent =>
    OrdersOutboxEvent.create({
        id: toOrdersOutboxEventId('orders-outbox-1'),
        eventId: toOrderEventId('order-1:2'),
        orderId: ORDER,
        kind: 'OrderReady',
        at: instantAt(0),
        driverId: null,
        orderVersion: toVersionNumber(orderVersion),
        orderStatus: 'Created',
        startedEventId: null,
    });

const DELIVERIES_EVENT = DeliveriesOutboxEvent.create({
    id: toDeliveriesOutboxEventId('deliveries-outbox-1'),
    eventId: toDeliveryEventId('delivery-1:1'),
    orderDeliveryId: toOrderDeliveryId('delivery-1'),
    orderId: ORDER,
    kind: 'OrderReady',
    at: instantAt(5),
    driverId: null,
    wasStartedByDeliveries: false,
});

describe("orders' records", () => {
    it('cannot change once made', () => {
        const records = [
            event(0),
            outbox(1),
            OrderVersion.createNew(ORDER),
            OrdersState.createNew(),
        ];

        const frozen = records.map((record) => Object.isFrozen(record));
        expect(frozen).toEqual([true, true, true, true]);
    });

    it.each([-1, Number.NaN])('refuses an event at %s', (at) => {
        expect(() => event(at)).toThrow(RangeError);
    });

    it.each([0, 1.5])('refuses an outbox event carrying order version %s', (version) => {
        expect(() => outbox(version)).toThrow(RangeError);
    });

    it('compares and writes out an event by its fields', () => {
        const first = event(0);
        const same = event(0);
        const later = event(1);

        const isSame = first.equals(same);
        const isLaterSame = first.equals(later);
        expect(isSame).toBe(true);
        expect(isLaterSame).toBe(false);
        const written = first.digestPart();
        const sameWritten = same.digestPart();
        expect(written).toBe(sameWritten);
    });
});

describe("an order's versions", () => {
    it('starts at version 1, with nothing before it', () => {
        const first = OrderVersion.createNew(ORDER);

        expect(first).toMatchObject({ number: 1, previous: null, status: 'Created' });
    });

    it('links each change to the version before it', () => {
        const first = OrderVersion.createNew(ORDER);
        const change = first.markReady();

        const next = change.isAllowed ? change.version : null;
        expect(next).toMatchObject({ number: 2, isReady: true });
        expect(next?.previous).toBe(first);
        expect(first.isReady).toBe(false);
    });

    it.each<[string, number, boolean]>([
        ['a first version that is not number 1', 2, false],
        ['a later version that does not follow the one before', 3, true],
        ['a version in part', 1.5, false],
    ])('refuses %s', (_name, number, hasPrevious) => {
        const previous = hasPrevious ? OrderVersion.createNew(ORDER) : null;

        expect(() =>
            OrderVersion.create({
                orderId: ORDER,
                status: 'Created',
                isDeliveryRequestPending: false,
                isReady: false,
                driverId: null,
                number: toVersionNumber(number),
                previous,
            }),
        ).toThrow(RangeError);
    });
});

describe("orders' copy of a delivery", () => {
    it('keeps only what orders needs of an event it read', () => {
        const copy = DeliveriesEventCopy.createNew(DELIVERIES_EVENT);

        expect(copy).toBeInstanceOf(DeliveriesEventCopy);
        expect(copy).not.toHaveProperty('orderDeliveryId');
        expect(copy).toMatchObject({ id: 'deliveries-outbox-1', kind: 'OrderReady', at: 5 });
    });

    it('adds each event read as a new version', () => {
        const first = DeliveryCopyVersion.createNew(ORDER);
        const copy = DeliveriesEventCopy.createNew(DELIVERIES_EVENT);

        const next = first.withEvent(copy);

        expect(next).toMatchObject({ number: 2, previous: first });
        const events = next.events.toArray();
        expect(events).toEqual([copy]);
        expect(first.events.size).toBe(0);
    });
});

describe("orders' state", () => {
    it('refuses a next order number that is not a whole number from 1', () => {
        expect(() =>
            OrdersState.create({
                orders: OrderedMap(),
                orderVersions: OrderedMap(),
                restaurants: OrderedMap(),
                eventsByOrder: OrderedMap(),
                outbox: List(),
                inbox: OrderedMap(),
                inboxPosition: InboxPosition.createNew(),
                copies: OrderedMap(),
                copyVersions: OrderedMap(),
                nextOrder: toCount(0),
            }),
        ).toThrow(RangeError);
    });

    it('has no progress at the start of a run', () => {
        const state = OrdersState.createNew();

        const progress = state.progress();
        expect(progress).toEqual({ finished: 0, total: 0 });
    });
});
