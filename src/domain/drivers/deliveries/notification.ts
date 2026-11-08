import { allTrue, recordPart } from '../../system/digests/digest-parts';
import type { FieldsOf } from '../../system/classes/fields-of';
import type { DeliveryEventId } from './delivery-event-id';
import type { DriverId } from '../driver';
import type { OrderDeliveryId } from './order-delivery';
import type { IVersion } from '../../system/records/version-chain';
import { assertVersionLink, FIRST_VERSION } from '../../system/records/version-chain';
import type { VersionNumber } from '../../system/records/version-chain';
import type { IInstant } from '../../system/time/instant';

/** A record that a driver was notified about a request. */
export type NotificationId = string & { readonly brand: 'NotificationId' };
/** Marks text as a notification's ID. */
export const toNotificationId = (value: string): NotificationId => value as NotificationId;

/** The part of a durable record that a driver was notified about a request that never changes. */
export class Notification {
    /** A notification, sent at a time from 0. */
    static create(fields: FieldsOf<Notification>): Notification {
        return new Notification(
            fields.id,
            fields.orderDeliveryId,
            fields.requestEventId,
            fields.driverId,
            fields.at,
        );
    }

    declare private readonly brand: never;

    private constructor(
        readonly id: NotificationId,
        readonly orderDeliveryId: OrderDeliveryId,
        readonly requestEventId: DeliveryEventId,
        readonly driverId: DriverId,
        readonly at: IInstant,
    ) {
        Object.freeze(this);
    }

    /** The notification, written out field by field for a digest. */
    digestPart(): string {
        return recordPart([
            { text: this.id },
            { text: this.orderDeliveryId },
            { text: this.requestEventId },
            { text: this.driverId },
            { part: this.at.digestPart() },
        ]);
    }

    /** Whether another notification is the same, field by field. */
    equals(other: Notification): boolean {
        const isSameAt = this.at.equals(other.at);
        return allTrue(
            this.id === other.id,
            this.orderDeliveryId === other.orderDeliveryId,
            this.requestEventId === other.requestEventId,
            this.driverId === other.driverId,
            isSameAt,
        );
    }
}

/** One state of a notification. */
export class NotificationVersion implements IVersion<NotificationVersion> {
    /** A notification just sent, waiting for an answer. */
    static createNew(notificationId: NotificationId): NotificationVersion {
        return NotificationVersion.create({
            notificationId,
            isOutstanding: true,
            number: FIRST_VERSION,
            previous: null,
        });
    }

    /** A version from its values, whose number follows the version it links to. */
    static create(fields: FieldsOf<NotificationVersion>): NotificationVersion {
        assertVersionLink(`notification ${fields.notificationId}`, fields.number, fields.previous);
        return new NotificationVersion(
            fields.notificationId,
            fields.isOutstanding,
            fields.number,
            fields.previous,
        );
    }

    declare private readonly brand: never;

    private constructor(
        readonly notificationId: NotificationId,
        readonly isOutstanding: boolean,
        readonly number: VersionNumber,
        readonly previous: NotificationVersion | null,
    ) {
        Object.freeze(this);
    }
}
