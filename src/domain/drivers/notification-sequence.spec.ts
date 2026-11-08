import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { MAX_NOTIFICATION_DELAY, NOTIFICATION_DELAY_LIMIT } from './drivers-rule-definitions';
import { tunedDriversRules } from './drivers-rules.testing';
import { V1_DRIVERS_RULES as VALUES } from './drivers-rules';
import type { IPastNotification } from './notification-sequence';
import { nextDriverToNotify, notificationDelayMs } from './notification-sequence';
import { toDriverId } from './driver';
import { toScore } from './numbers';
import { instantAt } from '../system/time/instant.testing';

describe('the notification sequence', () => {
    it('turns a score into a delay, which is never zero', () => {
        const score = toScore(0);
        const secondNotificationDelayMs = notificationDelayMs(score, VALUES);
        expect(secondNotificationDelayMs.milliseconds).toBe(120_000);
        const secondScore = toScore(1);
        const thirdNotificationDelayMs = notificationDelayMs(secondScore, VALUES);
        expect(thirdNotificationDelayMs.milliseconds).toBeCloseTo(120_000 * Math.exp(-5), 9);
        const thirdScore = toScore(1);
        const fourthNotificationDelayMs = notificationDelayMs(thirdScore, VALUES);
        expect(fourthNotificationDelayMs.milliseconds).toBeGreaterThan(0);
    });

    const near = { driverId: toDriverId('near'), score: toScore(0.9) };
    const farther = { driverId: toDriverId('farther'), score: toScore(0.4) };
    /** A score whose delay is over 60 seconds. */
    const tooLow = { driverId: toDriverId('low'), score: toScore(0.1) };
    const sent = (driverId: string, at: number, isOutstanding = true): IPastNotification => ({
        driverId: toDriverId(driverId),
        at: instantAt(at),
        isOutstanding,
    });

    it('sends the first notification at once, to the best-ranked driver', () => {
        const past = List([]);
        const eligible = List([farther, near]);
        const now = instantAt(0);
        const driverId = nextDriverToNotify(past, eligible, now, VALUES);
        expect(driverId).toBe('near');
    });

    it('sends the first notification even when its delay would be long', () => {
        const past = List([]);
        const eligible = List([tooLow]);
        const now = instantAt(0);
        const driverId = nextDriverToNotify(past, eligible, now, VALUES);
        expect(driverId).toBe('low');
    });

    it('sends nothing when no driver is eligible', () => {
        const past = List([]);
        const eligible = List([]);
        const now = instantAt(0);
        const driverId = nextDriverToNotify(past, eligible, now, VALUES);
        expect(driverId).toBeNull();
    });

    it("waits for the previous notification's time plus the next driver's delay", () => {
        const score = toScore(farther.score);
        const delay = notificationDelayMs(score, VALUES);
        const pastNotification = sent('near', 1000);
        const past = List.of(pastNotification);

        const eligible = List([near, farther]);
        const now = instantAt(1000 + delay.milliseconds - 1);
        const driverId = nextDriverToNotify(past, eligible, now, VALUES);
        expect(driverId).toBeNull();
        const secondEligible = List([near, farther]);
        const secondNow = instantAt(1000 + delay.milliseconds);
        const secondDriverId = nextDriverToNotify(past, secondEligible, secondNow, VALUES);
        expect(secondDriverId).toBe('farther');
    });

    it('measures from the latest notification', () => {
        const score = toScore(farther.score);
        const delay = notificationDelayMs(score, VALUES);
        const pastNotification = sent('x', 5000);
        const secondPastNotification = sent('y', 1000);
        const past = List.of(pastNotification, secondPastNotification);

        const eligible = List([farther]);
        const now = instantAt(1000 + delay.milliseconds);
        const driverId = nextDriverToNotify(past, eligible, now, VALUES);
        expect(driverId).toBeNull();
        const secondEligible = List([farther]);
        const secondNow = instantAt(5000 + delay.milliseconds);
        const secondDriverId = nextDriverToNotify(past, secondEligible, secondNow, VALUES);
        expect(secondDriverId).toBe('farther');
    });

    it('never notifies a driver twice, even after an ignore', () => {
        const past = List([sent('near', 0)]);
        const eligible = List([near]);
        const now = instantAt(999_999);
        const driverId = nextDriverToNotify(past, eligible, now, VALUES);
        expect(driverId).toBeNull();
        const pastNotifications = List([sent('near', 0, false)]);
        const secondEligible = List([near]);
        const secondNow = instantAt(999_999);
        const secondDriverId = nextDriverToNotify(
            pastNotifications,
            secondEligible,
            secondNow,
            VALUES,
        );
        expect(secondDriverId).toBeNull();
    });

    it('skips nobody: a lower-ranked driver never overtakes a better one that is not due', () => {
        const better = { driverId: toDriverId('better'), score: toScore(0.2) };
        const score = toScore(better.score);
        const delay = notificationDelayMs(score, VALUES);

        expect(delay.milliseconds).toBeLessThan(60_000);
        const past = List([sent('x', 0)]);
        const eligible = List([better, { driverId: toDriverId('worse'), score: toScore(0.19) }]);
        const now = instantAt(delay.milliseconds - 1);
        const driverId = nextDriverToNotify(past, eligible, now, VALUES);
        expect(driverId).toBeNull();
    });

    it('never notifies a driver whose delay is over 60 seconds', () => {
        const score = toScore(tooLow.score);
        const secondNotificationDelayMs = notificationDelayMs(score, VALUES);
        expect(secondNotificationDelayMs.milliseconds).toBeGreaterThan(60_000);
        const past = List([sent('x', 0)]);
        const eligible = List([tooLow]);
        const now = instantAt(999_999);
        const driverId = nextDriverToNotify(past, eligible, now, VALUES);
        expect(driverId).toBeNull();
    });

    it('gives this score a delay of exactly 60 seconds', () => {
        const score = toScore(Math.log(2) / 5);
        const secondNotificationDelayMs = notificationDelayMs(score, VALUES);
        expect(secondNotificationDelayMs.milliseconds).toBeCloseTo(60_000, 6);
    });

    it('allows a delay of exactly 60 seconds', () => {
        const exact = Math.log(2) / 5;
        const score = toScore(exact);
        const delay = notificationDelayMs(score, VALUES);
        const values = tunedDriversRules(
            VALUES,
            NOTIFICATION_DELAY_LIMIT,
            MAX_NOTIFICATION_DELAY,
            delay.milliseconds,
        );

        const past = List([sent('x', 0)]);
        const eligible = List([{ driverId: toDriverId('edge'), score: toScore(exact) }]);
        const now = instantAt(60_001);
        const driverId = nextDriverToNotify(past, eligible, now, values);
        expect(driverId).toBe('edge');
    });

    it('sends nothing while 5 drivers hold an unanswered notification', () => {
        const five = List(['a', 'b', 'c', 'd', 'e']).map((id) => sent(id, 0));

        const eligible = List([near]);
        const now = instantAt(999_999);
        const driverId = nextDriverToNotify(five, eligible, now, VALUES);
        expect(driverId).toBeNull();
    });

    it('frees a slot when a driver ignores', () => {
        const pastNotification = sent('e', 0, false);
        const five = List(['a', 'b', 'c', 'd'])
            .map((id) => sent(id, 0))
            .push(pastNotification);

        const eligible = List([near]);
        const now = instantAt(999_999);
        const driverId = nextDriverToNotify(five, eligible, now, VALUES);
        expect(driverId).toBe('near');
    });
});
