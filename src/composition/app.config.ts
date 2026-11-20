import type { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { BuiltInScenarios } from '../application-core/scenarios/built-in-scenarios';
import { ScenarioFiles } from '../application-core/scenarios/scenario-files';
import { Ticker } from '../application-core/scenarios/ticker';
import { WallClock } from '../application-core/simulation-engine/wall-clock';
import { FunctionLookup } from '../application-core/simulation-engine/function-lookup';
import { REGISTERED_FUNCTIONS } from '../infrastructure/simulation-engine/function-registry';
import { TextCopier } from '../application-core/technical-view/text-copier';
import { BrowserScenarioFiles } from '../infrastructure/scenarios/browser-scenario-files';
import { BrowserTicker } from '../infrastructure/scenarios/browser-ticker';
import { BundledScenarios } from '../infrastructure/scenarios/bundled-scenarios';
import { BrowserWallClock } from '../infrastructure/simulation-engine/browser-wall-clock';
import { BrowserTextCopier } from '../infrastructure/technical-view/browser-text-copier';
import { ROUTES } from '../ui/shell/routes';
import { Calendar } from '../application-core/run-history/calendar';
import { RunRepository } from '../application-core/run-history/run-repository';
import { BrowserCalendar } from '../infrastructure/run-history/browser-calendar';
import { ScenarioRepository } from '../application-core/scenarios/scenario-repository';
import { IndexedDbRunRepository } from '../infrastructure/run-history/indexed-db-run-repository';
import { IndexedDbScenarioRepository } from '../infrastructure/scenarios/indexed-db-scenario-repository';

const COMPONENT_INPUT_BINDING = withComponentInputBinding();

/** Binds each Application abstraction to its Infrastructure implementation, and the routes. */
export const APP_CONFIG: ApplicationConfig = {
    providers: [
        provideRouter(ROUTES, COMPONENT_INPUT_BINDING),
        { provide: WallClock, useClass: BrowserWallClock },
        { provide: Calendar, useClass: BrowserCalendar },
        { provide: FunctionLookup, useValue: REGISTERED_FUNCTIONS },
        {
            provide: ScenarioRepository,
            useFactory: (): ScenarioRepository => new IndexedDbScenarioRepository(indexedDB),
        },
        {
            provide: RunRepository,
            useFactory: (): RunRepository => new IndexedDbRunRepository(indexedDB),
        },
        { provide: ScenarioFiles, useClass: BrowserScenarioFiles },
        { provide: BuiltInScenarios, useClass: BundledScenarios },
        { provide: Ticker, useClass: BrowserTicker },
        { provide: TextCopier, useClass: BrowserTextCopier },
    ],
};
