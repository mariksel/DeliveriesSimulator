import type { IMadeVersion, RecordRef } from '../../application-core/run-history/run-query';
import { RecordKind } from '../../application-core/run-history/run-query';
import { sessionNumberOf, toSessionId } from '../../application-core/simulation-engine/session-id';
import { NotificationVersion } from '../../domain/drivers/deliveries/notification';
import { OrderDeliveryVersion } from '../../domain/drivers/deliveries/order-delivery';
import { OrderCopyVersion } from '../../domain/drivers/deliveries/order-copy';
import { DriverVersion } from '../../domain/drivers/driver';
import { DriverLocationVersion } from '../../domain/drivers/driver-location';
import { DriverStatusVersion } from '../../domain/drivers/driver-status';
import { DeliveryCopyVersion } from '../../domain/orders/delivery-copy';
import type { OrderId } from '../../domain/orders/order';
import { OrderVersion } from '../../domain/orders/order';
import type { Position } from '../../domain/system/math/math';

/** How many decimal places a location shows: about a metre. */
const PLACES = 5;

/** One version of a record, as the Inspector lists it. */
export interface IVersionRow {
    /** Unique among the record's versions. */
    readonly id: string;
    readonly number: number;
    /** What the version says, in brief. */
    readonly summary: string;
    /** The job run or API call that made it, or the run's start. */
    readonly madeBy: string;
    /** The place of the commit that made it, which choosing it shows, or null for the start. */
    readonly place: Position | null;
    readonly commitText: string;
    readonly tooltip: string;
}

/** One record's versions, oldest first. */
export interface IRecordVersionsView {
    readonly id: string;
    readonly title: string;
    readonly rows: readonly IVersionRow[];
}

/** The records an order's versions are kept in, in Orders and in Deliveries (FND-81). */
export const orderRecords = (orderId: OrderId): readonly RecordRef[] => [
    { kind: RecordKind.Order, id: orderId },
    { kind: RecordKind.DeliveryCopy, id: orderId },
    { kind: RecordKind.Delivery, id: orderId },
    { kind: RecordKind.OrderCopy, id: orderId },
];

const withDriver = (text: string, driverId: string | null): string =>
    driverId === null ? text : `${text}, driver ${driverId}`;

/** What a version says, in brief: its state, and its driver where it has one. */
function summaryOf({ version, root }: IMadeVersion): string {
    if (version instanceof OrderVersion) {
        // The order as it stood in the commit that made this version (FND-73).
        const view = root.state.orders.viewOf(version.orderId);
        return view === undefined ? '' : withDriver(view.status, view.driverId);
    }
    if (version instanceof DeliveryCopyVersion) {
        const { size } = version.events;
        return size === 1 ? '1 delivery event copied' : `${size} delivery events copied`;
    }
    if (version instanceof OrderDeliveryVersion) {
        return withDriver(version.state, version.driverId);
    }
    if (version instanceof OrderCopyVersion) {
        return `${version.status}, as of order version ${version.version}`;
    }
    if (version instanceof NotificationVersion) {
        return version.isOutstanding ? 'Outstanding' : 'Answered';
    }
    return driverSummaryOf(version);
}

/** What a version of a driver, or of their status or location, says in brief (FND-81). */
function driverSummaryOf(version: IMadeVersion['version']): string {
    if (version instanceof DriverVersion) {
        return `In ${version.areaId}`;
    }
    if (version instanceof DriverStatusVersion) {
        return version.availability ?? 'Offline';
    }
    if (version instanceof DriverLocationVersion) {
        const { latitude, longitude } = version.coordinates;
        return `At ${latitude.toFixed(PLACES)}, ${longitude.toFixed(PLACES)}`;
    }
    return '';
}

/** A record's heading in the Inspector. */
function titleOf(record: RecordRef): string {
    switch (record.kind) {
        case RecordKind.Order:
            return `Order ${record.id}, in Orders`;
        case RecordKind.DeliveryCopy:
            return `Orders' copy of its delivery`;
        case RecordKind.Delivery:
            return 'Its delivery, in Deliveries';
        case RecordKind.OrderCopy:
            return `Deliveries' copy of the order`;
        case RecordKind.Notification:
            return `Notification ${record.id}`;
        case RecordKind.Driver:
            return `Driver ${record.id}`;
        case RecordKind.DriverStatus:
            return `Status of driver ${record.id}`;
        case RecordKind.DriverLocation:
            return `Location of driver ${record.id}`;
        default:
            return '';
    }
}

/** What made a version: a job run or API call, by its number along the line, or the start. */
function madeByText(workId: string | null): string {
    if (workId === null) {
        return "The run's start";
    }
    const session = toSessionId(workId);
    const number = sessionNumberOf(session);
    return `Job run or API call ${number}`;
}

/** One version's row, linked to the commit that made it. */
function versionRow(record: RecordRef, made: IMadeVersion): IVersionRow {
    const { version, place } = made;
    const madeBy = madeByText(version.madeBy.workId);
    const commitText = place === null ? '—' : `Commit #${place}`;
    const tooltip =
        place === null
            ? 'Made at the start of the run, before any commit'
            : `Show commit #${place}, which made version ${version.number}`;
    return {
        id: `${record.kind}:${version.number}`,
        number: version.number,
        summary: summaryOf(made),
        madeBy,
        place,
        commitText,
        tooltip,
    };
}

/** A record's versions as the Inspector shows them, each linked to its commit (FND-81). */
export function recordVersionsView(
    record: RecordRef,
    versions: readonly IMadeVersion[],
): IRecordVersionsView {
    const rows = versions.map((made) => versionRow(record, made));
    return { id: `${record.kind}:${record.id}`, title: titleOf(record), rows };
}
