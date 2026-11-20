import { describe, expect, it } from 'vitest';

import { persistedCityAround } from './city-around-records';

const RESTAURANT = { areaId: 'north', coordinates: { latitude: 10.33, longitude: 20.82 } };
const OFFLINE_DRIVER = { areaId: 'north', coordinates: null };

describe("the city an older record's places get", () => {
    it('names its one area as the area every place uses', () => {
        const city = persistedCityAround([RESTAURANT, OFFLINE_DRIVER], 'A record');

        expect(city).toMatchObject({ across: 1, down: 1, areaIds: ['north'] });
    });

    it('is named area-1 when there are no places', () => {
        const city = persistedCityAround([], 'A record');

        expect(city.areaIds).toEqual(['area-1']);
    });

    it('is refused, saying why, when the places use several areas', () => {
        const south = { ...OFFLINE_DRIVER, areaId: 'south' };

        expect(() => persistedCityAround([RESTAURANT, south], 'A record')).toThrow(
            'A record uses several areas (north, south), and no grid can keep every place in its own. Give it a city by hand.',
        );
    });
});
