import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { checkDeterminism } from './determinism-check';
import { HAPPY_PATH, START } from './one-order-run.testing';
import { scheduleInputs } from '../../application-core/simulation-engine/run-inputs';
import type {
    IRulesInput,
    IRunInput,
    IRunStart,
    ScriptInput,
} from '../../application-core/simulation-engine/run-input';
import { EffectKind } from '../../application-core/simulation-engine/direct-effect';
import { RunJob } from '../../application-core/simulation-engine/run-work';
import { changesOf } from '../../domain/business-rules/parameter-change.testing';
import {
    DISPATCH_PASS,
    DISPATCH_PASS_INTERVAL,
} from '../../domain/drivers/drivers-rule-definitions';
import { createRun } from '../../application-core/simulation-engine/run-state';
import { SimulationRun } from './simulation-run';
import { toOrderId } from '../../domain/orders/order';
import {
    toInputActor,
    toInputOrderName,
} from '../../application-core/simulation-engine/run-input';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { toVersionNumber } from '../../domain/system/records/version-chain';
import { toSimTime } from '../../domain/simulation-engine/sim-time';

function runScript(steps: readonly IRunInput[], until = 300_000, seed = 1): SimulationRun {
    const secondRun = createRun({ seed: toSeed(seed) });
    const scriptedSteps = List(steps);
    const start = scheduleInputs(secondRun, START, scriptedSteps);
    const run = new SimulationRun(start);
    const time = toSimTime(until);
    run.advanceTo(time);
    return run;
}

function commands(run: SimulationRun): (string | number)[][] {
    return run.state.cache.log.entries
        .toArray()
        .filter((entry) => entry.kind === 'CommandIssued')
        .map((entry) => {
            const data = entry.data as { actor: string; name: string };
            return [entry.at.sinceStart.milliseconds, data.actor, data.name];
        });
}

function refusals(run: SimulationRun): unknown[][] {
    return run.state.cache.log.entries
        .toArray()
        .filter((entry) => entry.kind === 'CommandRefused')
        .map((entry) => {
            const data = entry.data as { name: string; refusal: unknown };
            return [entry.at, data.name, data.refusal];
        });
}

