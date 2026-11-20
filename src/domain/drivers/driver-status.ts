import type { FieldsOf } from '../system/classes/fields-of';
import type { Maker } from '../system/records/maker';
import type { IVersion, VersionNumber } from '../system/records/version-chain';
import {
    assertVersionLink,
    FIRST_VERSION,
    nextVersionNumber,
} from '../system/records/version-chain';
import type { DriverId } from './driver';
import type { DriverAvailability } from './driver-availability';

/**
 * One state of a driver's status: online and how available, or offline. It changes at its own
 * rate, so it has versions of its own beside the driver's (FND-81).
 */
export class DriverStatusVersion implements IVersion<DriverStatusVersion> {
    /** A driver's first status, as they were added. */
    static createNew(
        driverId: DriverId,
        availability: DriverAvailability | null,
        madeBy: Maker,
    ): DriverStatusVersion {
        return DriverStatusVersion.create({
            driverId,
            availability,
            number: FIRST_VERSION,
            previous: null,
            madeBy,
        });
    }

    /** A version from its values, whose number follows the version it links to. */
    static create(fields: FieldsOf<DriverStatusVersion>): DriverStatusVersion {
        assertVersionLink(`status of driver ${fields.driverId}`, fields.number, fields.previous);
        return new DriverStatusVersion(
            fields.driverId,
            fields.availability,
            fields.number,
            fields.previous,
            fields.madeBy,
        );
    }

    declare private readonly brand: never;

    private constructor(
        readonly driverId: DriverId,
        /** Null while offline. */
        readonly availability: DriverAvailability | null,
        readonly number: VersionNumber,
        readonly previous: DriverStatusVersion | null,
        /** The job run or API call that made this version, or the run's start (FND-81). */
        readonly madeBy: Maker,
    ) {
        Object.freeze(this);
    }

    /** The next version, with the driver's new availability, or offline. */
    next(availability: DriverAvailability | null, madeBy: Maker): DriverStatusVersion {
        return DriverStatusVersion.create({
            driverId: this.driverId,
            availability,
            number: nextVersionNumber(this.number),
            previous: this,
            madeBy,
        });
    }
}
