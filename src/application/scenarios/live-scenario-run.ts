import type { List } from 'immutable';

import type { IndirectStatement } from '../../application-core/simulation-engine/indirect-effect';
import { runDigest } from '../../application-core/simulation-engine/run-digest';
import type { ClockSpeed } from '../simulation-engine/clock-speed';
import { DEFAULT_SPEED, MAX_SPEED } from '../simulation-engine/clock-speed';
import { ClockedWork } from '../simulation-engine/clocked-work';
import type { IRunFailure } from '../../application-core/simulation-engine/run-failure';
import type { RunLogEntry, IRunState } from '../../application-core/simulation-engine/run-state';
import { createRun } from '../../application-core/simulation-engine/run-state';
import { scheduleScenario } from '../../application-core/scenarios/schedule-scenario';
import { SimulationClock } from '../simulation-engine/simulation-clock';
import { SimulationRun } from '../simulation-engine/simulation-run';
import { WallClock } from '../../application-core/simulation-engine/wall-clock';
import { LiveRunState } from './live-run-state';
import type { IScenario } from '../../application-core/scenarios/scenario';
import type { IRunValues } from '../../application-core/simulation-engine/run-values';
import type { IMainRoot } from '../../application-core/simulation-engine/main-root';
import type { StepSize } from '../../application-core/simulation-engine/run-places';
import {
    commitAt,
    latestPlace,
    logAt,
    placeAfter,
    placeBefore,
    placeOfEntry,
    placeWithin,
    rootAt,
} from '../../application-core/simulation-engine/run-places';
import type { IRepeatResult } from '../../application-core/simulation-engine/run-repeat';
import type {
    IBranchLine,
    IBranchLines,
    IBranchSummary,
} from '../../application-core/simulation-engine/run-branches';
import {
    forkAt,
    rename,
    switchTo,
    branchesOf,
    branchLinesSince,
} from '../../application-core/simulation-engine/run-branches';
import type { BranchId } from '../../application-core/simulation-engine/branch-id';
import { repeatFrom } from '../../application-core/simulation-engine/run-repeat';
import type {
    IBreakpoint,
    IBreakpointHit,
} from '../../application-core/simulation-engine/breakpoints';
import { breakpointHit } from '../../application-core/simulation-engine/breakpoints';
import type { Position } from '../../domain/system/math/math';
import type { ParameterChange } from '../../domain/business-rules/parameter-change';
import type { Count } from '../../domain/system/math/math';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import { RUN_START } from '../../domain/simulation-engine/sim-time';
import { earlierOf } from '../../domain/system/time/instant';

export { DEFAULT_SPEED, MAX_SPEED };
export { WallClock };
export type { ClockSpeed, RunLogEntry, IRunFailure };

/** A run's work, up to the time its scenario states it ends, or on past it once told to. */
class WorkUpToTheEnd extends ClockedWork {
    /** The breakpoint the work stopped at, until the run takes it. */
    private hit: IBreakpointHit | null = null;
    /** The breakpoints the work stops at (FND-88). */
    breakpoints: readonly IBreakpoint[] = [];

    get now(): SimTime {
        return this.run.now;
    }

    constructor(
        private readonly run: SimulationRun,
        private until: SimTime | null,
    ) {
        super();
    }

    /** Runs the next piece of work; a breakpoint it reaches stops the work after it. */
    runNext(): boolean {
        if (this.hit !== null) {
            return false;
        }
        const isWithinTheEnd = this.until === null || !this.run.nextAt.isAfter(this.until);
        const entriesBefore = this.run.state.cache.log.entries.size;
        const didRun = isWithinTheEnd && this.run.runNext();
        const hit = didRun ? this.check(entriesBefore) : null;
        return didRun && hit === null;
    }

    advanceTo(time: SimTime): void {
        if (this.hit !== null) {
            return;
        }
        const reached = this.until === null ? time : earlierOf(time, this.until);
        this.run.advanceTo(reached, (entriesBefore) => {
            const hit = this.check(entriesBefore);
            return hit !== null;
        });
    }

    /** The breakpoint the work stopped at, if any, which the work then goes on past. */
    takeHit(): IBreakpointHit | null {
        const { hit } = this;
        this.hit = null;
        return hit;
    }

