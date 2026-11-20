import { IDBFactory, IDBObjectStore as FakeObjectStore } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RunLevel, SaveProblem } from '../application-core/run-history/saved-run';
import type { SaveOutcome, SavedRunId } from '../application-core/run-history/saved-run';
import { ONE_ORDER_SCENARIO } from '../application-core/scenarios/one-order.testing';
import { Ticker } from '../application-core/scenarios/ticker';
import type { ISavedRunStores } from '../application/run-history/saved-runs';
import { LiveRunState } from '../application/scenarios/live-run-state';
import { LiveScenarioRun, WallClock } from '../application/scenarios/live-scenario-run';
import { WatchedRun } from '../application/verification/watched-run';
import type { WallTime } from '../domain/simulation-engine/numbers';
import { toCalendarTime, toWallTime } from '../domain/simulation-engine/numbers';
import { IndexedDbRunRepository } from '../infrastructure/run-history/indexed-db-run-repository';
import { IndexedDbScenarioRepository } from '../infrastructure/scenarios/indexed-db-scenario-repository';
import { REGISTERED_FUNCTIONS } from '../infrastructure/simulation-engine/function-registry';

const SAVED_AT = toCalendarTime(1_762_700_000_000);
/** Comparing two whole runs field by field can take seconds under a loaded coverage run. */
const WHOLE_RUN_TIMEOUT_MS = 30_000;
const TICK_MS = 16;
const TICKS_BEFORE_SAVING = 20;

class FakeWallClock extends WallClock {
    time = 0;
    now(): WallTime {
        return toWallTime(this.time);
    }
}

class FakeTicker extends Ticker {
    onTick: (() => void) | null = null;
    start(onTick: () => void): void {
        this.onTick = onTick;
    }
    stop(): void {
        this.onTick = null;
    }
}

/** The one-order run, watched, with both stores over one fresh browser storage. */
function opened(): {
    watched: WatchedRun;
    live: LiveScenarioRun;
    wall: FakeWallClock;
    ticker: FakeTicker;
    stores: ISavedRunStores;
} {
    const wall = new FakeWallClock();
    const ticker = new FakeTicker();
    const live = new LiveScenarioRun(ONE_ORDER_SCENARIO, wall, REGISTERED_FUNCTIONS);
    const watched = new WatchedRun(live, ticker, () => undefined);
    const factory = new IDBFactory();
    const runs = new IndexedDbRunRepository(factory);
    const scenarios = new IndexedDbScenarioRepository(factory);
    return { watched, live, wall, ticker, stores: { runs, scenarios } };
}

/** Plays the browser's part for some ticks, while the run is running. */
function ticked(wall: FakeWallClock, ticker: FakeTicker, ticks: number): void {
    Array.from({ length: ticks }).forEach(() => {
        wall.time += TICK_MS;
        ticker.onTick?.();
    });
}

function idOf(outcome: SaveOutcome): SavedRunId {
    if (!outcome.isOk) {
        throw new Error(outcome.message);
    }
    return outcome.saved.id;
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('saving the watched run', () => {
    it(
        'pauses a running run, saves it as it stood, and runs on',
        { timeout: WHOLE_RUN_TIMEOUT_MS },
        async () => {
            const { watched, live, wall, ticker, stores } = opened();
            watched.start();
            ticked(wall, ticker, TICKS_BEFORE_SAVING);
            const before = live.runState;

            const outcome = await watched.save(stores, 'midway', RunLevel.Everything, SAVED_AT);
            const id = idOf(outcome);
            const saved = await stores.runs.load(id);

            expect(outcome).toMatchObject({
                isOk: true,
                saved: { name: 'midway', level: RunLevel.Everything, savedAt: SAVED_AT },
            });
            expect(saved).toEqual(before);
            expect(live.state).toBe(LiveRunState.Running);
            expect(ticker.onTick).not.toBeNull();
        },
    );

    it('leaves a paused run paused', async () => {
        const { watched, live, stores } = opened();

        await watched.save(stores, 'at the start', RunLevel.Minimum, SAVED_AT);

        expect(live.state).toBe(LiveRunState.Ready);
    });

    it('says why, and runs on, when the run does not fit', async () => {
        const { watched, live, stores } = opened();
        watched.start();
        const full = new DOMException('The quota was exceeded.', 'QuotaExceededError');
        vi.spyOn(FakeObjectStore.prototype, 'add').mockImplementation(() => {
            throw full;
        });

        const outcome = await watched.save(stores, 'too big', RunLevel.Everything, SAVED_AT);

        expect(outcome).toMatchObject({ isOk: false, problem: SaveProblem.StorageFull });
        expect(live.state).toBe(LiveRunState.Running);
    });
});

describe('deleting a branch of a run that was saved', () => {
    /** A watched run run partway, forked at its latest commit, and run on a little. */
    function forked(parts: ReturnType<typeof opened>): void {
        const { watched, wall, ticker } = parts;
        watched.start();
        ticked(wall, ticker, TICKS_BEFORE_SAVING);
        watched.pause();
        watched.forkHere();
        watched.step();
    }

    it(
        'takes the branch from the saved run too, which then still matches the run watched',
        { timeout: WHOLE_RUN_TIMEOUT_MS },
        async () => {
            const parts = opened();
            forked(parts);
            const { watched, live, stores } = parts;
            const fork = live.currentBranch;
            const outcome = await watched.save(stores, 'forked', RunLevel.Minimum, SAVED_AT);
            const id = idOf(outcome);

            await watched.deleteBranch(stores, fork);

            const [listed] = await stores.runs.list();
            const stored = await stores.runs.load(id);
            expect(listed?.size.branches).toBe(1);
            expect(stored).toEqual(live.runState);
            expect(watched.isUnsaved).toBe(false);
        },
    );

    it('leaves the saved run as it was for a branch made after saving', async () => {
        const parts = opened();
        const { watched, live, wall, ticker, stores } = parts;
        watched.start();
        ticked(wall, ticker, TICKS_BEFORE_SAVING);
        watched.pause();
        const outcome = await watched.save(
            stores,
            'before forking',
            RunLevel.Everything,
            SAVED_AT,
        );
        idOf(outcome);
        watched.forkHere();
        watched.step();
        const fork = live.currentBranch;

        await watched.deleteBranch(stores, fork);

        const [listed] = await stores.runs.list();
        expect(listed?.size.branches).toBe(1);
        expect(live.runState.history.branches.size).toBe(1);
    });
});
