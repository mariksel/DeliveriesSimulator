import { List } from 'immutable';
import type { OrderedMap } from 'immutable';

/*
 * Finding where a List or an OrderedMap differs from the one it was made from, at about the cost
 * of what changed rather than of its size (FND-81). An Immutable change copies only the internal
 * nodes on the way to what it touched and shares the rest, but the public API reaches entries one
 * by one, so this reads the private fields of Immutable 5: a List is a tree of nodes 32 wide with
 * its last entries in a tail node, and an OrderedMap keeps its entries, in order, in a List. A
 * node the two share holds the same entries, so it is skipped whole. When the fields are not the
 * shape expected, nothing is found and the caller checks each entry instead.
 */

/** How many bits of an entry's place each level of a List's tree takes. */
const SHIFT = 5;
/** How many entries or nodes one node holds. */
const WIDTH = 1 << SHIFT;

/** One node of a List's tree: its entries at the lowest level, or the nodes below it. */
interface ITrieNode {
    readonly array: readonly unknown[];
}

/** The private parts of a List that the search reads. */
interface IEntryTree {
    readonly list: List<unknown>;
    readonly level: number;
    readonly root: unknown;
    readonly tail: unknown;
    readonly tailOffset: number;
}

/** The keys of the entries a collection set, and the keys of the parent's it replaced. */
export interface IChangedKeys {
    /** Each key whose entry is new or set again, in the collection's order. */
    readonly set: readonly unknown[];
    /** Each key of the parent's whose place now holds another entry, or none. */
    readonly replaced: readonly unknown[];
}

function isTrieNode(value: unknown): value is ITrieNode {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const array: unknown = Reflect.get(value, 'array');
    return Array.isArray(array);
}

const isNodeOrNone = (value: unknown): boolean => value === undefined || isTrieNode(value);

/** Where a List of a given capacity starts its tail: the start of its last group of 32. */
const tailOffsetOf = (capacity: number): number =>
    capacity < WIDTH ? 0 : ((capacity - 1) >>> SHIFT) << SHIFT;

/** A List's tree, if its private fields are the shape this reads. */
function entryTreeOf(list: unknown): IEntryTree | undefined {
    if (!List.isList(list)) {
        return undefined;
    }
    const origin: unknown = Reflect.get(list, '_origin');
    const level: unknown = Reflect.get(list, '_level');
    const capacity: unknown = Reflect.get(list, '_capacity');
    const root: unknown = Reflect.get(list, '_root');
    const tail: unknown = Reflect.get(list, '_tail');
    const isKnown =
        origin === 0 &&
        typeof level === 'number' &&
        typeof capacity === 'number' &&
        isNodeOrNone(root) &&
        isNodeOrNone(tail);
    if (!isKnown) {
        return undefined;
    }
    return { list, level, root, tail, tailOffset: tailOffsetOf(capacity) };
}

const childrenOf = (node: unknown): readonly unknown[] => (isTrieNode(node) ? node.array : []);

/** Adds the place of each entry two nodes at a level hold differently, skipping shared nodes. */
function addChangedPlaces(
    before: unknown,
    after: unknown,
    level: number,
    offset: number,
    places: number[],
): void {
    if (before === after) {
        return;
    }
    const beforeChildren = childrenOf(before);
    const afterChildren = childrenOf(after);
    for (let index = 0; index < WIDTH; index += 1) {
        const beforeChild = beforeChildren[index];
        const afterChild = afterChildren[index];
        if (level === 0 && beforeChild !== afterChild) {
            places.push(offset + index);
        } else if (level > 0) {
            const childOffset = offset + index * (1 << level);
            addChangedPlaces(beforeChild, afterChild, level - SHIFT, childOffset, places);
        }
    }
}

/** Every place from one to before another. */
const placesBetween = (from: number, to: number): readonly number[] =>
    Array.from({ length: Math.max(0, to - from) }, (_unused, index) => from + index);

/**
 * The places in the tails, or past them, where the two Lists may differ, with every place one
 * List has and the other does not.
 */
function tailPlaces(before: IEntryTree, after: IEntryTree): readonly number[] {
    const shorter = Math.min(before.list.size, after.list.size);
    const longer = Math.max(before.list.size, after.list.size);
    const pastShorter = placesBetween(shorter, longer);
    if (before.tailOffset === after.tailOffset) {
        const places: number[] = [];
        addChangedPlaces(before.tail, after.tail, 0, after.tailOffset, places);
        return [...places, ...pastShorter];
    }
    const from = Math.min(before.tailOffset, after.tailOffset);
    return placesBetween(from, longer);
}

/**
 * The places where two Lists may differ, in order, found by skipping what they share, or
 * undefined when Immutable's private fields are not the shape this reads. Each place found holds
 * another item in each List, or an item in one only; the rest hold the very same item.
 */
function placesIn(before: IEntryTree, after: IEntryTree): readonly number[] | undefined {
    if (before.level !== after.level) {
        return undefined;
    }
    const places: number[] = [];
    addChangedPlaces(before.root, after.root, before.level, 0, places);
    const inTails = tailPlaces(before, after);
    const everyPlace = new Set([...places, ...inTails]);
    return [...everyPlace].sort((left, right) => left - right);
}

/**
 * The places, in order, where a List may differ from its parent, found by skipping what the two
 * share, or undefined when Immutable's private fields are not the shape this reads. Every other
 * place holds the very same item.
 */
export function changedPlaces(
    parent: List<unknown>,
    child: List<unknown>,
): readonly number[] | undefined {
    const before = entryTreeOf(parent);
    const after = entryTreeOf(child);
    return before === undefined || after === undefined ? undefined : placesIn(before, after);
}

/** The key of an entry of an OrderedMap's List, which is a key and value pair, or none. */
const keyOf = (entry: unknown): unknown => (Array.isArray(entry) ? entry[0] : undefined);

/**
 * The keys a collection set and the parent's keys it replaced, found by skipping what the two
 * share, or undefined when Immutable's private fields are not the shape this reads. A key in
 * both lists was set again in its place.
 */
export function changedKeys(
    parent: OrderedMap<unknown, unknown>,
    child: OrderedMap<unknown, unknown>,
): IChangedKeys | undefined {
    const parentList: unknown = Reflect.get(parent, '_list');
    const childList: unknown = Reflect.get(child, '_list');
    const before = entryTreeOf(parentList);
    const after = entryTreeOf(childList);
    const places =
        before === undefined || after === undefined ? undefined : placesIn(before, after);
    if (before === undefined || after === undefined || places === undefined) {
        return undefined;
    }
    const set: unknown[] = [];
    const replaced: unknown[] = [];
    places.forEach((place) => {
        const was = before.list.get(place);
        const now = after.list.get(place);
        if (was === now) {
            return;
        }
        if (now !== undefined) {
            const key = keyOf(now);
            set.push(key);
        }
        if (was !== undefined) {
            const key = keyOf(was);
            replaced.push(key);
        }
    });
    return { set, replaced };
}
