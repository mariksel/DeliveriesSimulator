import { DELIVERIES_RULE_LIST } from '../../../domain/drivers/deliveries/deliveries-rule-definitions';
import { DeliveriesRules } from '../../../domain/drivers/deliveries/deliveries-rules';
import type { PersistedRuleSet } from '../../business-rules/persisted-rule-set';
import { fromPersistedRuleSet, toPersistedRuleSet } from '../../business-rules/persisted-rule-set';

/** Deliveries' rule values in use, as persisted: a rule set's values, by rule and parameter ID. */
export type PersistedDeliveriesRules = PersistedRuleSet;

/** Deliveries' rule values in use, persisted. */
export const toPersistedDeliveriesRules = (rules: DeliveriesRules): PersistedDeliveriesRules =>
    toPersistedRuleSet(rules.set);

/** Deliveries' rules from their persisted values. */
export function fromPersistedDeliveriesRules(
    persisted: PersistedDeliveriesRules,
): DeliveriesRules {
    const set = fromPersistedRuleSet(persisted, DELIVERIES_RULE_LIST);
    return DeliveriesRules.fromSet(set);
}
