import { describe, expect, it } from 'vitest';

import { ClosureScheduler } from '../../domain/simulation-engine/closure-scheduler.testing';
import type { ClockSpeed } from './clock-speed';
import { DEFAULT_SPEED } from './clock-speed';
import { SimulationClock } from './simulation-clock';
import { WallClock } from '../../application-core/simulation-engine/wall-clock';
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

function setUp(speed?: ClockSpeed): {
    wall: FakeWallClock;
    scheduler: ClosureScheduler;
    clock: SimulationClock;
} {
    const wall = new FakeWallClock();
    const scheduler = new ClosureScheduler();
    return { wall, scheduler, clock: new SimulationClock(scheduler, wall, speed) };
}

/** Work that adds more work, so a run's order depends on the scheduler doing its job. */
function scheduleSample(scheduler: ClosureScheduler): string[] {
    const ran: string[] = [];
    let value = 42;
    for (let index = 0; index < 200; index++) {
        value = (value * 1103515245 + 12345) % 2147483648;
        const at = value % 10000;
        scheduler.add(at, (now) => {
            ran.push(`${index}@${now}`);
            if (index % 3 === 0) {
                scheduler.add(now + (index % 50), (later) => ran.push(`${index}+@${later}`));
            }
        });
    }
    return ran;
}

function scheduleAt(scheduler: ClosureScheduler, times: readonly number[]): number[] {
    const ran: number[] = [];
    for (const at of times) {
        scheduler.add(at, (now) => ran.push(now));
    }
    return ran;
}

function tickEachMillisecond(wall: FakeWallClock, clock: SimulationClock, until: number): void {
    for (let tick = 1; tick <= until; tick++) {
        wall.time = tick;
        clock.tick();
    }
}

function tickUntilAllRan(
    wall: FakeWallClock,
    clock: SimulationClock,
    ran: readonly string[],
    total: number,
): void {
    while (ran.length < total) {
        wall.time += 37;
        clock.tick();
    }
}

function stepToTheEnd(clock: SimulationClock): void {
    let hasMore = true;
    while (hasMore) {
        hasMore = clock.step();
    }
}

function mixSpeedsUntilAllRan(
    wall: FakeWallClock,
    clock: SimulationClock,
    ran: readonly string[],
    total: number,
): void {
    const speeds: ClockSpeed[] = [
        toSpeedMultiple(60),
        toSpeedMultiple(1),
        'max',
        toSpeedMultiple(0.5),
        toSpeedMultiple(1000),
    ];
    for (let round = 0; ran.length < total; round++) {
        clock.setSpeed(speeds[round % speeds.length]!);
        clock.start();
        wall.time += 11;
        clock.tick();
        clock.pause();
        clock.step();
    }
}

