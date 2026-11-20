import { List } from 'immutable';

import { required } from '../../domain/system/validation/required';
import type { DriverId } from '../../domain/drivers/driver';
import type { IRunState } from './run-state';
import type { RunWork } from './run-work';
import { nextJobRunAt, RUN_JOBS, WorkKind } from './run-work';
import { headAt } from './commit-line';
import type { Position } from '../../domain/system/math/math';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import { laterOf } from '../../domain/system/time/instant';
import { RUN_START } from '../../domain/simulation-engine/sim-time';
import { toPosition } from '../../domain/system/math/math';
import { toInputActor } from './input-names';
import { InputCommand } from './input-command';
import { arrivalAt, RideKind } from './ride';
import type { IRunInput } from './run-input';

/** Work that is due, and when. */
export interface IDueWork {
    readonly at: SimTime;
    readonly work: RunWork;
}

/**
 * Where work due at the same moment comes, as when it was first held in a schedule: a job before
 * its first run, then the script's steps, then jobs in the order of their latest runs.
 */
const Turn = {
    FirstJobRun: 0,
    ScriptedStep: 1,
    /** Steps that waited for their drivers come after the script's steps due then. */
    Arrival: 2,
    LaterJobRun: 3,
    /** Apps' sends come last, in the order of the drivers in the script. */
    LocationSend: 4,
} as const;

interface ICandidate extends IDueWork {
    readonly turn: number;
    readonly position: Position;
}

function comesBefore(first: ICandidate, second: ICandidate): boolean {
    if (!first.at.equals(second.at)) {
        return first.at.isBefore(second.at);
    }
    if (first.turn !== second.turn) {
        return first.turn < second.turn;
    }
    return first.position < second.position;
}

function jobCandidates(run: IRunState): List<ICandidate> {
    const { values } = run.root.effects.direct;
    // A job whose interval was tuned shorter is due at once, never before the latest commit.
    const floor = headAt(run.line);
    return RUN_JOBS.map((job, index): ICandidate => {
        const work: RunWork = { kind: WorkKind.Job, job };
        const last = run.cache.lastJobRuns.get(job);
        if (last === undefined) {
            const position = toPosition(index);
            return { at: RUN_START, work, turn: Turn.FirstJobRun, position };
        }
        const due = nextJobRunAt(job, last.at, values);
        const at = laterOf(due, floor);
        return { at, work, turn: Turn.LaterJobRun, position: last.position };
    });
}

/** When one app is due to send, before the latest commit's time is taken into account. */
interface IDueSend {
    readonly due: SimTime;
    readonly driverId: DriverId;
    /** Its driver's place among the script's riders. */
    readonly index: number;
}

/** The apps' sends worked out for one set of riders, statuses, locations, and latest sends. */
interface IDueSends {
    readonly riders: IRunState['script']['riders'];
    readonly statuses: IRunState['root']['state']['drivers']['statuses'];
    readonly locations: IRunState['root']['state']['drivers']['locations'];
    /** Soonest first, then in the order of the riders. */
    readonly sends: readonly IDueSend[];
}

/**
 * The apps' sends, kept for the latest sends they were worked out from. They change only when
 * apps send or a driver's status or location changes, a few thousand times a day, while due work
 * is worked out at every step: working them out each time took most of a 500-driver day (FND-90).
 */
const DUE_SENDS = new WeakMap<IRunState['cache']['lastLocationSends'], IDueSends>();

/**
 * Each app's next location send: an interval after its latest one, or after the start, while its
 * driver is online and has a location (FND-90).
 */
