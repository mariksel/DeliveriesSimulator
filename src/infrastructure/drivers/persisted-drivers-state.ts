import type { DriverAvailability } from '../../domain/drivers/driver-availability';
import { Driver, DriverLocation, DriverVersion } from '../../domain/drivers/driver';
import { DriverLocationVersion } from '../../domain/drivers/driver-location';
import { DriverStatusVersion } from '../../domain/drivers/driver-status';
import { DriversState } from '../../domain/drivers/drivers-state';
import { toAreaId } from '../../domain/map-and-routing/area-id';
import { toDriverId } from '../../domain/drivers/driver';
import { toVersionNumber } from '../../domain/system/records/version-chain';
import { toCount } from '../../domain/system/math/math';
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
import type { IPersistedMapChange } from '../system/records/persisted-changes';
import { appliedMapChange, mapChange, presentOrNone } from '../system/records/persisted-changes';
import type { IPersistedMaker } from '../system/records/persisted-maker';
import { fromPersistedMaker, toPersistedMaker } from '../system/records/persisted-maker';

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
    /** The job run or API call that made this version, or the run's start (FND-81). */
    readonly madeBy: IPersistedMaker;
}

/** A driver's status version, persisted with the versions before it (FND-81). */
export interface IPersistedDriverStatusVersion {
    readonly number: number;
    readonly previous: IPersistedDriverStatusVersion | null;
    readonly driverId: string;
    readonly availability: DriverAvailability | null;
    readonly madeBy: IPersistedMaker;
}

/** A driver's location version, persisted with the versions before it (FND-81). */
export interface IPersistedDriverLocationVersion {
    readonly number: number;
    readonly previous: IPersistedDriverLocationVersion | null;
    readonly driverId: string;
    readonly coordinates: IPersistedCoordinates;
    readonly deviceTime: number;
    readonly madeBy: IPersistedMaker;
}

/** The Drivers module's state, persisted. */
export interface IPersistedDriversState {
    readonly drivers: readonly IPersistedDriver[];
    readonly driverVersions: readonly IPersistedDriverVersion[];
    readonly statuses: readonly IPersistedDriverStatusVersion[];
    readonly locations: readonly IPersistedDriverLocationVersion[];
    readonly heldOrders: readonly IPersistedCount[];
    readonly pickedUpOrders: readonly IPersistedCount[];
}

/** Where a driver's device last said it was, persisted. */
export const toPersistedLocation = (location: DriverLocation): IPersistedDriverLocation => ({
    coordinates: toPersistedCoordinates(location.coordinates),
    deviceTime: location.deviceTime.sinceStart.milliseconds,
});

/** Where a driver's device last said it was, from its persisted form, on a timeline. */
export const fromPersistedLocation = (
    location: IPersistedDriverLocation,
    instantAt: InstantAt,
): DriverLocation =>
    DriverLocation.create({
        coordinates: fromPersistedCoordinates(location.coordinates),
        deviceTime: instantAt(location.deviceTime),
    });

const toPersistedDriverVersion = (
    version: DriverVersion,
    stopAt: DriverVersion | null = null,
): IPersistedDriverVersion => ({
    number: version.number,
    previous:
        version.previous === null || version.previous === stopAt
            ? null
            : toPersistedDriverVersion(version.previous, stopAt),
    driverId: version.driverId,
    areaId: version.areaId,
    madeBy: toPersistedMaker(version.madeBy),
});

const fromPersistedDriverVersion = (
    version: IPersistedDriverVersion,
    instantAt: InstantAt,
    tail: DriverVersion | null = null,
): DriverVersion =>
    DriverVersion.create({
        driverId: toDriverId(version.driverId),
        areaId: toAreaId(version.areaId),
        number: toVersionNumber(version.number),
        previous:
            version.previous === null
                ? tail
                : fromPersistedDriverVersion(version.previous, instantAt, tail),
        madeBy: fromPersistedMaker(version.madeBy),
    });

const toPersistedStatus = (
    version: DriverStatusVersion,
    stopAt: DriverStatusVersion | null = null,
): IPersistedDriverStatusVersion => ({
    number: version.number,
    previous:
        version.previous === null || version.previous === stopAt
            ? null
            : toPersistedStatus(version.previous, stopAt),
    driverId: version.driverId,
    availability: version.availability,
    madeBy: toPersistedMaker(version.madeBy),
});

const fromPersistedStatus = (
    version: IPersistedDriverStatusVersion,
    tail: DriverStatusVersion | null = null,
): DriverStatusVersion =>
    DriverStatusVersion.create({
        driverId: toDriverId(version.driverId),
        availability: version.availability,
        number: toVersionNumber(version.number),
        previous: version.previous === null ? tail : fromPersistedStatus(version.previous, tail),
        madeBy: fromPersistedMaker(version.madeBy),
    });

const toPersistedLocationVersion = (
    version: DriverLocationVersion,
    stopAt: DriverLocationVersion | null = null,
): IPersistedDriverLocationVersion => ({
    number: version.number,
    previous:
        version.previous === null || version.previous === stopAt
            ? null
            : toPersistedLocationVersion(version.previous, stopAt),
    driverId: version.driverId,
    coordinates: toPersistedCoordinates(version.coordinates),
    deviceTime: version.deviceTime.sinceStart.milliseconds,
    madeBy: toPersistedMaker(version.madeBy),
});

