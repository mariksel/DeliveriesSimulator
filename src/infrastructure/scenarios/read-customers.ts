import { List, Map as ImmutableMap, Set as ImmutableSet } from 'immutable';

import type { IScenarioProblem } from '../../application-core/scenarios/scenario';
import { problemAt } from '../../application-core/scenarios/scenario';
import type { AreaId } from '../../domain/map-and-routing/area-id';
import type { City } from '../../domain/map-and-routing/city';
import type { Coordinates } from '../../domain/map-and-routing/coordinates';
import { routeOnMap } from '../../domain/map-and-routing/route';
import { StreetGrid } from '../../domain/map-and-routing/street-grid';
import { Customer, toCustomerId } from '../../domain/restaurants/customers/customer';
import { DeliveryAddress, toAddressId } from '../../domain/restaurants/customers/delivery-address';
import type { RestaurantPlace } from '../../domain/restaurants/restaurant-place';
import { toRestaurantId } from '../../domain/restaurants/restaurant-place';
import { toMetres } from '../../domain/map-and-routing/numbers';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { SeededRandom } from '../../domain/simulation-engine/seeded-random';
import { placeIn, readArea, readPlace } from './read-place';
import type { Fields, IReading } from './scenario-reader';
import { readList, readText, unknownFields } from './scenario-reader';

const NONE = List<IScenarioProblem>();
const NONE_READ: IReading<AreaId> = { value: null, problems: NONE };

/** A customer as the steps may name them: their restaurant, and their addresses' IDs. */
export interface IKnownCustomer {
    readonly restaurant: string;
    readonly addresses: ImmutableSet<string>;
}

/** Everything read of a scenario's customers, and what is wrong with them. */
export interface ICustomersReading {
    readonly customers: List<Customer>;
    readonly addresses: List<DeliveryAddress>;
    /** Each customer's restaurant and addresses, by their IDs as the file gives them. */
    readonly known: ImmutableMap<string, IKnownCustomer>;
    readonly problems: List<IScenarioProblem>;
}

/** What an address is placed with: the city, its streets, its seed, and the restaurants. */
interface IPlacing {
    readonly city: City;
    readonly grid: StreetGrid;
    readonly random: SeededRandom;
    readonly restaurants: ImmutableMap<string, RestaurantPlace>;
}

/** One customer read: the customer, their addresses, and what is wrong. */
interface ICustomerReading {
    readonly customer: Customer | null;
    readonly addresses: List<DeliveryAddress>;
    readonly known: readonly [string, IKnownCustomer] | null;
    readonly problems: List<IScenarioProblem>;
}

/**
 * The stored distance of an address: the route along the streets from its customer's restaurant,
 * worked out when it is stored (FND-90).
 */
function storedMetres(placing: IPlacing, restaurant: RestaurantPlace, point: Coordinates): number {
    const route = routeOnMap(placing.city, placing.grid, restaurant.coordinates, point);
    return route.metres;
}

/** An address at its point, or one the city's seed picks in its area, from a stream of its own. */
function addressOf(
    placing: IPlacing,
    restaurant: RestaurantPlace,
    ids: { readonly id: string; readonly customer: string },
    areaId: AreaId,
    point: Coordinates | null,
): DeliveryAddress | null {
    const picked = point ?? placing.city.pickIn(areaId, placing.random, `address:${ids.id}`)?.[0];
    if (picked === undefined) {
        return null;
    }
    const metres = storedMetres(placing, restaurant, picked);
    return DeliveryAddress.create({
        id: toAddressId(ids.id),
        customerId: toCustomerId(ids.customer),
        areaId,
        coordinates: picked,
        storedMetres: toMetres(metres),
    });
}

/**
 * Reads one of a customer's addresses, which gives its point, its area, or both when they agree,
 * as a restaurant does; one given only an area gets a point the city's seed picks there.
 */
function readAddress(
    fields: Fields,
    path: string,
    customer: string | null,
    restaurant: RestaurantPlace | undefined,
    placing: IPlacing | null,
): IReading<DeliveryAddress> {
    const id = readText(fields, path, 'id');
    const area = readArea(fields, path);
    const point = readPlace(fields, path);
    const isRead = area.problems.isEmpty() && point.problems.isEmpty();
    const areaId = isRead
        ? placeIn(placing?.city ?? null, path, area.value, point.value)
        : NONE_READ;
    const isComplete =
        placing !== null &&
        restaurant !== undefined &&
        id.value !== null &&
        customer !== null &&
        areaId.value !== null;
    return {
        value: isComplete
            ? addressOf(placing, restaurant, { id: id.value, customer }, areaId.value, point.value)
            : null,
        problems: unknownFields(fields, path, ['id', 'area', 'location']).concat(
            id.problems,
            area.problems,
            point.problems,
            areaId.problems,
        ),
    };
}

/** The IDs a list's entries give, each with its place, whatever else is wrong with them. */
function idsOf(list: List<readonly [Fields, string]>): List<readonly [string, string]> {
    return list.flatMap(([fields, path]) => {
        const id = readText(fields, path, 'id');
        return id.value === null ? [] : [[id.value, path] as const];
    });
}

