import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { cityScenario } from './city-scenario.mjs';

const TIMEOUT_MS = 60_000;
// From the mutable code that came before the immutable design, which gave the same run.
const SMALL_CITY_DIGEST = '6fc3c4933ebdfd9c';

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
