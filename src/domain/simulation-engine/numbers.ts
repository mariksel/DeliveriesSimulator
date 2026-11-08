import { isWhole } from '../system/math/math';
import { refuse } from '../system/validation/refuse';

/**
 * The Simulation engine's branded numbers, each made only by a creator that checks it (FND-83).
 */

const TWO_32 = 4294967296;

/** A moment by the browser's real clock, in milliseconds. It drives a watched run. */
export type WallTime = number & { readonly brand: 'WallTime' };
/** A run's seed: a whole number from 0 to 2^32 - 1. */
export type Seed = number & { readonly brand: 'Seed' };
/** One 32-bit word of a random stream, or a number drawn whole from one. */
export type RandomWord = number & { readonly brand: 'RandomWord' };

/** A moment by the real clock, which must be a finite number. */
export function toWallTime(value: number): WallTime {
    if (!Number.isFinite(value)) {
        return refuse('A real time', value, 'a finite number');
    }
    return value as WallTime;
}

/** A seed, which must be a whole number from 0 to 2^32 - 1. */
export function toSeed(value: number): Seed {
    if (!isWhole(value, 0) || value >= TWO_32) {
        return refuse('A seed', value, 'a whole number from 0 to 2^32 - 1');
    }
    return value as Seed;
}

/** A random stream's word, which must be a whole number from 0 to 2^32 - 1. */
export function toRandomWord(value: number): RandomWord {
    if (!isWhole(value, 0) || value >= TWO_32) {
        return refuse('A random word', value, 'a whole number from 0 to 2^32 - 1');
    }
    return value as RandomWord;
}

/** A multiple of real time that a watched run moves at. It must be a finite number above 0. */
export type SpeedMultiple = number & { readonly brand: 'SpeedMultiple' };

/** A multiple of real time, which must be a finite number above 0. */
export function toSpeedMultiple(value: number): SpeedMultiple {
    if (!Number.isFinite(value) || value <= 0) {
        return refuse('A clock speed', value, 'a finite number above 0');
    }
    return value as SpeedMultiple;
}
