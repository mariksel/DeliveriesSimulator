import { describe, expect, it } from 'vitest';

import { shortcutFor } from './shortcuts';

describe('keyboard shortcuts', () => {
    it.each<[string, string]>([
        [' ', 'StartOrPause'],
        ['s', 'Step'],
        ['S', 'Step'],
    ])('%s has its job', (key, kind) => {
        const secondShortcutFor = shortcutFor(key, 'BODY');
        expect(secondShortcutFor).toEqual({ kind });
    });

    it.each<[string, number]>([
        ['1', 0],
        ['5', 4],
    ])('%s chooses a speed preset', (key, preset) => {
        const secondShortcutFor = shortcutFor(key, 'BODY');
        expect(secondShortcutFor).toEqual({ kind: 'Speed', preset });
    });

    it.each(['0', '6', 'x', 'Enter', '1.5'])('%s does nothing', (key) => {
        const secondShortcutFor = shortcutFor(key, 'BODY');
        expect(secondShortcutFor).toBeNull();
    });

    it.each(['INPUT', 'TEXTAREA', 'SELECT'])('leaves every key to a focused %s', (tag) => {
        const secondShortcutFor = shortcutFor('s', tag);
        expect(secondShortcutFor).toBeNull();
    });

    it('leaves Space to a focused button', () => {
        const secondShortcutFor = shortcutFor(' ', 'BUTTON');
        expect(secondShortcutFor).toBeNull();
    });

    it('still steps while a button has the focus', () => {
        const secondShortcutFor = shortcutFor('s', 'BUTTON');
        expect(secondShortcutFor).toEqual({ kind: 'Step' });
    });
});
