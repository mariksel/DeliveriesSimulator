import { describe, expect, it } from 'vitest';

import { RuleSet } from '../business-rules/rule-set';
import { InboxPosition } from '../system/messaging/inbox-position';
import { instantAt } from '../system/time/instant.testing';
import { toCount } from '../system/math/math';
import {
    isReadByOrders,
    mayRetryAnother,
    nextHandoffRetryAt,
    nextOrdersInboxAt,
} from './orders-communication';
import {
    HANDOFF_RETRY,
    HANDOFF_RETRY_INTERVAL,
    ORDERS_INBOX,
    ORDERS_INBOX_INTERVAL,
    ORDERS_INBOX_READ_LAG,
    ORDERS_READ_LAG,
    ORDERS_RULE_LIST,
} from './orders-rule-definitions';
import { OrdersRules, V1_ORDERS_RULES } from './orders-rules';
import { tunedOrdersRules } from './orders-rules.testing';

describe("orders' rules", () => {
    it('hold the V1.0.0 values as the pages state them, each inside its range', () => {
        const rules = V1_ORDERS_RULES;

        expect(rules).toMatchObject({
            inboxJobMs: 5000,
            readLagMs: 60_000,
            handoffRetryJobMs: 5000,
            handoffRetriesPerRun: 100,
        });
        const outside = rules.set.outOfRange();
        expect(outside.size).toBe(0);
        const isFrozen = Object.isFrozen(rules);
        expect(isFrozen).toBe(true);
    });

    it('tune a value by rule ID, leaving the old rules as they were', () => {
        const tuned = tunedOrdersRules(
            V1_ORDERS_RULES,
            ORDERS_INBOX_READ_LAG,
            ORDERS_READ_LAG,
            1000,
        );

        expect(tuned.readLagMs.milliseconds).toBe(1000);
        expect(V1_ORDERS_RULES.readLagMs.milliseconds).toBe(60_000);
        const isSame = tuned.equals(V1_ORDERS_RULES);
        expect(isSame).toBe(false);
        const part = tuned.digestPart();
        const setPart = tuned.set.digestPart();
        expect(part).toBe(setPart);
    });

    it.each<[string, number]>([
        ['of 0', 0],
        ['in part milliseconds', 2.5],
    ])('refuse an inbox job %s', (_name, value) => {
        expect(() =>
            tunedOrdersRules(V1_ORDERS_RULES, ORDERS_INBOX, ORDERS_INBOX_INTERVAL, value),
        ).toThrow(RangeError);
        expect(() =>
            tunedOrdersRules(V1_ORDERS_RULES, HANDOFF_RETRY, HANDOFF_RETRY_INTERVAL, value),
        ).toThrow(RangeError);
    });

    it("refuse a rule set that does not hold Orders' rules in order", () => {
        const reversed = ORDERS_RULE_LIST.reverse();
        const set = RuleSet.createNew(reversed);

        expect(() => OrdersRules.fromSet(set)).toThrow(RangeError);
    });
});

describe("orders' communication rules", () => {
    it('give the next inbox read and the next handoff retry after the latest', () => {
        const latest = instantAt(10_000);

        const nextRead = nextOrdersInboxAt(latest, V1_ORDERS_RULES);
        const nextRetry = nextHandoffRetryAt(latest, V1_ORDERS_RULES);

        expect(nextRead).toEqual(15_000);
        expect(nextRetry).toEqual(15_000);
    });

    it('read an event no older than the read lag before the latest read', () => {
        const start = InboxPosition.createNew();
        const latest = instantAt(120_000);
        const position = start.withLatestRead(latest);
        const recent = instantAt(60_000);
        const old = instantAt(59_999);

        const isRecentRead = isReadByOrders(position, recent, V1_ORDERS_RULES);
        const isOldRead = isReadByOrders(position, old, V1_ORDERS_RULES);

        expect(isRecentRead).toBe(true);
        expect(isOldRead).toBe(false);
    });

    it('retry up to the limit in one run', () => {
        const below = toCount(99);
        const at = toCount(100);

        const isBelowAllowed = mayRetryAnother(below, V1_ORDERS_RULES);
        const isAtAllowed = mayRetryAnother(at, V1_ORDERS_RULES);

        expect(isBelowAllowed).toBe(true);
        expect(isAtAllowed).toBe(false);
    });

    const rules = ORDERS_RULE_LIST.toArray();

    it.each(rules)('have an ID under orders: $id', (rule) => {
        const isUnderOrders = rule.id.startsWith('orders.');

        expect(isUnderOrders).toBe(true);
    });
});
