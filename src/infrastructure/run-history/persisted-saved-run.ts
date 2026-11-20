import type { IPersistedRun } from '../simulation-engine/persisted-run';
import { isRecord } from '../system/storage/indexed-db';
import { withPersistedCity } from '../simulation-engine/persisted-run-city';

/** The schema version of saved runs this release writes, as a migration chain reaches (FND-57). */
export const SAVED_RUN_SCHEMA_VERSION = 8;

/** What is told of a saved run, persisted on its own so listing loads no run. */
export interface IPersistedSavedRunSummary {
    readonly schemaVersion: number;
    readonly name: string;
    readonly level: string;
    readonly scenario: { readonly name: string; readonly number: number };
    readonly savedAt: number;
    readonly size: { readonly bytes: number; readonly commits: number; readonly branches: number };
}

/** A saved run's records, persisted. */
export interface IPersistedSavedRunBody {
    readonly schemaVersion: number;
    readonly run: IPersistedRun;
}

/** One step of the chain: a record of one schema version as the next version writes it. */
type Migration = (record: Record<string, unknown>) => Record<string, unknown>;

/**
 * From version 0, the in-memory form saved runs had before browser storage: its branches were
 * called timelines, the name they had when saved runs began.
 */
function fromVersion0(record: Record<string, unknown>): Record<string, unknown> {
    const { run } = record;
    if (!isRecord(run) || run['branches'] !== undefined) {
        return { ...record, schemaVersion: 1 };
    }
    const { timelines, ...rest } = run;
    return { ...record, schemaVersion: 1, run: { ...rest, branches: timelines } };
}

/**
 * From version 1, before implementation changes: version 2 adds the implementation change effect
 * and the function version switched log entry, which a version 1 run never holds, so it reads as
 * it is (FND-81).
 */
const fromVersion1 = (record: Record<string, unknown>): Record<string, unknown> => ({
    ...record,
    schemaVersion: 2,
});

/**
 * From version 2, before cities: version 3 gives each run's script a city. A version 2 record
 * reads as it is, and gets its city once it is checked, in `withCity` (FND-90).
 */
const fromVersion2 = (record: Record<string, unknown>): Record<string, unknown> => ({
    ...record,
    schemaVersion: 3,
});

/** The schema version saved runs had before orders had customers (FND-90). */
const BEFORE_CUSTOMERS = 3;

/** Whether a persisted script step creates an order without naming its customer and address. */
function isOrderWithoutCustomer(step: unknown): boolean {
    return (
        isRecord(step) &&
        step['command'] === 'create-order' &&
        (step['customer'] === undefined || step['address'] === undefined)
    );
}

/**
 * From version 3, before customers: version 4 gives each order its customer and address. A run
 * that made no order reads as it is; one that made orders is refused, saying why, as nothing is
 * made up for it (FND-90).
 */
function fromVersion3(record: Record<string, unknown>): Record<string, unknown> {
    const { run } = record;
    const script = isRecord(run) ? run['script'] : undefined;
    const steps = isRecord(script) && Array.isArray(script['steps']) ? script['steps'] : [];
    if (steps.some(isOrderWithoutCustomer)) {
        throw new Error(
            'This saved run was saved before orders had customers: its create-order steps name no customer or address, so this release cannot read it.',
        );
    }
    return { ...record, schemaVersion: BEFORE_CUSTOMERS + 1 };
}

/** The schema version saved runs had before drivers went to wait at waiting points (FND-90). */
const BEFORE_WAITING_POINTS = 4;

/** A persisted rider marked to stay where their last stop leaves them, as they did. */
const staying = (rider: unknown): unknown =>
    isRecord(rider) ? { ...rider, isStayingWhenIdle: true } : rider;

/**
 * From version 4, before waiting points: version 5 sends a driver with no stop due to their
 * area's waiting point. Each rider of a version 4 run is marked to stay where they finish, so the
 * run goes on as it was run (FND-90).
 */
function fromVersion4(record: Record<string, unknown>): Record<string, unknown> {
    const { run } = record;
    const script = isRecord(run) ? run['script'] : undefined;
    const next = { ...record, schemaVersion: BEFORE_WAITING_POINTS + 1 };
    if (!isRecord(run) || !isRecord(script) || !Array.isArray(script['riders'])) {
        return next;
    }
    const riders = script['riders'].map(staying);
    return { ...next, run: { ...run, script: { ...script, riders } } };
}

/** The schema version saved runs had before a driver's status and location were their own. */
const BEFORE_DRIVER_PARTS = 5;

/**
 * Whether a persisted run's start holds drivers kept as before, each status and location inside
 * the driver's version, with no statuses of their own.
 */
function hasDriversAsBefore(run: unknown): boolean {
    const start = isRecord(run) ? run['start'] : undefined;
    const state = isRecord(start) ? start['state'] : undefined;
    const drivers = isRecord(state) ? state['drivers'] : undefined;
    const versions = isRecord(drivers) ? drivers['driverVersions'] : undefined;
    const hasDrivers = Array.isArray(versions) && versions.length > 0;
    return hasDrivers && isRecord(drivers) && drivers['statuses'] === undefined;
}

/**
 * From version 5, before a driver's status and location had versions of their own: version 6
 * keeps each apart from the driver's version. A run with no drivers reads as it is; one with
 * drivers is refused, saying why, as nothing is made up for it (FND-81, FND-90).
 */
