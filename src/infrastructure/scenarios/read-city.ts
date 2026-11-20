import { List, OrderedMap, Set as ImmutableSet } from 'immutable';

import type { IScenarioProblem } from '../../application-core/scenarios/scenario';
import { problemAt } from '../../application-core/scenarios/scenario';
import { toAreaId } from '../../domain/map-and-routing/area-id';
import type { AreaId } from '../../domain/map-and-routing/area-id';
import { City, DEFAULT_BLOCK_METRES } from '../../domain/map-and-routing/city';
import type { Coordinates } from '../../domain/map-and-routing/coordinates';
import { toCitySeed, toKilometres, toMetres } from '../../domain/map-and-routing/numbers';
import { toCount } from '../../domain/system/math/math';
import { required } from '../../domain/system/validation/required';
import type { Fields, IReading } from './scenario-reader';
import { isFields, readCoordinates, readSeed, unknownFields } from './scenario-reader';
import { readWaitingPoints, withWaitingPoints } from './read-waiting-points';

/** The most areas a city may have each way, which keeps a mistyped number from hanging a read. */
export const MAX_AREAS_EACH_WAY = 1000;

const PATH = 'city.';
const NONE = List<IScenarioProblem>();

const failed = <T>(path: string, message: string): IReading<T> => ({
    value: null,
    problems: problemAt(path, message),
});

/** Reads a size in kilometres, which must be a number above 0. */
function readKilometres(fields: Fields, key: string): IReading<number> {
    const value = fields[key];
    return typeof value === 'number' && Number.isFinite(value) && value > 0
        ? { value, problems: NONE }
        : failed(`${PATH}${key}`, value === undefined ? 'is missing' : 'must be a number above 0');
}

/** Reads a distance in metres that may be left out, which must be a number above 0. */
function readOptionalMetres(fields: Fields, key: string): IReading<number> {
    const value = fields[key];
    if (value === undefined) {
        return { value: null, problems: NONE };
    }
    return typeof value === 'number' && Number.isFinite(value) && value > 0
        ? { value, problems: NONE }
        : failed(`${PATH}${key}`, 'must be a number of metres above 0');
}

/** Reads how many areas there are one way, a whole number from 1 to the most allowed. */
function readAreaCount(fields: Fields, key: string): IReading<number> {
    const value = fields[key];
    const isCount =
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= 1 &&
        value <= MAX_AREAS_EACH_WAY;
    return isCount
        ? { value, problems: NONE }
        : failed(
              `${PATH}${key}`,
              value === undefined
                  ? 'is missing'
                  : `must be a whole number from 1 to ${MAX_AREAS_EACH_WAY}`,
          );
}

/** Whether every name in a list is text that is not blank, and none repeats. */
function areNames(value: readonly unknown[]): value is readonly string[] {
    const isText = value.every((name) => typeof name === 'string' && name.trim() !== '');
    const unique = ImmutableSet(value);
    return isText && unique.size === value.length;
}

/**
 * Reads the areas' names, if given: one each, different, row by row from the south-west corner.
 * Null, with no problems, when the city's areas take the names `area-1` onwards.
 */
function readAreaNames(fields: Fields, count: number | null): IReading<List<AreaId>> {
    const value = fields['areas'];
    if (value === undefined) {
        return { value: null, problems: NONE };
    }
    if (!Array.isArray(value) || !areNames(value)) {
        return failed(`${PATH}areas`, 'must be a list of different names that are not blank');
    }
    if (count !== null && value.length !== count) {
        return failed(`${PATH}areas`, `must name all ${count} areas, row by row`);
    }
    const names = value.map(toAreaId);
    return { value: List(names), problems: NONE };
}

/** How many areas a city has, when both its counts could be read. */
const areaCount = (across: number | null, down: number | null): number | null =>
    across === null || down === null ? null : across * down;

/** The city a scenario's checked fields make, or why they cannot make one. */
function cityOf(readings: {
    readonly origin: Coordinates;
    readonly widthKm: number;
    readonly heightKm: number;
    readonly across: number;
    readonly down: number;
    readonly seed: number;
    readonly blockMetres: number;
    readonly names: List<AreaId> | null;
}): IReading<City> {
    const settings = {
        origin: readings.origin,
        widthKm: toKilometres(readings.widthKm),
        heightKm: toKilometres(readings.heightKm),
        across: toCount(readings.across),
        down: toCount(readings.down),
        seed: toCitySeed(readings.seed),
        blockMetres: toMetres(readings.blockMetres),
    };
    try {
        const city =
            readings.names === null
                ? City.createNew(settings)
                : City.create({
                      ...settings,
                      areaIds: readings.names,
                      waitingPoints: OrderedMap(),
                  });
        return { value: city, problems: NONE };
    } catch (error) {
        if (error instanceof RangeError) {
            return failed('city', error.message);
        }
        throw error;
    }
}

/**
 * Reads a scenario's simple city: its south-west corner, its width and height in kilometres, its
 * areas across and down, the seed its streets and picked places come from, and, if given, how far
 * apart its local streets are, its areas' names, and the waiting points it sets (FND-90).
 */
export function readCity(value: Fields): IReading<City> {
    const fields = value['city'];
    if (!isFields(fields)) {
        return failed(
            'city',
            fields === undefined ? 'is missing' : 'must be an object with fields',
        );
    }
    const origin = readCoordinates(fields, PATH, 'origin');
    const widthKm = readKilometres(fields, 'widthKm');
    const heightKm = readKilometres(fields, 'heightKm');
    const across = readAreaCount(fields, 'across');
    const down = readAreaCount(fields, 'down');
    const seed = readSeed(fields, PATH);
    const blockMetres = readOptionalMetres(fields, 'blockMetres');
    const count = areaCount(across.value, down.value);
    const names = readAreaNames(fields, count);
    const waitingPoints = readWaitingPoints(fields);
    const problems = unknownFields(fields, PATH, [
        'origin',
        'widthKm',
        'heightKm',
        'across',
        'down',
        'seed',
        'blockMetres',
        'areas',
        'waitingPoints',
    ]).concat(
        origin.problems,
        widthKm.problems,
        heightKm.problems,
        across.problems,
        down.problems,
        seed.problems,
        blockMetres.problems,
        names.problems,
        waitingPoints.problems,
    );
    if (problems.size > 0) {
        return { value: null, problems };
    }
    // A field read with no problems has its value.
    const city = cityOf({
        origin: required(origin.value, "the city's corner"),
        widthKm: required(widthKm.value, "the city's width"),
        heightKm: required(heightKm.value, "the city's height"),
        across: required(across.value, "the city's areas across"),
        down: required(down.value, "the city's areas down"),
        seed: required(seed.value, "the city's seed"),
        blockMetres: blockMetres.value ?? DEFAULT_BLOCK_METRES,
        names: names.value,
    });
    const points = required(waitingPoints.value, "the city's waiting points");
    return city.value === null ? city : withWaitingPoints(city.value, points);
}
