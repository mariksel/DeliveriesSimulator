import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';

import { ColumnWidthStore } from './column-width-store';

it('keeps widths for each group apart, and each column in a group', () => {
    const store = TestBed.inject(ColumnWidthStore);

    store.setWidth('first', 'kind', 200);
    store.setWidth('first', 'order', 80);
    store.setWidth('second', 'kind', 90);

    const widthsIn = store.widthsIn('first').get('kind');
    expect(widthsIn).toBe(200);
    const secondWidthsIn = store.widthsIn('first').get('order');
    expect(secondWidthsIn).toBe(80);
    const thirdWidthsIn = store.widthsIn('second').get('kind');
    expect(thirdWidthsIn).toBe(90);
});

it('has no widths for a group nobody has resized', () => {
    expect(TestBed.inject(ColumnWidthStore).widthsIn('none').size).toBe(0);
});
