import { DEFAULT_BLOCK_METRES } from '../../../domain/map-and-routing/city';
import { toCitySeed } from '../../../domain/map-and-routing/numbers';
import { OrderedMap } from 'immutable';
import { describe, expect, it } from 'vitest';
import type { IRunState } from '../../../application-core/simulation-engine/run-state';
import { latestRides } from '../../../application-core/simulation-engine/riding';
import { List } from 'immutable';
import {
    DEFAULT_SEND_EVERY,
    DEFAULT_SPEED_KMH,
} from '../../../application-core/simulation-engine/rider';

import type { IShownWorld } from '../../../application/verification/watched-run';
import {
    oneOrderRunTo,
    START,
} from '../../../application/simulation-engine/one-order-run.testing';
import { DriverLocation, toDriverId } from '../../../domain/drivers/driver';
import { DriverLocationVersion } from '../../../domain/drivers/driver-location';
import { City } from '../../../domain/map-and-routing/city';
import { Coordinates } from '../../../domain/map-and-routing/coordinates';
import { toDegrees, toKilometres } from '../../../domain/map-and-routing/numbers';
import { toSimTime } from '../../../domain/simulation-engine/sim-time';
import { toCount } from '../../../domain/system/math/math';
import { Maker } from '../../../domain/system/records/maker';
import { toVersionNumber } from '../../../domain/system/records/version-chain';
import { markGroup, MOST_MARKS } from './map-marks';
import { mapScene, streetsOf, trackOf } from './map-scene';

const at = (latitude: number, longitude: number): Coordinates =>
    Coordinates.create({ latitude: toDegrees(latitude), longitude: toDegrees(longitude) });

/** Four 1 km areas, with the one-order run's restaurant and driver in area-1. */
const CITY = City.createNew({
    origin: at(10.325, 20.815),
    widthKm: toKilometres(2),
    heightKm: toKilometres(2),
    across: toCount(2),
    down: toCount(2),
    seed: toCitySeed(7),
    blockMetres: DEFAULT_BLOCK_METRES,
});

/** A run's world at its latest commit, as the Map view gets it. */
function worldOf(run: IRunState, atMs: number): IShownWorld {
    const rides = latestRides(run.root.effects.indirect.records);
    const at = toSimTime(atMs);
    return { script: run.script, state: run.root.state, at, rides };
}

/** The one-order run's world, run to a time, in the city above. */
function worldAt(atMs: number): IShownWorld {
    const run = oneOrderRunTo(atMs, { ...START, city: CITY });
    return worldOf(run, atMs);
}

/** The scene at a time, which a run with a city always has. */
function sceneAt(atMs: number): NonNullable<ReturnType<typeof mapScene>> {
    const world = worldAt(atMs);
    const streets = world.script.city === null ? [] : streetsOf(world.script.city);
    return mapScene(world, streets)!;
}

