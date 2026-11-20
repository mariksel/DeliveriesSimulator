import { describe, expect, it } from 'vitest';

import {
    FUNCTION_NAMES,
    FunctionName,
} from '../../application-core/simulation-engine/function-name';
import { createRun } from '../../application-core/simulation-engine/run-state';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { toVersionNumber } from '../../domain/system/records/version-chain';
import { FUNCTION_VERSIONS, REGISTERED_FUNCTIONS } from './function-registry';
import { fromPersistedMainRoot, toPersistedMainRoot } from './persisted-main-root';
import { STATE_FUNCTIONS } from './persisted-call';

/** The functions that change no state, so no commit holds them, and they have no stored ID. */
const NO_STATE = [
    FunctionName.OrdersRetryHandoffs,
    FunctionName.DeliveriesPickUp,
    FunctionName.DeliveriesDeliver,
];

const REGISTERED = STATE_FUNCTIONS.toArray();
const BY_ID = REGISTERED.map((registered) => [registered.id, registered] as const);

describe('the registry of state functions', () => {
    it.each(BY_ID)('makes the stored ID %s from its name and version', (id, registered) => {
        expect(id).toBe(`${registered.name}@${registered.version}`);
    });

    it.each(BY_ID)('registers %s as the version the lookup gives', (_id, registered) => {
        const name = FUNCTION_NAMES.find((each) => each === registered.name);

        const found =
            name === undefined
                ? undefined
                : REGISTERED_FUNCTIONS.functionOf(name, registered.version);

        expect(found).toBe(registered.fn);
    });

    it('has a stored ID for every function a commit can hold, and none for the rest', () => {
        const registeredNames = REGISTERED.map((registered) => registered.name);

        const withoutId = FUNCTION_NAMES.filter((name) => !registeredNames.includes(name));

        expect(withoutId).toEqual(NO_STATE);
    });
});

describe("the repository's lookup", () => {
    it('lists each version kept, oldest first, and gives each one', () => {
        const first = toVersionNumber(1);

        const versions = REGISTERED_FUNCTIONS.versionsOf(FunctionName.OrdersPickUp);
        const found = REGISTERED_FUNCTIONS.functionOf(FunctionName.OrdersPickUp, first);

        const [only] = FUNCTION_VERSIONS[FunctionName.OrdersPickUp];
        expect(versions).toEqual([1]);
        expect(found).toBe(only);
    });

    it('refuses a version not registered', () => {
        const second = toVersionNumber(2);

        expect(() => REGISTERED_FUNCTIONS.functionOf(FunctionName.OrdersPickUp, second)).toThrow(
            'version 2 of orders.pick-up',
        );
    });
});

describe('the versions a saved root holds', () => {
    it('come back as they were saved', () => {
        const run = createRun({ seed: toSeed(1), functions: REGISTERED_FUNCTIONS });

        const persisted = toPersistedMainRoot(run.root);
        const loaded = fromPersistedMainRoot(persisted);

        expect(loaded.effects.direct.functionVersions).toEqual(
            run.root.effects.direct.functionVersions,
        );
        expect(persisted.effects.direct.functionVersions).toContainEqual({
            name: 'orders.pick-up',
            version: 1,
        });
    });

    it('refuse a function no version of this release is named', () => {
        const run = createRun({ seed: toSeed(1), functions: REGISTERED_FUNCTIONS });
        const persisted = toPersistedMainRoot(run.root);
        const direct = {
            ...persisted.effects.direct,
            functionVersions: [{ name: 'orders.no-such-function', version: 1 }],
        };
        const odd = { ...persisted, effects: { ...persisted.effects, direct } };

        expect(() => fromPersistedMainRoot(odd)).toThrow(
            'No state function is named orders.no-such-function.',
        );
    });
});
