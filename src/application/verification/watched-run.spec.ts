import { describe, expect, it } from 'vitest';

import {
    CUSTOMER_WONT,
    DRIVER_IGNORES,
} from '../../application-core/simulation-engine/indirect-effects.testing';
import { ONE_ORDER_SCENARIO } from '../../application-core/scenarios/one-order.testing';
import { ONE_ORDER_DIGEST } from '../../../e2e/fixtures/one-order-digest';
import { LiveRunState } from '../scenarios/live-run-state';
import { LiveScenarioRun, WallClock } from '../scenarios/live-scenario-run';
import type { IScenario } from '../../application-core/scenarios/scenario';
import { liveRunWithABug } from '../scenarios/run-with-a-bug.testing';
import { Ticker } from '../../application-core/scenarios/ticker';
import { WatchedRun } from './watched-run';
import { StepSize } from '../../application-core/simulation-engine/run-places';
import { MAIN_BRANCH } from '../../application-core/simulation-engine/branch-id';
import { changesOf } from '../../domain/business-rules/parameter-change.testing';
import {
    DISPATCH_PASS,
    DISPATCH_PASS_INTERVAL,
} from '../../domain/drivers/drivers-rule-definitions';
import { toSpeedMultiple } from '../../domain/simulation-engine/numbers';
import type { ClockSpeed } from '../scenarios/live-scenario-run';
import { MAX_SPEED } from '../scenarios/live-scenario-run';
import { toWallTime } from '../../domain/simulation-engine/numbers';
import type { WallTime } from '../../domain/simulation-engine/numbers';

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

function opened(scenario: IScenario = ONE_ORDER_SCENARIO): {
    wall: FakeWallClock;
    ticker: FakeTicker;
    watched: WatchedRun;
    changes: () => number;
} {
    const wall = new FakeWallClock();
    const ticker = new FakeTicker();
    let count = 0;
    const live = new LiveScenarioRun(scenario, wall);
    const watched = new WatchedRun(live, ticker, () => {
        count += 1;
    });
    return { wall, ticker, watched, changes: () => count };
}

/** Plays the browser's part: ticks until the ticker is stopped. */
function runUntilTheTickerStops(wall: FakeWallClock, ticker: FakeTicker): void {
    while (ticker.onTick !== null) {
        wall.time += 16;
        ticker.onTick();
    }
}

function runToTheEnd(parts: ReturnType<typeof opened>): void {
    parts.watched.setSpeed('max');
    parts.watched.start();
    runUntilTheTickerStops(parts.wall, parts.ticker);
}

