import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { scheduleInputs } from '../../application-core/simulation-engine/run-inputs';
import type { ICommit } from '../../application-core/simulation-engine/commit';
import { EffectKind } from '../../application-core/simulation-engine/direct-effect';
import { CommitKind } from '../../application-core/simulation-engine/commit';
import { DRIVER_IGNORES } from '../../application-core/simulation-engine/indirect-effects.testing';
import {
    commitAt,
    isBetweenGroups,
    latestPlace,
    logAt,
    nextGroupPlace,
    placeOfEntry,
    placeWithin,
    previousGroupPlace,
    rootAt,
} from '../../application-core/simulation-engine/run-places';
import { repeatFrom } from '../../application-core/simulation-engine/run-repeat';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import { createRun } from '../../application-core/simulation-engine/run-state';
import {
    configChanged,
    entryOf,
} from '../../application-core/simulation-engine/run-log-entries.testing';
import { toParameterValue } from '../../domain/business-rules/numbers';
import { toParameterId } from '../../domain/business-rules/parameter';
import { changesOf } from '../../domain/business-rules/parameter-change.testing';
import { toRuleId } from '../../domain/business-rules/rule';
import { ValueChanged } from '../../domain/business-rules/value-changed';
import {
    DISPATCH_PASS,
    DISPATCH_PASS_INTERVAL,
} from '../../domain/drivers/drivers-rule-definitions';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { toPosition } from '../../domain/system/math/math';
import { HAPPY_PATH, oneOrderRun, START as ONE_ORDER_START } from './one-order-run.testing';
import { SimulationRun } from './simulation-run';

const RUN = oneOrderRun();
const LATEST = latestPlace(RUN);
const HALF = Math.floor(LATEST / 2);
const MIDDLE = toPosition(HALF);
const START = toPosition(0);

/** The run with one commit swapped for another, as if the run had once come out differently. */
function withCommit(run: IRunState, commit: ICommit): IRunState {
    const commits = run.line.commits.set(commit.id, commit);
    return { ...run, line: { ...run.line, commits } };
}

describe("a run's places", () => {
    it('go from the start, before any commit, to the latest, one for each commit', () => {
        const first = commitAt(RUN, START);
        const latest = commitAt(RUN, LATEST);

        expect(LATEST).toBe(RUN.line.commits.size);
        expect(first).toBeNull();
        expect(latest?.id).toBe(RUN.line.head);
    });

    it("show each place's root, with nothing recalculated", () => {
        const start = rootAt(RUN, START);
        const latest = rootAt(RUN, LATEST);
        const middle = rootAt(RUN, MIDDLE);

        expect(start).toBe(RUN.line.start);
        expect(latest).toBe(RUN.root);
        expect(middle).toBe(commitAt(RUN, MIDDLE)?.root);
    });

    it('show the log as it stood: the entries of every commit up to the place', () => {
        const atStart = logAt(RUN, START);
        const atLatest = logAt(RUN, LATEST);
        const atMiddle = logAt(RUN, MIDDLE);

        const held = RUN.line.commits
            .valueSeq()
            .take(MIDDLE)
            .reduce((sum, commit) => sum + commit.entries.size, 0);
        expect(atStart.size).toBe(0);
        expect(atLatest).toBe(RUN.cache.log.entries);
        expect(atMiddle.size).toBe(held);
    });

    it('find the place whose commit wrote an entry', () => {
        const entry = RUN.cache.log.entries.get(10)!;

        const place = placeOfEntry(RUN, entry.sequence);

        const commit = commitAt(RUN, place)!;
        expect(commit.entries).toContain(entry);
        const before = toPosition(place - 1);
        const earlier = logAt(RUN, before);
        expect(earlier).not.toContain(entry);
    });

    it('give the latest place for an entry no commit holds yet', () => {
        const beyond = RUN.cache.log.entries.size;

        const place = placeOfEntry(RUN, beyond as never);

        expect(place).toBe(LATEST);
    });

    it.each([
        [-5, 0],
        [2.4, 2],
        [1e9, -1],
    ])('keep a place of %s within the run', (asked, expected) => {
        const place = placeWithin(RUN, asked);

        expect(place).toBe(expected === -1 ? LATEST : expected);
    });

    it('move between job runs and API calls, around a place inside one', () => {
        const inside = RUN.cache.commitIds.toArray().findIndex((_id, index) => {
            const candidate = toPosition(index + 1);
            return !isBetweenGroups(RUN, candidate);
        });
        const place = toPosition(inside + 1);

        const before = previousGroupPlace(RUN, place);
        const after = nextGroupPlace(RUN, place);

        expect(before).toBeLessThan(place);
        expect(after).toBeGreaterThan(place);
        const isBeforeBetween = isBetweenGroups(RUN, before);
        const isAfterBetween = isBetweenGroups(RUN, after);
        expect(isBeforeBetween).toBe(true);
        expect(isAfterBetween).toBe(true);
    });

    it('stop moving between groups at the start and at the latest', () => {
        const fromStart = previousGroupPlace(RUN, START);
        const fromLatest = nextGroupPlace(RUN, LATEST);

        expect(fromStart).toBe(0);
        expect(fromLatest).toBe(LATEST);
    });
});