describe('what the map shows', () => {
    it("draws the city's four areas, row by row from its south-west corner", () => {
        const scene = sceneAt(0);

        expect(scene).toMatchObject({ widthMetres: 2000, heightMetres: 2000 });
        expect(scene.areas).toEqual([
            { id: 'area-1', corner: { east: 0, north: 0 }, sideMetres: 1000 },
            { id: 'area-2', corner: { east: 1000, north: 0 }, sideMetres: 1000 },
            { id: 'area-3', corner: { east: 0, north: 1000 }, sideMetres: 1000 },
            { id: 'area-4', corner: { east: 1000, north: 1000 }, sideMetres: 1000 },
        ]);
    });

    it("puts each area's waiting point on the crossing nearest its centre", () => {
        const scene = sceneAt(0);

        const points = scene.waitingPoints.map((point) => [
            point.areaId,
            Math.round(point.at.east),
            Math.round(point.at.north),
        ]);
        expect(points).toEqual([
            ['area-1', 400, 400],
            ['area-2', 1400, 400],
            ['area-3', 400, 1400],
            ['area-4', 1400, 1400],
        ]);
    });

    it("works the city's streets out from its seed, the same each time, main roads on area edges", () => {
        const scene = sceneAt(0);
        const again = sceneAt(0);

        const main = scene.streets.filter((street) => street.isMain);
        const isOnEdges = main.every(
            (street) => street.from.east % 1000 === 0 || street.from.north % 1000 === 0,
        );
        expect(main).toHaveLength(60);
        expect(scene.streets.length).toBeGreaterThan(main.length);
        expect(scene.streets.length).toBeLessThan(220);
        expect(isOnEdges).toBe(true);
        expect(again.streets).toEqual(scene.streets);
    });

    it('puts the restaurant and the driver where they are, in metres from the corner', () => {
        const scene = sceneAt(0);

        const [restaurant] = scene.restaurants;
        const [driver] = scene.drivers;
        expect(restaurant!.at.east).toBeCloseTo(547, 0);
        expect(restaurant!.at.north).toBeCloseTo(556, 0);
        expect(driver!.at).toEqual(restaurant!.at);
        expect(driver!.track).toEqual([restaurant!.at]);
    });

    it('shows a created order in its restaurant’s view, with its parcel at the restaurant', () => {
        const scene = sceneAt(1500);

        const [restaurant] = scene.restaurants;
        const [driver] = scene.drivers;
        expect(restaurant).toMatchObject({
            orders: [{ orderId: 'order-1', state: 'Created' }],
            parcels: ['order-1'],
        });
        expect(driver).toMatchObject({ notified: [], accepted: [], parcels: [] });
    });

    it('shows the request the driver was notified of, while the order is ready at the restaurant', () => {
        const scene = sceneAt(41_000);

        const [restaurant] = scene.restaurants;
        const [driver] = scene.drivers;
        expect(restaurant!.orders[0]!.state).toBe('Delivery requested, ready');
        expect(driver).toMatchObject({ notified: ['order-1'], accepted: [], parcels: [] });
        expect(restaurant!.parcels).toEqual(['order-1']);
    });

    it('shows the request the driver accepted, with the parcel still at the restaurant', () => {
        const scene = sceneAt(61_000);

        const [restaurant] = scene.restaurants;
        const [driver] = scene.drivers;
        expect(driver).toMatchObject({ notified: [], accepted: ['order-1'], parcels: [] });
        expect(restaurant!.parcels).toEqual(['order-1']);
    });

    it('moves the parcel to the driver once they report picking it up', () => {
        const scene = sceneAt(121_000);

        const [restaurant] = scene.restaurants;
        const [driver] = scene.drivers;
        expect(driver).toMatchObject({ accepted: ['order-1'], parcels: ['order-1'] });
        expect(restaurant!.parcels).toEqual([]);
        expect(restaurant!.orders[0]!.state).toBe('Picked up');
    });

    it("takes the parcel off the map once delivered, and the order from the restaurant's view once Orders holds it delivered", () => {
        const delivered = sceneAt(240_001);
        const later = sceneAt(300_000);

        const [driver] = delivered.drivers;
        expect(driver).toMatchObject({ accepted: [], parcels: [] });
        expect(delivered.restaurants[0]!.parcels).toEqual([]);
        expect(later.restaurants[0]!.orders).toEqual([]);
    });

    it("pins the order at its customer's address while on its way, and keeps it there delivered", () => {
        const before = sceneAt(0);
        const onItsWay = sceneAt(130_000);
        const delivered = sceneAt(300_000);

        expect(before.addresses).toEqual([]);
        expect(onItsWay.addresses).toHaveLength(1);
        expect(onItsWay.addresses[0]).toMatchObject({
            id: 'address-1',
            customerId: 'customer-1',
            areaId: 'area-1',
            pending: ['order-1'],
            delivered: [],
        });
        expect(delivered.addresses[0]).toMatchObject({ pending: [], delivered: ['order-1'] });
        const { east, north } = delivered.addresses[0]!.at;
        expect(east).toBeCloseTo(822, -1);
        expect(north).toBeCloseTo(277, -1);
    });

    it("draws a riding driver's route still to go, to the restaurant, and none once there", () => {
        const rider = {
            driverId: toDriverId('driver-1'),
            sendEvery: DEFAULT_SEND_EVERY,
            speedKmh: DEFAULT_SPEED_KMH,
        };
        const start = { ...START, city: CITY, riders: List.of(rider) };
        const riding = oneOrderRunTo(65_000, start);
        const arrived = oneOrderRunTo(110_000, start);
        const ridingWorld = worldOf(riding, 65_000);
        const arrivedWorld = worldOf(arrived, 110_000);
        const streets = streetsOf(CITY);

        const onTheWay = mapScene(ridingWorld, streets)!.drivers[0]!;
        const there = mapScene(arrivedWorld, streets)!.drivers[0]!;

        expect(onTheWay.ahead.length).toBeGreaterThan(1);
        expect(onTheWay.aheadTo).toBe("order-1's restaurant");
        const restaurant = mapScene(ridingWorld, streets)!.restaurants[0]!.at;
        const end = onTheWay.ahead.at(-1)!;
        expect(end.east).toBeCloseTo(restaurant.east, 6);
        expect(end.north).toBeCloseTo(restaurant.north, 6);
        expect(there).toMatchObject({ ahead: [], aheadTo: null });
    });

    it("draws the route to the area's waiting point once the driver has delivered", () => {
        const rider = {
            driverId: toDriverId('driver-1'),
            sendEvery: DEFAULT_SEND_EVERY,
            speedKmh: DEFAULT_SPEED_KMH,
        };
        const start = { ...START, city: CITY, riders: List.of(rider) };
        const run = oneOrderRunTo(270_000, start);
        const world = worldOf(run, 270_000);
        const streets = streetsOf(CITY);

        const driver = mapScene(world, streets)!.drivers[0]!;

        expect(driver.aheadTo).toBe('the waiting point of area-1');
        const end = driver.ahead.at(-1)!;
        const place = [Math.round(end.east), Math.round(end.north)];
        expect(place).toEqual([400, 400]);
    });

    it('has nothing for a run with no city', () => {
        const shown = worldAt(0);
        const world = { ...shown, script: { ...shown.script, city: null } };

        const scene = mapScene(world, []);

        expect(scene).toBeNull();
    });
});

