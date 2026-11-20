import { DEFAULT_BLOCK_METRES } from '../../domain/map-and-routing/city';
import { toCitySeed } from '../../domain/map-and-routing/numbers';
import { List } from 'immutable';
import type { IRider } from '../simulation-engine/rider';
import { DEFAULT_SEND_EVERY, DEFAULT_SPEED_KMH } from '../simulation-engine/rider';

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
import { toDegrees, toKilometres } from '../../domain/map-and-routing/numbers';
import { City } from '../../domain/map-and-routing/city';
import { toCount } from '../../domain/system/math/math';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { Customer, toCustomerId } from '../../domain/restaurants/customers/customer';
import { DeliveryAddress, toAddressId } from '../../domain/restaurants/customers/delivery-address';
import { routeOnMap } from '../../domain/map-and-routing/route';
import { StreetGrid } from '../../domain/map-and-routing/street-grid';
import { SeededRandom } from '../../domain/simulation-engine/seeded-random';

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
const CUSTOMER = toCustomerId('customer-1');
const ADDRESS = toAddressId('address-1');
const ADDRESS_LATITUDE = 10.3275;
const ADDRESS_LONGITUDE = 20.8225;
/** About 280 metres south and 270 metres east of the restaurant. */
const ADDRESS_PLACE = Coordinates.create({
    latitude: toDegrees(ADDRESS_LATITUDE),
    longitude: toDegrees(ADDRESS_LONGITUDE),
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
    ...(command === ScriptedCommand.CreateOrder ? { customer: CUSTOMER, address: ADDRESS } : {}),
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

/** The driver as the simulator rides them: the app sends every 30 seconds, at 20 km/h. */
const THE_RIDER: IRider = {
    driverId: THE_DRIVER.id,
    sendEvery: DEFAULT_SEND_EVERY,
    speedKmh: DEFAULT_SPEED_KMH,
};

const SEED = 42;
const CITY_SEED = 7;
const CORNER_LATITUDE = 10.325;
const CORNER_LONGITUDE = 20.815;
const CORNER = Coordinates.create({
    latitude: toDegrees(CORNER_LATITUDE),
    longitude: toDegrees(CORNER_LONGITUDE),
});
/** The built-in's city: four 1 km areas, with the restaurant and driver in area-1 (FND-90). */
const CITY = City.createNew({
    origin: CORNER,
    widthKm: toKilometres(2),
    heightKm: toKilometres(2),
    across: toCount(2),
    down: toCount(2),
    seed: toCitySeed(CITY_SEED),
    blockMetres: DEFAULT_BLOCK_METRES,
});

const STREETS_SEED = toSeed(CITY_SEED);
const STREETS_SOURCE = SeededRandom.createNew(STREETS_SEED);
const STREETS = StreetGrid.createNew(CITY, STREETS_SOURCE);
const STORED_ROUTE = routeOnMap(CITY, STREETS, RESTAURANT_PLACE, ADDRESS_PLACE);

/** The restaurant's one customer, with one address in the restaurant's area (FND-90). */
const THE_CUSTOMER = Customer.create({ id: CUSTOMER, restaurantId: toRestaurantId(RESTAURANT) });
const THE_ADDRESS = DeliveryAddress.create({
    id: ADDRESS,
    customerId: CUSTOMER,
    areaId: AREA,
    coordinates: ADDRESS_PLACE,
    storedMetres: STORED_ROUTE.metres,
});

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
        city: CITY,
        restaurants: List.of(THE_RESTAURANT),
        customers: List.of(THE_CUSTOMER),
        addresses: List.of(THE_ADDRESS),
        drivers: List.of(THE_DRIVER),
        riders: List.of(THE_RIDER),
        rules: List(),
    },
    steps: List(SCRIPTED),
};
