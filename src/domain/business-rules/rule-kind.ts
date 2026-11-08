/** A kind of rule, by what applying one gives (FND-84). */
export const RuleKind = {
    /** Passed, or failed with the rule as the reason, such as an eligibility rule. */
    Check: 'Check',
    /** A value, such as a ranking score or a delay. */
    Calculation: 'Calculation',
    /** Within it, or not, such as the outstanding notifications limit. */
    Limit: 'Limit',
} as const;

/** One of the values of {@link RuleKind}. */
export type RuleKind = (typeof RuleKind)[keyof typeof RuleKind];
