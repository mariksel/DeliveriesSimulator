import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import type { DirectEffect } from '../../application-core/simulation-engine/direct-effect';
import { EffectKind } from '../../application-core/simulation-engine/direct-effect';
import type { IMainRoot } from '../../application-core/simulation-engine/main-root';
import { withDirectEffect } from '../../application-core/simulation-engine/main-root';
import { RunJob } from '../../application-core/simulation-engine/run-work';
import {
    fromPersistedDirectEffect,
    fromPersistedMainRoot,
    toPersistedDirectEffect,
    toPersistedMainRoot,
} from './persisted-main-root';
import { oneOrderRun } from './sample-runs.testing';
import {
    toInputActor,
    toInputOrderName,
} from '../../application-core/simulation-engine/run-input';
import { toCount } from '../../domain/system/math/math';
import { Coordinates } from '../../domain/map-and-routing/coordinates';
import { toDegrees } from '../../domain/map-and-routing/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { toCommitId } from '../../application-core/simulation-engine/commit-id';
import { withIndirectEffect } from '../../application-core/simulation-engine/main-root';
import type { IndirectEffect } from '../../application-core/simulation-engine/indirect-effect';
import {
    IGNORED,
    LATE,
    REFUSED,
} from '../../application-core/simulation-engine/indirect-effects.testing';
import { versionChain } from '../../domain/system/records/version-chain';

/** The one-order run's last root, with a drawn stream added. */
function fullRoot(): IMainRoot {
    const { root } = oneOrderRun();
    const [, randomness] = root.effects.randomness.drawFrom('driver:driver-1', (stream) =>
        stream.nextUint32(),
    );
    return { ...root, effects: { ...root.effects, randomness } };
}

describe('a persisted main root', () => {
    it('maps back exactly, with its random streams', () => {
        const root = fullRoot();

        const persisted = toPersistedMainRoot(root);

        const loaded = fromPersistedMainRoot(persisted);
        expect(loaded).toEqual(root);
        expect(persisted.effects.randomness.streams).toHaveLength(1);
    });

    it('is plain data, which JSON keeps exactly', () => {
        const root = fullRoot();
        const persisted = toPersistedMainRoot(root);

        const text = JSON.stringify(persisted);
        const parsed: unknown = JSON.parse(text);

        expect(parsed).toEqual(persisted);
    });
});

const PLACE = Coordinates.create({ latitude: toDegrees(10.33), longitude: toDegrees(20.82) });
const OTHER_PLACE = Coordinates.create({
    latitude: toDegrees(10.331),
    longitude: toDegrees(20.821),
});

describe('a persisted direct effect', () => {
    const { root: latest } = oneOrderRun();
    const { values } = latest.effects.direct;
    const order = latest.state.orders.orderVersions.first()!;
    const firstOrder = versionChain(order).first()!;
    const driver = latest.state.drivers.driverVersions.first()!;

    it.each<[string, DirectEffect]>([
        [
            'an input with a refusal',
            {
                kind: EffectKind.Input,
                at: toSimTime(1),
                actor: toInputActor('driver-1'),
                command: 'accept',
                order: toInputOrderName('A'),
                response: { isOk: false, refusal: 'UnknownOrder' },
                followsFrom: null,
                isOnArrival: false,
                reads: [],
            },
        ],
        [
            'an input that follows from an indirect commit',
            {
                kind: EffectKind.Input,
                at: toSimTime(2),
                actor: toInputActor('driver-1'),
                command: 'accept',
                order: toInputOrderName('A'),
                response: { isOk: true, orderId: null },
                followsFrom: toCommitId('commit-7'),
                isOnArrival: false,
                reads: [],
            },
        ],
        [
            'a job run',
            {
                kind: EffectKind.Job,
                at: toSimTime(3),
                job: RunJob.DispatchPass,
                stateCommits: toCount(2),
                reads: [],
            },
        ],
        [
            'an input that read an earlier version of its order, and its driver',
            {
                kind: EffectKind.Input,
                at: toSimTime(5),
                actor: toInputActor('driver-1'),
                command: 'accept',
                order: toInputOrderName('A'),
                response: { isOk: true, orderId: null },
                followsFrom: null,
                isOnArrival: false,
                reads: [firstOrder, driver],
            },
        ],
        [
            "one driver's app sending its location alone, as before sends were batched",
            {
                kind: EffectKind.Input,
                at: toSimTime(6),
                actor: toInputActor('driver-1'),
                command: 'send-location',
                location: PLACE,
                response: { isOk: true, orderId: null },
                followsFrom: null,
                reads: [driver],
            },
        ],
        [
            'the apps due at one moment sending their locations',
            {
                kind: EffectKind.Input,
                at: toSimTime(7),
                command: 'send-locations',
                sends: List.of(
                    { actor: toInputActor('driver-1'), location: PLACE },
                    { actor: toInputActor('driver-2'), location: OTHER_PLACE },
                ),
                response: { isOk: true, orderId: null },
                followsFrom: null,
                reads: [driver],
            },
        ],
        [
            'a config change',
            {
                kind: EffectKind.ConfigChange,
                at: toSimTime(4),
                isScripted: true,
                before: values,
                after: values,
                followsFrom: null,
            },
        ],
    ])('maps back exactly, for %s', (_name, effect) => {
        const persisted = toPersistedDirectEffect(effect);

        const loaded = fromPersistedDirectEffect(persisted, latest);
        expect(loaded).toEqual(effect);
    });

    it('is kept in the direct part of a persisted root', () => {
        const { root } = oneOrderRun();
        const job: DirectEffect = {
            kind: EffectKind.Job,
            at: toSimTime(2),
            job: RunJob.DispatchPass,
            stateCommits: toCount(0),
            reads: [],
        };
        const withJob = withDirectEffect(root, job);

        const persisted = toPersistedMainRoot(withJob);

        const last = persisted.effects.direct.records.at(-1);
        expect(last).toEqual(job);
    });
});

describe('a persisted indirect effect', () => {
    it.each<[string, IndirectEffect]>([
        ['a driver ignoring a request', IGNORED],
        ['a restaurant running late', LATE],
        ['a customer not taking an order', REFUSED],
    ])('maps back exactly, in the indirect part of a root, for %s', (_name, effect) => {
        const { root } = oneOrderRun();
        const withEffect = withIndirectEffect(root, effect);

        const persisted = toPersistedMainRoot(withEffect);
        const loaded = fromPersistedMainRoot(persisted);

        const records = loaded.effects.indirect.records.toArray();
        expect(records).toEqual([effect]);
        const text = JSON.stringify(persisted);
        const parsed: unknown = JSON.parse(text);
        expect(parsed).toEqual(persisted);
    });
});
