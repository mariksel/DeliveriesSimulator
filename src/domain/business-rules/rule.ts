import type { List } from 'immutable';

import type { FieldsOf } from '../system/classes/fields-of';
import type { Parameter, ParameterId } from './parameter';
import type { RuleKind } from './rule-kind';

/**
 * A rule, as `<module>.<rule-name>`, such as `drivers.fresh-location`. It is fixed once stored,
 * and carries no version: a change to a rule's logic is a new version of the service (FND-84).
 */
export type RuleId = string & { readonly brand: 'RuleId' };

const WORDS = '[a-z][a-z0-9]*(?:-[a-z0-9]+)*';
const RULE_ID = new RegExp(`^${WORDS}(?:\\.${WORDS})+$`, 'u');

/** A rule's ID, which must be its module's name and its own, joined by dots. */
export function toRuleId(value: string): RuleId {
    if (!RULE_ID.test(value)) {
        throw new RangeError(
            `A rule ID must be its module and its name, joined by dots, such as drivers.fresh-location, not "${value}".`,
        );
    }
    return value as RuleId;
}

/** Refuses two parameters with the same ID. */
function assertDistinct(id: RuleId, parameters: List<Parameter>): void {
    const ids = parameters.map((parameter) => parameter.id);
    const distinct = ids.toSet();
    if (distinct.size !== ids.size) {
        throw new RangeError(`Rule ${id} has two parameters with the same ID.`);
    }
}

/**
 * A named rule with parameters: what it says, where it comes from, and the values it takes. Its
 * module applies it with its code, as a check, a calculation, or a limit (FND-84).
 */
export class Rule {
    /** A rule, whose parameters must have distinct IDs. */
    static create(fields: FieldsOf<Rule>): Rule {
        assertDistinct(fields.id, fields.parameters);
        return new Rule(
            fields.id,
            fields.name,
            fields.text,
            fields.source,
            fields.kind,
            fields.parameters,
        );
    }

    declare private readonly brand: never;

    private constructor(
        readonly id: RuleId,
        readonly name: string,
        /** What it says, as the Rules panel shows it. */
        readonly text: string,
        /** The decision or rules page it comes from. */
        readonly source: string,
        readonly kind: RuleKind,
        /** Its parameters, in the order the Rules panel lists them. */
        readonly parameters: List<Parameter>,
    ) {
        Object.freeze(this);
    }

    /** The parameter with this ID, or undefined when the rule has none. */
    parameter(id: ParameterId): Parameter | undefined {
        return this.parameters.find((parameter) => parameter.id === id);
    }

    /** Refuses to apply the rule as another kind. */
    assertKind(kind: RuleKind): void {
        if (this.kind !== kind) {
            throw new TypeError(`Rule ${this.id} is a ${this.kind}, not a ${kind}.`);
        }
    }
}
