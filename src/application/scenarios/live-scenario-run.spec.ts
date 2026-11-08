import { describe, expect, it } from 'vitest';

import { ONE_ORDER_SCENARIO } from '../../application-core/scenarios/one-order.testing';
import { WallClock } from '../../application-core/simulation-engine/wall-clock';
import { runDigest } from '../../application-core/simulation-engine/run-digest';
import type { ClockSpeed } from './live-scenario-run';
import { LiveScenarioRun } from './live-scenario-run';
import { LiveRunState } from './live-run-state';
import type { IScenario } from '../../application-core/scenarios/scenario';
import { liveRunWithABug } from './run-with-a-bug.testing';
import { runScenario } from './scenario-runner';
import { toSpeedMultiple } from '../../domain/simulation-engine/numbers';
import { toWallTime } from '../../domain/simulation-engine/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import type { WallTime } from '../../domain/simulation-engine/numbers';

class FakeWallClock extends WallClock {
    time = 0;
    now(): WallTime {
        return toWallTime(this.time);
    }
}

const END = toSimTime(300_000);

function opened(): { wall: FakeWallClock; live: LiveScenarioRun } {
    const wall = new FakeWallClock();
    return { wall, live: new LiveScenarioRun(ONE_ORDER_SCENARIO, wall) };
}

/** Ticks with a stated real time between ticks until the run stops going. */
function runToStop(wall: FakeWallClock, live: LiveScenarioRun, msPerTick: number): void {
    while (live.state === LiveRunState.Running) {
        wall.time += msPerTick;
        live.tick();
    }
}

function headlessDigest(scenario: IScenario = ONE_ORDER_SCENARIO): string {
    const result = runScenario(scenario);
    return result.isOk ? result.run.digest : '';
}

