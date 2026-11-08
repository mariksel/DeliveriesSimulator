import { describe, expect, it } from 'vitest';

import { V1_DRIVERS_RULES as VALUES } from './drivers-rules';
import type { IEligibilityFacts } from './eligibility';
import { ineligibleReason } from './eligibility';
import { toMetres } from '../map-and-routing/numbers';
import { toCount } from '../system/math/math';
import { toDuration } from '../system/time/duration';

const ELIGIBLE: IEligibilityFacts = {
    isInRestaurantsArea: true,
    isOnline: true,
    locationAgeMs: toDuration(0),
    distanceMetres: toMetres(100),
    pickedUpOrders: toCount(0),
};

describe('eligibility', () => {
    it('accepts a driver when every rule holds', () => {
        const secondIneligibleReason = ineligibleReason(ELIGIBLE, VALUES);
        expect(secondIneligibleReason).toBeNull();
    });

    it.each<[string, Partial<IEligibilityFacts>, string]>([
        ['in another area', { isInRestaurantsArea: false }, 'OtherArea'],
        ['offline', { isOnline: false }, 'Offline'],
        ['with no location', { locationAgeMs: null, distanceMetres: null }, 'StaleLocation'],
        [
            'with a location just over 5 minutes old',
            { locationAgeMs: toDuration(300_001) },
            'StaleLocation',
        ],
        ['exactly 3 km away', { distanceMetres: toMetres(3000) }, 'TooFar'],
        [
            'at 5 picked-up orders and just over 500 m away',
            { pickedUpOrders: toCount(5), distanceMetres: toMetres(500.1) },
            'Busy',
        ],
    ])('refuses a driver %s', (_name, facts, reason) => {
        const secondIneligibleReason = ineligibleReason({ ...ELIGIBLE, ...facts }, VALUES);
        expect(secondIneligibleReason).toBe(reason);
    });

    it.each<[string, Partial<IEligibilityFacts>]>([
        ['exactly 5 minutes old', { locationAgeMs: toDuration(300_000) }],
        ['just under 3 km away', { distanceMetres: toMetres(2999.9) }],
        [
            'at 4 picked-up orders, however far within range',
            { pickedUpOrders: toCount(4), distanceMetres: toMetres(2999) },
        ],
        [
            'at 5 picked-up orders and exactly 500 m away',
            { pickedUpOrders: toCount(5), distanceMetres: toMetres(500) },
        ],
    ])('accepts a driver %s', (_name, facts) => {
        const secondIneligibleReason = ineligibleReason({ ...ELIGIBLE, ...facts }, VALUES);
        expect(secondIneligibleReason).toBeNull();
    });

    describe("gives the first failing rule, in the rules' order", () => {
        const allWrong: IEligibilityFacts = {
            isInRestaurantsArea: false,
            isOnline: false,
            locationAgeMs: null,
            distanceMetres: null,
            pickedUpOrders: toCount(9),
        };

        it.each<[string, IEligibilityFacts]>([
            ['OtherArea', allWrong],
            ['Offline', { ...allWrong, isInRestaurantsArea: true }],
            ['StaleLocation', { ...allWrong, isInRestaurantsArea: true, isOnline: true }],
            [
                'TooFar',
                { ...ELIGIBLE, distanceMetres: toMetres(4000), pickedUpOrders: toCount(9) },
            ],
        ])('%s', (reason, facts) => {
            const secondIneligibleReason = ineligibleReason(facts, VALUES);
            expect(secondIneligibleReason).toBe(reason);
        });
    });
});
