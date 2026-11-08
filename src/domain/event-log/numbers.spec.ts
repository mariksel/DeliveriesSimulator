import { describe, expect, it } from 'vitest';

import { toLogSequence } from './numbers';

describe("the event log's numbers", () => {
    it.each<[string, (value: number) => number, readonly number[], readonly number[]]>([
        ['a log sequence', toLogSequence, [0, 3], [-1, 0.5]],
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
