import { describe, expect, it } from 'vitest';

import { allTrue, NULL_PART, numberPart, recordPart, textPart } from './digest-parts';

describe('the parts a digest is written in', () => {
    it('writes text with its length', () => {
        const withComma = textPart('a,b');
        const empty = textPart('');

        expect(withComma).toBe('3:a,b');
        expect(empty).toBe('0:');
    });

    it('writes each kind of field apart from the others', () => {
        const written = recordPart([
            { text: '1' },
            { number: 1 },
            { isTrue: true },
            { isTrue: false },
            { textOrNull: null },
            { textOrNull: '' },
            { numberOrNull: null },
            { numberOrNull: 0 },
            { part: '{n2}' },
        ]);

        expect(written).toBe(`{1:1,n1,t,f,${NULL_PART},0:,${NULL_PART},n0,{n2}}`);
    });

    it('writes a number as a number part', () => {
        const written = numberPart(12);

        expect(written).toBe('n12');
    });

    it('braces a record, so its fields cannot run into the next one', () => {
        const inner = recordPart([{ number: 1 }]);
        const nested = recordPart([{ part: inner }, { number: 2 }]);
        const flat = recordPart([{ number: 1 }, { number: 2 }]);

        expect(nested).toBe('{{n1},n2}');
        expect(nested).not.toBe(flat);
    });
});

describe('the checks typed equality is built from', () => {
    it('holds only when every check does', () => {
        const isEvery = allTrue(true, true);
        const isNotEvery = allTrue(true, false);
        const isNone = allTrue();

        expect(isEvery).toBe(true);
        expect(isNotEvery).toBe(false);
        expect(isNone).toBe(true);
    });
});
