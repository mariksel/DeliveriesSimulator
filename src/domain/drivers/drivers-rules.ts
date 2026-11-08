import type { List } from 'immutable';

import type { ParameterChange } from '../business-rules/parameter-change';
import type { Parameter } from '../business-rules/parameter';
import type { Rule } from '../business-rules/rule';
import { RuleSet } from '../business-rules/rule-set';
import type { Metres } from '../map-and-routing/numbers';
import { toMetres } from '../map-and-routing/numbers';
import type { Duration } from '../system/time/duration';
import { toDuration } from '../system/time/duration';
import type { Count } from '../system/math/math';
import { toCount } from '../system/math/math';
import { DriverAvailability } from './driver-availability';
import {
    BOOST_AVAILABLE,
    BOOST_BUSY,
    BOOST_FREE_FOR_DELIVERY,
    BUSY_AT_PICKED_UP_ORDERS,
    BUSY_BEYOND,
    DELAY_DECAY,
    DISPATCH_PASS,
    DISPATCH_PASS_INTERVAL,
    DRIVERS_RULE_LIST,
    FRESH_LOCATION,
    LOAD_DIVISOR,
    MAX_DELAY,
    MAX_DISTANCE,
    MAX_LOCATION_AGE,
    MAX_NOTIFICATION_DELAY,
    MAX_OUTSTANDING,
    NEAR_RESTAURANT,
    NOT_BUSY,
    NOTIFICATION_DELAY,
    NOTIFICATION_DELAY_LIMIT,
    OUTSTANDING_NOTIFICATIONS,
    PROXIMITY_SCALE,
    RANKING_SCORE,
} from './drivers-rule-definitions';
import type { Factor } from './numbers';
import { toFactor } from './numbers';

/** How much each availability boosts a driver's ranking. */
export type AvailabilityBoost = Readonly<Record<DriverAvailability, Factor>>;

/** The value in use for one of a rule's parameters. */
const valueOf = (set: RuleSet, rule: Rule, parameter: Parameter): number =>
    set.valueOf(rule.id, parameter.id);

function availabilityBoost(set: RuleSet): AvailabilityBoost {
    const available = valueOf(set, RANKING_SCORE, BOOST_AVAILABLE);
    const busy = valueOf(set, RANKING_SCORE, BOOST_BUSY);
    const freeForDelivery = valueOf(set, RANKING_SCORE, BOOST_FREE_FOR_DELIVERY);
    const availableBoost = toFactor(available);
    const busyBoost = toFactor(busy);
    const freeForDeliveryBoost = toFactor(freeForDelivery);
    return Object.freeze({
        [DriverAvailability.Available]: availableBoost,
        [DriverAvailability.Busy]: busyBoost,
        [DriverAvailability.FreeForDelivery]: freeForDeliveryBoost,
    });
}

/**
 * Drivers' rule set, with each value in use read out once as its own type, so applying a rule
 * reads a field. All of them are tunable (FND-25, FND-84).
 */
export class DriversRules {
    /** Drivers' rules with the values the V1.0.0 rules state. */
    static createNew(): DriversRules {
        const set = RuleSet.createNew(DRIVERS_RULE_LIST);
        return DriversRules.fromSet(set);
    }

    /** Drivers' rules from a rule set, which must hold Drivers' rules. */
    static fromSet(set: RuleSet): DriversRules {
        const ids = set.rules.map((rule) => rule.id);
        const expected = DRIVERS_RULE_LIST.map((rule) => rule.id);
        if (!ids.equals(expected)) {
            throw new RangeError("A rule set for drivers must hold Drivers' rules, in order.");
        }
        const age = valueOf(set, FRESH_LOCATION, MAX_LOCATION_AGE);
        const distance = valueOf(set, NEAR_RESTAURANT, MAX_DISTANCE);
        const busyAt = valueOf(set, NOT_BUSY, BUSY_AT_PICKED_UP_ORDERS);
        const busyBeyond = valueOf(set, NOT_BUSY, BUSY_BEYOND);
        const proximityScale = valueOf(set, RANKING_SCORE, PROXIMITY_SCALE);
        const loadDivisor = valueOf(set, RANKING_SCORE, LOAD_DIVISOR);
        const maxDelay = valueOf(set, NOTIFICATION_DELAY, MAX_DELAY);
        const decay = valueOf(set, NOTIFICATION_DELAY, DELAY_DECAY);
        const outstanding = valueOf(set, OUTSTANDING_NOTIFICATIONS, MAX_OUTSTANDING);
        const delayLimit = valueOf(set, NOTIFICATION_DELAY_LIMIT, MAX_NOTIFICATION_DELAY);
        const pass = valueOf(set, DISPATCH_PASS, DISPATCH_PASS_INTERVAL);
        const maxLocationAgeMs = toDuration(age);
        const maxDistanceMetres = toMetres(distance);
        const busyAtPickedUpOrders = toCount(busyAt);
        const busyBeyondMetres = toMetres(busyBeyond);
        const boost = availabilityBoost(set);
        const proximityScaleMetres = toMetres(proximityScale);
        const divisor = toFactor(loadDivisor);
        const maxDelayMs = toDuration(maxDelay);
        const delayDecay = toFactor(decay);
        const maxOutstandingNotifications = toCount(outstanding);
        const maxNotificationDelayMs = toDuration(delayLimit);
        const dispatchPassMs = toDuration(pass);
        return new DriversRules(
            set,
            maxLocationAgeMs,
            maxDistanceMetres,
            busyAtPickedUpOrders,
            busyBeyondMetres,
            boost,
            proximityScaleMetres,
            divisor,
            maxDelayMs,
            delayDecay,
            maxOutstandingNotifications,
            maxNotificationDelayMs,
            dispatchPassMs,
        );
    }

    declare private readonly brand: never;

    private constructor(
        /** The rules and their values, as the Rules panel shows them. */
        readonly set: RuleSet,
        readonly maxLocationAgeMs: Duration,
        readonly maxDistanceMetres: Metres,
        readonly busyAtPickedUpOrders: Count,
        readonly busyBeyondMetres: Metres,
        readonly availabilityBoost: AvailabilityBoost,
        readonly proximityScaleMetres: Metres,
        readonly loadDivisor: Factor,
        readonly maxDelayMs: Duration,
        readonly delayDecay: Factor,
        readonly maxOutstandingNotifications: Count,
        readonly maxNotificationDelayMs: Duration,
        readonly dispatchPassMs: Duration,
    ) {
        Object.freeze(this);
    }

    /** These rules with some values changed, as the rule set checks them. */
    with(changes: List<ParameterChange>): DriversRules {
        const set = this.set.with(changes);
        return DriversRules.fromSet(set);
    }

    /** The values, written out rule by rule for a digest. */
    digestPart(): string {
        return this.set.digestPart();
    }

    /** Whether other rules hold the same values. */
    equals(other: DriversRules): boolean {
        return this.set.equals(other.set);
    }
}

/** The rules V1.0.0 uses in drivers. */
export const V1_DRIVERS_RULES = DriversRules.createNew();
