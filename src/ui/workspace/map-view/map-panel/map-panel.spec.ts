import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ISubjectChoice } from '../../watched-run-store';
import { MapLayer } from '../map-layer';
import type { IMapScene, ISceneRestaurant } from '../map-scene';
import { MapPanel } from './map-panel';

const RESTAURANT: ISceneRestaurant = {
    id: 'restaurant-1',
    areaId: 'area-1',
    at: { east: 500, north: 400 },
    orders: [{ orderId: 'order-1', state: 'Created' }],
    parcels: ['order-1'],
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
        {
            id: 'driver-1',
            areaId: 'area-2',
            at: { east: 1500, north: 400 },
            track: [
                { east: 1400, north: 300 },
                { east: 1500, north: 400 },
            ],
            notified: [],
            accepted: ['order-2'],
            parcels: [],
            ahead: [],
            aheadTo: null,
        },
        {
            id: 'driver-2',
            areaId: 'area-2',
            at: null,
            track: [],
            notified: [],
            accepted: [],
            parcels: [],
            ahead: [],
            aheadTo: null,
        },
    ],
    addresses: [],
};

const BUSY_ORDERS = ['1', '2', '3', '4', '5', '6'].map((n) => ({
    orderId: `order-${n}`,
    state: 'Created',
}));

