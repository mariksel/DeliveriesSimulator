import type { FieldsOf } from '../system/classes/fields-of';
import type { Coordinates } from '../map-and-routing/coordinates';
import type { Maker } from '../system/records/maker';
import type { IVersion, VersionNumber } from '../system/records/version-chain';
import {
    assertVersionLink,
    FIRST_VERSION,
    nextVersionNumber,
} from '../system/records/version-chain';
import type { IInstant } from '../system/time/instant';
import type { DriverId, DriverLocation } from './driver';

/**
 * One location a driver's app said they were at, and when, by its device's time. It changes with
 * every send, so it has versions of its own, kept small, beside the driver's (FND-81, FND-90).
 */
export class DriverLocationVersion implements IVersion<DriverLocationVersion> {
    /** A driver's first known location. */
    static createNew(
        driverId: DriverId,
        location: DriverLocation,
        madeBy: Maker,
    ): DriverLocationVersion {
        return DriverLocationVersion.create({
            driverId,
            coordinates: location.coordinates,
            deviceTime: location.deviceTime,
            number: FIRST_VERSION,
            previous: null,
            madeBy,
        });
    }

    /** A version from its values, whose number follows the version it links to. */
    static create(fields: FieldsOf<DriverLocationVersion>): DriverLocationVersion {
        assertVersionLink(`location of driver ${fields.driverId}`, fields.number, fields.previous);
        return new DriverLocationVersion(
            fields.driverId,
            fields.coordinates,
            fields.deviceTime,
            fields.number,
            fields.previous,
            fields.madeBy,
        );
    }

    declare private readonly brand: never;

    private constructor(
        readonly driverId: DriverId,
        readonly coordinates: Coordinates,
        readonly deviceTime: IInstant,
        readonly number: VersionNumber,
        readonly previous: DriverLocationVersion | null,
        /** The job run or API call that made this version, or the run's start (FND-81). */
        readonly madeBy: Maker,
    ) {
        Object.freeze(this);
    }

    /** The next version, at a location the driver's app sent. */
    moved(location: DriverLocation, madeBy: Maker): DriverLocationVersion {
        return DriverLocationVersion.create({
            driverId: this.driverId,
            coordinates: location.coordinates,
            deviceTime: location.deviceTime,
            number: nextVersionNumber(this.number),
            previous: this,
            madeBy,
        });
    }
}
