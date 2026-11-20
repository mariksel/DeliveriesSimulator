import { describe, expect, it } from 'vitest';

import { ONE_ORDER_SCENARIO } from './one-order.testing';
import type { IShelfEntry } from './scenario-shelf';
import { deletedIn, EMPTY_ENTRY, releasedIn, storedIn, usedIn } from './scenario-shelf';
import { toScenarioContentKey, toScenarioUser } from './scenario-version';

const FIRST = toScenarioContentKey('first content');
const SECOND = toScenarioContentKey('second content');
const THIRD = toScenarioContentKey('third content');
const RUN = toScenarioUser('saved-run-1');
const EDITED = { ...ONE_ORDER_SCENARIO, description: 'Edited.' };

/** A name with two versions stored, the first of them used by a saved run. */
function twoVersionsFirstUsed(): IShelfEntry {
    const first = storedIn(EMPTY_ENTRY, ONE_ORDER_SCENARIO, FIRST);
    const second = storedIn(first.entry, EDITED, SECOND);
    return usedIn(second.entry, first.version.number, RUN);
}

describe('storing a scenario', () => {
    it('gives its first version, numbered 1, under its name', () => {
        const { entry, version } = storedIn(EMPTY_ENTRY, ONE_ORDER_SCENARIO, FIRST);

        expect(version).toEqual({
            name: ONE_ORDER_SCENARIO.name,
            number: 1,
            scenario: ONE_ORDER_SCENARIO,
        });
        expect(entry.scenario).toEqual({
            name: ONE_ORDER_SCENARIO.name,
            latest: 1,
            isDeleted: false,
        });
    });

    it('gives the same version again for identical content', () => {
        const first = storedIn(EMPTY_ENTRY, ONE_ORDER_SCENARIO, FIRST);

        const again = storedIn(first.entry, ONE_ORDER_SCENARIO, FIRST);

        expect(again.version).toBe(first.version);
        expect(again.entry.versions.size).toBe(1);
    });

    it('gives a new version, numbered on, for different content under the same name', () => {
        const first = storedIn(EMPTY_ENTRY, ONE_ORDER_SCENARIO, FIRST);

        const second = storedIn(first.entry, EDITED, SECOND);

        expect(second.version.number).toBe(2);
        expect(second.version.scenario).toBe(EDITED);
        expect(second.entry.scenario?.latest).toBe(2);
    });
});

describe('deleting a scenario', () => {
    it('keeps only the versions saved runs use, and lists it no more', () => {
        const used = twoVersionsFirstUsed();

        const deleted = deletedIn(used);

        const numbers = deleted.versions.map((kept) => kept.version.number).toArray();
        expect(numbers).toEqual([1]);
        expect(deleted.scenario?.isDeleted).toBe(true);
    });

    it('lets the last version in use go once no saved run uses it, and the name with it', () => {
        const used = twoVersionsFirstUsed();
        const deleted = deletedIn(used);

        const kept = deleted.versions.first()!.version.number;
        const released = releasedIn(deleted, kept, RUN);

        expect(released).toBe(EMPTY_ENTRY);
    });

    it('carries its numbering on when its name is stored again while a version is in use', () => {
        const used = twoVersionsFirstUsed();
        const deleted = deletedIn(used);

        const again = { ...EDITED, description: 'Again.' };
        const stored = storedIn(deleted, again, THIRD);

        expect(stored.version.number).toBe(3);
        expect(stored.entry.scenario?.isDeleted).toBe(false);
    });

    it('gives a kept version back for identical content stored again, and lists it again', () => {
        const used = twoVersionsFirstUsed();
        const deleted = deletedIn(used);

        const stored = storedIn(deleted, ONE_ORDER_SCENARIO, FIRST);

        expect(stored.version.number).toBe(1);
        expect(stored.entry.scenario).toMatchObject({ latest: 2, isDeleted: false });
    });

    it('does nothing for a name with nothing kept', () => {
        const deleted = deletedIn(EMPTY_ENTRY);

        expect(deleted).toBe(EMPTY_ENTRY);
    });
});

describe('a version in use', () => {
    it('stays after release while its scenario is not deleted', () => {
        const used = twoVersionsFirstUsed();

        const first = used.versions.first()!.version.number;
        const released = releasedIn(used, first, RUN);

        expect(released.versions.size).toBe(2);
        expect(released.versions.first()?.users.isEmpty()).toBe(true);
    });

    it('cannot be noted for a version that is not kept', () => {
        const used = twoVersionsFirstUsed();
        const missing = 9 as Parameters<typeof usedIn>[1];

        expect(() => usedIn(used, missing, RUN)).toThrow('version 9 of the scenario');
    });
});