describe('a watched run', () => {
    it('shows what it is, and where it has got to', () => {
        const { watched } = opened();

        expect(watched.status).toMatchObject({
            scenarioName: 'One order, happy path',
            version: 'V1.0.0',
            seed: 42,
            state: LiveRunState.Ready,
            canStart: true,
            now: 0,
            speed: 60,
            eventCount: 0,
            ordersFinished: 0,
            ordersTotal: 0,
            verdict: null,
            failureMessage: null,
            failureAt: null,
        });
    });

    it('says it changed when started, and when paused', () => {
        const { watched, changes } = opened();

        watched.start();
        const afterStarting = changes();
        watched.pause();

        expect(afterStarting).toBe(1);
        const secondChanges = changes();
        expect(secondChanges).toBe(2);
    });

    it('does not start the ticker when it cannot start', () => {
        const parts = opened();
        runToTheEnd(parts);

        parts.watched.start();

        expect(parts.ticker.onTick).toBeNull();
    });

    it('keeps the ticker going while it runs', () => {
        const { ticker, watched } = opened();

        watched.start();

        expect(ticker.onTick).not.toBeNull();
    });

    it('moves along with each tick, and says it changed', () => {
        const { wall, ticker, watched, changes } = opened();
        watched.start();
        const before = changes();

        wall.time = 100;
        ticker.onTick!();

        expect(watched.status.now.milliseconds).toBe(6000);
        const secondChanges = changes();
        expect(secondChanges).toBe(before + 1);
    });

    it('stops the ticker when paused', () => {
        const { ticker, watched } = opened();
        watched.start();

        watched.pause();

        expect(ticker.onTick).toBeNull();
    });

    it('stops the ticker when stepped', () => {
        const { ticker, watched } = opened();
        watched.start();

        watched.step();

        expect(ticker.onTick).toBeNull();
        expect(watched.status.state).toBe(LiveRunState.Paused);
    });

    it('toggles between running and paused', () => {
        const { watched } = opened();

        watched.toggle();
        const whileRunning = watched.status.state;
        watched.toggle();

        expect(whileRunning).toBe(LiveRunState.Running);
        expect(watched.status.state).toBe(LiveRunState.Paused);
    });

    it('changes speed, and says it changed', () => {
        const { watched, changes } = opened();
        const before = changes();

        const speed = toSpeedMultiple(600);
        watched.setSpeed(speed);

        expect(watched.status.speed).toBe(600);
        const secondChanges = changes();
        expect(secondChanges).toBe(before + 1);
    });

    describe('when it ends', () => {
        it('stops the ticker', () => {
            const parts = opened();

            runToTheEnd(parts);

            expect(parts.ticker.onTick).toBeNull();
        });

        it('passes a good run, with the digest a headless run gives', () => {
            const parts = opened();

            runToTheEnd(parts);

            expect(parts.watched.status.verdict).toMatchObject({
                isPassed: true,
                digest: ONE_ORDER_DIGEST,
            });
        });

        it('fails a run that breaks a criterion', () => {
            const parts = opened({
                ...ONE_ORDER_SCENARIO,
                steps: ONE_ORDER_SCENARIO.steps.take(5),
            });

            runToTheEnd(parts);

            expect(parts.watched.status.verdict?.isPassed).toBe(false);
        });

        it('judges a run that ends by stepping', () => {
            const { watched } = opened();

            Array.from({ length: 500 }, () => {
                watched.step();
                return watched.status.state;
            });

            expect(watched.status.verdict?.isPassed).toBe(true);
        });

        it('judges it only once', () => {
            const parts = opened();
            runToTheEnd(parts);
            const verdict = parts.watched.status.verdict;

            const speed = toSpeedMultiple(60);
            parts.watched.setSpeed(speed);

            expect(parts.watched.status.verdict).toBe(verdict);
        });

        it('fails a run a bug stopped, even with every criterion met', () => {
            const scenario = { ...ONE_ORDER_SCENARIO, steps: ONE_ORDER_SCENARIO.steps.clear() };
            const wall = new FakeWallClock();
            const live = liveRunWithABug(scenario, wall);
            const ticker = new FakeTicker();
            const watched = new WatchedRun(live, ticker, () => undefined);

            watched.step();

            expect(watched.status.state).toBe(LiveRunState.Failed);
            const isEveryResult = watched.status.verdict?.results.every((result) =>
                result.violations.isEmpty(),
            );
            expect(isEveryResult).toBe(true);
            expect(watched.status.verdict?.isPassed).toBe(false);
        });

        it('has no verdict before it ends', () => {
            const { watched } = opened();

            watched.step();

            expect(watched.status.verdict).toBeNull();
        });
    });

    describe('running on past the end', () => {
        it('keeps the verdict from the stated end', () => {
            const parts = opened();
            runToTheEnd(parts);
            const verdict = parts.watched.status.verdict;

            parts.watched.runOnPastTheEnd();
            parts.watched.start();
            parts.wall.time += 16;
            parts.ticker.onTick!();

            expect(parts.watched.status.now.milliseconds).toBeGreaterThan(300_000);
            expect(parts.watched.status.verdict).toBe(verdict);
        });

        it('says it changed', () => {
            const parts = opened();
            runToTheEnd(parts);
            const before = parts.changes();

            parts.watched.runOnPastTheEnd();

            const changes = parts.changes();
            expect(changes).toBe(before + 1);
        });
    });

    describe('when someone leaves and comes back', () => {
        it('pauses a running run', () => {
            const { watched } = opened();
            watched.start();

            watched.leave();

            expect(watched.status.state).toBe(LiveRunState.Paused);
        });

        it('resumes it on their return', () => {
            const { watched } = opened();
            watched.start();
            watched.leave();

            watched.comeBack();

            expect(watched.status.state).toBe(LiveRunState.Running);
        });

        it('leaves a paused run paused on their return', () => {
            const { watched } = opened();
            watched.start();
            watched.pause();

            watched.leave();
            watched.comeBack();

            expect(watched.status.state).toBe(LiveRunState.Paused);
        });

        it('says nothing changed when leaving a run that is not running', () => {
            const { watched, changes } = opened();

            watched.leave();

            const secondChanges = changes();
            expect(secondChanges).toBe(0);
        });

        it('does not start a run on a return without a leaving', () => {
            const { watched } = opened();

            watched.comeBack();

            expect(watched.status.state).toBe(LiveRunState.Ready);
        });

        it('resumes only once', () => {
            const { watched } = opened();
            watched.start();
            watched.leave();
            watched.comeBack();
            watched.pause();

            watched.comeBack();

            expect(watched.status.state).toBe(LiveRunState.Paused);
        });
    });

    it('stops the ticker when closed', () => {
        const { ticker, watched } = opened();
        watched.start();

        watched.close();

        expect(ticker.onTick).toBeNull();
    });
});

