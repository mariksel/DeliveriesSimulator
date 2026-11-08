import type { List } from 'immutable';
import type { IScenarioNames } from '../../application-core/scenarios/scenario-names';
import { scenarioNames } from '../../application-core/scenarios/scenario-names';
import type { IndirectStatement } from '../../application-core/simulation-engine/indirect-effect';
import { Map as ImmutableMap } from 'immutable';

import type { ICriterionResult } from '../../domain/verification/check-run';
import { checkRun } from '../../application-core/verification/check-run';
import { LiveRunState } from '../scenarios/live-run-state';
import type { ClockSpeed, RunLogEntry, LiveScenarioRun } from '../scenarios/live-scenario-run';
import type { Ticker } from '../../application-core/scenarios/ticker';
import type { IRunValues } from '../../application-core/simulation-engine/run-values';
import type { StepSize } from '../../application-core/simulation-engine/run-places';
import type { IRepeatResult } from '../../application-core/simulation-engine/run-repeat';
import type {
    IBranchLine,
    IBranchSummary,
} from '../../application-core/simulation-engine/run-branches';
import type {
    IBreakpoint,
    IBreakpointHit,
} from '../../application-core/simulation-engine/breakpoints';
import type { BranchId } from '../../application-core/simulation-engine/branch-id';
import type { LogSequence } from '../../domain/event-log/numbers';
import type { Position } from '../../domain/system/math/math';
import type { ParameterChange } from '../../domain/business-rules/parameter-change';
import type { Seed } from '../../domain/simulation-engine/numbers';
import type { Count } from '../../domain/system/math/math';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import { toCount } from '../../domain/system/math/math';

/**
 * How a run came out, as it stood at the time its scenario states it ends, or when a bug stopped
 * it.
 */
export interface IRunVerdict {
    readonly isPassed: boolean;
    readonly digest: string;
    readonly results: readonly ICriterionResult[];
    readonly ordersJudged: Count;
}

/** Where a watched run has got to. */
export interface IWatchedRunStatus {
    readonly scenarioName: string;
    readonly version: string;
    readonly seed: Seed;
    readonly state: LiveRunState;
    readonly canStart: boolean;
    readonly now: SimTime;
    readonly speed: ClockSpeed;
    readonly entries: List<RunLogEntry>;
    readonly eventCount: Count;
    readonly ordersFinished: Count;
    readonly ordersTotal: Count;
    readonly failureMessage: string | null;
    readonly failureAt: SimTime | null;
    readonly verdict: IRunVerdict | null;
    /** Each module's rules, with the values in use at the place shown. */
    readonly rules: IRunValues;
    /** The place shown: how many of the run's commits are shown (FND-86). */
    readonly place: Position;
    /** The latest place: every commit so far. */
    readonly latestPlace: Position;
    readonly isShowingLatest: boolean;
    /** What the last Repeat from here came to, until the place shown changes. */
    readonly repeat: IRepeatResult | null;
    /** The whole log, whatever place is shown: the event list and the trace show it all. */
    readonly allEntries: List<RunLogEntry>;
    /** Every branch of the run, as the tree shows them (FND-87). */
    readonly branches: List<IBranchSummary>;
    /** Every branch with its whole line of commits, as the timeline draws them (FND-87). */
    readonly branchLines: List<IBranchLine>;
    /** The breakpoints, in the order they were added (FND-88). */
    readonly breakpoints: readonly IBreakpoint[];
    /** The breakpoint the run last stopped at, until it goes on. */
    readonly lastHit: IBreakpointHit | null;
    readonly currentBranch: BranchId;
    /** The drivers, restaurants, and orders the scenario names, which a hand-made step may use. */
    readonly names: IScenarioNames;
}

/**
 * The service behind a run someone is watching: it keeps the ticker going while the run goes, and
 * judges the run once, when it ends. Running on past the stated end leaves that verdict as it was.
 */
export class WatchedRun {
    /** Each branch's verdict, once it has reached the scenario's end (FND-87). */
    private verdicts = ImmutableMap<BranchId, IRunVerdict>();
    private wasRunningWhenLeft = false;
    private readonly names: IScenarioNames;
    private repeat: IRepeatResult | null = null;

    get status(): IWatchedRunStatus {
        const { scenario, failure } = this.live;
        const { finished, total } = this.live.orderProgress;
        return {
            scenarioName: scenario.name,
            version: scenario.version,
            seed: scenario.seed,
            state: this.live.state,
            canStart: this.live.canStart,
            now: this.live.shownAt,
            speed: this.live.speed,
            entries: this.live.shownEntries,
            eventCount: toCount(this.live.shownEntries.size),
            ordersFinished: finished,
            ordersTotal: total,
            failureMessage: failure?.message ?? null,
            failureAt: failure?.at ?? null,
            verdict: this.verdicts.get(this.live.currentBranch) ?? null,
            rules: this.live.rules,
            place: this.live.place,
            latestPlace: this.live.latestPlace,
            isShowingLatest: this.live.isShowingLatest,
            repeat: this.repeat,
            allEntries: this.live.entries,
            branches: this.live.branches,
            branchLines: this.live.branchLines,
            breakpoints: this.live.breakpoints,
            lastHit: this.live.lastHit,
            currentBranch: this.live.currentBranch,
            names: this.names,
        };
    }

    constructor(
        private readonly live: LiveScenarioRun,
        private readonly ticker: Ticker,
        private readonly onChange: () => void,
    ) {
        this.names = scenarioNames(live.scenario);
    }

