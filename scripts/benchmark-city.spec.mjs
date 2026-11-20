import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { cityScenario } from './city-scenario.mjs';

// A small day takes about 45 seconds on its own, mostly loading its saved runs, as drivers' apps
// send every 30 seconds; under the whole suite's load it takes longer (I03-E09-008).
const TIMEOUT_MS = 180_000;
// First from the mutable code that came before the immutable design, which gave the same run;
// pinned again when each order's creation came to log its customer and address, and when drivers'
// apps came to send their locations every 30 seconds, when drivers came to ride, when they came
// to go to wait at their area's waiting point, and when the sends due at one moment came to be one
// call (FND-90).
const SMALL_CITY_DIGEST = 'bab070d88d99f2a5';

function measure(drivers, orders) {
    const secondExecFileSync = execFileSync(
        process.execPath,
        ['scripts/benchmark-city.mjs', '--drivers', String(drivers), '--orders', String(orders)],
        { encoding: 'utf8', timeout: TIMEOUT_MS },
    );
    return JSON.parse(secondExecFileSync);
}

describe('the city benchmark', () => {
    const small = measure(5, 20);

    it('delivers every order, with nothing refused', () => {
        expect(small).toMatchObject({ failure: null, delivered: 20, refused: 0 });
    });

    it('reports how long the run took', () => {
        expect(small.secondsToRun).toBeGreaterThan(0);
    });

    it('gives the run the mutable code gave', () => {
        expect(small.digest).toBe(SMALL_CITY_DIGEST);
    });

    it('gives back the same run saved at either level, and says how big each is', () => {
        expect(small.saved).toMatchObject({
            everything: { isSameRun: true },
            minimum: { isSameRun: true },
        });
        expect(small.saved.everything.mb).toBeGreaterThan(0);
    });

    it('builds the same scenario every time', () => {
        const thirdCityScenario = cityScenario(5, 20);
        const secondCityScenario = cityScenario(5, 20);
        expect(thirdCityScenario).toEqual(secondCityScenario);
    });

    it('has at least one restaurant, however few the drivers', () => {
        expect(cityScenario(1, 1).restaurants).toHaveLength(1);
    });

    it('puts the steps in time order, as the format requires', () => {
        const times = cityScenario(5, 20).steps.map((step) => step.at);

        const sorted = times.toSorted();
        expect(times).toEqual(sorted);
    });
});