describe('moving through a watched run', () => {
    function ended(): ReturnType<typeof opened> {
        const parts = opened();
        runToTheEnd(parts);
        return parts;
    }

    it('shows the latest commit at first', () => {
        const { watched } = ended();

        const { status } = watched;

        expect(status.place).toBe(status.latestPlace);
        expect(status.isShowingLatest).toBe(true);
        expect(status.repeat).toBeNull();
    });

    it('shows an earlier place with the log, time, and orders as they stood', () => {
        const { watched } = ended();
        const latest = watched.status;

        watched.showPlace(3);

        const { status } = watched;
        expect(status.place).toBe(3);
        expect(status.isShowingLatest).toBe(false);
        expect(status.entries.size).toBeLessThan(latest.entries.size);
        expect(status.eventCount).toBe(status.entries.size);
        expect(status.now.milliseconds).toBeLessThanOrEqual(latest.now.milliseconds);
        expect(status.ordersFinished).toBe(0);
        expect(status.verdict).toEqual(latest.verdict);
    });

    it('cannot start or step while an earlier place is shown, until the latest is', () => {
        const parts = opened();
        parts.watched.step();
        parts.watched.step();

        parts.watched.showPlace(0);
        const placeBefore = parts.watched.status.latestPlace;
        parts.watched.step();
        parts.watched.start();

        const { status } = parts.watched;
        expect(status.canStart).toBe(false);
        expect(status.latestPlace).toBe(placeBefore);
        expect(parts.ticker.onTick).toBeNull();
        parts.watched.showLatest();
        expect(parts.watched.status.canStart).toBe(true);
    });

    it('pauses a running run when it moves back', () => {
        const parts = opened();
        parts.watched.start();
        parts.wall.time += 1000;
        parts.ticker.onTick?.();

        parts.watched.back(StepSize.Commit);

        expect(parts.watched.status.state).toBe(LiveRunState.Paused);
        expect(parts.ticker.onTick).toBeNull();
    });

    it('moves Back and Forward by one commit, or one job run or API call', () => {
        const { watched } = ended();
        const latest = watched.status.latestPlace;

        watched.back(StepSize.Commit);
        const oneBack = watched.status.place;
        watched.back(StepSize.Group);
        const groupBack = watched.status.place;
        watched.forward(StepSize.Group);
        const groupForward = watched.status.place;
        watched.forward(StepSize.Commit);

        expect(oneBack).toBe(latest - 1);
        expect(groupBack).toBeLessThan(oneBack);
        expect(groupForward).toBeGreaterThan(groupBack);
        expect(watched.status.place).toBeGreaterThan(groupForward - 1);
    });

    it('moves to the commit that wrote an entry', () => {
        const { watched } = ended();
        const entry = watched.status.entries.get(5)!;

        watched.showEntry(entry.sequence);

        const shown = watched.status.entries;
        const last = shown.last();
        expect(last).toBe(entry);
    });

    it('repeats from the place shown, and forgets the result once it moves', () => {
        const { watched } = ended();
        watched.showPlace(10);

        watched.repeatFromShown();
        const { repeat } = watched.status;
        watched.back(StepSize.Commit);

        expect(repeat).toMatchObject({ differsAt: null, failure: null });
        expect(repeat?.from).toBeLessThanOrEqual(10);
        expect(watched.status.repeat).toBeNull();
    });
});

