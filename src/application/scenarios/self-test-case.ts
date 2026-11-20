import { DEFAULT_BLOCK_METRES } from '../../domain/map-and-routing/city';
import { toCitySeed } from '../../domain/map-and-routing/numbers';
import { List, OrderedMap } from 'immutable';
import type { IRider } from '../../application-core/simulation-engine/rider';
import {
    DEFAULT_SEND_EVERY,
    DEFAULT_SPEED_KMH,
} from '../../application-core/simulation-engine/rider';

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
import { toDegrees, toKilometres } from '../../domain/map-and-routing/numbers';
import { City } from '../../domain/map-and-routing/city';
import { toCount } from '../../domain/system/math/math';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { RUN_START, toSimTime } from '../../domain/simulation-engine/sim-time';
import type { IScenario } from '../../application-core/scenarios/scenario';
import { ScriptedCommand } from '../../application-core/scenarios/scripted-command';
import type { IScriptedStep } from '../../application-core/scenarios/scripted-step';
import { Customer, toCustomerId } from '../../domain/restaurants/customers/customer';
import { DeliveryAddress, toAddressId } from '../../domain/restaurants/customers/delivery-address';
import { routeOnMap } from '../../domain/map-and-routing/route';
import { StreetGrid } from '../../domain/map-and-routing/street-grid';
import { SeededRandom } from '../../domain/simulation-engine/seeded-random';

const RESTAURANT = 'restaurant';
const DRIVER = 'driver';
const AREA = toAreaId('area');
const LATITUDE_DEGREES = 10.33;
const LONGITUDE_DEGREES = 20.82;
const LATITUDE = toDegrees(LATITUDE_DEGREES);
const LONGITUDE = toDegrees(LONGITUDE_DEGREES);
const PLACE = Coordinates.create({ latitude: LATITUDE, longitude: LONGITUDE });
/** The city's south-west corner, about half a kilometre south and west of the place. */
const CORNER_LATITUDE = 10.325;
const CORNER_LONGITUDE = 20.815;
const CORNER = Coordinates.create({
    latitude: toDegrees(CORNER_LATITUDE),
    longitude: toDegrees(CORNER_LONGITUDE),
});
const ONE_KILOMETRE = toKilometres(1);
const ONE = toCount(1);
/** A city of one square kilometre, one area, around the place (FND-90). */
const CITY = City.create({
    origin: CORNER,
    widthKm: ONE_KILOMETRE,
    heightKm: ONE_KILOMETRE,
    across: ONE,
    down: ONE,
    seed: toCitySeed(1),
    blockMetres: DEFAULT_BLOCK_METRES,
    areaIds: List.of(AREA),
    waitingPoints: OrderedMap(),
});
const RESTAURANT_PLACE = RestaurantPlace.create({
    id: toRestaurantId(RESTAURANT),
    areaId: AREA,
    coordinates: PLACE,
});

const CUSTOMER = toCustomerId('customer');
const ADDRESS = toAddressId('address');
const ADDRESS_LATITUDE = 10.3275;
const ADDRESS_LONGITUDE = 20.8225;
/** An address in the city, south and east of the place. */
const ADDRESS_PLACE = Coordinates.create({
    latitude: toDegrees(ADDRESS_LATITUDE),
    longitude: toDegrees(ADDRESS_LONGITUDE),
});
const CITY_SEED = toSeed(CITY.seed);
const STREETS_SOURCE = SeededRandom.createNew(CITY_SEED);
const STREETS = StreetGrid.createNew(CITY, STREETS_SOURCE);
const STORED_ROUTE = routeOnMap(CITY, STREETS, PLACE, ADDRESS_PLACE);
const THE_CUSTOMER = Customer.create({ id: CUSTOMER, restaurantId: toRestaurantId(RESTAURANT) });
const THE_ADDRESS = DeliveryAddress.create({
    id: ADDRESS,
    customerId: CUSTOMER,
    areaId: AREA,
    coordinates: ADDRESS_PLACE,
    storedMetres: STORED_ROUTE.metres,
});

const THE_DRIVER = NewDriver.create({
    id: toDriverId(DRIVER),
    areaId: AREA,
    availability: DriverAvailability.Available,
    location: DriverLocation.create({ coordinates: PLACE, deviceTime: RUN_START }),
});

/** The driver as the simulator rides them: the app sends every 30 seconds, at 20 km/h. */
const THE_RIDER: IRider = {
    driverId: THE_DRIVER.id,
    sendEvery: DEFAULT_SEND_EVERY,
    speedKmh: DEFAULT_SPEED_KMH,
};

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
    ...(command === ScriptedCommand.CreateOrder ? { customer: CUSTOMER, address: ADDRESS } : {}),
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
        city: CITY,
        restaurants: List.of(RESTAURANT_PLACE),
        customers: List.of(THE_CUSTOMER),
        addresses: List.of(THE_ADDRESS),
        drivers: List.of(THE_DRIVER),
        riders: List.of(THE_RIDER),
    },
    steps: List(SCRIPTED),
};
