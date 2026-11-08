import { List } from 'immutable';

import { parseClockTime } from '../../domain/simulation-engine/clock-time';
import type { IScenarioProblem } from '../../application-core/scenarios/scenario';
import { problemAt } from '../../application-core/scenarios/scenario';
import { Coordinates } from '../../domain/map-and-routing/coordinates';
import { toDegrees } from '../../domain/map-and-routing/numbers';

const MAX_LATITUDE = 90;
const MAX_LONGITUDE = 180;

/** A JSON object whose fields have not been checked yet. */
export type Fields = Readonly<Record<string, unknown>>;

/** Whether a value read from JSON is an object with fields. */
export function isFields(value: unknown): value is Fields {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * What reading part of a scenario found: its value, if it is good, and everything wrong with it.
 */
export interface IReading<T> {
    readonly value: T | null;
    readonly problems: List<IScenarioProblem>;
}

/**
 * A list in the file: the entries that have fields, each with its path, and what is wrong with the
 * rest.
 */
export interface IListReading {
    readonly entries: List<readonly [Fields, string]>;
    readonly problems: List<IScenarioProblem>;
}

const failed = <T>(path: string, message: string): IReading<T> => ({
    value: null,
    problems: problemAt(path, message),
});

/**
 * Finds the fields this version of the format does not have, which are usually typing mistakes.
 */
export function unknownFields(
    fields: Fields,
    path: string,
    known: readonly string[],
): List<IScenarioProblem> {
    const keys = Object.keys(fields);
    return List(keys)
        .filter((key) => !known.includes(key))
        .flatMap((key) => problemAt(`${path}${key}`, 'is not a field of this format'));
}

/** Reads a field that must be text that is not blank. */
export function readText(fields: Fields, path: string, key: string): IReading<string> {
    const value = fields[key];
    if (typeof value === 'string' && value.trim() !== '') {
        return { value, problems: List() };
    }
    return failed(
        `${path}${key}`,
        value === undefined ? 'is missing' : 'must be text that is not blank',
    );
}

/** Reads a field that must be a time like h00:m05:s00:ms00. */
export function readClockTime(fields: Fields, path: string, key: string): IReading<number> {
    const text = readText(fields, path, key);
    if (text.value === null) {
        return { value: null, problems: text.problems };
    }
    const time = parseClockTime(text.value);
    return time === null
        ? failed(`${path}${key}`, 'must be a time like h00:m05:s00:ms00')
        : { value: time, problems: List() };
}

const isWithin = (value: unknown, limit: number): value is number =>
    typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;

/** Reads a location field, which must have a latitude and a longitude. */
export function readCoordinates(fields: Fields, path: string): IReading<Coordinates> {
    const value = fields['location'];
    const at = `${path}location`;
    if (!isFields(value)) {
        return failed(
            at,
            value === undefined ? 'is missing' : 'must have a latitude and a longitude',
        );
    }
    const { latitude, longitude } = value;
    const latitudeProblems = isWithin(latitude, MAX_LATITUDE)
        ? List<IScenarioProblem>()
        : problemAt(`${at}.latitude`, 'must be a number from -90 to 90');
    const longitudeProblems = isWithin(longitude, MAX_LONGITUDE)
        ? List<IScenarioProblem>()
        : problemAt(`${at}.longitude`, 'must be a number from -180 to 180');
    return {
        value:
            isWithin(latitude, MAX_LATITUDE) && isWithin(longitude, MAX_LONGITUDE)
                ? Coordinates.create({
                      latitude: toDegrees(latitude),
                      longitude: toDegrees(longitude),
                  })
                : null,
        problems: unknownFields(value, `${at}.`, ['latitude', 'longitude']).concat(
            latitudeProblems,
            longitudeProblems,
        ),
    };
}

/** Reads a field that must be a list of entries with fields. */
export function readList(fields: Fields, key: string): IListReading {
    const value = fields[key];
    if (!Array.isArray(value)) {
        return {
            entries: List(),
            problems: problemAt(key, value === undefined ? 'is missing' : 'must be a list'),
        };
    }
    const items = List<unknown>(value);
    return {
        entries: items.flatMap((entry, index) =>
            isFields(entry) ? [[entry, `${key}[${index}].`] as const] : [],
        ),
        problems: items.flatMap((entry, index) =>
            isFields(entry)
                ? List<IScenarioProblem>()
                : problemAt(`${key}[${index}]`, 'must have fields'),
        ),
    };
}
