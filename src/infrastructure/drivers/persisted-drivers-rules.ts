import { DRIVERS_RULE_LIST } from '../../domain/drivers/drivers-rule-definitions';
import { DriversRules } from '../../domain/drivers/drivers-rules';
import type { PersistedRuleSet } from '../business-rules/persisted-rule-set';
import { fromPersistedRuleSet, toPersistedRuleSet } from '../business-rules/persisted-rule-set';

/** Drivers' rule values in use, as persisted: a rule set's values, by rule and parameter ID. */
export type PersistedDriversRules = PersistedRuleSet;

/** Drivers' rule values in use, persisted. */
export const toPersistedDriversRules = (rules: DriversRules): PersistedDriversRules =>
    toPersistedRuleSet(rules.set);

/** Drivers' rules from their persisted values. */
export function fromPersistedDriversRules(persisted: PersistedDriversRules): DriversRules {
    const set = fromPersistedRuleSet(persisted, DRIVERS_RULE_LIST);
    return DriversRules.fromSet(set);
}
