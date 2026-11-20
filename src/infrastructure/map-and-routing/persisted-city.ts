import { List, OrderedMap } from 'immutable';

import type { AreaId } from '../../domain/map-and-routing/area-id';
import { toAreaId } from '../../domain/map-and-routing/area-id';
import { City, DEFAULT_BLOCK_METRES } from '../../domain/map-and-routing/city';
import type { Coordinates } from '../../domain/map-and-routing/coordinates';
import { toCitySeed, toKilometres, toMetres } from '../../domain/map-and-routing/numbers';
import { toCount } from '../../domain/system/math/math';
import type { IPersistedCoordinates } from './persisted-coordinates';
import { fromPersistedCoordinates, toPersistedCoordinates } from './persisted-coordinates';

/** A waiting point a scenario set, persisted, with the area it is for. */
export interface IPersistedWaitingPoint {
    readonly areaId: string;
    readonly location: IPersistedCoordinates;
}

/** A simple city, persisted: its corner, size, grid, area names, and waiting points (FND-90). */
export interface IPersistedCity {
    readonly origin: IPersistedCoordinates;
    readonly widthKm: number;
    readonly heightKm: number;
    readonly across: number;
    readonly down: number;
    /** Absent for a city stored before streets: such a city's seed is 0 (FND-90). */
    readonly seed?: number;
    /** Absent for a city stored before streets: its blocks are 200 metres. */
    readonly blockMetres?: number;
    readonly areaIds: readonly string[];
    /** Absent for a city stored before waiting points, or that sets none. */
    readonly waitingPoints?: readonly IPersistedWaitingPoint[];
}

/** A city's set waiting points, persisted, in the order they were set. */
const toPersistedWaitingPoints = (city: City): readonly IPersistedWaitingPoint[] =>
    city.waitingPoints
        .entrySeq()
        .map(([areaId, point]) => ({ areaId, location: toPersistedCoordinates(point) }))
        .toArray();

/** A simple city, persisted, leaving waiting points out when it sets none. */
export function toPersistedCity(city: City): IPersistedCity {
    const origin = toPersistedCoordinates(city.origin);
    const persisted: IPersistedCity = {
        origin,
        widthKm: city.widthKm,
        heightKm: city.heightKm,
        across: city.across,
        down: city.down,
        seed: city.seed,
        blockMetres: city.blockMetres,
        areaIds: city.areaIds.toArray(),
    };
    const waitingPoints = toPersistedWaitingPoints(city);
    return waitingPoints.length === 0 ? persisted : { ...persisted, waitingPoints };
}

/** A city's set waiting points, from their persisted form. */
function fromPersistedWaitingPoints(persisted: IPersistedCity): OrderedMap<AreaId, Coordinates> {
    const points = (persisted.waitingPoints ?? []).map((point): [AreaId, Coordinates] => [
        toAreaId(point.areaId),
        fromPersistedCoordinates(point.location),
    ]);
    return OrderedMap(points);
}

/** A simple city, from its persisted form. */
export function fromPersistedCity(persisted: IPersistedCity): City {
    const origin = fromPersistedCoordinates(persisted.origin);
    const names = persisted.areaIds.map(toAreaId);
    const waitingPoints = fromPersistedWaitingPoints(persisted);
    return City.create({
        origin,
        widthKm: toKilometres(persisted.widthKm),
        heightKm: toKilometres(persisted.heightKm),
        across: toCount(persisted.across),
        down: toCount(persisted.down),
        seed: toCitySeed(persisted.seed ?? 0),
        blockMetres: toMetres(persisted.blockMetres ?? DEFAULT_BLOCK_METRES),
        areaIds: List(names),
        waitingPoints,
    });
}
