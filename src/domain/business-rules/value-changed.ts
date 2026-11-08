import { allTrue, recordPart } from '../system/digests/digest-parts';
import type { FieldsOf } from '../system/classes/fields-of';
import type { ParameterValue } from './numbers';
import type { ParameterId } from './parameter';
import type { RuleId } from './rule';

/** One parameter's value as a config change changed it, by rule and parameter ID. */
export class ValueChanged {
    /** A changed value. */
    static create(fields: FieldsOf<ValueChanged>): ValueChanged {
        return new ValueChanged(fields.ruleId, fields.parameterId, fields.before, fields.after);
    }

    declare private readonly brand: never;

    private constructor(
        readonly ruleId: RuleId,
        readonly parameterId: ParameterId,
        readonly before: ParameterValue,
        readonly after: ParameterValue,
    ) {
        Object.freeze(this);
    }

    /** The change, written out field by field for a digest. */
    digestPart(): string {
        return recordPart([
            { text: this.ruleId },
            { text: this.parameterId },
            { number: this.before },
            { number: this.after },
        ]);
    }

    /** Whether another change is the same, field by field. */
    equals(other: ValueChanged): boolean {
        return allTrue(
            this.ruleId === other.ruleId,
            this.parameterId === other.parameterId,
            this.before === other.before,
            this.after === other.after,
        );
    }
}
