import type { Rule } from './rule';
import { RuleKind } from './rule-kind';

/** What a check is made from. */
export interface ICheckFields<TFacts, TValues> {
    /** A rule of the Check kind. */
    readonly rule: Rule;
    /** Whether the facts pass the rule, with the values in use. */
    readonly passes: (facts: TFacts, values: TValues) => boolean;
}

/** A rule of the Check kind, as its module's code applies it: passed, or failed. */
export class Check<TFacts, TValues> {
    /** A check, whose rule must be of the Check kind. */
    static create<TFacts, TValues>(fields: ICheckFields<TFacts, TValues>): Check<TFacts, TValues> {
        fields.rule.assertKind(RuleKind.Check);
        return new Check(fields.rule, fields.passes);
    }

    declare private readonly brand: never;

    private constructor(
        readonly rule: Rule,
        private readonly passes: (facts: TFacts, values: TValues) => boolean,
    ) {
        Object.freeze(this);
    }

    /** Whether the facts pass, with the values in use. */
    isPassedBy(facts: TFacts, values: TValues): boolean {
        return this.passes(facts, values);
    }
}

/**
 * The first check that fails, in their order, or null when every check passes. The failed check's
 * rule is the reason. A module whose checks run in a hot path, such as Drivers' eligibility, may
 * call each check by name instead, so each call site sees one function.
 */
export function firstFailed<TFacts, TValues>(
    checks: readonly Check<TFacts, TValues>[],
    facts: TFacts,
    values: TValues,
): Check<TFacts, TValues> | null {
    for (const check of checks) {
        if (!check.isPassedBy(facts, values)) {
            return check;
        }
    }
    return null;
}