describe("a driver's track", () => {
    const first = at(10.33, 20.82);
    const second = at(10.331, 20.82);
    const location = (coordinates: Coordinates): DriverLocation =>
        DriverLocation.create({ coordinates, deviceTime: toSimTime(0) });

    it('is every location they sent, oldest first, leaving out a version that kept its place', () => {
        const driverId = toDriverId('driver-1');
        const madeBy = Maker.runStart();
        const firstPlace = location(first);
        const secondPlace = location(second);
        const made = DriverLocationVersion.createNew(driverId, firstPlace, madeBy);
        const kept = DriverLocationVersion.create({
            driverId,
            coordinates: first,
            deviceTime: toSimTime(0),
            number: toVersionNumber(2),
            previous: made,
            madeBy,
        });
        const moved = kept.moved(secondPlace, madeBy);

        const track = trackOf(moved);

        expect(track).toEqual([first, second]);
    });

    it('is empty before their device has said where they are', () => {
        const track = trackOf(undefined);

        expect(track).toEqual([]);
    });
});

describe('the marks of one kind at a place', () => {
    it('are drawn one by one up to five', () => {
        const ids = ['A', 'B', 'C', 'D', 'E'];

        const group = markGroup(ids);

        expect(group).toEqual({ marks: ids, badge: null, all: ids });
    });

    it('become one badge with their count past five, which lists them all', () => {
        const ids = ['A', 'B', 'C', 'D', 'E', 'F'];

        const group = markGroup(ids);

        expect(MOST_MARKS).toBe(5);
        expect(group).toEqual({ marks: [], badge: 6, all: ids });
    });
});

describe('restaurants with no orders', () => {
    it('are drawn with nothing at them', () => {
        const world = worldAt(0);
        const restaurants = OrderedMap(world.script.restaurants);

        const scene = mapScene({ ...world, script: { ...world.script, restaurants } }, []);

        expect(scene!.restaurants[0]).toMatchObject({ orders: [], parcels: [] });
    });
});
