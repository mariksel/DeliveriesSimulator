import { List, OrderedMap } from 'immutable';

import type { FieldsOf } from '../system/classes/fields-of';
import type { Count } from '../system/math/math';
import { toCount } from '../system/math/math';
import type { IRandomSource } from '../system/randomness/random-source';
import type { AreaId } from './area-id';
import { toAreaId } from './area-id';
import type { Coordinates } from './coordinates';
import type { IPlanePoint } from './local-plane';
import { fromPlane, toPlane } from './local-plane';
import type { CitySeed, Kilometres, Metres } from './numbers';
import { toMetres } from './numbers';

const METRES_PER_KILOMETRE = 1000;
const MAX_LATITUDE = 90;
/** How far an area's width and height may differ and still be a square, as a share of a side. */
const SQUARE_TOLERANCE = 1e-9;
/**
 * A place's position on the plane is rounded to the micrometre before its area is found, so the
 * tiny error of turning degrees into metres and back cannot move it across an area's edge.
 */
const MICROMETRES_PER_METRE = 1_000_000;
/** A picked place lies on a millimetre grid inside its square, well clear of that rounding. */
const MILLIMETRES_PER_METRE = 1000;

const toMicrometre = (metres: number): number =>
    Math.round(metres * MICROMETRES_PER_METRE) / MICROMETRES_PER_METRE;

/** How far into an area's side a fraction of it reaches, down to the millimetre. */
const intoSide = (fraction: number, side: number): number =>
    Math.floor(fraction * side * MILLIMETRES_PER_METRE) / MILLIMETRES_PER_METRE;

/** What a simple city is made from, before its areas are named (FND-90). */
export interface ICitySettings {
    /** The city's south-west corner. */
    readonly origin: Coordinates;
    readonly widthKm: Kilometres;
    readonly heightKm: Kilometres;
    /** How many areas there are from west to east. */
    readonly across: Count;
    /** How many areas there are from south to north. */
    readonly down: Count;
    /** The seed the city's streets and the places picked in it come from. */
    readonly seed: CitySeed;
    /** How far apart the local streets are: each area holds as many equal blocks as fit. */
    readonly blockMetres: Metres;
}

const BLOCK_METRES = 200;

/** How far apart a city's local streets are, unless it says otherwise (FND-90). */
export const DEFAULT_BLOCK_METRES = toMetres(BLOCK_METRES);

/** A place in a city, and the random source as it stands after picking it. */
export type PickedPlace = readonly [place: Coordinates, source: IRandomSource];

/** Refuses a city whose grid is not one of square areas, at least one each way. */
function checkGrid({ widthKm, heightKm, across, down }: ICitySettings): void {
    if (across < 1 || down < 1) {
        throw new RangeError(`A city needs at least one area each way, not ${across} by ${down}.`);
    }
    if (widthKm <= 0 || heightKm <= 0) {
        throw new RangeError(
            `A city's width and height must be above 0, not ${widthKm} by ${heightKm}.`,
        );
    }
    const side = widthKm / across;
    const height = heightKm / down;
    if (Math.abs(side - height) > side * SQUARE_TOLERANCE) {
        throw new RangeError(
            `A city's areas must be square, not ${side} km wide and ${height} km high.`,
        );
    }
}

/** Refuses area names that are not one each, all different. */
function checkNames(areaIds: List<AreaId>, count: number): void {
    if (areaIds.size !== count) {
        throw new RangeError(
            `A city of ${count} areas needs ${count} names, not ${areaIds.size}.`,
        );
    }
    const unique = areaIds.toSet();
    if (unique.size !== areaIds.size) {
        throw new RangeError("A city's areas must each have a different name.");
    }
}

/** Refuses a waiting point set for an area the city does not have, or outside its area. */
function checkWaitingPoints(city: City): void {
    city.waitingPoints.forEach((point, areaId) => {
        if (!city.areaIds.includes(areaId)) {
            throw new RangeError(`A city has no area ${areaId} to set a waiting point for.`);
        }
        if (city.areaAt(point) !== areaId) {
            throw new RangeError(`The waiting point of ${areaId} must lie in that area.`);
        }
    });
}

/** Refuses a city that reaches past a pole or the date line, where a flat plane cannot lie. */
function checkPlace({ origin, widthKm, heightKm }: ICitySettings): void {
    if (Math.abs(origin.latitude) >= MAX_LATITUDE) {
        throw new RangeError(`A city cannot start at a pole, at latitude ${origin.latitude}.`);
    }
    const eastMetres = toMetres(widthKm * METRES_PER_KILOMETRE);
    const northMetres = toMetres(heightKm * METRES_PER_KILOMETRE);
    fromPlane(origin, { eastMetres, northMetres });
}

/**
 * A simple city: a grid of square delivery areas, laid flat from its south-west corner and named
 * row by row from there. Each area has a waiting point, where a driver with nothing to do waits
 * (FND-90).
 */
export class City {
    /** A city with areas named `area-1`, `area-2`, and so on, row by row from the south-west. */
    static createNew(settings: ICitySettings): City {
        const count = settings.across * settings.down;
        const names = Array.from({ length: count }, (_unused, index) =>
            toAreaId(`area-${index + 1}`),
        );
        const areaIds = List(names);
        const waitingPoints = OrderedMap<AreaId, Coordinates>();
        return City.create({ ...settings, areaIds, waitingPoints });
    }