function fromVersion5(record: Record<string, unknown>): Record<string, unknown> {
    if (hasDriversAsBefore(record['run'])) {
        throw new Error(
            "This saved run was saved before a driver's status and location had versions of their own, so this release cannot read it.",
        );
    }
    return { ...record, schemaVersion: BEFORE_DRIVER_PARTS + 1 };
}

/** The schema version saved runs had before an order's status was read from its events. */
const BEFORE_ORDER_EVENTS = 6;

/**
 * Whether a persisted value holds an order version kept as before, which held its readiness, its
 * status, and its driver, anywhere in a run's start or commits.
 */
function hasOrdersAsBefore(value: unknown): boolean {
    if (Array.isArray(value)) {
        return value.some(hasOrdersAsBefore);
    }
    if (!isRecord(value)) {
        return false;
    }
    // An order's version, linked to the one before it: an order's log entry holds its flags too.
    const isOrderVersion = 'previous' in value && 'number' in value && 'orderId' in value;
    if (isOrderVersion && 'isReady' in value) {
        return true;
    }
    return Object.values(value).some(hasOrdersAsBefore);
}

/**
 * From version 6, before an order's status, driver, and readiness were read from its events:
 * version 7 keeps only whether a request is pending in the order's version. A run with no order
 * kept as before reads as it is; one with such orders is refused, saying why, as nothing is made
 * up for it (FND-73, FND-90).
 */
function fromVersion6(record: Record<string, unknown>): Record<string, unknown> {
    const { run } = record;
    if (hasOrdersAsBefore(run)) {
        throw new Error(
            "This saved run was saved before an order's status was read from its events, so this release cannot read it.",
        );
    }
    return { ...record, schemaVersion: BEFORE_ORDER_EVENTS + 1 };
}

/** The schema version saved runs had before Deliveries' copy of an order was its own record. */
const BEFORE_ORDER_COPIES = 7;

/** Whether a persisted value holds a delivery's version kept as before, with its copy inside. */
function hasDeliveriesAsBefore(value: unknown): boolean {
    if (Array.isArray(value)) {
        return value.some(hasDeliveriesAsBefore);
    }
    if (!isRecord(value)) {
        return false;
    }
    if ('orderDeliveryId' in value && 'orderCopy' in value) {
        return true;
    }
    return Object.values(value).some(hasDeliveriesAsBefore);
}

/**
 * From version 7, before Deliveries' copy of an order had versions of its own: version 8 keeps
 * it apart from the delivery's. A run with no delivery kept as before reads as it is; one with
 * such deliveries is refused, saying why, as nothing is made up for it (FND-81).
 */
function fromVersion7(record: Record<string, unknown>): Record<string, unknown> {
    if (hasDeliveriesAsBefore(record['run'])) {
        throw new Error(
            "This saved run was saved before Deliveries' copy of an order was a record of its own, so this release cannot read it.",
        );
    }
    return { ...record, schemaVersion: BEFORE_ORDER_COPIES + 1 };
}

/** Each migration, by the schema version it reads, in turn up to this release's. */
const MIGRATIONS: ReadonlyMap<number, Migration> = new Map([
    [0, fromVersion0],
    [1, fromVersion1],
    [2, fromVersion2],
    [BEFORE_CUSTOMERS, fromVersion3],
    [BEFORE_WAITING_POINTS, fromVersion4],
    [BEFORE_DRIVER_PARTS, fromVersion5],
    [BEFORE_ORDER_EVENTS, fromVersion6],
    [BEFORE_ORDER_COPIES, fromVersion7],
]);

/**
 * A stored record migrated up to this release's schema version, one step at a time, refusing a
 * record of a later version than this release reads, or one with no way up (FND-57).
 */
export function migrated(value: unknown): Record<string, unknown> {
    if (!isRecord(value)) {
        throw new Error('A saved run record is not a record.');
    }
    const version = typeof value['schemaVersion'] === 'number' ? value['schemaVersion'] : 0;
    if (version > SAVED_RUN_SCHEMA_VERSION) {
        throw new Error(
            `A saved run has schema version ${version}, and this release reads up to ${SAVED_RUN_SCHEMA_VERSION}.`,
        );
    }
    if (version === SAVED_RUN_SCHEMA_VERSION) {
        return value;
    }
    const step = MIGRATIONS.get(version);
    if (step === undefined) {
        throw new Error(`No migration reads saved runs of schema version ${version}.`);
    }
    const next = step(value);
    return migrated(next);
}

/** Whether a migrated record is a saved run's records, as this release writes them. */
export function isPersistedSavedRunBody(
    value: Record<string, unknown>,
): value is Record<string, unknown> & IPersistedSavedRunBody {
    const { run } = value;
    return (
        isRecord(run) &&
        Array.isArray(run['branches']) &&
        isRecord(run['script']) &&
        isRecord(run['start']) &&
        typeof run['current'] === 'string'
    );
}

/** Whether a migrated record is what is told of a saved run, as this release writes it. */
export function isPersistedSavedRunSummary(
    value: Record<string, unknown>,
): value is Record<string, unknown> & IPersistedSavedRunSummary {
    return (
        typeof value['name'] === 'string' &&
        typeof value['level'] === 'string' &&
        isRecord(value['scenario']) &&
        typeof value['savedAt'] === 'number' &&
        isRecord(value['size'])
    );
}

/**
 * A saved run's records as this release reads them, with a city in the run's script: one saved
 * before runs had cities gets one around its places, or is refused (FND-90).
 */
export function withCity(body: IPersistedSavedRunBody): IPersistedSavedRunBody {
    const run = withPersistedCity(body.run);
    return run === body.run ? body : { ...body, run };
}
