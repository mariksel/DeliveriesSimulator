import { describe, expect, it } from 'vitest';

import { MarkKind, mapDrawing } from './map-drawing';
import { ALL_LAYERS, MapLayer } from './map-layer';
import type { IMapScene, ISceneAddress, ISceneDriver, ISceneRestaurant } from './map-scene';

const RESTAURANT: ISceneRestaurant = {
    id: 'restaurant-1',
    areaId: 'area-1',
    at: { east: 500, north: 400 },
    orders: [
        { orderId: 'order-1', state: 'Created' },
        { orderId: 'order-2', state: 'Delivery requested, ready' },
    ],
    parcels: ['order-1', 'order-2'],
};

const DRIVER: ISceneDriver = {
    id: 'driver-1',
    areaId: 'area-2',
    at: { east: 1500, north: 400 },
    track: [
        { east: 1400, north: 300 },
        { east: 1500, north: 400 },
    ],
    notified: ['order-3'],
    accepted: ['order-4'],
    parcels: ['order-4'],
    ahead: [
        { east: 1500, north: 400 },
        { east: 1500, north: 800 },
    ],
    aheadTo: "order-4's address",
};

const SCENE: IMapScene = {
    widthMetres: 2600,
    heightMetres: 1300,
    areas: [
        { id: 'area-1', corner: { east: 0, north: 0 }, sideMetres: 1300 },
        { id: 'area-2', corner: { east: 1300, north: 0 }, sideMetres: 1300 },
    ],
    waitingPoints: [{ areaId: 'area-1', at: { east: 600, north: 600 } }],
    streets: [
        { from: { east: 0, north: 0 }, to: { east: 1300, north: 0 }, isMain: true },
        { from: { east: 0, north: 200 }, to: { east: 200, north: 200 }, isMain: false },
    ],
    restaurants: [RESTAURANT],
    drivers: [
        DRIVER,
        { ...DRIVER, id: 'driver-2', at: null, track: [], ahead: [], aheadTo: null },
    ],
    addresses: [],
};

const ADDRESS: ISceneAddress = {
    id: 'address-1',
    customerId: 'customer-1',
    areaId: 'area-1',
    at: { east: 800, north: 100 },
    pending: ['order-1', 'order-2'],
    delivered: ['order-5'],
};

const WITH_ADDRESS: IMapScene = { ...SCENE, addresses: [ADDRESS] };

const kindsOf = (marks: readonly { readonly kind: string }[]): readonly string[] =>
    marks.map((mark) => mark.kind);

