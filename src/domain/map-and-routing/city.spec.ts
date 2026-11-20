import { List, OrderedMap } from 'immutable';
import { describe, expect, it } from 'vitest';

import type { IRandomSource } from '../system/randomness/random-source';
import type { Fraction } from '../system/math/math';
import { toCount, toFraction } from '../system/math/math';
import type { AreaId } from './area-id';
import { toAreaId } from './area-id';
import type { ICitySettings } from './city';
import { City, DEFAULT_BLOCK_METRES } from './city';
import { Coordinates } from './coordinates';
import type { IPlanePoint } from './local-plane';
import { fromPlane, toPlane } from './local-plane';
import { toCitySeed, toDegrees, toKilometres, toMetres } from './numbers';

const at = (latitude: number, longitude: number): Coordinates =>
    Coordinates.create({ latitude: toDegrees(latitude), longitude: toDegrees(longitude) });

const ORIGIN = at(10.33, 20.82);

/** Settings for a city of 1 km areas, `across` by `down`, from ORIGIN unless another is given. */
const settings = (across: number, down: number, origin = ORIGIN): ICitySettings => ({
    origin,
    widthKm: toKilometres(across),
    heightKm: toKilometres(down),
    across: toCount(across),
    down: toCount(down),
    seed: toCitySeed(7),
    blockMetres: DEFAULT_BLOCK_METRES,
});

/** A random source that hands out its fractions in turn, noting each stream drawn from. */
interface IFixedSource extends IRandomSource {
    readonly drawnFrom: readonly string[];
}

function fixedSource(
    fractions: readonly number[],
    drawnFrom: readonly string[] = [],
): IFixedSource {
    return {
        drawnFrom,
        nextFraction: (stream: string): readonly [Fraction, IRandomSource] => {
            const fraction = toFraction(fractions[0]!);
            const rest = fractions.slice(1);
            const after = fixedSource(rest, [...drawnFrom, stream]);
            return [fraction, after];
        },
    };
}

/** The place at metres east and north of a city's south-west corner. */
function placeAt(city: City, east: number, north: number): Coordinates {
    const point: IPlanePoint = { eastMetres: toMetres(east), northMetres: toMetres(north) };
    return fromPlane(city.origin, point);
}

const THREE_BY_TWO = settings(3, 2);
const SOUTH_POLE = at(-90, 0);
const NEAR_NORTH_POLE = at(89.999, 0);
const NEAR_DATE_LINE = at(0, 179.999);
const NORTH_AND_SOUTH = ['north', 'south'].map(toAreaId);
const AREAS = ['area-1', 'area-2', 'area-3', 'area-4', 'area-5', 'area-6'].map(toAreaId);

describe('a simple city', () => {
    it('names its areas row by row from the south-west, and cannot change', () => {
        const city = City.createNew(THREE_BY_TWO);

        const names = city.areaIds.toArray();
        expect(names).toEqual(['area-1', 'area-2', 'area-3', 'area-4', 'area-5', 'area-6']);
        const isFrozen = Object.isFrozen(city);
        expect(isFrozen).toBe(true);
    });

    it('keeps the names it is given', () => {
        const areaIds = List(NORTH_AND_SOUTH);

        const city = City.create({ ...settings(1, 2), areaIds, waitingPoints: OrderedMap() });

        const names = city.areaIds.toArray();
        expect(names).toEqual(['north', 'south']);
    });

    it('works out the side of its areas', () => {
        const city = City.createNew({
            ...THREE_BY_TWO,
            widthKm: toKilometres(6),
            heightKm: toKilometres(4),
        });

        const side = city.areaSideMetres();

        expect(side).toBe(2000);
    });

    it.each<[string, ICitySettings]>([
        ['no areas across', { ...THREE_BY_TWO, across: toCount(0) }],
        ['no areas down', { ...THREE_BY_TWO, down: toCount(0) }],
        ['no width', { ...THREE_BY_TWO, widthKm: toKilometres(0) }],
        ['a negative height', { ...THREE_BY_TWO, heightKm: toKilometres(-2) }],
        ['areas that are not square', { ...THREE_BY_TWO, heightKm: toKilometres(3) }],
        ['a corner at a pole', settings(1, 1, SOUTH_POLE)],
        ['a city past the north pole', settings(1, 1, NEAR_NORTH_POLE)],
        ['a city past the date line', settings(1, 1, NEAR_DATE_LINE)],
    ])('refuses %s', (_case, refused) => {
        expect(() => City.createNew(refused)).toThrow(RangeError);
    });

    it.each<[string, readonly string[]]>([
        ['too few names', ['north']],
        ['the same name twice', ['north', 'north']],
    ])('refuses %s for its areas', (_case, names) => {
        const ids = names.map(toAreaId);
        const areaIds = List(ids);

        expect(() =>
            City.create({ ...settings(1, 2), areaIds, waitingPoints: OrderedMap() }),
        ).toThrow(RangeError);
    });
});

