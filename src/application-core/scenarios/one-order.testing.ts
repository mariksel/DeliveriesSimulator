import { List } from 'immutable';

import { DriverAvailability } from '../../domain/drivers/driver-availability';
import { toAreaId } from '../../domain/map-and-routing/area-id';
import { toDriverId } from '../../domain/drivers/driver';
import { toRestaurantId } from '../../domain/restaurants/restaurant-place';
import { toScenarioActor, toScenarioOrderName } from './scripted-step';
import { toVersionId } from '../../domain/versions/version-id';
import type { IScriptedStep } from './scripted-step';
import { ScriptedCommand } from './scripted-command';
import type { IScenario } from './scenario';
import { Coordinates } from '../../domain/map-and-routing/coordinates';
import { RestaurantPlace } from '../../domain/restaurants/restaurant-place';
import { DriverLocation, NewDriver } from '../../domain/drivers/driver';
import { toDegrees } from '../../domain/map-and-routing/numbers';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';

const RESTAURANT = 'restaurant-1';
const DRIVER = 'driver-1';
const AREA = toAreaId('area-1');
const LONGITUDE = 20.82;
const RESTAURANT_LATITUDE = 10.33;
/** About 111 metres north of the restaurant. */
const DRIVER_LATITUDE = 10.331;
const RESTAURANT_PLACE = Coordinates.create({
    latitude: toDegrees(RESTAURANT_LATITUDE),
    longitude: toDegrees(LONGITUDE),
});
const DRIVER_PLACE = Coordinates.create({
    latitude: toDegrees(DRIVER_LATITUDE),
    longitude: toDegrees(LONGITUDE),
});

const MS = {
    s01: 1000,
    s02: 2000,
    s40: 40_000,
    m01: 60_000,
    m02: 120_000,
    m04: 240_000,
    m05: 300_000,
} as const;

/** Each step's time, actor, and command. Every step is on order A. */
const STEPS: readonly (readonly [number, string, ScriptedCommand])[] = [
    [MS.s01, RESTAURANT, ScriptedCommand.CreateOrder],
    [MS.s02, RESTAURANT, ScriptedCommand.RequestDelivery],
    [MS.s40, RESTAURANT, ScriptedCommand.MarkReady],
    [MS.m01, DRIVER, ScriptedCommand.Accept],
    [MS.m02, DRIVER, ScriptedCommand.PickUp],
    [MS.m04, DRIVER, ScriptedCommand.Deliver],
];

const ORDER = toScenarioOrderName('A');

const SCRIPTED = STEPS.map(([at, actor, command]): IScriptedStep => ({
    at: toSimTime(at),
    actor: toScenarioActor(actor),
    command,
    order: ORDER,
}));

const THE_RESTAURANT = RestaurantPlace.create({
    id: toRestaurantId(RESTAURANT),
    areaId: AREA,
    coordinates: RESTAURANT_PLACE,
});
const THE_DRIVER = NewDriver.create({
    id: toDriverId(DRIVER),
    areaId: AREA,
    availability: DriverAvailability.Available,
    location: DriverLocation.create({ coordinates: DRIVER_PLACE, deviceTime: toSimTime(0) }),
});

const SEED = 42;

/**
 * The built-in one-order scenario, typed, as reading its file gives it. Infrastructure's test of
 * the built-in library checks that its file still reads as this.
 */
export const ONE_ORDER_SCENARIO: IScenario = {
    name: 'One order, happy path',
    description: 'One order from creation to delivered, without faults.',
    version: toVersionId('V1.0.0'),
    seed: toSeed(SEED),
    runUntil: toSimTime(MS.m05),
    start: {
        restaurants: List.of(THE_RESTAURANT),
        drivers: List.of(THE_DRIVER),
        rules: List(),
    },
    steps: List(SCRIPTED),
};