describe('what the Map tab draws', () => {
    it('lays the areas out with north up, in metres, with room around the city', () => {
        const drawing = mapDrawing(SCENE, ALL_LAYERS, null);

        expect(drawing.areas).toEqual([
            { id: 'area-1', x: 0, y: 0, side: 1300 },
            { id: 'area-2', x: 1300, y: 0, side: 1300 },
        ]);
        expect(drawing.unit).toBeCloseTo(100, 9);
        expect(drawing.viewBox).toBe('-150 -150 2900 1600');
    });

    it("draws each area's waiting point with north up, saying what it is", () => {
        const drawing = mapDrawing(SCENE, ALL_LAYERS, null);

        expect(drawing.waitingPoints).toEqual([
            {
                key: 'area-1',
                x: 600,
                y: 700,
                tooltip: 'Waiting point of area-1, where its drivers wait with nothing to do',
            },
        ]);
    });

    it('grows its marks as the map zooms in, to at most twice their size on screen', () => {
        const slightly = { x: 0, y: 0, width: 1450, height: 800 };
        const closely = { x: 0, y: 0, width: 290, height: 160 };

        const twice = mapDrawing(SCENE, ALL_LAYERS, null, slightly);
        const tenTimes = mapDrawing(SCENE, ALL_LAYERS, null, closely);

        expect(twice.viewBox).toBe('0 0 1450 800');
        expect(twice.unit * (2900 / 1450)).toBeCloseTo(100 * Math.SQRT2, 9);
        expect(tenTimes.unit * (2900 / 290)).toBeCloseTo(200, 9);
        expect(tenTimes.fitted).toEqual({ x: -150, y: -150, width: 2900, height: 1600 });
    });

    it('draws each order view as its own mark, above or below its place', () => {
        const drawing = mapDrawing(SCENE, ALL_LAYERS, null);

        const kinds = kindsOf(drawing.marks);
        expect(kinds).toEqual([
            MarkKind.Restaurant,
            MarkKind.RestaurantOrder,
            MarkKind.RestaurantOrder,
            MarkKind.Parcel,
            MarkKind.Parcel,
            MarkKind.Driver,
            MarkKind.Notified,
            MarkKind.Accepted,
            MarkKind.Parcel,
        ]);
        const [restaurant, created] = drawing.marks;
        expect(restaurant).toMatchObject({ x: 500, y: 900, choice: null });
        expect(created!.y).toBeLessThan(restaurant!.y);
        expect(created!.tooltip).toBe('order-1 at restaurant-1: Created');
    });

    it('says what each of a driver’s marks stands for', () => {
        const drawing = mapDrawing(SCENE, ALL_LAYERS, null);

        const tooltips = drawing.marks.slice(5).map((mark) => mark.tooltip);
        expect(tooltips).toEqual([
            'Driver driver-1, in area-2, at the last location they sent',
            "driver-1 was notified of order-3's request, and has not answered",
            "driver-1 accepted order-4's request",
            'order-4 is physically with driver-1',
        ]);
    });

    it('leaves out the kinds of view whose switch is off', () => {
        const shown = new Set([MapLayer.Parcels]);

        const drawing = mapDrawing(SCENE, shown, null);

        const kinds = kindsOf(drawing.marks);
        expect(kinds).toEqual([
            MarkKind.Restaurant,
            MarkKind.Parcel,
            MarkKind.Parcel,
            MarkKind.Driver,
            MarkKind.Parcel,
        ]);
    });

    it('draws more than five of a kind at a place as one badge, which lists them', () => {
        const orders = ['1', '2', '3', '4', '5', '6'].map((n) => ({
            orderId: `order-${n}`,
            state: 'Created',
        }));
        const busy = { ...SCENE, restaurants: [{ ...RESTAURANT, orders }] };

        const drawing = mapDrawing(busy, ALL_LAYERS, null);

        const [badge] = drawing.badges;
        expect(badge).toMatchObject({ kind: MarkKind.RestaurantOrder, count: 6 });
        expect(badge!.tooltip).toBe('6 orders: click to list them');
        expect(badge!.items[5]).toMatchObject({
            id: 'order-6',
            label: 'order-6 at restaurant-1: Created',
            choice: { key: 'o:order-6' },
        });
    });

    it('marks the order or driver selected, wherever it shows', () => {
        const drawing = mapDrawing(SCENE, ALL_LAYERS, 'o:order-4');
        const driverSelected = mapDrawing(SCENE, ALL_LAYERS, 'd:driver-1');

        const selected = drawing.marks.filter((mark) => mark.isSelected).map((mark) => mark.kind);
        expect(selected).toEqual([MarkKind.Accepted, MarkKind.Parcel]);
        const driver = driverSelected.marks.find((mark) => mark.kind === MarkKind.Driver);
        expect(driver).toMatchObject({ isSelected: true, choice: { key: 'd:driver-1' } });
    });

    it('fades everything not part of the selection, but keeps the places it shows at clear', () => {
        const drawing = mapDrawing(SCENE, ALL_LAYERS, 'o:order-4');

        const clear = drawing.marks.filter((mark) => !mark.isDimmed).map((mark) => mark.key);
        expect(clear).toEqual([
            'd:driver-1',
            'd:driver-1:Accepted:order-4',
            'd:driver-1:Parcel:order-4',
        ]);
        expect(drawing.tracks[0]!.isDimmed).toBe(true);
    });

    it('fades nothing while nothing is selected, or what is selected is not on the map', () => {
        const nothing = mapDrawing(SCENE, ALL_LAYERS, null);
        const elsewhere = mapDrawing(SCENE, ALL_LAYERS, 'o:order-99');

        const dimmed = [...nothing.marks, ...elsewhere.marks].filter((mark) => mark.isDimmed);
        expect(dimmed).toEqual([]);
    });

    it('draws the streets as two paths, main roads and local ones, with north up', () => {
        const drawing = mapDrawing(SCENE, ALL_LAYERS, null);

        expect(drawing.streets).toEqual({ main: 'M0 1300L1300 1300', local: 'M0 1100L200 1100' });
    });

    it("draws a driver's track, and lists the drivers that have sent no location", () => {
        const drawing = mapDrawing(SCENE, ALL_LAYERS, null);

        expect(drawing.tracks).toEqual([
            { key: 'driver-1', points: '1400,1000 1500,900', isDimmed: false },
        ]);
        expect(drawing.unplaced).toEqual(['driver-2']);
    });

    it('pins each order on its way at its address, and the delivered ones faint below', () => {
        const drawing = mapDrawing(WITH_ADDRESS, ALL_LAYERS, null);

        const atAddress = drawing.marks.filter((mark) => mark.key.startsWith('a:'));
        const placed = atAddress.map((mark) => [mark.kind, mark.x, mark.y, mark.tooltip]);
        expect(placed).toEqual([
            [MarkKind.Pin, 800 - 27.5, 1200, "order-1 goes to address-1, customer-1's address"],
            [MarkKind.Pin, 800 + 27.5, 1200, "order-2 goes to address-1, customer-1's address"],
            [
                MarkKind.Delivered,
                800,
                1275,
                "order-5 was delivered to address-1, customer-1's address",
            ],
        ]);
        const first = drawing.marks[0];
        expect(first?.key).toBe('a:address-1:Pin:order-1');
    });

    it("hides the pins with the restaurants' views, and the delivered ones with their switch", () => {
        const noRestaurants = new Set([MapLayer.Drivers, MapLayer.Parcels, MapLayer.Delivered]);
        const noDelivered = new Set([MapLayer.Restaurants, MapLayer.Drivers, MapLayer.Parcels]);

        const withoutPins = mapDrawing(WITH_ADDRESS, noRestaurants, null);
        const withoutDelivered = mapDrawing(WITH_ADDRESS, noDelivered, null);

        const pins = withoutPins.marks.filter((mark) => mark.kind === MarkKind.Pin);
        const delivered = withoutDelivered.marks.filter(
            (mark) => mark.kind === MarkKind.Delivered,
        );
        expect(pins).toEqual([]);
        expect(delivered).toEqual([]);
    });

    it("keeps the selected order's pin clear, and fades the rest", () => {
        const drawing = mapDrawing(WITH_ADDRESS, ALL_LAYERS, 'o:order-2');

        const pins = drawing.marks.filter((mark) => mark.kind === MarkKind.Pin);
        const states = pins.map((pin) => [pin.key, pin.isSelected, pin.isDimmed]);
        expect(states).toEqual([
            ['a:address-1:Pin:order-1', false, true],
            ['a:address-1:Pin:order-2', true, false],
        ]);
    });

    it("draws each driver's route still to go with the drivers' views, and hides it with them", () => {
        const shown = mapDrawing(SCENE, ALL_LAYERS, null);
        const noDrivers = new Set([MapLayer.Restaurants, MapLayer.Parcels, MapLayer.Delivered]);
        const hidden = mapDrawing(SCENE, noDrivers, null);

        expect(shown.routes).toEqual([
            {
                key: 'driver-1',
                points: '1500,900 1500,500',
                tooltip: "driver-1's route still to go, to order-4's address",
                isDimmed: false,
            },
        ]);
        expect(hidden.routes).toEqual([]);
    });
});
