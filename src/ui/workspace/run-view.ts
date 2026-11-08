import type { SpeedMultiple } from '../../domain/simulation-engine/numbers';
import { toSpeedMultiple } from '../../domain/simulation-engine/numbers';
import { formatClockTime } from '../../domain/simulation-engine/clock-time';
import { LiveRunState } from '../../application/scenarios/live-run-state';
import type { ClockSpeed } from '../../application/scenarios/live-scenario-run';
import { DEFAULT_SPEED, MAX_SPEED } from '../../application/scenarios/live-scenario-run';
import type { IRunVerdict, IWatchedRunStatus } from '../../application/verification/watched-run';
import type { IRepeatResult } from '../../application-core/simulation-engine/run-repeat';

const TEN = 10;
const SIX_HUNDRED = 600;
const REAL_TIME = toSpeedMultiple(1);
const TEN_TIMES = toSpeedMultiple(TEN);
const SIX_HUNDRED_TIMES = toSpeedMultiple(SIX_HUNDRED);

/** The speeds offered as buttons. The keyboard's 1 to 5 choose them. */
export const SPEED_PRESETS: readonly ClockSpeed[] = [
    REAL_TIME,
    TEN_TIMES,
    DEFAULT_SPEED,
    SIX_HUNDRED_TIMES,
    MAX_SPEED,
];

/** How a run did on one criterion, as the workspace shows it. */
export interface ICriterionView {
    readonly name: string;
    readonly isPassed: boolean;
    readonly violations: readonly string[];
}

/** Everything the status bar and the workspace show about a run. */
export interface IRunView {
    readonly scenarioName: string;
    readonly version: string;
    readonly seed: number;
    readonly time: string;
    /** The simulated time, in milliseconds, as the time above shows it. */
    readonly now: number;
    readonly state: LiveRunState;
    readonly speed: string;
    readonly rawSpeed: ClockSpeed;
    /** The speed as the speed box shows it, when it is a typed one. Empty for a preset. */
    readonly customSpeed: string;
    readonly eventCount: number;
    readonly orders: string;
    /** Null until the run has ended. */
    readonly verdict: string | null;
    /** Something to know about the verdict, if anything. */
    readonly verdictNote: string | null;
    readonly isPassed: boolean;
    readonly digest: string | null;
    readonly criteria: readonly ICriterionView[];
    readonly failure: string | null;
    readonly isRunning: boolean;
    /** What the main button says: what pressing it does. */
    readonly startLabel: string;
    readonly canStart: boolean;
    readonly canStep: boolean;
    readonly canRunOn: boolean;
    /** The place shown, from 0 at the start to the latest (FND-86). */
    readonly place: number;
    readonly latestPlace: number;
    readonly isShowingLatest: boolean;
    /** "Commit n of m" while an earlier place is shown, or null at the latest. */
    readonly placeLabel: string | null;
    /** What the last Repeat from here came to, or null. */
    readonly repeat: string | null;
    readonly isRepeatSame: boolean;
}

function startLabelOf(state: LiveRunState): string {
    if (state === LiveRunState.Running) {
        return 'Pause';
    }
    return state === LiveRunState.Paused ? 'Resume' : 'Start';
}

/** Writes a speed for people: 60x, or max. */
export const speedLabel = (speed: ClockSpeed): string =>
    speed === MAX_SPEED ? MAX_SPEED : `${speed}x`;

/**
 * Reads a typed speed: a multiple of real time above zero, with or without its x. Null if it is
 * not one.
 */
export function parseSpeed(text: string): SpeedMultiple | null {
    const trimmed = text.trim().replace(/x$/i, '');
    const speed = Number(trimmed);
    return trimmed !== '' && Number.isFinite(speed) && speed > 0 ? toSpeedMultiple(speed) : null;
}

/** What to show about how a run came out. Before it ends, nothing. */
function verdictParts(
    verdict: IRunVerdict | null,
): Pick<IRunView, 'verdict' | 'verdictNote' | 'isPassed' | 'digest' | 'criteria'> {
    if (verdict === null) {
        return { verdict: null, verdictNote: null, isPassed: false, digest: null, criteria: [] };
    }
    return {
        verdict: verdict.isPassed ? 'Passed' : 'Failed',
        verdictNote:
            verdict.ordersJudged === 0
                ? 'No orders were judged: this scenario created none.'
                : null,
        isPassed: verdict.isPassed,
        digest: verdict.digest,
        criteria: verdict.results.map(({ criterion, violations }) => ({
            name: criterion,
            isPassed: violations.isEmpty(),
            violations: violations.map((violation) => violation.message).toArray(),
        })),
    };
}

/** What a repeat came to, for people. */
function repeatLine(repeat: IRepeatResult | null): string | null {
    if (repeat === null) {
        return null;
    }
    if (repeat.failure !== null) {
        return `The repeat stopped: ${repeat.failure}`;
    }
    if (repeat.differsAt !== null) {
        return `Repeated from commit ${repeat.from}: commit ${repeat.differsAt} came out differently.`;
    }
    return `Repeated from commit ${repeat.from} to ${repeat.to}: all ${repeat.compared} commits came out the same.`;
}

const failureLine = (message: string | null, at: number | null): string | null =>
    message === null ? null : `Stopped at ${formatClockTime(at ?? 0)}: ${message}`;

/**
 * Whether the commit shown is where the run goes on from: the latest, or a breakpoint's hit, from
 * which Resume and Step go on from the latest commit (FND-88).
 */
const isAtWhereRunGoesOn = (status: IWatchedRunStatus): boolean =>
    status.isShowingLatest || status.lastHit !== null;

/** What to show for a run, as it now stands. */
export function runView(status: IWatchedRunStatus): IRunView {
    const { state } = status;
    const isStopped = state === LiveRunState.Ended || state === LiveRunState.Failed;
    return {
        scenarioName: status.scenarioName,
        version: status.version,
        seed: status.seed,
        time: formatClockTime(status.now.milliseconds),
        now: status.now.milliseconds,
        state,
        speed: speedLabel(status.speed),
        rawSpeed: status.speed,
        customSpeed: SPEED_PRESETS.includes(status.speed) ? '' : String(status.speed),
        eventCount: status.eventCount,
        orders: `${status.ordersFinished} of ${status.ordersTotal}`,
        ...verdictParts(status.verdict),
        failure: failureLine(status.failureMessage, status.failureAt?.milliseconds ?? null),
        isRunning: state === LiveRunState.Running,
        startLabel: startLabelOf(state),
        canStart: status.canStart,
        canStep: !isStopped && isAtWhereRunGoesOn(status),
        canRunOn: state === LiveRunState.Ended && status.isShowingLatest,
        place: status.place,
        latestPlace: status.latestPlace,
        isShowingLatest: status.isShowingLatest,
        placeLabel: status.isShowingLatest
            ? null
            : `Commit ${status.place} of ${status.latestPlace}`,
        repeat: repeatLine(status.repeat),
        isRepeatSame:
            status.repeat !== null &&
            status.repeat.failure === null &&
            status.repeat.differsAt === null,
    };
}
