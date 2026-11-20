import type { DriverId } from '../../domain/drivers/driver';
import { TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import { required } from '../../domain/system/validation/required';
import type { IMainRoot } from './main-root';
import type { RecordRef, RecordVersion } from './record-ref';
import { keyOf, RecordKind, recordOf, versionIn } from './record-ref';
import type { RunLogEntry } from './run-log-entry';
import type { IRunState } from './run-state';

/** Shared by every job run that read nothing, which most do. */
const NO_READS: readonly RecordVersion[] = Object.freeze([]);

/** The drivers a job run notified, from the entries it wrote. */
function notifiedDrivers(written: readonly RunLogEntry[]): DriverId[] {
    return written.flatMap((entry) =>
        entry.kind === TechnicalLogKind.NotificationSent ? [entry.data.notification.driverId] : [],
    );
}

/** The records a job run or API call made versions of, from the run's index. */
function recordsMade(run: IRunState): RecordRef[] {
    const session = required(run.line.session, 'the job run or API call under way');
    const { index } = run.cache;
    const numbers = index.recordsByWork.get(session.id) ?? [];
    return numbers.map((number) => {
        const found = index.records.get(number);
        const key = required(found, `record ${number}`);
        return recordOf(key);
    });
}

/** The latest version of each record in a root, once each, leaving out records not yet made. */
function versionsBefore(before: IMainRoot, records: readonly RecordRef[]): RecordVersion[] {
    // By key, the first of each: a batch of sends reads hundreds of records (FND-90).
    const places = records.map((record, place): [string, number] => [keyOf(record), place]);
    const lastFirst = places.toReversed();
    const firsts = new Map(lastFirst);
    const distinct = records.filter((record, place) => {
        const key = keyOf(record);
        return firsts.get(key) === place;
    });
    return distinct.flatMap((record) => {
        const version = versionIn(before, record);
        return version === undefined ? [] : [version];
    });
}

/**
 * What a job run or API call read, worked out by the engine as it ends (FND-81): as they stood
 * before it, the records a call names, the versions of the records it made versions of, and the
 * drivers it notified. A record only looked at, and not changed, is not listed.
 */
export function readsOfWork(
    run: IRunState,
    started: IRunState,
    named: readonly RecordRef[],
): readonly RecordVersion[] {
    const made = recordsMade(run);
    const written = run.cache.log.entries.slice(started.cache.log.entries.size).toArray();
    const notified = notifiedDrivers(written).map((id): RecordRef => ({
        kind: RecordKind.Driver,
        id,
    }));
    const records = [...named, ...made, ...notified];
    if (records.length === 0) {
        return NO_READS;
    }
    const versions = versionsBefore(started.root, records);
    return Object.freeze(versions);
}
