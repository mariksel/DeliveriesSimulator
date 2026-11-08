import type { IOrderProgress } from '../../domain/orders/orders-state';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import { laterOf } from '../../domain/system/time/instant';
import { ClockedWork } from './clocked-work';
import { changeConfig } from '../../application-core/simulation-engine/config-change';
import { stateIndirectEffect } from '../../application-core/simulation-engine/indirect-commit';
import type { IndirectStatement } from '../../application-core/simulation-engine/indirect-effect';
import { nextWork } from '../../application-core/simulation-engine/due-work';
import type { IRunFailure } from '../../application-core/simulation-engine/run-failure';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import { runNextWork } from '../../application-core/simulation-engine/run-step';
import type { List } from 'immutable';

import type { ParameterChange } from '../../domain/business-rules/parameter-change';
import type { ICommitLine } from '../../application-core/simulation-engine/commit-line';
import { headAt } from '../../application-core/simulation-engine/commit-line';

function assertCanMoveTo(now: SimTime, time: SimTime): void {
    if (!Number.isInteger(time.milliseconds) || time.isBefore(now)) {
        throw new RangeError(
            `Cannot advance to ${time.milliseconds}: the time is ${now.milliseconds}.`,
        );
    }
}

/**
 * The service that drives one run. It holds the latest state, which is immutable, and moves it on
 * one pure step at a time, and each transaction inside a step makes a commit. A bug inside a step
 * stops the run and says where, and the last good state remains. The clock is the latest commit's
 * time, and this service also holds how far it has moved past that, which is not part of the run.
 */
export class SimulationRun extends ClockedWork {
    private latest: IRunState;
    private stoppedBy: IRunFailure | null = null;
    private reached: SimTime;

    get state(): IRunState {
        return this.latest;
    }

    /** The run's history so far. */
    get line(): ICommitLine {
        return this.latest.line;
    }

    /** The bug that stopped this run, or null while it can go on. */
    get failure(): IRunFailure | null {
        return this.stoppedBy;
    }

    get now(): SimTime {
        return this.reached;
    }

    /** When the next work is due. The jobs always repeat, so there is always some. */
    get nextAt(): SimTime {
        return nextWork(this.latest).at;
    }

    /** How far the run's orders have got. */
    get orderProgress(): IOrderProgress {
        return this.latest.root.state.orders.progress();
    }

    constructor(start: IRunState) {
        super();
        this.latest = start;
        this.reached = headAt(start.line);
    }

    /**
     * Goes on from another state of the same run: a fork, another branch, or a line of commits
     * renamed. A new line of commits starts at its latest commit's time, with no bug stopping it;
     * the same line keeps the time it had reached (FND-87).
     */
    continueFrom(state: IRunState): void {
        if (state.line !== this.latest.line) {
            this.reached = headAt(state.line);
            this.stoppedBy = null;
        }
        this.latest = state;
    }

    /** Runs the next piece of work. Returns false when a bug stops it. */
    runNext(): boolean {
        const due = nextWork(this.latest);
        try {
            this.latest = runNextWork(this.latest);
            this.reached = laterOf(this.reached, due.at);
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.stoppedBy = { at: due.at, work: due.work, message };
            return false;
        }
    }

    /**
     * Runs the work due by a time, then moves to it. After each piece of work, `isToStop` is told
     * how many log entries there were before it, and can stop the run there, short of the time,
     * as a breakpoint does (FND-88). Says whether it stopped so.
     */
    advanceTo(time: SimTime, isToStop: (entriesBefore: number) => boolean = () => false): boolean {
        assertCanMoveTo(this.reached, time);
        while (this.dueBy(time)) {
            const entriesBefore = this.latest.cache.log.entries.size;
            if (!this.runNext()) {
                break;
            }
            if (isToStop(entriesBefore)) {
                return true;
            }
        }
        if (this.stoppedBy === null) {
            this.reached = time;
        }
        return false;
    }

    /** Tunes rule parameters now, by rule ID, as a config change commit. */
    changeConfig(changes: List<ParameterChange>): void {
        this.latest = changeConfig(this.latest, this.reached, changes);
    }

    /** States a decision or change outside the service now, as an indirect commit (FND-89). */
    stateIndirect(statement: IndirectStatement): void {
        this.latest = stateIndirectEffect(this.latest, this.reached, statement);
    }

    private dueBy(time: SimTime): boolean {
        return !this.nextAt.isAfter(time);
    }
}
