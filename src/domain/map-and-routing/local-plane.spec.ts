import { describe, expect, it } from 'vitest';

import { Coordinates } from './coordinates';
import { fromPlane, toPlane } from './local-plane';
import { toDegrees, toMetres } from './numbers';

const at = (latitude: number, longitude: number): Coordinates =>
    Coordinates.create({ latitude: toDegrees(latitude), longitude: toDegrees(longitude) });

describe('the flat plane over a city', () => {
    it.each([0, 45, -60])('puts a place back where it came from, at latitude %s', (latitude) => {
        const origin = at(latitude, 20);
        const point = { eastMetres: toMetres(2500), northMetres: toMetres(1200) };

        const place = fromPlane(origin, point);
        const back = toPlane(origin, place);

        expect(back.eastMetres).toBeCloseTo(2500, 6);
        expect(back.northMetres).toBeCloseTo(1200, 6);
    });

    it.each([
        ['north', 0, 1000],
        ['east', 1000, 0],
    ])(
        'lays a kilometre %s as a kilometre over the sphere, at latitude 60',
        (_way, east, north) => {
            const origin = at(60, 20);
            const point = { eastMetres: toMetres(east), northMetres: toMetres(north) };

            const place = fromPlane(origin, point);

            const metres = origin.straightLineMetresTo(place);
            expect(metres).toBeCloseTo(1000, 0);
        },
    );

    it('puts the origin at no distance east or north', () => {
        const origin = at(10.33, 20.82);

        const point = toPlane(origin, origin);

        expect(point).toEqual({ eastMetres: 0, northMetres: 0 });
    });
});
