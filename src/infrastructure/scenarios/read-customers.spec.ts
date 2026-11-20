import { describe, expect, it } from 'vitest';

import type { IScenario } from '../../application-core/scenarios/scenario';
import type { IScriptedStep } from '../../application-core/scenarios/scripted-step';
import { routeOnMap } from '../../domain/map-and-routing/route';
import { StreetGrid } from '../../domain/map-and-routing/street-grid';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { SeededRandom } from '../../domain/simulation-engine/seeded-random';
import { readScenario } from './read-scenario';

const CREATE = {
    at: 'h00:m00:s01:ms00',
    actor: 'restaurant-1',
    command: 'create-order',
    order: 'A',
    customer: 'customer-1',
    address: 'address-1',
};

const AT_POINT = {
    id: 'address-1',
    area: 'area-1',
    location: { latitude: 10.3275, longitude: 20.8225 },
};

/** A scenario of two restaurants, each with a customer, whose first order goes to address-1. */
function scenario(): Record<string, unknown> & {
    customers: Record<string, unknown>[];
    steps: Record<string, unknown>[];
} {
    return {
        format: 1,
        name: 'Customers',
        version: 'V1.0.0',
        seed: 42,
        runUntil: 'h00:m05:s00:ms00',
        city: {
            origin: { latitude: 10.325, longitude: 20.815 },
            widthKm: 2,
            heightKm: 2,
            across: 2,
            down: 2,
            seed: 7,
        },
        restaurants: [
            {
                id: 'restaurant-1',
                area: 'area-1',
                location: { latitude: 10.33, longitude: 20.82 },
            },
            { id: 'restaurant-2', area: 'area-4' },
        ],
        customers: [
            {
                id: 'customer-1',
                restaurant: 'restaurant-1',
                addresses: [AT_POINT, { id: 'address-2', area: 'area-2' }],
            },
            {
                id: 'customer-2',
                restaurant: 'restaurant-2',
                addresses: [{ id: 'address-3', area: 'area-3' }],
            },
        ],
        drivers: [],
        steps: [CREATE],
    };
}

function read(value: unknown): IScenario {
    const result = readScenario(value);
    if (!result.isOk) {
        const problemsJson = JSON.stringify(result.problems);
        throw new Error(problemsJson);
    }
    return result.scenario;
}

/** The scenario as built, read. */
function readBase(): IScenario {
    const value = scenario();
    return read(value);
}

function problemsOf(value: unknown): string[] {
    const result = readScenario(value);
    return result.isOk
        ? []
        : result.problems.map((problem) => `${problem.path}: ${problem.message}`).toArray();
}

