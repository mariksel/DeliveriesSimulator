import { describe, expect, it } from 'vitest';

import {
    minusOne,
    nextPosition,
    NO_COUNT,
    plus,
    plusOne,
    toCount,
    toFraction,
    toPosition,
} from './math';

describe('the math types', () => {
    it.each<[string, (value: number) => number, readonly number[], readonly number[]]>([
        ['a count', toCount, [0, 1, 9], [-1, 1.5, Number.NaN]],
        ['a position', toPosition, [0, 3], [-1, 0.5]],
        ['a fraction', toFraction, [0, 0.5, 0.999], [-0.1, 1, Number.NaN]],
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

    it('counts one at a time, and never below none', () => {
        const one = plusOne(NO_COUNT);
        const more = toCount(2);
        const three = plus(one, more);
        const none = minusOne(one);
        const start = toPosition(0);
        const position = nextPosition(start);

        expect(three).toBe(3);
        expect(none).toBe(0);
        expect(position).toBe(1);
        expect(() => minusOne(NO_COUNT)).toThrow(RangeError);
    });
});
