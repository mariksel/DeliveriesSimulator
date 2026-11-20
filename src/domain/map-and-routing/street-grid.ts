import { List, Map as ImmutableMap, Set as ImmutableSet } from 'immutable';

import type { FieldsOf } from '../system/classes/fields-of';
import type { Count } from '../system/math/math';
import { toCount } from '../system/math/math';
import type { IRandomSource } from '../system/randomness/random-source';
import type { City } from './city';
import type { IPlanePoint } from './local-plane';
import type { Metres } from './numbers';
import { toMetres } from './numbers';

/** One local street segment in this many is left out. */
const LEFT_OUT_ONE_IN = 8;

/** The share of local street segments the city's seed leaves out (FND-90). */
export const LEFT_OUT_SHARE = 1 / LEFT_OUT_ONE_IN;
/** The stream of the city's randomness the streets draw from. */
export const STREETS_STREAM = 'streets';

/** A crossing of two streets, by its column from the west and its row from the south. */
export interface ICrossing {
    readonly column: number;
    readonly row: number;
}

/** A street between two neighbouring crossings, and whether it is a main road. */
export interface IStreet {
    readonly from: ICrossing;
    readonly to: ICrossing;
    /** On an area's edge: a main road, which is never left out. */
    readonly isMain: boolean;
}

/** A crossing as a key, for sets and maps. */
export const crossingKey = (crossing: ICrossing): string => `${crossing.column},${crossing.row}`;

/** Every street between neighbouring crossings: each row's, west to east, then each column's. */
function everyStreet(columns: number, rows: number, perArea: number): List<IStreet> {
    const across = Array.from({ length: rows }, (_row, row) =>
        Array.from({ length: columns - 1 }, (_column, column) => ({
            from: { column, row },
            to: { column: column + 1, row },
            isMain: row % perArea === 0,
        })),
    );
    const down = Array.from({ length: columns }, (_column, column) =>
        Array.from({ length: rows - 1 }, (_row, row) => ({
            from: { column, row },
            to: { column, row: row + 1 },
            isMain: column % perArea === 0,
        })),
    );
    const streets = [...across.flat(), ...down.flat()];
    return List(streets);
}

/** Each crossing's neighbours along some streets. */
function neighboursOf(streets: List<IStreet>): ImmutableMap<string, List<string>> {
    const none = List<string>();
    const empty = ImmutableMap<string, List<string>>();
    return streets.reduce((neighbours, street) => {
        const from = crossingKey(street.from);
        const to = crossingKey(street.to);
        return neighbours
            .update(from, none, (keys) => keys.push(to))
            .update(to, none, (keys) => keys.push(from));
    }, empty);
}

/** Every crossing reachable from a frontier, a layer at a time. */
function reachedFrom(
    frontier: ImmutableSet<string>,
    seen: ImmutableSet<string>,
    neighbours: ImmutableMap<string, List<string>>,
): ImmutableSet<string> {
    if (frontier.isEmpty()) {
        return seen;
    }
    const next = frontier
        .flatMap((key) => neighbours.get(key) ?? List<string>())
        .filter((key) => !seen.has(key));
    const seenNow = seen.union(next);
    return reachedFrom(next, seenNow, neighbours);
}

/**
 * Streets left out that must come back so every crossing can be reached: a street joining the
 * reached part to one not reached returns, in the order they were drawn, until none is left.
 */
function reconnected(
    kept: List<IStreet>,
    leftOut: List<IStreet>,
    crossings: number,
): List<IStreet> {
    const neighbours = neighboursOf(kept);
    const corner = crossingKey({ column: 0, row: 0 });
    const start = ImmutableSet.of(corner);
    const reached = reachedFrom(start, start, neighbours);
    if (reached.size === crossings) {
        return kept;
    }
    const bridge = leftOut.find((street) => {
        const from = crossingKey(street.from);
        const to = crossingKey(street.to);
        return reached.has(from) !== reached.has(to);
    });
    if (bridge === undefined) {
        return kept;
    }
    const rest = leftOut.filter((street) => street !== bridge);
    const keptNow = kept.push(bridge);
    return reconnected(keptNow, rest, crossings);
}

/**
 * A simple city's streets: main roads along every area's edge, and local streets every block,
 * with each area holding as many equal blocks as fit, so streets line up across areas. The city's
 * seed leaves out about one in eight local segments, each between two crossings, and every
 * crossing stays reachable (FND-90).
 */
export class StreetGrid {
    /** A city's streets, drawing one fraction for each local segment from its streets stream. */
    static createNew(city: City, source: IRandomSource): StreetGrid {
        const side = city.areaSideMetres();
        const perArea = city.blocksPerArea();
        const columns = city.across * perArea + 1;
        const rows = city.down * perArea + 1;
        const streets = everyStreet(columns, rows, perArea);
        const drawn = streets.reduce(
            (soFar, street) => {
                if (street.isMain) {
                    return { ...soFar, kept: soFar.kept.push(street) };
                }
                const [fraction, after] = soFar.source.nextFraction(STREETS_STREAM);
                const isLeftOut = fraction < LEFT_OUT_SHARE;
                return {
                    source: after,
                    kept: isLeftOut ? soFar.kept : soFar.kept.push(street),
                    leftOut: isLeftOut ? soFar.leftOut.push(street) : soFar.leftOut,
                };
            },
            { source, kept: List<IStreet>(), leftOut: List<IStreet>() },
        );
        const kept = reconnected(drawn.kept, drawn.leftOut, columns * rows);
        return StreetGrid.create({
            spacingMetres: toMetres(side / perArea),
            columns: toCount(columns),
            rows: toCount(rows),
            streets: kept,
        });
    }

    /** A street grid from its parts. */
    static create(fields: FieldsOf<StreetGrid>): StreetGrid {
        if (!(fields.spacingMetres > 0)) {
            throw new RangeError(
                `Streets must be above 0 metres apart, not ${fields.spacingMetres}.`,
            );
        }
        return new StreetGrid(fields.spacingMetres, fields.columns, fields.rows, fields.streets);
    }

    declare private readonly brand: never;

    private constructor(
        /** How far apart neighbouring crossings are. */
        readonly spacingMetres: Metres,
        /** How many crossings each row has, from west to east. */
        readonly columns: Count,
        /** How many crossings each column has, from south to north. */
        readonly rows: Count,
        readonly streets: List<IStreet>,
    ) {
        Object.freeze(this);
    }

    /** Where a crossing is, in metres east and north of the city's south-west corner. */
    pointOf(crossing: ICrossing): IPlanePoint {
        const eastMetres = toMetres(crossing.column * this.spacingMetres);
        const northMetres = toMetres(crossing.row * this.spacingMetres);
        return { eastMetres, northMetres };
    }
}
