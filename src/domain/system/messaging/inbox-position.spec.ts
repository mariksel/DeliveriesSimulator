import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { InboxPosition } from './inbox-position';
import { toDuration } from '../time/duration';
import { toPosition } from '../math/math';
import { instantAt } from '../time/instant.testing';

const START = InboxPosition.createNew();

describe('how far an inbox has read', () => {
    it('starts at the beginning, having read nothing, and cannot change', () => {
        expect(START).toMatchObject({ scanFrom: 0, latestAt: null });
        const isFrozen = Object.isFrozen(START);
        expect(isFrozen).toBe(true);
    });

    it('finds nothing too old to read before it has read anything', () => {
        const readLag = toDuration(60_000);
        const at = instantAt(0);
        const isTooOld = START.isTooOldToRead(at, readLag);
        expect(isTooOld).toBe(false);
    });

    it('reads back as far as the read lag from the latest event read', () => {
        const position = InboxPosition.create({
            scanFrom: toPosition(0),
            latestAt: instantAt(100_000),
        });

        const readLag = toDuration(60_000);
        const justInTime = instantAt(40_000);
        const tooOld = instantAt(39_999);
        const isJustInTimeTooOld = position.isTooOldToRead(justInTime, readLag);
        const isTooOld = position.isTooOldToRead(tooOld, readLag);
        expect(isJustInTimeTooOld).toBe(false);
        expect(isTooOld).toBe(true);
    });

    it('takes the first event read as the latest', () => {
        const readAt = instantAt(5);
        const read = START.withLatestRead(readAt);
        expect(read.latestAt?.sinceStart.milliseconds).toBe(5);
    });

    it('keeps the latest event read when an older one is read after it', () => {
        const position = InboxPosition.create({
            scanFrom: toPosition(3),
            latestAt: instantAt(10),
        });

        const readAt = instantAt(5);
        const read = position.withLatestRead(readAt);
        expect(read).toMatchObject({ scanFrom: 3, latestAt: 10 });
    });

    it('moves on to a newer event read', () => {
        const position = InboxPosition.create({
            scanFrom: toPosition(0),
            latestAt: instantAt(10),
        });

        const readAt = instantAt(15);
        const read = position.withLatestRead(readAt);
        expect(read.latestAt?.sinceStart.milliseconds).toBe(15);
    });

    it.each<[string, number[], number, number]>([
        ['moves past the events finished with', [1, 1, 0, 1], 0, 2],
        ['stays at an event not finished with', [0, 1], 0, 0],
        ['starts from where it was', [0, 1, 1, 0], 1, 3],
        ['goes to the end when all are finished with', [1, 1], 0, 2],
        ['stays at the end of an empty outbox', [], 0, 0],
        ['stays at the end when nothing new has arrived', [1, 1], 2, 2],
    ])('%s', (_name, events, scanFrom, expected) => {
        const outbox = List(events);
        const position = InboxPosition.create({
            scanFrom: toPosition(scanFrom),
            latestAt: instantAt(7),
        });

        const scanned = position.scannedTo(outbox, (event) => event === 1);
        expect(scanned).toMatchObject({ scanFrom: expected, latestAt: 7 });
    });

    it.each<[number, number | null]>([
        [-1, null],
        [0.5, null],
        [0, -1],
        [0, Number.NaN],
    ])('refuses a scan position of %s with a latest time of %s', (scanFrom, latestAt) => {
        expect(() =>
            InboxPosition.create({
                scanFrom: toPosition(scanFrom),
                latestAt: latestAt === null ? null : instantAt(latestAt),
            }),
        ).toThrow(RangeError);
    });
});
