import type { List } from 'immutable';
import { List as ImmutableList, OrderedMap } from 'immutable';
import type { Count } from '../../../domain/system/math/math';
import { toCount } from '../../../domain/system/math/math';

/** The persisted records of one key, such as one order's events. */
export interface IPersistedGroup<TRecord> {
    readonly key: string;
    readonly records: readonly TRecord[];
}

/** Records grouped by a key, persisted with each group in order. */
export const toPersistedGroups = <TKey extends string, TRecord, TPersisted>(
    groups: OrderedMap<TKey, List<TRecord>>,
    persist: (record: TRecord) => TPersisted,
): readonly IPersistedGroup<TPersisted>[] =>
    groups
        .entrySeq()
        .map(([key, records]) => ({ key, records: records.map(persist).toArray() }))
        .toArray();

/** Records grouped by a key, from their persisted form. */
export function fromPersistedGroups<TKey extends string, TRecord, TPersisted>(
    groups: readonly IPersistedGroup<TPersisted>[],
    toKey: (key: string) => TKey,
    restore: (record: TPersisted) => TRecord,
): OrderedMap<TKey, List<TRecord>> {
    const entries = groups.map((group): [TKey, List<TRecord>] => {
        const records = group.records.map(restore);
        return [toKey(group.key), ImmutableList(records)];
    });
    return OrderedMap(entries);
}

/** One persisted count for a key, such as how many orders a driver holds. */
export interface IPersistedCount {
    readonly key: string;
    readonly count: number;
}

/** Counts by key, persisted in order. */
export const toPersistedCounts = <TKey extends string>(
    counts: OrderedMap<TKey, Count>,
): readonly IPersistedCount[] =>
    counts
        .entrySeq()
        .map(([key, count]) => ({ key, count }))
        .toArray();

/** Counts by key, from their persisted form. */
export function fromPersistedCounts<TKey extends string>(
    counts: readonly IPersistedCount[],
    toKey: (key: string) => TKey,
): OrderedMap<TKey, Count> {
    const entries = counts.map((entry): [TKey, Count] => [toKey(entry.key), toCount(entry.count)]);
    return OrderedMap(entries);
}

/** Records keyed by one of their own fields, persisted in order. */
export const toPersistedRecords = <TKey, TRecord, TPersisted>(
    records: OrderedMap<TKey, TRecord>,
    persist: (record: TRecord) => TPersisted,
): readonly TPersisted[] => records.valueSeq().map(persist).toArray();

/** Records keyed by one of their own fields, from their persisted form. */
export function fromPersistedRecords<TKey, TRecord, TPersisted>(
    records: readonly TPersisted[],
    restore: (record: TPersisted) => TRecord,
    keyOf: (record: TRecord) => TKey,
): OrderedMap<TKey, TRecord> {
    const entries = records.map((persisted): [TKey, TRecord] => {
        const record = restore(persisted);
        return [keyOf(record), record];
    });
    return OrderedMap(entries);
}
