import type { ClockedWork } from './clocked-work';
import type { ClockSpeed } from './clock-speed';
import { DEFAULT_SPEED, MAX_SPEED } from './clock-speed';
import type { WallClock } from '../../application-core/simulation-engine/wall-clock';
import type { WallTime } from '../../domain/simulation-engine/numbers';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import { toWallTime } from '../../domain/simulation-engine/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';

/** Keeps one tick at 'max' short, because recurring jobs can mean the work never runs out. */
const MAX_WORK_PER_TICK = 1000;

function assertValid(speed: ClockSpeed): void {
    if (speed !== MAX_SPEED && (!Number.isFinite(speed) || speed <= 0)) {
        throw new RangeError(`Invalid clock speed: ${speed}.`);
    }
}

/**
 * Controls how fast a run's work moves. Speed changes how quickly a run is watched,
 * and never its work or the order of that work. A host calls tick regularly while it runs.
 */
export class SimulationClock {
    private isClockRunning = false;
    private lastWall: WallTime = toWallTime(0);
    /** Simulated time with its fraction, which keeps slow speeds and short ticks accurate. */
    private exact: number;
    private currentSpeed: ClockSpeed;

    get isRunning(): boolean {
        return this.isClockRunning;
    }

    get speed(): ClockSpeed {
        return this.currentSpeed;
    }

    get now(): SimTime {
        return this.work.now;
    }

    constructor(
        private readonly work: ClockedWork,
        private readonly wallClock: WallClock,
        speed: ClockSpeed = DEFAULT_SPEED,
    ) {
        assertValid(speed);
        this.currentSpeed = speed;
        this.exact = work.now.milliseconds;
    }

    start(): void {
        if (this.isClockRunning) {
            return;
        }
        this.isClockRunning = true;
        this.lastWall = this.wallClock.now();
    }

    pause(): void {
        this.catchUp();
        this.isClockRunning = false;
    }

    setSpeed(speed: ClockSpeed): void {
        assertValid(speed);
        this.catchUp();
        this.currentSpeed = speed;
    }

    /**
     * Pauses, then moves to the next scheduled work and runs it. Returns false when none is left.
     */
    step(): boolean {
        this.pause();
        const didRun = this.work.runNext();
        this.exact = this.work.now.milliseconds;
        return didRun;
    }

    tick(): void {
        if (!this.isClockRunning) {
            return;
        }
        this.catchUp();
        if (this.currentSpeed !== MAX_SPEED) {
            return;
        }
        let done = 0;
        while (done < MAX_WORK_PER_TICK && this.work.runNext()) {
            done++;
        }
        this.exact = this.work.now.milliseconds;
    }

    /**
     * Stops where the work stopped, without catching up first, as a breakpoint the work reached
     * stops it (FND-88).
     */
    halt(): void {
        this.isClockRunning = false;
        this.exact = this.work.now.milliseconds;
    }

    /** Forgets any simulated time counted beyond where the work has stopped. */
    syncToWork(): void {
        this.exact = this.work.now.milliseconds;
    }

    /**
     * Counts the real time since the last call at the current speed. At 'max', no work depends on
     * it.
     */
    private catchUp(): void {
        if (!this.isClockRunning) {
            return;
        }
        const wall = this.wallClock.now();
        const elapsed = wall - this.lastWall;
        this.lastWall = wall;
        if (this.currentSpeed === MAX_SPEED) {
            return;
        }
        this.exact += elapsed * this.currentSpeed;
        const floor = Math.floor(this.exact);
        const time = toSimTime(floor);
        this.work.advanceTo(time);
    }
}
