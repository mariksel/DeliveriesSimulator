import { expect } from 'vitest';

import { Duration } from './duration';
import type { IInstant } from './instant';

/** Whether a value is a moment, whichever implementation made it. */
const isInstant = (value: unknown): value is IInstant =>
    typeof value === 'object' &&
    value !== null &&
    'sinceStart' in value &&
    value.sinceStart instanceof Duration;

/** A moment's or a length's milliseconds, or undefined for anything else. */
function millisecondsOf(value: unknown): number | undefined {
    if (value instanceof Duration) {
        return value.milliseconds;
    }
    return isInstant(value) ? value.sinceStart.milliseconds : undefined;
}

/**
 * For tests: a moment or a length equals a number of milliseconds, and two moments are equal when
 * they are the same moment, whichever implementation made them. `toBe` still compares identity.
 */
function timeEquality(first: unknown, second: unknown): boolean | undefined {
    const firstMs = millisecondsOf(first);
    const secondMs = millisecondsOf(second);
    if (firstMs === undefined && secondMs === undefined) {
        return undefined;
    }
    const firstValue = firstMs ?? first;
    const secondValue = secondMs ?? second;
    return typeof firstValue === 'number' && typeof secondValue === 'number'
        ? firstValue === secondValue
        : undefined;
}

expect.addEqualityTesters([timeEquality]);
