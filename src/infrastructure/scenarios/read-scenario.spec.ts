import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { readScenario } from './read-scenario';
import type { IScenario } from '../../application-core/scenarios/scenario';
import { toSimTime } from '../../domain/simulation-engine/sim-time';

const VALID = {
    format: 1,
    name: 'One order, happy path',
    description: 'One order from creation to delivered.',
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
        { id: 'restaurant-1', area: 'area-1', location: { latitude: 10.33, longitude: 20.82 } },
    ],
    customers: [
        {
            id: 'customer-1',
            restaurant: 'restaurant-1',
            addresses: [
                {
                    id: 'address-1',
                    area: 'area-1',
                    location: { latitude: 10.3275, longitude: 20.8225 },
                },
            ],
        },
    ],
    drivers: [
        {
            id: 'driver-1',
            area: 'area-1',
            availability: 'Available',
            location: { latitude: 10.331, longitude: 20.82 },
            locatedAt: 'h00:m00:s00:ms00',
        },
        { id: 'driver-2', area: 'area-1', availability: 'Offline' },
    ],
    steps: [
        {
            at: 'h00:m00:s01:ms00',
            actor: 'restaurant-1',
            command: 'create-order',
            order: 'A',
            customer: 'customer-1',
            address: 'address-1',
        },
        { at: 'h00:m00:s02:ms00', actor: 'restaurant-1', command: 'request-delivery', order: 'A' },
        { at: 'h00:m00:s40:ms00', actor: 'restaurant-1', command: 'mark-ready', order: 'A' },
        { at: 'h00:m01:s00:ms00', actor: 'driver-1', command: 'accept', order: 'A' },
        { at: 'h00:m02:s00:ms00', actor: 'driver-1', command: 'pick-up', order: 'A' },
        { at: 'h00:m04:s00:ms00', actor: 'driver-1', command: 'deliver', order: 'A' },
    ],
};

type Changes = (scenario: typeof VALID & Record<string, unknown>) => void;

function changed(change: Changes): unknown {
    const validText = JSON.stringify(VALID);
    const copy = JSON.parse(validText) as typeof VALID & Record<string, unknown>;
    change(copy);
    return copy;
}

function read(value: unknown): IScenario {
    const result = readScenario(value);
    if (!result.isOk) {
        const problemsJson = JSON.stringify(result.problems);
        throw new Error(problemsJson);
    }
    return result.scenario;
}

function problemsOf(value: unknown): string[] {
    const result = readScenario(value);
    return result.isOk
        ? []
        : result.problems.map((problem) => `${problem.path}: ${problem.message}`).toArray();
}

