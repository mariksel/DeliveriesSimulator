import type { FieldsOf } from '../system/classes/fields-of';
import type { ParameterValue } from './numbers';
import type { Parameter } from './parameter';
import type { Rule } from './rule';

/** One parameter's value in use in a rule set, as the Rules panel lists it. */
export class RuleValue {
    /** A rule's parameter and the value in use. */
    static create(fields: FieldsOf<RuleValue>): RuleValue {
        return new RuleValue(fields.rule, fields.parameter, fields.value);
    }

    declare private readonly brand: never;

    private constructor(
        readonly rule: Rule,
        readonly parameter: Parameter,
        readonly value: ParameterValue,
    ) {
        Object.freeze(this);
    }

    /** Whether the value is inside the parameter's valid range. Outside it, a run warns. */
    isInRange(): boolean {
        return this.parameter.isInRange(this.value);
    }

    /** Whether the value is the parameter's default. */
    isDefault(): boolean {
        return this.value === this.parameter.defaultValue;
    }
}
