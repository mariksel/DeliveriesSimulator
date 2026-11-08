import type { List } from 'immutable';

import type { FieldsOf } from '../classes/fields-of';
import type { Duration } from '../time/duration';
import type { Position } from '../math/math';
import type { IInstant } from '../time/instant';
import { laterOf } from '../time/instant';
import { toPosition } from '../math/math';

/**
 * How far an inbox has read an outbox. An outbox only grows, and an inbox never goes back to an
 * event it has read or let fall behind its read lag, so a read can start where the last one could
 * not go past.
 */
export class InboxPosition {
    /** An inbox that has read nothing. */
    static createNew(): InboxPosition {
        const start = toPosition(0);
        return new InboxPosition(start, null);
    }

    /** A position from its values: where to scan from, and the latest time read, or null. */
    static create({ scanFrom, latestAt }: FieldsOf<InboxPosition>): InboxPosition {
        return new InboxPosition(scanFrom, latestAt);
    }

    declare private readonly brand: never;

    private constructor(
        /** The first outbox event that may still need reading. */
        readonly scanFrom: Position,
        /** The time of the latest event read, or null before the first. */
        readonly latestAt: IInstant | null,
    ) {
        Object.freeze(this);
    }

    /**
     * Whether an event at this time is too old to read: older than the latest event read, less the
     * read lag. Before the first read, nothing is.
     */
    isTooOldToRead(at: IInstant, readLag: Duration): boolean {
        if (this.latestAt === null) {
            return false;
        }
        const from = this.latestAt.minus(readLag);
        return at.isBefore(from);
    }

    /** The position after reading an event at this time, which may be older than the latest. */
    withLatestRead(readAt: IInstant): InboxPosition {
        const latestAt = this.latestAt === null ? readAt : laterOf(this.latestAt, readAt);
        return InboxPosition.create({ scanFrom: this.scanFrom, latestAt });
    }

    /** The position moved on past every event, from here on, that the inbox is finished with. */
    scannedTo<TEvent>(
        outbox: List<TEvent>,
        isFinished: (event: TEvent) => boolean,
    ): InboxPosition {
        const next = outbox.slice(this.scanFrom).findIndex((event) => !isFinished(event));
        const reached = next < 0 ? outbox.size : this.scanFrom + next;
        const scanFrom = toPosition(reached);
        return InboxPosition.create({ scanFrom, latestAt: this.latestAt });
    }
}