describe('the area a place lies in', () => {
    const city = City.createNew(THREE_BY_TWO);

    it.each<[number, number, string]>([
        [500, 500, 'area-1'],
        [1500, 500, 'area-2'],
        [2500, 500, 'area-3'],
        [500, 1500, 'area-4'],
        [2500, 1500, 'area-6'],
        [0, 0, 'area-1'],
        [3000, 2000, 'area-6'],
    ])('is found %s m east and %s m north of the corner: %s', (east, north, expected) => {
        const place = placeAt(city, east, north);

        const area = city.areaAt(place);

        expect(area).toBe(expected);
    });

    it.each<[string, number, number, string]>([
        ['east', 1000, 500, 'area-2'],
        ['north', 500, 1000, 'area-4'],
    ])('belongs to the area %s of an edge between two', (_way, east, north, expected) => {
        const place = placeAt(city, east, north);

        const area = city.areaAt(place);

        expect(area).toBe(expected);
    });

    it.each<[number, number]>([
        [-1, 500],
        [500, -1],
        [3001, 500],
        [500, 2001],
    ])('is none %s m east and %s m north of the corner, outside the city', (east, north) => {
        const place = placeAt(city, east, north);

        const area = city.areaAt(place);

        expect(area).toBeUndefined();
    });
});

describe('a place picked in an area', () => {
    const city = City.createNew(THREE_BY_TWO);

    it.each(AREAS)('lies in %s', (areaId: AreaId) => {
        const source = fixedSource([0.37, 0.81]);

        const [place] = city.pickIn(areaId, source, 'restaurant-1')!;

        const area = city.areaAt(place);
        expect(area).toBe(areaId);
    });

    it.each([
        [0, 0],
        [0.9999999997, 0.9999999997],
    ])('stays in its area at fractions of %s and %s', (east, north) => {
        const source = fixedSource([east, north]);
        const areaId = toAreaId('area-5');

        const [place] = city.pickIn(areaId, source, 'restaurant-1')!;

        const area = city.areaAt(place);
        expect(area).toBe(areaId);
    });

    it('draws twice from its own named stream, east then north', () => {
        const source = fixedSource([0.5, 0.25]);
        const areaId = toAreaId('area-1');

        const [place, after] = city.pickIn(areaId, source, 'restaurant-7')!;

        const expected = placeAt(city, 500, 250);
        expect(place.latitude).toBeCloseTo(expected.latitude, 12);
        expect(place.longitude).toBeCloseTo(expected.longitude, 12);
        const drawn = (after as IFixedSource).drawnFrom;
        expect(drawn).toEqual(['restaurant-7', 'restaurant-7']);
    });

    it('is none for an area the city does not have, and draws nothing', () => {
        const source = fixedSource([0.5, 0.5]);
        const areaId = toAreaId('area-9');

        const picked = city.pickIn(areaId, source, 'restaurant-1');

        expect(picked).toBeUndefined();
    });
});

/** Where a place is, in whole metres east and north of a city's south-west corner. */
function metresOf(city: City, place: Coordinates | undefined): [number, number] {
    const { eastMetres, northMetres } = toPlane(city.origin, place!);
    return [Math.round(eastMetres), Math.round(northMetres)];
}

describe("an area's waiting point", () => {
    const city = City.createNew(THREE_BY_TWO);

    it.each<[string, number, number]>([
        ['area-1', 400, 400],
        ['area-2', 1400, 400],
        ['area-6', 2400, 1400],
    ])(
        'is the crossing nearest the centre of %s, south and west on a tie',
        (area, east, north) => {
            const areaId = toAreaId(area);

            const point = city.waitingPointIn(areaId);

            const metres = metresOf(city, point);
            expect(metres).toEqual([east, north]);
        },
    );

    it('is the centre when an area holds an even number of blocks', () => {
        const quarters = City.createNew({ ...THREE_BY_TWO, blockMetres: toMetres(250) });
        const areaId = toAreaId('area-1');

        const point = quarters.waitingPointIn(areaId);

        const metres = metresOf(quarters, point);
        expect(metres).toEqual([500, 500]);
    });

    it("is the area's south-west corner when the area is one block", () => {
        const big = City.createNew({ ...THREE_BY_TWO, blockMetres: toMetres(5000) });
        const areaId = toAreaId('area-5');

        const point = big.waitingPointIn(areaId);

        const metres = metresOf(big, point);
        expect(metres).toEqual([1000, 1000]);
    });

    it('is the point set for the area, leaving the other areas their own', () => {
        const set = placeAt(city, 700, 900);
        const first = toAreaId('area-1');
        const second = toAreaId('area-2');
        const points = OrderedMap([[first, set]]);

        const placed = city.withWaitingPoints(points);

        const point = placed.waitingPointIn(first);
        const other = placed.waitingPointIn(second);
        expect(point).toBe(set);
        const metres = metresOf(placed, other);
        expect(metres).toEqual([1400, 400]);
    });

    it('is none for an area the city does not have', () => {
        const areaId = toAreaId('area-9');

        const point = city.waitingPointIn(areaId);

        expect(point).toBeUndefined();
    });

    it.each<[string, string, number, number]>([
        ['an area the city does not have', 'area-9', 500, 500],
        ['a point outside its area', 'area-1', 1500, 500],
    ])('refuses one set for %s', (_case, area, east, north) => {
        const point = placeAt(city, east, north);
        const areaId = toAreaId(area);
        const points = OrderedMap([[areaId, point]]);

        expect(() => city.withWaitingPoints(points)).toThrow(RangeError);
    });
});
