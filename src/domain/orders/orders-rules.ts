import type { List } from 'immutable';

import type { ParameterChange } from '../business-rules/parameter-change';
import { RuleSet } from '../business-rules/rule-set';
import type { Duration } from '../system/time/duration';
import { toDuration } from '../system/time/duration';
import type { Count } from '../system/math/math';
import { toCount } from '../system/math/math';
import {
    HANDOFF_RETRIES_PER_RUN,
    HANDOFF_RETRY,
    HANDOFF_RETRY_INTERVAL,
    MAX_HANDOFF_RETRIES,
    ORDERS_INBOX,
    ORDERS_INBOX_INTERVAL,
    ORDERS_INBOX_READ_LAG,
    ORDERS_READ_LAG,
    ORDERS_RULE_LIST,
} from './orders-rule-definitions';

/**
 * Orders' rule set, with each value in use read out once as its own type, so applying a rule
 * reads a field. All of them are tunable (FND-25, FND-84).
 */
export class OrdersRules {
    /** Orders' rules with the values the V1.0.0 pages state. */
    static createNew(): OrdersRules {
        const set = RuleSet.createNew(ORDERS_RULE_LIST);
        return OrdersRules.fromSet(set);
    }

    /** Orders' rules from a rule set, which must hold Orders' rules. */
    static fromSet(set: RuleSet): OrdersRules {
        const ids = set.rules.map((rule) => rule.id);
        const expected = ORDERS_RULE_LIST.map((rule) => rule.id);
        if (!ids.equals(expected)) {
            throw new RangeError("A rule set for orders must hold Orders' rules, in order.");
        }
        const inbox = set.valueOf(ORDERS_INBOX.id, ORDERS_INBOX_INTERVAL.id);
        const readLag = set.valueOf(ORDERS_INBOX_READ_LAG.id, ORDERS_READ_LAG.id);
        const retry = set.valueOf(HANDOFF_RETRY.id, HANDOFF_RETRY_INTERVAL.id);
        const retries = set.valueOf(HANDOFF_RETRIES_PER_RUN.id, MAX_HANDOFF_RETRIES.id);
        const inboxJobMs = toDuration(inbox);
        const readLagMs = toDuration(readLag);
        const handoffRetryJobMs = toDuration(retry);
        const handoffRetriesPerRun = toCount(retries);
        return new OrdersRules(
            set,
            inboxJobMs,
            readLagMs,
            handoffRetryJobMs,
            handoffRetriesPerRun,
        );
    }

    declare private readonly brand: never;

    private constructor(
        /** The rules and their values, as the Rules panel shows them. */
        readonly set: RuleSet,
        /** How often orders reads its inbox. */
        readonly inboxJobMs: Duration,
        /** Orders' inbox starts reading this long before the latest event it has read. */
        readonly readLagMs: Duration,
        readonly handoffRetryJobMs: Duration,
        readonly handoffRetriesPerRun: Count,
    ) {
        Object.freeze(this);
    }

    /** These rules with some values changed, as the rule set checks them. */
    with(changes: List<ParameterChange>): OrdersRules {
        const set = this.set.with(changes);
        return OrdersRules.fromSet(set);
    }

    /** The values, written out rule by rule for a digest. */
    digestPart(): string {
        return this.set.digestPart();
    }

    /** Whether other rules hold the same values. */
    equals(other: OrdersRules): boolean {
        return this.set.equals(other.set);
    }
}

/** The rules V1.0.0 uses in orders. */
export const V1_ORDERS_RULES = OrdersRules.createNew();
