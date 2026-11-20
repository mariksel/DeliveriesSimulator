import { describe, expect, it } from 'vitest';

import { Maker, MakerKind, toWorkId } from './maker';

const WORK = toWorkId('session-3');

describe('a maker', () => {
    it('names a piece of work by its ID', () => {
        const maker = Maker.work(WORK);

        expect(maker).toMatchObject({ kind: MakerKind.Work, workId: 'session-3' });
    });

    it("names the run's start with no work ID", () => {
        const maker = Maker.runStart();

        expect(maker).toMatchObject({ kind: MakerKind.RunStart, workId: null });
    });

    it('equals a maker naming the same thing, and no other', () => {
        const first = Maker.work(WORK);
        const same = Maker.work(WORK);
        const other = Maker.runStart();

        const isSame = first.equals(same);
        const isOther = first.equals(other);

        expect(isSame).toBe(true);
        expect(isOther).toBe(false);
    });

    it.each([
        { kind: MakerKind.Work, workId: null },
        { kind: MakerKind.RunStart, workId: WORK },
    ])('refuses a $kind maker with the wrong work ID', (fields) => {
        const make = (): Maker => Maker.create(fields);

        expect(make).toThrow(RangeError);
    });

    it('cannot be changed', () => {
        const maker = Maker.work(WORK);

        const isFrozen = Object.isFrozen(maker);
        expect(isFrozen).toBe(true);
    });
});
