import { describe, expect, it } from 'vitest';

import { Duration, toDuration } from './duration';
import { byTime, earlierOf, laterOf } from './instant';
import { instantAt } from './instant.testing';

describe('a duration', () => {
    it('is made from milliseconds or seconds, and refuses a length below 0', () => {
        const fromSeconds = Duration.ofSeconds(30);
        const fromMilliseconds = toDuration(30_000);

        const isSame = fromSeconds.equals(fromMilliseconds);
        expect(isSame).toBe(true);
        expect(() => toDuration(-1)).toThrow(RangeError);
        expect(() => toDuration(Number.NaN)).toThrow(RangeError);
    });

    it('adds, scales, and compares', () => {
        const second = toDuration(1000);
        const half = toDuration(500);
        const sum = second.plus(half);
        const scaled = second.times(2.5);

        expect(sum.milliseconds).toBe(1500);
        expect(scaled.milliseconds).toBe(2500);
        const isLongerThan = second.isLongerThan(half);
        expect(isLongerThan).toBe(true);
        const isShorterThan = half.isShorterThan(second);
        expect(isShorterThan).toBe(true);
    });

    it('knows whether it can be a job interval', () => {
        const whole = toDuration(5000);
        const part = toDuration(2.5);

        expect(whole.isWholeAndAboveNone).toBe(true);
        expect(part.isWholeAndAboveNone).toBe(false);
        expect(Duration.none.isWholeAndAboveNone).toBe(false);
    });

    it('writes itself out as its milliseconds', () => {
        const length = toDuration(250);
        const digestPart = length.digestPart();
        expect(digestPart).toBe('n250');
    });
});

describe('a moment', () => {
    const at = instantAt(1000);

    it('moves by a length of time, stopping at the start of its timeline', () => {
        const forward = toDuration(500);
        const far = toDuration(5000);
        const moved = at.plus(forward);
        const back = at.minus(far);

        expect(moved.sinceStart.milliseconds).toBe(1500);
        expect(back.sinceStart.milliseconds).toBe(0);
    });

    it('measures how long ago a moment was, counting a later one as just now', () => {
        const now = instantAt(1500);
        const earlierNow = instantAt(900);
        const age = now.since(at);
        const ahead = earlierNow.since(at);

        expect(age.milliseconds).toBe(500);
        expect(ahead.milliseconds).toBe(0);
    });

    it('compares and sorts with another moment', () => {
        const other = instantAt(2000);
        const latest = laterOf(at, other);
        const earliest = earlierOf(at, other);
        const order = byTime(at, other);

        const isBefore = at.isBefore(other);
        expect(isBefore).toBe(true);
        const isAfter = other.isAfter(at);
        expect(isAfter).toBe(true);
        expect(latest).toBe(other);
        expect(earliest).toBe(at);
        expect(order).toBeLessThan(0);
    });
});
