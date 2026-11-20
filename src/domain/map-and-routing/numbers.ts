import { refuse } from '../system/validation/refuse';

/**
 * Map and routing's branded numbers, each made only by a creator that checks it (FND-83).
 */

/** A distance, in metres. A tuned limit may go below 0, to test extremes. */
export type Metres = number & { readonly brand: 'Metres' };
/** An angle, such as a latitude or a longitude, in degrees. */
export type Degrees = number & { readonly brand: 'Degrees' };
/** A distance in kilometres, as a city's size is given (FND-90). */
export type Kilometres = number & { readonly brand: 'Kilometres' };
/** A city's seed, which its streets and the places picked in it come from (FND-90). */
export type CitySeed = number & { readonly brand: 'CitySeed' };

/** The largest seed, the largest number 32 bits hold. */
const MAX_SEED = 4294967295;

/** A distance, which must be a finite number. */
export function toMetres(value: number): Metres {
    if (!Number.isFinite(value)) {
        return refuse('A distance', value, 'a finite number');
    }
    return value as Metres;
}

/** An angle, which must be a finite number. */
export function toDegrees(value: number): Degrees {
    if (!Number.isFinite(value)) {
        return refuse('An angle', value, 'a finite number');
    }
    return value as Degrees;
}

/** A distance in kilometres, which must be a finite number. */
export function toKilometres(value: number): Kilometres {
    if (!Number.isFinite(value)) {
        return refuse('A distance in kilometres', value, 'a finite number');
    }
    return value as Kilometres;
}

/** A city's seed, which must be a whole number from 0 to 4294967295. */
export function toCitySeed(value: number): CitySeed {
    if (!Number.isInteger(value) || value < 0 || value > MAX_SEED) {
        return refuse("A city's seed", value, `a whole number from 0 to ${MAX_SEED}`);
    }
    return value as CitySeed;
}
