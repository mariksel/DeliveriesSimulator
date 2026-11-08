import type { List } from 'immutable';

import type { DriverId } from './driver';
import { required } from '../system/validation/required';
import { Calculation } from '../business-rules/calculation';
import { Limit } from '../business-rules/limit';
import {
    NOTIFICATION_DELAY,
    NOTIFICATION_DELAY_LIMIT,
    OUTSTANDING_NOTIFICATIONS,
} from './drivers-rule-definitions';
import type { DriversRules } from './drivers-rules';
import type { Count } from '../system/math/math';
import { toCount } from '../system/math/math';
import type { IRankedDriver } from './ranking';
import { rankDrivers } from './ranking';
import type { Score } from './numbers';
import type { Duration } from '../system/time/duration';
import type { IInstant } from '../system/time/instant';
import { laterOf } from '../system/time/instant';

const DELAY = Calculation.create({
    rule: NOTIFICATION_DELAY,
    calculates: (score: Score, rules: DriversRules): Duration => {
        const exponent = rules.delayDecay * score;
        const factor = Math.exp(-exponent);
        return rules.maxDelayMs.times(factor);
    },
});

const OUTSTANDING = Limit.create({
    rule: OUTSTANDING_NOTIFICATIONS,
    allows: (outstanding: Count, rules: DriversRules) =>
        outstanding < rules.maxOutstandingNotifications,
});

const DELAY_LIMIT = Limit.create({
    rule: NOTIFICATION_DELAY_LIMIT,
    allows: (delay: Duration, rules: DriversRules) =>
        !delay.isLongerThan(rules.maxNotificationDelayMs),
});

/**
 * How long after the previous notification a driver with this score may be notified. Never zero.
 */
export const notificationDelayMs = (score: Score, rules: DriversRules): Duration =>
    DELAY.valueFor(score, rules);

/** A notification already sent for a request. */
export interface IPastNotification {
    readonly driverId: DriverId;
    readonly at: IInstant;
    /** Unanswered, and not ignored. Only an explicit ignore frees a slot. */
    readonly isOutstanding: boolean;
}

/** The driver to notify now about one open request, or null. */
export function nextDriverToNotify(
    past: List<IPastNotification>,
    eligible: List<IRankedDriver>,
    now: IInstant,
    rules: DriversRules,
): DriverId | null {
    const counted = past.count((notification) => notification.isOutstanding);
    const outstanding = toCount(counted);
    if (!OUTSTANDING.isWithin(outstanding, rules)) {
        return null;
    }
    const best = rankDrivers(eligible).find(
        (driver) => !past.some((notification) => notification.driverId === driver.driverId),
    );
    if (best === undefined) {
        return null;
    }
    if (past.isEmpty()) {
        return best.driverId;
    }
    const delay = notificationDelayMs(best.score, rules);
    if (!DELAY_LIMIT.isWithin(delay, rules)) {
        return null;
    }
    const times = past.map((notification) => notification.at);
    const secondFirst = times.first();
    const first = required(secondFirst, 'a past notification');
    const previous = times.reduce<IInstant>(laterOf, first);
    const due = previous.plus(delay);
    return now.isBefore(due) ? null : best.driverId;
}
