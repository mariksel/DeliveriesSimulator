import { TestBed } from '@angular/core/testing';
import { List } from 'immutable';
import { expect, it } from 'vitest';

import { EventList } from './event-list';

it('says when there are no events yet', async () => {
    const fixture = TestBed.createComponent(EventList);
    const list = List();
    fixture.componentRef.setInput('entries', list);

    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No events yet.');
});
