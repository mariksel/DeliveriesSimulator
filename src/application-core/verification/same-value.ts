import { isImmutable } from 'immutable';
import type { Collection } from 'immutable';

/*
 * Whether two values are the same, field by field, as a snapshot test compares a root worked out
 * again with the one stored (FND-81). A part the two share is the very same object, so it is
 * equal at once; only the parts a call made again are compared value by value. Immutable
 * collections are compared entry by entry, in order, as their order shows in what a run does.
 */

type AnyCollection = Collection<unknown, unknown>;

const isCollection = (value: unknown): value is AnyCollection => isImmutable(value);

/** Whether two Immutable collections hold the same entries, in the same order. */
function isSameCollection(left: AnyCollection, right: AnyCollection): boolean {
    if (left.count() !== right.count()) {
        return false;
    }
    const rightEntries = right.entrySeq().toArray();
    return left
        .entrySeq()
        .toArray()
        .every(([key, value], index) => {
            const other = rightEntries[index];
            return (
                other !== undefined && isSameValue(key, other[0]) && isSameValue(value, other[1])
            );
        });
}

/** Whether two objects of the same kind hold the same value in each of their own fields. */
function isSameObject(left: object, right: object): boolean {
    if (Object.getPrototypeOf(left) !== Object.getPrototypeOf(right)) {
        return false;
    }
    const keys = Object.keys(left);
    const otherKeys = Object.keys(right);
    if (keys.length !== otherKeys.length) {
        return false;
    }
    return keys.every((key) => {
        const value: unknown = Reflect.get(left, key);
        const other: unknown = Reflect.get(right, key);
        return isSameValue(value, other);
    });
}

/** Whether two values are the same: the very same, or the same field by field. */
export function isSameValue(left: unknown, right: unknown): boolean {
    if (Object.is(left, right)) {
        return true;
    }
    if (isCollection(left) || isCollection(right)) {
        return isCollection(left) && isCollection(right) && isSameCollection(left, right);
    }
    const isObjects =
        typeof left === 'object' && left !== null && typeof right === 'object' && right !== null;
    return isObjects && isSameObject(left, right);
}
