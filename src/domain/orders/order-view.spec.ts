import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { toDriverId } from '../drivers/driver';
import type { DriverId } from '../drivers/driver';
import { TEST_MAKER } from '../system/records/maker.testing';
import { instantAt } from '../system/time/instant.testing';
import { OrderVersion, toOrderId } from './order';
import { toOrderEventId } from './order-event-id';
import type { OrderEventKind } from './order-event-kind';
import { OrderEventRecord } from './order-event-record';
import type { OrderChange } from './order-view';
import { OrderView } from './order-view';

const ORDER = toOrderId('order-1');
const DRIVER = toDriverId('driver-1');
const OTHER_DRIVER = toDriverId('driver-2');

/** A change allowed, which must be. */
function allowed(result: OrderChange): OrderVersion {
    if (!result.isAllowed) {
        throw new Error(`Refused: ${result.refusal}`);
    }
    return result.version;
}

/** An order: its view, with the events recorded so far. */
interface IOrder {
    readonly view: OrderView;
    readonly events: List<OrderEventRecord>;
}

/** The order after a change, with the event Orders records with it, if any. */
function changed(
    order: IOrder,
    change: (view: OrderView) => OrderChange,
    kind: OrderEventKind | null,
    driverId: DriverId | null = null,
): IOrder {
    const result = change(order.view);
    const version = allowed(result);
    const event =
        kind === null
            ? null
            : OrderEventRecord.create({
                  id: toOrderEventId(`${ORDER}:${version.number}`),
                  orderId: ORDER,
                  kind,
                  at: instantAt(0),
                  driverId,
                  deliveriesEventId: null,
              });
    const events = event === null ? order.events : order.events.push(event);
    return { view: OrderView.of(version, events), events };
}

function created(): IOrder {
    const version = OrderVersion.createNew(ORDER, TEST_MAKER);
    const events = List<OrderEventRecord>();
    return { view: OrderView.of(version, events), events };
}
function pending(): IOrder {
    const order = created();
    return changed(
        order,
        (view): OrderChange => view.requestDelivery(TEST_MAKER),
        'OrderDeliveryRequest',
    );
}
function requested(): IOrder {
    const order = pending();
    return changed(order, (view): OrderChange => view.completeDeliveryRequest(TEST_MAKER), null);
}
function assigned(): IOrder {
    const order = requested();
    return changed(
        order,
        (view): OrderChange => view.acceptDeliveryRequest(TEST_MAKER),
        'OrderDeliveryRequestAccepted',
        DRIVER,
    );
}
function assignedAndReady(): IOrder {
    const order = assigned();
    return changed(order, (view): OrderChange => view.markReady(TEST_MAKER), 'OrderReady');
}
function pickedUp(): IOrder {
    const order = assignedAndReady();
    return changed(
        order,
        (view): OrderChange => view.pickUp(DRIVER, TEST_MAKER),
        'OrderPickedUp',
        DRIVER,
    );
}
function delivered(): IOrder {
    const order = pickedUp();
    return changed(
        order,
        (view): OrderChange => view.deliver(DRIVER, TEST_MAKER),
        'OrderDelivered',
        DRIVER,
    );
}

/** What a view says of the order. */
const facts = ({ view }: IOrder): object => ({
    status: view.status,
    number: view.version.number,
    isReady: view.isReady,
    driverId: view.driverId,
    isDeliveryRequestPending: view.isDeliveryRequestPending,
});

describe('the order on the V1.0.0 happy path, read from its events', () => {
    it.each<[string, () => IOrder, object]>([
        ['created', created, { status: 'Created', number: 1, isReady: false, driverId: null }],
        ['pending', pending, { status: 'Created', number: 2, isDeliveryRequestPending: true }],
        [
            'acknowledged',
            requested,
            { status: 'DeliveryRequested', number: 3, isDeliveryRequestPending: false },
        ],
        ['accepted', assigned, { status: 'DriverAssigned', number: 4, driverId: 'driver-1' }],
        ['ready', assignedAndReady, { status: 'DriverAssigned', number: 5, isReady: true }],
        ['picked up', pickedUp, { status: 'PickedUp', number: 6 }],
        ['delivered', delivered, { status: 'Delivered', number: 7 }],
    ])('is as its events say once %s, one version on each time', (_name, order, expected) => {
        const made = order();
        const said = facts(made);

        expect(said).toMatchObject(expected);
    });

    it.each<[string, () => IOrder]>([
        ['Created', created],
        ['DeliveryRequested', requested],
        ['DriverAssigned', assigned],
    ])('can be marked ready from %s, leaving the status unchanged', (status, order) => {
        const before = order();
        const ready = changed(
            before,
            (view): OrderChange => view.markReady(TEST_MAKER),
            'OrderReady',
        );

        expect(ready.view).toMatchObject({ status, isReady: true });
    });
});

