import { describe, expect, it } from 'vitest';

import { Coordinates } from './coordinates';
import { toDegrees } from './numbers';

const at = (latitude: number, longitude: number): Coordinates =>
    Coordinates.create({ latitude: toDegrees(latitude), longitude: toDegrees(longitude) });

describe('Coordinates', () => {
    it('keeps its latitude and longitude, and cannot change', () => {
        const place = at(10.3, 20.8);

        expect(place).toMatchObject({ latitude: 10.3, longitude: 20.8 });
        const isFrozen = Object.isFrozen(place);
        expect(isFrozen).toBe(true);
    });

    it.each([
        [91, 0],
        [-91, 0],
        [0, 181],
        [0, -181],
        [Number.NaN, 0],
        [0, Number.POSITIVE_INFINITY],
    ])('refuses a latitude of %s and a longitude of %s', (latitude, longitude) => {
        expect(() =>
            Coordinates.create({ latitude: toDegrees(latitude), longitude: toDegrees(longitude) }),
        ).toThrow(RangeError);
    });

    it('takes the poles and the date line', () => {
        const north = at(90, 180);
        const south = at(-90, -180);

        expect(north.latitude).toBe(90);
        expect(south.longitude).toBe(-180);
    });
});

describe('the straight-line distance between two places', () => {
    it('is zero for the same place', () => {
        const place = at(10.3, 20.8);

        const distance = place.straightLineMetresTo(place);
        expect(distance).toBe(0);
    });

    it('gives one degree of latitude on a sphere of radius 6,371 km', () => {
        const from = at(0, 0);
        const to = at(1, 0);

        const distance = from.straightLineMetresTo(to);

        expect(distance).toBeCloseTo(111194.93, 1);
    });

    it('shrinks a degree of longitude away from the equator', () => {
        const from = at(60, 0);
        const to = at(60, 1);

        const distance = from.straightLineMetresTo(to);

        expect(distance).toBeCloseTo(55597.2, 0);
    });

    it('is the same in both directions', () => {
        const from = at(10.3, 20.8);
        const to = at(10.35, 20.75);

        const there = from.straightLineMetresTo(to);
        const back = to.straightLineMetresTo(from);
        expect(there).toBeCloseTo(back, 6);
    });

    it('gives half the circumference for opposite points', () => {
        const from = at(0, 0);
        const to = at(0, 180);

        const distance = from.straightLineMetresTo(to);

        expect(distance).toBeCloseTo(Math.PI * 6_371_000, 0);
    });
});
