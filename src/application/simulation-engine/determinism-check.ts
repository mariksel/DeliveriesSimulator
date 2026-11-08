import type { List } from 'immutable';

import type { IRunDifference } from '../../application-core/simulation-engine/compare-runs';
import { firstDifference } from '../../application-core/simulation-engine/compare-runs';
import type { RunLogEntry } from '../../application-core/simulation-engine/run-log-entry';

/**
 * Runs the same thing twice and compares the two runs. Returns the first difference, or null
 * when they match event for event. `run` must build a new run each time, from the same version,
 * scenario, and seed.
 */
export function checkDeterminism(run: () => List<RunLogEntry>): IRunDifference | null {
    const ran = run();
    const second = run();
    return firstDifference(ran, second);
}