describe('the Map tab', () => {
    let fixture: ComponentFixture<MapPanel>;
    const chosen: ISubjectChoice[] = [];
    const toggled: MapLayer[] = [];
    const element = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const all = (testId: string): Element[] => [
        ...element().querySelectorAll(`[data-testid="${testId}"]`),
    ];

    beforeEach(() => {
        chosen.length = 0;
        toggled.length = 0;
        fixture = TestBed.createComponent(MapPanel);
        fixture.componentRef.setInput('scene', SCENE);
        fixture.componentInstance.choose.subscribe((choice) => chosen.push(choice));
        fixture.componentInstance.toggleLayer.subscribe((layer) => toggled.push(layer));
        fixture.detectChanges();
    });

    it("draws the areas, a mark for each place and order view, and a driver's track", () => {
        const areas = all('map-area');
        const restaurants = all('map-Restaurant');
        const drivers = all('map-Driver');
        const orders = all('map-RestaurantOrder');
        const accepted = all('map-Accepted');
        const parcels = all('map-Parcel');
        const tracks = all('map-track');

        expect(areas).toHaveLength(2);
        expect([restaurants.length, drivers.length]).toEqual([1, 1]);
        expect([orders.length, accepted.length, parcels.length]).toEqual([1, 1, 1]);
        expect(tracks).toHaveLength(1);
    });

    it('draws the main roads apart from the local streets', () => {
        const [main] = all('map-streets-main');
        const [local] = all('map-streets-local');

        const mainPath = main!.getAttribute('d');
        const localPath = local!.getAttribute('d');
        expect(mainPath).toBe('M0 1300L1300 1300');
        expect(localPath).toBe('M0 1100L200 1100');
    });

    it("draws each area's waiting point as a ring on its crossing", () => {
        const [point] = all('map-waiting-point');

        const place = [point!.getAttribute('cx'), point!.getAttribute('cy')];
        expect(place).toEqual(['600', '700']);
    });

    it('says which drivers are not on the map, having sent no location', () => {
        const note = element().querySelector('[data-testid="map-unplaced"]');

        expect(note?.textContent).toContain('driver-2');
    });

    it('selects a driver or an order when clicked, and nothing for a restaurant', () => {
        const [driver] = all('map-Driver');
        const [accepted] = all('map-Accepted');
        const [restaurant] = all('map-Restaurant');

        const click = new MouseEvent('click');
        driver!.dispatchEvent(click);
        accepted!.dispatchEvent(click);
        restaurant!.dispatchEvent(click);

        const keys = chosen.map((choice) => choice.key);
        expect(keys).toEqual(['d:driver-1', 'o:order-2']);
    });

    it('marks the order or driver selected', () => {
        fixture.componentRef.setInput('selectedKey', 'd:driver-1');
        fixture.detectChanges();

        const [driver] = all('map-Driver');

        const isMarked = driver!.classList.contains('is-selected');
        const pressed = driver!.getAttribute('aria-pressed');
        expect(isMarked).toBe(true);
        expect(pressed).toBe('true');
    });

    it('asks to show or hide a kind of order view, and shows which are on', () => {
        const onlyParcels = new Set([MapLayer.Parcels]);
        fixture.componentRef.setInput('layers', onlyParcels);
        fixture.detectChanges();
        const [restaurantsSwitch] = all('map-layer-Restaurants');
        const [parcelsSwitch] = all('map-layer-Parcels');

        (restaurantsSwitch as HTMLButtonElement).click();

        const restaurantsOn = restaurantsSwitch!.getAttribute('aria-pressed');
        const parcelsOn = parcelsSwitch!.getAttribute('aria-pressed');
        const orders = all('map-RestaurantOrder');
        expect(toggled).toEqual([MapLayer.Restaurants]);
        expect(restaurantsOn).toBe('false');
        expect(parcelsOn).toBe('true');
        expect(orders).toHaveLength(0);
    });

    it('opens the list behind a badge, and selects an order picked from it', () => {
        const busy = { ...SCENE, restaurants: [{ ...RESTAURANT, orders: BUSY_ORDERS }] };
        fixture.componentRef.setInput('scene', busy);
        fixture.detectChanges();
        const [badge] = all('map-badge');

        const click = new MouseEvent('click');
        badge!.dispatchEvent(click);
        fixture.detectChanges();
        const items = all('map-badge-item');
        (items[5] as HTMLButtonElement).click();
        fixture.detectChanges();

        const keys = chosen.map((choice) => choice.key);
        const lists = all('map-badge-list');
        expect(items).toHaveLength(6);
        expect(keys).toEqual(['o:order-6']);
        expect(lists).toHaveLength(0);
    });

    it('zooms in on a scroll up, and Fit brings the whole city back', () => {
        const map = element().querySelector('[data-testid="map"]')!;
        const fit = element().querySelector<HTMLButtonElement>('[data-testid="map-fit"]')!;
        const fitted = map.getAttribute('viewBox');
        const scrollUp = new WheelEvent('wheel', { deltaY: -100, cancelable: true });

        map.dispatchEvent(scrollUp);
        fixture.detectChanges();
        const zoomed = map.getAttribute('viewBox');
        const canFit = !fit.disabled;
        fit.click();
        fixture.detectChanges();
        const after = map.getAttribute('viewBox');

        expect(fitted).toBe('-150 -150 2900 1600');
        expect(zoomed).toBe('140 10 2320 1280');
        expect(canFit).toBe(true);
        expect(after).toBe(fitted);
        expect(scrollUp.defaultPrevented).toBe(true);
    });

    it('pans with a drag on the map, but not with one that starts on a mark', () => {
        const map = element().querySelector('[data-testid="map"]')!;
        const [driver] = all('map-Driver');
        const start = new MouseEvent('pointerdown', { clientX: 100, clientY: 100 });
        const move = new MouseEvent('pointermove', { clientX: 130, clientY: 90 });
        const end = new MouseEvent('pointerup');
        const onMark = new MouseEvent('pointerdown', {
            clientX: 100,
            clientY: 100,
            bubbles: true,
        });

        map.dispatchEvent(start);
        map.dispatchEvent(move);
        map.dispatchEvent(end);
        fixture.detectChanges();
        const panned = map.getAttribute('viewBox');
        driver!.dispatchEvent(onMark);
        map.dispatchEvent(move);
        fixture.detectChanges();
        const after = map.getAttribute('viewBox');

        expect(panned).toBe('-180 -140 2900 1600');
        expect(after).toBe(panned);
    });

    it('says so when the run has no city to draw', () => {
        fixture.componentRef.setInput('scene', null);
        fixture.detectChanges();

        const empty = element().querySelector('[data-testid="map-empty"]');

        expect(empty?.textContent).toContain('no city');
    });
});
