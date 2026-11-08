import type { FieldsOf } from '../system/classes/fields-of';
import type { ParameterValue } from './numbers';

/**
 * The values a parameter is meant to take, both ends included. A run may use a value outside
 * it, to test extremes, and the Rules panel and scenario reading warn when it does (FND-54).
 */
export class ValidRange {
    /** A range, whose lowest value must be no higher than its highest. */
    static create(fields: FieldsOf<ValidRange>): ValidRange {
        if (fields.highest < fields.lowest) {
            throw new RangeError(
                `A valid range must not end below its start: ${fields.lowest} to ${fields.highest}.`,
            );
        }
        return new ValidRange(fields.lowest, fields.highest);
    }

    declare private readonly brand: never;

    private constructor(
        readonly lowest: ParameterValue,
        readonly highest: ParameterValue,
    ) {
        Object.freeze(this);
    }

    /** Whether a value is inside the range. */
    includes(value: ParameterValue): boolean {
        return value >= this.lowest && value <= this.highest;
    }

    /** Whether another range is the same. */
    equals(other: ValidRange): boolean {
        return this.lowest === other.lowest && this.highest === other.highest;
    }
}
