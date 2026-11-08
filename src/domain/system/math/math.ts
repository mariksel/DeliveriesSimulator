import { refuse } from '../validation/refuse';

/**
 * Numbers the business counts and places things with, and a fraction, each a branded number made
 * only by a creator that checks it (FND-72, FND-83).
 */

/** A whole number of things, such as orders held or steps run. */
export type Count = number & { readonly brand: 'Count' };
/** A place in a list, from 0. */
export type Position = number & { readonly brand: 'Position' };
/** A number from 0 up to, but not including, 1. */
export type Fraction = number & { readonly brand: 'Fraction' };

/** Whether a number is whole, and no less than a lowest value. */
export const isWhole = (value: number, from: number): boolean =>
    Number.isSafeInteger(value) && value >= from;

/** A count, which must be a whole number from 0. */
export function toCount(value: number): Count {
    if (!isWhole(value, 0)) {
        return refuse('A count', value, 'a whole number from 0');
    }
    return value as Count;
}

/** A place in a list, which must be a whole number from 0. */
export function toPosition(value: number): Position {
    if (!isWhole(value, 0)) {
        return refuse('A position', value, 'a whole number from 0');
    }
    return value as Position;
}

/** A fraction, which must be a number from 0 up to, but not including, 1. */
export function toFraction(value: number): Fraction {
    if (!(value >= 0 && value < 1)) {
        return refuse('A fraction', value, 'a number from 0 up to 1');
    }
    return value as Fraction;
}

/** None of something. */
export const NO_COUNT = toCount(0);

/** One more of something. */
export const plusOne = (count: Count): Count => toCount(count + 1);

/** One fewer of something. There must be one to take away. */
export const minusOne = (count: Count): Count => toCount(count - 1);

/** A count with another added. */
export const plus = (count: Count, more: Count): Count => toCount(count + more);

/** The place after this one in a list. */
export const nextPosition = (position: Position): Position => toPosition(position + 1);