describe('repeating a run from a place', () => {
    it('gives every commit and log entry the same, from the start', () => {
        const start = toPosition(0);

        const result = repeatFrom(RUN, start);

        expect(result).toEqual({
            from: 0,
            to: LATEST,
            compared: LATEST,
            differsAt: null,
            failure: null,
        });
    });

    it('starts from the nearest place between groups at or before the one asked', () => {
        const result = repeatFrom(RUN, MIDDLE);

        expect(result.from).toBeLessThanOrEqual(MIDDLE);
        const isBetween = isBetweenGroups(RUN, result.from);
        expect(isBetween).toBe(true);
        expect(result.differsAt).toBeNull();
        expect(result.compared).toBe(LATEST - result.from);
    });

    it('makes a config change made by hand again at its commit', () => {
        const created = createRun({ seed: toSeed(1) });
        const steps = List(HAPPY_PATH);
        const start = scheduleInputs(created, ONE_ORDER_START, steps);
        const run = new SimulationRun(start);
        const second = toSimTime(1000);
        run.advanceTo(second);
        const faster = changesOf(DISPATCH_PASS, DISPATCH_PASS_INTERVAL, 10_000);
        run.changeConfig(faster);
        const end = toSimTime(300_000);
        run.advanceTo(end);
        const atStart = toPosition(0);

        const result = repeatFrom(run.state, atStart);

        const hasChange = run.state.line.commits
            .valueSeq()
            .some((commit) => commit.effect?.kind === EffectKind.ConfigChange);
        expect(hasChange).toBe(true);
        expect(result.differsAt).toBeNull();
    });

    it('states an indirect effect made by hand again at its commit', () => {
        const created = createRun({ seed: toSeed(1) });
        const steps = List(HAPPY_PATH);
        const start = scheduleInputs(created, ONE_ORDER_START, steps);
        const run = new SimulationRun(start);
        const later = toSimTime(45_000);
        run.advanceTo(later);
        run.stateIndirect(DRIVER_IGNORES);
        const end = toSimTime(300_000);
        run.advanceTo(end);
        const atStart = toPosition(0);

        const result = repeatFrom(run.state, atStart);

        const hasIndirect = run.state.line.commits
            .valueSeq()
            .some((commit) => commit.kind === CommitKind.Indirect);
        expect(hasIndirect).toBe(true);
        expect(result.differsAt).toBeNull();
    });

    it('names the first place whose commit came out differently', () => {
        const index = RUN.cache.commitIds
            .toArray()
            .findIndex((id) => !RUN.line.commits.get(id)!.entries.isEmpty());
        const place = toPosition(index + 1);
        const commit = commitAt(RUN, place)!;
        const altered = withCommit(RUN, { ...commit, entries: List() });
        const atStart = toPosition(0);

        const result = repeatFrom(altered, atStart);

        expect(result.differsAt).toBe(place);
        expect(result.failure).toBeNull();
    });

    it('says what stopped the repeat when a step fails', () => {
        const place = toPosition(1);
        const commit = commitAt(RUN, place)!;
        const ruleId = toRuleId('payments.no-such-rule');
        const parameterId = toParameterId('value');
        const value = toParameterValue(1);
        const changed = ValueChanged.create({ ruleId, parameterId, before: value, after: value });
        const record = { ...configChanged(), data: { changes: List([changed]) } };
        const entry = entryOf(0, record);
        const { values } = RUN.root.effects.direct;
        const fake: ICommit = {
            ...commit,
            effect: {
                kind: EffectKind.ConfigChange,
                at: commit.at,
                isScripted: false,
                before: values,
                after: values,
            },
            entries: List([entry]),
        };
        const altered = withCommit(RUN, fake);
        const atStart = toPosition(0);

        const result = repeatFrom(altered, atStart);

        expect(result.failure).toBe('No module has a rule payments.no-such-rule.');
        expect(result.differsAt).toBe(place);
    });
});
