import type { ClockSpeed } from '../../application/scenarios/live-scenario-run';
import { List } from 'immutable';
import { MAIN_BRANCH } from '../../application-core/simulation-engine/branch-id';
import { describe, expect, it } from 'vitest';

import { LiveRunState } from '../../application/scenarios/live-run-state';
import type { IWatchedRunStatus } from '../../application/verification/watched-run';
import { parseSpeed, runView, speedLabel } from './run-view';
import { toSpeedMultiple } from '../../domain/simulation-engine/numbers';
import { toLogSequence } from '../../domain/event-log/numbers';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { toCount, toPosition } from '../../domain/system/math/math';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { V1_DELIVERIES_RULES } from '../../domain/drivers/deliveries/deliveries-rules';
import { V1_DRIVERS_RULES } from '../../domain/drivers/drivers-rules';
import { V1_ORDERS_RULES } from '../../domain/orders/orders-rules';

const STATUS: IWatchedRunStatus = {
    scenarioName: 'A scenario',
    version: 'V1.0.0',
    seed: toSeed(42),
    state: LiveRunState.Paused,
    canStart: true,
    now: toSimTime(65_000),
    speed: toSpeedMultiple(60),
    entries: List(),
    eventCount: toCount(12),
    ordersFinished: toCount(3),
    ordersTotal: toCount(5),
    failureMessage: null,
    failureAt: null,
    verdict: null,
    rules: {
        drivers: V1_DRIVERS_RULES,
        orders: V1_ORDERS_RULES,
        deliveries: V1_DELIVERIES_RULES,
    },
    place: toPosition(12),
    latestPlace: toPosition(12),
    isShowingLatest: true,
    repeat: null,
    allEntries: List(),
    branches: List(),
    branchLines: List(),
    breakpoints: [],
    lastHit: null,
    currentBranch: MAIN_BRANCH,
    names: { drivers: [], restaurants: [], orders: [] },
};

describe('what a run shows', () => {
    it('writes time as scenario files do', () => {
        expect(runView(STATUS).time).toBe('h00:m01:s05:ms00');
    });

    it('writes the speed', () => {
        expect(runView(STATUS).speed).toBe('60x');
    });

    it.each<[ClockSpeed, string]>([
        [toSpeedMultiple(60), ''],
        ['max', ''],
        [toSpeedMultiple(250), '250'],
    ])('with speed %s, gives the speed box "%s"', (speed, shown) => {
        expect(runView({ ...STATUS, speed }).customSpeed).toBe(shown);
    });

    it.each<[LiveRunState, string]>([
        [LiveRunState.Ready, 'Start'],
        [LiveRunState.Running, 'Pause'],
        [LiveRunState.Paused, 'Resume'],
        [LiveRunState.Ended, 'Start'],
        [LiveRunState.Failed, 'Start'],
    ])('when %s, the main button says %s', (state, label) => {
        expect(runView({ ...STATUS, state }).startLabel).toBe(label);
    });

    it('writes how many orders have finished', () => {
        expect(runView(STATUS).orders).toBe('3 of 5');
    });

    it('has no verdict before the run ends', () => {
        const view = runView(STATUS);

        expect(view.verdict).toBeNull();
        expect(view.digest).toBeNull();
        expect(view.criteria).toEqual([]);
    });

    it('says a good run passed', () => {
        const view = runView({
            ...STATUS,
            state: LiveRunState.Ended,
            canStart: false,
            verdict: { isPassed: true, digest: 'abc', results: [], ordersJudged: toCount(1) },
        });

        expect(view.verdict).toBe('Passed');
        expect(view.isPassed).toBe(true);
        expect(view.digest).toBe('abc');
        expect(view.verdictNote).toBeNull();
    });

    it('says when a run judged no orders', () => {
        const view = runView({
            ...STATUS,
            state: LiveRunState.Ended,
            canStart: false,
            verdict: { isPassed: true, digest: 'abc', results: [], ordersJudged: toCount(0) },
        });

        expect(view.verdict).toBe('Passed');
        expect(view.verdictNote).toContain('No orders were judged');
    });

    it('says which criterion failed, and why', () => {
        const violation = {
            criterion: 'Modules agree',
            sequence: toLogSequence(3),
            message: 'They differ.',
        } as const;

        const view = runView({
            ...STATUS,
            verdict: {
                isPassed: false,
                digest: 'abc',
                ordersJudged: toCount(1),
                results: [{ criterion: 'Modules agree', violations: List.of(violation) }],
            },
        });

        expect(view.verdict).toBe('Failed');
        expect(view.criteria).toEqual([
            { name: 'Modules agree', isPassed: false, violations: ['They differ.'] },
        ]);
    });

    it('says what stopped a run, and when', () => {
        const view = runView({
            ...STATUS,
            state: LiveRunState.Failed,
            failureMessage: 'It broke.',
            failureAt: toSimTime(5000),
        });

        expect(view.failure).toBe('Stopped at h00:m00:s05:ms00: It broke.');
    });

    it.each<[string, Partial<IWatchedRunStatus>, boolean, boolean, boolean]>([
        ['ready', { state: LiveRunState.Ready }, false, true, false],
        ['running', { state: LiveRunState.Running, canStart: false }, true, true, false],
        ['paused', { state: LiveRunState.Paused }, false, true, false],
        ['ended', { state: LiveRunState.Ended, canStart: false }, false, false, true],
        ['failed', { state: LiveRunState.Failed, canStart: false }, false, false, false],
    ])('offers the right controls when %s', (_name, change, isRunning, canStep, canRunOn) => {
        const view = runView({ ...STATUS, ...change });

        expect([view.isRunning, view.canStep, view.canRunOn]).toEqual([
            isRunning,
            canStep,
            canRunOn,
        ]);
    });
});

