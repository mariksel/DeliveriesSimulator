import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';

import { StatusBar } from './status-bar';
import { ManualTicker, ManualWallClock, uiParts } from '../ui-parts.testing';

it('says when no run is open', async () => {
    const wall = new ManualWallClock();
    const ticker = new ManualTicker();
    TestBed.configureTestingModule({
        providers: uiParts(wall, ticker),
    });
    const fixture = TestBed.createComponent(StatusBar);

    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No run open');
});