describe("a watched run's branches", () => {
    function ended(): ReturnType<typeof opened> {
        const parts = opened();
        runToTheEnd(parts);
        return parts;
    }

    it('fork at the place shown, and watch the fork, ready to run on', () => {
        const { watched } = ended();
        watched.showPlace(40);

        watched.forkHere();

        const { status } = watched;
        expect(status.currentBranch).toBe('fork-1');
        expect(status.isShowingLatest).toBe(true);
        expect(status.latestPlace).toBeLessThanOrEqual(40);
        expect(status.state).toBe(LiveRunState.Paused);
        expect(status.canStart).toBe(true);
        const names = status.branches.map((branch) => branch.name).toArray();
        expect(names).toEqual(['Main', 'Fork 1']);
    });

    it('fork when a rule changes while an earlier commit is shown', () => {
        const { watched } = ended();
        watched.showPlace(40);
        const faster = changesOf(DISPATCH_PASS, DISPATCH_PASS_INTERVAL, 5000);

        watched.changeRules(faster);

        const { status } = watched;
        expect(status.currentBranch).toBe('fork-1');
        const last = status.entries.last();
        expect(last?.kind).toBe('ConfigChanged');
    });

    it('state an indirect effect at the latest commit, on the branch watched', () => {
        const { watched } = ended();
        const latest = watched.status.latestPlace;

        watched.stateIndirect(CUSTOMER_WONT);

        const { status } = watched;
        expect(status.currentBranch).toBe(MAIN_BRANCH);
        expect(status.latestPlace).toBe(latest + 1);
        const last = status.entries.last();
        expect(last).toMatchObject({ kind: 'IndirectEffectHappened', source: 'actors' });
    });

    it('fork when an indirect effect is stated while an earlier commit is shown', () => {
        const { watched } = ended();
        watched.showPlace(40);

        watched.stateIndirect(DRIVER_IGNORES);

        const { status } = watched;
        expect(status.currentBranch).toBe('fork-1');
        const last = status.entries.last();
        expect(last?.data).toMatchObject({ kind: 'driver-ignores-request', isScripted: false });
    });

    it('judge each branch on its own, and show the watched one', () => {
        const parts = ended();
        const mainVerdict = parts.watched.status.verdict;
        parts.watched.showPlace(40);
        parts.watched.forkHere();
        const forkBefore = parts.watched.status.verdict;

        runToTheEnd(parts);
        const forkVerdict = parts.watched.status.verdict;
        parts.watched.switchBranch(MAIN_BRANCH);

        expect(mainVerdict).not.toBeNull();
        expect(forkBefore).toBeNull();
        expect(forkVerdict).not.toBeNull();
        expect(parts.watched.status.verdict).toBe(mainVerdict);
        expect(parts.watched.status.currentBranch).toBe(MAIN_BRANCH);
    });

    it('show a commit of another branch, watching that branch first', () => {
        const { watched } = ended();
        watched.showPlace(40);
        watched.forkHere();

        watched.showCommit(MAIN_BRANCH, 30);

        const { status } = watched;
        expect(status.currentBranch).toBe(MAIN_BRANCH);
        expect(status.place).toBe(30);
    });

    it("give every branch's line, worked out again only when the run changes", () => {
        const { watched } = ended();
        watched.showPlace(40);
        watched.forkHere();

        const first = watched.status.branchLines;
        const again = watched.status.branchLines;

        const ids = first.map((branch) => branch.id).toArray();
        expect(ids).toEqual([MAIN_BRANCH, 'fork-1']);
        expect(again).toBe(first);
    });

    it('rename a branch, keeping its ID', () => {
        const { watched } = ended();
        watched.showPlace(40);
        watched.forkHere();

        watched.renameBranch(watched.status.currentBranch, 'Faster passes');

        const names = watched.status.branches.map((branch) => branch.name).toArray();
        expect(names).toEqual(['Main', 'Faster passes']);
        expect(watched.status.currentBranch).toBe('fork-1');
    });
});

