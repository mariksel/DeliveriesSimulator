import { List, Set as ImmutableSet } from 'immutable';
import {
    DEFAULT_SEND_EVERY,
    DEFAULT_SPEED_KMH,
} from '../../application-core/simulation-engine/rider';

import type { IScenario } from '../../application-core/scenarios/scenario';
import { ScenarioRepository } from '../../application-core/scenarios/scenario-repository';
import type {
    IShelfEntry,
    IShelvedVersion,
    IStored,
} from '../../application-core/scenarios/scenario-shelf';
import {
    deletedIn,
    releasedIn,
    storedIn,
    usedIn,
} from '../../application-core/scenarios/scenario-shelf';
import type {
    IScenarioVersion,
    IScenarioVersionRef,
    IStoredScenario,
    ScenarioUser,
} from '../../application-core/scenarios/scenario-version';
import {
    toScenarioContentKey,
    toScenarioUser,
} from '../../application-core/scenarios/scenario-version';
import { toVersionNumber } from '../../domain/system/records/version-chain';
import { committed, isRecord, opened, settled } from '../system/storage/indexed-db';
import type { IPersistedScenario } from './persisted-scenario';
import { persistedCityAround } from '../map-and-routing/city-around-records';
import { DEFAULT_BLOCK_METRES } from '../../domain/map-and-routing/city';
import {
    fromPersistedScenario,
    scenarioContentKey,
    toPersistedScenario,
} from './persisted-scenario';

/**
 * The schema version of stored scenarios this release writes (FND-57). Version 2 gives every
 * scenario a city; a version 1 record gets one as it is read. Version 3 gives scenarios customers,
 * and each create-order step its customer and address; an older record that creates an order is
 * refused, as nothing is made up for it (FND-90).
 */
export const SCENARIO_SCHEMA_VERSION = 3;

/** The oldest schema version this release reads. */
const OLDEST_SCHEMA_VERSION = 1;

/** The database scenarios are stored in, in browser storage. */
export const SCENARIO_DATABASE = 'deliveries-simulator-scenarios';

const SCENARIOS = 'scenarios';
const VERSIONS = 'versions';
const BY_NAME = 'byName';

/** A scenario's unchanging part, persisted. */
export interface IPersistedStoredScenario {
    readonly schemaVersion: number;
    readonly name: string;
    readonly latest: number;
    readonly isDeleted: boolean;
}

/** One version of a scenario, persisted with its content key and the saved runs using it. */
export interface IPersistedScenarioVersion {
    readonly schemaVersion: number;
    readonly name: string;
    readonly number: number;
    readonly contentKey: string;
    readonly users: readonly string[];
    readonly scenario: IPersistedScenario;
}

/** Refuses a record of a schema this release cannot read, or one not of this store's shape. */
function checkedSchema(value: unknown): Record<string, unknown> {
    if (!isRecord(value)) {
        throw new Error('A stored scenario record is not a record.');
    }
    const { schemaVersion } = value;
    const isRead =
        typeof schemaVersion === 'number' &&
        schemaVersion >= OLDEST_SCHEMA_VERSION &&
        schemaVersion <= SCENARIO_SCHEMA_VERSION;
    if (!isRead) {
        throw new Error(
            `A stored scenario has schema version ${String(schemaVersion)}, and this release reads ${OLDEST_SCHEMA_VERSION} to ${SCENARIO_SCHEMA_VERSION}.`,
        );
    }
    return value;
}

/** Whether a stored record is a scenario's unchanging part. */
function isStoredRecord(value: unknown): value is IPersistedStoredScenario {
    const record = checkedSchema(value);
    return (
        typeof record['name'] === 'string' &&
        typeof record['latest'] === 'number' &&
        typeof record['isDeleted'] === 'boolean'
    );
}

/** Whether a stored record is a scenario's version, as this repository writes them. */
function isVersionRecord(value: unknown): value is IPersistedScenarioVersion {
    const record = checkedSchema(value);
    return (
        typeof record['name'] === 'string' &&
        typeof record['number'] === 'number' &&
        typeof record['contentKey'] === 'string' &&
        Array.isArray(record['users']) &&
        isRecord(record['scenario'])
    );
}

/** A stored scenario's unchanging part, or undefined for none, refusing anything else. */
function storedRecordOf(value: unknown): IPersistedStoredScenario | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (!isStoredRecord(value)) {
        throw new Error('A stored scenario record is not of the shape this release writes.');
    }
    return value;
}

/**
 * A stored scenario version as this release reads it. One stored before scenarios had cities gets
 * one square area around its places, with the scenario's seed, and its content key is worked out
 * again for its new content; one that used several areas is refused (FND-90).
 */
