import type { List } from 'immutable';

import { required } from '../../domain/system/validation/required';
import type { IRunState } from './run-state';
import type { RunWork } from './run-work';
import { nextJobRunAt, RUN_JOBS, WorkKind } from './run-work';
import { headAt } from './commit-line';
import type { Position } from '../../domain/system/math/math';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import { laterOf } from '../../domain/system/time/instant';
import { RUN_START } from '../../domain/simulation-engine/sim-time';
import { toPosition } from '../../domain/system/math/math';

/** Work that is due, and when. */
export interface IDueWork {
    readonly at: SimTime;
    readonly work: RunWork;
}

/**
 * Where work due at the same moment comes, as when it was first held in a schedule: a job before
 * its first run, then the script's steps, then jobs in the order of their latest runs.
 */
const Turn = {
    FirstJobRun: 0,
    ScriptedStep: 1,
    LaterJobRun: 2,
} as const;

interface ICandidate extends IDueWork {
    readonly turn: number;
    readonly position: Position;
}

function comesBefore(first: ICandidate, second: ICandidate): boolean {
    if (!first.at.equals(second.at)) {
        return first.at.isBefore(second.at);
    }
    if (first.turn !== second.turn) {
        return first.turn < second.turn;
    }
    return first.position < second.position;
}

function jobCandidates(run: IRunState): List<ICandidate> {
    const { values } = run.root.effects.direct;
    // A job whose interval was tuned shorter is due at once, never before the latest commit.
    const floor = headAt(run.line);
    return RUN_JOBS.map((job, index): ICandidate => {
        const work: RunWork = { kind: WorkKind.Job, job };
        const last = run.cache.lastJobRuns.get(job);
        if (last === undefined) {
            const position = toPosition(index);
            return { at: RUN_START, work, turn: Turn.FirstJobRun, position };
        }
        const due = nextJobRunAt(job, last.at, values);
        const at = laterOf(due, floor);
        return { at, work, turn: Turn.LaterJobRun, position: last.position };
    });
}

/**
 * The next work due, worked out from the commits, the config values, and the scenario's steps.
 * The jobs always repeat, so there is always some.
 */
export function nextWork(run: IRunState): IDueWork {
    const { stepsRun } = run.cache;
    const step = run.script.steps.get(stepsRun);
    const jobs = jobCandidates(run);
    const candidates =
        step === undefined
            ? jobs
            : jobs.push({
                  at: step.at,
                  work: { kind: WorkKind.ScriptedStep, step },
                  turn: Turn.ScriptedStep,
                  position: toPosition(stepsRun),
              });
    const firstCandidate = candidates.first();
    const first = required(firstCandidate, 'a job');
    const next = candidates.reduce(
        (earliest, candidate) => (comesBefore(candidate, earliest) ? candidate : earliest),
        first,
    );
    return { at: next.at, work: next.work };
}
