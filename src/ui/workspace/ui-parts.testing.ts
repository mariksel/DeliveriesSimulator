import { FunctionLookup } from '../../application-core/simulation-engine/function-lookup';
import { TESTING_FUNCTIONS } from '../../application-core/simulation-engine/function-lookup.testing';
import type { Provider } from '@angular/core';

import { Calendar } from '../../application-core/run-history/calendar';
import { RunRepository } from '../../application-core/run-history/run-repository';
import {
    ManualCalendar,
    MemoryRunRepository,
    MemoryScenarioRepository,
} from '../../application-core/run-history/run-stores.testing';
import { ScenarioRepository } from '../../application-core/scenarios/scenario-repository';

import { BuiltInScenarios } from '../../application-core/scenarios/built-in-scenarios';
import { ScenarioFiles } from '../../application-core/scenarios/scenario-files';
import {
    BuiltInsForTest,
    FilesForTest,
} from '../../application-core/scenarios/scenario-ports.testing';
import { Ticker } from '../../application-core/scenarios/ticker';
import { WallClock } from '../../application-core/simulation-engine/wall-clock';
import { TextCopier } from '../../application-core/technical-view/text-copier';
import { toWallTime } from '../../domain/simulation-engine/numbers';
import type { WallTime } from '../../domain/simulation-engine/numbers';

/** A wall clock a test moves by hand. */
export class ManualWallClock extends WallClock {
    time = 0;
    now(): WallTime {
        return toWallTime(this.time);
    }
}

/** A ticker a test fires by hand. */
export class ManualTicker extends Ticker {
    private onTick: (() => void) | null = null;

    get isGoing(): boolean {
        return this.onTick !== null;
    }

    start(onTick: () => void): void {
        this.onTick = onTick;
    }

    stop(): void {
        this.onTick = null;
    }

    fire(): void {
        this.onTick?.();
    }
}

/** Stands in for the clipboard. */
export class CopierForTest extends TextCopier {
    copy(): Promise<boolean> {
        return Promise.resolve(true);
    }
}

/**
 * What the screens need from outside the core: saved runs and scenario versions are kept in
 * memory, in the run store given or a fresh one.
 */
export function uiParts(
    wall: ManualWallClock,
    ticker: ManualTicker,
    runs: MemoryRunRepository = new MemoryRunRepository(),
): Provider[] {
    return [
        { provide: Calendar, useClass: ManualCalendar },
        { provide: RunRepository, useValue: runs },
        { provide: ScenarioRepository, useClass: MemoryScenarioRepository },
        { provide: WallClock, useValue: wall },
        { provide: FunctionLookup, useValue: TESTING_FUNCTIONS },
        { provide: Ticker, useValue: ticker },
        { provide: ScenarioFiles, useClass: FilesForTest },
        { provide: BuiltInScenarios, useClass: BuiltInsForTest },
        { provide: TextCopier, useClass: CopierForTest },
    ];
}
