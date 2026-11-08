import { describe, expect, it } from 'vitest';

import { toDuration } from '../system/time/duration';
import { instantAt } from '../system/time/instant.testing';
import { RUN_START, SimTime, toSimTime } from './sim-time';

describe('a simulated time', () => {
    it('is a finite number of milliseconds from the run start', () => {
        const at = toSimTime(1000);

        expect(at.milliseconds).toBe(1000);
        const time = toSimTime(0);
        expect(time).toBe(RUN_START);
        expect(() => toSimTime(-1)).toThrow(RangeError);
        expect(() => toSimTime(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    });

    it('moves and compares as the business expects of any moment', () => {
        const at = toSimTime(1000);
        const forward = toDuration(500);
        const far = toDuration(5000);
        const moved = at.plus(forward);
        const back = at.minus(far);
        const other = instantAt(1000);

        expect(moved).toBeInstanceOf(SimTime);
        expect(moved.milliseconds).toBe(1500);
        expect(back).toBe(RUN_START);
        const isSame = at.equals(other);
        expect(isSame).toBe(true);
        const isAfter = moved.isAfter(other);
        expect(isAfter).toBe(true);
    });

    it('is the only moment a run takes from the business', () => {
        const at = toSimTime(250);
        const other = instantAt(250);

        const from = SimTime.from(at);
        expect(from).toBe(at);
        expect(() => SimTime.from(other)).toThrow(TypeError);
    });

    it('writes itself out as a plain number did, so digests do not change', () => {
        const at = toSimTime(250);
        const digestPart = at.digestPart();
        expect(digestPart).toBe('n250');
    });
});
