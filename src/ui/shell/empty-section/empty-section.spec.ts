import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';

import { EmptySection } from './empty-section';

it('says what will go in a section, and that it is not built yet', async () => {
    const fixture = TestBed.createComponent(EmptySection);
    fixture.componentRef.setInput('sectionTitle', 'Findings');
    fixture.componentRef.setInput('summary', 'The flaws found.');

    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Findings');
    expect(text).toContain('The flaws found.');
    expect(text).toContain('Not built yet');
});
