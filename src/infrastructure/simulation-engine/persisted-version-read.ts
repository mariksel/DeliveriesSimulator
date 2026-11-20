import type { IMainRoot } from '../../application-core/simulation-engine/main-root';
import type {
    RecordKind,
    RecordVersion,
} from '../../application-core/simulation-engine/record-ref';
import {
    recordFrom,
    recordOfVersion,
    versionIn,
} from '../../application-core/simulation-engine/record-ref';
import { toVersionNumber, versionNumbered } from '../../domain/system/records/version-chain';
import { required } from '../../domain/system/validation/required';

/** A version an effect read, persisted as its record's kind and ID, and its number (FND-81). */
export interface IPersistedVersionRead {
    readonly kind: RecordKind;
    readonly id: string;
    readonly number: number;
}

/** A version read, as it is persisted. */
export function toPersistedRead(version: RecordVersion): IPersistedVersionRead {
    const record = recordOfVersion(version);
    return { kind: record.kind, id: record.id, number: version.number };
}

/**
 * A version read, found again in the state of the root that holds the effect: the record's
 * version with that number, through its version chain.
 */
export function fromPersistedRead(
    read: IPersistedVersionRead,
    root: Pick<IMainRoot, 'state'>,
): RecordVersion {
    const record = recordFrom(read.kind, read.id);
    const latest = versionIn(root, record);
    const number = toVersionNumber(read.number);
    const version = latest === undefined ? undefined : versionNumbered(latest, number);
    return required(version, `version ${read.number} of ${read.kind} ${read.id}`);
}
