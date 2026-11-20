import { List, OrderedMap } from 'immutable';
import { describe, expect, it } from 'vitest';

import { isSameValue } from './same-value';

/** A value class, as the run's records are, compared by its fields. */
class Point {
    constructor(
        readonly x: number,
        readonly y: number,
    ) {}
}

/** Another class with the same fields, which is not the same kind of value. */
class OtherPoint {
    constructor(
        readonly x: number,
        readonly y: number,
    ) {}
}

describe('whether two values are the same', () => {
    it.each<[string, unknown, unknown, boolean]>([
        ['the very same object', List([1]), null, true],
        ['equal numbers and texts', 'a', 'a', true],
        ['objects of one class with equal fields', new Point(1, 2), new Point(1, 2), true],
        [
            'objects of one class with a field that differs',
            new Point(1, 2),
            new Point(1, 3),
            false,
        ],
        ['objects of two classes with equal fields', new Point(1, 2), new OtherPoint(1, 2), false],
        ['objects with other fields', { a: 1 }, { a: 1, b: 2 }, false],
        [
            'lists with equal items, made apart',
            List([new Point(1, 2)]),
            List([new Point(1, 2)]),
            true,
        ],
        ['lists of different sizes', List([1]), List([1, 2]), false],
        [
            'maps with the same entries in another order',
            OrderedMap([
                ['a', 1],
                ['b', 2],
            ]),
            OrderedMap([
                ['b', 2],
                ['a', 1],
            ]),
            false,
        ],
        ['a collection and a plain object', List([1]), { 0: 1 }, false],
        ['a value and nothing', new Point(1, 2), null, false],
        ['two arrays with equal items', [1, [2]], [1, [2]], true],
    ])('says so for %s', (name, left, right, isExpected) => {
        const other = name === 'the very same object' ? left : right;

        const isSame = isSameValue(left, other);

        expect(isSame).toBe(isExpected);
    });
});
