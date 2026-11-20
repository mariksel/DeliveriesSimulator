import { List } from 'immutable';

import { statedParameter, statedRule } from '../business-rules/as-stated';
import { ParameterKind } from '../business-rules/parameter-kind';
import { RuleKind } from '../business-rules/rule-kind';
import { UsableValues } from '../business-rules/usable-values';

/**
 * Drivers' rules of V1.0.0, written with the Business rules abstractions (FND-84). The values
 * are as the V1.0.0 rules state them, and the user accepted the ranges on 2026-11-07.
 */

const SOURCE = 'V1.0.0 business rules';

/** How old a driver's latest location may be. */
export const MAX_LOCATION_AGE = statedParameter({
    id: 'max-age',
    name: 'Maximum location age',
    text: "How old the driver's latest location may be, by its device time.",
    kind: ParameterKind.Duration,
    defaultValue: 300_000,
    lowest: 60_000,
    highest: 1300_000,
});

/** How far from the restaurant a driver may be. */
export const MAX_DISTANCE = statedParameter({
    id: 'max-distance',
    name: 'Maximum distance',
    text: 'The straight-line distance to the restaurant must be under this.',
    kind: ParameterKind.Distance,
    defaultValue: 3000,
    lowest: 500,
    highest: 10_000,
});

/** How many picked-up orders make a driver busy. */
export const BUSY_AT_PICKED_UP_ORDERS = statedParameter({
    id: 'busy-at-picked-up-orders',
    name: 'Busy at picked-up orders',
    text: 'A driver carrying this many picked-up orders or more is busy, when far away.',
    kind: ParameterKind.Count,
    defaultValue: 5,
    lowest: 1,
    highest: 20,
});

/** How far away a driver with many picked-up orders is busy. */
export const BUSY_BEYOND = statedParameter({
    id: 'busy-beyond',
    name: 'Busy beyond',
    text: 'A driver with many picked-up orders is busy when farther than this from the restaurant.',
    kind: ParameterKind.Distance,
    defaultValue: 500,
    lowest: 0,
    highest: 3000,
});

/** The ranking boost of an Available driver. */
export const BOOST_AVAILABLE = statedParameter({
    id: 'boost-available',
    name: 'Available boost',
    text: "What an Available driver's score is multiplied by.",
    kind: ParameterKind.Multiplier,
    defaultValue: 1,
    lowest: 0,
    highest: 5,
});

/** The ranking boost of a Busy driver. */
export const BOOST_BUSY = statedParameter({
    id: 'boost-busy',
    name: 'Busy boost',
    text: "What a Busy driver's score is multiplied by.",
    kind: ParameterKind.Multiplier,
    defaultValue: 0.5,
    lowest: 0,
    highest: 5,
});

/** The ranking boost of a FreeForDelivery driver. */
export const BOOST_FREE_FOR_DELIVERY = statedParameter({
    id: 'boost-free-for-delivery',
    name: 'FreeForDelivery boost',
    text: "What a FreeForDelivery driver's score is multiplied by.",
    kind: ParameterKind.Multiplier,
    defaultValue: 2,
    lowest: 0,
    highest: 5,
});

/** The distance proximity is measured in. */
export const PROXIMITY_SCALE = statedParameter({
    id: 'proximity-scale',
    name: 'Proximity scale',
    text: 'Proximity is e to the minus distance, in units of this distance.',
    kind: ParameterKind.Distance,
    usable: UsableValues.NotZero,
    defaultValue: 1000,
    lowest: 100,
    highest: 10_000,
});

/** What held orders are divided by for the load. */
export const LOAD_DIVISOR = statedParameter({
    id: 'load-divisor',
    name: 'Load divisor',
    text: 'Load is e to the minus held orders, divided by this.',
    kind: ParameterKind.Multiplier,
    usable: UsableValues.NotZero,
    defaultValue: 2,
    lowest: 0.5,
    highest: 10,
});

/** The longest delay between notifications. */
export const MAX_DELAY = statedParameter({
    id: 'max-delay',
    name: 'Maximum delay',
    text: 'The delay before a driver with a score of 0 is notified.',
    kind: ParameterKind.Duration,
    defaultValue: 120_000,
    lowest: 10_000,
    highest: 600_000,
});

/** How fast the delay falls as the score rises. */
export const DELAY_DECAY = statedParameter({
    id: 'decay',
    name: 'Decay',
    text: 'The delay is the maximum delay times e to the minus this times the score.',
    kind: ParameterKind.Multiplier,
    defaultValue: 5,
    lowest: 0,
    highest: 20,
});

/** How many unanswered notifications a request may have. */
export const MAX_OUTSTANDING = statedParameter({
    id: 'max-outstanding',
    name: 'Maximum outstanding notifications',
    text: 'Nothing is sent while this many drivers hold an unanswered notification.',
    kind: ParameterKind.Count,
    defaultValue: 5,
    lowest: 1,
    highest: 20,
});

/** The longest delay a later notification may have. */
export const MAX_NOTIFICATION_DELAY = statedParameter({
    id: 'max-notification-delay',
    name: 'Maximum notification delay',
    text: 'A later notification goes only to a driver whose delay is at most this.',
    kind: ParameterKind.Duration,
    defaultValue: 60_000,
    lowest: 0,
    highest: 300_000,
});

