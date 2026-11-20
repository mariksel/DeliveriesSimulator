import type { DriverAvailability } from './driver-availability';
import type { FieldsOf } from '../system/classes/fields-of';
import type { AreaId } from '../map-and-routing/area-id';
import type { Coordinates } from '../map-and-routing/coordinates';
import type { IVersion } from '../system/records/version-chain';
import type { Maker } from '../system/records/maker';
import { assertVersionLink, FIRST_VERSION } from '../system/records/version-chain';
import type { VersionNumber } from '../system/records/version-chain';
import type { IInstant } from '../system/time/instant';
import { nextVersionNumber } from '../system/records/version-chain';

/** A driver. */
export type DriverId = string & { readonly brand: 'DriverId' };
/** Marks text as a driver's ID. */
export const toDriverId = (value: string): DriverId => value as DriverId;

/** The part of a driver that never changes. */
export class Driver {
    /** A driver, by their ID. */
    static create(fields: FieldsOf<Driver>): Driver {
        return new Driver(fields.id);
    }

    declare private readonly brand: never;

    private constructor(readonly id: DriverId) {
        Object.freeze(this);
    }
}

/** Where a driver last said they were, and when, by their device's time. */
export class DriverLocation {
    /** A location, said at a device time from 0. */
    static create(fields: FieldsOf<DriverLocation>): DriverLocation {
        return new DriverLocation(fields.coordinates, fields.deviceTime);
    }

    declare private readonly brand: never;

    private constructor(
        readonly coordinates: Coordinates,
        readonly deviceTime: IInstant,
    ) {
        Object.freeze(this);
    }
}

/** What a run needs to add a driver. */
export class NewDriver {
    /** A driver to add: who, in which area, how available, and where, if known. */
    static create(fields: FieldsOf<NewDriver>): NewDriver {
        return new NewDriver(fields.id, fields.areaId, fields.availability, fields.location);
    }

    declare private readonly brand: never;

    private constructor(
        readonly id: DriverId,
        readonly areaId: AreaId,
        /** Null while offline. */
        readonly availability: DriverAvailability | null,
        readonly location: DriverLocation | null,
    ) {
        Object.freeze(this);
    }
}

/**
 * One state of a driver, as deliveries knows them: their service area, which can change. Their
 * status and location change at rates of their own, so each has its own versions (FND-81).
 */
export class DriverVersion implements IVersion<DriverVersion> {
    /** A driver's first version, as they were added. */
    static createNew(driver: NewDriver, madeBy: Maker): DriverVersion {
        return DriverVersion.create({
            driverId: driver.id,
            areaId: driver.areaId,
            number: FIRST_VERSION,
            previous: null,
            madeBy,
        });
    }

    /** A version from its values, whose number follows the version it links to. */
    static create(fields: FieldsOf<DriverVersion>): DriverVersion {
        assertVersionLink(`driver ${fields.driverId}`, fields.number, fields.previous);
        return new DriverVersion(
            fields.driverId,
            fields.areaId,
            fields.number,
            fields.previous,
            fields.madeBy,
        );
    }

    declare private readonly brand: never;

    private constructor(
        readonly driverId: DriverId,
        readonly areaId: AreaId,
        readonly number: VersionNumber,
        readonly previous: DriverVersion | null,
        /** The job run or API call that made this version, or the run's start (FND-81). */
        readonly madeBy: Maker,
    ) {
        Object.freeze(this);
    }

    /** The next version, as the driver is added again: their new area. */
    readded(driver: NewDriver, madeBy: Maker): DriverVersion {
        return DriverVersion.create({
            driverId: this.driverId,
            areaId: driver.areaId,
            number: nextVersionNumber(this.number),
            previous: this,
            madeBy,
        });
    }
}
