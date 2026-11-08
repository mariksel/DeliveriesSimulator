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
import { toWallTime } from '../../domain/simulation-engine/numbers';
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

describe('the run session', () => {
    let ticker: FakeTicker;
    let changes: number;
    let session: RunSession;

    beforeEach(() => {
        ticker = new FakeTicker();
        changes = 0;
        session = new RunSession({
            wallClock: new FakeWallClock(),
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
});
