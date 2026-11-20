import { TESTING_FUNCTIONS } from '../../application-core/simulation-engine/function-lookup.testing';
import { List } from 'immutable';

import type { IRunInput, IRunStart } from '../../application-core/simulation-engine/run-input';
import {
    toInputActor,
    toInputOrderName,
} from '../../application-core/simulation-engine/run-input';
import { scheduleInputs } from '../../application-core/simulation-engine/run-inputs';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import { createRun } from '../../application-core/simulation-engine/run-state';
import { DriverLocation, NewDriver, toDriverId } from '../../domain/drivers/driver';
import { toAreaId } from '../../domain/map-and-routing/area-id';
import { Coordinates } from '../../domain/map-and-routing/coordinates';
import { toDegrees } from '../../domain/map-and-routing/numbers';
import { RestaurantPlace, toRestaurantId } from '../../domain/restaurants/restaurant-place';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { SimulationRun } from './simulation-run';
import {
    TEST_ADDRESS,
    TEST_CUSTOMER,
    TO_TEST_ADDRESS,
} from '../../application-core/simulation-engine/run-customers.testing';

/** Where the restaurant and the driver are. */
const PLACE = { latitude: 10.33, longitude: 20.82 } as const;

/** When each step of the one-order script happens, and when the run is followed to. */
const AT_MS = {
    create: 1000,
    requestDelivery: 2000,
    markReady: 40_000,
    accept: 60_000,
    pickUp: 120_000,
    deliver: 240_000,
    end: 300_000,
} as const;

const COORDINATES = Coordinates.create({
    latitude: toDegrees(PLACE.latitude),
    longitude: toDegrees(PLACE.longitude),
});
const THE_RESTAURANT = RestaurantPlace.create({
    id: toRestaurantId('restaurant-1'),
    areaId: toAreaId('area-1'),
    coordinates: COORDINATES,
});
/** One restaurant and one driver, for the one-order script. */
export const START: IRunStart = {
    restaurants: List.of(THE_RESTAURANT),
    customers: List.of(TEST_CUSTOMER),
    addresses: List.of(TEST_ADDRESS),
    drivers: List([
        NewDriver.create({
            id: toDriverId('driver-1'),
            areaId: toAreaId('area-1'),
            availability: 'Available',
            location: DriverLocation.create({
                coordinates: COORDINATES,
                deviceTime: toSimTime(0),
            }),
        }),
    ]),
};
/** One order, from creation to delivered, by its restaurant and driver. */
export const HAPPY_PATH: readonly IRunInput[] = [
    {
        at: toSimTime(AT_MS.create),
        actor: toInputActor('restaurant-1'),
        command: 'create-order',
        order: toInputOrderName('A'),
        ...TO_TEST_ADDRESS,
    },
    {
        at: toSimTime(AT_MS.requestDelivery),
        actor: toInputActor('restaurant-1'),
        command: 'request-delivery',
        order: toInputOrderName('A'),
    },
    {
        at: toSimTime(AT_MS.markReady),
        actor: toInputActor('restaurant-1'),
        command: 'mark-ready',
        order: toInputOrderName('A'),
    },
    {
        at: toSimTime(AT_MS.accept),
        actor: toInputActor('driver-1'),
        command: 'accept',
        order: toInputOrderName('A'),
    },
    {
        at: toSimTime(AT_MS.pickUp),
        actor: toInputActor('driver-1'),
        command: 'pick-up',
        order: toInputOrderName('A'),
    },
    {
        at: toSimTime(AT_MS.deliver),
        actor: toInputActor('driver-1'),
        command: 'deliver',
        order: toInputOrderName('A'),
    },
];

/** The one-order script, run to five minutes in, with its commits. */
export function oneOrderRun(): IRunState {
    const created = createRun({ functions: TESTING_FUNCTIONS, seed: toSeed(1) });
    const steps = List(HAPPY_PATH);
    const start = scheduleInputs(created, START, steps);
    const run = new SimulationRun(start);
    const end = toSimTime(AT_MS.end);
    run.advanceTo(end);
    return run.state;
}

/** The one-order script, from a start, the one above unless another is given, run to a time. */
export function oneOrderRunTo(atMs: number, start: IRunStart = START): IRunState {
    const created = createRun({ functions: TESTING_FUNCTIONS, seed: toSeed(1) });
    const steps = List(HAPPY_PATH);
    const scheduled = scheduleInputs(created, start, steps);
    const run = new SimulationRun(scheduled);
    const until = toSimTime(atMs);
    run.advanceTo(until);
    return run.state;
}

/** A second driver, beside the first, for the two-order script. */
const SECOND_DRIVER = NewDriver.create({
    id: toDriverId('driver-2'),
    areaId: toAreaId('area-1'),
    availability: 'Available',
    location: DriverLocation.create({
        coordinates: COORDINATES,
        deviceTime: toSimTime(0),
    }),
});

/** The one-order script for order B, driven by driver 2, at the same times as order A's. */
const ORDER_B: readonly IRunInput[] = HAPPY_PATH.map((input) => ({
    ...input,
    order: toInputOrderName('B'),
    actor: input.actor === 'driver-1' ? toInputActor('driver-2') : input.actor,
}));

/**
 * Orders A and B on the same script at the same times, by two drivers, run to five minutes in:
 * a job run then handles both orders' events, so it touches both (FND-81).
 */
export function twoOrderRun(): IRunState {
    const created = createRun({ functions: TESTING_FUNCTIONS, seed: toSeed(1) });
    const steps = List([...HAPPY_PATH, ...ORDER_B]);
    const drivers = START.drivers.push(SECOND_DRIVER);
    const start = scheduleInputs(created, { ...START, drivers }, steps);
    const run = new SimulationRun(start);
    const end = toSimTime(AT_MS.end);
    run.advanceTo(end);
    return run.state;
}
