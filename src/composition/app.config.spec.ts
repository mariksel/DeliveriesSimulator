import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { BuiltInScenarios } from '../application-core/scenarios/built-in-scenarios';
import { ScenarioFiles } from '../application-core/scenarios/scenario-files';
import { Ticker } from '../application-core/scenarios/ticker';
import { WallClock } from '../application-core/simulation-engine/wall-clock';
import { TextCopier } from '../application-core/technical-view/text-copier';
import { BrowserScenarioFiles } from '../infrastructure/scenarios/browser-scenario-files';
import { BrowserTicker } from '../infrastructure/scenarios/browser-ticker';
import { BundledScenarios } from '../infrastructure/scenarios/bundled-scenarios';
import { BrowserWallClock } from '../infrastructure/simulation-engine/browser-wall-clock';
import { BrowserTextCopier } from '../infrastructure/technical-view/browser-text-copier';
import { APP_CONFIG } from './app.config';

describe('binding each abstraction to its browser implementation', () => {
    it.each<[string, abstract new () => unknown, new () => unknown]>([
        ['the wall clock', WallClock, BrowserWallClock],
        ['scenario files', ScenarioFiles, BrowserScenarioFiles],
        ['the built-in scenarios', BuiltInScenarios, BundledScenarios],
        ['the ticker', Ticker, BrowserTicker],
        ['copying text', TextCopier, BrowserTextCopier],
    ])('binds %s', (_name, abstraction, implementation) => {
        TestBed.configureTestingModule({ providers: APP_CONFIG.providers });

        const bound: unknown = TestBed.inject(abstraction);
        expect(bound).toBeInstanceOf(implementation);
    });
});
