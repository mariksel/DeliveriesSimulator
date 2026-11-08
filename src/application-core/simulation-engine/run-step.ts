import { DeliveriesState } from '../../domain/drivers/deliveries/deliveries-state';
import { OrdersState } from '../../domain/orders/orders-state';
import { unreachable } from '../../domain/system/validation/unreachable';
import { EffectKind } from './direct-effect';
import { nextWork } from './due-work';
import { applyDeliveriesStep, applyOrdersStep, carryOutAll } from './run-commands';
import { NO_CAUSE } from './run-log';
import type { IRunState } from './run-state';
import { commitEffect, finishSession, startSession } from './run-state';
import type { RunJob } from './run-work';
import { RunJob as RunJobs, WorkKind } from './run-work';
import { performRulesInput } from './config-change';
import type { ScriptInput } from './run-input';
import { isIndirectInput, isRulesInput } from './run-input';
import { performIndirectInput } from './indirect-commit';
import { performInput } from './run-inputs';
import { callState } from './state-call';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import { toCount } from '../../domain/system/math/math';

function readOrdersInbox(run: IRunState, now: SimTime): IRunState {
    const { outbox } = run.root.state.deliveries;
    const communication = run.root.effects.direct.values.orders;
    const due = OrdersState.dueDeliveriesEvents(run.root.state.orders, outbox, communication);
    return due.reduce((done, event) => {
        const step = callState(
            OrdersState.readDeliveriesEvent,
            done.root.state.orders,
            now,
            event,
        );
        const read = applyOrdersStep(done, step, NO_CAUSE);
        const recordDeliveriesEventRead = callState(
            OrdersState.recordDeliveriesEventRead,
            read.root.state.orders,
            event,
            outbox,
            communication,
        );
        return applyOrdersStep(read, recordDeliveriesEventRead, NO_CAUSE);
    }, run);
}

function readDeliveriesInbox(run: IRunState, now: SimTime): IRunState {
    const { outbox } = run.root.state.orders;
    const communication = run.root.effects.direct.values.deliveries;
    const due = DeliveriesState.dueOrdersEvents(run.root.state.deliveries, outbox, communication);
    return due.reduce((done, event) => {
        const step = callState(
            DeliveriesState.readOrdersEvent,
            done.root.state.deliveries,
            done.root.state.drivers,
            now,
            event,
        );
        const read = applyDeliveriesStep(done, step, NO_CAUSE);
        const recordOrdersEventRead = callState(
            DeliveriesState.recordOrdersEventRead,
            read.root.state.deliveries,
            event,
            outbox,
            communication,
        );
        return applyDeliveriesStep(read, recordOrdersEventRead, NO_CAUSE);
    }, run);
}

function dispatchPass(run: IRunState, now: SimTime): IRunState {
    const { drivers } = run.root.effects.direct.values;
    return DeliveriesState.openRequests(run.root.state.deliveries).reduce((done, orderId) => {
        const step = callState(
            DeliveriesState.notifyNextDriver,
            done.root.state.deliveries,
            done.root.state.drivers,
            orderId,
            now,
            drivers,
        );
        return applyDeliveriesStep(done, step, NO_CAUSE);
    }, run);
}

function runJob(run: IRunState, job: RunJob, now: SimTime): IRunState {
    switch (job) {
        case RunJobs.OrdersInbox:
            return readOrdersInbox(run, now);
        case RunJobs.HandoffRetry: {
            const communication = run.root.effects.direct.values.orders;
            const step = callState(
                OrdersState.retryHandoffs,
                run.root.state.orders,
                now,
                communication,
            );
            const runState = applyOrdersStep(run, step, NO_CAUSE);
            return carryOutAll(runState, step.result.followUps, NO_CAUSE).run;
        }
        case RunJobs.DeliveriesInbox:
            return readDeliveriesInbox(run, now);
        case RunJobs.DispatchPass:
            return dispatchPass(run, now);
        default:
            return unreachable(job);
    }
}

/** A job's run, as one session: its state commits, then the job's own effect commit. */
function runJobSession(run: IRunState, job: RunJob, at: SimTime): IRunState {
    const started = startSession(run, at);
    const ran = runJob(started, job, at);
    const stateCommits = toCount(ran.line.commits.size - started.line.commits.size);
    const runState = commitEffect(ran, { kind: EffectKind.Job, at, job, stateCommits });
    return finishSession(runState);
}

/** Runs a step of the script: a command, rules to change, or an indirect effect. */
function performStep(run: IRunState, step: ScriptInput): IRunState {
    if (isRulesInput(step)) {
        return performRulesInput(run, step);
    }
    return isIndirectInput(step) ? performIndirectInput(run, step) : performInput(run, step);
}

/** Runs the next piece of work: a pure step from one state to the next. */
export function runNextWork(run: IRunState): IRunState {
    const { work, at } = nextWork(run);
    switch (work.kind) {
        case WorkKind.Job:
            return runJobSession(run, work.job, at);
        case WorkKind.ScriptedStep:
            return performStep(run, work.step);
        default:
            return unreachable(work);
    }
}
