import type { FieldsOf } from '../classes/fields-of';

/** What made a version: the run's start, or one piece of work. */
export const MakerKind = {
    /** The state a run starts from, made before any work. */
    RunStart: 'RunStart',
    /** One piece of work, such as a job run or an API call. */
    Work: 'Work',
} as const;

/** One of the values of {@link MakerKind}. */
export type MakerKind = (typeof MakerKind)[keyof typeof MakerKind];

/** Identifies one piece of work that made versions. */
export type WorkId = string & { readonly brand: 'WorkId' };
/** Marks text as a piece of work's ID. */
export const toWorkId = (value: string): WorkId => value as WorkId;

/**
 * What made a record's version. Business code knows only this, never how the work is run, so a
 * simulated job run or API call passes its own ID in as a {@link WorkId} (FND-81).
 */
export class Maker {
    /** The run's start, which makes the versions a run begins with. */
    static runStart(): Maker {
        return Maker.create({ kind: MakerKind.RunStart, workId: null });
    }

    /** One piece of work. */
    static work(workId: WorkId): Maker {
        return Maker.create({ kind: MakerKind.Work, workId });
    }

    /** A maker from its values: a piece of work has an ID, and the run's start has none. */
    static create(fields: FieldsOf<Maker>): Maker {
        const isWork = fields.kind === MakerKind.Work;
        const hasWorkId = fields.workId !== null;
        if (isWork !== hasWorkId) {
            throw new RangeError(`A ${fields.kind} maker has the wrong work ID.`);
        }
        return new Maker(fields.kind, fields.workId);
    }

    declare private readonly brand: never;

    private constructor(
        readonly kind: MakerKind,
        /** The piece of work, or null for the run's start. */
        readonly workId: WorkId | null,
    ) {
        Object.freeze(this);
    }

    /** Whether two makers name the same thing. */
    equals(other: Maker): boolean {
        return this.kind === other.kind && this.workId === other.workId;
    }
}
