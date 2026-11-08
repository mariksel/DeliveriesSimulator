import { List } from 'immutable';

import { describe, expect, it } from 'vitest';

import { deepFrozen } from '../../domain/system/classes/deep-freeze.testing';
import { toAreaId } from '../../domain/map-and-routing/area-id';
import { toDriverId } from '../../domain/drivers/driver';
import { toRestaurantId } from '../../domain/restaurants/restaurant-place';
import {
    toInputActor,
    toInputOrderName,
} from '../../application-core/simulation-engine/run-input';
import { runShape } from '../../application-core/simulation-engine/run-shape.testing';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import { createRun, startingFrom } from '../../application-core/simulation-engine/run-state';
import { scheduleInputs } from '../../application-core/simulation-engine/run-inputs';
import type { IRunInput } from '../../application-core/simulation-engine/run-input';
import { SimulationRun } from './simulation-run';
import { Coordinates } from '../../domain/map-and-routing/coordinates';
import { RestaurantPlace } from '../../domain/restaurants/restaurant-place';
import { DriverLocation, NewDriver } from '../../domain/drivers/driver';
import { toDegrees } from '../../domain/map-and-routing/numbers';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';

/** Long enough for a full run written out at every step, under coverage. */
const STEP_BY_STEP_TIMEOUT_MS = 30_000;

const COORDINATES = Coordinates.create({
    latitude: toDegrees(10.33),
    longitude: toDegrees(20.82),
});
const THE_RESTAURANT = RestaurantPlace.create({
    id: toRestaurantId('r'),
    areaId: toAreaId('area-1'),
    coordinates: COORDINATES,
});
const THE_DRIVER = NewDriver.create({
    id: toDriverId('d'),
    areaId: toAreaId('area-1'),
    availability: 'Available' as const,
    location: DriverLocation.create({ coordinates: COORDINATES, deviceTime: toSimTime(0) }),
});
const START = {
    restaurants: List.of(THE_RESTAURANT),
    drivers: List.of(THE_DRIVER),
};
const STEPS = List<IRunInput>([
    {
        at: toSimTime(1000),
        actor: toInputActor('r'),
        command: 'create-order',
        order: toInputOrderName('A'),
    },
    {
        at: toSimTime(2000),
        actor: toInputActor('r'),
        command: 'request-delivery',
        order: toInputOrderName('A'),
    },
    {
        at: toSimTime(40_000),
        actor: toInputActor('r'),
        command: 'mark-ready',
        order: toInputOrderName('A'),
    },
    {
        at: toSimTime(60_000),
        actor: toInputActor('d'),
        command: 'accept',
        order: toInputOrderName('A'),
    },
    {
        at: toSimTime(120_000),
        actor: toInputActor('d'),
        command: 'pick-up',
        order: toInputOrderName('A'),
    },
    {
        at: toSimTime(240_000),
        actor: toInputActor('d'),
        command: 'deliver',
        order: toInputOrderName('A'),
    },
]);
const MIDWAY = 100_000;
const END = 300_000;

function startState(): IRunState {
    const run = createRun({ seed: toSeed(1) });
    return scheduleInputs(run, START, STEPS);
}
/**
 * A state's shape, leaving out its history: that holds every earlier root, which would make this
 * slow.
 */
function textOf(state: IRunState): unknown {
    const runState = startingFrom(state, state.root);
    return runShape(runState);
}

function snapshotAtMidway(): { run: SimulationRun; snapshot: IRunState } {
    const start = startState();
    const run = new SimulationRun(start);
    const time = toSimTime(MIDWAY);
    run.advanceTo(time);
    return { run, snapshot: run.state };
}

function runToEnd(from: IRunState): SimulationRun {
    const run = new SimulationRun(from);
    const time = toSimTime(END);
    run.advanceTo(time);
    return run;
}

/** Runs step by step, keeping every state along the way and how each looked when it was taken. */
function everyStepOfARun(): { snapshot: IRunState; text: unknown }[] {
    const start = startState();
    const run = new SimulationRun(start);
    const seen = [{ snapshot: run.state, text: textOf(run.state) }];
    while (run.now.milliseconds < END && run.runNext()) {
        seen.push({ snapshot: run.state, text: textOf(run.state) });
    }
    return seen;
}

describe('a snapshot of a run', () => {
    it('is unchanged when the run goes on', () => {
        const { run, snapshot } = snapshotAtMidway();
        const before = textOf(snapshot);

        const time = toSimTime(END);
        run.advanceTo(time);

        const text = textOf(snapshot);
        expect(text).toEqual(before);
    });

    it('keeps its history as it was when the run goes on', () => {
        const { run, snapshot } = snapshotAtMidway();
        const before = snapshot.line.commits.size;

        const time = toSimTime(END);
        run.advanceTo(time);

        expect(snapshot.line.commits.size).toBe(before);
        expect(run.line.commits.size).toBeGreaterThan(before);
    });

    it('is not what the run has moved on to', () => {
        const { run, snapshot } = snapshotAtMidway();

        const time = toSimTime(END);
        run.advanceTo(time);

        expect(run.state.cache.log.entries.size).toBeGreaterThan(snapshot.cache.log.entries.size);
    });

    // It writes out the whole run at every step, which takes seconds under coverage.
    it('holds at every step of a run', { timeout: STEP_BY_STEP_TIMEOUT_MS }, () => {
        const seen = everyStepOfARun();

        const before = seen.map(({ text }) => text);
        const after = seen.map(({ snapshot }) => textOf(snapshot));

        expect(seen.length).toBeGreaterThan(STEPS.size);
        expect(after).toEqual(before);
    });

    it('can be run on when deep-frozen, so nothing tries to change it', () => {
        const { snapshot } = snapshotAtMidway();
        const from = startState();
        const whole = runToEnd(from);

        const runState = deepFrozen(snapshot);
        const resumed = runToEnd(runState);

        const text = textOf(resumed.state);
        const expected = textOf(whole.state);
        expect(text).toEqual(expected);
    });

    it('gives the same end each time it is run on', () => {
        const { snapshot } = snapshotAtMidway();

        const first = runToEnd(snapshot);
        const second = runToEnd(snapshot);

        const text = textOf(second.state);
        const expected = textOf(first.state);
        expect(text).toEqual(expected);
    });

    it('can branch, and a branch affects neither the other branch nor the snapshot', () => {
        const { snapshot } = snapshotAtMidway();
        const before = textOf(snapshot);
        const plain = runToEnd(snapshot);
        const expected = textOf(plain.state);
        const changedStep: IRunInput = {
            at: toSimTime(110_000),
            actor: toInputActor('nobody'),
            command: 'create-order',
            order: toInputOrderName('B'),
        };

        const steps = List.of(changedStep);
        const from = scheduleInputs(snapshot, { restaurants: List(), drivers: List() }, steps);
        const branch = runToEnd(from);

        const text = textOf(branch.state);
        expect(text).not.toEqual(expected);
        const secondText = textOf(plain.state);
        expect(secondText).toEqual(expected);
        const thirdText = textOf(snapshot);
        expect(thirdText).toEqual(before);
    });

    it('shares what has not changed with the state after it, which is what makes one cheap', () => {
        const { run, snapshot } = snapshotAtMidway();

        const time = toSimTime(END);
        run.advanceTo(time);

        const entry = run.state.cache.log.entries.get(0);
        const expected = snapshot.cache.log.entries.get(0);
        expect(entry).toBe(expected);
    });
});