describe('readScenario', () => {
    it('reads a valid scenario into what a run needs', () => {
        const scenario = read(VALID);

        expect(scenario).toMatchObject({
            name: 'One order, happy path',
            version: 'V1.0.0',
            seed: 42,
            runUntil: 300_000,
        });
        const restaurants = scenario.start.restaurants.toArray();
        expect(restaurants).toEqual([
            {
                id: 'restaurant-1',
                areaId: 'area-1',
                coordinates: { latitude: 10.33, longitude: 20.82 },
            },
        ]);
        const step = scenario.steps.get(3);
        expect(step).toEqual({
            at: 60_000,
            actor: 'driver-1',
            command: 'accept',
            order: 'A',
        });
    });

    it("reads a driver's location, and its time", () => {
        const driver = read(VALID).start.drivers.get(0);
        expect(driver).toEqual({
            id: 'driver-1',
            areaId: 'area-1',
            availability: 'Available',
            location: { coordinates: { latitude: 10.331, longitude: 20.82 }, deviceTime: 0 },
        });
    });

    it('reads an offline driver, with no location', () => {
        const driver = read(VALID).start.drivers.get(1);
        expect(driver).toEqual({
            id: 'driver-2',
            areaId: 'area-1',
            availability: null,
            location: null,
        });
    });

    it('reads the city, with its areas named row by row from the south-west', () => {
        const { city } = read(VALID).start;

        const names = city!.areaIds.toArray();
        expect(names).toEqual(['area-1', 'area-2', 'area-3', 'area-4']);
        expect(city!.seed).toBe(7);
        expect(city!.blockMetres).toBe(200);
    });

    it('reads how far apart the local streets are, when the city says', () => {
        const wider = changed((scenario): void => {
            (scenario.city as Record<string, unknown>)['blockMetres'] = 250;
        });

        const { city } = read(wider).start;

        expect(city!.blockMetres).toBe(250);
    });

    it('reads the waiting points the city sets, by area', () => {
        const placed = changed((scenario): void => {
            (scenario.city as Record<string, unknown>)['waitingPoints'] = {
                'area-2': { latitude: 10.33, longitude: 20.83 },
            };
        });

        const { city } = read(placed).start;

        const points = city!.waitingPoints.toJS();
        expect(points).toEqual({ 'area-2': { latitude: 10.33, longitude: 20.83 } });
    });

    it("picks a point in a restaurant's area when it gives only an area, whatever the run's seed", () => {
        const onlyArea = changed((scenario): void => {
            delete (scenario.restaurants[0] as Record<string, unknown>)['location'];
            scenario.restaurants[0]!.area = 'area-4';
        });
        const otherSeed = changed((scenario): void => {
            delete (scenario.restaurants[0] as Record<string, unknown>)['location'];
            scenario.restaurants[0]!.area = 'area-4';
            scenario.seed = 9;
        });

        const { start } = read(onlyArea);
        const again = read(otherSeed);

        const restaurant = start.restaurants.get(0)!;
        const area = start.city!.areaAt(restaurant.coordinates);
        expect(area).toBe('area-4');
        const picked = again.start.restaurants.get(0);
        expect(picked).toEqual(restaurant);
    });

    it("names the areas as the city gives them, and finds each place's area from its point", () => {
        const named = changed((scenario): void => {
            (scenario.city as Record<string, unknown>)['areas'] = ['sw', 'se', 'nw', 'ne'];
            delete (scenario.restaurants[0] as Record<string, unknown>)['area'];
            delete (scenario.drivers[0] as Record<string, unknown>)['area'];
            delete (scenario.customers[0]!.addresses[0] as Record<string, unknown>)['area'];
            scenario.drivers[1]!.area = 'ne';
        });

        const { start } = read(named);

        const areas = [start.restaurants.get(0)!.areaId, ...start.drivers.map((d) => d.areaId)];
        expect(areas).toEqual(['sw', 'sw', 'ne']);
    });

    it("reads how often each driver's app sends and how fast they ride, 30 s and 20 km/h unless given", () => {
        const given = changed((scenario): void => {
            const [first] = scenario.drivers as Record<string, unknown>[];
            first!['sendsEvery'] = 'h00:m00:s10:ms00';
            first!['speedKmh'] = 15;
        });

        const { start } = read(given);

        const riders = start.riders
            .map((rider) => [rider.driverId, rider.sendEvery.milliseconds, rider.speedKmh])
            .toArray();
        expect(riders).toEqual([
            ['driver-1', 10_000, 15],
            ['driver-2', 30_000, 20],
        ]);
    });

    it('reads a pick-up that runs at its time, without waiting for its driver', () => {
        const given = changed((scenario): void => {
            const pickUp = scenario.steps.find((step) => step.command === 'pick-up');
            (pickUp as Record<string, unknown>)['atItsTime'] = true;
        });

        const { steps } = read(given);

        const atItsTime = steps.toArray().filter((step) => 'isAtItsTime' in step);
        expect(atItsTime).toHaveLength(1);
    });

    it('refuses atItsTime on a step that is not a pick-up or delivery, or not true or false', () => {
        const given = changed((scenario): void => {
            const [first] = scenario.steps as Record<string, unknown>[];
            first!['atItsTime'] = true;
            const pickUp = scenario.steps.find((step) => step.command === 'pick-up');
            (pickUp as Record<string, unknown>)['atItsTime'] = 'yes';
        });

        const problems = problemsOf(given);

        expect(problems).toEqual([
            'steps[0].atItsTime: is only for a pick-up or delivery step',
            'steps[4].atItsTime: must be true or false',
        ]);
    });

    it("refuses a driver's send interval of none, or a speed that is not above 0", () => {
        const given = changed((scenario): void => {
            const [first, second] = scenario.drivers as Record<string, unknown>[];
            first!['sendsEvery'] = 'h00:m00:s00:ms00';
            second!['speedKmh'] = 0;
        });

        const problems = problemsOf(given);

        expect(problems).toEqual([
            'drivers[0].sendsEvery: must be more than none',
            'drivers[1].speedKmh: must be a number above 0',
        ]);
    });

    it('allows a scenario with no description, drivers, or steps', () => {
        const secondChanged = changed((scenario): void => {
            delete (scenario as Record<string, unknown>)['description'];
            scenario.drivers = [];
            scenario.steps = [];
        });
        const scenario = read(secondChanged);

        expect(scenario.description).toBeNull();
    });

    it('reads the far ends of the ranges, and finds such places outside the city', () => {
        const secondChanged = changed((scenario): void => {
            scenario.restaurants[0]!.location = { latitude: -90, longitude: 180 };
            scenario.drivers[0]!.location = { latitude: 90, longitude: -180 };
            scenario.seed = 4294967295;
        });
        const problems = problemsOf(secondChanged);
        expect(problems).toEqual([
            'restaurants[0].location: lies outside the city',
            'drivers[0].location: lies outside the city',
        ]);
    });

    it('allows a step exactly at runUntil', () => {
        const secondChanged = changed((scenario): void => {
            scenario.steps[5]!.at = scenario.runUntil;
        });
        const problems = problemsOf(secondChanged);
        expect(problems).toEqual([]);
    });

    it.each(['V1.0.0', 'V10.20.30', 'V1.1.0-planned-dispatch', 'V1.1.0-a-2'])(
        'allows the version %s',
        (version) => {
            const secondChanged = changed((scenario): void => {
                scenario.version = version;
            });
            const problems = problemsOf(secondChanged);
            expect(problems).toEqual([]);
        },
    );

    it.each(['xV1.0.0', 'V1.0.0x', 'V1.0', 'V1.0.0-', 'V1.0.0-UPPER', 'V1.0.0-a_b'])(
        'refuses the version %s',
        (version) => {
            const secondChanged = changed((scenario): void => {
                scenario.version = version;
            });
            const problems = problemsOf(secondChanged);
            expect(problems).toEqual(['version: must be a version like V1.0.0']);
        },
    );

    it('allows steps at the same time', () => {
        const secondChanged = changed((scenario): void => {
            scenario.steps[1]!.at = scenario.steps[0]!.at;
        });
        const problems = problemsOf(secondChanged);
        expect(problems).toEqual([]);
    });

    it('allows seed 0', () => {
        const secondChanged = changed((scenario): void => {
            scenario.seed = 0;
        });
        const problems = problemsOf(secondChanged);
        expect(problems).toEqual([]);
    });

    it('says a location must have a latitude and a longitude', () => {
        const secondChanged = changed((scenario): void => {
            (scenario.restaurants[0] as Record<string, unknown>)['location'] = 5;
        });
        const problems = problemsOf(secondChanged);
        expect(problems).toContain(
            'restaurants[0].location: must have a latitude and a longitude',
        );
    });

    it('names an unknown field inside a location', () => {
        const secondChanged = changed((scenario): void => {
            (scenario.restaurants[0]!.location as Record<string, unknown>)['height'] = 5;
        });
        const problems = problemsOf(secondChanged);
        expect(problems).toEqual([
            'restaurants[0].location.height: is not a field of this format',
        ]);
    });

    it('refuses a blank description', () => {
        const secondChanged = changed((scenario): void => {
            scenario.description = ' ';
        });
        const problems = problemsOf(secondChanged);
        expect(problems).toEqual(['description: must be text that is not blank']);
    });

    it('does not judge the order of a step whose command is unknown', () => {
        const secondChanged = changed((scenario): void => {
            scenario.steps[5]!.command = 'fly';
            scenario.steps[5]!.order = 'B';
        });
        const problems = problemsOf(secondChanged);
        expect(problems).toEqual([
            'steps[5].command: must be one of create-order, request-delivery, mark-ready, accept, pick-up, deliver',
        ]);
    });

    it('survives being written as JSON and read again', () => {
        const validText = JSON.stringify(VALID);
        const expected = read(VALID);
        const parsed: unknown = JSON.parse(validText);
        const scenario = read(parsed);
        expect(scenario).toEqual(expected);
    });

    it.each<[string, Changes, string]>([
        [
            'a wrong format',
            (scenario): void => {
                scenario.format = 2;
            },
            'format: must be 1',
        ],
        [
            'a blank name',
            (scenario): void => {
                scenario.name = '  ';
            },
            'name: must be text that is not blank',
        ],
        [
            'a bad version',
            (scenario): void => {
                scenario.version = '1.0.0';
            },
            'version: must be a version like V1.0.0',
        ],
        [
            'a fractional seed',
            (scenario): void => {
                scenario.seed = 1.5;
            },
            'seed: must be a whole number from 0 to 4294967295',
        ],
        [
            'a negative seed',
            (scenario): void => {
                scenario.seed = -1;
            },
            'seed: must be a whole number from 0 to 4294967295',
        ],
        [
            'too large a seed',
            (scenario): void => {
                scenario.seed = 4294967296;
            },
            'seed: must be a whole number from 0 to 4294967295',
        ],
        [
            'a bad time',
            (scenario): void => {
                scenario.runUntil = '00:05:00';
            },
            'runUntil: must be a time like h00:m05:s00:ms00',
        ],
        [
            'a typing mistake in a field name',
            (scenario): void => {
                scenario['seeed'] = 1;
            },
            'seeed: is not a field of this format',
        ],
        [
            'a typing mistake in a nested field',
            (scenario): void => {
                (scenario.restaurants[0] as Record<string, unknown>)['aria'] = 'x';
            },
            'restaurants[0].aria: is not a field of this format',
        ],
        [
            'a restaurant that is not an object',
            (scenario): void => {
                (scenario as Record<string, unknown>)['restaurants'] = ['m'];
            },
            'restaurants[0]: must have fields',
        ],
        [
            'restaurants that are not a list',
            (scenario): void => {
                (scenario as Record<string, unknown>)['restaurants'] = {};
            },
            'restaurants: must be a list',
        ],
        [
            'a latitude out of range',
            (scenario): void => {
                scenario.restaurants[0]!.location.latitude = 91;
            },
            'restaurants[0].location.latitude: must be a number from -90 to 90',
        ],
        [
            'a longitude out of range',
            (scenario): void => {
                scenario.restaurants[0]!.location.longitude = -181;
            },
            'restaurants[0].location.longitude: must be a number from -180 to 180',
        ],
        [
            'a restaurant with neither a location nor an area',
            (scenario): void => {
                delete (scenario.restaurants[0] as Record<string, unknown>)['location'];
                delete (scenario.restaurants[0] as Record<string, unknown>)['area'];
            },
            'restaurants[0].area: is missing: give an area, a location, or both',
        ],
        [
            'a driver with neither a location nor an area',
            (scenario): void => {
                delete (scenario.drivers[1] as Record<string, unknown>)['area'];
            },
            'drivers[1].area: is missing: give an area, a location, or both',
        ],
        [
            'a point and an area that disagree',
            (scenario): void => {
                scenario.restaurants[0]!.area = 'area-2';
            },
            'restaurants[0].area: is "area-2", but the location lies in "area-1"',
        ],
        [
            "an area that is not one of the city's",
            (scenario): void => {
                scenario.drivers[1]!.area = 'area-9';
            },
            "drivers[1].area: is not one of the city's areas",
        ],
        [
            'no city',
            (scenario): void => {
                delete (scenario as Record<string, unknown>)['city'];
            },
            'city: is missing',
        ],
        [
            'a city whose areas are not square',
            (scenario): void => {
                scenario.city.heightKm = 3;
            },
            "city: A city's areas must be square, not 1 km wide and 1.5 km high.",
        ],
        [
            'a city with no areas across',
            (scenario): void => {
                scenario.city.across = 0;
            },
            'city.across: must be a whole number from 1 to 1000',
        ],
        [
            'a city of no width',
            (scenario): void => {
                scenario.city.widthKm = 0;
            },
            'city.widthKm: must be a number above 0',
        ],
        [
            'too few area names',
            (scenario): void => {
                (scenario.city as Record<string, unknown>)['areas'] = ['north'];
            },
            'city.areas: must name all 4 areas, row by row',
        ],
        [
            'area names that repeat',
            (scenario): void => {
                (scenario.city as Record<string, unknown>)['areas'] = ['a', 'a', 'b', 'c'];
            },
            'city.areas: must be a list of different names that are not blank',
        ],
        [
            'blocks of no metres',
            (scenario): void => {
                (scenario.city as Record<string, unknown>)['blockMetres'] = 0;
            },
            'city.blockMetres: must be a number of metres above 0',
        ],
        [
            'waiting points that are not an object',
            (scenario): void => {
                (scenario.city as Record<string, unknown>)['waitingPoints'] = [];
            },
            'city.waitingPoints: must be an object of points, by area',
        ],
        [
            'a waiting point for an area the city does not have',
            (scenario): void => {
                (scenario.city as Record<string, unknown>)['waitingPoints'] = {
                    'area-9': { latitude: 10.33, longitude: 20.82 },
                };
            },
            "city.waitingPoints.area-9: is not one of the city's areas",
        ],
        [
            'a waiting point outside its area',
            (scenario): void => {
                (scenario.city as Record<string, unknown>)['waitingPoints'] = {
                    'area-2': { latitude: 10.33, longitude: 20.82 },
                };
            },
            'city.waitingPoints.area-2: must lie in that area',
        ],
        [
            'a waiting point with no longitude',
            (scenario): void => {
                (scenario.city as Record<string, unknown>)['waitingPoints'] = {
                    'area-1': { latitude: 10.33 },
                };
            },
            'city.waitingPoints.area-1.longitude: must be a number from -180 to 180',
        ],
        [
            'an unknown field in the city',
            (scenario): void => {
                (scenario.city as Record<string, unknown>)['density'] = 5;
            },
            'city.density: is not a field of this format',
        ],
        [
            'an unknown availability',
            (scenario): void => {
                scenario.drivers[0]!.availability = 'Asleep';
            },
            'drivers[0].availability: must be one of Offline, Available, Busy, FreeForDelivery',
        ],
        [
            'a location with no time',
            (scenario): void => {
                delete (scenario.drivers[0] as Record<string, unknown>)['locatedAt'];
            },
            'drivers[0].locatedAt: is missing: a location and its time go together',
        ],
        [
            'a time with no location',
            (scenario): void => {
                (scenario.drivers[1] as Record<string, unknown>)['locatedAt'] = 'h00:m00:s00:ms00';
            },
            'drivers[1].location: is missing: a location and its time go together',
        ],
        [
            'a repeated restaurant',
            (scenario): void => {
                scenario.restaurants.push({ ...scenario.restaurants[0]! });
            },
            'restaurants[1].id: repeats "restaurant-1"',
        ],
        [
            'a repeated driver',
            (scenario): void => {
                scenario.drivers[1]!.id = 'driver-1';
            },
            'drivers[1].id: repeats "driver-1"',
        ],
        [
            'an unknown command',
            (scenario): void => {
                scenario.steps[0]!.command = 'fly';
            },
            'steps[0].command: must be one of create-order, request-delivery, mark-ready, accept, pick-up, deliver',
        ],
        [
            'a step out of time order',
            (scenario): void => {
                scenario.steps[1]!.at = 'h00:m00:s00:ms500';
            },
            'steps[1].at: is before the step above it: steps must be in time order',
        ],
        [
            'a step after runUntil',
            (scenario): void => {
                scenario.steps[5]!.at = 'h00:m05:s00:ms01';
            },
            'steps[5].at: is after runUntil',
        ],
        [
            'a restaurant command by a driver',
            (scenario): void => {
                scenario.steps[2]!.actor = 'driver-1';
            },
            'steps[2].actor: must be a restaurant for mark-ready',
        ],
        [
            'a driver command by a restaurant',
            (scenario): void => {
                scenario.steps[3]!.actor = 'restaurant-1';
            },
            'steps[3].actor: must be a driver for accept',
        ],
        [
            'an unknown actor',
            (scenario): void => {
                scenario.steps[3]!.actor = 'nobody';
            },
            'steps[3].actor: must be a driver for accept',
        ],
        [
            'an order used before it is created',
            (scenario): void => {
                scenario.steps[1]!.order = 'B';
            },
            'steps[1].order: "B" is not created by an earlier step',
        ],
        [
            'an order used twice before it is created',
            (scenario): void => {
                scenario.steps[1]!.order = 'B';
                scenario.steps[2]!.order = 'B';
            },
            'steps[2].order: "B" is not created by an earlier step',
        ],
        [
            'an order created twice',
            (scenario): void => {
                scenario.steps[1]!.command = 'create-order';
            },
            'steps[1].order: "A" is already created',
        ],
    ])('refuses %s, saying what is wrong', (_name, change, problem) => {
        const secondChanged = changed(change);
        const problems = problemsOf(secondChanged);
        expect(problems).toContain(problem);
    });

    it.each([null, 'text', 5, []])('refuses %j, which is not an object', (value) => {
        const problems = problemsOf(value);
        expect(problems).toEqual([': a scenario must be an object with fields']);
    });

    it('reports every missing required field', () => {
        const problems = problemsOf({});
        expect(problems).toEqual([
            'format: must be 1',
            'name: is missing',
            'version: is missing',
            'seed: must be a whole number from 0 to 4294967295',
            'runUntil: is missing',
            'city: is missing',
            'restaurants: is missing',
            'customers: is missing',
            'drivers: is missing',
            'steps: is missing',
        ]);
    });

    it('reports every problem at once', () => {
        const secondChanged = changed((scenario): void => {
            scenario.name = '';
            scenario.seed = -1;
            scenario.steps[0]!.command = 'fly';
        });
        const problems = problemsOf(secondChanged);

        expect(problems.length).toBeGreaterThanOrEqual(3);
    });

    it('is refused as a typed result, not an exception', () => {
        const result = readScenario({});

        expect(result.isOk).toBe(false);
    });
});

