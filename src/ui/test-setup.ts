import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';

setupTestBed();

// jsdom has no Element.scrollTo, which the timeline's virtual scroll calls to follow the commit
// shown; in a browser it scrolls, and here there is nothing to scroll.
if (typeof Element.prototype.scrollTo !== 'function') {
    Element.prototype.scrollTo = (): void => undefined;
}
