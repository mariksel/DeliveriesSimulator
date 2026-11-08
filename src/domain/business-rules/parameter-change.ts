import type { FieldsOf } from '../system/classes/fields-of';
import type { ParameterValue } from './numbers';
import type { ParameterId } from './parameter';
import type { RuleId } from './rule';

/** A new value for one parameter of one rule, by their IDs, as a person or a scenario sets it. */
export class ParameterChange {
    /** A change. Its rule set checks that the rule and parameter exist and the value is usable. */
    static create(fields: FieldsOf<ParameterChange>): ParameterChange {
        return new ParameterChange(fields.ruleId, fields.parameterId, fields.value);
    }

    declare private readonly brand: never;

    private constructor(
        readonly ruleId: RuleId,
        readonly parameterId: ParameterId,
        readonly value: ParameterValue,
    ) {
        Object.freeze(this);
    }
}
