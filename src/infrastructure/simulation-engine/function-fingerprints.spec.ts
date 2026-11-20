import type { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import type { IRunState } from '../../application-core/simulation-engine/run-state';
import { SimTime } from '../../domain/simulation-engine/sim-time';
import { Duration } from '../../domain/system/time/duration';
import { rootOfCall } from '../../application-core/simulation-engine/rebuild-root';
import { DeliveriesState } from '../../domain/drivers/deliveries/deliveries-state';
import type { ISentLocation } from '../../domain/drivers/deliveries/sent-location';
import { REGISTERED_FUNCTIONS } from './function-registry';
import { STATE_FUNCTIONS, registeredFunctionOf } from './persisted-call';
import { oneOrderRun, ridingRun, variedRun } from './sample-runs.testing';

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
        // The engine's own rebuild, as opening a run saved at "minimum" uses it.
        const rebuilt = rootOfCall(parent, commit.call, REGISTERED_FUNCTIONS);
        const isExact = textOf(rebuilt.state) === textOf(commit.root.state);
        return [{ functionId: registered.id, text: textOf(result), isExact }];
    });
}

const SINGLE_SEND = 'drivers.deliveries.receive-location@1';

/**
 * The single-send version, still registered for runs saved before sends were batched, called
 * again for each one-driver batch of a run with the same arguments it was given before (FND-90).
 */
function recalculateSingleSends(run: IRunState): IRecalculated[] {
    const commits = run.line.commits.valueSeq().toArray();
    return commits.flatMap((commit, index) => {
        if (commit.call?.fn !== DeliveriesState.receiveLocations) {
            return [];
        }
        const parent = index === 0 ? run.line.start : commits[index - 1]!.root;
        const [drivers, at, sends, madeBy] = commit.call.args as [
            unknown,
            unknown,
            List<ISentLocation>,
            unknown,
        ];
        if (sends.size !== 1) {
            return [];
        }
        const send = sends.first()!;
        const { deliveries } = parent.state;
        const args = [deliveries, drivers, at, send.driverId, send.coordinates, madeBy];
        const result: unknown = Reflect.apply(DeliveriesState.receiveLocation, undefined, args);
        return [{ functionId: SINGLE_SEND, text: textOf(result), isExact: true }];
    });
}

/**
 * What each function gave across the sample runs, pinned. A behaviour change fails here: register
 * the changed function under a new version, keeping the old one, and pin the new version. Only a
 * change shown to give the same results may update a pin in place. Every pin was updated in place
 * once, when each version came to name its maker and each result the versions it made, as no
 * run had been saved yet (FND-81). The user had them updated in place again when orders came to
 * hold their address, which changed the shape of the state: every saved run that made an order
 * is refused, so none replays differently (FND-90). They had them updated in place a third time
 * when a driver's status and location came to have versions of their own: every saved run with
 * drivers kept as before is refused (FND-81, FND-90). And a fourth when an order's status came to
 * be read from its events: every saved run with orders kept as before is refused (FND-73). And a
 * fifth when Deliveries' copy of an order came to have versions of its own: every saved run with
 * deliveries kept as before is refused (FND-81).
 */
const PINNED: readonly [string, string][] = [
    ['orders.create-order@1', 'dd7ff581'],
    ['orders.request-delivery@1', '596440d9'],
    ['orders.mark-ready@1', 'ffab93b7'],
    ['orders.pick-up@1', 'f524b3c7'],
    ['orders.deliver@1', '22abc4d8'],
    ['orders.complete-handoff@1', 'e8733523'],
    ['orders.read-deliveries-event@1', '4df210d5'],
    ['orders.record-deliveries-event-read@1', 'f04d9e3e'],
    ['drivers.deliveries.receive-delivery-request@1', '2a4a7721'],
    ['drivers.deliveries.answer-from-orders@1', 'd750fa94'],
    ['drivers.deliveries.accept-request@1', '2b58d679'],
    ['drivers.deliveries.notify-next-driver@1', '200b12e1'],
    ['drivers.deliveries.read-orders-event@1', 'e3c555a2'],
    ['drivers.deliveries.record-orders-event-read@1', '8cd493d0'],
    ['drivers.deliveries.receive-location@1', 'af7de969'],
    ['drivers.deliveries.receive-locations@1', 'af7de969'],
];

const ONE_ORDER = oneOrderRun();
const VARIED = variedRun();
const RIDING = ridingRun();
const RECALCULATED = [
    ...recalculate(ONE_ORDER),
    ...recalculate(VARIED),
    ...recalculate(RIDING),
    ...recalculateSingleSends(RIDING),
];
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
