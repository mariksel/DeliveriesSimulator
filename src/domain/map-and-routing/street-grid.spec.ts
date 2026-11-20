import { List, Set as ImmutableSet } from 'immutable';
import { describe, expect, it } from 'vitest';

import type { Fraction } from '../system/math/math';
import { toCount, toFraction } from '../system/math/math';
import type { IRandomSource } from '../system/randomness/random-source';
import { City, DEFAULT_BLOCK_METRES } from './city';
import { Coordinates } from './coordinates';
import { toCitySeed, toDegrees, toKilometres, toMetres } from './numbers';
import type { IStreet } from './street-grid';
import { crossingKey, STREETS_STREAM, StreetGrid } from './street-grid';

const CORNER = Coordinates.create({ latitude: toDegrees(10.325), longitude: toDegrees(20.815) });

/** A city of 1 km areas, three across and two down. */
const city = (blockMetres = DEFAULT_BLOCK_METRES): City =>
    City.createNew({
        origin: CORNER,
        widthKm: toKilometres(3),
        heightKm: toKilometres(2),
        across: toCount(3),
        down: toCount(2),
        seed: toCitySeed(7),
        blockMetres,
    });

/** A random source whose nth draw is given by a function, noting which stream each came from. */
interface ICountingSource extends IRandomSource {
    readonly streams: readonly string[];
}

function sourceOf(
    fraction: (draw: number) => number,
    streams: readonly string[] = [],
): ICountingSource {
    return {
        streams,
        nextFraction: (stream: string): readonly [Fraction, IRandomSource] => {
            const drawnValue = fraction(streams.length);
            const value = toFraction(drawnValue);
            const after = sourceOf(fraction, [...streams, stream]);
            return [value, after];
        },
    };
}

/** Every crossing reachable from the south-west corner along a grid's streets. */
function reachable(streets: List<IStreet>): number {
    const pairs = streets.flatMap((street) => {
        const from = crossingKey(street.from);
        const to = crossingKey(street.to);
        return [
            [from, to],
            [to, from],
        ];
    });
    const walk = (seen: ImmutableSet<string>): ImmutableSet<string> => {
        const next = pairs.filter(([from, to]) => seen.has(from!) && !seen.has(to!));
        const nextKeys = next.map(([, to]) => to!);
        const seenNow = seen.union(nextKeys);
        return next.isEmpty() ? seen : walk(seenNow);
    };
    const start = ImmutableSet.of('0,0');
    const reached = walk(start);
    return reached.size;
}

const KEEP_ALL = sourceOf(() => 0.5);
const TOWN = city();

describe("a simple city's streets", () => {
    it('lay a crossing every block, lining up across areas', () => {
        const grid = StreetGrid.createNew(TOWN, KEEP_ALL);

        expect(grid).toMatchObject({ spacingMetres: 200, columns: 16, rows: 11 });
        const point = grid.pointOf({ column: 5, row: 10 });
        expect(point).toEqual({ eastMetres: 1000, northMetres: 2000 });
        expect(grid.streets.size).toBe(15 * 11 + 16 * 10);
    });

    it("run main roads along every area's edge", () => {
        const grid = StreetGrid.createNew(TOWN, KEEP_ALL);

        const main = grid.streets.filter((street) => street.isMain);
        const isOnEdges = main.every((street) => {
            const isAcross = street.from.row === street.to.row;
            return isAcross ? street.from.row % 5 === 0 : street.from.column % 5 === 0;
        });
        expect(main.size).toBe(3 * 15 + 4 * 10);
        expect(isOnEdges).toBe(true);
    });

    it('leave out about one local segment in eight, drawing once for each from their stream', () => {
        const source = sourceOf((draw) => (draw % 8 === 0 ? 0.05 : 0.5));

        const grid = StreetGrid.createNew(TOWN, source);

        const local = 325 - 85;
        expect(grid.streets.size).toBe(325 - local / 8);
        const after = grid.streets.filter((street) => !street.isMain);
        expect(after.size).toBe(local - local / 8);
    });

    it('keep every main road, and bring back what every crossing needs, whatever is drawn', () => {
        const leaveAll = sourceOf(() => 0);

        const grid = StreetGrid.createNew(TOWN, leaveAll);

        const main = grid.streets.filter((street) => street.isMain);
        expect(main.size).toBe(85);
        const reached = reachable(grid.streets);
        expect(reached).toBe(16 * 11);
    });

    it('draw only from their own stream', () => {
        const drawn: string[] = [];
        const source: IRandomSource = {
            nextFraction: (stream: string): readonly [Fraction, IRandomSource] => {
                drawn.push(stream);
                const half = toFraction(0.5);
                return [half, source];
            },
        };

        StreetGrid.createNew(TOWN, source);

        const streams = new Set(drawn);
        const named = [...streams];
        expect(named).toEqual([STREETS_STREAM]);
        expect(drawn).toHaveLength(240);
    });

    it('are only main roads where a block is wider than an area', () => {
        const wideBlocks = toMetres(5000);
        const wide = city(wideBlocks);

        const grid = StreetGrid.createNew(wide, KEEP_ALL);

        expect(grid).toMatchObject({ spacingMetres: 1000, columns: 4, rows: 3 });
        const isAllMain = grid.streets.every((street) => street.isMain);
        expect(isAllMain).toBe(true);
    });

    it('split an area into as many equal blocks as fit', () => {
        const oddBlocks = toMetres(300);
        const odd = city(oddBlocks);

        const grid = StreetGrid.createNew(odd, KEEP_ALL);

        expect(grid.spacingMetres).toBeCloseTo(1000 / 3, 9);
        expect(grid.columns).toBe(10);
    });

    it('refuse a spacing of nothing', () => {
        expect(() =>
            StreetGrid.create({
                spacingMetres: toMetres(0),
                columns: toCount(1),
                rows: toCount(1),
                streets: List(),
            }),
        ).toThrow(RangeError);
    });
});
