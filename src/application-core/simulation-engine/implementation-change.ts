import type { List } from 'immutable';

import { LogSource, TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import { required } from '../../domain/system/validation/required';
import type { CommitId } from './commit-id';
import { checkedChangeTime } from './config-change';
import type { IImplementationChangeEffect } from './direct-effect';
import { EffectKind } from './direct-effect';
import type { FunctionVersions } from './function-lookup';
import { FUNCTION_NAMES } from './function-name';
import { NO_CAUSE, writeEntry } from './run-log';
import type { IRunLog } from './run-log';
import type { RunLogRecord } from './run-log-entry';
import type { IFunctionUse, IUseInput } from './run-input';
import { labelledCommit } from './run-cache';
import type { IRunState } from './run-state';
import { commitEffect, withLog } from './run-state';

/** Whether a script made a switch, and the indirect commit it follows from, if any. */
type SwitchMade = Pick<IImplementationChangeEffect, 'isScripted' | 'followsFrom'>;

/** Refuses a version the run's lookup does not hold. */
function checkedUse(run: IRunState, use: IFunctionUse): IFunctionUse {
    const versions = run.functions.versionsOf(use.function);
    if (!versions.includes(use.version)) {
        throw new RangeError(`${use.function} has no version ${use.version}.`);
    }
    return use;
}

/** The log with a `FunctionVersionSwitched` entry for each function whose version changed. */
function loggedSwitches(
    log: IRunLog,
    at: SimTime,
    before: FunctionVersions,
    after: FunctionVersions,
): IRunLog {
    const switched = FUNCTION_NAMES.filter((name) => before.get(name) !== after.get(name));
    return switched.reduce((soFar, name) => {
        const inUse = before.get(name);
        const toUse = after.get(name);
        const was = required(inUse, `the version of ${name} in use`);
        const now = required(toUse, `the version of ${name} to use`);
        const record: RunLogRecord = {
            source: LogSource.SimulationEngine,
            kind: TechnicalLogKind.FunctionVersionSwitched,
            data: { function: name, before: was, after: now },
        };
        return writeEntry(soFar, at, record, undefined, NO_CAUSE);
    }, log);
}

function implementationChange(
    run: IRunState,
    at: SimTime,
    uses: List<IFunctionUse>,
    made: SwitchMade,
): IRunState {
    checkedChangeTime(run, at, 'switch a function version');
    const before = run.root.effects.direct.functionVersions;
    const after = uses.reduce((versions, use) => {
        const checked = checkedUse(run, use);
        return versions.set(checked.function, checked.version);
    }, before);
    const log = loggedSwitches(run.cache.log, at, before, after);
    const logged = withLog(run, log);
    return commitEffect(logged, {
        kind: EffectKind.ImplementationChange,
        at,
        isScripted: made.isScripted,
        before,
        after,
        followsFrom: made.followsFrom,
    });
}

/**
 * Switches state functions to other versions during a run, as an implementation change commit
 * (FND-81). Every later state call goes through the versions it puts in use. It happens at a
 * time no earlier than the latest commit, once no work is left due before it, and the log gets a
 * `FunctionVersionSwitched` entry for each function whose version changed. A version the run's
 * lookup does not hold is refused.
 */
export const switchVersions = (
    run: IRunState,
    at: SimTime,
    uses: List<IFunctionUse>,
    followsFrom: CommitId | null = null,
): IRunState => implementationChange(run, at, uses, { isScripted: false, followsFrom });

/**
 * A script's `use` step, as an implementation change commit that counts as a step, recording the
 * indirect commit its `after` names (FND-81).
 */
export function performUseInput(run: IRunState, input: IUseInput): IRunState {
    const followsFrom = labelledCommit(run.cache, input.after);
    return implementationChange(run, input.at, input.uses, { isScripted: true, followsFrom });
}