const fromPersistedLocationVersion = (
    version: IPersistedDriverLocationVersion,
    instantAt: InstantAt,
    tail: DriverLocationVersion | null = null,
): DriverLocationVersion =>
    DriverLocationVersion.create({
        driverId: toDriverId(version.driverId),
        coordinates: fromPersistedCoordinates(version.coordinates),
        deviceTime: instantAt(version.deviceTime),
        number: toVersionNumber(version.number),
        previous:
            version.previous === null
                ? tail
                : fromPersistedLocationVersion(version.previous, instantAt, tail),
        madeBy: fromPersistedMaker(version.madeBy),
    });

const toPersistedDriver = (driver: Driver): IPersistedDriver => ({ id: driver.id });
const fromPersistedDriver = (driver: IPersistedDriver): Driver =>
    Driver.create({ id: toDriverId(driver.id) });

/** The Drivers module's state, persisted. */
export const toPersistedDriversState = (state: DriversState): IPersistedDriversState => ({
    drivers: toPersistedRecords(state.drivers, toPersistedDriver),
    driverVersions: toPersistedRecords(state.driverVersions, (version) =>
        toPersistedDriverVersion(version),
    ),
    statuses: toPersistedRecords(state.statuses, (version) => toPersistedStatus(version)),
    locations: toPersistedRecords(state.locations, (version) =>
        toPersistedLocationVersion(version),
    ),
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
        statuses: fromPersistedRecords(
            state.statuses,
            (item) => fromPersistedStatus(item),
            (version) => version.driverId,
        ),
        locations: fromPersistedRecords(
            state.locations,
            (item) => fromPersistedLocationVersion(item, instantAt),
            (version) => version.driverId,
        ),
        heldOrders: fromPersistedCounts(state.heldOrders, toDriverId),
        pickedUpOrders: fromPersistedCounts(state.pickedUpOrders, toDriverId),
    });

/**
 * The Drivers module's state's change from its parent's, part by part, each left out when it is
 * the parent's (FND-81). A version is saved down to the one the parent holds.
 */
export interface IPersistedDriversChange {
    readonly drivers?: IPersistedMapChange<IPersistedDriver> | undefined;
    readonly driverVersions?: IPersistedMapChange<IPersistedDriverVersion> | undefined;
    readonly statuses?: IPersistedMapChange<IPersistedDriverStatusVersion> | undefined;
    readonly locations?: IPersistedMapChange<IPersistedDriverLocationVersion> | undefined;
    readonly heldOrders?: IPersistedMapChange<number> | undefined;
    readonly pickedUpOrders?: IPersistedMapChange<number> | undefined;
}

/** The Drivers module's state's change from its parent's, or undefined when it is the parent's. */
export function toPersistedDriversChange(
    parent: DriversState,
    child: DriversState,
): IPersistedDriversChange | undefined {
    if (parent === child) {
        return undefined;
    }
    return presentOrNone({
        drivers: mapChange(parent.drivers, child.drivers, toDriverId, (driver) =>
            toPersistedDriver(driver),
        ),
        driverVersions: mapChange(
            parent.driverVersions,
            child.driverVersions,
            toDriverId,
            (version, before) => toPersistedDriverVersion(version, before ?? null),
        ),
        statuses: mapChange(parent.statuses, child.statuses, toDriverId, (version, before) =>
            toPersistedStatus(version, before ?? null),
        ),
        locations: mapChange(parent.locations, child.locations, toDriverId, (version, before) =>
            toPersistedLocationVersion(version, before ?? null),
        ),
        heldOrders: mapChange(parent.heldOrders, child.heldOrders, toDriverId, (count) => count),
        pickedUpOrders: mapChange(
            parent.pickedUpOrders,
            child.pickedUpOrders,
            toDriverId,
            (count) => count,
        ),
    });
}

/** The Drivers module's state, from its parent's and its change. */
export function fromPersistedDriversChange(
    parent: DriversState,
    change: IPersistedDriversChange | undefined,
    instantAt: InstantAt,
): DriversState {
    if (change === undefined) {
        return parent;
    }
    return DriversState.create({
        drivers: appliedMapChange(parent.drivers, change.drivers, toDriverId, (driver) =>
            fromPersistedDriver(driver),
        ),
        driverVersions: appliedMapChange(
            parent.driverVersions,
            change.driverVersions,
            toDriverId,
            (version, before) => fromPersistedDriverVersion(version, instantAt, before ?? null),
        ),
        statuses: appliedMapChange(
            parent.statuses,
            change.statuses,
            toDriverId,
            (version, before) => fromPersistedStatus(version, before ?? null),
        ),
        locations: appliedMapChange(
            parent.locations,
            change.locations,
            toDriverId,
            (version, before) => fromPersistedLocationVersion(version, instantAt, before ?? null),
        ),
        heldOrders: appliedMapChange(parent.heldOrders, change.heldOrders, toDriverId, (count) =>
            toCount(count),
        ),
        pickedUpOrders: appliedMapChange(
            parent.pickedUpOrders,
            change.pickedUpOrders,
            toDriverId,
            (count) => toCount(count),
        ),
    });
}
