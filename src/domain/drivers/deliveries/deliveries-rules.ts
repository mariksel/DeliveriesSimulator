import type { List } from 'immutable';

import type { ParameterChange } from '../../business-rules/parameter-change';
import { RuleSet } from '../../business-rules/rule-set';
import type { Duration } from '../../system/time/duration';
import { toDuration } from '../../system/time/duration';
import {
    DELIVERIES_INBOX,
    DELIVERIES_INBOX_INTERVAL,
    DELIVERIES_INBOX_READ_LAG,
    DELIVERIES_READ_LAG,
    DELIVERIES_RULE_LIST,
} from './deliveries-rule-definitions';

/**
 * Deliveries' rule set, with each value in use read out once as its own type, so applying a rule
 * reads a field. All of them are tunable (FND-25, FND-84).
 */
export class DeliveriesRules {
    /** Deliveries' rules with the values the V1.0.0 pages state. */
    static createNew(): DeliveriesRules {
        const set = RuleSet.createNew(DELIVERIES_RULE_LIST);
        return DeliveriesRules.fromSet(set);
    }

    /** Deliveries' rules from a rule set, which must hold Deliveries' rules. */
    static fromSet(set: RuleSet): DeliveriesRules {
        const ids = set.rules.map((rule) => rule.id);
        const expected = DELIVERIES_RULE_LIST.map((rule) => rule.id);
        if (!ids.equals(expected)) {
            throw new RangeError(
                "A rule set for deliveries must hold Deliveries' rules, in order.",
            );
        }
        const inbox = set.valueOf(DELIVERIES_INBOX.id, DELIVERIES_INBOX_INTERVAL.id);
        const readLag = set.valueOf(DELIVERIES_INBOX_READ_LAG.id, DELIVERIES_READ_LAG.id);
        const inboxJobMs = toDuration(inbox);
        const readLagMs = toDuration(readLag);
        return new DeliveriesRules(set, inboxJobMs, readLagMs);
    }

    declare private readonly brand: never;

    private constructor(
        /** The rules and their values, as the Rules panel shows them. */
        readonly set: RuleSet,
        /** How often deliveries reads its inbox. */
        readonly inboxJobMs: Duration,
        /** Deliveries' inbox starts reading this long before the latest event it has read. */
        readonly readLagMs: Duration,
    ) {
        Object.freeze(this);
    }

    /** These rules with some values changed, as the rule set checks them. */
    with(changes: List<ParameterChange>): DeliveriesRules {
        const set = this.set.with(changes);
        return DeliveriesRules.fromSet(set);
    }

    /** The values, written out rule by rule for a digest. */
    digestPart(): string {
        return this.set.digestPart();
    }

    /** Whether other rules hold the same values. */
    equals(other: DeliveriesRules): boolean {
        return this.set.equals(other.set);
    }
}

/** The rules V1.0.0 uses in deliveries. */
export const V1_DELIVERIES_RULES = DeliveriesRules.createNew();
