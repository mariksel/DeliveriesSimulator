import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { V1_DRIVERS_RULES as VALUES } from './drivers-rules';
import { rankDrivers, rankScore } from './ranking';
import { toDriverId } from './driver';
import { toMetres } from '../map-and-routing/numbers';
import { toScore } from './numbers';
import { toCount } from '../system/math/math';

describe('ranking', () => {
    it('follows the formula for proximity, load, and availability', () => {
        const distanceMetres = toMetres(1000);
        const heldOrders = toCount(2);
        const secondRankScore = rankScore(distanceMetres, heldOrders, 'Available', VALUES);
        expect(secondRankScore).toBeCloseTo(Math.exp(-1) * Math.exp(-1), 12);
        const secondDistanceMetres = toMetres(1000);
        const secondHeldOrders = toCount(2);
        const thirdRankScore = rankScore(secondDistanceMetres, secondHeldOrders, 'Busy', VALUES);
        expect(thirdRankScore).toBeCloseTo(0.5 * Math.exp(-2), 12);
        const thirdDistanceMetres = toMetres(1000);
        const thirdHeldOrders = toCount(2);
        const fourthRankScore = rankScore(
            thirdDistanceMetres,
            thirdHeldOrders,
            'FreeForDelivery',
            VALUES,
        );
        expect(fourthRankScore).toBeCloseTo(2 * Math.exp(-2), 12);
    });

    it('is capped at 1', () => {
        const distanceMetres = toMetres(0);
        const heldOrders = toCount(0);
        const secondRankScore = rankScore(distanceMetres, heldOrders, 'FreeForDelivery', VALUES);
        expect(secondRankScore).toBe(1);
    });

    it('falls with distance and with held orders', () => {
        const distanceMetres = toMetres(500);
        const heldOrders = toCount(0);
        const secondRankScore = rankScore(distanceMetres, heldOrders, 'Available', VALUES);
        const secondDistanceMetres = toMetres(100);
        const secondHeldOrders = toCount(0);
        const num = rankScore(secondDistanceMetres, secondHeldOrders, 'Available', VALUES);
        expect(secondRankScore).toBeLessThan(num);
        const thirdDistanceMetres = toMetres(100);
        const thirdHeldOrders = toCount(3);
        const thirdRankScore = rankScore(
            thirdDistanceMetres,
            thirdHeldOrders,
            'Available',
            VALUES,
        );
        const fourthDistanceMetres = toMetres(100);
        const fourthHeldOrders = toCount(0);
        const fourthRankScore = rankScore(
            fourthDistanceMetres,
            fourthHeldOrders,
            'Available',
            VALUES,
        );
        expect(thirdRankScore).toBeLessThan(fourthRankScore);
    });

    it('breaks a tie the same way, in whichever order the drivers arrive', () => {
        const first = { driverId: toDriverId('a'), score: toScore(0.5) };
        const second = { driverId: toDriverId('b'), score: toScore(0.5) };

        const drivers = List.of(first, second);
        const driverIds = rankDrivers(drivers)
            .map((driver) => driver.driverId)
            .toArray();
        expect(driverIds).toEqual(['a', 'b']);
        const secondDrivers = List.of(second, first);
        const secondDriverIds = rankDrivers(secondDrivers)
            .map((driver) => driver.driverId)
            .toArray();
        expect(secondDriverIds).toEqual(['a', 'b']);
    });

    it('puts the best score first, and breaks a tie by driver ID', () => {
        const drivers = List([
            { driverId: toDriverId('c'), score: toScore(0.5) },
            { driverId: toDriverId('b'), score: toScore(0.9) },
            { driverId: toDriverId('a'), score: toScore(0.5) },
        ]);
        const ranked = rankDrivers(drivers);

        const secondRanked = ranked.map((driver) => driver.driverId).toArray();
        expect(secondRanked).toEqual(['b', 'a', 'c']);
    });
});
