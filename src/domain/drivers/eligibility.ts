import { Check } from '../business-rules/check';
import type { Metres } from '../map-and-routing/numbers';
import type { Duration } from '../system/time/duration';
import type { Count } from '../system/math/math';
import {
    FRESH_LOCATION,
    NEAR_RESTAURANT,
    NOT_BUSY,
    ONLINE,
    SAME_AREA,
} from './drivers-rule-definitions';
import type { DriversRules } from './drivers-rules';

/** What the eligibility rules need to know about a driver and a request. */
export interface IEligibilityFacts {
    readonly isInRestaurantsArea: boolean;
    readonly isOnline: boolean;
    /** How old the driver's latest location is, by its device time, or null when it has none. */
    readonly locationAgeMs: Duration | null;
    /** The straight-line distance to the restaurant, or null when the driver has no location. */
    readonly distanceMetres: Metres | null;
    readonly pickedUpOrders: Count;
}

/** Why a driver is not eligible for a request. */
export const IneligibleReason = {
    OtherArea: 'OtherArea',
    Offline: 'Offline',
    StaleLocation: 'StaleLocation',
    TooFar: 'TooFar',
    Busy: 'Busy',
} as const;

/** One of the values of {@link IneligibleReason}. */
export type IneligibleReason = (typeof IneligibleReason)[keyof typeof IneligibleReason];

type EligibilityCheck = Check<IEligibilityFacts, DriversRules>;

const SAME_AREA_CHECK: EligibilityCheck = Check.create({
    rule: SAME_AREA,
    passes: (facts: IEligibilityFacts) => facts.isInRestaurantsArea,
});

const ONLINE_CHECK: EligibilityCheck = Check.create({
    rule: ONLINE,
    passes: (facts: IEligibilityFacts) => facts.isOnline,
});

const FRESH_LOCATION_CHECK: EligibilityCheck = Check.create({
    rule: FRESH_LOCATION,
    passes: (facts: IEligibilityFacts, rules: DriversRules) =>
        facts.locationAgeMs !== null && !facts.locationAgeMs.isLongerThan(rules.maxLocationAgeMs),
});

const NEAR_RESTAURANT_CHECK: EligibilityCheck = Check.create({
    rule: NEAR_RESTAURANT,
    passes: (facts: IEligibilityFacts, rules: DriversRules) =>
        facts.distanceMetres !== null && facts.distanceMetres < rules.maxDistanceMetres,
});

/** A driver with no location never reaches this check: the location checks fail first. */
const NOT_BUSY_CHECK: EligibilityCheck = Check.create({
    rule: NOT_BUSY,
    passes: (facts: IEligibilityFacts, rules: DriversRules) =>
        facts.pickedUpOrders < rules.busyAtPickedUpOrders ||
        facts.distanceMetres === null ||
        facts.distanceMetres <= rules.busyBeyondMetres,
});

/**
 * The first rule that fails, in the rules' order, or null when the driver is eligible. Each check
 * is called by name, so each call site sees one function: a dispatch pass runs this for every
 * driver it looks at.
 */
export function ineligibleReason(
    facts: IEligibilityFacts,
    rules: DriversRules,
): IneligibleReason | null {
    if (!SAME_AREA_CHECK.isPassedBy(facts, rules)) {
        return IneligibleReason.OtherArea;
    }
    if (!ONLINE_CHECK.isPassedBy(facts, rules)) {
        return IneligibleReason.Offline;
    }
    if (!FRESH_LOCATION_CHECK.isPassedBy(facts, rules)) {
        return IneligibleReason.StaleLocation;
    }
    if (!NEAR_RESTAURANT_CHECK.isPassedBy(facts, rules)) {
        return IneligibleReason.TooFar;
    }
    if (!NOT_BUSY_CHECK.isPassedBy(facts, rules)) {
        return IneligibleReason.Busy;
    }
    return null;
}
