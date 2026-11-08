import { describe, expect, it } from 'vitest';

import { nextVersionNumber, toVersionNumber } from './version-chain';

describe('a version number', () => {
    it.each<[string, (value: number) => number, readonly number[], readonly number[]]>([
        ['a version number', toVersionNumber, [1, 2], [0, -1, 1.5]],
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

    it('moves on to the next version', () => {
        const first = toVersionNumber(1);
        const version = nextVersionNumber(first);
        expect(version).toBe(2);
    });
});