/** How often the dispatch pass runs. */
export const DISPATCH_PASS_INTERVAL = statedParameter({
    id: 'interval',
    name: 'Dispatch pass interval',
    text: 'How long after one dispatch pass the next runs.',
    kind: ParameterKind.Duration,
    usable: UsableValues.WholeAboveZero,
    defaultValue: 30_000,
    lowest: 5000,
    highest: 300_000,
});

/** Eligibility 1: the driver's service area is the restaurant's. */
export const SAME_AREA = statedRule({
    id: 'drivers.same-area',
    name: 'Same area',
    text: "The driver's service area is the restaurant's.",
    source: `${SOURCE}: Eligibility, rule 1`,
    kind: RuleKind.Check,
    parameters: [],
});

/** Eligibility 2: the driver is online. */
export const ONLINE = statedRule({
    id: 'drivers.online',
    name: 'Online',
    text: 'The driver is online, in any availability.',
    source: `${SOURCE}: Eligibility, rule 2`,
    kind: RuleKind.Check,
    parameters: [],
});

/** Eligibility 3: the driver's latest location is fresh. */
export const FRESH_LOCATION = statedRule({
    id: 'drivers.fresh-location',
    name: 'Fresh location',
    text: "The driver's latest location is fresh, by its device time; no location counts as stale.",
    source: `${SOURCE}: Eligibility, rule 3`,
    kind: RuleKind.Check,
    parameters: [MAX_LOCATION_AGE],
});

/** Eligibility 4: the driver is near the restaurant. */
export const NEAR_RESTAURANT = statedRule({
    id: 'drivers.near-restaurant',
    name: 'Near the restaurant',
    text: 'The straight-line distance to the restaurant is short enough.',
    source: `${SOURCE}: Eligibility, rule 4`,
    kind: RuleKind.Check,
    parameters: [MAX_DISTANCE],
});

/** Eligibility 5: the driver is not busy. */
export const NOT_BUSY = statedRule({
    id: 'drivers.not-busy',
    name: 'Not busy',
    text: 'The driver is not carrying many picked-up orders while far from the restaurant.',
    source: `${SOURCE}: Eligibility, rule 5`,
    kind: RuleKind.Check,
    parameters: [BUSY_AT_PICKED_UP_ORDERS, BUSY_BEYOND],
});

/** The ranking score. */
export const RANKING_SCORE = statedRule({
    id: 'drivers.ranking-score',
    name: 'Ranking score',
    text: 'Proximity times load times the availability boost, capped at 1. A higher score is notified first.',
    source: `${SOURCE}: Ranking`,
    kind: RuleKind.Calculation,
    parameters: [
        BOOST_AVAILABLE,
        BOOST_BUSY,
        BOOST_FREE_FOR_DELIVERY,
        PROXIMITY_SCALE,
        LOAD_DIVISOR,
    ],
});

/** The delay before notifying a driver. */
export const NOTIFICATION_DELAY = statedRule({
    id: 'drivers.notification-delay',
    name: 'Notification delay',
    text: 'The maximum delay times e to the minus the decay times the score; never zero.',
    source: `${SOURCE}: Ranking`,
    kind: RuleKind.Calculation,
    parameters: [MAX_DELAY, DELAY_DECAY],
});

/** The limit on unanswered notifications for a request. */
export const OUTSTANDING_NOTIFICATIONS = statedRule({
    id: 'drivers.outstanding-notifications',
    name: 'Outstanding notifications',
    text: 'Nothing is sent while too many drivers hold an unanswered notification; only an explicit ignore frees a slot.',
    source: `${SOURCE}: Notification sequence`,
    kind: RuleKind.Limit,
    parameters: [MAX_OUTSTANDING],
});

/** The limit on a later notification's delay. */
export const NOTIFICATION_DELAY_LIMIT = statedRule({
    id: 'drivers.notification-delay-limit',
    name: 'Notification delay limit',
    text: 'A later notification goes to the best-ranked remaining driver only when their delay is short enough.',
    source: `${SOURCE}: Notification sequence`,
    kind: RuleKind.Limit,
    parameters: [MAX_NOTIFICATION_DELAY],
});

/** When the next dispatch pass runs. */
export const DISPATCH_PASS = statedRule({
    id: 'drivers.dispatch-pass',
    name: 'Dispatch pass',
    text: 'A dispatch pass runs at a fixed interval after the one before.',
    source: `${SOURCE}: Notification sequence`,
    kind: RuleKind.Calculation,
    parameters: [DISPATCH_PASS_INTERVAL],
});

/** Drivers' rules, in the order they apply and the Rules panel lists them. */
export const DRIVERS_RULE_LIST = List([
    SAME_AREA,
    ONLINE,
    FRESH_LOCATION,
    NEAR_RESTAURANT,
    NOT_BUSY,
    RANKING_SCORE,
    NOTIFICATION_DELAY,
    OUTSTANDING_NOTIFICATIONS,
    NOTIFICATION_DELAY_LIMIT,
    DISPATCH_PASS,
]);