    start(): void {
        this.live.start();
        if (this.live.state === LiveRunState.Running) {
            this.ticker.start(() => {
                this.tick();
            });
        }
        this.onChange();
    }

    pause(): void {
        this.ticker.stop();
        this.live.pause();
        this.changed();
    }

    /** Starts the run if it can, and pauses it if it is running. */
    toggle(): void {
        if (this.live.state === LiveRunState.Running) {
            this.pause();
        } else {
            this.start();
        }
    }

    step(): void {
        this.ticker.stop();
        this.live.step();
        this.changed();
    }

    /** Shows a place, from 0 at the start to the latest, which pauses a running run. */
    showPlace(place: number): void {
        this.moved(() => {
            this.live.showPlace(place);
        });
    }

    /** Shows the place one step before the one shown. */
    back(size: StepSize): void {
        this.moved(() => {
            this.live.back(size);
        });
    }

    /** Shows the place one step after the one shown. */
    forward(size: StepSize): void {
        this.moved(() => {
            this.live.forward(size);
        });
    }

    /** Follows the latest commit again. */
    showLatest(): void {
        this.moved(() => {
            this.live.showLatest();
        });
    }

    /** Shows the place whose commit wrote a log entry. */
    showEntry(sequence: LogSequence): void {
        this.moved(() => {
            this.live.showEntry(sequence);
        });
    }

    /** Repeats the run from the place shown, and keeps what that came to. */
    repeatFromShown(): void {
        this.repeat = this.live.repeatFromShown();
        this.onChange();
    }

    /** Starts a new branch at the place shown, and watches it (FND-87). */
    forkHere(): void {
        this.onBranch(() => {
            this.live.forkHere();
        });
    }

    /** Watches another branch. */
    switchBranch(id: BranchId): void {
        this.onBranch(() => {
            this.live.switchBranch(id);
        });
    }

    /** Adds a breakpoint on an event kind, narrowed if wanted, switched on (FND-88). */
    addBreakpoint(kind: string, source: string | null, order: string | null): void {
        this.live.addBreakpoint(kind, source, order);
        this.onChange();
    }

    /** Switches a breakpoint on or off, keeping it. */
    switchBreakpoint(id: number, isOn: boolean): void {
        this.live.switchBreakpoint(id, isOn);
        this.onChange();
    }

    removeBreakpoint(id: number): void {
        this.live.removeBreakpoint(id);
        this.onChange();
    }

    /** Shows a commit of any branch, watching that branch first if it is another (FND-87). */
    showCommit(id: BranchId, place: number): void {
        this.onBranch(() => {
            this.live.showCommit(id, place);
        });
    }

    /** Gives a branch another name. */
    renameBranch(id: BranchId, name: string): void {
        this.live.renameBranch(id, name);
        this.onChange();
    }

    /** Changes rule parameters now, by rule ID, as a config change commit. */
    changeRules(changes: List<ParameterChange>): void {
        this.live.changeRules(changes);
        this.changed();
    }

    /** States a decision or change outside the service at the commit shown (FND-89). */
    stateIndirect(statement: IndirectStatement): void {
        this.live.stateIndirect(statement);
        this.changed();
    }

    setSpeed(speed: ClockSpeed): void {
        this.live.setSpeed(speed);
        this.changed();
    }

    runOnPastTheEnd(): void {
        this.live.runOnPastTheEnd();
        this.onChange();
    }

    /** Someone moved to another section: a running run pauses until they come back. */
    leave(): void {
        this.wasRunningWhenLeft = this.live.state === LiveRunState.Running;
        if (this.wasRunningWhenLeft) {
            this.pause();
        }
    }

    /** Someone came back: a run that was running when they left goes on. */
    comeBack(): void {
        if (this.wasRunningWhenLeft) {
            this.wasRunningWhenLeft = false;
            this.start();
        }
    }

    /** Stops the ticker for good, because another run is taking this one's place. */
    close(): void {
        this.ticker.stop();
    }

    /** Moves the place shown, forgetting the last repeat, and stops a paused run's ticker. */
    private moved(move: () => void): void {
        const place = this.live.place;
        move();
        if (this.live.place !== place) {
            this.repeat = null;
        }
        if (this.live.state !== LiveRunState.Running) {
            this.ticker.stop();
        }
        this.onChange();
    }

    /** Moves to another line of commits, with the ticker stopped and the last repeat forgotten. */
    private onBranch(move: () => void): void {
        this.ticker.stop();
        move();
        this.repeat = null;
        this.changed();
    }

    private tick(): void {
        this.live.tick();
        if (this.live.state !== LiveRunState.Running) {
            this.ticker.stop();
        }
        this.changed();
    }

    private changed(): void {
        const { state } = this.live;
        if (state === LiveRunState.Ended || state === LiveRunState.Failed) {
            this.ticker.stop();
            this.judgeOnce();
        }
        this.onChange();
    }

    /** Judges the branch being watched, once, when it has reached the scenario's end. */
    private judgeOnce(): void {
        const id = this.live.currentBranch;
        if (this.verdicts.has(id)) {
            return;
        }
        const check = checkRun(this.live.entries);
        const verdict: IRunVerdict = {
            isPassed: check.isPassed && this.live.failure === null,
            digest: this.live.digest,
            results: check.results,
            ordersJudged: check.ordersJudged,
        };
        this.verdicts = this.verdicts.set(id, verdict);
    }
}
