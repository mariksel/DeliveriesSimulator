import type { MakerKind } from '../../../domain/system/records/maker';
import { Maker, toWorkId } from '../../../domain/system/records/maker';

/** What made a version, persisted: its kind, and the work's ID, or null for the run's start. */
export interface IPersistedMaker {
    readonly kind: MakerKind;
    readonly workId: string | null;
}

/** A maker as it is persisted. */
export const toPersistedMaker = (maker: Maker): IPersistedMaker => ({
    kind: maker.kind,
    workId: maker.workId,
});

/** A persisted maker, rebuilt. */
export function fromPersistedMaker(persisted: IPersistedMaker): Maker {
    const workId = persisted.workId === null ? null : toWorkId(persisted.workId);
    return Maker.create({ kind: persisted.kind, workId });
}
