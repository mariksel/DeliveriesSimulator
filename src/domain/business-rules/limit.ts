import type { Rule } from './rule';
import { RuleKind } from './rule-kind';

/** What a limit is made from. */
export interface ILimitFields<TInput, TValues> {
    /** A rule of the Limit kind. */
    readonly rule: Rule;
    /** Whether the input is within the limit, with the values in use. */
    readonly allows: (input: TInput, values: TValues) => boolean;
}

/** A rule of the Limit kind, as its module's code applies it: within it, or not. */
export class Limit<TInput, TValues> {
    /** A limit, whose rule must be of the Limit kind. */
    static create<TInput, TValues>(fields: ILimitFields<TInput, TValues>): Limit<TInput, TValues> {
        fields.rule.assertKind(RuleKind.Limit);
        return new Limit(fields.rule, fields.allows);
    }

    declare private readonly brand: never;

    private constructor(
        readonly rule: Rule,
        private readonly allows: (input: TInput, values: TValues) => boolean,
    ) {
        Object.freeze(this);
    }

    /** Whether the input is within the limit, with the values in use. */
    isWithin(input: TInput, values: TValues): boolean {
        return this.allows(input, values);
    }
}
