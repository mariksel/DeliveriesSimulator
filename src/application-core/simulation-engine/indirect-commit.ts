import { LogSource, TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import { headAt } from './commit-line';
import { nextWork } from './due-work';
import type { IndirectEffect, IndirectStatement } from './indirect-effect';
import { NO_CAUSE, writeEntry } from './run-log';
import type { IIndirectInput } from './run-input';
import type { RunLogRecord } from './run-log-entry';
import type { IRunState } from './run-state';
import { commitIndirect, withLog } from './run-state';

/**
 * States a decision or change outside the service by hand, as an indirect commit: it changes only
 * the effects' indirect part, and the service does not see it. It happens at a time no earlier
 * than the latest commit, once no work is left due before it. The log gets an
 * `IndirectEffectHappened` entry from the actors, which the commit holds (FND-89).
 */
export const stateIndirectEffect = (
    run: IRunState,
    at: SimTime,
    statement: IndirectStatement,
): IRunState => indirectCommit(run, { ...statement, at, isScripted: false });

/** A script's step that states an indirect effect, as an indirect commit that counts as a step. */
export const performIndirectInput = (run: IRunState, input: IIndirectInput): IRunState =>
    indirectCommit(run, { ...input.indirect, at: input.at, isScripted: true });

function indirectCommit(run: IRunState, indirect: IndirectEffect): IRunState {
    const { at } = indirect;
    const latest = headAt(run.line);
    if (!Number.isInteger(at.milliseconds) || at.isBefore(latest)) {
        throw new RangeError(
            `Cannot state an indirect effect at ${at.milliseconds}: the latest commit is at ${latest.milliseconds}.`,
        );
    }
    const due = nextWork(run);
    if (due.at.isBefore(at)) {
        throw new RangeError(
            `Cannot state an indirect effect at ${at.milliseconds}: work is due at ${due.at.milliseconds}.`,
        );
    }
    const record: RunLogRecord = {
        source: LogSource.Actors,
        kind: TechnicalLogKind.IndirectEffectHappened,
        data: indirect,
    };
    const log = writeEntry(run.cache.log, at, record, undefined, NO_CAUSE);
    const logged = withLog(run, log);
    return commitIndirect(logged, indirect);
}
