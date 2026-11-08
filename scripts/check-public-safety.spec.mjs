import { expect, it } from 'vitest';

import { findPrivateText } from './check-public-safety.mjs';

// Built from parts, so this file does not trip the check it tests.
const samples = [
    ['email address', ['someone', 'example.com'].join('@')],
    ['Windows drive path', ['D:', 'work', 'project'].join('\\')],
    ['Windows drive path', ['D:', 'work', 'project'].join('/')],
    ['home folder path', ['', 'Users', 'someone'].join('/')],
    ['home folder path', ['', 'home', 'someone'].join('/')],
    ['file URL', ['file:', '', 'server'].join('/')],
];

it.each(samples)('finds a %s', (kind, text) => {
    const privateText = findPrivateText(`first line\n${text}\n`);
    expect(privateText).toEqual([{ line: 2, kind }]);
});

it.each([
    'https://example.com/path',
    '@angular/core',
    'import x from "node:fs";',
    '**Major:** a change to the flow',
    'src/ui/shell/app.ts',
])('ignores %s', (text) => {
    const privateText = findPrivateText(text);
    expect(privateText).toEqual([]);
});
