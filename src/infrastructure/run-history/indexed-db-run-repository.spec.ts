import { IDBFactory, IDBObjectStore as FakeObjectStore } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
    ILoadProgress,
    ISaveRequest,
    SaveOutcome,
    SavedRunId,
} from '../../application-core/run-history/saved-run';
import { RunLevel, SaveProblem, toSavedRunId } from '../../application-core/run-history/saved-run';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import { toCalendarTime } from '../../domain/simulation-engine/numbers';
import { toVersionNumber } from '../../domain/system/records/version-chain';
import { toPersistedRun } from '../simulation-engine/persisted-run';
import { MAIN_BRANCH, toBranchId } from '../../application-core/simulation-engine/branch-id';
import { deleteBranch } from '../../application-core/simulation-engine/run-branches';
import { forkedRun, oneOrderRun, riddenOrderRun } from '../simulation-engine/sample-runs.testing';
import { committed, opened } from '../system/storage/indexed-db';
import { IndexedDbRunRepository, RUN_DATABASE } from './indexed-db-run-repository';
import { SAVED_RUN_SCHEMA_VERSION } from './persisted-saved-run';

/** Comparing two whole runs field by field can take seconds under a loaded coverage run. */
const WHOLE_RUN_TIMEOUT_MS = 30_000;
const SCENARIO = { name: 'One order, happy path', number: toVersionNumber(1) };
const SAVED_AT = toCalendarTime(1_700_000_000_000);
const RUN = oneOrderRun();
const RIDDEN = riddenOrderRun();
const NOT_AN_ID = toSavedRunId('not-an-id');
const NOT_A_NUMBER = toSavedRunId('saved-run-x');
const PUT_BY_HAND = toSavedRunId('saved-run-7');

/** A save of a run, under a name, at a level, everything unless said. */
const saving = (
    name: string,
    run: IRunState = RUN,
    level: RunLevel = RunLevel.Everything,
): ISaveRequest => ({
    name,
    level,
    scenario: SCENARIO,
    savedAt: SAVED_AT,
    run,
});

/** The ID a save gave, which must have succeeded. */
function idOf(outcome: SaveOutcome): SavedRunId {
    if (!outcome.isOk) {
        throw new Error(outcome.message);
    }
    return outcome.saved.id;
}

/** A repository over a fresh, empty browser storage. */
function freshStorage(): { factory: IDBFactory; repository: IndexedDbRunRepository } {
    const factory = new IDBFactory();
    const repository = new IndexedDbRunRepository(factory);
    return { factory, repository };
}

/** Puts a saved run's raw records straight into storage, as another release wrote them. */
async function putRaw(factory: IDBFactory, body: unknown, summary: unknown): Promise<void> {
    const database = await opened(factory, RUN_DATABASE, SAVED_RUN_SCHEMA_VERSION, () => {
        throw new Error('The stores should already be there.');
    });
    const transaction = database.transaction(['runs', 'summaries'], 'readwrite');
    const done = new Promise<void>((resolve) => {
        transaction.oncomplete = (): void => {
            resolve();
        };
    });
    const runs = transaction.objectStore('runs');
    const summaries = transaction.objectStore('summaries');
    runs.put(body, 7);
    summaries.put(summary, 7);
    await done;
}

/** A repository whose storage already holds records another release wrote. */
/** The one-order run persisted as before cities, with its restaurant in the area given. */
function withoutCity(area: string): unknown {
    const persisted = toPersistedRun(RUN);
    const fields = Object.entries(persisted.script).filter(([key]) => key !== 'city');
    const script = Object.fromEntries(fields) as typeof persisted.script;
    const [restaurant] = script.restaurants;
    const placed = { ...script, restaurants: [{ ...restaurant!, areaId: area }] };
    return { ...persisted, script: placed };
}

async function holding(body: unknown, summary: unknown): Promise<IndexedDbRunRepository> {
    const { factory, repository } = freshStorage();
    await repository.list();
    await putRaw(factory, body, summary);
    return repository;
}

