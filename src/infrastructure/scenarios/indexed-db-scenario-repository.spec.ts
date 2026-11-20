import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';

import { toBuiltInScenarioId } from '../../application-core/scenarios/built-in-scenarios';
import { ONE_ORDER_SCENARIO } from '../../application-core/scenarios/one-order.testing';
import type { IScenario } from '../../application-core/scenarios/scenario';
import { toScenarioUser } from '../../application-core/scenarios/scenario-version';
import { toVersionNumber } from '../../domain/system/records/version-chain';
import { BundledScenarios } from './bundled-scenarios';
import {
    IndexedDbScenarioRepository,
    SCENARIO_DATABASE,
    SCENARIO_SCHEMA_VERSION,
} from './indexed-db-scenario-repository';
import { toPersistedScenario } from './persisted-scenario';
import { committed, opened } from '../system/storage/indexed-db';

const EDITED: IScenario = { ...ONE_ORDER_SCENARIO, description: 'Edited.' };
const AGAIN: IScenario = { ...ONE_ORDER_SCENARIO, description: 'Edited again.' };
const RUN = toScenarioUser('saved-run-1');
const FIRST = { name: ONE_ORDER_SCENARIO.name, number: toVersionNumber(1) };

/** A repository over a fresh, empty browser storage. */
function freshStorage(): { factory: IDBFactory; repository: IndexedDbScenarioRepository } {
    const factory = new IDBFactory();
    const repository = new IndexedDbScenarioRepository(factory);
    return { factory, repository };
}

/** Puts a raw record straight into a store, as a release with another schema might have. */
function putRaw(factory: IDBFactory, store: string, record: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = factory.open(SCENARIO_DATABASE, SCENARIO_SCHEMA_VERSION);
        request.onsuccess = (): void => {
            const transaction = request.result.transaction(store, 'readwrite');
            const objectStore = transaction.objectStore(store);
            objectStore.put(record);
            transaction.oncomplete = (): void => {
                resolve();
            };
            transaction.onerror = (): void => {
                const failed = new Error('could not put the record');
                reject(failed);
            };
        };
    });
}

/**
 * Stores the one-order scenario as a release at schema version 1 did: in a database made at
 * version 1, with no city, its restaurant in the area given and its drivers in area-1.
 */
async function storedAtVersion1(factory: IDBFactory, name: string, area: string): Promise<void> {
    const version1 = await opened(factory, SCENARIO_DATABASE, 1, (database) => {
        database.createObjectStore('scenarios', { keyPath: 'name' });
        const versions = database.createObjectStore('versions', { keyPath: ['name', 'number'] });
        versions.createIndex('byName', 'name');
    });
    const persisted = toPersistedScenario(ONE_ORDER_SCENARIO);
    const fields = Object.entries(persisted.start).filter(([key]) => key !== 'city');
    const start = Object.fromEntries(fields) as typeof persisted.start;
    const [restaurant] = start.restaurants;
    const placed = { ...start, restaurants: [{ ...restaurant!, areaId: area }] };
    const scenario = { ...persisted, start: placed };
    const transaction = version1.transaction(['scenarios', 'versions'], 'readwrite');
    const done = committed(transaction);
    transaction
        .objectStore('scenarios')
        .put({ schemaVersion: 1, name, latest: 1, isDeleted: false });
    transaction.objectStore('versions').put({
        schemaVersion: 1,
        name,
        number: 1,
        contentKey: 'old',
        users: [],
        scenario,
    });
    await done;
    version1.close();
}

describe('storing scenarios in browser storage', () => {
    it('gives version 1 first, the same version for identical content, and 2 for new content', async () => {
        const { repository } = freshStorage();

        const first = await repository.store(ONE_ORDER_SCENARIO);
        const same = await repository.store(ONE_ORDER_SCENARIO);
        const second = await repository.store(EDITED);

        expect([first.number, same.number, second.number]).toEqual([1, 1, 2]);
        expect(second.scenario).toEqual(EDITED);
    });

    it('finds a version again, with its whole content, and none for one not kept', async () => {
        const { repository } = freshStorage();
        await repository.store(ONE_ORDER_SCENARIO);

        const found = await repository.version(FIRST);
        const missing = await repository.version({ ...FIRST, number: toVersionNumber(9) });

        expect(found?.scenario).toEqual(ONE_ORDER_SCENARIO);
        expect(missing).toBeUndefined();
    });

    it('lists each scenario, and every version kept of one, oldest first', async () => {
        const { repository } = freshStorage();
        await repository.store(ONE_ORDER_SCENARIO);
        await repository.store(EDITED);

        const listed = await repository.scenarios();
        const versions = await repository.versionsOf(ONE_ORDER_SCENARIO.name);

        expect(listed).toEqual([{ name: ONE_ORDER_SCENARIO.name, latest: 2, isDeleted: false }]);
        const numbers = versions.map((version) => version.number);
        expect(numbers).toEqual([1, 2]);
    });

    it('keeps what is stored when the storage is opened again', async () => {
        const { factory, repository } = freshStorage();
        await repository.store(ONE_ORDER_SCENARIO);

        const reopened = new IndexedDbScenarioRepository(factory);
        const found = await reopened.version(FIRST);

        expect(found?.scenario).toEqual(ONE_ORDER_SCENARIO);
    });

    it('stores a built-in scenario as any other', async () => {
        const { repository } = freshStorage();
        const builtIns = new BundledScenarios();
        const id = toBuiltInScenarioId('one-order');
        const result = builtIns.scenario(id);
        const builtIn = result.isOk ? result.scenario : ONE_ORDER_SCENARIO;

        const version = await repository.store(builtIn);

        const found = await repository.version(version);
        expect(found?.scenario).toEqual(builtIn);
        expect(result.isOk).toBe(true);
    });
});

