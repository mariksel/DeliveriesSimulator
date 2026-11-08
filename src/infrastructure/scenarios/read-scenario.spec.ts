import { describe, expect, it } from 'vitest';

import { readScenario } from './read-scenario';
import type { IScenario } from '../../application-core/scenarios/scenario';

const VALID = {
    format: 1,
    name: 'One order, happy path',
    description: 'One order from creation to delivered.',
    version: 'V1.0.0',
    seed: 42,
    runUntil: 'h00:m05:s00:ms00',
    restaurants: [
        { id: 'restaurant-1', area: 'area-1', location: { latitude: 10.33, longitude: 20.82 } },
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
        { at: 'h00:m00:s01:ms00', actor: 'restaurant-1', command: 'create-order', order: 'A' },
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

    it('allows a scenario with no description, drivers, or steps', () => {
        const secondChanged = changed((scenario): void => {
            delete (scenario as Record<string, unknown>)['description'];
            scenario.drivers = [];
            scenario.steps = [];
        });
        const scenario = read(secondChanged);

        expect(scenario.description).toBeNull();
    });

    it('allows the far ends of the ranges', () => {
        const secondChanged = changed((scenario): void => {
            scenario.restaurants[0]!.location = { latitude: -90, longitude: 180 };
            scenario.drivers[0]!.location = { latitude: 90, longitude: -180 };
            scenario.seed = 4294967295;
        });
        const problems = problemsOf(secondChanged);
        expect(problems).toEqual([]);
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
            'a restaurant with no location',
            (scenario): void => {
                delete (scenario.restaurants[0] as Record<string, unknown>)['location'];
            },
            'restaurants[0].location: is missing',
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
            'restaurants: is missing',
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
