import { SPEED_PRESETS } from './run-view';

/** What a key can do in the run workspace. */
export const ShortcutKind = {
    StartOrPause: 'StartOrPause',
    Step: 'Step',
    Speed: 'Speed',
} as const;

/** One of the values of {@link ShortcutKind}. */
export type ShortcutKind = (typeof ShortcutKind)[keyof typeof ShortcutKind];

/** A key's job. A speed says which preset. */
export type Shortcut =
    | { readonly kind: typeof ShortcutKind.StartOrPause | typeof ShortcutKind.Step }
    | { readonly kind: typeof ShortcutKind.Speed; readonly preset: number };

const TEXT_TAGS: readonly string[] = ['INPUT', 'TEXTAREA', 'SELECT'];
const BUTTON_TAG = 'BUTTON';
const SPACE = ' ';

/**
 * What a key does, given what has the focus. A text box keeps its keys, and a button keeps Space.
 */
export function shortcutFor(key: string, focusTag: string): Shortcut | null {
    if (TEXT_TAGS.includes(focusTag)) {
        return null;
    }
    if (key === SPACE) {
        return focusTag === BUTTON_TAG ? null : { kind: ShortcutKind.StartOrPause };
    }
    if (key.toLowerCase() === 's') {
        return { kind: ShortcutKind.Step };
    }
    const preset = Number(key) - 1;
    return Number.isInteger(preset) && preset >= 0 && preset < SPEED_PRESETS.length
        ? { kind: ShortcutKind.Speed, preset }
        : null;
}
