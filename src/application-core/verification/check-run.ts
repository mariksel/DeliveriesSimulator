import type { List } from 'immutable';

import type { IRunCheck } from '../../domain/verification/check-run';
import { checkRunRecord } from '../../domain/verification/check-run';
import type { RunLogEntry } from '../simulation-engine/run-log-entry';
import { readRunRecord } from './read-run-record';

/** Judges a run on the correctness criteria, from its event log alone. */
export function checkRun(entries: List<RunLogEntry>): IRunCheck {
    const record = readRunRecord(entries);
    return checkRunRecord(record);
}
