import { describe, expect, it } from 'vitest';

import type { RecordRef } from '../../application-core/run-history/run-query';
import { RecordKind, versionsAt } from '../../application-core/run-history/run-query';
import { toInputOrderName } from '../../application-core/simulation-engine/input-names';
import { oneOrderRun } from '../../application/simulation-engine/one-order-run.testing';
import { toDriverId } from '../../domain/drivers/driver';
import { NotificationVersion } from '../../domain/drivers/deliveries/notification';
import { toPosition } from '../../domain/system/math/math';
import { orderRecords, recordVersionsView } from './record-versions-view';

const RUN = oneOrderRun();
const LATEST = toPosition(RUN.cache.commitIds.size);
const A = toInputOrderName('A');
const ORDER = RUN.cache.orderIds.get(A)!;
const ORDER_RECORDS = orderRecords(ORDER);

/** A record's view at the latest place. */
function viewOf(record: RecordRef): ReturnType<typeof recordVersionsView> {
    const versions = versionsAt(RUN, record, LATEST);
    return recordVersionsView(record, versions);
}

describe("an order's versions in the Inspector", () => {
    it("lists the order, Orders' copy of its delivery, its delivery, and Deliveries' copy of it", () => {
        const views = ORDER_RECORDS.map(viewOf);

        const titles = views.map((view) => view.title);
        const hasVersions = views.every((view) => view.rows.length > 0);
        expect(titles).toEqual([
            `Order ${ORDER}, in Orders`,
            "Orders' copy of its delivery",
            'Its delivery, in Deliveries',
            "Deliveries' copy of the order",
        ]);
        expect(hasVersions).toBe(true);
    });

    it('numbers each version, says what made it, and links it to its commit', () => {
        const [order] = ORDER_RECORDS.map(viewOf);
        const [first] = order!.rows;

        expect(first).toMatchObject({
            id: `Order:1`,
            number: 1,
            summary: 'Created',
            madeBy: 'Job run or API call 5',
            place: 5,
            commitText: 'Commit #5',
            tooltip: 'Show commit #5, which made version 1',
        });
        expect(order!.rows.at(-1)?.summary).toContain('Delivered');
    });

    it('says how many delivery events Orders copied, one or more', () => {
        const [, copy] = ORDER_RECORDS.map(viewOf);

        const summaries = copy!.rows.map((row) => row.summary);

        const firstTwo = summaries.slice(0, 2);
        expect(firstTwo).toEqual(['0 delivery events copied', '1 delivery event copied']);
    });

    it("gives a version of the run's start no commit", () => {
        const driver: RecordRef = { kind: RecordKind.Driver, id: toDriverId('driver-1') };

        const [first] = viewOf(driver).rows;

        expect(first).toMatchObject({
            madeBy: "The run's start",
            place: null,
            commitText: '—',
            tooltip: 'Made at the start of the run, before any commit',
        });
        expect(viewOf(driver).title).toBe('Driver driver-1');
        expect(first?.summary).toBe('In area-1');
    });

    it("shows a driver's status and location as records of their own", () => {
        const id = toDriverId('driver-1');
        const status: RecordRef = { kind: RecordKind.DriverStatus, id };
        const location: RecordRef = { kind: RecordKind.DriverLocation, id };

        const [firstStatus] = viewOf(status).rows;
        const [firstLocation] = viewOf(location).rows;

        expect(viewOf(status).title).toBe('Status of driver driver-1');
        expect(firstStatus?.summary).toBe('Available');
        expect(viewOf(location).title).toBe('Location of driver driver-1');
        expect(firstLocation?.summary).toMatch(/^At \d+\.\d{5}, \d+\.\d{5}$/);
    });

    it('says whether a notification is still outstanding', () => {
        const [latest] = [...RUN.root.state.deliveries.notificationVersions.values()];
        const record: RecordRef = { kind: RecordKind.Notification, id: latest!.notificationId };
        const answered = NotificationVersion.create({
            notificationId: latest!.notificationId,
            isOutstanding: false,
            number: latest!.number,
            previous: latest!.previous,
            madeBy: latest!.madeBy,
        });

        const view = viewOf(record);
        const made = { version: answered, place: null, root: RUN.line.start };
        const answeredView = recordVersionsView(record, [made]);

        const summaries = view.rows.map((row) => row.summary);
        expect(view.title).toBe(`Notification ${latest!.notificationId}`);
        expect(summaries).toEqual(['Outstanding']);
        expect(answeredView.rows[0]?.summary).toBe('Answered');
    });
});
