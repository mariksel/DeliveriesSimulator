import { List } from 'immutable';

import type { SimTime } from './sim-time';
import { toSimTime } from './sim-time';

/** One plain function waiting to run, and when. */
interface IWaiting {
    readonly at: number;
    readonly work: (now: number) => void;
}

/**
 * A schedule of plain functions, for tests that only care about the order work runs in. Work due
 * at the same time runs in the order it was added.
 */
export class ClosureScheduler {
    private time = 0;
    private waiting = List<IWaiting>();

    get now(): SimTime {
        return toSimTime(this.time);
    }

    get nextAt(): number | undefined {
        return this.waiting.first()?.at;
    }

    add(at: number, work: (now: number) => void): void {
        if (!Number.isInteger(at) || at < this.time) {
            throw new RangeError(`Cannot schedule at ${at}: the time is ${this.time}.`);
        }
        const later = this.waiting.findIndex((waiting) => waiting.at > at);
        const entry: IWaiting = { at, work };
        this.waiting = later < 0 ? this.waiting.push(entry) : this.waiting.insert(later, entry);
    }

    runNext(): boolean {
        const first = this.waiting.first();
        if (first === undefined) {
            return false;
        }
        this.waiting = this.waiting.shift();
        this.time = first.at;
        first.work(first.at);
        return true;
    }

    advanceTo(time: SimTime): void {
        if (!Number.isInteger(time.milliseconds) || time.milliseconds < this.time) {
            throw new RangeError(
                `Cannot advance to ${time.milliseconds}: the time is ${this.time}.`,
            );
        }
        while (this.nextAt !== undefined && this.nextAt <= time.milliseconds) {
            this.runNext();
        }
        this.time = time.milliseconds;
    }
}
