import { List } from 'immutable';

import type { IScenarioProblem } from '../../application-core/scenarios/scenario';
import { problemAt } from '../../application-core/scenarios/scenario';
import type { IRider } from '../../application-core/simulation-engine/rider';
import {
    DEFAULT_SEND_EVERY,
    DEFAULT_SPEED_KMH,
} from '../../application-core/simulation-engine/rider';
import { toDriverId } from '../../domain/drivers/driver';
import { Duration } from '../../domain/system/time/duration';
import type { Fields, IReading } from './scenario-reader';
import { readClockTime, readList, readText } from './scenario-reader';

const NONE = List<IScenarioProblem>();

/** How often a driver's app sends, if the driver says: a time above none (FND-90). */
function readSendEvery(fields: Fields, path: string): IReading<Duration> {
    if (fields['sendsEvery'] === undefined) {
        return { value: DEFAULT_SEND_EVERY, problems: NONE };
    }
    const time = readClockTime(fields, path, 'sendsEvery');
    if (time.value === null) {
        return { value: null, problems: time.problems };
    }
    return time.value > 0
        ? { value: Duration.ofMilliseconds(time.value), problems: NONE }
        : { value: null, problems: problemAt(`${path}sendsEvery`, 'must be more than none') };
}

/** How fast a driver rides, if the driver says: a number of kilometres an hour above 0. */
function readSpeed(fields: Fields, path: string): IReading<number> {
    const speed = fields['speedKmh'];
    if (speed === undefined) {
        return { value: DEFAULT_SPEED_KMH, problems: NONE };
    }
    return typeof speed === 'number' && Number.isFinite(speed) && speed > 0
        ? { value: speed, problems: NONE }
        : { value: null, problems: problemAt(`${path}speedKmh`, 'must be a number above 0') };
}

/** One driver as the simulator rides them: how often their app sends, and how fast they ride. */
function readRider(fields: Fields, path: string): IReading<IRider> {
    const id = readText(fields, path, 'id');
    const sendEvery = readSendEvery(fields, path);
    const speed = readSpeed(fields, path);
    const problems = sendEvery.problems.concat(speed.problems);
    if (id.value === null || sendEvery.value === null || speed.value === null) {
        return { value: null, problems };
    }
    const driverId = toDriverId(id.value);
    return { value: { driverId, sendEvery: sendEvery.value, speedKmh: speed.value }, problems };
}

/**
 * The scenario's drivers as the simulator rides them: each driver's app sends its location every
 * 30 seconds and they ride at 20 km/h, unless the driver gives `sendsEvery` or `speedKmh`
 * (FND-90). The driver's other fields are read, and their problems told, with the driver.
 */
export function readRiders(value: Fields): {
    readonly riders: List<IRider>;
    readonly problems: List<IScenarioProblem>;
} {
    const list = readList(value, 'drivers');
    const readings = list.entries.map(([fields, path]) => readRider(fields, path));
    return {
        riders: readings.flatMap((reading) => (reading.value === null ? [] : [reading.value])),
        problems: readings.flatMap((reading) => reading.problems),
    };
}