    runOnPastTheEnd(): void {
        this.until = null;
    }

    /** The breakpoint, if any, that the last piece of work's entries reach, kept until taken. */
    private check(entriesBefore: number): IBreakpointHit | null {
        const { entries } = this.run.state.cache.log;
        const written = entries.skip(entriesBefore);
        this.hit = breakpointHit(this.breakpoints, written, entries);
        return this.hit;
    }
}

/** The state a scenario's run starts from. */
function startOf(scenario: IScenario): IRunState {
    const run = createRun({ seed: scenario.seed });
    return scheduleScenario(run, scenario.start, scenario.steps);
}

/** One scenario being watched live: the service that moves its run along by the wall clock. */
export class LiveScenarioRun {
    private readonly run: SimulationRun;
    private readonly work: WorkUpToTheEnd;
    private readonly clock: SimulationClock;
    private current: LiveRunState = LiveRunState.Ready;
    private hasPassedTheEnd = false;
    /** The place shown, or null to follow the latest commit (FND-86). */
    private shown: Position | null = null;
    /** The breakpoint the run last stopped at, and the place it showed then (FND-88). */
    private stoppedAt: { readonly hit: IBreakpointHit; readonly place: Position } | null = null;
    private breakpointsMade = 0;
    /** Every branch's line as last worked out, and the state it was worked out for. */
    private lines: { readonly state: IRunState; readonly kept: IBranchLines } | null = null;

    /**
     * Whether the commit shown is the one a breakpoint stopped the run at, from which Resume and
     * Step go on, from the latest commit.
     */
    private get isShowingHit(): boolean {
        return this.stoppedAt !== null && this.shown === this.stoppedAt.place;
    }

    get state(): LiveRunState {
        return this.current;
    }

    get now(): SimTime {
        return this.run.now;
    }

    get speed(): ClockSpeed {
        return this.clock.speed;
    }

    get entries(): List<RunLogEntry> {
        return this.run.state.cache.log.entries;
    }

    /** Every branch of the run, as the tree shows them (FND-87). */
    get branches(): List<IBranchSummary> {
        return branchesOf(this.run.state);
    }

    /** Every branch with its whole line of commits, as the timeline draws them (FND-87). */
    get branchLines(): List<IBranchLine> {
        const { state } = this.run;
        if (this.lines?.state !== state) {
            const earlier = this.lines?.kept ?? null;
            const kept = branchLinesSince(state, earlier);
            this.lines = { state, kept };
        }
        return this.lines.kept.lines;
    }

    /** The branch being watched. */
    get currentBranch(): BranchId {
        return this.run.state.history.current;
    }

    /** The latest place: every commit so far. */
    get latestPlace(): Position {
        return latestPlace(this.run.state);
    }

    /** The place shown: how many of the run's commits are shown. */
    get place(): Position {
        return this.shown ?? this.latestPlace;
    }

    /** Whether the latest commit is shown, so the run can go on. */
    get isShowingLatest(): boolean {
        return this.shown === null || this.shown === this.latestPlace;
    }

    /** The log as it stood at the place shown. */
    get shownEntries(): List<RunLogEntry> {
        return this.isShowingLatest ? this.entries : logAt(this.run.state, this.place);
    }

    /** The simulated time of the place shown. */
    get shownAt(): SimTime {
        if (this.isShowingLatest) {
            return this.now;
        }
        const commit = commitAt(this.run.state, this.place);
        return commit?.at ?? RUN_START;
    }

    /** The main root of the place shown. */
    get shownRoot(): IMainRoot {
        return this.isShowingLatest ? this.run.state.root : rootAt(this.run.state, this.place);
    }

    /** Each module's rules, with the values in use at the place shown. */
    get rules(): IRunValues {
        return this.shownRoot.effects.direct.values;
    }

    get failure(): IRunFailure | null {
        return this.run.failure;
    }

    /** A fingerprint of the run so far: two runs with the same digest match event for event. */
    get digest(): string {
        return runDigest(this.entries);
    }

    /** How many orders have reached a final state, of all the orders, at the place shown. */
    get orderProgress(): { readonly finished: Count; readonly total: Count } {
        return this.shownRoot.state.orders.progress();
    }

