import { describe, expect, it } from 'vitest';

import type { IRunState } from '../../application-core/simulation-engine/run-state';
import { SimTime } from '../../domain/simulation-engine/sim-time';
import { Duration } from '../../domain/system/time/duration';
import { STATE_FUNCTIONS, registeredFunctionOf } from './persisted-call';
import { oneOrderRun, variedRun } from './sample-runs.testing';

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const HEX = 16;
const WIDTH = 8;

/** FNV-1a over a text, as eight hex digits. */
const fingerprintOf = (text: string): string =>
    (
        Array.from(text).reduce(
            (hash, character) => Math.imul(hash ^ character.charCodeAt(0), FNV_PRIME),
            FNV_OFFSET,
        ) >>> 0
    )
        .toString(HEX)
        .padStart(WIDTH, '0');

/**
 * Writes a result out for its fingerprint. A moment or a length is written as its milliseconds,
 * as it was when they were plain numbers, so a result that has not changed keeps its pin.
 */
const textOf = (value: unknown): string =>
    JSON.stringify(value, (_key, item: unknown) => {
        if (item instanceof SimTime || item instanceof Duration) {
            return item.milliseconds;
        }
        return item;
    });

interface IRecalculated {
    readonly functionId: string;
    readonly text: string;
    readonly isExact: boolean;
}

/** Every state commit of a run, recalculated from its parent root and its call. */
function recalculate(run: IRunState): IRecalculated[] {
    const commits = run.line.commits.valueSeq().toArray();
    return commits.flatMap((commit, index) => {
        if (commit.call === null) {
            return [];
        }
        const parent = index === 0 ? run.line.start : commits[index - 1]!.root;
        const registered = registeredFunctionOf(commit.call);
        const state = parent.state[registered.module];
        const result: unknown = Reflect.apply(registered.fn, undefined, [
            state,
            ...commit.call.args,
        ]);
        const recalculated = (result as { state: unknown; drivers?: unknown }).state;
        const drivers = (result as { drivers?: unknown }).drivers;
        const isSameState = textOf(recalculated) === textOf(commit.root.state[registered.module]);
        // A Deliveries function that changes the drivers gives their state back too.
        const isSameDrivers =
            drivers === undefined || textOf(drivers) === textOf(commit.root.state.drivers);
        const isExact = isSameState && isSameDrivers;
        return [{ functionId: registered.id, text: textOf(result), isExact }];
    });
}

/**
 * What each function gave across the sample runs, pinned. A behaviour change fails here: register
 * the changed function under a new version, keeping the old one, and pin the new version. Only a
 * change shown to give the same results may update a pin in place.
 */
const PINNED: readonly [string, string][] = [
    ['orders.create-order@1', 'dab267b1'],
    ['orders.request-delivery@1', 'ba9dd85b'],
    ['orders.mark-ready@1', '7ea1b84d'],
    ['orders.pick-up@1', 'b8f4ce7b'],
    ['orders.deliver@1', '9f1c55bd'],
    ['orders.complete-handoff@1', 'd040602d'],
    ['orders.read-deliveries-event@1', '471d09ad'],
    ['orders.record-deliveries-event-read@1', '753ba88d'],
    ['drivers.deliveries.receive-delivery-request@1', '1de198d5'],
    ['drivers.deliveries.answer-from-orders@1', '2876218b'],
    ['drivers.deliveries.accept-request@1', '50dc008e'],
    ['drivers.deliveries.notify-next-driver@1', '11264571'],
    ['drivers.deliveries.read-orders-event@1', '00347cb1'],
    ['drivers.deliveries.record-orders-event-read@1', '30fbec3b'],
];

const ONE_ORDER = oneOrderRun();
const VARIED = variedRun();
const RECALCULATED = [...recalculate(ONE_ORDER), ...recalculate(VARIED)];
const IDS = STATE_FUNCTIONS.map((registered) => registered.id).toArray();

/** One fingerprint for each function, of everything it gave across the sample runs. */
function fingerprintFor(id: string): string {
    const texts = RECALCULATED.filter((each) => each.functionId === id).map((each) => each.text);
    const joined = texts.join('\n');
    return fingerprintOf(joined);
}

describe('the registered state functions', () => {
    it('are all exercised by the sample runs', () => {
        const exercised = RECALCULATED.map((each) => each.functionId);

        const distinct = [...new Set(exercised)].sort();
        const ids = [...IDS].sort();
        expect(distinct).toEqual(ids);
    });

    it("give each commit's state again exactly, from its parent root and its call", () => {
        const inexact = RECALCULATED.filter((each) => !each.isExact);

        expect(inexact).toEqual([]);
    });

    it('have a pinned fingerprint each', () => {
        const pinned = PINNED.map(([id]) => id);

        expect(pinned).toEqual(IDS);
    });

    it.each(PINNED)('keep the behaviour pinned for %s', (id, fingerprint) => {
        const found = fingerprintFor(id);

        expect(found).toBe(fingerprint);
    });

    it('have stored IDs that are readable and versioned', () => {
        const ids = STATE_FUNCTIONS.map((registered) => registered.id).toArray();

        const unreadable = ids.filter(
            (id) => !/^[a-z]+(-[a-z]+)*(\.[a-z]+(-[a-z]+)*)+@\d+$/.test(id),
        );
        expect(unreadable).toEqual([]);
        expect(new Set(ids).size).toBe(ids.length);
    });
});