describe('a stored version in use by a saved run', () => {
    it('stays after its scenario is deleted, and goes once no saved run uses it', async () => {
        const { repository } = freshStorage();
        await repository.store(ONE_ORDER_SCENARIO);
        await repository.store(EDITED);
        await repository.noteUse(FIRST, RUN);

        await repository.delete(ONE_ORDER_SCENARIO.name);
        const listedAfterDelete = await repository.scenarios();
        const keptAfterDelete = await repository.versionsOf(ONE_ORDER_SCENARIO.name);
        await repository.releaseUse(FIRST, RUN);
        const keptAfterRelease = await repository.versionsOf(ONE_ORDER_SCENARIO.name);

        expect(listedAfterDelete).toEqual([]);
        const keptNumbers = keptAfterDelete.map((version) => version.number);
        expect(keptNumbers).toEqual([1]);
        expect(keptAfterRelease).toEqual([]);
    });

    it("keeps its name's numbering, so a scenario stored again carries on", async () => {
        const { repository } = freshStorage();
        await repository.store(ONE_ORDER_SCENARIO);
        await repository.store(EDITED);
        await repository.noteUse(FIRST, RUN);
        await repository.delete(ONE_ORDER_SCENARIO.name);

        const again = await repository.store(AGAIN);
        const back = await repository.store(ONE_ORDER_SCENARIO);

        expect(again.number).toBe(3);
        expect(back.number).toBe(1);
    });

    it('lets a name with nothing in use start at 1 again once deleted', async () => {
        const { repository } = freshStorage();
        await repository.store(ONE_ORDER_SCENARIO);
        await repository.store(EDITED);
        await repository.delete(ONE_ORDER_SCENARIO.name);

        const afresh = await repository.store(AGAIN);

        expect(afresh.number).toBe(1);
    });
});

describe('the schema of stored scenarios', () => {
    it('refuses a record of a schema version this release does not read', async () => {
        const { factory, repository } = freshStorage();
        await repository.store(ONE_ORDER_SCENARIO);
        await putRaw(factory, 'scenarios', { schemaVersion: 4, name: 'Later', latest: 1 });

        const listing = repository.scenarios();

        await expect(listing).rejects.toThrow(
            'A stored scenario has schema version 4, and this release reads 1 to 3.',
        );
    });

    it('gives a scenario stored at version 1, with no city, one around its places', async () => {
        const factory = new IDBFactory();
        const name = ONE_ORDER_SCENARIO.name;
        await storedAtVersion1(factory, name, 'area-1');
        const repository = new IndexedDbScenarioRepository(factory);

        const [version] = await repository.versionsOf(name);
        const listing = await repository.scenarios();

        const { city } = version!.scenario.start;
        const restaurant = version!.scenario.start.restaurants.get(0)!;
        const names = city!.areaIds.toArray();
        expect(names).toEqual(['area-1']);
        expect(city!.seed).toBe(ONE_ORDER_SCENARIO.seed);
        const area = city!.areaAt(restaurant.coordinates);
        expect(area).toBe('area-1');
        expect(listing).toHaveLength(1);
    });

    it('refuses a scenario stored before customers that creates an order, saying why', async () => {
        const { factory, repository } = freshStorage();
        await repository.store(ONE_ORDER_SCENARIO);
        const persisted = toPersistedScenario(ONE_ORDER_SCENARIO);
        const steps = persisted.steps.map((step) => {
            const fields = Object.entries(step).filter(
                ([key]) => key !== 'customer' && key !== 'address',
            );
            return Object.fromEntries(fields) as typeof step;
        });
        const name = ONE_ORDER_SCENARIO.name;
        const older = {
            schemaVersion: 2,
            name,
            number: 1,
            contentKey: 'old',
            users: [],
            scenario: { ...persisted, steps },
        };
        await putRaw(factory, 'versions', older);

        const versions = repository.versionsOf(name);

        await expect(versions).rejects.toThrow(
            `The stored scenario "${name}" was stored before orders had customers`,
        );
    });

    it('refuses a scenario stored at version 1 whose places use several areas', async () => {
        const factory = new IDBFactory();
        const name = ONE_ORDER_SCENARIO.name;
        await storedAtVersion1(factory, name, 'area-2');
        const repository = new IndexedDbScenarioRepository(factory);

        const versions = repository.versionsOf(name);

        await expect(versions).rejects.toThrow(
            `The stored scenario "${name}", version 1, uses several areas (area-2, area-1)`,
        );
    });

    it('refuses a record not of the shape this release writes', async () => {
        const { factory, repository } = freshStorage();
        await repository.store(ONE_ORDER_SCENARIO);
        await putRaw(factory, 'scenarios', { schemaVersion: 1, name: 'Odd' });
        await putRaw(factory, 'versions', { schemaVersion: 1, name: 'Odd', number: 1 });

        const listing = repository.scenarios();
        const versions = repository.versionsOf('Odd');

        await expect(listing).rejects.toThrow('not of the shape this release writes');
        await expect(versions).rejects.toThrow('not of the shape this release writes');
    });

    it('refuses something stored that is not a record at all', async () => {
        const { factory, repository } = freshStorage();
        await repository.store(ONE_ORDER_SCENARIO);
        await putRaw(factory, 'versions', {
            schemaVersion: 1,
            name: 'Text',
            number: 1,
            contentKey: 'k',
            users: [],
            scenario: 'not a scenario',
        });

        const versions = repository.versionsOf('Text');

        await expect(versions).rejects.toThrow('not of the shape this release writes');
    });
});