/** A customer, once their ID and their restaurant, which must be the scenario's, are read. */
function customerOf(
    id: string | null,
    restaurant: string | null,
    isKnown: boolean,
): Customer | null {
    if (id === null || restaurant === null || !isKnown) {
        return null;
    }
    const customerId = toCustomerId(id);
    const restaurantId = toRestaurantId(restaurant);
    return Customer.create({ id: customerId, restaurantId });
}

/** What is wrong with a customer's restaurant and addresses, beyond each address's own fields. */
function customerProblems(
    fields: Fields,
    path: string,
    isKnown: boolean,
    list: { readonly entries: List<unknown>; readonly problems: List<IScenarioProblem> },
): List<IScenarioProblem> {
    const isEmpty = Array.isArray(fields['addresses']) && list.entries.isEmpty();
    const unknownRestaurant = isKnown
        ? NONE
        : problemAt(`${path}restaurant`, "is not one of the scenario's restaurants");
    const noAddress = isEmpty
        ? problemAt(`${path}addresses`, 'must hold at least one address')
        : NONE;
    return unknownRestaurant.concat(list.problems, noAddress);
}

/** Reads a customer: their ID, their restaurant, and at least one address. */
function readCustomer(
    fields: Fields,
    path: string,
    placing: IPlacing | null,
    restaurantIds: ImmutableSet<string>,
): ICustomerReading {
    const id = readText(fields, path, 'id');
    const restaurant = readText(fields, path, 'restaurant');
    const isKnown = restaurant.value === null || restaurantIds.has(restaurant.value);
    const list = readList(fields, 'addresses', path);
    const place =
        restaurant.value === null ? undefined : placing?.restaurants.get(restaurant.value);
    const readings = list.entries.map(([entry, at]) =>
        readAddress(entry, at, id.value, place, placing),
    );
    const addressIds = idsOf(list.entries).map(([addressId]) => addressId);
    const known: IKnownCustomer | null =
        restaurant.value === null
            ? null
            : { restaurant: restaurant.value, addresses: ImmutableSet(addressIds) };
    const fieldProblems = unknownFields(fields, path, ['id', 'restaurant', 'addresses']);
    const listProblems = customerProblems(fields, path, isKnown, list);
    const addressProblems = readings.flatMap((reading) => reading.problems);
    return {
        customer: customerOf(id.value, restaurant.value, isKnown),
        addresses: readings.flatMap((reading) => (reading.value === null ? [] : [reading.value])),
        known: id.value === null || known === null ? null : [id.value, known],
        problems: fieldProblems.concat(
            id.problems,
            restaurant.problems,
            listProblems,
            addressProblems,
        ),
    };
}

/** Problems for IDs given more than once in a list, each at its later place. */
function repeated(ids: List<readonly [string, string]>, what: string): List<IScenarioProblem> {
    const start = { seen: ImmutableSet<string>(), problems: NONE };
    return ids.reduce((soFar, [id, path]) => {
        if (!soFar.seen.has(id)) {
            const seen = soFar.seen.add(id);
            return { seen, problems: soFar.problems };
        }
        const problem = problemAt(`${path}id`, `repeats ${what} "${id}"`);
        return { seen: soFar.seen, problems: soFar.problems.concat(problem) };
    }, start).problems;
}

/** What addresses are placed with, or none while the city could not be read. */
function placingOf(city: City | null, restaurants: List<RestaurantPlace>): IPlacing | null {
    if (city === null) {
        return null;
    }
    const seed = toSeed(city.seed);
    const random = SeededRandom.createNew(seed);
    const grid = StreetGrid.createNew(city, random);
    const pairs = restaurants.map((place): [string, RestaurantPlace] => [place.id, place]);
    return { city, grid, random, restaurants: ImmutableMap(pairs) };
}

/**
 * Reads a scenario's customers, each of a restaurant, with their stored delivery addresses
 * (FND-90). An address's stored distance is the route along the city's streets from the
 * customer's restaurant. Customer and address IDs are each unique in the scenario.
 */
export function readCustomers(
    value: Fields,
    city: City | null,
    restaurants: List<RestaurantPlace>,
    restaurantIds: ImmutableSet<string>,
): ICustomersReading {
    const placing = placingOf(city, restaurants);
    const list = readList(value, 'customers');
    const readings = list.entries.map(([fields, path]) =>
        readCustomer(fields, path, placing, restaurantIds),
    );
    const addressLists = list.entries.flatMap(
        ([fields, path]) => readList(fields, 'addresses', path).entries,
    );
    const customerIds = idsOf(list.entries);
    const addressIds = idsOf(addressLists);
    const known = readings.flatMap((reading) => (reading.known === null ? [] : [reading.known]));
    const customerProblemsFound = readings.flatMap((reading) => reading.problems);
    const repeatedCustomers = repeated(customerIds, 'customer');
    const repeatedAddresses = repeated(addressIds, 'address');
    return {
        customers: readings.flatMap((reading) =>
            reading.customer === null ? [] : [reading.customer],
        ),
        addresses: readings.flatMap((reading) => reading.addresses),
        known: ImmutableMap(known),
        problems: list.problems.concat(
            customerProblemsFound,
            repeatedCustomers,
            repeatedAddresses,
        ),
    };
}
