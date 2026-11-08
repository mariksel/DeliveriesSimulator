import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import type { Rule } from '../business-rules/rule';
import { RuleSet } from '../business-rules/rule-set';
import {
    DISPATCH_PASS,
    DISPATCH_PASS_INTERVAL,
    DRIVERS_RULE_LIST,
    LOAD_DIVISOR,
    NEAR_RESTAURANT,
    MAX_DISTANCE,
    RANKING_SCORE,
} from './drivers-rule-definitions';
import { DriversRules, V1_DRIVERS_RULES } from './drivers-rules';
import { tunedDriversRules } from './drivers-rules.testing';

describe("drivers' rules", () => {
    it('hold the V1.0.0 values as the rules state them', () => {
        const rules = V1_DRIVERS_RULES;

        expect(rules.maxLocationAgeMs.milliseconds).toBe(300_000);
        expect(rules.maxDistanceMetres).toBe(3000);
        expect(rules.busyAtPickedUpOrders).toBe(5);
        expect(rules.busyBeyondMetres).toBe(500);
        expect(rules.availabilityBoost).toEqual({ Available: 1, Busy: 0.5, FreeForDelivery: 2 });
        expect(rules.proximityScaleMetres).toBe(1000);
        expect(rules.loadDivisor).toBe(2);
        expect(rules.maxDelayMs.milliseconds).toBe(120_000);
        expect(rules.delayDecay).toBe(5);
        expect(rules.maxOutstandingNotifications).toBe(5);
        expect(rules.maxNotificationDelayMs.milliseconds).toBe(60_000);
        expect(rules.dispatchPassMs.milliseconds).toBe(30_000);
    });

    it('have every default inside its valid range', () => {
        const outside = V1_DRIVERS_RULES.set.outOfRange();

        expect(outside.size).toBe(0);
    });

    it('cannot change, and neither can their availability boosts', () => {
        const isFrozen = Object.isFrozen(V1_DRIVERS_RULES);
        const isBoostFrozen = Object.isFrozen(V1_DRIVERS_RULES.availabilityBoost);

        expect(isFrozen).toBe(true);
        expect(isBoostFrozen).toBe(true);
    });

    it('tune a value by rule ID into new rules, leaving the old ones as they were', () => {
        const tuned = tunedDriversRules(
            V1_DRIVERS_RULES,
            DISPATCH_PASS,
            DISPATCH_PASS_INTERVAL,
            7000,
        );

        expect(tuned.dispatchPassMs.milliseconds).toBe(7000);
        expect(tuned.maxDistanceMetres).toBe(V1_DRIVERS_RULES.maxDistanceMetres);
        expect(V1_DRIVERS_RULES.dispatchPassMs.milliseconds).toBe(30_000);
        const isSame = tuned.equals(V1_DRIVERS_RULES);
        expect(isSame).toBe(false);
    });

    it('use a value outside its valid range, which tuning may do on purpose', () => {
        const extreme = tunedDriversRules(V1_DRIVERS_RULES, NEAR_RESTAURANT, MAX_DISTANCE, -5);

        expect(extreme.maxDistanceMetres).toBe(-5);
        const outside = extreme.set.outOfRange();
        const ids = outside.map((entry) => entry.rule.id).toArray();
        expect(ids).toEqual(['drivers.near-restaurant']);
    });

    it.each<[string, number]>([
        ['of 0', 0],
        ['in part milliseconds', 0.5],
    ])('refuse a dispatch pass %s', (_name, value) => {
        expect(() =>
            tunedDriversRules(V1_DRIVERS_RULES, DISPATCH_PASS, DISPATCH_PASS_INTERVAL, value),
        ).toThrow(RangeError);
    });

    it('refuse a load divisor of 0, which a score cannot be worked out with', () => {
        expect(() => tunedDriversRules(V1_DRIVERS_RULES, RANKING_SCORE, LOAD_DIVISOR, 0)).toThrow(
            RangeError,
        );
    });

    it("refuse a rule set that does not hold Drivers' rules in order", () => {
        const reversed = DRIVERS_RULE_LIST.reverse();
        const set = RuleSet.createNew(reversed);
        const none = List<Rule>();
        const empty = RuleSet.createNew(none);

        expect(() => DriversRules.fromSet(set)).toThrow(RangeError);
        expect(() => DriversRules.fromSet(empty)).toThrow(RangeError);
    });

    it('write their values out for a digest as their rule set does', () => {
        const part = V1_DRIVERS_RULES.digestPart();

        const setPart = V1_DRIVERS_RULES.set.digestPart();
        expect(part).toBe(setPart);
    });

    const rules = DRIVERS_RULE_LIST.toArray();

    it.each(rules)('have an ID under drivers: $id', (rule) => {
        const isUnderDrivers = rule.id.startsWith('drivers.');

        expect(isUnderDrivers).toBe(true);
    });
});
