import { OrderedMap } from 'immutable';

import type { FieldsOf } from '../system/classes/fields-of';
import type { DriverId } from './driver';
import type { Count } from '../system/math/math';
import { NO_COUNT, minusOne, plusOne } from '../system/math/math';
import type { NewDriver } from './driver';
import { Driver, DriverVersion } from './driver';

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
 * The drivers of one run: each driver, its latest version, and how many orders it holds. Its
 * commands are its static methods.
 */
export class DriversState {
    /** The drivers at the start of a run: none. */
    static createNew(): DriversState {
        return DriversState.create({
            drivers: OrderedMap(),
            driverVersions: OrderedMap(),
            heldOrders: OrderedMap(),
            pickedUpOrders: OrderedMap(),
        });
    }

    /** The drivers from their records. */
    static create(fields: FieldsOf<DriversState>): DriversState {
        return new DriversState(
            fields.drivers,
            fields.driverVersions,
            fields.heldOrders,
            fields.pickedUpOrders,
        );
    }

    /** Adds a driver. A driver with the same ID moves on to a new version instead. */
    static addDriver(state: DriversState, driver: NewDriver): DriversState {
        const existing = state.driverVersions.get(driver.id);
        const version =
            existing === undefined ? DriverVersion.createNew(driver) : existing.readded(driver);
        const added = Driver.create({ id: driver.id });
        return state.with({
            drivers: state.drivers.set(driver.id, added),
            driverVersions: state.driverVersions.set(driver.id, version),
        });
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

    declare private readonly brand: never;

    private constructor(
        readonly drivers: OrderedMap<DriverId, Driver>,
        /** Each driver's latest version. */
        readonly driverVersions: OrderedMap<DriverId, DriverVersion>,
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
            heldOrders: this.heldOrders,
            pickedUpOrders: this.pickedUpOrders,
        };
        return DriversState.create({ ...fields, ...changes });
    }
}
