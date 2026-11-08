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
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { toCommitId } from '../../application-core/simulation-engine/commit-id';
import { withIndirectEffect } from '../../application-core/simulation-engine/main-root';
import type { IndirectEffect } from '../../application-core/simulation-engine/indirect-effect';
import {
    IGNORED,
    LATE,
    REFUSED,
} from '../../application-core/simulation-engine/indirect-effects.testing';

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

describe('a persisted direct effect', () => {
    const { values } = oneOrderRun().root.effects.direct;

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
            },
        ],
        [
            'a job run',
            {
                kind: EffectKind.Job,
                at: toSimTime(3),
                job: RunJob.DispatchPass,
                stateCommits: toCount(2),
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
            },
        ],
    ])('maps back exactly, for %s', (_name, effect) => {
        const persisted = toPersistedDirectEffect(effect);

        const loaded = fromPersistedDirectEffect(persisted);
        expect(loaded).toEqual(effect);
    });

    it('is kept in the direct part of a persisted root', () => {
        const { root } = oneOrderRun();
        const job: DirectEffect = {
            kind: EffectKind.Job,
            at: toSimTime(2),
            job: RunJob.DispatchPass,
            stateCommits: toCount(0),
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
