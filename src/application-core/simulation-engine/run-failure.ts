import type { RunWork } from './run-work';
import type { SimTime } from '../../domain/simulation-engine/sim-time';

/** A bug inside a run: when it happened, and the work that hit it. */
export interface IRunFailure {
    readonly at: SimTime;
    readonly work: RunWork;
    readonly message: string;
}