describe('a use step', () => {
    /** The valid scenario with a step added, kept in time order after the first step. */
    const withStep = (step: Record<string, unknown>): unknown =>
        changed((scenario) => {
            (scenario.steps as unknown[]).splice(1, 0, step);
        });

    it('switches functions to the versions it names, at its time', () => {
        const file = withStep({
            at: 'h00:m00:s01:ms00',
            use: [{ function: 'orders.pick-up', version: 1 }],
        });

        const scenario = read(file);

        const [, step] = scenario.steps.toArray();
        expect(step).toEqual({
            at: toSimTime(1000),
            use: List([{ function: 'orders.pick-up', version: 1 }]),
        });
    });

    it.each<[string, unknown, string]>([
        [
            'a function that does not exist',
            [{ function: 'orders.fly', version: 1 }],
            'steps[1].use[0].function: "orders.fly" is not a state function',
        ],
        [
            'a version that does not exist',
            [{ function: 'orders.pick-up', version: 2 }],
            'steps[1].use[0].version: orders.pick-up has no version 2',
        ],
        [
            'a version that is not a whole number',
            [{ function: 'orders.pick-up', version: 1.5 }],
            'steps[1].use[0].version: must be a whole number from 1',
        ],
        [
            'an entry with other fields',
            [{ function: 'orders.pick-up', version: 1, why: 'x' }],
            'steps[1].use[0].why',
        ],
        ['an empty list', [], 'steps[1].use: must list at least one function and its version'],
        [
            'an entry that is not an object',
            ['orders.pick-up'],
            'steps[1].use[0]: must have fields',
        ],
    ])('refuses %s, saying where', (_name, use, problem) => {
        const file = withStep({ at: 'h00:m00:s01:ms00', use });

        const problems = problemsOf(file);

        const isFound = problems.some((each) => each.startsWith(problem));
        expect(isFound).toBe(true);
    });
});
