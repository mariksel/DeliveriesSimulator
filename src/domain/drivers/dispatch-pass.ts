import { Calculation } from '../business-rules/calculation';
import type { IInstant } from '../system/time/instant';
import { DISPATCH_PASS } from './drivers-rule-definitions';
import type { DriversRules } from './drivers-rules';

const NEXT_PASS = Calculation.create({
    rule: DISPATCH_PASS,
    calculates: (latest: IInstant, rules: DriversRules): IInstant =>
        latest.plus(rules.dispatchPassMs),
});

/** When the next dispatch pass is due, after the latest one. */
export const nextDispatchPassAt = (latest: IInstant, rules: DriversRules): IInstant =>
    NEXT_PASS.valueFor(latest, rules);
