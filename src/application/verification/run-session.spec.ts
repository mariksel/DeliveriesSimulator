import { TESTING_FUNCTIONS } from '../../application-core/simulation-engine/function-lookup.testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ONE_ORDER_SCENARIO } from '../../application-core/scenarios/one-order.testing';
import {
    BuiltInsForTest,
    FilesForTest,
    INVALID_FILE,
    NOT_JSON,
    ONE_ORDER_FILE,
} from '../../application-core/scenarios/scenario-ports.testing';
import { WallClock } from '../scenarios/live-scenario-run';
import { LiveRunState } from '../scenarios/live-run-state';
import { Ticker } from '../../application-core/scenarios/ticker';
import type { OpenResult } from './run-session';
import { RunSession } from './run-session';
import { toBuiltInScenarioId } from '../../application-core/scenarios/built-in-scenarios';
import { toVersionId } from '../../domain/versions/version-id';
import { toCalendarTime, toWallTime } from '../../domain/simulation-engine/numbers';
import type { ISavedRunStores } from '../run-history/saved-runs';
import type { ILoadProgress, SaveOutcome } from '../../application-core/run-history/saved-run';
import { RunLevel, toSavedRunId } from '../../application-core/run-history/saved-run';
import {
    MemoryRunRepository,
    MemoryScenarioRepository,
} from '../../application-core/run-history/run-stores.testing';
import type { WallTime } from '../../domain/simulation-engine/numbers';

const ONE_ORDER_BUILT_IN = toBuiltInScenarioId('one-order');
const NO_SUCH_BUILT_IN = toBuiltInScenarioId('nope');

class FakeWallClock extends WallClock {
    now(): WallTime {
        return toWallTime(0);
    }
}

class FakeTicker extends Ticker {
    isRunning = false;
    start(): void {
        this.isRunning = true;
    }
    stop(): void {
        this.isRunning = false;
    }
}

const messageOf = (result: OpenResult): string | undefined =>
    result.isOk ? undefined : result.problems.first()?.message;

const SAVED_AT = toCalendarTime(1);

describe('the run session', () => {
    let ticker: FakeTicker;
    let changes: number;
    let session: RunSession;
    let stores: ISavedRunStores;

    beforeEach(() => {
        ticker = new FakeTicker();
        changes = 0;
        stores = { runs: new MemoryRunRepository(), scenarios: new MemoryScenarioRepository() };
        session = new RunSession({
            stores,
            wallClock: new FakeWallClock(),
            functions: TESTING_FUNCTIONS,
            ticker,
            files: new FilesForTest(),
            builtIns: new BuiltInsForTest(),
            onChange: (): void => {
                changes += 1;
            },
        });
    });

    it('has no run until one is opened', () => {
        expect(session.run).toBeNull();
    });

    it('opens a built-in scenario, paused at time 0', () => {
        const result = session.openBuiltIn(ONE_ORDER_BUILT_IN);

        expect(result.isOk).toBe(true);
        expect(session.run?.status.state).toBe(LiveRunState.Ready);
    });

    it('says it changed when a scenario opens', () => {
        session.openBuiltIn(ONE_ORDER_BUILT_IN);

        expect(changes).toBe(1);
    });

    it('says when there is no such built-in scenario', () => {
        const openBuiltIn = session.openBuiltIn(NO_SUCH_BUILT_IN);
        const message = messageOf(openBuiltIn);
        expect(message).toBe('there is no built-in scenario "nope"');
    });

    it('opens a chosen file', async () => {
        const result = await session.openFile({ name: ONE_ORDER_FILE });

        expect(result.isOk).toBe(true);
        expect(session.run?.status.scenarioName).toBe('One order, happy path');
    });

    it('says when a chosen file cannot be read', async () => {
        const openFile = await session.openFile({ name: 'unreadable.json' });
        const message = messageOf(openFile);
        expect(message).toBe('the file could not be read');
    });

    it('says what is wrong with a scenario, and leaves the current run alone', async () => {
        session.openBuiltIn(ONE_ORDER_BUILT_IN);
        const run = session.run;

        const result = await session.openFile({ name: INVALID_FILE });

        const message = messageOf(result);
        expect(message).toBe(NOT_JSON);
        expect(session.run).toBe(run);
    });

    it('refuses a scenario for a version this simulator does not have', () => {
        const scenario = { ...ONE_ORDER_SCENARIO, version: toVersionId('V9.9.9') };
        const opened = session.openScenario({ isOk: true, scenario });
        const message = messageOf(opened);

        expect(message).toContain('is not available');
    });

    it('stops the old run when a new one takes its place', () => {
        session.openBuiltIn(ONE_ORDER_BUILT_IN);
        session.run?.start();

        session.openBuiltIn(ONE_ORDER_BUILT_IN);

        expect(ticker.isRunning).toBe(false);
    });

    it('starts the same scenario afresh', () => {
        session.openBuiltIn(ONE_ORDER_BUILT_IN);
        const first = session.run;
        first?.step();

        session.runAgain();

        expect(session.run).not.toBe(first);
        expect(session.run?.status.state).toBe(LiveRunState.Ready);
    });

    it('does nothing when asked to run again with nothing open', () => {
        session.runAgain();

        expect(session.run).toBeNull();
    });

    describe('with saved runs', () => {
        /** Opens the one-order scenario, steps it, and saves it. */
        async function savedAfterSteps(steps: number): Promise<SaveOutcome> {
            session.openBuiltIn(ONE_ORDER_BUILT_IN);
            const run = session.run!;
            Array.from({ length: steps }).forEach(() => {
                run.step();
            });
            return run.save(stores, 'stepped', RunLevel.Everything, SAVED_AT);
        }

        it('counts a run with commits as unsaved until it is saved', async () => {
            session.openBuiltIn(ONE_ORDER_BUILT_IN);
            const isUnsavedAtStart = session.isUnsaved;
            session.run!.step();
            const isUnsavedAfterStep = session.isUnsaved;

            await session.run!.save(stores, 'saved', RunLevel.Everything, SAVED_AT);

            expect([isUnsavedAtStart, isUnsavedAfterStep, session.isUnsaved]).toEqual([
                false,
                true,
                false,
            ]);
        });

        it('opens a saved run paused at its latest commit, telling its progress', async () => {
            const saved = await savedAfterSteps(3);
            const id = saved.isOk ? saved.saved.id : toSavedRunId('none');
            const savedPlace = session.run!.status.latestPlace;
            session.openBuiltIn(ONE_ORDER_BUILT_IN);
            const told: ILoadProgress[] = [];

            const opened = await session.openSaved(id, (progress) => {
                told.push(progress);
            });

            const status = session.run!.status;
            expect(opened).toEqual({ isOk: true });
            expect(status.state).toBe(LiveRunState.Paused);
            expect(status.latestPlace).toBe(savedPlace);
            expect(session.isUnsaved).toBe(false);
            expect(told.length).toBeGreaterThan(0);
        });

        it('says when a saved run is gone, and leaves the run being watched', async () => {
            session.openBuiltIn(ONE_ORDER_BUILT_IN);
            const watched = session.run;

            const missing = toSavedRunId('saved-run-9');

            const opened = await session.openSaved(missing, () => undefined);

            const message = opened.isOk ? '' : opened.message;
            expect(opened.isOk).toBe(false);
            expect(message).toContain('gone');
            expect(session.run).toBe(watched);
        });
    });
});
