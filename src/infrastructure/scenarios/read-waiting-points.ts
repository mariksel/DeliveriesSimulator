import { List, OrderedMap } from 'immutable';

import type { IScenarioProblem } from '../../application-core/scenarios/scenario';
import { problemAt } from '../../application-core/scenarios/scenario';
import type { AreaId } from '../../domain/map-and-routing/area-id';
import { toAreaId } from '../../domain/map-and-routing/area-id';
import type { City } from '../../domain/map-and-routing/city';
import type { Coordinates } from '../../domain/map-and-routing/coordinates';
import type { Fields, IReading } from './scenario-reader';
import { isFields, readCoordinates } from './scenario-reader';

const PATH = 'city.waitingPoints';
const NONE = List<IScenarioProblem>();

/** Waiting points a scenario sets, by the name of their area. */
export type WaitingPoints = OrderedMap<AreaId, Coordinates>;

/**
 * Reads the waiting points a city sets, if any: an object whose keys name areas, each holding a
 * point's `latitude` and `longitude`. None, with no problems, when the city sets none (FND-90).
 */
export function readWaitingPoints(city: Fields): IReading<WaitingPoints> {
    const value = city['waitingPoints'];
    if (value === undefined) {
        return { value: OrderedMap(), problems: NONE };
    }
    if (!isFields(value)) {
        return {
            value: null,
            problems: problemAt(PATH, 'must be an object of points, by area'),
        };
    }
    const readings = Object.keys(value).map((area): [AreaId, IReading<Coordinates>] => [
        toAreaId(area),
        readCoordinates(value, `${PATH}.`, area),
    ]);
    const problems = List(readings).flatMap(([, reading]) => reading.problems);
    if (problems.size > 0) {
        return { value: null, problems };
    }
    const points = readings.flatMap(([area, reading]): [AreaId, Coordinates][] =>
        reading.value === null ? [] : [[area, reading.value]],
    );
    return { value: OrderedMap(points), problems: NONE };
}

/** Why a waiting point cannot be set in a city: its area is not the city's, or it lies outside. */
function problemsOf(city: City, area: AreaId, point: Coordinates): List<IScenarioProblem> {
    if (!city.areaIds.includes(area)) {
        return problemAt(`${PATH}.${area}`, "is not one of the city's areas");
    }
    return city.areaAt(point) === area
        ? NONE
        : problemAt(`${PATH}.${area}`, 'must lie in that area');
}

/** The city with the waiting points its scenario sets, or why one of them cannot be set. */
export function withWaitingPoints(city: City, points: WaitingPoints): IReading<City> {
    const problems = points
        .entrySeq()
        .toList()
        .flatMap(([area, point]) => problemsOf(city, area, point));
    if (problems.size > 0) {
        return { value: null, problems };
    }
    const placed = points.isEmpty() ? city : city.withWaitingPoints(points);
    return { value: placed, problems: NONE };
}
