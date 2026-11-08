import { describe, expect, it } from 'vitest';

import { RuleSet } from '../../business-rules/rule-set';
import { InboxPosition } from '../../system/messaging/inbox-position';
import { instantAt } from '../../system/time/instant.testing';
import { isReadByDeliveries, nextDeliveriesInboxAt } from './deliveries-communication';
import {
    DELIVERIES_INBOX,
    DELIVERIES_INBOX_INTERVAL,
    DELIVERIES_INBOX_READ_LAG,
    DELIVERIES_READ_LAG,
    DELIVERIES_RULE_LIST,
} from './deliveries-rule-definitions';
import { DeliveriesRules, V1_DELIVERIES_RULES } from './deliveries-rules';
import { tunedDeliveriesRules } from './deliveries-rules.testing';

describe("deliveries' rules", () => {
    it('hold the V1.0.0 values as the pages state them, each inside its range', () => {
        const rules = V1_DELIVERIES_RULES;

        expect(rules).toMatchObject({ inboxJobMs: 5000, readLagMs: 60_000 });
        const outside = rules.set.outOfRange();
        expect(outside.size).toBe(0);
        const isFrozen = Object.isFrozen(rules);
        expect(isFrozen).toBe(true);
    });

    it('tune a value by rule ID, leaving the old rules as they were', () => {
        const tuned = tunedDeliveriesRules(
            V1_DELIVERIES_RULES,
            DELIVERIES_INBOX_READ_LAG,
            DELIVERIES_READ_LAG,
            1000,
        );

        expect(tuned.readLagMs.milliseconds).toBe(1000);
        expect(V1_DELIVERIES_RULES.readLagMs.milliseconds).toBe(60_000);
        const isSame = tuned.equals(V1_DELIVERIES_RULES);
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
            tunedDeliveriesRules(
                V1_DELIVERIES_RULES,
                DELIVERIES_INBOX,
                DELIVERIES_INBOX_INTERVAL,
                value,
            ),
        ).toThrow(RangeError);
    });

    it("refuse a rule set that does not hold Deliveries' rules in order", () => {
        const reversed = DELIVERIES_RULE_LIST.reverse();
        const set = RuleSet.createNew(reversed);

        expect(() => DeliveriesRules.fromSet(set)).toThrow(RangeError);
    });

    it('give the next inbox read after the latest', () => {
        const latest = instantAt(10_000);

        const next = nextDeliveriesInboxAt(latest, V1_DELIVERIES_RULES);

        expect(next).toEqual(15_000);
    });

    it('read an event no older than the read lag before the latest read', () => {
        const start = InboxPosition.createNew();
        const latest = instantAt(120_000);
        const position = start.withLatestRead(latest);
        const recent = instantAt(60_000);
        const old = instantAt(59_999);

        const isRecentRead = isReadByDeliveries(position, recent, V1_DELIVERIES_RULES);
        const isOldRead = isReadByDeliveries(position, old, V1_DELIVERIES_RULES);

        expect(isRecentRead).toBe(true);
        expect(isOldRead).toBe(false);
    });

    const rules = DELIVERIES_RULE_LIST.toArray();

    it.each(rules)('have an ID under drivers.deliveries: $id', (rule) => {
        const isUnderDeliveries = rule.id.startsWith('drivers.deliveries.');

        expect(isUnderDeliveries).toBe(true);
    });
});
