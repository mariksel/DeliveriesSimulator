import { describe, expect, it } from 'vitest';

import { toFactor, toScore } from './numbers';

describe("the driver rules' numbers", () => {
    it.each<[string, (value: number) => number, readonly number[], readonly number[]]>([
        ['a multiplier', toFactor, [-1, 0, 2.5], [Number.NaN, Number.POSITIVE_INFINITY]],
        ['a score', toScore, [-1, 0, 0.9], [Number.NaN, Number.POSITIVE_INFINITY]],
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