describe('a scenario being watched', () => {
    it('opens paused at time 0, at the default speed', () => {
        const { live } = opened();

        expect(live.state).toBe(LiveRunState.Ready);
        expect(live.now.milliseconds).toBe(0);
        expect(live.speed).toBe(60);
    });

    it('does not move before it is started', () => {
        const { wall, live } = opened();
        wall.time = 1000;

        live.tick();

        expect(live.now.milliseconds).toBe(0);
    });

    it('moves with the wall clock at its speed once started', () => {
        const { wall, live } = opened();
        live.start();

        wall.time = 100;
        live.tick();

        expect(live.now.milliseconds).toBe(6000);
    });

    it('stops moving when paused', () => {
        const { wall, live } = opened();
        live.start();
        wall.time = 100;
        live.tick();

        live.pause();
        wall.time = 200;
        live.tick();

        expect(live.state).toBe(LiveRunState.Paused);
        expect(live.now.milliseconds).toBe(6000);
    });

    it('does nothing when paused while not running', () => {
        const { live } = opened();

        live.pause();

        expect(live.state).toBe(LiveRunState.Ready);
    });

    it('goes on from where it was paused', () => {
        const { wall, live } = opened();
        live.start();
        wall.time = 100;
        live.tick();
        live.pause();
        wall.time = 5000;

        live.start();
        wall.time = 5100;
        live.tick();

        expect(live.now.milliseconds).toBe(12_000);
    });

    it('moves by one piece of work when stepped, and stays paused', () => {
        const { live } = opened();

        live.step();

        expect(live.state).toBe(LiveRunState.Paused);
        expect(live.entries.size).toBe(0);
    });

    it('changes speed while running', () => {
        const { wall, live } = opened();
        live.start();

        const speed = toSpeedMultiple(600);
        live.setSpeed(speed);
        wall.time = 100;
        live.tick();

        expect(live.speed).toBe(600);
        expect(live.now.milliseconds).toBe(60_000);
    });

    it('counts the orders that have finished', () => {
        const { wall, live } = opened();
        live.setSpeed('max');
        live.start();

        runToStop(wall, live, 16);

        expect(live.orderProgress).toEqual({ finished: 1, total: 1 });
    });

    describe('at the time its scenario states it ends', () => {
        it.each<[string, ClockSpeed, number]>([
            ['max', 'max', 16],
            ['600x', toSpeedMultiple(600), 16],
            ['60x', toSpeedMultiple(60), 16],
            ['a slow speed with long ticks', toSpeedMultiple(10), 5000],
        ])(
            'stops exactly there at %s, with the run a headless run gives',
            (_name, speed, msPerTick) => {
                const { wall, live } = opened();
                live.setSpeed(speed);
                live.start();

                runToStop(wall, live, msPerTick);

                expect(live.state).toBe(LiveRunState.Ended);
                expect(live.now).toEqual(END);
                const secondRunDigest = runDigest(live.entries);
                const expected = headlessDigest();
                expect(secondRunDigest).toBe(expected);
            },
        );

        it('gives the run a headless run gives when stepped all the way', () => {
            const { live } = opened();

            Array.from({ length: 500 }, () => {
                live.step();
                return live.state;
            });

            expect(live.state).toBe(LiveRunState.Ended);
            const secondRunDigest = runDigest(live.entries);
            const expected = headlessDigest();
            expect(secondRunDigest).toBe(expected);
        });

        it('cannot start again', () => {
            const { wall, live } = opened();
            live.setSpeed('max');
            live.start();
            runToStop(wall, live, 16);

            live.start();

            expect(live.canStart).toBe(false);
            expect(live.state).toBe(LiveRunState.Ended);
        });

        it('cannot step on', () => {
            const { wall, live } = opened();
            live.setSpeed('max');
            live.start();
            runToStop(wall, live, 16);
            const size = live.entries.size;

            live.step();

            expect(live.entries.size).toBe(size);
        });

        it('stops there if a speed change takes it there', () => {
            const { wall, live } = opened();
            live.start();
            wall.time = END.milliseconds / 60;

            const speed = toSpeedMultiple(1);
            live.setSpeed(speed);

            expect(live.state).toBe(LiveRunState.Ended);
        });

        it('stops there if a pause takes it there', () => {
            const { wall, live } = opened();
            live.start();
            wall.time = END.milliseconds / 60;

            live.pause();

            expect(live.state).toBe(LiveRunState.Ended);
        });
    });

    describe('when its stated end falls after the last work before it', () => {
        const lateEnd = toSimTime(299_999);

        function openedToEndLate(): { wall: FakeWallClock; live: LiveScenarioRun } {
            const wall = new FakeWallClock();
            const scenario = { ...ONE_ORDER_SCENARIO, runUntil: lateEnd };
            return { wall, live: new LiveScenarioRun(scenario, wall) };
        }

        it('gets there at max, where no time passes on its own', () => {
            const { wall, live } = openedToEndLate();
            live.setSpeed('max');
            live.start();

            Array.from({ length: 10 }, () => {
                wall.time += 16;
                live.tick();
                return live.now;
            });

            expect(live.state).toBe(LiveRunState.Ended);
            expect(live.now).toBe(lateEnd);
        });

        it('gets there by stepping', () => {
            const { live } = openedToEndLate();

            Array.from({ length: 500 }, () => {
                live.step();
                return live.now;
            });

            expect(live.state).toBe(LiveRunState.Ended);
            expect(live.now).toBe(lateEnd);
        });

        it('lets the time pass at any other speed', () => {
            const { wall, live } = openedToEndLate();
            const speed = toSpeedMultiple(60);
            live.setSpeed(speed);
            live.start();

            wall.time += 4_992;
            live.tick();

            expect(live.state).toBe(LiveRunState.Running);
            expect(live.now.milliseconds).toBe(299_520);
        });
    });

    describe('with several pieces of work due exactly at its stated end', () => {
        const { steps: oneOrderSteps } = ONE_ORDER_SCENARIO;
        const lastStep = { ...oneOrderSteps.last()!, at: END };
        const steps = oneOrderSteps.butLast().push(lastStep);
        const scenario: IScenario = { ...ONE_ORDER_SCENARIO, steps };

        function steppedToTheEnd(): LiveScenarioRun {
            const wallClock = new FakeWallClock();
            const live = new LiveScenarioRun(scenario, wallClock);
            while (live.now.isBefore(END)) {
                live.step();
            }
            return live;
        }

        it('stops after one piece of them when stepped, with the rest still to run', () => {
            const live = steppedToTheEnd();

            expect(live.state).toBe(LiveRunState.Paused);
        });

        it('runs them all when stepped, as a headless run does', () => {
            const live = steppedToTheEnd();

            Array.from({ length: 10 }, () => {
                live.step();
                return live.now;
            });

            expect(live.state).toBe(LiveRunState.Ended);
            const secondRunDigest = runDigest(live.entries);
            const expected = headlessDigest(scenario);
            expect(secondRunDigest).toBe(expected);
        });
    });

    describe('running on past the stated end', () => {
        function ended(): { wall: FakeWallClock; live: LiveScenarioRun } {
            const parts = opened();
            parts.live.setSpeed('max');
            parts.live.start();
            runToStop(parts.wall, parts.live, 16);
            return parts;
        }

        it('leaves it paused, ready to start', () => {
            const { live } = ended();

            live.runOnPastTheEnd();

            expect(live.state).toBe(LiveRunState.Paused);
            expect(live.canStart).toBe(true);
        });

        it('carries time on from the end, without a jump', () => {
            const { wall, live } = ended();
            const speed = toSpeedMultiple(60);
            live.setSpeed(speed);
            live.runOnPastTheEnd();
            wall.time += 1000;
            live.start();

            wall.time += 100;
            live.tick();

            expect(live.now.milliseconds).toBe(END.milliseconds + 6000);
        });

        it('forgets the time a long tick counted beyond the end', () => {
            const { wall, live } = opened();
            const speed = toSpeedMultiple(60);
            live.setSpeed(speed);
            live.start();
            runToStop(wall, live, 7_000);
            live.runOnPastTheEnd();
            live.start();

            wall.time += 100;
            live.tick();

            expect(live.now.milliseconds).toBe(END.milliseconds + 6000);
        });

        it('goes past the end, at max too', () => {
            const { wall, live } = ended();
            live.runOnPastTheEnd();
            live.start();

            wall.time += 16;
            live.tick();

            expect(live.now.milliseconds).toBeGreaterThan(END.milliseconds);
            expect(live.state).toBe(LiveRunState.Running);
        });

        it('can step past the end', () => {
            const { live } = ended();
            live.runOnPastTheEnd();

            live.step();

            expect(live.now.milliseconds).toBeGreaterThan(END.milliseconds);
        });

        it('does nothing before the run has ended', () => {
            const { live } = opened();

            live.runOnPastTheEnd();

            expect(live.state).toBe(LiveRunState.Ready);
        });
    });

    describe('a bug inside the run', () => {
        function broken(): { wall: FakeWallClock; live: LiveScenarioRun } {
            const wall = new FakeWallClock();
            return { wall, live: liveRunWithABug(ONE_ORDER_SCENARIO, wall) };
        }

        it('stops it, and says so', () => {
            const { wall, live } = broken();
            live.start();

            runToStop(wall, live, 16);

            expect(live.state).toBe(LiveRunState.Failed);
            expect(live.failure?.message).toContain('No delivery copy');
        });

        it('stops it when stepping, too', () => {
            const { live } = broken();

            live.step();

            expect(live.state).toBe(LiveRunState.Failed);
        });

        it('stays at the time it stopped', () => {
            const { live } = broken();

            live.step();

            expect(live.now.milliseconds).toBeLessThan(END.milliseconds);
        });

        it('leaves it stopped', () => {
            const { live } = broken();
            live.step();

            live.step();
            live.start();

            expect(live.state).toBe(LiveRunState.Failed);
        });
    });
});
