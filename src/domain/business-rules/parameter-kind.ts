import { isWhole } from '../system/math/math';
import { unreachable } from '../system/validation/unreachable';
import type { ParameterValue } from './numbers';

/** What a parameter's value measures, which says how it is written and what it may be. */
export const ParameterKind = {
    /** A length of time, in milliseconds, from 0. */
    Duration: 'Duration',
    /** A distance, in metres. A limit may go below 0, to test extremes. */
    Distance: 'Distance',
    /** A whole number of things, from 0. */
    Count: 'Count',
    /** A multiplier, such as a boost or a decay. */
    Multiplier: 'Multiplier',
} as const;

/** One of the values of {@link ParameterKind}. */
export type ParameterKind = (typeof ParameterKind)[keyof typeof ParameterKind];

/** What a value of this kind must be, or null when any finite number will do. */
export function kindRequirement(kind: ParameterKind): string | null {
    switch (kind) {
        case ParameterKind.Duration:
            return 'a number of milliseconds from 0';
        case ParameterKind.Count:
            return 'a whole number from 0';
        case ParameterKind.Distance:
        case ParameterKind.Multiplier:
            return null;
        default:
            return unreachable(kind);
    }
}

/** Whether a value can be of this kind. */
export function isOfKind(kind: ParameterKind, value: ParameterValue): boolean {
    switch (kind) {
        case ParameterKind.Duration:
            return value >= 0;
        case ParameterKind.Count:
            return isWhole(value, 0);
        case ParameterKind.Distance:
        case ParameterKind.Multiplier:
            return true;
        default:
            return unreachable(kind);
    }
}
