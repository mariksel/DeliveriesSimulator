import type { List } from 'immutable';
import { OrderedMap, Range } from 'immutable';
import { describe, expect, it } from 'vitest';

import { changedKeys, changedPlaces } from './changed-entries';

/** A value held by reference, as a record is. */
interface IBox {
    readonly n: number;
}

/** A list of boxes, each its own object, numbered from 0. */
const boxes = (size: number): List<IBox> =>
    Range(0, size)
        .map((n) => ({ n }))
        .toList();

/** The places where two lists hold another item, or an item in one only, found by checking all. */
function differences(parent: List<unknown>, child: List<unknown>): readonly number[] {
    const size = Math.max(parent.size, child.size);
    const found: number[] = [];
    for (let place = 0; place < size; place += 1) {
        if (parent.get(place) !== child.get(place)) {
            found.push(place);
        }
    }
    return found;
}

/** Whether every place in one list is in the other. */
const isWithin = (some: readonly number[], all: readonly number[] | undefined): boolean =>
    all !== undefined && some.every((place) => all.includes(place));

const BIG = boxes(2000);
const NEW = { n: -1 };

describe('finding where a list differs from its parent', () => {
    it.each<[string, () => List<IBox>]>([
        ['the same list', (): List<IBox> => BIG],
        ['one item set', (): List<IBox> => BIG.set(700, NEW)],
        ['one item added', (): List<IBox> => BIG.push(NEW)],
        ['items added past its last group of 32', (): List<IBox> => BIG.push(NEW, NEW, NEW, NEW)],
        ['its last item removed', (): List<IBox> => BIG.pop()],
        [
            'items set in many places',
            (): List<IBox> => BIG.set(3, NEW).set(1500, NEW).set(1999, NEW),
        ],
    ])('finds every place that differs, and few others, for %s', (_name, make) => {
        const child = make();

        const places = changedPlaces(BIG, child);
        const real = differences(BIG, child);

        const isFound = isWithin(real, places);
        expect(isFound).toBe(true);
        expect(places?.length).toBeLessThanOrEqual(real.length + 2 * 32);
    });

    it('finds nothing to skip when the list grew another level of its tree', () => {
        const full = boxes(1024);
        const grown = full.push(NEW);

        const places = changedPlaces(full, grown);

        expect(places).toBeUndefined();
    });

    it('finds nothing to skip when a list does not start at the start of its tree', () => {
        const shifted = BIG.shift();
        const pushed = shifted.push(NEW);

        const places = changedPlaces(shifted, pushed);

        expect(places).toBeUndefined();
    });
});

describe('finding the keys a collection set or replaced', () => {
    const entries = BIG.map((item): [string, IBox] => [`k${item.n}`, item]);
    const parent = OrderedMap<string, IBox>(entries);

    it('finds a key set again, a key added, and a key removed', () => {
        const child = parent.set('k5', NEW).set('new', NEW).delete('k900');

        const found = changedKeys(parent, child);

        expect(found?.set).toEqual(['k5', 'new']);
        expect(found?.replaced).toEqual(['k5', 'k900']);
    });

    it('finds nothing in a collection with the same entries', () => {
        const found = changedKeys(parent, parent);

        expect(found).toEqual({ set: [], replaced: [] });
    });

    it('finds nothing to skip in what is not an ordered collection of Immutable 5', () => {
        const plain = OrderedMap<string, IBox>([['a', NEW]]);
        Reflect.set(plain, '_list', []);

        const found = changedKeys(plain, parent);

        expect(found).toBeUndefined();
    });
});
