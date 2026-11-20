import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { toCount } from '../system/math/math';
import type { IPlanePoint } from './local-plane';
import { toMetres } from './numbers';
import { routeBetween } from './route';
import type { IStreet } from './street-grid';
import { StreetGrid } from './street-grid';

const SPACING = 100;

/** A street between two crossings, given by column and row. */
const street = (
    fromColumn: number,
    fromRow: number,
    toColumn: number,
    toRow: number,
): IStreet => ({
    from: { column: fromColumn, row: fromRow },
    to: { column: toColumn, row: toRow },
    isMain: false,
});

/**
 * A 4 by 4 grid of crossings, 100 m apart, with three streets missing: the middle of the bottom
 * row, and two in the middle, so some routes must go round.
 */
function smallGrid(): StreetGrid {
    const across = [0, 1, 2, 3].flatMap((row) =>
        [0, 1, 2].map((column) => street(column, row, column + 1, row)),
    );
    const down = [0, 1, 2, 3].flatMap((column) =>
        [0, 1, 2].map((row) => street(column, row, column, row + 1)),
    );
    const missing = new Set(['1,0>2,0', '1,1>1,2', '2,1>2,2']);
    const kept = [...across, ...down].filter(
        (one) => !missing.has(`${one.from.column},${one.from.row}>${one.to.column},${one.to.row}`),
    );
    return StreetGrid.create({
        spacingMetres: toMetres(SPACING),
        columns: toCount(4),
        rows: toCount(4),
        streets: List(kept),
    });
}

const GRID = smallGrid();

const at = (east: number, north: number): IPlanePoint => ({
    eastMetres: toMetres(east),
    northMetres: toMetres(north),
});

const length = (from: IPlanePoint, to: IPlanePoint): number =>
    Math.hypot(to.eastMetres - from.eastMetres, to.northMetres - from.northMetres);

/** The nearest point on a street to a place, and that street, found the simple way. */
function nearest(place: IPlanePoint): { readonly point: IPlanePoint; readonly index: number } {
    let best = { point: place, index: -1, metres: Number.POSITIVE_INFINITY };
    GRID.streets.forEach((one, index) => {
        const from = GRID.pointOf(one.from);
        const to = GRID.pointOf(one.to);
        const eastAtLeast = Math.max(place.eastMetres, from.eastMetres);
        const northAtLeast = Math.max(place.northMetres, from.northMetres);
        const east = Math.min(eastAtLeast, to.eastMetres);
        const north = Math.min(northAtLeast, to.northMetres);
        const point = at(east, north);
        const metres = length(place, point);
        if (metres < best.metres) {
            best = { point, index, metres };
        }
    });
    return best;
}

/**
 * The shortest way between two places found by trying every simple path: each joins its nearest
 * street, and the paths run between the two joins over every street's ends.
 */
function shortestByEveryPath(from: IPlanePoint, to: IPlanePoint): number {
    const start = nearest(from);
    const end = nearest(to);
    const nodes = new Map<string, IPlanePoint>();
    const edges = new Map<string, { readonly to: string; readonly metres: number }[]>();
    const join = (a: string, b: string): void => {
        const metres = length(nodes.get(a)!, nodes.get(b)!);
        edges.set(a, [...(edges.get(a) ?? []), { to: b, metres }]);
        edges.set(b, [...(edges.get(b) ?? []), { to: a, metres }]);
    };
    GRID.streets.forEach((one, index) => {
        const a = `${one.from.column},${one.from.row}`;
        const b = `${one.to.column},${one.to.row}`;
        const fromPoint = GRID.pointOf(one.from);
        const toPoint = GRID.pointOf(one.to);
        nodes.set(a, fromPoint);
        nodes.set(b, toPoint);
        const onIt = [
            ...(start.index === index ? ['start'] : []),
            ...(end.index === index ? ['end'] : []),
        ];
        nodes.set('start', start.point);
        nodes.set('end', end.point);
        const along = [a, ...onIt, b].toSorted((x, y) => {
            const px = nodes.get(x)!;
            const py = nodes.get(y)!;
            return px.eastMetres + px.northMetres - (py.eastMetres + py.northMetres);
        });
        for (let k = 0; k + 1 < along.length; k += 1) {
            join(along[k]!, along[k + 1]!);
        }
    });
    let shortest = Number.POSITIVE_INFINITY;
    const walk = (node: string, seen: Set<string>, metres: number): void => {
        if (node === 'end') {
            shortest = Math.min(shortest, metres);
            return;
        }
        for (const edge of edges.get(node) ?? []) {
            if (!seen.has(edge.to)) {
                const seenNow = new Set([...seen, edge.to]);
                walk(edge.to, seenNow, metres + edge.metres);
            }
        }
    };
    const startSeen = new Set(['start']);
    walk('start', startSeen, 0);
    return length(from, start.point) + shortest + length(end.point, to);
}

const PLACES: readonly (readonly [number, number])[] = [
    [10, 20],
    [150, 40],
    [260, 30],
    [140, 160],
    [250, 150],
    [290, 290],
    [50, 250],
    [160, 290],
];
const PAIRS = PLACES.flatMap((from) => PLACES.map((to) => [from, to] as const)).filter(
    ([from, to]) => from !== to,
);

describe('a route along the streets', () => {
    it.each(PAIRS)('from %j to %j is as short as the shortest of every path', (from, to) => {
        const start = at(from[0], from[1]);
        const end = at(to[0], to[1]);

        const route = routeBetween(GRID, start, end);

        const expected = shortestByEveryPath(start, end);
        expect(route.metres).toBeCloseTo(expected, 6);
    });

    it('starts and ends at the places, joining the nearest street by straight legs', () => {
        const start = at(10, 20);
        const end = at(290, 290);

        const route = routeBetween(GRID, start, end);

        const points = route.points.toArray();
        expect(points[0]).toEqual(start);
        const joined = at(0, 20);
        const left = at(290, 300);
        const beforeLast = points.at(-2);
        const last = points.at(-1);
        expect(points[1]).toEqual(joined);
        expect(beforeLast).toEqual(left);
        expect(last).toEqual(end);
    });

    it('goes round a missing street, so it is longer than walking the blocks', () => {
        const start = at(140, 0);
        const end = at(160, 0);

        const route = routeBetween(GRID, start, end);

        expect(route.metres).toBeGreaterThan(20);
        expect(route.metres).toBeCloseTo(40 + 100 + 100 + 100 + 40, 6);
    });

    it('runs straight along a street when both places join the same one', () => {
        const start = at(10, 210);
        const end = at(90, 190);

        const route = routeBetween(GRID, start, end);

        expect(route.metres).toBeCloseTo(10 + 80 + 10, 6);
        expect(route.points.size).toBe(4);
    });

    it('follows the streets: each turn is at a crossing', () => {
        const start = at(10, 20);
        const end = at(290, 290);

        const route = routeBetween(GRID, start, end);

        const corners = route.points.slice(2, -2).toArray();
        const isOnCrossings = corners.every(
            (point) => point.eastMetres % SPACING === 0 && point.northMetres % SPACING === 0,
        );
        expect(isOnCrossings).toBe(true);
    });
});
