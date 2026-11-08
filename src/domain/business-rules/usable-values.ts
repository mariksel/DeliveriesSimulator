import { isWhole } from '../system/math/math';
import { unreachable } from '../system/validation/unreachable';
import type { ParameterValue } from './numbers';

/**
 * Which values of its kind a run can use. Anything else is refused. A value outside its valid
 * range is not, since a run may test extremes (FND-54, FND-84).
 */
export const UsableValues = {
    /** Every value of its kind. */
    AnyOfItsKind: 'AnyOfItsKind',
    /** Whole numbers above 0 only, as a job's interval must be. */
    WholeAboveZero: 'WholeAboveZero',
    /** Every value of its kind but 0, as a value the rule divides by must be. */
    NotZero: 'NotZero',
} as const;

/** One of the values of {@link UsableValues}. */
export type UsableValues = (typeof UsableValues)[keyof typeof UsableValues];

/** What a usable value must be beyond its kind, or null when nothing more is asked. */
export function usableRequirement(usable: UsableValues): string | null {
    switch (usable) {
        case UsableValues.AnyOfItsKind:
            return null;
        case UsableValues.WholeAboveZero:
            return 'a whole number above 0';
        case UsableValues.NotZero:
            return 'a number other than 0';
        default:
            return unreachable(usable);
    }
}

/** Whether a run can use a value, beyond what its kind asks. */
export function isUsable(usable: UsableValues, value: ParameterValue): boolean {
    switch (usable) {
        case UsableValues.AnyOfItsKind:
            return true;
        case UsableValues.WholeAboveZero:
            return isWhole(value, 1);
        case UsableValues.NotZero:
            return value !== 0;
        default:
            return unreachable(usable);
    }
}
