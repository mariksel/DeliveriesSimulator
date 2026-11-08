import type { FieldsOf } from '../system/classes/fields-of';
import { refuse } from '../system/validation/refuse';
import type { ParameterValue } from './numbers';
import type { ParameterKind } from './parameter-kind';
import { isOfKind, kindRequirement } from './parameter-kind';
import type { UsableValues } from './usable-values';
import { isUsable, usableRequirement } from './usable-values';
import type { ValidRange } from './valid-range';

/** A parameter of a rule, unique within it, in kebab-case: `max-age`. */
export type ParameterId = string & { readonly brand: 'ParameterId' };

const PARAMETER_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;

/** A parameter's ID, which must be lowercase words joined by hyphens. */
export function toParameterId(value: string): ParameterId {
    if (!PARAMETER_ID.test(value)) {
        throw new RangeError(
            `A parameter ID must be lowercase words joined by hyphens, not "${value}".`,
        );
    }
    return value as ParameterId;
}

/**
 * A value a rule takes, which people and the simulator change, never the rule's code (FND-84).
 * Its kind and its usable values say what a run can use; its valid range says what it is meant
 * to take.
 */
export class Parameter {
    /** A parameter, whose default a run must be able to use. */
    static create(fields: FieldsOf<Parameter>): Parameter {
        const parameter = new Parameter(
            fields.id,
            fields.name,
            fields.text,
            fields.kind,
            fields.usable,
            fields.defaultValue,
            fields.range,
        );
        parameter.assertUsable(fields.defaultValue);
        return parameter;
    }

    declare private readonly brand: never;

    private constructor(
        readonly id: ParameterId,
        readonly name: string,
        /** What it controls, as the Rules panel says it. */
        readonly text: string,
        readonly kind: ParameterKind,
        readonly usable: UsableValues,
        /** The value the version's rules state. */
        readonly defaultValue: ParameterValue,
        readonly range: ValidRange,
    ) {
        Object.freeze(this);
    }

    /** Why a run cannot use a value: what it must be instead, or null when it can. */
    refusalOf(value: ParameterValue): string | null {
        if (!isOfKind(this.kind, value)) {
            return kindRequirement(this.kind);
        }
        if (!isUsable(this.usable, value)) {
            return usableRequirement(this.usable);
        }
        return null;
    }

    /** Refuses a value a run cannot use. */
    assertUsable(value: ParameterValue): void {
        const refusal = this.refusalOf(value);
        if (refusal !== null) {
            refuse(this.name, value, refusal);
        }
    }

    /** Whether a value is inside the valid range. */
    isInRange(value: ParameterValue): boolean {
        return this.range.includes(value);
    }
}