describe('scripted actors', () => {
    it('drive one order to delivered, through both modules', () => {
        const run = runScript(HAPPY_PATH);

        const id = toOrderId('order-1');
        const orderVersion = run.state.root.state.orders.orderVersionOf(id);
        expect(orderVersion).toMatchObject({
            status: 'Delivered',
            number: toVersionNumber(7),
            driverId: 'driver-1',
        });
        const orderId = toOrderId('order-1');
        expect(run.state.root.state.deliveries.deliveryVersionOf(orderId)?.state).toBe(
            'Delivered',
        );
        const secondRefusals = refusals(run);
        expect(secondRefusals).toEqual([]);
    });

    it('act at exactly the times the steps state, each by its stated actor', () => {
        const run = runScript(HAPPY_PATH);

        const secondCommands = commands(run);
        const expected = HAPPY_PATH.map((step) => [step.at, step.actor, step.command]);
        expect(secondCommands).toEqual(expected);
    });

    it('do nothing before a step is due', () => {
        const run = runScript(HAPPY_PATH, 1999);

        const id = toOrderId('order-1');
        const orderVersion = run.state.root.state.orders.orderVersionOf(id);
        expect(orderVersion).toMatchObject({
            status: 'Created',
            number: toVersionNumber(1),
        });
    });

    it('run steps due at the same time in the given order', () => {
        const steps: IRunInput[] = [
            {
                at: toSimTime(1000),
                actor: toInputActor('restaurant-1'),
                command: 'create-order',
                order: toInputOrderName('A'),
            },
            {
                at: toSimTime(1000),
                actor: toInputActor('restaurant-1'),
                command: 'mark-ready',
                order: toInputOrderName('A'),
            },
        ];

        const run = runScript(steps);

        const id = toOrderId('order-1');
        expect(run.state.root.state.orders.orderVersionOf(id)?.isReady).toBe(true);
        const secondRefusals = refusals(run);
        expect(secondRefusals).toEqual([]);
    });

    it('keep each named order separate', () => {
        const steps: IRunInput[] = [
            {
                at: toSimTime(1),
                actor: toInputActor('restaurant-1'),
                command: 'create-order',
                order: toInputOrderName('A'),
            },
            {
                at: toSimTime(2),
                actor: toInputActor('restaurant-1'),
                command: 'create-order',
                order: toInputOrderName('B'),
            },
            {
                at: toSimTime(3),
                actor: toInputActor('restaurant-1'),
                command: 'mark-ready',
                order: toInputOrderName('B'),
            },
        ];

        const run = runScript(steps);

        const id = toOrderId('order-1');
        expect(run.state.root.state.orders.orderVersionOf(id)?.isReady).toBe(false);
        const orderId = toOrderId('order-2');
        expect(run.state.root.state.orders.orderVersionOf(orderId)?.isReady).toBe(true);
    });

    it('add the starting drivers, so dispatch can notify them', () => {
        const run = runScript(HAPPY_PATH);

        const orderId = toOrderId('order-1');
        const notifications = run.state.root.state.deliveries
            .notificationsOf(orderId)
            .map((notification) => notification.driverId)
            .toArray();
        expect(notifications).toEqual(['driver-1']);
    });

    it('repeat exactly from the same seed', () => {
        const runDifference = checkDeterminism(
            () => runScript(HAPPY_PATH, 300_000, 42).state.cache.log.entries,
        );
        expect(runDifference).toBeNull();
    });

    describe('log a refused step, and carry on', () => {
        it.each<[string, IRunInput[], unknown[]]>([
            [
                'a restaurant that does not exist',
                [
                    {
                        at: toSimTime(1),
                        actor: toInputActor('nobody'),
                        command: 'create-order',
                        order: toInputOrderName('A'),
                    },
                ],
                [1, 'create-order', 'UnknownRestaurant'],
            ],
            [
                'an order created twice',
                [
                    {
                        at: toSimTime(1),
                        actor: toInputActor('restaurant-1'),
                        command: 'create-order',
                        order: toInputOrderName('A'),
                    },
                    {
                        at: toSimTime(2),
                        actor: toInputActor('restaurant-1'),
                        command: 'create-order',
                        order: toInputOrderName('A'),
                    },
                ],
                [2, 'create-order', 'OrderAlreadyCreated'],
            ],
            [
                'an order that does not exist',
                [
                    {
                        at: toSimTime(1),
                        actor: toInputActor('restaurant-1'),
                        command: 'mark-ready',
                        order: toInputOrderName('A'),
                    },
                ],
                [1, 'mark-ready', 'UnknownOrder'],
            ],
            [
                'a step orders refuses',
                [
                    {
                        at: toSimTime(1),
                        actor: toInputActor('restaurant-1'),
                        command: 'create-order',
                        order: toInputOrderName('A'),
                    },
                    {
                        at: toSimTime(2),
                        actor: toInputActor('restaurant-1'),
                        command: 'mark-ready',
                        order: toInputOrderName('A'),
                    },
                    {
                        at: toSimTime(3),
                        actor: toInputActor('restaurant-1'),
                        command: 'mark-ready',
                        order: toInputOrderName('A'),
                    },
                ],
                [3, 'mark-ready', 'AlreadyReady'],
            ],
            [
                'a driver that does not exist',
                [
                    {
                        at: toSimTime(1),
                        actor: toInputActor('restaurant-1'),
                        command: 'create-order',
                        order: toInputOrderName('A'),
                    },
                    {
                        at: toSimTime(2),
                        actor: toInputActor('restaurant-1'),
                        command: 'request-delivery',
                        order: toInputOrderName('A'),
                    },
                    {
                        at: toSimTime(3),
                        actor: toInputActor('nobody'),
                        command: 'accept',
                        order: toInputOrderName('A'),
                    },
                ],
                [3, 'accept', 'UnknownDriver'],
            ],
        ])('%s', (_name, steps, refusal) => {
            const run = runScript(steps);
            const secondRefusals = refusals(run);
            expect(secondRefusals).toEqual([refusal]);
        });

        it('a pickup before the order is ready, passing on the refusal from orders', () => {
            const steps = HAPPY_PATH.filter((step) => step.command !== 'mark-ready');

            const run = runScript(steps, 130_000);

            const secondRefusals = refusals(run);
            expect(secondRefusals).toEqual([[120_000, 'pick-up', { orders: 'NotReady' }]]);
            const id = toOrderId('order-1');
            expect(run.state.root.state.orders.orderVersionOf(id)?.status).toBe('DriverAssigned');
        });

        it('traces a refusal to its command', () => {
            const run = runScript([
                {
                    at: toSimTime(1),
                    actor: toInputActor('restaurant-1'),
                    command: 'mark-ready',
                    order: toInputOrderName('A'),
                },
            ]);
            const [command, refusal] = run.state.cache.log.entries.toArray();

            expect(refusal).toMatchObject({
                source: 'actors',
                kind: 'CommandRefused',
                causedBy: command?.sequence,
                trace: command?.sequence,
            });
        });

        it('carries on with the next step', () => {
            const steps: IRunInput[] = [
                {
                    at: toSimTime(1),
                    actor: toInputActor('restaurant-1'),
                    command: 'mark-ready',
                    order: toInputOrderName('A'),
                },
                {
                    at: toSimTime(2),
                    actor: toInputActor('restaurant-1'),
                    command: 'create-order',
                    order: toInputOrderName('A'),
                },
            ];

            const id = toOrderId('order-1');
            const orderVersion = runScript(steps).state.root.state.orders.orderVersionOf(id);
            expect(orderVersion).toBeDefined();
        });
    });
});

