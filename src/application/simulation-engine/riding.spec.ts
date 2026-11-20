import { List, OrderedMap } from 'immutable';
import { describe, expect, it } from 'vitest';

import { TESTING_FUNCTIONS } from '../../application-core/simulation-engine/function-lookup.testing';
import {
    EffectKind,
    isLocationsSent,
} from '../../application-core/simulation-engine/direct-effect';
import type { IndirectEffect } from '../../application-core/simulation-engine/indirect-effect';
import { RideKind } from '../../application-core/simulation-engine/ride';
import type { IRider } from '../../application-core/simulation-engine/rider';
import {
    DEFAULT_SEND_EVERY,
    DEFAULT_SPEED_KMH,
} from '../../application-core/simulation-engine/rider';
import type { IRunInput, IRunStart } from '../../application-core/simulation-engine/run-input';
import { scheduleInputs } from '../../application-core/simulation-engine/run-inputs';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import { createRun } from '../../application-core/simulation-engine/run-state';
import { toDriverId } from '../../domain/drivers/driver';
import { toAreaId } from '../../domain/map-and-routing/area-id';
import { City, DEFAULT_BLOCK_METRES } from '../../domain/map-and-routing/city';
import { Coordinates } from '../../domain/map-and-routing/coordinates';
import { fromPlane, toPlane } from '../../domain/map-and-routing/local-plane';
import {
    toCitySeed,
    toDegrees,
    toKilometres,
    toMetres,
} from '../../domain/map-and-routing/numbers';
import { toCount } from '../../domain/system/math/math';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { HAPPY_PATH, START } from './one-order-run.testing';
import { SimulationRun } from './simulation-run';

const RIDER: IRider = {
    driverId: toDriverId('driver-1'),
    sendEvery: DEFAULT_SEND_EVERY,
    speedKmh: DEFAULT_SPEED_KMH,
};

const CORNER = Coordinates.create({ latitude: toDegrees(10.325), longitude: toDegrees(20.815) });

/** The built-in one-order scenario's city: four 1 km areas, restaurant and driver in area-1. */
const CITY = City.createNew({
    origin: CORNER,
    widthKm: toKilometres(2),
    heightKm: toKilometres(2),
    across: toCount(2),
    down: toCount(2),
    seed: toCitySeed(7),
    blockMetres: DEFAULT_BLOCK_METRES,
});

/** The one-order start in that city, with its driver riding. */
const RIDDEN: IRunStart = { ...START, city: CITY, riders: List.of(RIDER) };

/** The driver accepts at a minute, 112 m from the restaurant: a second later they are riding. */
const BEFORE_ARRIVAL = toSimTime(61_000);
const JUST_AFTER = toSimTime(62_000);
const RUN_END_MS = 300_000;
/** Long enough for the driver to ride back to wait after delivering. */
const LATER_END_MS = 900_000;
const AREA_1 = toAreaId('area-1');

type Change = Partial<Record<'pick-up' | 'deliver', Partial<IRunInput>>>;

/** The one-order steps, with the pick-up or the delivery changed. */
function stepsWith(changes: Change): List<IRunInput> {
    const steps = HAPPY_PATH.map((step) => {
        const change =
            step.command === 'pick-up' || step.command === 'deliver'
                ? changes[step.command]
                : undefined;
        return change === undefined ? step : { ...step, ...change };
    });
    return List(steps);
}

/** The one-order run with its driver riding, with some steps changed, run to a time. */
function ridden(changes: Change, start: IRunStart = RIDDEN, endMs = RUN_END_MS): IRunState {
    const steps = stepsWith(changes);
    const created = createRun({ functions: TESTING_FUNCTIONS, seed: toSeed(1) });
    const scheduled = scheduleInputs(created, start, steps);
    const run = new SimulationRun(scheduled);
    const until = toSimTime(endMs);
    run.advanceTo(until);
    return run.state;
}

/** The run's indirect commits of a riding kind, oldest first. */
function ridesOf(run: IRunState, kind: string): IndirectEffect[] {
    const commits = run.line.commits.valueSeq().toArray();
    return commits.flatMap((commit) => {
        const { indirect } = commit;
        return indirect?.kind === kind ? [indirect] : [];
    });
}

/** When each API call of a command ran, in milliseconds. */
function commandTimes(run: IRunState, command: string): number[] {
    const commits = run.line.commits.valueSeq().toArray();
    return commits.flatMap((commit) =>
        commit.effect?.kind === EffectKind.Input && commit.effect.command === command
            ? [commit.at.milliseconds]
            : [],
    );
}

/** When each riding decision of a kind was made, in milliseconds. */
function rideTimes(run: IRunState, kind: string): number[] {
    const rides = ridesOf(run, kind);
    return rides.map((effect) => effect.at.milliseconds);
}