/** Makes every add to storage throw, as storage does when it refuses one. */
function addingThrows(error: Error): void {
    vi.spyOn(FakeObjectStore.prototype, 'add').mockImplementation(() => {
        throw error;
    });
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('saving runs in browser storage', () => {
    it('gives back a run saved at everything', { timeout: WHOLE_RUN_TIMEOUT_MS }, async () => {
        const { repository } = freshStorage();
        const request = saving('first');

        const outcome = await repository.save(request);
        const id = idOf(outcome);
        const loaded = await repository.load(id);

        expect(loaded).toEqual(RUN);
    });

    it(
        'gives back a run saved at minimum, telling its progress as it works each root out',
        { timeout: WHOLE_RUN_TIMEOUT_MS },
        async () => {
            const { repository } = freshStorage();
            const request = saving('small', RUN, RunLevel.Minimum);
            const told: ILoadProgress[] = [];

            const outcome = await repository.save(request);
            const id = idOf(outcome);
            const loaded = await repository.load(id, (progress) => {
                told.push(progress);
            });
            const [listed] = await repository.list();

            expect(loaded).toEqual(RUN);
            expect(listed?.level).toBe(RunLevel.Minimum);
            expect(told.at(-1)?.done).toBe(RUN.line.commits.size);
        },
    );

    it('tells each saved run without loading it: its name, level, scenario, and size', async () => {
        const { repository } = freshStorage();
        const forked = forkedRun();
        const persisted = toPersistedRun(forked);
        const everyCommitOnce = persisted.branches.reduce(
            (sum, branch) => sum + branch.commits.length,
            0,
        );
        const request = saving('forked', forked);

        await repository.save(request);
        const [saved] = await repository.list();

        expect(saved).toMatchObject({
            id: 'saved-run-1',
            name: 'forked',
            level: RunLevel.Everything,
            scenario: SCENARIO,
            savedAt: SAVED_AT,
            size: { commits: everyCommitOnce, branches: 2 },
        });
        expect(saved!.size.bytes).toBeGreaterThan(everyCommitOnce);
        const found = await repository.find(saved!.id);
        expect(found).toEqual(saved);
    });

    it('gives each save its own ID, so two saved runs can share a name', async () => {
        const { repository } = freshStorage();
        const request = saving('same');

        await repository.save(request);
        await repository.save(request);

        const listed = await repository.list();
        const ids = listed.map((saved) => saved.id);
        expect(ids).toEqual(['saved-run-1', 'saved-run-2']);
    });

    it('deletes a saved run, and has nothing for an ID it never gave', async () => {
        const { repository } = freshStorage();
        const request = saving('gone');
        const outcome = await repository.save(request);
        const id = idOf(outcome);

        await repository.delete(id);
        await repository.delete(NOT_AN_ID);

        const listed = await repository.list();
        const loaded = await repository.load(id);
        const notAnId = await repository.load(NOT_AN_ID);
        const notANumber = await repository.find(NOT_A_NUMBER);
        expect([listed, loaded, notAnId, notANumber]).toEqual([
            [],
            undefined,
            undefined,
            undefined,
        ]);
    });

    it('stores nothing, and says why, when browser storage has no room', async () => {
        const { repository } = freshStorage();
        const full = new DOMException('The quota was exceeded.', 'QuotaExceededError');
        addingThrows(full);
        const request = saving('too big');

        const outcome = await repository.save(request);

        expect(outcome).toMatchObject({ isOk: false, problem: SaveProblem.StorageFull });
        const message = outcome.isOk ? '' : outcome.message;
        expect(message).toMatch(/takes \d+ MB\. Nothing was saved\./);
        vi.restoreAllMocks();
        const listed = await repository.list();
        expect(listed).toEqual([]);
    });

    it('passes on any other failure', async () => {
        const { repository } = freshStorage();
        const broken = new Error('Something else went wrong.');
        addingThrows(broken);
        const request = saving('broken');

        const saved = repository.save(request);

        await expect(saved).rejects.toThrow('Something else went wrong.');
    });
});

describe('moving a saved run between levels', () => {
    it(
        'moves down and back up, keeping its ID and giving back the same run',
        { timeout: WHOLE_RUN_TIMEOUT_MS },
        async () => {
            const { repository } = freshStorage();
            const request = saving('moved', RUN);
            const saved = await repository.save(request);
            const id = idOf(saved);
            const told: ILoadProgress[] = [];

            const down = await repository.moveTo(id, RunLevel.Minimum);
            const atMinimum = await repository.load(id);
            const up = await repository.moveTo(id, RunLevel.Everything, (progress) => {
                told.push(progress);
            });
            const atEverything = await repository.load(id);

            expect(down).toMatchObject({ isOk: true, saved: { id, level: RunLevel.Minimum } });
            expect(up).toMatchObject({ isOk: true, saved: { id, level: RunLevel.Everything } });
            expect(atMinimum).toEqual(RUN);
            expect(atEverything).toEqual(RUN);
            expect(told.at(-1)?.done).toBe(RUN.line.commits.size);
        },
    );

    it('takes fewer bytes at minimum, and as many again once moved back up', async () => {
        const { repository } = freshStorage();
        const request = saving('sized', RUN);
        const saved = await repository.save(request);
        const id = idOf(saved);

        const down = await repository.moveTo(id, RunLevel.Minimum);
        const up = await repository.moveTo(id, RunLevel.Everything);

        const bytes = [saved, down, up].map((outcome) =>
            outcome?.isOk === true ? outcome.saved.size.bytes : 0,
        );
        expect(bytes[1]).toBeLessThan(bytes[0]!);
        expect(bytes[2]).toBe(bytes[0]);
    });

    it('leaves a run already at the level as it is, and has nothing for an unknown ID', async () => {
        const { repository } = freshStorage();
        const request = saving('stays', RUN);
        const saved = await repository.save(request);
        const id = idOf(saved);

        const same = await repository.moveTo(id, RunLevel.Everything);
        const unknown = await repository.moveTo(NOT_AN_ID, RunLevel.Minimum);
        const missing = await repository.moveTo(PUT_BY_HAND, RunLevel.Minimum);

        expect(same).toEqual(saved);
        expect([unknown, missing]).toEqual([undefined, undefined]);
    });

    it('keeps the old level, and says why, when the moved run does not fit', async () => {
        const { repository } = freshStorage();
        const request = saving('full', RUN, RunLevel.Minimum);
        const saved = await repository.save(request);
        const id = idOf(saved);
        const full = new DOMException('The quota was exceeded.', 'QuotaExceededError');
        vi.spyOn(FakeObjectStore.prototype, 'put').mockImplementation(() => {
            throw full;
        });

        const moved = await repository.moveTo(id, RunLevel.Everything);
        vi.restoreAllMocks();
        const [listed] = await repository.list();

        expect(moved).toMatchObject({ isOk: false, problem: SaveProblem.StorageFull });
        expect(listed?.level).toBe(RunLevel.Minimum);
    });

    it('passes on any other failure while moving', async () => {
        const { repository } = freshStorage();
        const request = saving('broken', RUN);
        const saved = await repository.save(request);
        const id = idOf(saved);
        const broken = new Error('Something else went wrong.');
        vi.spyOn(FakeObjectStore.prototype, 'put').mockImplementation(() => {
            throw broken;
        });

        const moving = repository.moveTo(id, RunLevel.Minimum);

        await expect(moving).rejects.toThrow('Something else went wrong.');
    });
});

describe('deleting a branch of a saved run', () => {
    it.each<[RunLevel]>([[RunLevel.Everything], [RunLevel.Minimum]])(
        'gives the same run as deleting it from the run itself, at %s',
        { timeout: WHOLE_RUN_TIMEOUT_MS },
        async (level) => {
            const { repository } = freshStorage();
            const forked = forkedRun();
            const fork = forked.history.current;
            const request = saving('forked', forked, level);
            const saved = await repository.save(request);
            const id = idOf(saved);

            const outcome = await repository.deleteBranch(id, fork);
            const loaded = await repository.load(id);

            const expected = deleteBranch(forked, fork);
            expect(outcome).toMatchObject({ isOk: true, saved: { id, level } });
            expect(outcome?.isOk === true ? outcome.saved.size.branches : 0).toBe(1);
            expect(loaded).toEqual(expected);
        },
    );

    it('leaves a saved run without the branch as it is, and has nothing for an unknown ID', async () => {
        const { repository } = freshStorage();
        const request = saving('one branch', RUN);
        const saved = await repository.save(request);
        const id = idOf(saved);
        const notThere = toBranchId('fork-9');

        const left = await repository.deleteBranch(id, notThere);
        const unknown = await repository.deleteBranch(NOT_AN_ID, notThere);
        const missing = await repository.deleteBranch(PUT_BY_HAND, notThere);

        expect(left).toEqual(saved);
        expect([unknown, missing]).toEqual([undefined, undefined]);
    });

    it('refuses Main, and a branch another forks from', async () => {
        const { repository } = freshStorage();
        const forked = forkedRun();
        const request = saving('forked', forked);
        const saved = await repository.save(request);
        const id = idOf(saved);

        const deleting = repository.deleteBranch(id, MAIN_BRANCH);

        await expect(deleting).rejects.toThrow('no forks of its own');
    });
});

describe('the schema of saved runs', () => {
    const summary = {
        name: 'older',
        level: 'Everything',
        scenario: SCENARIO,
        savedAt: 1,
        size: { bytes: 1, commits: 1, branches: 1 },
    };

    it(
        'migrates a made-up record of schema version 0, whose branches were called timelines',
        { timeout: WHOLE_RUN_TIMEOUT_MS },
        async () => {
            const { branches, ...rest } = toPersistedRun(RUN);
            const older = { run: { ...rest, timelines: branches } };
            const repository = await holding(older, summary);

            const loaded = await repository.load(PUT_BY_HAND);
            const [listed] = await repository.list();

            expect(loaded).toEqual(RUN);
            expect(listed).toMatchObject({ id: 'saved-run-7', name: 'older' });
        },
    );

    it(
        'reads a run saved at schema version 1, in a database made at version 1',
        { timeout: WHOLE_RUN_TIMEOUT_MS },
        async () => {
            const factory = new IDBFactory();
            const version1 = await opened(factory, RUN_DATABASE, 1, (database) => {
                database.createObjectStore('runs', { autoIncrement: true });
                database.createObjectStore('summaries');
            });
            const transaction = version1.transaction(['runs', 'summaries'], 'readwrite');
            const done = committed(transaction);
            const run = toPersistedRun(RUN);
            transaction.objectStore('runs').put({ schemaVersion: 1, run }, 7);
            transaction.objectStore('summaries').put({ ...summary, schemaVersion: 1 }, 7);
            await done;
            version1.close();
            const repository = new IndexedDbRunRepository(factory);

            const loaded = await repository.load(PUT_BY_HAND);
            const [listed] = await repository.list();

            expect(loaded).toEqual(RUN);
            expect(listed).toMatchObject({ id: 'saved-run-7', name: 'older' });
        },
    );

    it(
        'gives a run saved at schema version 2, with no city, one around its places',
        { timeout: WHOLE_RUN_TIMEOUT_MS },
        async () => {
            const run = withoutCity('area-1');
            const repository = await holding({ schemaVersion: 2, run }, summary);

            const loaded = await repository.load(PUT_BY_HAND);

            const city = loaded!.script.city!;
            const restaurant = loaded!.script.restaurants.first()!;
            const names = city.areaIds.toArray();
            expect(names).toEqual(['area-1']);
            const area = city.areaAt(restaurant.coordinates);
            expect(area).toBe('area-1');
        },
    );

    it('refuses a run saved at schema version 2 whose places use several areas', async () => {
        const run = withoutCity('area-2');
        const repository = await holding({ schemaVersion: 2, run }, summary);

        const loading = repository.load(PUT_BY_HAND);

        await expect(loading).rejects.toThrow(
            'This saved run uses several areas (area-2, area-1)',
        );
    });

    it('refuses a run saved at schema version 3 that made orders without customers', async () => {
        const persisted = toPersistedRun(RUN);
        const steps = persisted.script.steps.map((step) => {
            const fields = Object.entries(step).filter(
                ([key]) => key !== 'customer' && key !== 'address',
            );
            return Object.fromEntries(fields) as typeof step;
        });
        const run = { ...persisted, script: { ...persisted.script, steps } };
        const repository = await holding({ schemaVersion: 3, run }, summary);

        const loading = repository.load(PUT_BY_HAND);

        await expect(loading).rejects.toThrow(
            'This saved run was saved before orders had customers',
        );
    });

    it('keeps the drivers of a run saved at schema version 4 where they finish', async () => {
        const run = toPersistedRun(RIDDEN);
        const repository = await holding({ schemaVersion: 4, run }, summary);

        const loaded = await repository.load(PUT_BY_HAND);

        const riders = loaded!.script.riders.valueSeq().map((rider) => rider.isStayingWhenIdle);
        const marks = riders.toArray();
        expect(marks).toEqual([true]);
    });

    it('sends the drivers of a run saved now to wait, marking none of them', async () => {
        const { repository } = freshStorage();
        const request = saving('ridden', RIDDEN);

        const outcome = await repository.save(request);
        const id = idOf(outcome);
        const loaded = await repository.load(id);

        const riders = loaded!.script.riders.valueSeq().map((rider) => rider.isStayingWhenIdle);
        const marks = riders.toArray();
        expect(marks).toEqual([undefined]);
    });

    it('refuses a run saved at schema version 5 whose drivers kept their status and location inside', async () => {
        const persisted = toPersistedRun(RUN);
        const fields = Object.entries(persisted.start.state.drivers).filter(
            ([key]) => key !== 'statuses' && key !== 'locations',
        );
        const drivers = Object.fromEntries(fields) as typeof persisted.start.state.drivers;
        const state = { ...persisted.start.state, drivers };
        const run = { ...persisted, start: { ...persisted.start, state } };
        const repository = await holding({ schemaVersion: 5, run }, summary);

        const loading = repository.load(PUT_BY_HAND);

        await expect(loading).rejects.toThrow(
            "This saved run was saved before a driver's status and location had versions of their own",
        );
    });

    it('refuses a run saved at schema version 6 whose orders kept their status inside', async () => {
        const persisted = toPersistedRun(RUN);
        const text = JSON.stringify(persisted);
        const asBefore = text.replaceAll(
            '"isDeliveryRequestPending":',
            '"status":"Created","isReady":false,"driverId":null,"isDeliveryRequestPending":',
        );
        const old = JSON.parse(asBefore) as typeof persisted;
        const repository = await holding({ schemaVersion: 6, run: old }, summary);

        const loading = repository.load(PUT_BY_HAND);

        await expect(loading).rejects.toThrow(
            "This saved run was saved before an order's status was read from its events",
        );
    });

    it('refuses a run saved at schema version 7 whose deliveries kept their copy inside', async () => {
        const persisted = toPersistedRun(RUN);
        const text = JSON.stringify(persisted);
        const asBefore = text.replaceAll(
            '"orderDeliveryId":',
            '"orderCopy":{"status":"Created","version":1,"eventIds":[]},"orderDeliveryId":',
        );
        const old = JSON.parse(asBefore) as typeof persisted;
        const repository = await holding({ schemaVersion: 7, run: old }, summary);

        const loading = repository.load(PUT_BY_HAND);

        await expect(loading).rejects.toThrow(
            "This saved run was saved before Deliveries' copy of an order was a record of its own",
        );
    });

    it('refuses a record of a later schema version than this release reads', async () => {
        const repository = await holding({ schemaVersion: 9, run: {} }, { schemaVersion: 9 });

        const loading = repository.load(PUT_BY_HAND);
        const listing = repository.list();

        await expect(loading).rejects.toThrow('schema version 9, and this release reads up to 8');
        await expect(listing).rejects.toThrow('schema version 9');
    });

    it('refuses a record not of the shape this release writes, or not a record at all', async () => {
        const repository = await holding({ schemaVersion: 1, run: { branches: 'x' } }, 'text');

        const loading = repository.load(PUT_BY_HAND);
        const listing = repository.list();

        await expect(loading).rejects.toThrow('not of the shape this release writes');
        await expect(listing).rejects.toThrow('not a record');
    });

    it('refuses a summary not of the shape this release writes', async () => {
        const repository = await holding({ schemaVersion: 1, run: {} }, { schemaVersion: 1 });

        const listing = repository.list();

        await expect(listing).rejects.toThrow('summary is not of the shape');
    });

    it('refuses a record of a schema version no migration reads', async () => {
        const repository = await holding({ schemaVersion: -1, run: {} }, {});

        const loading = repository.load(PUT_BY_HAND);

        await expect(loading).rejects.toThrow(
            'No migration reads saved runs of schema version -1.',
        );
    });
});
