import { describe, expect, it } from 'vitest';

import { toRandomWord, toSeed, toSpeedMultiple, toWallTime } from './numbers';

const MAX_WORD = 4294967295;

describe("the simulation engine's numbers", () => {
    it.each<[string, (value: number) => number, readonly number[], readonly number[]]>([
        ['a wall time', toWallTime, [-1, 0, 16.6], [Number.NaN, Number.POSITIVE_INFINITY]],
        ['a seed', toSeed, [0, 1, MAX_WORD], [-1, 0.5, MAX_WORD + 1]],
        ['a random word', toRandomWord, [0, MAX_WORD], [-1, 0.5, MAX_WORD + 1]],
        ['a clock speed', toSpeedMultiple, [0.5, 1, 600], [0, -1, Number.NaN]],
    ])(
        'make %s from a valid number, and refuse an invalid one',
        (_name, create, valid, invalid) => {
            const made = valid.map(create);
            expect(made).toEqual(valid);
            invalid.forEach((value) => {
                expect(() => create(value)).toThrow(RangeError);
            });
        },
    );
});
