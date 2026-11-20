import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { toAreaId } from './area-id';
import { cityAround, MARGIN_AROUND_METRES } from './city-around';
import { Coordinates } from './coordinates';
import { toCitySeed, toDegrees } from './numbers';

const at = (latitude: number, longitude: number): Coordinates =>
    Coordinates.create({ latitude: toDegrees(latitude), longitude: toDegrees(longitude) });

const NORTH = toAreaId('north');
const SEED = toCitySeed(0);
const RESTAURANT = at(10.33, 20.82);
const DRIVER = at(10.331, 20.825);
const FAR = at(10.34, 20.83);

describe('the city made around places', () => {
    it('is one square area of a kilometre around one place, named as given', () => {
        const places = List.of(RESTAURANT);

        const city = cityAround(places, NORTH, SEED);

        const names = city.areaIds.toArray();
        expect(names).toEqual(['north']);
        expect(city.widthKm).toBeCloseTo((2 * MARGIN_AROUND_METRES) / 1000, 9);
        expect(city.heightKm).toBe(city.widthKm);
        const area = city.areaAt(RESTAURANT);
        expect(area).toBe('north');
    });

    it('holds every place, half a kilometre in from its edges', () => {
        const places = List.of(RESTAURANT, DRIVER, FAR);

        const city = cityAround(places, NORTH, SEED);

        const areas = places.map((place) => city.areaAt(place)).toArray();
        expect(areas).toEqual(['north', 'north', 'north']);
        const fromCorner = city.origin.straightLineMetresTo(RESTAURANT);
        expect(fromCorner).toBeCloseTo(Math.SQRT2 * MARGIN_AROUND_METRES, -1);
    });

    it('is a kilometre square somewhere, for no places at all', () => {
        const places = List<Coordinates>();

        const city = cityAround(places, NORTH, SEED);

        expect(city.widthKm).toBe(1);
        expect(city.areaIds.size).toBe(1);
    });
});
