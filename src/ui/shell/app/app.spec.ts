import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { ManualTicker, ManualWallClock, uiParts } from '../../workspace/ui-parts.testing';
import { App } from './app';
import { ROUTES } from '../routes';
import { SECTIONS } from '../sections';

describe('the application shell', () => {
    let element: HTMLElement;

    beforeEach(async () => {
        const wall = new ManualWallClock();
        const ticker = new ManualTicker();
        TestBed.configureTestingModule({
            providers: [provideRouter(ROUTES), ...uiParts(wall, ticker)],
        });
        const fixture = TestBed.createComponent(App);
        await fixture.whenStable();
        element = fixture.nativeElement as HTMLElement;
    });

    it('shows the application name', () => {
        expect(element.querySelector('h1')?.textContent).toBe('Deliveries Simulator');
    });

    it('lists every section in the sidebar', () => {
        const map = [...element.querySelectorAll('nav a')].map((link) => link.textContent);
        const expected = SECTIONS.map((section) => section.title);
        expect(map).toEqual(expected);
    });

    it('has the ten sections FND-53 lists', () => {
        expect(SECTIONS).toHaveLength(10);
    });

    it('has a route for every section', () => {
        const paths = ROUTES.map((route) => route.path);

        const expected = SECTIONS.map((section) => section.path);
        const everySection: unknown = expect.arrayContaining(expected);
        expect(paths).toEqual(everySection);
    });

    it('shows the status bar', () => {
        const appStatusBar = element.querySelector('app-status-bar');
        expect(appStatusBar).not.toBeNull();
    });
});
