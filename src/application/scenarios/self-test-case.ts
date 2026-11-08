import { List } from 'immutable';

import { DriverAvailability } from '../../domain/drivers/driver-availability';
import { DriverLocation, NewDriver } from '../../domain/drivers/driver';
import { RestaurantPlace } from '../../domain/restaurants/restaurant-place';
import { toAreaId } from '../../domain/map-and-routing/area-id';
import { toDriverId } from '../../domain/drivers/driver';
import { toRestaurantId } from '../../domain/restaurants/restaurant-place';
import {
    toScenarioActor,
    toScenarioOrderName,
} from '../../application-core/scenarios/scripted-step';
import { toVersionId } from '../../domain/versions/version-id';
import { Coordinates } from '../../domain/map-and-routing/coordinates';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import { toDegrees } from '../../domain/map-and-routing/numbers';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { RUN_START, toSimTime } from '../../domain/simulation-engine/sim-time';
import type { IScenario } from '../../application-core/scenarios/scenario';
import { ScriptedCommand } from '../../application-core/scenarios/scripted-command';
import type { IScriptedStep } from '../../application-core/scenarios/scripted-step';

const RESTAURANT = 'restaurant';
const DRIVER = 'driver';
const AREA = toAreaId('area');
const LATITUDE_DEGREES = 10.33;
const LONGITUDE_DEGREES = 20.82;
const LATITUDE = toDegrees(LATITUDE_DEGREES);
const LONGITUDE = toDegrees(LONGITUDE_DEGREES);
const PLACE = Coordinates.create({ latitude: LATITUDE, longitude: LONGITUDE });
const RESTAURANT_PLACE = RestaurantPlace.create({
    id: toRestaurantId(RESTAURANT),
    areaId: AREA,
    coordinates: PLACE,
});

const THE_DRIVER = NewDriver.create({
    id: toDriverId(DRIVER),
    areaId: AREA,
    availability: DriverAvailability.Available,
    location: DriverLocation.create({ coordinates: PLACE, deviceTime: RUN_START }),
});

/** The known case's times, in milliseconds since the run began. */
const AT_MS = {
    created: 1000,
    requested: 2000,
    ready: 40_000,
    accepted: 60_000,
    pickedUp: 120_000,
    delivered: 240_000,
    end: 300_000,
} as const;

const AT = {
    created: toSimTime(AT_MS.created),
    requested: toSimTime(AT_MS.requested),
    ready: toSimTime(AT_MS.ready),
    accepted: toSimTime(AT_MS.accepted),
    pickedUp: toSimTime(AT_MS.pickedUp),
    delivered: toSimTime(AT_MS.delivered),
    end: toSimTime(AT_MS.end),
} as const;

/** Each step's time, actor, and command. Every step is on order A. */
const KNOWN_STEPS: readonly (readonly [SimTime, string, ScriptedCommand])[] = [
    [AT.created, RESTAURANT, ScriptedCommand.CreateOrder],
    [AT.requested, RESTAURANT, ScriptedCommand.RequestDelivery],
    [AT.ready, RESTAURANT, ScriptedCommand.MarkReady],
    [AT.accepted, DRIVER, ScriptedCommand.Accept],
    [AT.pickedUp, DRIVER, ScriptedCommand.PickUp],
    [AT.delivered, DRIVER, ScriptedCommand.Deliver],
];

const ORDER = toScenarioOrderName('A');

const SCRIPTED = KNOWN_STEPS.map(([at, actor, command]): IScriptedStep => ({
    at,
    actor: toScenarioActor(actor),
    command,
    order: ORDER,
}));

/**
 * One order on the happy path: the known case the Simulator self-tests break in each way. It is a
 * scenario, so it lives with the scenarios, which may name places and drivers.
 */
export const SELF_TEST_CASE: IScenario = {
    name: 'Self-test: one order',
    description: null,
    version: toVersionId('V1.0.0'),
    seed: toSeed(1),
    runUntil: AT.end,
    start: {
        restaurants: List.of(RESTAURANT_PLACE),
        drivers: List.of(THE_DRIVER),
    },
    steps: List(SCRIPTED),
};
