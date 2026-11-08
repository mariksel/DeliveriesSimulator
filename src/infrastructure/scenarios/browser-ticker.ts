import { Ticker } from '../../application-core/scenarios/ticker';

/** Calls back once for each frame the browser draws. */
export class BrowserTicker extends Ticker {
    private frame: number | null = null;

    start(onTick: () => void): void {
        this.stop();
        const nextFrame = (): void => {
            this.frame = requestAnimationFrame(() => {
                nextFrame();
                onTick();
            });
        };
        nextFrame();
    }

    stop(): void {
        if (this.frame !== null) {
            cancelAnimationFrame(this.frame);
            this.frame = null;
        }
    }
}
