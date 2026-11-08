import { LogSource, TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import { EffectKind } from './direct-effect';
import { nextWork } from './due-work';
import { NO_CAUSE, writeEntry } from './run-log';
import type { IRulesInput } from './run-input';
import type { RunLogRecord } from './run-log-entry';
import type { IRunState } from './run-state';
import { commitEffect, withLog } from './run-state';
import { changedValues } from './run-value-changes';
import { headAt } from './commit-line';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import type { ParameterChange } from '../../domain/business-rules/parameter-change';
import type { List } from 'immutable';

/**
 * Tunes rule parameters during a run, by rule ID, as a config change commit. Each change goes to
 * the module that holds the rule. Rule functions use the new values from then on, and a job's
 * next run is its latest one plus its new interval. It happens at a time no earlier than the
 * latest commit, once no work is left due before it. The log gets a `ConfigChanged` entry with
 * each changed value before and after, which the commit holds; the commit's effect holds every
 * module's rules before and after (FND-84).
 */
export const changeConfig = (
    run: IRunState,
    at: SimTime,
    changes: List<ParameterChange>,
): IRunState => configChange(run, at, changes, false);

/** A script's step that changes rules, as a config change commit that counts as a step. */
export const performRulesInput = (run: IRunState, input: IRulesInput): IRunState =>
    configChange(run, input.at, input.changes, true);

function configChange(
    run: IRunState,
    at: SimTime,
    changes: List<ParameterChange>,
    isScripted: boolean,
): IRunState {
    const latest = headAt(run.line);
    if (!Number.isInteger(at.milliseconds) || at.isBefore(latest)) {
        throw new RangeError(
            `Cannot change the config at ${at.milliseconds}: the latest commit is at ${latest.milliseconds}.`,
        );
    }
    const due = nextWork(run);
    if (due.at.isBefore(at)) {
        throw new RangeError(
            `Cannot change the config at ${at.milliseconds}: work is due at ${due.at.milliseconds}.`,
        );
    }
    const before = run.root.effects.direct.values;
    const { values, changed } = changedValues(before, changes);
    const record: RunLogRecord = {
        source: LogSource.SimulationEngine,
        kind: TechnicalLogKind.ConfigChanged,
        data: { changes: changed },
    };
    const log = writeEntry(run.cache.log, at, record, undefined, NO_CAUSE);
    const logged = withLog(run, log);
    return commitEffect(logged, {
        kind: EffectKind.ConfigChange,
        at,
        isScripted,
        before,
        after: values,
    });
}
