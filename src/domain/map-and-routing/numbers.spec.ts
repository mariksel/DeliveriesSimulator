import { describe, expect, it } from 'vitest';

import { toDegrees, toKilometres, toMetres } from './numbers';

describe("map and routing's numbers", () => {
    it.each<[string, (value: number) => number, readonly number[], readonly number[]]>([
        ['a distance', toMetres, [-5, 0, 500.1], [Number.NaN, Number.POSITIVE_INFINITY]],
        ['an angle', toDegrees, [-90, 0, 180], [Number.NaN, Number.NEGATIVE_INFINITY]],
        [
            'a distance in kilometres',
            toKilometres,
            [-1, 0, 2.5],
            [Number.NaN, Number.POSITIVE_INFINITY],
        ],
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