function dueSends(run: IRunState): readonly IDueSend[] {
    const { riders } = run.script;
    const { statuses, locations } = run.root.state.drivers;
    const latestSends = run.cache.lastLocationSends;
    const known = DUE_SENDS.get(latestSends);
    if (known?.riders === riders && known.statuses === statuses && known.locations === locations) {
        return known.sends;
    }
    const sends = riders
        .valueSeq()
        .toArray()
        .flatMap((rider, index): IDueSend[] => {
            const availability = statuses.get(rider.driverId)?.availability ?? null;
            if (availability === null || !locations.has(rider.driverId)) {
                return [];
            }
            const actor = toInputActor(rider.driverId);
            const latest = latestSends.get(actor)?.at ?? RUN_START;
            const due = latest.plus(rider.sendEvery);
            return [{ due, driverId: rider.driverId, index }];
        })
        .toSorted((first, second) =>
            first.due.equals(second.due)
                ? first.index - second.index
                : first.due.milliseconds - second.due.milliseconds,
        );
    DUE_SENDS.set(latestSends, { riders, statuses, locations, sends });
    return sends;
}

/**
 * The apps' sends due soonest, as one piece of work: every app due at that moment sends at once,
 * in the order of the drivers in the script, so a day makes one send commit each interval
 * whatever the number of drivers (FND-90). Never before the latest commit, so every app overdue
 * then sends together.
 */
function batchedSends(run: IRunState): List<ICandidate> {
    const sends = dueSends(run);
    const [first] = sends;
    if (first === undefined) {
        return List();
    }
    const floor = headAt(run.line);
    const soonest = laterOf(first.due, floor);
    // Soonest first, so the sends due then are the ones before the first due later.
    const later = sends.findIndex((send) => send.due.isAfter(soonest));
    const dueThen = later < 0 ? sends : sends.slice(0, later);
    const inOrder = dueThen.toSorted((one, other) => one.index - other.index);
    const ids = inOrder.map((send) => send.driverId);
    const driverIds = List(ids);
    const work: RunWork = { kind: WorkKind.LocationSend, driverIds };
    return List.of({ at: soonest, work, turn: Turn.LocationSend, position: toPosition(0) });
}

/**
 * Each scripted pick-up or delivery waiting for its driver: due when they arrive, once their
 * latest ride is to its stop (FND-90). Never before the latest commit.
 */
function arrivalCandidates(run: IRunState): List<ICandidate> {
    const floor = headAt(run.line);
    return run.cache.waitingOnArrival
        .entrySeq()
        .toList()
        .flatMap(([waiting, acts], index): ICandidate[] => {
            const ride = run.cache.rides.get(acts.actor);
            const orderId = run.cache.orderIds.get(acts.order);
            const isPickUp = acts.command === InputCommand.PickUp;
            if (
                ride === undefined ||
                ride.leg.kind !== RideKind.SetsOff ||
                ride.leg.stopOrder !== orderId ||
                ride.leg.isPickUp !== isPickUp
            ) {
                return [];
            }
            const arrival = arrivalAt(ride.at, ride.leg);
            const at = laterOf(arrival, floor);
            const step: IRunInput = {
                at,
                actor: acts.actor,
                command: acts.command,
                order: acts.order,
            };
            const work: RunWork = { kind: WorkKind.Arrival, waiting, step };
            return [{ at, work, turn: Turn.Arrival, position: toPosition(index) }];
        });
}

/**
 * The next work due, worked out from the commits, the config values, and the scenario's steps.
 * The jobs always repeat, so there is always some.
 */
export function nextWork(run: IRunState): IDueWork {
    const { stepsRun } = run.cache;
    const step = run.script.steps.get(stepsRun);
    const sends = batchedSends(run);
    const arrivals = arrivalCandidates(run);
    const jobs = jobCandidates(run).concat(arrivals, sends);
    const candidates =
        step === undefined
            ? jobs
            : jobs.push({
                  at: step.at,
                  work: { kind: WorkKind.ScriptedStep, step },
                  turn: Turn.ScriptedStep,
                  position: toPosition(stepsRun),
              });
    const firstCandidate = candidates.first();
    const first = required(firstCandidate, 'a job');
    const next = candidates.reduce(
        (earliest, candidate) => (comesBefore(candidate, earliest) ? candidate : earliest),
        first,
    );
    return { at: next.at, work: next.work };
}