describe("a script's rule changes", () => {
    const tenSeconds = changesOf(DISPATCH_PASS, DISPATCH_PASS_INTERVAL, 10_000);

    function runWithRules(start: IRunStart, steps: readonly ScriptInput[]): SimulationRun {
        const created = createRun({ seed: toSeed(1) });
        const scriptedSteps = List(steps);
        const scheduled = scheduleInputs(created, start, scriptedSteps);
        const run = new SimulationRun(scheduled);
        const time = toSimTime(60_000);
        run.advanceTo(time);
        return run;
    }

    function passTimes(run: SimulationRun): number[] {
        return run.state.line.commits
            .valueSeq()
            .filter(
                (commit) =>
                    commit.effect?.kind === EffectKind.Job &&
                    commit.effect.job === RunJob.DispatchPass,
            )
            .map((commit) => commit.at.milliseconds)
            .toArray();
    }

    it('change the rules at their time, as a config change commit that counts as a step', () => {
        const rulesStep: IRulesInput = { at: toSimTime(5000), changes: tenSeconds };

        const run = runWithRules(START, [rulesStep]);

        const changes = run.state.line.commits
            .valueSeq()
            .filter((commit) => commit.effect?.kind === EffectKind.ConfigChange)
            .map((commit) => commit.at.milliseconds)
            .toArray();
        expect(changes).toEqual([5000]);
        expect(run.state.cache.stepsRun).toBe(1);
        const times = passTimes(run);
        expect(times).toEqual([0, 10_000, 20_000, 30_000, 40_000, 50_000, 60_000]);
    });

    it('set the rules a run starts with, with no commit', () => {
        const start: IRunStart = { ...START, rules: tenSeconds };

        const run = runWithRules(start, []);

        const hasConfigChange = run.state.line.commits
            .valueSeq()
            .some((commit) => commit.effect?.kind === EffectKind.ConfigChange);
        expect(hasConfigChange).toBe(false);
        const { values } = run.state.root.effects.direct;
        expect(values.drivers.dispatchPassMs.milliseconds).toBe(10_000);
        const times = passTimes(run);
        expect(times).toEqual([0, 10_000, 20_000, 30_000, 40_000, 50_000, 60_000]);
    });
});