describe('what the order refuses', () => {
    const refusal = (result: OrderChange): string | undefined =>
        result.isAllowed ? undefined : result.refusal;

    it.each<[string, () => IOrder, (view: OrderView) => OrderChange, string]>([
        [
            'a second delivery request while one is pending',
            pending,
            (view): OrderChange => view.requestDelivery(TEST_MAKER),
            'DeliveryRequestPending',
        ],
        [
            'a delivery request once one is open',
            requested,
            (view): OrderChange => view.requestDelivery(TEST_MAKER),
            'NotAllowedFromStatus',
        ],
        [
            'completing a request that is not pending',
            created,
            (view): OrderChange => view.completeDeliveryRequest(TEST_MAKER),
            'NoPendingDeliveryRequest',
        ],
        [
            'being marked ready twice',
            assignedAndReady,
            (view): OrderChange => view.markReady(TEST_MAKER),
            'AlreadyReady',
        ],
        [
            'acceptance before a request is open',
            created,
            (view): OrderChange => view.acceptDeliveryRequest(TEST_MAKER),
            'NotAllowedFromStatus',
        ],
        [
            'acceptance while the request is pending',
            pending,
            (view): OrderChange => view.acceptDeliveryRequest(TEST_MAKER),
            'NotAllowedFromStatus',
        ],
        [
            'acceptance once accepted',
            assigned,
            (view): OrderChange => view.acceptDeliveryRequest(TEST_MAKER),
            'NotAllowedFromStatus',
        ],
        [
            'pickup before the order is ready',
            assigned,
            (view): OrderChange => view.pickUp(DRIVER, TEST_MAKER),
            'NotReady',
        ],
        [
            'pickup by another driver',
            assignedAndReady,
            (view): OrderChange => view.pickUp(OTHER_DRIVER, TEST_MAKER),
            'NotTheAssignedDriver',
        ],
        [
            'delivery by another driver',
            pickedUp,
            (view): OrderChange => view.deliver(OTHER_DRIVER, TEST_MAKER),
            'NotTheAssignedDriver',
        ],
        [
            'pickup before acceptance',
            requested,
            (view): OrderChange => view.pickUp(DRIVER, TEST_MAKER),
            'NotAllowedFromStatus',
        ],
        [
            'delivery before pickup',
            assignedAndReady,
            (view): OrderChange => view.deliver(DRIVER, TEST_MAKER),
            'NotAllowedFromStatus',
        ],
    ])('%s', (_name, order, attempt, expected) => {
        const result = attempt(order().view);

        const said = refusal(result);
        expect(said).toBe(expected);
    });

    it.each<[string, (view: OrderView) => OrderChange]>([
        ['a delivery request', (view): OrderChange => view.requestDelivery(TEST_MAKER)],
        ['acceptance', (view): OrderChange => view.acceptDeliveryRequest(TEST_MAKER)],
        ['pickup', (view): OrderChange => view.pickUp(DRIVER, TEST_MAKER)],
        ['delivery', (view): OrderChange => view.deliver(DRIVER, TEST_MAKER)],
    ])('%s after delivery, which is final', (_name, attempt) => {
        const done = delivered();

        const result = attempt(done.view);

        expect(result.isAllowed).toBe(false);
    });

    it('being marked ready after pickup, had it not been ready', () => {
        const picked = pickedUp();
        const withoutReady = picked.events.filter((event) => event.kind !== 'OrderReady');
        const notReady = OrderView.of(picked.view.version, withoutReady);

        const result = notReady.markReady(TEST_MAKER);

        const said = refusal(result);
        expect(said).toBe('NotAllowedFromStatus');
    });

    it('never changes the order it refuses', () => {
        const order = pending();
        const before = Object.entries(order.view);

        order.view.requestDelivery(TEST_MAKER);

        const isFrozen = Object.isFrozen(order.view);
        expect(isFrozen).toBe(true);
        const after = Object.entries(order.view);
        expect(after).toEqual(before);
    });
});
