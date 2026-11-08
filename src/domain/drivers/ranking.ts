import type { List } from 'immutable';

import type { DriverId } from './driver';
import type { DriverAvailability } from './driver-availability';
import { Calculation } from '../business-rules/calculation';
import { RANKING_SCORE } from './drivers-rule-definitions';
import type { DriversRules } from './drivers-rules';
import type { Metres } from '../map-and-routing/numbers';
import type { Score } from './numbers';
import type { Count } from '../system/math/math';
import { toScore } from './numbers';

/** What the ranking score is worked out from. */
interface IRankingFacts {
    readonly distanceMetres: Metres;
    readonly heldOrders: Count;
    readonly availability: DriverAvailability;
}

const RANKING = Calculation.create({
    rule: RANKING_SCORE,
    calculates: (facts: IRankingFacts, rules: DriversRules): Score => {
        const distance = facts.distanceMetres / rules.proximityScaleMetres;
        const proximity = Math.exp(-distance);
        const held = facts.heldOrders / rules.loadDivisor;
        const load = Math.exp(-held);
        const boost = rules.availabilityBoost[facts.availability];
        const score = Math.min(1, proximity * load * boost);
        return toScore(score);
    },
});

/** A score between 0 and 1. A higher score is notified first. */
export function rankScore(
    distanceMetres: Metres,
    heldOrders: Count,
    availability: DriverAvailability,
    rules: DriversRules,
): Score {
    return RANKING.valueFor({ distanceMetres, heldOrders, availability }, rules);
}

/** An eligible driver, with their score for a request. */
export interface IRankedDriver {
    readonly driverId: DriverId;
    readonly score: Score;
}

function bestFirst(first: IRankedDriver, second: IRankedDriver): number {
    if (first.score !== second.score) {
        return second.score - first.score;
    }
    return first.driverId < second.driverId ? -1 : 1;
}

/**
 * Best score first. V1.0.0 leaves equal scores undefined, in the order its database returns them,
 * so the simulator breaks ties by driver ID (FND-68).
 */
export function rankDrivers(drivers: List<IRankedDriver>): List<IRankedDriver> {
    return drivers.sort(bestFirst);
}
