import { describe, expect, it } from 'vitest';

import { textDigest } from './text-digest';

describe('textDigest', () => {
    it('is 16 hexadecimal characters', () => {
        const digest = textDigest(['a text']);

        expect(digest).toMatch(/^[0-9a-f]{16}$/);
    });

    it('keeps its length whatever the texts, padding with zeros', () => {
        const lengths = Array.from({ length: 500 }, (_unused, index) => {
            const digest = textDigest([`text ${index}`]);
            return digest.length;
        });

        const set = new Set(lengths);
        const expected = new Set([16]);
        expect(set).toEqual(expected);
    });

    it('is the same for the same texts', () => {
        const digest = textDigest(['a', 'b']);
        const again = textDigest(['a', 'b']);

        expect(digest).toBe(again);
    });

    it('changes with any difference', () => {
        const base = textDigest(['a', 'b']);

        const other = textDigest(['a', 'c']);
        const reordered = textDigest(['b', 'a']);
        const empty = textDigest([]);
        expect(other).not.toBe(base);
        expect(reordered).not.toBe(base);
        expect(empty).not.toBe(base);
    });

    it('takes the texts as if they were one text', () => {
        const split = textDigest(['ab', 'c']);
        const whole = textDigest(['abc']);

        expect(split).toBe(whole);
    });

    it('reads the texts lazily, as a run of them is produced', () => {
        function* texts(): Generator<string> {
            yield 'a';
            yield 'b';
        }

        const generator = texts();
        const generated = textDigest(generator);
        const listed = textDigest(['a', 'b']);
        expect(generated).toBe(listed);
    });
});
