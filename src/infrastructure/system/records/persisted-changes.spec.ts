import { List, OrderedMap, Range } from 'immutable';
import { describe, expect, it } from 'vitest';

import {
    appliedListChange,
    appliedMapChange,
    appliedValueChange,
    listChange,
    mapChange,
    present,
    presentOrNone,
    valueChange,
} from './persisted-changes';

/** A value held by reference, as a record is. */
interface IBox {
    readonly n: number;
}

const box = (n: number): IBox => ({ n });
const toPlain = (value: IBox): number => value.n;
const fromPlain = (n: number): IBox => box(n);
const toKey = (text: string): string => text;

const ONE = box(1);
const NEW_ENTRIES = Range(0, 1200)
    .map((n): [string, IBox] => [`n${n}`, box(n)])
    .toArray();
const TWO = box(2);
const THREE = box(3);
const FIVE = box(5);
const PARENT = OrderedMap<string, IBox>([
    ['a', ONE],
    ['b', TWO],
]);

describe('a keyed collection saved as its change', () => {
    it('saves nothing for the same collection, or one with the very same entries', () => {
        const rebuilt = OrderedMap<string, IBox>([
            ['a', ONE],
            ['b', TWO],
        ]);

        const same = mapChange(PARENT, PARENT, toKey, toPlain);
        const sameEntries = mapChange(PARENT, rebuilt, toKey, toPlain);

        expect([same, sameEntries]).toEqual([undefined, undefined]);
    });

    it('saves each entry set and each key removed, and applies them to the parent', () => {
        const child = PARENT.delete('a').set('b', FIVE).set('c', THREE);

        const change = mapChange(PARENT, child, toKey, toPlain);
        const applied = appliedMapChange(PARENT, change, toKey, fromPlain);

        expect(change).toEqual({
            set: [
                ['b', 5],
                ['c', 3],
            ],
            removed: ['a'],
        });
        expect(applied).toEqual(child);
    });

    it("hands each entry's mapping the parent's entry under its key", () => {
        const child = PARENT.set('b', FIVE).set('c', THREE);
        const seen: (IBox | undefined)[] = [];

        mapChange(PARENT, child, toKey, (value, before) => {
            seen.push(before);
            return value.n;
        });

        expect(seen).toEqual([TWO, undefined]);
    });

    it('gives back the parent itself when there is no change', () => {
        const applied = appliedMapChange(PARENT, undefined, toKey, fromPlain);

        expect(applied).toBe(PARENT);
    });
});

describe('a list saved as its change', () => {
    const parent = List([ONE, TWO]);

    it('saves nothing for the same list, or one with the very same items', () => {
        const rebuilt = List([ONE, TWO]);

        const same = listChange(parent, parent, toPlain);
        const sameItems = listChange(parent, rebuilt, toPlain);

        expect([same, sameItems]).toEqual([undefined, undefined]);
    });

    it('saves only the items added at its end', () => {
        const child = parent.push(THREE);

        const change = listChange(parent, child, toPlain);
        const applied = appliedListChange(parent, change, fromPlain);

        expect(change).toEqual({ appended: [3] });
        expect(applied).toEqual(child);
    });

    it('saves every item when the list changed otherwise', () => {
        const child = List([TWO]);

        const change = listChange(parent, child, toPlain);
        const applied = appliedListChange(parent, change, fromPlain);

        expect(change).toEqual({ replaced: [2] });
        expect(applied).toEqual(child);
    });

    it('gives back the parent itself when there is no change', () => {
        const applied = appliedListChange(parent, undefined, fromPlain);

        expect(applied).toBe(parent);
    });
});

describe('a large collection saved as its change', () => {
    const items = Range(0, 2000)
        .map((n) => box(n))
        .toList();
    /** Under a thousand entries, so adding many more grows another level of its parts. */
    const entries = items.take(1000).map((item): [string, IBox] => [`k${item.n}`, item]);
    const large = OrderedMap<string, IBox>(entries);

    it('saves only the items added to a list that grew past its last group of 32', () => {
        const grown = items.push(THREE, FIVE, THREE, FIVE, THREE);

        const change = listChange(items, grown, toPlain);

        expect(change).toEqual({ appended: [3, 5, 3, 5, 3] });
    });

    it('saves only the items added to a list that grew another level of its parts', () => {
        const full = items.take(1024);
        const grown = full.push(THREE);

        const change = listChange(full, grown, toPlain);

        expect(change).toEqual({ appended: [3] });
    });

    it('saves every item of a list changed far from its end', () => {
        const child = items.set(10, THREE);

        const change = listChange(items, child, toPlain);
        const applied = appliedListChange(items, change, fromPlain);

        expect(change).toHaveProperty('replaced');
        expect(applied).toEqual(child);
    });

    it.each<[string, (map: OrderedMap<string, IBox>) => OrderedMap<string, IBox>]>([
        [
            'entries set, added, and removed',
            (map): OrderedMap<string, IBox> =>
                map.set('k7', FIVE).set('new', THREE).delete('k500'),
        ],
        [
            'many entries removed, so the collection is packed again',
            (map): OrderedMap<string, IBox> => map.filter((_value, key) => key < 'k2'),
        ],
        [
            'entries added past another level of its parts',
            (map): OrderedMap<string, IBox> => map.merge(NEW_ENTRIES),
        ],
        [
            'an entry removed and entries added past another level of its parts',
            (map): OrderedMap<string, IBox> => map.delete('k3').merge(NEW_ENTRIES),
        ],
    ])('saves the same change however it is found, for %s', (_name, make) => {
        const child = make(large);

        const change = mapChange(large, child, toKey, toPlain);
        const applied = appliedMapChange(large, change, toKey, fromPlain);

        expect(applied).toEqual(child);
    });
});

describe('a value saved as its change', () => {
    it('saves a value only when it is not the parent', () => {
        const same = valueChange(ONE, ONE, toPlain);
        const other = valueChange(ONE, TWO, toPlain);

        expect([same, other]).toEqual([undefined, 2]);
    });

    it("loads the parent's own value when there is no change", () => {
        const kept = appliedValueChange(ONE, undefined, fromPlain);
        const changed = appliedValueChange(ONE, 4, fromPlain);

        expect(kept).toBe(ONE);
        expect(changed).toEqual({ n: 4 });
    });
});

describe('the parts of a change kept in storage', () => {
    it('leaves out each part that is unchanged, keeping a falsy part that changed', () => {
        const change = { a: undefined, b: 0, c: null };

        const kept = present(change);

        const keys = Object.keys(kept);
        expect(keys).toEqual(['b', 'c']);
    });

    it('is no change at all when every part is unchanged', () => {
        const none = presentOrNone({ a: undefined });
        const some = presentOrNone({ a: undefined, b: 1 });

        expect(none).toBeUndefined();
        expect(some).toEqual({ b: 1 });
    });
});
