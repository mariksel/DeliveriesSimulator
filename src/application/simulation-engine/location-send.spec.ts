import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { TESTING_FUNCTIONS } from '../../application-core/simulation-engine/function-lookup.testing';
import { isLocationsSent } from '../../application-core/simulation-engine/direct-effect';
import type { IRider } from '../../application-core/simulation-engine/rider';
import { DEFAULT_SPEED_KMH } from '../../application-core/simulation-engine/rider';
import type { IRunInput, IRunStart } from '../../application-core/simulation-engine/run-input';
import { scheduleInputs } from '../../application-core/simulation-engine/run-inputs';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import { createRun } from '../../application-core/simulation-engine/run-state';
import { NewDriver, toDriverId } from '../../domain/drivers/driver';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { Duration } from '../../domain/system/time/duration';
import { HAPPY_PATH, START } from './one-order-run.testing';
import { SimulationRun } from './simulation-run';

const DRIVER = toDriverId('driver-1');
const NO_STEPS = List<IRunInput>();
const ALL_STEPS = List(HAPPY_PATH);
const MS_PER_SECOND = 1000;

/** The one-order start, with the driver's app sending every so many seconds. */
function startSendingEvery(seconds: number, start: IRunStart = START): IRunStart {
    const sendEvery = Duration.ofSeconds(seconds);
    const rider: IRider = { driverId: DRIVER, sendEvery, speedKmh: DEFAULT_SPEED_KMH };
    return { ...start, riders: List.of(rider) };
}

/** A start, run to a time with some steps. */
function ridden(start: IRunStart, untilMs: number, steps: List<IRunInput>): IRunState {
    const created = createRun({ functions: TESTING_FUNCTIONS, seed: toSeed(1) });
    const scheduled = scheduleInputs(created, start, steps);
    const run = new SimulationRun(scheduled);
    const until = toSimTime(untilMs);
    run.advanceTo(until);
    return run.state;
}

/** When each of a run's location sends was, in seconds. */
function sendTimes(run: IRunState): number[] {
    const commits = run.line.commits.valueSeq().toArray();
    return commits.flatMap((commit) =>
        commit.effect !== null && isLocationsSent(commit.effect)
            ? [commit.effect.at.milliseconds / MS_PER_SECOND]
            : [],
    );
}

/** Each send commit of a run: when, in seconds, and whose apps sent then. */
function batches(run: IRunState): [number, string[]][] {
    const commits = run.line.commits.valueSeq().toArray();
    return commits.flatMap((commit): [number, string[]][] => {
        const { effect } = commit;
        if (effect === null || !isLocationsSent(effect)) {
            return [];
        }
        const actors = effect.sends.map((send) => send.actor).toArray();
        return [[effect.at.milliseconds / MS_PER_SECOND, actors]];
    });
}

const SECOND_DRIVER = toDriverId('driver-2');

/** The one-order start with a second driver beside the first, each app sending as given. */
function twoSendingEvery(first: number, second: number): IRunStart {
    const [driver] = START.drivers.toArray();
    const other = NewDriver.create({
        id: SECOND_DRIVER,
        areaId: driver!.areaId,
        availability: driver!.availability,
        location: driver!.location,
    });
    const riders = List.of<IRider>(
        { driverId: DRIVER, sendEvery: Duration.ofSeconds(first), speedKmh: DEFAULT_SPEED_KMH },
        {
            driverId: SECOND_DRIVER,
            sendEvery: Duration.ofSeconds(second),
            speedKmh: DEFAULT_SPEED_KMH,
        },
    );
    return { ...START, drivers: START.drivers.push(other), riders };
}

describe("a driver's app sending its location", () => {
    it('sends every interval while the driver is online, from the start', () => {
        const start = startSendingEvery(30);

        const run = ridden(start, 100_000, NO_STEPS);

        const times = sendTimes(run);
        const location = run.root.state.drivers.locationOf(DRIVER);
        expect(times).toEqual([30, 60, 90]);
        expect(location?.deviceTime.sinceStart.milliseconds).toBe(90_000);
        expect(location?.number).toBe(4);
    });

    it('sends at the interval the driver is given', () => {
        const start = startSendingEvery(10);

        const run = ridden(start, 35_000, NO_STEPS);

        const times = sendTimes(run);
        expect(times).toEqual([10, 20, 30]);
    });

    it('makes one call of every app due at a moment, in the order of the drivers', () => {
        const start = twoSendingEvery(30, 30);

        const run = ridden(start, 70_000, NO_STEPS);

        const sent = batches(run);
        expect(sent).toEqual([
            [30, ['driver-1', 'driver-2']],
            [60, ['driver-1', 'driver-2']],
        ]);
    });

    it('holds only the apps due then when their intervals differ', () => {
        const start = twoSendingEvery(30, 60);

        const run = ridden(start, 100_000, NO_STEPS);

        const sent = batches(run);
        expect(sent).toEqual([
            [30, ['driver-1']],
            [60, ['driver-1', 'driver-2']],
            [90, ['driver-1']],
        ]);
    });

    it('sends nothing for a driver who is offline, or whom the start does not ride', () => {
        const [driver] = START.drivers.toArray();
        const offlineDriver = NewDriver.create({
            id: DRIVER,
            areaId: driver!.areaId,
            availability: null,
            location: driver!.location,
        });
        const offline = { ...START, drivers: List.of(offlineDriver) };
        const offlineStart = startSendingEvery(30, offline);

        const noRider = ridden(START, 100_000, NO_STEPS);
        const asOffline = ridden(offlineStart, 100_000, NO_STEPS);

        const noRiderTimes = sendTimes(noRider);
        const offlineTimes = sendTimes(asOffline);
        expect(noRiderTimes).toEqual([]);
        expect(offlineTimes).toEqual([]);
    });

    it("keeps the script's steps as they were: the order is still delivered", () => {
        const start = startSendingEvery(30);

        const run = ridden(start, 300_000, ALL_STEPS);

        const orderId = run.cache.orderIds.get(HAPPY_PATH[0]!.order);
        const status = run.root.state.orders.viewOf(orderId!)?.status;
        const times = sendTimes(run);
        expect(status).toBe('Delivered');
        expect(times).toHaveLength(10);
    });
});