function withCity(record: IPersistedScenarioVersion): IPersistedScenarioVersion {
    const { scenario } = record;
    const stored = scenario.start.city;
    if (stored !== undefined) {
        const blocked = stored.blockMetres === undefined ? withBlocks(record, stored) : record;
        return withRiders(blocked);
    }
    const restaurants = scenario.start.restaurants.map(({ areaId, coordinates }) => ({
        areaId,
        coordinates,
    }));
    const drivers = scenario.start.drivers.map(({ areaId, location }) => ({
        areaId,
        coordinates: location?.coordinates ?? null,
    }));
    const what = `The stored scenario "${record.name}", version ${record.number},`;
    const city = persistedCityAround([...restaurants, ...drivers], what, scenario.seed);
    const start = { ...scenario.start, city };
    const migrated = { ...scenario, start };
    const typed = fromPersistedScenario(migrated);
    const contentKey = scenarioContentKey(typed);
    const withAll = {
        ...record,
        schemaVersion: SCENARIO_SCHEMA_VERSION,
        contentKey,
        scenario: migrated,
    };
    return withRiders(withAll);
}

/**
 * A stored scenario version whose city has no blocks yet, as one stored before streets: it gets
 * 200-metre blocks, and its content key is worked out again for that content (FND-90).
 */
function withBlocks(
    record: IPersistedScenarioVersion,
    stored: NonNullable<IPersistedScenario['start']['city']>,
): IPersistedScenarioVersion {
    const city = { ...stored, blockMetres: DEFAULT_BLOCK_METRES };
    const scenario = { ...record.scenario, start: { ...record.scenario.start, city } };
    const typed = fromPersistedScenario(scenario);
    const contentKey = scenarioContentKey(typed);
    return { ...record, contentKey, scenario };
}

/**
 * A stored scenario version as stored before drivers' apps sent their locations: each driver
 * gets the default rider, as reading the scenario's file gives them, and its content key is worked
 * out again for that content (FND-90).
 */
function withRiders(record: IPersistedScenarioVersion): IPersistedScenarioVersion {
    const { start } = record.scenario;
    if (start.riders !== undefined) {
        return record;
    }
    const riders = start.drivers.map((driver) => ({
        driverId: driver.id,
        sendEveryMs: DEFAULT_SEND_EVERY.milliseconds,
        speedKmh: DEFAULT_SPEED_KMH,
    }));
    const scenario = { ...record.scenario, start: { ...start, riders } };
    const typed = fromPersistedScenario(scenario);
    const contentKey = scenarioContentKey(typed);
    return { ...record, contentKey, scenario };
}

/** The versions storage gave, migrated to this release's schema, refusing anything else. */
function versionRecordsOf(value: unknown): readonly IPersistedScenarioVersion[] {
    const records: readonly unknown[] = Array.isArray(value) ? value : [value];
    return records.map((record) => {
        if (!isVersionRecord(record)) {
            throw new Error('A stored scenario version is not of the shape this release writes.');
        }
        return withCity(record);
    });
}

const toPersistedStored = (scenario: IStoredScenario): IPersistedStoredScenario => ({
    schemaVersion: SCENARIO_SCHEMA_VERSION,
    name: scenario.name,
    latest: scenario.latest,
    isDeleted: scenario.isDeleted,
});

const fromPersistedStored = (scenario: IPersistedStoredScenario): IStoredScenario => ({
    name: scenario.name,
    latest: toVersionNumber(scenario.latest),
    isDeleted: scenario.isDeleted,
});

const toPersistedVersion = (shelved: IShelvedVersion): IPersistedScenarioVersion => ({
    schemaVersion: SCENARIO_SCHEMA_VERSION,
    name: shelved.version.name,
    number: shelved.version.number,
    contentKey: shelved.contentKey,
    users: shelved.users.toArray(),
    scenario: toPersistedScenario(shelved.version.scenario),
});

function fromPersistedVersion(persisted: IPersistedScenarioVersion): IShelvedVersion {
    const scenario = fromPersistedScenario(persisted.scenario);
    const number = toVersionNumber(persisted.number);
    const users = persisted.users.map(toScenarioUser);
    return {
        version: { name: persisted.name, number, scenario },
        contentKey: toScenarioContentKey(persisted.contentKey),
        users: ImmutableSet(users),
    };
}

const byNumber = (first: IShelvedVersion, second: IShelvedVersion): number =>
    first.version.number - second.version.number;

/**
 * Creates the stores the first time the database opens. A later schema version keeps the stores
 * there are, and migrates each record as it is read (FND-57).
 */
function created(database: IDBDatabase): void {
    if (!database.objectStoreNames.contains(SCENARIOS)) {
        database.createObjectStore(SCENARIOS, { keyPath: 'name' });
    }
    if (!database.objectStoreNames.contains(VERSIONS)) {
        const versions = database.createObjectStore(VERSIONS, { keyPath: ['name', 'number'] });
        versions.createIndex(BY_NAME, 'name');
    }
}

/** What a change to one name's records came to: the records after it, and its result. */
interface IChanged<TResult> {
    readonly entry: IShelfEntry;
    readonly result: TResult;
}

const resultless = (entry: IShelfEntry): IChanged<null> => ({ entry, result: null });

/**
 * Stores scenarios in IndexedDB, as an unchanging scenario by its name and a version for each
 * different content, which saved runs share (FND-81). Each call reads one name's records, applies
 * the core's rule for it, and writes back what changed, in one transaction. Records carry their
 * schema version, starting at 1.
 */
