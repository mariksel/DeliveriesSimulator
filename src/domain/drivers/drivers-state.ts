import { OrderedMap } from 'immutable';

import type { FieldsOf } from '../system/classes/fields-of';
import type { DriverId } from './driver';
import type { Count } from '../system/math/math';
import { NO_COUNT, minusOne, plusOne } from '../system/math/math';
import type { DriverLocation, NewDriver } from './driver';
import { Driver, DriverVersion } from './driver';
import { DriverLocationVersion } from './driver-location';
import { DriverStatusVersion } from './driver-status';
import type { DriverAvailability } from './driver-availability';
import type { Maker } from '../system/records/maker';

/** Which driver holds an order, and which has picked it up, either or both of them none. */
export interface IHolding {
    readonly heldBy: DriverId | null;
    readonly pickedUpBy: DriverId | null;
}

function changeCount(
    counts: OrderedMap<DriverId, Count>,
    driverId: DriverId | null,
    change: (count: Count) => Count,
): OrderedMap<DriverId, Count> {
    if (driverId === null) {
        return counts;
    }
    const count = counts.get(driverId) ?? NO_COUNT;
    const changed = change(count);
    return counts.set(driverId, changed);
}

/**
 * A driver's full view: their version, their status, and their location, each with versions of
 * its own, as they stand together (FND-81).
 */
export interface IDriverView {
    readonly version: DriverVersion;
    readonly status: DriverStatusVersion;
    /** Null until their device has said where they are. */
    readonly location: DriverLocationVersion | null;
    /** Null while offline. */
    readonly availability: DriverAvailability | null;
}

/**
 * The drivers of one run: each driver, their latest version, status, and location, and how many
 * orders each holds. Its commands are its static methods.
 */
export class DriversState {
    /** The drivers at the start of a run: none. */
    static createNew(): DriversState {
        return DriversState.create({
            drivers: OrderedMap(),
            driverVersions: OrderedMap(),
            statuses: OrderedMap(),
            locations: OrderedMap(),
            heldOrders: OrderedMap(),
            pickedUpOrders: OrderedMap(),
        });
    }

    /** The drivers from their records. */
    static create(fields: FieldsOf<DriversState>): DriversState {
        return new DriversState(
            fields.drivers,
            fields.driverVersions,
            fields.statuses,
            fields.locations,
            fields.heldOrders,
            fields.pickedUpOrders,
        );
    }

    /**
     * Adds a driver. A driver with the same ID moves on to a new version instead. The maker is
     * what made the version, such as the run's start for a scenario's starting drivers.
     */
    static addDriver(state: DriversState, driver: NewDriver, madeBy: Maker): DriversState {
        const existing = state.driverVersions.get(driver.id);
        const version =
            existing === undefined
                ? DriverVersion.createNew(driver, madeBy)
                : existing.readded(driver, madeBy);
        const status = state.statuses.get(driver.id);
        const nextStatus =
            status === undefined
                ? DriverStatusVersion.createNew(driver.id, driver.availability, madeBy)
                : status.next(driver.availability, madeBy);
        const added = Driver.create({ id: driver.id });
        return state.with({
            drivers: state.drivers.set(driver.id, added),
            driverVersions: state.driverVersions.set(driver.id, version),
            statuses: state.statuses.set(driver.id, nextStatus),
            locations: DriversState.relocated(state.locations, driver, madeBy),
        });
    }

    /**
     * The drivers after one's app sent a location, with the version it made, or the same state
     * and no version for a driver there is no record of.
     */
    static locate(
        state: DriversState,
        driverId: DriverId,
        location: DriverLocation,
        madeBy: Maker,
    ): { readonly state: DriversState; readonly version: DriverLocationVersion | null } {
        if (!state.driverVersions.has(driverId)) {
            return { state, version: null };
        }
        const known = state.locations.get(driverId);
        const version =
            known === undefined
                ? DriverLocationVersion.createNew(driverId, location, madeBy)
                : known.moved(location, madeBy);
        const located = state.with({ locations: state.locations.set(driverId, version) });
        return { state: located, version };
    }

    /** The drivers' counts after an order moves from one holding to another. */
    static changeHolding(state: DriversState, before: IHolding, after: IHolding): DriversState {
        const held = changeCount(state.heldOrders, before.heldBy, minusOne);
        const pickedUp = changeCount(state.pickedUpOrders, before.pickedUpBy, minusOne);
        return state.with({
            heldOrders: changeCount(held, after.heldBy, plusOne),
            pickedUpOrders: changeCount(pickedUp, after.pickedUpBy, plusOne),
        });
    }

    /** The drivers' locations as a driver is added: where they are, if known, or none. */
    private static relocated(
        locations: OrderedMap<DriverId, DriverLocationVersion>,
        driver: NewDriver,
        madeBy: Maker,
    ): OrderedMap<DriverId, DriverLocationVersion> {
        if (driver.location === null) {
            return locations.delete(driver.id);
        }
        const known = locations.get(driver.id);
        const location =
            known === undefined
                ? DriverLocationVersion.createNew(driver.id, driver.location, madeBy)
                : known.moved(driver.location, madeBy);
        return locations.set(driver.id, location);
    }

    declare private readonly brand: never;

    private constructor(
        readonly drivers: OrderedMap<DriverId, Driver>,
        /** Each driver's latest version. */
        readonly driverVersions: OrderedMap<DriverId, DriverVersion>,
        /** Each driver's latest status: online and how available, or offline. */
        readonly statuses: OrderedMap<DriverId, DriverStatusVersion>,
        /** Each driver's latest location, once their device has said where they are. */
        readonly locations: OrderedMap<DriverId, DriverLocationVersion>,
        /**
         * How many orders each driver holds, assigned or picked up. A driver with none may be
         * absent.
         */
        readonly heldOrders: OrderedMap<DriverId, Count>,
        /** How many of those each driver has picked up. A driver with none may be absent. */
        readonly pickedUpOrders: OrderedMap<DriverId, Count>,
    ) {
        Object.freeze(this);
    }

    /** A driver's latest version, if there is such a driver. */
    versionOf(driverId: DriverId): DriverVersion | undefined {
        return this.driverVersions.get(driverId);
    }

    /** A driver's full view: their version, status, and location, if there is such a driver. */
    viewOf(driverId: DriverId): IDriverView | undefined {
        const version = this.driverVersions.get(driverId);
        const status = this.statuses.get(driverId);
        if (version === undefined || status === undefined) {
            return undefined;
        }
        const location = this.locations.get(driverId) ?? null;
        return { version, status, location, availability: status.availability };
    }

    /** A driver's latest location, if their device has said where they are. */
    locationOf(driverId: DriverId): DriverLocationVersion | undefined {
        return this.locations.get(driverId);
    }

    /** How many orders a driver holds, assigned or picked up. */
    heldOrdersOf(driverId: DriverId): Count {
        return this.heldOrders.get(driverId) ?? NO_COUNT;
    }

    /** How many orders a driver has picked up. */
    pickedUpOrdersOf(driverId: DriverId): Count {
        return this.pickedUpOrders.get(driverId) ?? NO_COUNT;
    }

    /** The state with some of its records replaced. */
    private with(changes: Partial<FieldsOf<DriversState>>): DriversState {
        const fields: FieldsOf<DriversState> = {
            drivers: this.drivers,
            driverVersions: this.driverVersions,
            statuses: this.statuses,
            locations: this.locations,
            heldOrders: this.heldOrders,
            pickedUpOrders: this.pickedUpOrders,
        };
        return DriversState.create({ ...fields, ...changes });
    }
}
