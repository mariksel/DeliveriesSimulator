import { describe, expect, it } from 'vitest';

import { formatClockTime, parseClockTime } from './clock-time';

describe('parseClockTime', () => {
    it.each<[string, number]>([
        ['h00:m00:s00:ms00', 0],
        ['h00:m05:s00:ms00', 300_000],
        ['h01:m00:s00:ms00', 3_600_000],
        ['h00:m00:s01:ms00', 1000],
        ['h00:m00:s00:ms05', 5],
        ['h00:m00:s00:ms500', 500],
        ['h00:m00:s00:ms999', 999],
        ['h01:m02:s03:ms04', 3_723_004],
        ['h100:m00:s00:ms00', 360_000_000],
    ])('reads %s', (text, time) => {
        const clockTime = parseClockTime(text);
        expect(clockTime).toBe(time);
    });

    it.each([
        '',
        '00:05:00',
        'h00:m05:s00',
        'h0:m05:s00:ms00',
        'h00:m5:s00:ms00',
        'h00:m60:s00:ms00',
        'h00:m00:s60:ms00',
        'h00:m00:s00:ms0',
        'h00:m00:s00:ms1000',
        'H00:M05:S00:MS00',
        'h00:m05:s00:ms00 ',
        ' h00:m05:s00:ms00',
        'h-1:m00:s00:ms00',
        'h99999999999999:m00:s00:ms00',
    ])('refuses "%s"', (text) => {
        const clockTime = parseClockTime(text);
        expect(clockTime).toBeNull();
    });
});

describe('formatClockTime', () => {
    it.each<[number, string]>([
        [0, 'h00:m00:s00:ms00'],
        [300_000, 'h00:m05:s00:ms00'],
        [5, 'h00:m00:s00:ms05'],
        [500, 'h00:m00:s00:ms500'],
        [3_723_004, 'h01:m02:s03:ms04'],
        [360_000_000, 'h100:m00:s00:ms00'],
    ])('writes %i', (time, text) => {
        const secondFormatClockTime = formatClockTime(time);
        expect(secondFormatClockTime).toBe(text);
    });

    it.each([0, 1, 59_999, 60_000, 3_599_999, 86_400_000])(
        'gives back %i when read again',
        (time) => {
            const secondFormatClockTime = formatClockTime(time);
            const clockTime = parseClockTime(secondFormatClockTime);
            expect(clockTime).toBe(time);
        },
    );
});