describe('SimulationClock', () => {
    it('starts stopped, at the default speed of one simulated minute per real second', () => {
        const { clock } = setUp();

        expect(clock.isRunning).toBe(false);
        expect(clock.speed).toBe(DEFAULT_SPEED);
        expect(DEFAULT_SPEED).toBe(60);
    });

    it('does not move before it starts', () => {
        const { wall, clock } = setUp();

        wall.time = 1000;
        clock.tick();

        expect(clock.now.milliseconds).toBe(0);
    });

    it('moves simulated time at the chosen multiple of real time', () => {
        const speed = toSpeedMultiple(60);
        const { wall, clock } = setUp(speed);
        clock.start();

        wall.time = 1000;
        clock.tick();

        expect(clock.now.milliseconds).toBe(60_000);
    });

    it('runs at wall-clock speed at 1x', () => {
        const speed = toSpeedMultiple(1);
        const { wall, clock } = setUp(speed);
        clock.start();

        wall.time = 1234;
        clock.tick();

        expect(clock.now.milliseconds).toBe(1234);
    });

    it('slows down below 1x, without losing time over short ticks', () => {
        const speed = toSpeedMultiple(0.5);
        const { wall, clock } = setUp(speed);
        clock.start();

        tickEachMillisecond(wall, clock, 1000);

        expect(clock.now.milliseconds).toBe(500);
    });

    it('stops simulated time while paused', () => {
        const speed = toSpeedMultiple(10);
        const { wall, clock } = setUp(speed);
        clock.start();
        wall.time = 100;
        clock.pause();

        wall.time = 5000;
        clock.tick();

        expect(clock.now.milliseconds).toBe(1000);
    });

    it('does not count a pause later', () => {
        const speed = toSpeedMultiple(10);
        const { wall, clock } = setUp(speed);
        clock.start();
        wall.time = 100;
        clock.pause();
        wall.time = 5000;
        clock.tick();

        clock.start();
        wall.time = 5100;
        clock.tick();

        expect(clock.now.milliseconds).toBe(2000);
    });

    it('counts the time before a speed change at the old speed', () => {
        const speed = toSpeedMultiple(10);
        const { wall, clock } = setUp(speed);
        clock.start();

        wall.time = 100;
        const secondSpeed = toSpeedMultiple(1);
        clock.setSpeed(secondSpeed);

        expect(clock.now.milliseconds).toBe(1000);
    });

    it('counts the time before a pause at the current speed', () => {
        const speed = toSpeedMultiple(10);
        const { wall, clock } = setUp(speed);
        clock.start();
        wall.time = 100;
        const secondSpeed = toSpeedMultiple(1);
        clock.setSpeed(secondSpeed);

        wall.time = 200;
        clock.pause();

        expect(clock.now.milliseconds).toBe(1100);
    });

    it('steps by exactly one piece of scheduled work, and stays paused', () => {
        const { scheduler, clock } = setUp();
        const ran = scheduleAt(scheduler, [100, 200]);

        const didRun = clock.step();

        expect(didRun).toBe(true);
        expect(ran).toEqual([100]);
        expect(clock.now.milliseconds).toBe(100);
        expect(clock.isRunning).toBe(false);
    });

    it('moves to the next piece of work on the next step', () => {
        const { scheduler, clock } = setUp();
        scheduleAt(scheduler, [100, 200]);
        clock.step();

        clock.step();

        expect(clock.now.milliseconds).toBe(200);
    });

    it('reports when no work is left to step to', () => {
        const { scheduler, clock } = setUp();
        scheduleAt(scheduler, [100]);
        clock.step();

        const hasStepped = clock.step();
        expect(hasStepped).toBe(false);
    });

    it('continues from a step at the right time', () => {
        const speed = toSpeedMultiple(10);
        const { wall, scheduler, clock } = setUp(speed);
        scheduler.add(100, () => undefined);
        clock.step();

        clock.start();
        wall.time = 10;
        clock.tick();

        expect(clock.now.milliseconds).toBe(200);
    });

    it('pauses a running clock when stepping', () => {
        const speed = toSpeedMultiple(1);
        const { wall, scheduler, clock } = setUp(speed);
        scheduler.add(5000, () => undefined);
        clock.start();
        wall.time = 10;

        clock.step();

        expect(clock.isRunning).toBe(false);
        expect(clock.now.milliseconds).toBe(5000);
    });

    it('loses no time when started twice', () => {
        const speed = toSpeedMultiple(1);
        const { wall, clock } = setUp(speed);
        clock.start();
        wall.time = 100;

        clock.start();
        clock.tick();

        expect(clock.now.milliseconds).toBe(100);
    });

    it('does not count time before it starts, when the speed is set', () => {
        const speed = toSpeedMultiple(1);
        const { wall, clock } = setUp(speed);
        wall.time = 100;

        const secondSpeed = toSpeedMultiple(1);
        clock.setSpeed(secondSpeed);
        clock.start();
        wall.time = 150;
        clock.tick();

        expect(clock.now.milliseconds).toBe(50);
    });

    it('runs no work at max until it starts', () => {
        const { scheduler, clock } = setUp('max');
        const ran: number[] = [];
        scheduler.add(1000, (now) => ran.push(now));

        clock.tick();

        expect(ran).toEqual([]);
    });

    it('jumps between pieces of work at max, with no real time passing', () => {
        const { scheduler, clock } = setUp('max');
        const ran = scheduleAt(scheduler, [1000, 5000]);
        clock.start();

        clock.tick();

        expect(ran).toEqual([1000, 5000]);
        expect(clock.now.milliseconds).toBe(5000);
    });

    it('keeps one tick at max short when work never runs out', () => {
        const { scheduler, clock } = setUp('max');
        const job = (now: number): void => {
            scheduler.add(now + 1, job);
        };
        scheduler.add(0, job);
        clock.start();

        clock.tick();

        expect(clock.now.milliseconds).toBe(999);
    });

    it('runs no more work when paused or slowed down at max', () => {
        const { wall, scheduler, clock } = setUp('max');
        const ran: number[] = [];
        scheduler.add(1000, (now) => ran.push(now));
        clock.start();

        wall.time = 10;
        clock.pause();
        clock.start();
        const speed = toSpeedMultiple(1);
        clock.setSpeed(speed);

        expect(ran).toEqual([]);
        expect(clock.now.milliseconds).toBe(0);
    });

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('refuses a speed of %s', (speed) => {
        const { clock } = setUp();

        expect(() => {
            const factor = toSpeedMultiple(speed);
            clock.setSpeed(factor);
        }).toThrow(RangeError);
        expect(() => {
            const factor = toSpeedMultiple(speed);
            setUp(factor);
        }).toThrow(RangeError);
    });

    describe('runs the same work in the same order', () => {
        const expected = ((): string[] => {
            const scheduler = new ClosureScheduler();
            const ran = scheduleSample(scheduler);
            const time = toSimTime(20000);
            scheduler.advanceTo(time);
            return ran;
        })();

        it.each<[string, ClockSpeed]>([
            ['max', 'max'],
            ['1000x', toSpeedMultiple(1000)],
            ['60x', toSpeedMultiple(60)],
            ['1x', toSpeedMultiple(1)],
            ['0.5x', toSpeedMultiple(0.5)],
        ])('at %s', (_name, speed) => {
            const { wall, scheduler, clock } = setUp(speed);
            const ran = scheduleSample(scheduler);
            clock.start();

            tickUntilAllRan(wall, clock, ran, expected.length);

            expect(ran).toEqual(expected);
        });

        it('by stepping', () => {
            const { scheduler, clock } = setUp();
            const ran = scheduleSample(scheduler);

            stepToTheEnd(clock);

            expect(ran).toEqual(expected);
        });

        it('when pausing, stepping, and changing speed along the way', () => {
            const { wall, scheduler, clock } = setUp();
            const ran = scheduleSample(scheduler);

            mixSpeedsUntilAllRan(wall, clock, ran, expected.length);

            expect(ran).toEqual(expected);
        });
    });
});
