import { List } from 'immutable';
import { isWhole } from '../math/math';
import { refuse } from '../validation/refuse';

/** A record's version: 1 for its first, and one more with each change. */
export type VersionNumber = number & { readonly brand: 'VersionNumber' };

/** A version number, which must be a whole number from 1. */
export function toVersionNumber(value: number): VersionNumber {
    if (!isWhole(value, 1)) {
        return refuse('A version number', value, 'a whole number from 1');
    }
    return value as VersionNumber;
}

/** The version after this one. */
export const nextVersionNumber = (version: VersionNumber): VersionNumber =>
    toVersionNumber(version + 1);

/** The number of a record's first version. */
export const FIRST_VERSION = toVersionNumber(1);

/** One state of a record: what number it is, and the state before it. */
export interface IVersion<TVersion> {
    /** Goes up by one with each change. */
    readonly number: VersionNumber;
    readonly previous: TVersion | null;
}

/**
 * Refuses a version whose number and link do not fit: a first version is number 1 with nothing
 * before it, and every later one is one more than the version it links to.
 */
export function assertVersionLink<TVersion extends IVersion<TVersion>>(
    what: string,
    number: VersionNumber,
    previous: TVersion | null,
): void {
    const isFirst = number === FIRST_VERSION && previous === null;
    const isNext = previous !== null && number === nextVersionNumber(previous.number);
    if (!(isFirst || isNext)) {
        throw new RangeError(`Invalid version ${number} of ${what}.`);
    }
}

/** A record's states, oldest first, found by following each version back to the one before it. */
export function versionChain<TVersion extends IVersion<TVersion>>(
    latest: TVersion,
): List<TVersion> {
    const older = latest.previous === null ? List<TVersion>() : versionChain(latest.previous);
    return older.push(latest);
}
