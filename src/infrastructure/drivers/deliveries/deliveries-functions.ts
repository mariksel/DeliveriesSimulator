import { List } from 'immutable';

import { DeliveriesState } from '../../../domain/drivers/deliveries/deliveries-state';
import type { IRegisteredFunction } from '../../system/functions/registered-function';
import { ArgumentKind, registered, StateModule } from '../../system/functions/registered-function';
import { FIRST_VERSION } from '../../../domain/system/records/version-chain';

const {
    Value,
    OrdersOutbox,
    OrdersOutboxEvent,
    DeliveriesRules,
    DriversRules,
    DriversState,
    Instant,
    CallOrders,
    Coordinates,
    SentLocations,
    Maker,
} = ArgumentKind;
const DELIVERIES = StateModule.Deliveries;

/**
 * The deliveries functions a state commit can hold, with their stored IDs. `pickUp` and `deliver`
 * are not here: they change no state, as the call to orders they ask for makes the commits.
 */
export const DELIVERIES_FUNCTIONS = List<IRegisteredFunction>([
    registered({
        name: 'drivers.deliveries.receive-delivery-request',
        version: FIRST_VERSION,
        fn: DeliveriesState.receiveDeliveryRequest,
        module: DELIVERIES,
        args: [Instant, ArgumentKind.DeliveryHandoff, Maker],
    }),
    registered({
        name: 'drivers.deliveries.answer-from-orders',
        version: FIRST_VERSION,
        fn: DeliveriesState.answerFromOrders,
        module: DELIVERIES,
        args: [DriversState, CallOrders, Value, Maker],
    }),
    registered({
        name: 'drivers.deliveries.accept-request',
        version: FIRST_VERSION,
        fn: DeliveriesState.acceptRequest,
        module: DELIVERIES,
        args: [DriversState, Instant, Value, Value, DriversRules, Maker],
    }),
    registered({
        name: 'drivers.deliveries.notify-next-driver',
        version: FIRST_VERSION,
        fn: DeliveriesState.notifyNextDriver,
        module: DELIVERIES,
        args: [DriversState, Value, Instant, DriversRules, Maker],
    }),
    registered({
        name: 'drivers.deliveries.read-orders-event',
        version: FIRST_VERSION,
        fn: DeliveriesState.readOrdersEvent,
        module: DELIVERIES,
        args: [DriversState, Instant, OrdersOutboxEvent, Maker],
    }),
    registered({
        name: 'drivers.deliveries.record-orders-event-read',
        version: FIRST_VERSION,
        fn: DeliveriesState.recordOrdersEventRead,
        module: DELIVERIES,
        args: [OrdersOutboxEvent, OrdersOutbox, DeliveriesRules],
    }),
    registered({
        name: 'drivers.deliveries.receive-location',
        version: FIRST_VERSION,
        fn: DeliveriesState.receiveLocation,
        module: DELIVERIES,
        args: [DriversState, Instant, Value, Coordinates, Maker],
    }),
    registered({
        name: 'drivers.deliveries.receive-locations',
        version: FIRST_VERSION,
        fn: DeliveriesState.receiveLocations,
        module: DELIVERIES,
        args: [DriversState, Instant, SentLocations, Maker],
    }),
]);
