import { refuse } from '../system/validation/refuse';

/**
 * Business rules' branded numbers, each made only by a creator that checks it (FND-83).
 */

/**
 * A rule parameter's value, as the Rules panel and a scenario write it: a duration in
 * milliseconds, a distance in metres, a count, or a multiplier. Its parameter's kind says which.
 */
export type ParameterValue = number & { readonly brand: 'ParameterValue' };

/** A parameter's value, which must be a finite number. */
export function toParameterValue(value: number): ParameterValue {
    if (!Number.isFinite(value)) {
        return refuse('A parameter value', value, 'a finite number');
    }
    return value as ParameterValue;
}