describe('a riding driver', () => {
    it('sets off for the restaurant on accepting, and for the address on picking up', () => {
        const run = ridden({});

        const legs = ridesOf(run, RideKind.SetsOff).flatMap((effect) =>
            effect.kind === RideKind.SetsOff ? [[effect.at.milliseconds, effect.isPickUp]] : [],
        );
        expect(legs).toEqual([
            [60_000, true],
            [120_000, false],
        ]);
    });

    it("sends where their ride has them, so the app's locations move", () => {
        const run = ridden({});

        const commits = run.line.commits.valueSeq().toArray();
        const sent = commits.flatMap((commit) =>
            commit.effect !== null && isLocationsSent(commit.effect)
                ? commit.effect.sends.map((send) => send.location.latitude).toArray()
                : [],
        );
        const distinct = new Set(sent);
        expect(distinct.size).toBeGreaterThan(2);
    });

    it('waits for them at a pick-up stated before they arrive, and makes it on arrival', () => {
        const run = ridden({ 'pick-up': { at: BEFORE_ARRIVAL } });

        const waiting = rideTimes(run, RideKind.ActsOnArrival);
        const pickUps = commandTimes(run, 'pick-up');
        const [orderId] = run.root.state.orders.orderVersions.keySeq().toArray();
        const status = run.root.state.orders.viewOf(orderId!)?.status;
        expect(waiting).toEqual([61_000]);
        expect(pickUps).toHaveLength(1);
        expect(pickUps[0]).toBeGreaterThan(61_000);
        expect(status).toBe('Delivered');
    });

    it('makes a pick-up at its time when its step says so, arrived or not', () => {
        const run = ridden({ 'pick-up': { at: BEFORE_ARRIVAL, isAtItsTime: true } });

        const waiting = rideTimes(run, RideKind.ActsOnArrival);
        const pickUps = commandTimes(run, 'pick-up');
        expect(waiting).toEqual([]);
        expect(pickUps).toEqual([61_000]);
    });

    it('keeps a delivery behind its pick-up while that waits', () => {
        const run = ridden({ 'pick-up': { at: BEFORE_ARRIVAL }, deliver: { at: JUST_AFTER } });

        const pickUps = commandTimes(run, 'pick-up');
        const deliveries = commandTimes(run, 'deliver');
        const refused = run.cache.log.entries.filter((entry) => entry.kind === 'CommandRefused');
        expect(refused.size).toBe(0);
        expect(deliveries[0]).toBeGreaterThan(pickUps[0]!);
    });
});

/** Where the driver's app last said they were, in whole metres from the city's corner. */
function lastSentMetres(run: IRunState): [number, number] {
    const commits = run.line.commits.valueSeq().toArray();
    const sent = commits.flatMap((commit) =>
        commit.effect !== null && isLocationsSent(commit.effect)
            ? commit.effect.sends.map((send) => send.location).toArray()
            : [],
    );
    const { eastMetres, northMetres } = toPlane(CORNER, sent[sent.length - 1]!);
    return [Math.round(eastMetres), Math.round(northMetres)];
}

describe('a driver with nothing left to do', () => {
    it("sets off for their area's waiting point once they deliver their last order", () => {
        const run = ridden({}, RIDDEN, LATER_END_MS);

        const delivered = commandTimes(run, 'deliver');
        const waits = ridesOf(run, RideKind.GoesToWait).flatMap((effect) =>
            effect.kind === RideKind.GoesToWait ? [[effect.at.milliseconds, effect.areaId]] : [],
        );
        expect(waits).toEqual([[delivered[0], 'area-1']]);
    });

    it('waits at the crossing nearest the centre of their area', () => {
        const run = ridden({}, RIDDEN, LATER_END_MS);

        const metres = lastSentMetres(run);

        expect(metres).toEqual([400, 400]);
    });

    it('waits at the point the scenario sets for their area', () => {
        const point = fromPlane(CORNER, { eastMetres: toMetres(100), northMetres: toMetres(700) });
        const points = OrderedMap([[AREA_1, point]]);
        const city = CITY.withWaitingPoints(points);
        const start: IRunStart = { ...RIDDEN, city };

        const run = ridden({}, start, LATER_END_MS);

        const metres = lastSentMetres(run);
        expect(metres).toEqual([100, 700]);
    });

    it('stays where they finished when they rode in a run saved before waiting points', () => {
        const staying: IRider = { ...RIDER, isStayingWhenIdle: true };
        const start: IRunStart = { ...RIDDEN, riders: List.of(staying) };

        const run = ridden({}, start, LATER_END_MS);

        const waits = ridesOf(run, RideKind.GoesToWait);
        expect(waits).toEqual([]);
    });
});