export class IndexedDbScenarioRepository extends ScenarioRepository {
    private opening: Promise<IDBDatabase> | null = null;

    constructor(
        private readonly factory: IDBFactory,
        private readonly databaseName: string = SCENARIO_DATABASE,
    ) {
        super();
    }

    store(scenario: IScenario): Promise<IScenarioVersion> {
        const contentKey = scenarioContentKey(scenario);
        return this.changed(scenario.name, (entry): IChanged<IScenarioVersion> => {
            const stored: IStored = storedIn(entry, scenario, contentKey);
            return { entry: stored.entry, result: stored.version };
        });
    }

    async version(ref: IScenarioVersionRef): Promise<IScenarioVersion | undefined> {
        const database = await this.database();
        const transaction = database.transaction(VERSIONS, 'readonly');
        const store = transaction.objectStore(VERSIONS);
        const request = store.get([ref.name, ref.number]);
        const found = await settled(request);
        if (found === undefined) {
            return undefined;
        }
        const [record] = versionRecordsOf(found);
        return record === undefined ? undefined : fromPersistedVersion(record).version;
    }

    async scenarios(): Promise<readonly IStoredScenario[]> {
        const database = await this.database();
        const transaction = database.transaction(SCENARIOS, 'readonly');
        const request = transaction.objectStore(SCENARIOS).getAll();
        const all = await settled(request);
        const records: readonly unknown[] = Array.isArray(all) ? all : [];
        return records.flatMap((record) => {
            const stored = storedRecordOf(record);
            return stored === undefined || stored.isDeleted ? [] : [fromPersistedStored(stored)];
        });
    }

    async versionsOf(name: string): Promise<readonly IScenarioVersion[]> {
        const database = await this.database();
        const transaction = database.transaction(VERSIONS, 'readonly');
        const index = transaction.objectStore(VERSIONS).index(BY_NAME);
        const request = index.getAll(name);
        const all = await settled(request);
        const shelved = versionRecordsOf(all).map(fromPersistedVersion).toSorted(byNumber);
        return shelved.map((each) => each.version);
    }

    async noteUse(ref: IScenarioVersionRef, user: ScenarioUser): Promise<void> {
        await this.changed(ref.name, (entry) => {
            const used = usedIn(entry, ref.number, user);
            return resultless(used);
        });
    }

    async releaseUse(ref: IScenarioVersionRef, user: ScenarioUser): Promise<void> {
        await this.changed(ref.name, (entry) => {
            const released = releasedIn(entry, ref.number, user);
            return resultless(released);
        });
    }

    async delete(name: string): Promise<void> {
        await this.changed(name, (entry) => {
            const deleted = deletedIn(entry);
            return resultless(deleted);
        });
    }

    /** The database, opened once, with its stores made on the first open. */
    private database(): Promise<IDBDatabase> {
        this.opening ??= opened(this.factory, this.databaseName, SCENARIO_SCHEMA_VERSION, created);
        return this.opening;
    }

    /** One name's records, as the core's rules take them. */
    private async entryOf(
        scenarios: IDBObjectStore,
        versions: IDBObjectStore,
        name: string,
    ): Promise<IShelfEntry> {
        const storedRequest = scenarios.get(name);
        const storedValue = await settled(storedRequest);
        const versionsRequest = versions.index(BY_NAME).getAll(name);
        const versionValues = await settled(versionsRequest);
        const stored = storedRecordOf(storedValue);
        const shelved = versionRecordsOf(versionValues).map(fromPersistedVersion);
        const ordered = shelved.toSorted(byNumber);
        return {
            scenario: stored === undefined ? null : fromPersistedStored(stored),
            versions: List(ordered),
        };
    }

    /**
     * Reads one name's records, applies a change to them, and writes back what changed: the
     * scenario put or deleted, each kept version put, and each version no longer kept deleted.
     */
    private async changed<TResult>(
        name: string,
        change: (entry: IShelfEntry) => IChanged<TResult>,
    ): Promise<TResult> {
        const database = await this.database();
        const transaction = database.transaction([SCENARIOS, VERSIONS], 'readwrite');
        const done = committed(transaction);
        const scenarios = transaction.objectStore(SCENARIOS);
        const versions = transaction.objectStore(VERSIONS);
        const before = await this.entryOf(scenarios, versions, name);
        const { entry: after, result } = change(before);
        if (after.scenario === null) {
            scenarios.delete(name);
        } else {
            const stored = toPersistedStored(after.scenario);
            scenarios.put(stored);
        }
        const keptNumbers = after.versions.map((each) => each.version.number);
        const kept = new Set(keptNumbers);
        before.versions
            .filter((each) => !kept.has(each.version.number))
            .forEach((each) => {
                versions.delete([name, each.version.number]);
            });
        after.versions.forEach((each) => {
            const persisted = toPersistedVersion(each);
            versions.put(persisted);
        });
        await done;
        return result;
    }
}
