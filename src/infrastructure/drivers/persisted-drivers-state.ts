import type { DriverAvailability } from '../../domain/drivers/driver-availability';
import { Driver, DriverLocation, DriverVersion } from '../../domain/drivers/driver';
import { DriversState } from '../../domain/drivers/drivers-state';
import { toAreaId } from '../../domain/map-and-routing/area-id';
import { toDriverId } from '../../domain/drivers/driver';
import { toVersionNumber } from '../../domain/system/records/version-chain';
import type { IPersistedCoordinates } from '../map-and-routing/persisted-coordinates';
import {
    fromPersistedCoordinates,
    toPersistedCoordinates,
} from '../map-and-routing/persisted-coordinates';
import type { IPersistedCount } from '../system/records/persisted-groups';
import {
    fromPersistedCounts,
    fromPersistedRecords,
    toPersistedCounts,
    toPersistedRecords,
} from '../system/records/persisted-groups';
import type { InstantAt } from '../../domain/system/time/instant';

/** The part of a driver that never changes, persisted. */
export interface IPersistedDriver {
    readonly id: string;
}

/** Where a driver's device last said it was, persisted. */
export interface IPersistedDriverLocation {
    readonly coordinates: IPersistedCoordinates;
    readonly deviceTime: number;
}

/** A driver's version, persisted with the versions before it. */
export interface IPersistedDriverVersion {
    readonly number: number;
    readonly previous: IPersistedDriverVersion | null;
    readonly driverId: string;
    readonly areaId: string;
    readonly availability: DriverAvailability | null;
    readonly location: IPersistedDriverLocation | null;
}

/** The Drivers module's state, persisted. */
export interface IPersistedDriversState {
    readonly drivers: readonly IPersistedDriver[];
    readonly driverVersions: readonly IPersistedDriverVersion[];
    readonly heldOrders: readonly IPersistedCount[];
    readonly pickedUpOrders: readonly IPersistedCount[];
}

const toPersistedLocation = (location: DriverLocation): IPersistedDriverLocation => ({
    coordinates: toPersistedCoordinates(location.coordinates),
    deviceTime: location.deviceTime.sinceStart.milliseconds,
});

const fromPersistedLocation = (
    location: IPersistedDriverLocation,
    instantAt: InstantAt,
): DriverLocation =>
    DriverLocation.create({
        coordinates: fromPersistedCoordinates(location.coordinates),
        deviceTime: instantAt(location.deviceTime),
    });

const toPersistedDriverVersion = (version: DriverVersion): IPersistedDriverVersion => ({
    number: version.number,
    previous: version.previous === null ? null : toPersistedDriverVersion(version.previous),
    driverId: version.driverId,
    areaId: version.areaId,
    availability: version.availability,
    location: version.location === null ? null : toPersistedLocation(version.location),
});

const fromPersistedDriverVersion = (
    version: IPersistedDriverVersion,
    instantAt: InstantAt,
): DriverVersion =>
    DriverVersion.create({
        driverId: toDriverId(version.driverId),
        areaId: toAreaId(version.areaId),
        availability: version.availability,
        location:
            version.location === null ? null : fromPersistedLocation(version.location, instantAt),
        number: toVersionNumber(version.number),
        previous:
            version.previous === null
                ? null
                : fromPersistedDriverVersion(version.previous, instantAt),
    });

const toPersistedDriver = (driver: Driver): IPersistedDriver => ({ id: driver.id });
const fromPersistedDriver = (driver: IPersistedDriver): Driver =>
    Driver.create({ id: toDriverId(driver.id) });

/** The Drivers module's state, persisted. */
export const toPersistedDriversState = (state: DriversState): IPersistedDriversState => ({
    drivers: toPersistedRecords(state.drivers, toPersistedDriver),
    driverVersions: toPersistedRecords(state.driverVersions, toPersistedDriverVersion),
    heldOrders: toPersistedCounts(state.heldOrders),
    pickedUpOrders: toPersistedCounts(state.pickedUpOrders),
});

/** The Drivers module's state, from its persisted form. */
export const fromPersistedDriversState = (
    state: IPersistedDriversState,
    instantAt: InstantAt,
): DriversState =>
    DriversState.create({
        drivers: fromPersistedRecords(state.drivers, fromPersistedDriver, (driver) => driver.id),
        driverVersions: fromPersistedRecords(
            state.driverVersions,
            (item) => fromPersistedDriverVersion(item, instantAt),
            (version) => version.driverId,
        ),
        heldOrders: fromPersistedCounts(state.heldOrders, toDriverId),
        pickedUpOrders: fromPersistedCounts(state.pickedUpOrders, toDriverId),
    });
