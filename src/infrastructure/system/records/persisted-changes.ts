import type { List, OrderedMap } from 'immutable';

import type { IChangedKeys } from './changed-entries';
import { changedKeys, changedPlaces } from './changed-entries';

/*
 * How a saved commit holds only its change from its parent root, part by part, so a record or an
 * effect is saved once, not once for every commit that holds it (FND-81). A part the commit left
 * as it was is left out; loading applies each change to the parent's part, sharing the rest.
 */

/** A keyed collection's change: each entry set, as persisted, and each key removed. */
export interface IPersistedMapChange<TPersisted> {
    readonly set: readonly (readonly [string, TPersisted])[];
    readonly removed: readonly string[];
}

/** A list's change: the items added at its end, or, when it changed otherwise, all its items. */
export type PersistedListChange<TPersisted> =
    { readonly appended: readonly TPersisted[] } | { readonly replaced: readonly TPersisted[] };

/**
 * The parent's next entry, walked beside the child's, when it is under the same key: an ordered
 * collection keeps each key in its place when its entry is set and adds new keys at its end, so
 * the two line up without looking each key up, until the parent lost a key.
 */
function sameKeyEntry<TKey, TValue>(
    entries: Iterator<[TKey, TValue]>,
    key: TKey,
): TValue | undefined {
    const next = entries.next();
    if (next.done === true) {
        return undefined;
    }
    const [parentKey, value] = next.value;
    return parentKey === key ? value : undefined;
}

/** A keyed collection's change, as it is worked out. */
interface IMapChange<TPersisted> {
    readonly set: (readonly [string, TPersisted])[];
    readonly removed: readonly string[];
}

/** The change found by checking every entry of the child against the parent's. */
function walkedChange<TKey extends string, TValue, TPersisted>(
    parent: OrderedMap<TKey, TValue>,
    child: OrderedMap<TKey, TValue>,
    toPersisted: (value: TValue, before: TValue | undefined) => TPersisted,
): IMapChange<TPersisted> {
    const set: (readonly [string, TPersisted])[] = [];
    const parentEntries = parent.entries();
    let kept = 0;
    child.forEach((value, key) => {
        const before = sameKeyEntry(parentEntries, key) ?? parent.get(key);
        kept += before === undefined ? 0 : 1;
        if (before !== value) {
            const persisted = toPersisted(value, before);
            set.push([key, persisted]);
        }
    });
    const removed = kept === parent.size ? [] : removedKeys(parent, child);
    return { set, removed };
}

const isText = (key: unknown): key is string => typeof key === 'string';

/**
 * The change found from the keys whose places differ, skipping what the two collections share,
 * or undefined when the keys found are not text, as no key of these collections is.
 */
function foundChange<TKey extends string, TValue, TPersisted>(
    parent: OrderedMap<TKey, TValue>,
    child: OrderedMap<TKey, TValue>,
    found: IChangedKeys,
    toKey: (text: string) => TKey,
    toPersisted: (value: TValue, before: TValue | undefined) => TPersisted,
): IMapChange<TPersisted> | undefined {
    const setKeys = found.set.filter(isText);
    const replacedKeys = found.replaced.filter(isText);
    const isAllText =
        setKeys.length === found.set.length && replacedKeys.length === found.replaced.length;
    if (!isAllText) {
        return undefined;
    }
    const set: (readonly [string, TPersisted])[] = [];
    setKeys.forEach((text) => {
        const key = toKey(text);
        const value = child.get(key);
        const before = parent.get(key);
        if (value !== undefined && value !== before) {
            const persisted = toPersisted(value, before);
            set.push([key, persisted]);
        }
    });
    const removed = replacedKeys.filter((text) => {
        const key = toKey(text);
        return !child.has(key);
    });
    return { set, removed };
}

/**
 * A keyed collection's change from its parent's, or undefined when it holds the same entries.
 * Each entry is compared by reference, as an unchanged entry is the very object the parent holds,
 * and is persisted with the parent's entry beside it, so a version need not repeat what came
 * before. Only the entries in the parts the two do not share are checked, or every entry when
 * those parts cannot be found (FND-81).
 */
