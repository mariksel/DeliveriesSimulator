import { describe, expect, it } from 'vitest';

import { Maker, MakerKind } from '../../../domain/system/records/maker';
import { TEST_MAKER } from '../../../domain/system/records/maker.testing';
import { fromPersistedMaker, toPersistedMaker } from './persisted-maker';

const RUN_START = Maker.runStart();

describe('a persisted maker', () => {
    it.each([
        ['a piece of work', TEST_MAKER],
        ["the run's start", RUN_START],
    ])('gives back %s', (_name, maker) => {
        const persisted = toPersistedMaker(maker);

        const loaded = fromPersistedMaker(persisted);

        const isSame = loaded.equals(maker);
        expect(isSame).toBe(true);
    });

    it('is plain data', () => {
        const persisted = toPersistedMaker(TEST_MAKER);

        expect(persisted).toStrictEqual({ kind: MakerKind.Work, workId: 'work-test' });
    });

    it('refuses a piece of work with no ID', () => {
        const persisted = { kind: MakerKind.Work, workId: null };

        expect(() => fromPersistedMaker(persisted)).toThrow(RangeError);
    });
});