describe("a scenario's customers", () => {
    it('are read, each of a restaurant, with their addresses', () => {
        const { start } = readBase();

        const customers = start.customers
            .map(({ id, restaurantId }) => ({ id, restaurantId }))
            .toArray();
        expect(customers).toEqual([
            { id: 'customer-1', restaurantId: 'restaurant-1' },
            { id: 'customer-2', restaurantId: 'restaurant-2' },
        ]);
        const addresses = start.addresses
            .map(({ id, customerId, areaId }) => [id, customerId, areaId])
            .toArray();
        expect(addresses).toEqual([
            ['address-1', 'customer-1', 'area-1'],
            ['address-2', 'customer-1', 'area-2'],
            ['address-3', 'customer-2', 'area-3'],
        ]);
        expect(start.addresses.get(0)?.coordinates).toEqual(AT_POINT.location);
    });

    it("store each address's distance as the route along the streets from the restaurant", () => {
        const { start } = readBase();
        const city = start.city!;
        const seed = toSeed(city.seed);
        const source = SeededRandom.createNew(seed);
        const grid = StreetGrid.createNew(city, source);

        const restaurant = start.restaurants.get(0)!;
        const address = start.addresses.get(0)!;
        const route = routeOnMap(city, grid, restaurant.coordinates, address.coordinates);

        expect(address.storedMetres).toBe(route.metres);
        const straight = 500;
        expect(address.storedMetres).toBeGreaterThan(straight);
    });

    it('place an address given only by an area there, the same whatever comes before it', () => {
        const first = readBase();
        const withMore = scenario();
        const [one] = withMore.customers;
        one!['addresses'] = [
            AT_POINT,
            { id: 'address-0', area: 'area-2' },
            { id: 'address-2', area: 'area-2' },
        ];

        const second = read(withMore);

        const placed = first.start.addresses.get(1)!;
        const area = first.start.city!.areaAt(placed.coordinates);
        expect(area).toBe('area-2');
        const again = second.start.addresses.find((address) => address.id === 'address-2');
        expect(again?.coordinates).toEqual(placed.coordinates);
    });

    it('are refused when a customer names no restaurant of the scenario, or has no address', () => {
        const value = scenario();
        value.customers[1]!['restaurant'] = 'restaurant-9';
        value.customers[0]!['addresses'] = [];
        value.steps = [];

        const problems = problemsOf(value);

        expect(problems).toEqual([
            'customers[0].addresses: must hold at least one address',
            "customers[1].restaurant: is not one of the scenario's restaurants",
        ]);
    });

    it('are refused when a customer or an address repeats an ID, even across customers', () => {
        const value = scenario();
        value.customers[1]!['id'] = 'customer-1';
        value.customers[1]!['addresses'] = [{ id: 'address-2', area: 'area-3' }];
        value.steps = [];

        const problems = problemsOf(value);

        expect(problems).toEqual([
            'customers[1].id: repeats customer "customer-1"',
            'customers[1].addresses[0].id: repeats address "address-2"',
        ]);
    });

    it("are refused when an address's point and area disagree, or a field is unknown", () => {
        const value = scenario();
        value.customers[0]!['addresses'] = [{ ...AT_POINT, area: 'area-4', floor: 2 }];
        value.customers[0]!['phone'] = '555';
        value.steps = [];

        const problems = problemsOf(value);

        expect(problems).toEqual([
            'customers[0].phone: is not a field of this format',
            'customers[0].addresses[0].floor: is not a field of this format',
            'customers[0].addresses[0].area: is "area-4", but the location lies in "area-1"',
        ]);
    });

    it('are required, even when the scenario creates no order', () => {
        const value = scenario();
        delete (value as Record<string, unknown>)['customers'];
        value.steps = [];

        const problems = problemsOf(value);

        expect(problems).toEqual(['customers: is missing']);
    });
});

describe("a create-order step's customer and address", () => {
    it('are read into the step', () => {
        const { steps } = readBase();

        const step = steps.get(0) as IScriptedStep;
        expect(step).toMatchObject({ customer: 'customer-1', address: 'address-1' });
    });

    it('are both required', () => {
        const value = scenario();
        value.steps = [{ ...CREATE, customer: undefined, address: undefined }];

        const problems = problemsOf(value);

        expect(problems).toEqual([
            'steps[0].customer: is missing',
            'steps[0].address: is missing',
        ]);
    });

    it("must be one of the scenario's customers, and of the acting restaurant", () => {
        const unknown = scenario();
        unknown.steps = [{ ...CREATE, customer: 'customer-9' }];
        const another = scenario();
        another.steps = [{ ...CREATE, customer: 'customer-2', address: 'address-3' }];

        const unknownProblems = problemsOf(unknown);
        const anotherProblems = problemsOf(another);

        expect(unknownProblems).toEqual([
            "steps[0].customer: is not one of the scenario's customers",
        ]);
        expect(anotherProblems).toEqual([
            'steps[0].customer: is a customer of "restaurant-2", not of "restaurant-1"',
        ]);
    });

    it("must name one of the customer's own addresses", () => {
        const value = scenario();
        value.steps = [{ ...CREATE, address: 'address-3' }];

        const problems = problemsOf(value);

        expect(problems).toEqual(['steps[0].address: is not one of "customer-1"\'s addresses']);
    });

    it('are refused on any other step', () => {
        const value = scenario();
        const request = {
            at: 'h00:m00:s02:ms00',
            actor: 'restaurant-1',
            command: 'request-delivery',
            order: 'A',
            customer: 'customer-1',
            address: 'address-1',
        };
        value.steps = [CREATE, request];

        const problems = problemsOf(value);

        expect(problems).toEqual([
            'steps[1].customer: is only for a CreateOrder step',
            'steps[1].address: is only for a CreateOrder step',
        ]);
    });
});
