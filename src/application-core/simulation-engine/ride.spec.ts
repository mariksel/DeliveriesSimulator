import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { City } from '../../domain/map-and-routing/city';
import { Coordinates } from '../../domain/map-and-routing/coordinates';
import { fromPlane, toPlane } from '../../domain/map-and-routing/local-plane';
import {
    toCitySeed,
    toDegrees,
    toKilometres,
    toMetres,
} from '../../domain/map-and-routing/numbers';
import { DEFAULT_BLOCK_METRES } from '../../domain/map-and-routing/city';
import { toOrderId } from '../../domain/orders/order';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { toCount } from '../../domain/system/math/math';
import { toInputActor } from './input-names';
import type { IDriverSetsOff } from './ride';
import { arrivalAt, positionOnRide, RideKind } from './ride';

const ORIGIN = Coordinates.create({ latitude: toDegrees(10.3), longitude: toDegrees(20.8) });
const CITY = City.createNew({
    origin: ORIGIN,
    widthKm: toKilometres(2),
    heightKm: toKilometres(2),
    across: toCount(1),
    down: toCount(1),
    seed: toCitySeed(1),
    blockMetres: DEFAULT_BLOCK_METRES,
});

function at(east: number, north: number): Coordinates {
    const point = { eastMetres: toMetres(east), northMetres: toMetres(north) };
    return fromPlane(ORIGIN, point);
}

const START = at(0, 0);
const CORNER = at(360, 0);
const STOP = at(360, 360);

/** 360 m east, then 360 m north, at 36 km/h: 10 m a second, so 72 seconds in all. */
const LEG: IDriverSetsOff = {
    kind: RideKind.SetsOff,
    actor: toInputActor('driver-1'),
    stopOrder: toOrderId('order-1'),
    isPickUp: true,
    path: List.of(START, CORNER, STOP),
    metres: 720,
    speedKmh: 36,
    label: null,
};

const SET_OFF = toSimTime(10_000);

/** Where the leg has a driver at each time, in metres from the origin, rounded to the metre. */
function placesAt(...times: number[]): [number, number][] {
    return times.map((ms) => {
        const time = toSimTime(ms);
        const point = positionOnRide(CITY, SET_OFF, LEG, time);
        const { eastMetres, northMetres } = toPlane(ORIGIN, point);
        return [Math.round(eastMetres), Math.round(northMetres)];
    });
}

describe('a ride along the streets', () => {
    it('arrives once its length is ridden at its speed, to the next whole millisecond', () => {
        const arrival = arrivalAt(SET_OFF, LEG);

        expect(arrival.milliseconds).toBe(82_000);
    });

    it('has the driver where they set off before they start, and along each street after', () => {
        const places = placesAt(5_000, 10_000, 28_000, 46_000, 64_000);

        expect(places).toEqual([
            [0, 0],
            [0, 0],
            [180, 0],
            [360, 0],
            [360, 180],
        ]);
    });

    it('keeps the driver at the stop once they have arrived', () => {
        const places = placesAt(82_000, 500_000);

        expect(places).toEqual([
            [360, 360],
            [360, 360],
        ]);
    });
});
