import type { List } from 'immutable';

import { LogSource, TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import type { ISentLocation } from '../../domain/drivers/deliveries/sent-location';
import type { DriverId } from '../../domain/drivers/driver';
import type { Coordinates } from '../../domain/map-and-routing/coordinates';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import { required } from '../../domain/system/validation/required';
import type { IAppSend } from './direct-effect';
import { EffectKind } from './direct-effect';
import { functionInUse } from './function-lookup';
import { FunctionName } from './function-name';
import { InputCommand } from './input-command';
import { toInputActor } from './input-names';
import { withDrivers, withDeliveries } from './main-root';
import { readsOfWork } from './effect-reads';
import type { RecordRef } from './record-ref';
import { RecordKind } from './record-ref';
import { NO_CAUSE, lastSequence, writeEntry } from './run-log';
import type { RunLogRecord } from './run-log-entry';
import type { IRunState } from './run-state';
import { commitEffect, commitTo, finishSession, startSession, withLog } from './run-state';
import { sessionMaker } from './session-maker';
import { callState } from './state-call';
import { writeDeliveriesReports } from './run-log';
import { riderPosition } from './riding';

/** Where a driver's app says they are when it sends: where their ride has them (FND-90). */
function whereTheyAre(run: IRunState, driverId: DriverId, at: SimTime): Coordinates {
    const position = riderPosition(run, driverId, at);
    // A send is due only for a driver with a location.
    return required(position ?? undefined, `a location for ${driverId}`);
}

/**
 * Every driver's app due at one moment sending its location, as it does every interval while
 * they are online: one command is logged listing each send, Deliveries keeps each location as
 * that driver's latest, and the call ends in one input commit about no order, which no step gave
 * (FND-90).
 */
export function performLocationSends(
    run: IRunState,
    driverIds: List<DriverId>,
    at: SimTime,
): IRunState {
    const started = startSession(run, at);
    const sent = driverIds.map((driverId): ISentLocation => ({
        driverId,
        coordinates: whereTheyAre(started, driverId, at),
    }));
    const sends = sent.map((send): IAppSend => ({
        actor: toInputActor(send.driverId),
        location: send.coordinates,
    }));
    const points = sends
        .map((send) => ({
            actor: send.actor,
            latitude: send.location.latitude,
            longitude: send.location.longitude,
        }))
        .toArray();
    const record: RunLogRecord = {
        source: LogSource.Actors,
        kind: TechnicalLogKind.CommandIssued,
        data: { actor: null, name: InputCommand.SendLocations, data: { sends: points } },
    };
    const issued = writeEntry(started.cache.log, at, record, undefined, NO_CAUSE);
    const cause = { current: lastSequence(issued), isReadingInbox: false };
    const withIssued = withLog(started, issued);
    const receiveLocations = functionInUse(withIssued, FunctionName.DeliveriesReceiveLocations);
    const madeBy = sessionMaker(withIssued.line);
    const called = callState(
        receiveLocations,
        withIssued.root.state.deliveries,
        withIssued.root.state.drivers,
        at,
        sent,
        madeBy,
    );
    const step = called.result;
    const withNewDrivers = withDrivers(withIssued.root, step.drivers);
    const root = withDeliveries(withNewDrivers, step.state);
    const log = writeDeliveriesReports(withIssued.cache.log, step.reports, cause);
    const logged = withLog(withIssued, log);
    const received = commitTo(logged, root, called.call, step.made);
    // Each send is about its driver's location, which has versions of its own (FND-81).
    const named = driverIds
        .map((id): RecordRef => ({ kind: RecordKind.DriverLocation, id }))
        .toArray();
    const reads = readsOfWork(received, started, named);
    const committed = commitEffect(received, {
        kind: EffectKind.Input,
        at,
        command: InputCommand.SendLocations,
        sends,
        response: { isOk: true, orderId: null },
        followsFrom: null,
        reads,
    });
    return finishSession(committed);
}
