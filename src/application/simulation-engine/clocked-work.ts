import type { SimTime } from '../../domain/simulation-engine/sim-time';

/** Work a clock can move through: a run, or anything else that keeps simulated time. */
export abstract class ClockedWork {
    /** Simulated time, in whole milliseconds since the run began. */
    abstract get now(): SimTime;
    /** Moves to the next piece of work and runs it. Returns false when there is none to run. */
    abstract runNext(): boolean;
    /** Runs all work due by the given time, including work it schedules, and stops there. */
    abstract advanceTo(time: SimTime): void;
}
