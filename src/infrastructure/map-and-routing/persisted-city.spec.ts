import { List, OrderedMap } from 'immutable';
import { describe, expect, it } from 'vitest';

import { toAreaId } from '../../domain/map-and-routing/area-id';
import { City } from '../../domain/map-and-routing/city';
import { Coordinates } from '../../domain/map-and-routing/coordinates';
import {
    toCitySeed,
    toDegrees,
    toKilometres,
    toMetres,
} from '../../domain/map-and-routing/numbers';
import { toCount } from '../../domain/system/math/math';
import { fromPersistedCity, toPersistedCity } from './persisted-city';

const CORNER = Coordinates.create({ latitude: toDegrees(10.325), longitude: toDegrees(20.815) });
const NORTH = toAreaId('north');
const AREAS = List.of(NORTH);

const CITY = City.create({
    origin: CORNER,
    widthKm: toKilometres(1),
    heightKm: toKilometres(1),
    across: toCount(1),
    down: toCount(1),
    seed: toCitySeed(11),
    blockMetres: toMetres(250),
    areaIds: AREAS,
    waitingPoints: OrderedMap(),
});

describe('a persisted city', () => {
    it('keeps its seed and how far apart its streets are', () => {
        const persisted = toPersistedCity(CITY);

        const loaded = fromPersistedCity(persisted);

        expect(persisted).toMatchObject({ seed: 11, blockMetres: 250 });
        expect(loaded).toEqual(CITY);
    });

    it('gets seed 0 and 200-metre blocks when stored before streets', () => {
        const persisted = toPersistedCity(CITY);
        const fields = Object.entries(persisted).filter(
            ([key]) => key !== 'seed' && key !== 'blockMetres',
        );
        const older = Object.fromEntries(fields) as typeof persisted;

        const loaded = fromPersistedCity(older);

        expect(loaded).toMatchObject({ seed: 0, blockMetres: 200 });
    });

    it('keeps the waiting points it sets, and leaves them out when it sets none', () => {
        const point = Coordinates.create({
            latitude: toDegrees(10.328),
            longitude: toDegrees(20.818),
        });
        const points = OrderedMap([[NORTH, point]]);
        const placed = CITY.withWaitingPoints(points);

        const persisted = toPersistedCity(placed);
        const loaded = fromPersistedCity(persisted);

        expect(loaded).toEqual(placed);
        const plain = toPersistedCity(CITY);
        expect(plain).not.toHaveProperty('waitingPoints');
    });
});
