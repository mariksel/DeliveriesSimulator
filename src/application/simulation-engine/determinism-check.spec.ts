import type { List } from 'immutable';
import { List as ImmutableList } from 'immutable';
import { describe, expect, it } from 'vitest';

import { appendEntry } from '../../domain/event-log/event-log';
import { ClosureScheduler } from '../../domain/simulation-engine/closure-scheduler.testing';
import { SeededRandom } from '../../domain/simulation-engine/seeded-random';
import type { ClockSpeed } from './clock-speed';
import { checkDeterminism } from './determinism-check';
import { SimulationClock } from './simulation-clock';
import { WallClock } from '../../application-core/simulation-engine/wall-clock';
import {
    commandIssued,
    inboxRead,
    orderCreated,
} from '../../application-core/simulation-engine/run-log-entries.testing';
import type {
    RunLogEntry,
    RunLogRecord,
} from '../../application-core/simulation-engine/run-log-entry';
import { toSpeedMultiple } from '../../domain/simulation-engine/numbers';
import { toSeed, toWallTime } from '../../domain/simulation-engine/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import type { WallTime } from '../../domain/simulation-engine/numbers';

class FakeWallClock extends WallClock {
    time = 0;
    now(): WallTime {
        return toWallTime(this.time);
    }
}

/** A small run: drivers wait a random time, then each act, and some cause a second event. */
function sampleRun(seed: number, speed: ClockSpeed = 'max'): List<RunLogEntry> {
    const wall = new FakeWallClock();
    const scheduler = new ClosureScheduler();
    const clock = new SimulationClock(scheduler, wall, speed);
    const secondSeed = toSeed(seed);
    let random = SeededRandom.createNew(secondSeed);
    let log = ImmutableList<RunLogEntry>();
    let pending = 0;
    const between = (name: string, min: number, max: number): number => {
        const [value, next] = random.drawFrom(name, (stream) => stream.nextBetween(min, max));
        random = next;
        return value;
    };
    const fraction = (name: string): number => {
        const [value, next] = random.drawFrom(name, (stream) => stream.nextFraction());
        random = next;
        return value;
    };
    for (let driver = 0; driver < 20; driver++) {
        const name = `driver:${driver}`;
        pending++;
        const secondBetween = between(name, 0, 5000);
        scheduler.add(secondBetween, (now) => {
            pending--;
            const acted: RunLogRecord = commandIssued('accept', `order-${driver}`, name);
            const at = toSimTime(now);
            log = appendEntry<RunLogRecord>(log, at, acted, undefined);
            const action = log.last()!;
            if (fraction(name) < 0.5) {
                pending++;
                scheduler.add(now + between(name, 1, 500), (later) => {
                    pending--;
                    const reacted: RunLogRecord = inboxRead('orders', `outbox-${driver}`);
                    const at = toSimTime(later);
                    log = appendEntry<RunLogRecord>(log, at, reacted, action.sequence);
                });
            }
        });
    }
    clock.start();
    while (pending > 0) {
        wall.time += 50;
        clock.tick();
    }
    return log;
}

describe('checkDeterminism', () => {
    it('finds no difference when a run repeats from the same seed', () => {
        const runDifference = checkDeterminism(() => sampleRun(42));
        expect(runDifference).toBeNull();
    });

    it('reports the first difference when a run is made to differ', () => {
        let seed = 1;

        const difference = checkDeterminism(() => sampleRun(seed++));
        const first = sampleRun(1).toArray();
        const second = sampleRun(2).toArray();
        const sequence = difference?.sequence ?? -1;

        expect(difference).not.toBeNull();
        expect(difference?.first).not.toEqual(difference?.second);
        const logEntries = first.slice(0, sequence);
        const expected = second.slice(0, sequence);
        expect(logEntries).toEqual(expected);
        expect(first[sequence]).not.toEqual(second[sequence]);
    });

    it('reports a run that uses randomness from outside its seed', () => {
        let draws = 0;
        const run = (): List<RunLogEntry> => {
            const log = ImmutableList<RunLogEntry>();
            const created: RunLogRecord = orderCreated();
            const at = toSimTime(0);
            const same = appendEntry<RunLogRecord>(log, at, created, undefined);
            const drifts: RunLogRecord = commandIssued('accept', `order-${draws++}`);
            const secondAt = toSimTime(1);
            return appendEntry<RunLogRecord>(same, secondAt, drifts, undefined);
        };

        expect(checkDeterminism(run)?.sequence).toBe(1);
    });

    it.each<[string, ClockSpeed]>([
        ['1000x', toSpeedMultiple(1000)],
        ['60x', toSpeedMultiple(60)],
        ['1x', toSpeedMultiple(1)],
    ])('gives the same run at %s as at max', (_name, speed) => {
        const logEntries = sampleRun(42, speed).toArray();
        const expected = sampleRun(42, 'max').toArray();
        expect(logEntries).toEqual(expected);
    });
});
