import { isWhole } from '../system/math/math';
import { refuse } from '../system/validation/refuse';

/**
 * The Event log's branded numbers, each made only by a creator that checks it (FND-83).
 */

/** An entry's place in a run's log, from 0. */
export type LogSequence = number & { readonly brand: 'LogSequence' };

/** An entry's place in a log, which must be a whole number from 0. */
export function toLogSequence(value: number): LogSequence {
    if (!isWhole(value, 0)) {
        return refuse("A log entry's place", value, 'a whole number from 0');
    }
    return value as LogSequence;
}
