import { expect, it } from 'vitest';

import { unreachable } from './unreachable';

it('throws, naming the value that should not exist', () => {
    const value = 'surprise' as never;

    expect(() => unreachable(value)).toThrow('Unreachable: surprise.');
});
