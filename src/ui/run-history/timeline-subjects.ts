import type { ICommit } from '../../application-core/simulation-engine/commit';
import type { DirectEffect } from '../../application-core/simulation-engine/direct-effect';
import { EffectKind } from '../../application-core/simulation-engine/direct-effect';
import type { RecordVersion } from '../../application-core/simulation-engine/record-version';
import type { IndirectEffect } from '../../application-core/simulation-engine/indirect-effect';
import { IndirectKind } from '../../application-core/simulation-engine/indirect-effect';
import { RideKind } from '../../application-core/simulation-engine/ride';
import type { InputOrderName } from '../../application-core/simulation-engine/input-names';
import type { RecordRef } from '../../application-core/simulation-engine/record-ref';
import {
    RecordKind,
    recordOf,
    recordOfVersion,
} from '../../application-core/simulation-engine/record-ref';
import type { IRunIndex } from '../../application-core/simulation-engine/run-index';
import type { SessionId } from '../../application-core/simulation-engine/session-id';
import type { NotificationId } from '../../domain/drivers/deliveries/notification';
import type { DriverId } from '../../domain/drivers/driver';
import { toDriverId } from '../../domain/drivers/driver';
import { TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import type { OrderId } from '../../domain/orders/order';

/** What the views by order and by driver group commits under (FND-81). */
export const SubjectKind = {
    Order: 'Order',
    Driver: 'Driver',
} as const;

/** One of the values of {@link SubjectKind}. */
export type SubjectKind = (typeof SubjectKind)[keyof typeof SubjectKind];

/** An order's or a driver's ID, as a view by order or by driver groups by it. */
export type SubjectId = OrderId | DriverId;

/** The orders or drivers a commit goes under, in the order its job run or API call met them. */
export interface ISubjectsOfCommit {
    readonly subjects: readonly SubjectId[];
    /**
     * Where the ones first met at this commit start: those take the job run's or API call's
     * earlier commits too, as a job run is shown whole.
     */
    readonly firstMet: number;
}

const NONE: ISubjectsOfCommit = { subjects: [], firstMet: 0 };

/** The order a record is kept by: the order, Orders' copy of its delivery, or the delivery. */
const orderOf = (record: RecordRef): OrderId | null =>
    record.kind === RecordKind.Order ||
    record.kind === RecordKind.DeliveryCopy ||
    record.kind === RecordKind.Delivery ||
    record.kind === RecordKind.OrderCopy
        ? record.id
        : null;

/** The record versions an effect read: a call's or a job run's, as a change reads none. */
function readsOf(effect: DirectEffect | null): readonly RecordVersion[] {
    if (effect === null) {
        return [];
    }
    const isChange =
        effect.kind === EffectKind.ConfigChange || effect.kind === EffectKind.ImplementationChange;
    return isChange ? [] : effect.reads;
}

/**
 * Walks a branch's line, commit by commit, working out which orders or drivers each commit goes
 * under (FND-81). An order holds the job runs and API calls that made versions of its records, in
 * Orders or in Deliveries, the API calls that name it, and the indirect commits about it. A
 * driver holds those that made versions of the driver's record or of a request sent to them, the
 * driver's own API calls, and the indirect commits about them. A job run or API call is found
 * from the run's index, and from what its effect read; it goes under each of them whole.
 */
export class SubjectWalk {
    /** Each notification's driver, from the entry that sent it. */
    private readonly notified = new Map<NotificationId, DriverId>();
    /** Each order an input named, from the call that created it. */
    private readonly orderIds = new Map<InputOrderName, OrderId>();
    /** The job run or API call under way, whose subjects are being gathered. */
    private session: SessionId | null = null;
    private met: SubjectId[] = [];
    /** How many of the job run's records in the index have been taken in. */
    private recordsTaken = 0;
    /** Its notifications whose sending has not been walked yet. */
    private unsent: NotificationId[] = [];

    constructor(readonly kind: SubjectKind) {}

    /** Takes in the line's next commit, with the line's index, and gives what it goes under. */
    take(commit: ICommit, index: IRunIndex): ISubjectsOfCommit {
        this.noteNames(commit);
        const { session } = commit;
        if (session === null) {
            return this.loneSubjects(commit);
        }
        if (session !== this.session) {
            this.session = session;
            this.met = [];
            this.recordsTaken = 0;
            this.unsent = [];
        }
        const firstMet = this.met.length;
        const records = this.newRecords(index, session);
        const reads = readsOf(commit.effect);
        const read = reads.map(recordOfVersion);
        const unsent = this.unsent.map((id): RecordRef => ({ kind: RecordKind.Notification, id }));
        this.unsent = [];
        [...unsent, ...records, ...read].forEach((record) => {
            this.meet(record);
        });
        return { subjects: [...this.met], firstMet };
    }

    /** Notes the drivers notified and the orders created, which later commits name. */
    private noteNames(commit: ICommit): void {
        commit.entries.forEach((entry) => {
            if (entry.kind === TechnicalLogKind.NotificationSent) {
                const { notification } = entry.data;
                this.notified.set(notification.id, notification.driverId);
            }
        });
        const { effect } = commit;
        if (effect?.kind === EffectKind.Input && 'order' in effect && effect.response.isOk) {
            const { orderId } = effect.response;
            if (orderId !== null) {
                this.orderIds.set(effect.order, orderId);
            }
        }
    }

    /** The records of the job run or API call the index holds that were not taken in yet. */
    private newRecords(index: IRunIndex, session: SessionId): readonly RecordRef[] {
        const numbers = index.recordsByWork.get(session) ?? [];
        const added = numbers.slice(this.recordsTaken);
        this.recordsTaken = numbers.length;
        return added.flatMap((number) => {
            const key = index.records.get(number);
            return key === undefined ? [] : [recordOf(key)];
        });
    }

    /** Adds the order or driver a record is about, once; a notification not sent yet waits. */
    private meet(record: RecordRef): void {
        if (this.kind === SubjectKind.Order) {
            const orderId = orderOf(record);
            this.add(orderId);
            return;
        }
        // A driver's status and location are their own records, about the driver (FND-81).
        if (
            record.kind === RecordKind.Driver ||
            record.kind === RecordKind.DriverStatus ||
            record.kind === RecordKind.DriverLocation
        ) {
            this.add(record.id);
            return;
        }
        if (record.kind !== RecordKind.Notification) {
            return;
        }
        const driverId = this.notified.get(record.id);
        if (driverId === undefined) {
            this.unsent.push(record.id);
            return;
        }
        this.add(driverId);
    }

    private add(subject: SubjectId | null): void {
        if (subject !== null && !this.met.includes(subject)) {
            this.met.push(subject);
        }
    }

    /** What a commit outside a job run or API call is about: an indirect one's order or driver. */
    private loneSubjects(commit: ICommit): ISubjectsOfCommit {
        const { indirect } = commit;
        if (indirect === null) {
            return NONE;
        }
        if (this.kind === SubjectKind.Order) {
            const orderId = this.orderOf(indirect);
            return orderId === undefined ? NONE : { subjects: [orderId], firstMet: 0 };
        }
        const isDrivers =
            indirect.kind === IndirectKind.DriverIgnoresRequest ||
            indirect.kind === RideKind.SetsOff ||
            indirect.kind === RideKind.ActsOnArrival ||
            indirect.kind === RideKind.GoesToWait;
        if (!isDrivers) {
            return NONE;
        }
        const driverId = toDriverId(indirect.actor);
        return { subjects: [driverId], firstMet: 0 };
    }

    /** The order an indirect commit is about: a stop's, or the one it names; none for a wait. */
    private orderOf(indirect: IndirectEffect): OrderId | undefined {
        if (indirect.kind === RideKind.GoesToWait) {
            return undefined;
        }
        return indirect.kind === RideKind.SetsOff
            ? indirect.stopOrder
            : this.orderIds.get(indirect.order);
    }
}
