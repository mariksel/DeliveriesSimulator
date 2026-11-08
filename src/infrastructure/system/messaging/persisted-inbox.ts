import { OrderedMap } from 'immutable';

import { InboxPosition } from '../../../domain/system/messaging/inbox-position';
import type { IInstant } from '../../../domain/system/time/instant';
import { toPosition } from '../../../domain/system/math/math';
import type { InstantAt } from '../../../domain/system/time/instant';

/** A persisted inbox record: an outbox event read, and the time of that event. */
export interface IPersistedInboxRecord {
    readonly outboxEventId: string;
    readonly at: number;
}

/** A persisted inbox position. */
export interface IPersistedInboxPosition {
    readonly scanFrom: number;
    readonly latestAt: number | null;
}

/** An inbox's records, persisted in the order they were read. */
export const toPersistedInbox = (
    inbox: OrderedMap<string, IInstant>,
): readonly IPersistedInboxRecord[] =>
    inbox
        .entrySeq()
        .map(([outboxEventId, at]) => ({ outboxEventId, at: at.sinceStart.milliseconds }))
        .toArray();

/** An inbox's records, from their persisted form, with the IDs of the outbox it reads. */
export function fromPersistedInbox<TOutboxEventId extends string>(
    records: readonly IPersistedInboxRecord[],
    toOutboxEventId: (value: string) => TOutboxEventId,
    instantAt: InstantAt,
): OrderedMap<TOutboxEventId, IInstant> {
    const entries = records.map((record): [TOutboxEventId, IInstant] => [
        toOutboxEventId(record.outboxEventId),
        instantAt(record.at),
    ]);
    return OrderedMap(entries);
}

/** An inbox position, persisted. */
export const toPersistedInboxPosition = (position: InboxPosition): IPersistedInboxPosition => ({
    scanFrom: position.scanFrom,
    latestAt: position.latestAt === null ? null : position.latestAt.sinceStart.milliseconds,
});

/** An inbox position, from its persisted form. */
export function fromPersistedInboxPosition(
    position: IPersistedInboxPosition,
    instantAt: InstantAt,
): InboxPosition {
    const scanFrom = toPosition(position.scanFrom);
    const latestAt = position.latestAt === null ? null : instantAt(position.latestAt);
    return InboxPosition.create({ scanFrom, latestAt });
}