describe('speeds', () => {
    it.each<[ClockSpeed, string]>([
        [toSpeedMultiple(60), '60x'],
        [toSpeedMultiple(0.5), '0.5x'],
        ['max', 'max'],
    ])('writes %s', (speed, label) => {
        const secondSpeedLabel = speedLabel(speed);
        expect(secondSpeedLabel).toBe(label);
    });

    it.each<[string, number]>([
        ['250', 250],
        ['0.5', 0.5],
        ['250x', 250],
        [' 10X ', 10],
    ])('reads %s', (text, speed) => {
        const secondSpeed = parseSpeed(text);
        expect(secondSpeed).toBe(speed);
    });

    it.each(['', ' ', 'x', 'fast', '0', '-5', 'Infinity'])('refuses "%s"', (text) => {
        const speed = parseSpeed(text);
        expect(speed).toBeNull();
    });
});

describe('what a run shows while moving through it', () => {
    const back = { ...STATUS, place: toPosition(4), isShowingLatest: false };

    it('says which commit is shown, only while an earlier one is', () => {
        const atLatest = runView(STATUS);
        const earlier = runView(back);

        expect(atLatest.placeLabel).toBeNull();
        expect(earlier.placeLabel).toBe('Commit 4 of 12');
    });

    it('cannot step or run on while an earlier commit is shown', () => {
        const ended = { ...back, state: LiveRunState.Ended };

        const view = runView(back);
        const endedView = runView(ended);

        expect(view.canStep).toBe(false);
        expect(endedView.canRunOn).toBe(false);
    });

    it.each([
        [
            'every commit the same',
            { from: 2, to: 12, compared: 10, differsAt: null, failure: null },
            'Repeated from commit 2 to 12: all 10 commits came out the same.',
            true,
        ],
        [
            'a commit that differs',
            { from: 2, to: 12, compared: 10, differsAt: 7, failure: null },
            'Repeated from commit 2: commit 7 came out differently.',
            false,
        ],
        [
            'a repeat that stopped',
            { from: 2, to: 12, compared: 3, differsAt: 6, failure: 'No module has a rule x.y.' },
            'The repeat stopped: No module has a rule x.y.',
            false,
        ],
    ])('says what a repeat came to: %s', (_name, repeat, line, isSame) => {
        const status = { ...STATUS, repeat: repeat as never };

        const view = runView(status);

        expect(view.repeat).toBe(line);
        expect(view.isRepeatSame).toBe(isSame);
    });
});
