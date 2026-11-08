import type { Rule } from './rule';
import { RuleKind } from './rule-kind';

/** What a calculation is made from. */
export interface ICalculationFields<TInput, TValues, TResult> {
    /** A rule of the Calculation kind. */
    readonly rule: Rule;
    /** The value the rule gives for the input, with the values in use. */
    readonly calculates: (input: TInput, values: TValues) => TResult;
}

/** A rule of the Calculation kind, as its module's code applies it: it gives a value. */
export class Calculation<TInput, TValues, TResult> {
    /** A calculation, whose rule must be of the Calculation kind. */
    static create<TInput, TValues, TResult>(
        fields: ICalculationFields<TInput, TValues, TResult>,
    ): Calculation<TInput, TValues, TResult> {
        fields.rule.assertKind(RuleKind.Calculation);
        return new Calculation(fields.rule, fields.calculates);
    }

    declare private readonly brand: never;

    private constructor(
        readonly rule: Rule,
        private readonly calculates: (input: TInput, values: TValues) => TResult,
    ) {
        Object.freeze(this);
    }

    /** The value the rule gives for the input, with the values in use. */
    valueFor(input: TInput, values: TValues): TResult {
        return this.calculates(input, values);
    }
}