    /** A city with its areas named row by row from the south-west, checking the city's shape. */
    static create(fields: FieldsOf<City>): City {
        checkGrid(fields);
        if (!(fields.blockMetres > 0)) {
            throw new RangeError(
                `A city's blocks must be above 0 metres, not ${fields.blockMetres}.`,
            );
        }
        checkNames(fields.areaIds, fields.across * fields.down);
        checkPlace(fields);
        const city = new City(
            fields.origin,
            fields.widthKm,
            fields.heightKm,
            fields.across,
            fields.down,
            fields.seed,
            fields.blockMetres,
            fields.areaIds,
            fields.waitingPoints,
        );
        checkWaitingPoints(city);
        return city;
    }

    declare private readonly brand: never;

    private constructor(
        readonly origin: Coordinates,
        readonly widthKm: Kilometres,
        readonly heightKm: Kilometres,
        readonly across: Count,
        readonly down: Count,
        readonly seed: CitySeed,
        readonly blockMetres: Metres,
        /** Each area's name, row by row from the south-west corner. */
        readonly areaIds: List<AreaId>,
        /** The waiting points a scenario set, by area; any other area has its default. */
        readonly waitingPoints: OrderedMap<AreaId, Coordinates>,
    ) {
        Object.freeze(this);
    }

    /** The length of an area's side. */
    areaSideMetres(): Metres {
        const side = (this.widthKm * METRES_PER_KILOMETRE) / this.across;
        return toMetres(side);
    }

    /** How many blocks each area holds each way: as many equal ones as fit, at least one. */
    blocksPerArea(): Count {
        const blocks = Math.round(this.areaSideMetres() / this.blockMetres);
        const atLeastOne = Math.max(1, blocks);
        return toCount(atLeastOne);
    }

    /**
     * Where a driver with nothing to do waits in an area, or undefined for an area the city does
     * not have: the point the scenario set, or else the street crossing nearest the area's centre,
     * the one to the south and west on a tie (FND-90).
     */
    waitingPointIn(areaId: AreaId): Coordinates | undefined {
        const index = this.areaIds.indexOf(areaId);
        if (index < 0) {
            return undefined;
        }
        const set = this.waitingPoints.get(areaId);
        if (set !== undefined) {
            return set;
        }
        const perArea = this.blocksPerArea();
        const spacing = this.areaSideMetres() / perArea;
        const middle = Math.floor(perArea / 2);
        const column = (index % this.across) * perArea + middle;
        const row = Math.floor(index / this.across) * perArea + middle;
        const point: IPlanePoint = {
            eastMetres: toMetres(column * spacing),
            northMetres: toMetres(row * spacing),
        };
        return fromPlane(this.origin, point);
    }

    /** The city with these waiting points set, by area, checking each lies in its area. */
    withWaitingPoints(waitingPoints: OrderedMap<AreaId, Coordinates>): City {
        return City.create({
            origin: this.origin,
            widthKm: this.widthKm,
            heightKm: this.heightKm,
            across: this.across,
            down: this.down,
            seed: this.seed,
            blockMetres: this.blockMetres,
            areaIds: this.areaIds,
            waitingPoints,
        });
    }

    /**
     * The area a place lies in, or undefined outside the city. A place on the edge between two
     * areas belongs to the one north or east of it, and the city's far edges to its last areas.
     */
    areaAt(place: Coordinates): AreaId | undefined {
        const point = toPlane(this.origin, place);
        const eastMetres = toMicrometre(point.eastMetres);
        const northMetres = toMicrometre(point.northMetres);
        const widthMetres = this.widthKm * METRES_PER_KILOMETRE;
        const heightMetres = this.heightKm * METRES_PER_KILOMETRE;
        const isOutside =
            eastMetres < 0 ||
            northMetres < 0 ||
            eastMetres > widthMetres ||
            northMetres > heightMetres;
        if (isOutside) {
            return undefined;
        }
        const side = this.areaSideMetres();
        const columnFound = Math.floor(eastMetres / side);
        const rowFound = Math.floor(northMetres / side);
        const column = Math.min(columnFound, this.across - 1);
        const row = Math.min(rowFound, this.down - 1);
        return this.areaIds.get(row * this.across + column);
    }

    /**
     * A place picked anywhere in an area, to the millimetre, from a named stream of the city's
     * randomness, or undefined for an area the city does not have. Each restaurant has its own
     * stream, so adding one moves no other (FND-90).
     */
    pickIn(areaId: AreaId, source: IRandomSource, stream: string): PickedPlace | undefined {
        const index = this.areaIds.indexOf(areaId);
        if (index < 0) {
            return undefined;
        }
        const [east, afterEast] = source.nextFraction(stream);
        const [north, afterNorth] = afterEast.nextFraction(stream);
        const side = this.areaSideMetres();
        const column = index % this.across;
        const row = Math.floor(index / this.across);
        const point: IPlanePoint = {
            eastMetres: toMetres(column * side + intoSide(east, side)),
            northMetres: toMetres(row * side + intoSide(north, side)),
        };
        const place = fromPlane(this.origin, point);
        return [place, afterNorth];
    }
}
