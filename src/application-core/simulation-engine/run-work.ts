import { List } from 'immutable';

import { unreachable } from '../../domain/system/validation/unreachable';
import type { IRunValues } from './run-values';
import type { IRunInput, ScriptInput } from './run-input';
import type { CommitId } from './commit-id';
import { nextDispatchPassAt } from '../../domain/drivers/dispatch-pass';
import { nextDeliveriesInboxAt } from '../../domain/drivers/deliveries/deliveries-communication';
import { nextHandoffRetryAt, nextOrdersInboxAt } from '../../domain/orders/orders-communication';
import { SimTime } from '../../domain/simulation-engine/sim-time';
import type { DriverId } from '../../domain/drivers/driver';

/** The kinds of work a run can have due. */
export const WorkKind = {
    Job: 'Job',
    ScriptedStep: 'ScriptedStep',
    /** A driver's app sending its location, by itself (FND-90). */
    LocationSend: 'LocationSend',
    /** A scripted pick-up or delivery made when its driver arrives (FND-90). */
    Arrival: 'Arrival',
} as const;

/** One of the values of {@link WorkKind}. */
export type WorkKind = (typeof WorkKind)[keyof typeof WorkKind];

/** The jobs that repeat through a run. */
export const RunJob = {
    OrdersInbox: 'OrdersInbox',
    HandoffRetry: 'HandoffRetry',
    DeliveriesInbox: 'DeliveriesInbox',
    DispatchPass: 'DispatchPass',
} as const;

/** One of the values of {@link RunJob}. */
export type RunJob = (typeof RunJob)[keyof typeof RunJob];

/** Every job, in the order they first run, all at the start of a run. */
export const RUN_JOBS = List<RunJob>([
    RunJob.OrdersInbox,
    RunJob.HandoffRetry,
    RunJob.DeliveriesInbox,
    RunJob.DispatchPass,
]);

/** When a job's next run is due after its latest one, by the config values in use. */
export function nextJobRunAt(job: RunJob, latest: SimTime, values: IRunValues): SimTime {
    switch (job) {
        case RunJob.OrdersInbox: {
            const next = nextOrdersInboxAt(latest, values.orders);
            return SimTime.from(next);
        }
        case RunJob.DeliveriesInbox: {
            const next = nextDeliveriesInboxAt(latest, values.deliveries);
            return SimTime.from(next);
        }
        case RunJob.HandoffRetry: {
            const next = nextHandoffRetryAt(latest, values.orders);
            return SimTime.from(next);
        }
        case RunJob.DispatchPass: {
            const next = nextDispatchPassAt(latest, values.drivers);
            return SimTime.from(next);
        }
        default:
            return unreachable(job);
    }
}

/** A job's run. */
export interface IJobWork {
    readonly kind: typeof WorkKind.Job;
    readonly job: RunJob;
}

/** An actor's scripted action. */
export interface IInputWork {
    readonly kind: typeof WorkKind.ScriptedStep;
    readonly step: ScriptInput;
}

/** A driver's app sending its location, as it does every interval while they are online. */
export interface ILocationSendWork {
    readonly kind: typeof WorkKind.LocationSend;
    /** Each driver whose app is due to send then, in the order of the drivers in the script. */
    readonly driverIds: List<DriverId>;
}

/**
 * Work that is due: a record, which the engine turns into a function call. It is worked out from
 * the commits and the scenario, and not held in a run.
 */
export type RunWork = IJobWork | IInputWork | ILocationSendWork | IArrivalWork;

/** A scripted pick-up or delivery that waited, made now its driver has arrived (FND-90). */
export interface IArrivalWork {
    readonly kind: typeof WorkKind.Arrival;
    /** The indirect commit that said it waits. */
    readonly waiting: CommitId;
    readonly step: IRunInput;
}