export function mapChange<TKey extends string, TValue, TPersisted>(
    parent: OrderedMap<TKey, TValue>,
    child: OrderedMap<TKey, TValue>,
    toKey: (text: string) => TKey,
    toPersisted: (value: TValue, before: TValue | undefined) => TPersisted,
): IPersistedMapChange<TPersisted> | undefined {
    if (parent === child) {
        return undefined;
    }
    const found = changedKeys(parent, child);
    const fromFound =
        found === undefined ? undefined : foundChange(parent, child, found, toKey, toPersisted);
    const change = fromFound ?? walkedChange(parent, child, toPersisted);
    const isSame = change.set.length === 0 && change.removed.length === 0;
    return isSame ? undefined : change;
}

/** The keys of a parent collection its child no longer holds. */
const removedKeys = <TKey extends string, TValue>(
    parent: OrderedMap<TKey, TValue>,
    child: OrderedMap<TKey, TValue>,
): readonly string[] =>
    parent
        .keySeq()
        .filter((key) => !child.has(key))
        .toArray();

/** A keyed collection with a change applied to its parent's, or the parent's when it has none. */
export function appliedMapChange<TKey extends string, TValue, TPersisted>(
    parent: OrderedMap<TKey, TValue>,
    change: IPersistedMapChange<TPersisted> | undefined,
    toKey: (text: string) => TKey,
    fromPersisted: (persisted: TPersisted, before: TValue | undefined) => TValue,
): OrderedMap<TKey, TValue> {
    if (change === undefined) {
        return parent;
    }
    return parent.withMutations((map) => {
        change.removed.forEach((text) => {
            const key = toKey(text);
            map.delete(key);
        });
        change.set.forEach(([text, persisted]) => {
            const key = toKey(text);
            const before = parent.get(key);
            const value = fromPersisted(persisted, before);
            map.set(key, value);
        });
    });
}

/**
 * Whether a list holds its parent's items, each the very same, at the start: checked only where
 * the two do not share Immutable's internal parts, or at every place when those cannot be found.
 */
function isPrefix<TValue>(parent: List<TValue>, child: List<TValue>): boolean {
    const places = changedPlaces(parent, child);
    if (places === undefined) {
        return parent.every((value, index) => child.get(index) === value);
    }
    return places.every((place) => place >= parent.size || parent.get(place) === child.get(place));
}

/** A list's change from its parent's, or undefined when it holds the same items. */
export function listChange<TValue, TPersisted>(
    parent: List<TValue>,
    child: List<TValue>,
    toPersisted: (value: TValue) => TPersisted,
): PersistedListChange<TPersisted> | undefined {
    if (parent === child) {
        return undefined;
    }
    const isGrown = child.size >= parent.size && isPrefix(parent, child);
    if (isGrown && child.size === parent.size) {
        return undefined;
    }
    if (isGrown) {
        const appended = child.skip(parent.size).map(toPersisted).toArray();
        return { appended };
    }
    const replaced = child.map(toPersisted).toArray();
    return { replaced };
}

/** A list with a change applied to its parent's, or the parent's when there is none. */
export function appliedListChange<TValue, TPersisted>(
    parent: List<TValue>,
    change: PersistedListChange<TPersisted> | undefined,
    fromPersisted: (persisted: TPersisted) => TValue,
): List<TValue> {
    if (change === undefined) {
        return parent;
    }
    if ('appended' in change) {
        const added = change.appended.map(fromPersisted);
        return parent.push(...added);
    }
    const items = change.replaced.map(fromPersisted);
    return parent.clear().push(...items);
}

/** A value's persisted form when it is not the parent's, or undefined when it is the same. */
export const valueChange = <TValue, TPersisted>(
    parent: TValue,
    child: TValue,
    toPersisted: (value: TValue) => TPersisted,
): TPersisted | undefined => (parent === child ? undefined : toPersisted(child));

/** A value from its change, or the parent's when there is none. */
export const appliedValueChange = <TValue, TPersisted>(
    parent: TValue,
    change: TPersisted | undefined,
    fromPersisted: (persisted: TPersisted) => TValue,
): TValue => (change === undefined ? parent : fromPersisted(change));

/**
 * A change without the parts left as they were, so storage keeps no empty field for each of them.
 */
export function present<TChange extends object>(change: TChange): TChange {
    const kept = { ...change };
    Object.keys(kept).forEach((key) => {
        if (Reflect.get(kept, key) === undefined) {
            Reflect.deleteProperty(kept, key);
        }
    });
    return kept;
}

/** A change without the parts left as they were, or undefined when it leaves every part alone. */
export function presentOrNone<TChange extends object>(change: TChange): TChange | undefined {
    const kept = present(change);
    return Object.keys(kept).length === 0 ? undefined : kept;
}
