import { IDBFactory, IDBObjectStore as FakeObjectStore } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RunLevel, toSavedRunId } from '../application-core/run-history/saved-run';
import type { SaveOutcome, SavedRunId } from '../application-core/run-history/saved-run';
import { ONE_ORDER_SCENARIO } from '../application-core/scenarios/one-order.testing';
import type { IRunToSave, ISavedRunStores } from '../application/run-history/saved-runs';
import { deleteSavedRun, saveRun } from '../application/run-history/saved-runs';
import { toCalendarTime } from '../domain/simulation-engine/numbers';
import { IndexedDbRunRepository } from '../infrastructure/run-history/indexed-db-run-repository';
import { IndexedDbScenarioRepository } from '../infrastructure/scenarios/indexed-db-scenario-repository';
import { oneOrderRun } from '../infrastructure/simulation-engine/sample-runs.testing';

const RUN = oneOrderRun();

/** Both stores over one fresh, empty browser storage. */
function freshStores(): ISavedRunStores {
    const factory = new IDBFactory();
    const runs = new IndexedDbRunRepository(factory);
    const scenarios = new IndexedDbScenarioRepository(factory);
    return { runs, scenarios };
}

/** A run of the one-order scenario to save under a name. */
const toSave = (name: string): IRunToSave => ({
    name,
    level: RunLevel.Everything,
    scenario: ONE_ORDER_SCENARIO,
    savedAt: toCalendarTime(1),
    run: RUN,
});

function idOf(outcome: SaveOutcome): SavedRunId {
    if (!outcome.isOk) {
        throw new Error(outcome.message);
    }
    return outcome.saved.id;
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('saving a run with the scenario it ran', () => {
    it('stores the scenario as a version the saved run points at', async () => {
        const stores = freshStores();
        const save = toSave('first');

        const outcome = await saveRun(stores, save);

        const versions = await stores.scenarios.versionsOf(ONE_ORDER_SCENARIO.name);
        const [version] = versions;
        expect(outcome).toMatchObject({ isOk: true, saved: { scenario: { number: 1 } } });
        expect(version?.scenario).toEqual(ONE_ORDER_SCENARIO);
    });

    it('keeps the version while the run is saved, even after the scenario is deleted', async () => {
        const stores = freshStores();
        const save = toSave('kept');
        const outcome = await saveRun(stores, save);
        const id = idOf(outcome);

        await stores.scenarios.delete(ONE_ORDER_SCENARIO.name);
        const whileSaved = await stores.scenarios.versionsOf(ONE_ORDER_SCENARIO.name);
        await deleteSavedRun(stores, id);
        const afterDelete = await stores.scenarios.versionsOf(ONE_ORDER_SCENARIO.name);

        expect(whileSaved).toHaveLength(1);
        expect(afterDelete).toEqual([]);
    });

    it('notes no use of the version when the run does not fit', async () => {
        const stores = freshStores();
        const full = new DOMException('The quota was exceeded.', 'QuotaExceededError');
        const add = vi.spyOn(FakeObjectStore.prototype, 'add');
        add.mockImplementationOnce(() => {
            throw full;
        });
        const save = toSave('too big');

        const outcome = await saveRun(stores, save);
        await stores.scenarios.delete(ONE_ORDER_SCENARIO.name);

        const kept = await stores.scenarios.versionsOf(ONE_ORDER_SCENARIO.name);
        expect(outcome.isOk).toBe(false);
        expect(kept).toEqual([]);
    });

    it('does nothing when deleting a saved run that is not there', async () => {
        const stores = freshStores();
        const missing = toSavedRunId('saved-run-9');

        await deleteSavedRun(stores, missing);

        const listed = await stores.runs.list();
        expect(listed).toEqual([]);
    });
});
