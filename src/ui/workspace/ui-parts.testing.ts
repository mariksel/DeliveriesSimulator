import type { Provider } from '@angular/core';

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

/** What the screens need from outside the core. */
export function uiParts(wall: ManualWallClock, ticker: ManualTicker): Provider[] {
    return [
        { provide: WallClock, useValue: wall },
        { provide: Ticker, useValue: ticker },
        { provide: ScenarioFiles, useClass: FilesForTest },
        { provide: BuiltInScenarios, useClass: BuiltInsForTest },
        { provide: TextCopier, useClass: CopierForTest },
    ];
}
