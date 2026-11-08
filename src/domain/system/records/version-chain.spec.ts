import { describe, expect, it } from 'vitest';

import type { IVersion } from './version-chain';
import { assertVersionLink, FIRST_VERSION, versionChain } from './version-chain';
import { toVersionNumber } from './version-chain';

interface ITestVersion extends IVersion<ITestVersion> {
    readonly name: string;
}

const FIRST: ITestVersion = { name: 'first', number: FIRST_VERSION, previous: null };

const after = (previous: ITestVersion, name: string): ITestVersion => ({
    name,
    number: toVersionNumber(previous.number + 1),
    previous,
});

describe('versionChain', () => {
    it('holds only the version when it is the first', () => {
        const testVersions = versionChain(FIRST).toArray();
        expect(testVersions).toEqual([FIRST]);
    });

    it('lists every version, oldest first', () => {
        const second = after(FIRST, 'second');
        const third = after(second, 'third');

        const names = versionChain(third)
            .map((version) => version.name)
            .toArray();
        expect(names).toEqual(['first', 'second', 'third']);
    });
});

describe('assertVersionLink', () => {
    it('allows a first version, and one that follows the version it links to', () => {
        const second = after(FIRST, 'second');

        expect(() => {
            assertVersionLink('a test record', FIRST.number, FIRST.previous);
            assertVersionLink('a test record', second.number, second.previous);
        }).not.toThrow();
    });

    it.each<[string, number, ITestVersion | null]>([
        ['a first version that is not number 1', 2, null],
        ['a version that skips a number', 3, FIRST],
        ['a version that repeats a number', 1, FIRST],
        ['a version number in part', 1.5, null],
    ])('refuses %s', (_name, number, previous) => {
        expect(() => {
            const version = toVersionNumber(number);
            assertVersionLink('a test record', version, previous);
        }).toThrow(RangeError);
    });
});
