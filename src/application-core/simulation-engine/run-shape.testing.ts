import { List, OrderedMap } from 'immutable';

import type { IRunState } from './run-state';

function encode(value: unknown): unknown {
    if (List.isList(value)) {
        return { $list: value.toArray().map(encode) };
    }
    if (OrderedMap.isOrderedMap(value)) {
        const entries = value
            .entrySeq()
            .toArray()
            .map(([key, item]: readonly [unknown, unknown]) => [String(key), encode(item)]);
        return { $orderedMap: entries };
    }
    if (typeof value === 'function') {
        return { $function: value.name };
    }
    if (Array.isArray(value)) {
        return value.map(encode);
    }
    if (typeof value === 'object' && value !== null) {
        const fields = Object.entries(value).map(([key, item]) => [key, encode(item)]);
        return Object.fromEntries(fields);
    }
    return value;
}

/**
 * A run's whole state as plain arrays and objects, keeping the order of every collection, so tests
 * can compare two states exactly with a deep comparison. It is for comparing only: runs are saved
 * through the repository.
 */
export const runShape = (state: IRunState): unknown => encode(state);