/** A speed below 'max', where the clock catches up on time, not running work flat out. */
const A_FAST_SPEED = toSpeedMultiple(600);
const SPEEDS: readonly ClockSpeed[] = [MAX_SPEED, A_FAST_SPEED];

/** More resumes or steps than a one-order run has hits, to go on until there are none. */
const ENOUGH_TURNS = 100;

describe("a watched run's breakpoints", () => {
    /** Starts the run at a speed, and ticks until it stops of its own accord. */
    function started(parts: ReturnType<typeof opened>, speed: ClockSpeed = MAX_SPEED): void {
        parts.watched.setSpeed(speed);
        parts.watched.start();
        runUntilTheTickerStops(parts.wall, parts.ticker);
    }

    it.each(SPEEDS)(
        'pause after the work that writes an event of their kind, showing its commit, at %s',
        (speed) => {
            const parts = opened();
            parts.watched.addBreakpoint('OrderPickedUp', null, null);

            started(parts, speed);

            const { status } = parts.watched;
            expect(status.state).toBe(LiveRunState.Paused);
            expect(status.lastHit?.entry.kind).toBe('OrderPickedUp');
            const written = status.allEntries.filter((entry) => entry.kind === 'OrderPickedUp');
            const firstWritten = written.first();
            expect(status.lastHit?.entry).toBe(firstWritten);
            const lastShown = status.entries.last()?.sequence;
            expect(lastShown).toBeGreaterThanOrEqual(
                status.lastHit?.entry.sequence ?? Number.MAX_SAFE_INTEGER,
            );
            expect(status.canStart).toBe(true);
        },
    );

    it('go on to the next hit, and to the end once none is left', () => {
        const parts = opened();
        // Each job run reading an inbox writes one, so there are many hits, one per run.
        parts.watched.addBreakpoint('InboxEventRead', null, null);
        const hits: number[] = [];

        Array.from({ length: ENOUGH_TURNS }).some(() => {
            started(parts);
            const hit = parts.watched.status.lastHit;
            if (hit !== null) {
                hits.push(hit.entry.sequence);
            }
            return hit === null;
        });

        expect(hits.length).toBeGreaterThan(1);
        const isRising = hits.every(
            (sequence, index) => index === 0 || sequence > (hits[index - 1] ?? 0),
        );
        expect(isRising).toBe(true);
        expect(parts.watched.status.state).toBe(LiveRunState.Ended);
    });

    it('stop nothing while switched off, and are gone once removed', () => {
        const parts = opened();
        parts.watched.addBreakpoint('OrderPickedUp', null, null);
        const [added] = parts.watched.status.breakpoints;
        const id = added?.id ?? 0;

        parts.watched.switchBreakpoint(id, false);
        started(parts);

        expect(parts.watched.status.state).toBe(LiveRunState.Ended);
        expect(parts.watched.status.lastHit).toBeNull();
        parts.watched.removeBreakpoint(id);
        expect(parts.watched.status.breakpoints).toEqual([]);
    });

    it('stop a step too, which goes on from the latest commit', () => {
        const parts = opened();
        parts.watched.addBreakpoint('InboxEventRead', null, null);
        const stepToHit = (): number | null => {
            Array.from({ length: ENOUGH_TURNS }).some(() => {
                parts.watched.step();
                return parts.watched.status.lastHit !== null;
            });
            return parts.watched.status.lastHit?.entry.sequence ?? null;
        };

        const first = stepToHit();
        const second = stepToHit();

        expect(first).not.toBeNull();
        expect(second).toBeGreaterThan(first ?? Number.MAX_SAFE_INTEGER);
    });
});
