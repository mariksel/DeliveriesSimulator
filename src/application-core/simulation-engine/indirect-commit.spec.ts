import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { LogSource, TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { toPosition } from '../../domain/system/math/math';
import { CommitKind } from './commit';
import { headAt, headCommit } from './commit-line';
import { nextWork } from './due-work';
import { stateIndirectEffect } from './indirect-commit';
import {
    CUSTOMER_WONT,
    DRIVER_IGNORES,
    effectOf,
    RESTAURANT_LATE,
} from './indirect-effects.testing';
import type { IndirectEffect, IndirectStatement } from './indirect-effect';
import { forkAt } from './run-branches';
import type { IRunState } from './run-state';
import { createRun } from './run-state';
import type { IIndirectInput, IRunInput, IRunStart, ScriptInput } from './run-input';
import { toIndirectLabel, toInputActor, toInputOrderName } from './run-input';
import { InputCommand } from './input-command';
import { scheduleInputs } from './run-inputs';
import { runNextWork } from './run-step';

/** A run with no inputs, moved on through every job due by a time. */
function runTo(until: number): IRunState {
    let run = createRun({ seed: toSeed(7) });
    while (nextWork(run).at.milliseconds <= until) {
        run = runNextWork(run);
    }
    return run;
}

const AT_MS = 45_000;
const IGNORED_MS = 10_000;
const FOLLOWED_MS = 20_000;
const AT = toSimTime(AT_MS);

/** An indirect effect as stated by hand at a time. */
const byHand = (statement: IndirectStatement): IndirectEffect => effectOf(statement, AT_MS);

describe('an indirect commit', () => {
    it.each<[string, IndirectStatement]>([
        ['a driver ignoring a request', DRIVER_IGNORES],
        ['a restaurant running late', RESTAURANT_LATE],
        ['a customer not taking an order', CUSTOMER_WONT],
    ])('changes the indirect part only, for %s', (_name, statement) => {
        const before = runTo(AT_MS);
        const stated = byHand(statement);

        const run = stateIndirectEffect(before, AT, statement);

        const { root } = run;
        expect(root.state).toBe(before.root.state);
        expect(root.effects.direct).toBe(before.root.effects.direct);
        expect(root.effects.randomness).toBe(before.root.effects.randomness);
        const records = root.effects.indirect.records.toArray();
        expect(records).toEqual([stated]);
    });

    it('is a commit of its own kind, outside any job run or API call, holding the effect', () => {
        const before = runTo(AT_MS);
        const stated = byHand(DRIVER_IGNORES);

        const run = stateIndirectEffect(before, AT, DRIVER_IGNORES);

        const commit = headCommit(run.line);
        expect(commit).toMatchObject({
            kind: CommitKind.Indirect,
            parent: before.line.head,
            session: null,
            effect: null,
            call: null,
            indirect: stated,
        });
        expect(commit?.at.milliseconds).toBe(AT_MS);
    });

    it('writes one entry from the actors, which nothing caused, held by its commit', () => {
        const before = runTo(AT_MS);
        const stated = byHand(RESTAURANT_LATE);

        const run = stateIndirectEffect(before, AT, RESTAURANT_LATE);

        const entries = headCommit(run.line)?.entries.toArray() ?? [];
        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({
            source: LogSource.Actors,
            kind: TechnicalLogKind.IndirectEffectHappened,
            data: stated,
            causedBy: null,
        });
        const logged = run.cache.log.entries.last();
        expect(logged).toBe(entries[0]);
    });

    it('refuses a time before the latest commit', () => {
        const before = runTo(AT_MS);
        const latest = headAt(before.line).milliseconds;
        const early = toSimTime(latest - 1);

        expect(() => stateIndirectEffect(before, early, CUSTOMER_WONT)).toThrow(/latest commit/u);
    });

    it('refuses a time after work that is due', () => {
        const before = runTo(AT_MS);
        const due = nextWork(before).at.milliseconds;
        const late = toSimTime(due + 1);

        expect(() => stateIndirectEffect(before, late, CUSTOMER_WONT)).toThrow(/work is due/u);
    });

    it('is a place a fork can start from, to explore a different decision', () => {
        const before = runTo(AT_MS);
        const stated = stateIndirectEffect(before, AT, DRIVER_IGNORES);
        const place = toPosition(stated.line.commits.size);

        const forked = forkAt(stated, place);

        const records = forked.root.effects.indirect.records.toArray();
        expect(records).toHaveLength(1);
        expect(forked.history.current).not.toBe(stated.history.current);
    });
});

describe('an indirect step of a script', () => {
    const ignoredStep: IIndirectInput = { at: toSimTime(IGNORED_MS), indirect: DRIVER_IGNORES };
    const followingCall: IRunInput = {
        at: toSimTime(FOLLOWED_MS),
        actor: toInputActor('driver-1'),
        command: InputCommand.Accept,
        order: toInputOrderName('A'),
        after: toIndirectLabel('ignored'),
    };

    /** A run whose script has the indirect step, then a call that follows from it. */
    function scripted(until: number): IRunState {
        const created = createRun({ seed: toSeed(7) });
        const start: IRunStart = { restaurants: List(), drivers: List() };
        const steps = List<ScriptInput>([ignoredStep, followingCall]);
        let run = scheduleInputs(created, start, steps);
        while (nextWork(run).at.milliseconds <= until) {
            run = runNextWork(run);
        }
        return run;
    }

    it('makes an indirect commit that a script stated, which counts as a step run', () => {
        const run = scripted(IGNORED_MS);

        const commit = run.line.commits.find((each) => each.kind === CommitKind.Indirect);
        const scriptedEffect = effectOf(DRIVER_IGNORES, IGNORED_MS, true);
        expect(commit?.indirect).toEqual(scriptedEffect);
        expect(run.cache.stepsRun).toBe(1);
        const label = toIndirectLabel('ignored');
        const labelled = run.cache.indirectLabels.get(label);
        expect(labelled).toBe(commit?.id);
    });

    it("has a later call record the indirect commit it follows from, by the step's label", () => {
        const run = scripted(FOLLOWED_MS);

        const indirect = run.line.commits.find((each) => each.kind === CommitKind.Indirect);
        const call = run.line.commits.find((each) => each.kind === CommitKind.Input);
        expect(call?.effect).toMatchObject({ followsFrom: indirect?.id });
        expect(run.cache.stepsRun).toBe(2);
    });
});