    /**
     * Whether it can start: it has not ended, or has been told to run on past that, and the latest
     * commit is shown. Acting from an earlier one starts a new branch, which forks add.
     */
    get canStart(): boolean {
        const isStartable =
            this.current === LiveRunState.Ready || this.current === LiveRunState.Paused;
        return isStartable && (this.isShowingLatest || this.isShowingHit);
    }

    /** The breakpoints, in the order they were added (FND-88). */
    get breakpoints(): readonly IBreakpoint[] {
        return this.work.breakpoints;
    }

    /** The breakpoint the run last stopped at, until it goes on. */
    get lastHit(): IBreakpointHit | null {
        return this.stoppedAt?.hit ?? null;
    }

    constructor(
        readonly scenario: IScenario,
        wallClock: WallClock,
        start: IRunState = startOf(scenario),
    ) {
        this.run = new SimulationRun(start);
        this.work = new WorkUpToTheEnd(this.run, scenario.runUntil);
        this.clock = new SimulationClock(this.work, wallClock);
    }

    start(): void {
        if (this.canStart) {
            this.goOnFromHit();
            this.clock.start();
            this.current = LiveRunState.Running;
        }
    }

    /** Adds a breakpoint, on, and gives its ID. */
    addBreakpoint(kind: string, source: string | null, order: string | null): number {
        this.breakpointsMade += 1;
        const id = this.breakpointsMade;
        const added: IBreakpoint = { id, kind, source, order, isOn: true };
        this.work.breakpoints = [...this.work.breakpoints, added];
        return id;
    }

    /** Switches a breakpoint on or off, keeping it. */
    switchBreakpoint(id: number, isOn: boolean): void {
        this.work.breakpoints = this.work.breakpoints.map((breakpoint) =>
            breakpoint.id === id ? { ...breakpoint, isOn } : breakpoint,
        );
    }

    removeBreakpoint(id: number): void {
        this.work.breakpoints = this.work.breakpoints.filter((breakpoint) => breakpoint.id !== id);
    }

    pause(): void {
        if (this.current === LiveRunState.Running) {
            this.clock.pause();
            this.current = LiveRunState.Paused;
            this.settle();
        }
    }

    setSpeed(speed: ClockSpeed): void {
        this.clock.setSpeed(speed);
        this.settle();
    }

    /**
     * Changes rule parameters now, by rule ID, as a config change commit, whether the run is
     * paused or running (FND-84).
     */
    changeRules(changes: List<ParameterChange>): void {
        if (!this.isShowingLatest) {
            this.forkHere();
        }
        this.run.changeConfig(changes);
    }

    /**
     * States a decision or change outside the service at the commit shown, as an indirect commit,
     * whether the run is paused or running. From an earlier commit it forks first (FND-89).
     */
    stateIndirect(statement: IndirectStatement): void {
        if (!this.isShowingLatest) {
            this.forkHere();
        }
        this.run.stateIndirect(statement);
    }

    /**
     * Starts a new branch at the place shown, between job runs and API calls at or before it,
     * and watches it, paused at its latest commit, ready to run on (FND-87).
     */
    forkHere(): void {
        const forked = forkAt(this.run.state, this.place);
        this.goOnFrom(forked);
    }

    /** Watches another branch, paused at its latest commit. */
    switchBranch(id: BranchId): void {
        const switched = switchTo(this.run.state, id);
        this.goOnFrom(switched);
    }

    /**
     * Shows a commit of any branch. On another branch it watches that branch first, paused at its
     * latest commit, then shows the commit (FND-87).
     */
    showCommit(id: BranchId, place: number): void {
        if (id !== this.currentBranch) {
            this.switchBranch(id);
        }
        this.showPlace(place);
    }

    /** Gives a branch another name. */
    renameBranch(id: BranchId, name: string): void {
        const renamed = rename(this.run.state, id, name);
        this.run.continueFrom(renamed);
    }

    /**
     * Shows a place, from 0 at the start to the latest. Showing an earlier one pauses a running
     * run, which can go on only from the latest (FND-86).
     */
    showPlace(place: number): void {
        const within = placeWithin(this.run.state, place);
        this.shown = within === this.latestPlace ? null : within;
        if (this.shown !== null) {
            this.pause();
        }
    }

    /** Shows the place one step before the one shown. */
    back(size: StepSize): void {
        const before = placeBefore(this.run.state, this.place, size);
        this.showPlace(before);
    }

    /** Shows the place one step after the one shown. */
    forward(size: StepSize): void {
        const after = placeAfter(this.run.state, this.place, size);
        this.showPlace(after);
    }

    /** Follows the latest commit again. */
    showLatest(): void {
        this.shown = null;
    }

    /** Shows the place whose commit wrote a log entry. */
    showEntry(sequence: RunLogEntry['sequence']): void {
        const place = placeOfEntry(this.run.state, sequence);
        this.showPlace(place);
    }

    /** Repeats the run from the place shown up to its latest commit, and compares the two. */
    repeatFromShown(): IRepeatResult {
        return repeatFrom(this.run.state, this.place);
    }

    /** Pauses, and runs the next piece of work. At the stated end, it goes no further. */
    step(): void {
        if (
            this.current === LiveRunState.Ended ||
            this.current === LiveRunState.Failed ||
            !(this.isShowingLatest || this.isShowingHit)
        ) {
            return;
        }
        this.goOnFromHit();
        this.clock.step();
        this.current = LiveRunState.Paused;
        this.stopAtHit();
        this.finishIfNothingIsDue();
        this.settle();
    }

    /** Moves the run on by the real time since the last call. */
    tick(): void {
        if (this.current !== LiveRunState.Running) {
            return;
        }
        this.clock.tick();
        if (this.stopAtHit()) {
            return;
        }
        if (this.clock.speed === MAX_SPEED) {
            this.finishIfNothingIsDue();
        }
        this.settle();
    }

    /** After the stated end, lets the run go on, paused until it is started. */
    runOnPastTheEnd(): void {
        if (this.current !== LiveRunState.Ended) {
            return;
        }
        this.hasPassedTheEnd = true;
        this.work.runOnPastTheEnd();
        this.current = LiveRunState.Paused;
    }

    /**
     * Stops the run at a breakpoint the work reached, if it did: the clock stops where the work
     * did, and the commit that wrote the event is shown (FND-88).
     */
    private stopAtHit(): boolean {
        const hit = this.work.takeHit();
        if (hit === null) {
            return false;
        }
        this.clock.halt();
        this.current = LiveRunState.Paused;
        const place = placeOfEntry(this.run.state, hit.entry.sequence);
        this.shown = place;
        this.stoppedAt = { hit, place };
        return true;
    }

    /** Going on from a breakpoint goes on from the latest commit, and forgets the hit. */
    private goOnFromHit(): void {
        if (this.stoppedAt !== null) {
            this.shown = null;
            this.stoppedAt = null;
        }
    }

    /** With no more work before the stated end, only time is left to pass, so it passes. */
    private finishIfNothingIsDue(): void {
        if (
            !this.hasPassedTheEnd &&
            this.run.failure === null &&
            this.isNoWorkLeftBeforeTheEnd()
        ) {
            this.work.advanceTo(this.scenario.runUntil);
        }
    }

    /** Work due exactly at the stated end still belongs to the run. */
    private isNoWorkLeftBeforeTheEnd(): boolean {
        return this.run.nextAt.isAfter(this.scenario.runUntil);
    }

    /** Stops the clock if a bug stopped the run, or it has reached the stated end. */
    private settle(): void {
        if (this.run.failure !== null) {
            this.stopAs(LiveRunState.Failed);
        } else if (
            !this.hasPassedTheEnd &&
            !this.run.now.isBefore(this.scenario.runUntil) &&
            this.isNoWorkLeftBeforeTheEnd()
        ) {
            this.stopAs(LiveRunState.Ended);
        }
    }

    /** Goes on from another line of commits, paused at its latest, or ended if nothing is left. */
    private goOnFrom(state: IRunState): void {
        this.pause();
        this.run.continueFrom(state);
        this.shown = null;
        this.clock.syncToWork();
        if (this.current !== LiveRunState.Ready) {
            this.current = LiveRunState.Paused;
        }
        this.settle();
    }

    private stopAs(state: LiveRunState): void {
        this.clock.pause();
        this.clock.syncToWork();
        this.current = state;
    }
}
