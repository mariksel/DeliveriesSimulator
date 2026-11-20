import { toDriverId } from '../../../domain/drivers/driver';
import { toOrderId } from '../../../domain/orders/order';
import { NodeKind } from '../../run-history/timeline-grid';
import type { ISubjectChoice } from '../watched-run-store';
import { MapLayer } from './map-layer';
import type { IMarkGroup } from './map-marks';
import { markGroup } from './map-marks';
import type { IViewWindow } from './map-zoom';
import { viewBoxOf } from './map-zoom';
import type {
    IMapScene,
    ISceneAddress,
    IScenePoint,
    ISceneDriver,
    ISceneRestaurant,
    ISceneStreet,
} from './map-scene';

/** What a mark on the map stands for, which decides its shape. */
export const MarkKind = {
    Restaurant: 'Restaurant',
    Driver: 'Driver',
    /** A square: an order as its restaurant's module holds it. */
    RestaurantOrder: 'RestaurantOrder',
    /** A hollow circle: a request the driver was notified of and has not answered. */
    Notified: 'Notified',
    /** A filled circle: a request the driver accepted. */
    Accepted: 'Accepted',
    /** A diamond: where the order physically is. */
    Parcel: 'Parcel',
    /** A house pin: the address an order not yet delivered goes to. */
    Pin: 'Pin',
    /** A faint diamond: an order delivered, at the address it went to. */
    Delivered: 'Delivered',
} as const;

/** One of the values of {@link MarkKind}. */
export type MarkKind = (typeof MarkKind)[keyof typeof MarkKind];

/** An area as drawn: its square, and where its name goes. */
export interface IDrawnArea {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly side: number;
}

/** The streets as drawn: one path for the main roads and one for the local streets (FND-90). */
export interface IDrawnStreets {
    readonly main: string;
    readonly local: string;
}

/** A driver's track as drawn: the points of a line, oldest first. */
export interface IDrawnTrack {
    readonly key: string;
    readonly points: string;
    readonly isDimmed: boolean;
}

/** An area's waiting point, as drawn: a faint ring on its crossing (FND-90). */
export interface IDrawnWaitingPoint {
    readonly key: string;
    readonly x: number;
    readonly y: number;
    readonly tooltip: string;
}

/** A driver's route still to go, as drawn: the points of a line from where they are (FND-90). */
export interface IDrawnRoute {
    readonly key: string;
    readonly points: string;
    readonly tooltip: string;
    readonly isDimmed: boolean;
}

/** One mark: where it is, how big, what its tooltip says, and what clicking it selects. */
export interface IDrawnMark {
    readonly key: string;
    readonly kind: MarkKind;
    readonly x: number;
    readonly y: number;
    readonly size: number;
    readonly tooltip: string;
    /** The order or driver clicking it selects, or null for a restaurant. */
    readonly choice: ISubjectChoice | null;
    readonly isSelected: boolean;
    /** Faded, as something else is selected and this mark is not part of it (FND-90). */
    readonly isDimmed: boolean;
}

/** One of the orders a badge lists, which clicking selects. */
export interface IBadgeItem {
    readonly id: string;
    readonly label: string;
    readonly choice: ISubjectChoice;
}

/** A badge standing for more than five marks of one kind at a place, with their list (FND-90). */
export interface IDrawnBadge {
    readonly key: string;
    readonly kind: MarkKind;
    readonly x: number;
    readonly y: number;
    readonly size: number;
    readonly count: number;
    readonly tooltip: string;
    readonly items: readonly IBadgeItem[];
    readonly isDimmed: boolean;
}

/** Everything the Map tab draws, in SVG units, which are metres, with north up (FND-90). */
export interface IMapDrawing {
    readonly viewBox: string;
    /** The window that shows the whole city, which Fit brings back. */
    readonly fitted: IViewWindow;
    /** The size of a mark, from which every other size follows. */
    readonly unit: number;
    readonly areas: readonly IDrawnArea[];
    readonly streets: IDrawnStreets;
    /** Each area's waiting point, over the streets and under everything else. */
    readonly waitingPoints: readonly IDrawnWaitingPoint[];
    readonly tracks: readonly IDrawnTrack[];
    /** Each driver's route still to go, with the drivers' views. */
    readonly routes: readonly IDrawnRoute[];
    readonly marks: readonly IDrawnMark[];
    readonly badges: readonly IDrawnBadge[];
    /** The drivers that have sent no location yet, so are not on the map. */
    readonly unplaced: readonly string[];
}

/**
 * How many icons fit across the whole city's longer side, which sets an icon's size: about 28
 * pixels where the city fills a map about 750 pixels wide, as in the workspace (FND-90).
 */
const ICONS_ACROSS = 26;
/** How much larger marks grow as the map zooms in, at most. */
const MOST_GROWTH = 2;
/** How far, in icons, a row of order marks sits above or below its place's centre. */
const ROW_GAP = 0.95;
/** How far above a driver, in icons, the accepted requests sit: above the notified ones. */
const ACCEPTED_ROW = 1.5;
/** How far apart, in icons, two marks in a row sit. */
const MARK_SPACING = 0.55;
/** How big an order's mark is, against an icon: about 12 pixels. */
const ORDER_SIZE = 0.43;
/** How big an address's house pin is, against an icon: about 17 pixels. */
const PIN_SIZE = 0.6;
/** How far below an address, in icons, the orders delivered there sit, under its pins. */
const DELIVERED_ROW = 0.75;
/** How tall a badge is, against an icon. */
const BADGE_SIZE = 0.62;
/** The space around the city, in icons. */
const PADDING = 1.5;

/** A row of one kind of order view at a place: what it holds, and how to describe each. */
interface IRow {
    readonly kind: MarkKind;
    readonly ids: readonly string[];
    /** How far below the place the row sits, in marks; above when negative. */
    readonly offset: number;
    /** How big each mark is, against an icon. */
    readonly size: number;
    readonly describe: (id: string) => string;
}

/** Where a place is drawn, and who it is. */
interface IPlace {
    readonly key: string;
    readonly x: number;
    readonly y: number;
}

const orderChoice = (id: string): ISubjectChoice => ({
    kind: NodeKind.Order,
    key: `o:${id}`,
    subject: toOrderId(id),
});

const driverChoice = (id: string): ISubjectChoice => ({
    kind: NodeKind.Driver,
    key: `d:${id}`,
    subject: toDriverId(id),
});

/** The marks of a row, centred on its place, or one badge where it has more than five. */
function rowMarks(
    place: IPlace,
    row: IRow,
    unit: number,
    selectedKey: string | null,
): { readonly marks: readonly IDrawnMark[]; readonly badges: readonly IDrawnBadge[] } {
    const group: IMarkGroup = markGroup(row.ids);
    const y = place.y + row.offset * unit;
    const size = row.size * unit;
    if (group.badge !== null) {
        const badgeSize = BADGE_SIZE * unit;
        const items = group.all.map((id) => ({
            id,
            label: row.describe(id),
            choice: orderChoice(id),
        }));
        const badge: IDrawnBadge = {
            key: `${place.key}:${row.kind}`,
            kind: row.kind,
            x: place.x,
            y,
            size: badgeSize,
            count: group.badge,
            tooltip: `${group.badge} orders: click to list them`,
            items,
            isDimmed: false,
        };
        return { marks: [], badges: [badge] };
    }
    const first = place.x - ((group.marks.length - 1) * MARK_SPACING * unit) / 2;
    const marks = group.marks.map((id, index) => {
        const choice = orderChoice(id);
        return {
            key: `${place.key}:${row.kind}:${id}`,
            kind: row.kind,
            x: first + index * MARK_SPACING * unit,
            y,
            size,
            tooltip: row.describe(id),
            choice,
            isSelected: choice.key === selectedKey,
            isDimmed: false,
        };
    });
    return { marks, badges: [] };
}

/** The rows of a restaurant's order views, as the layers shown allow. */
function restaurantRows(
    restaurant: ISceneRestaurant,
    shown: ReadonlySet<MapLayer>,
): readonly IRow[] {
    const entries = restaurant.orders.map((order): [string, string] => [
        order.orderId,
        order.state,
    ]);
    const states = new Map(entries);
    const views: IRow = {
        kind: MarkKind.RestaurantOrder,
        ids: restaurant.orders.map((order) => order.orderId),
        offset: -ROW_GAP,
        size: ORDER_SIZE,
        describe: (id) => `${id} at ${restaurant.id}: ${states.get(id) ?? ''}`,
    };
    const parcels: IRow = {
        kind: MarkKind.Parcel,
        ids: restaurant.parcels,
        offset: ROW_GAP,
        size: ORDER_SIZE,
        describe: (id) => `${id} is physically at ${restaurant.id}`,
    };
    return [
        ...(shown.has(MapLayer.Restaurants) ? [views] : []),
        ...(shown.has(MapLayer.Parcels) ? [parcels] : []),
    ];
}

/** The rows of a driver's order views, as the layers shown allow. */
function driverRows(driver: ISceneDriver, shown: ReadonlySet<MapLayer>): readonly IRow[] {
    const notified: IRow = {
        kind: MarkKind.Notified,
        ids: driver.notified,
        offset: -ROW_GAP,
        size: ORDER_SIZE,
        describe: (id) => `${driver.id} was notified of ${id}'s request, and has not answered`,
    };
    const accepted: IRow = {
        kind: MarkKind.Accepted,
        ids: driver.accepted,
        offset: -ACCEPTED_ROW,
        size: ORDER_SIZE,
        describe: (id) => `${driver.id} accepted ${id}'s request`,
    };
    const parcels: IRow = {
        kind: MarkKind.Parcel,
        ids: driver.parcels,
        offset: ROW_GAP,
        size: ORDER_SIZE,
        describe: (id) => `${id} is physically with ${driver.id}`,
    };
    return [
        ...(shown.has(MapLayer.Drivers) ? [notified, accepted] : []),
        ...(shown.has(MapLayer.Parcels) ? [parcels] : []),
    ];
}

/**
 * The rows at an address: a house pin for each order on its way there, with the restaurants'
 * views, and below them each order delivered there, faint (FND-90).
 */
function addressRows(address: ISceneAddress, shown: ReadonlySet<MapLayer>): readonly IRow[] {
    const where = `${address.id}, ${address.customerId}'s address`;
    const pins: IRow = {
        kind: MarkKind.Pin,
        ids: address.pending,
        offset: 0,
        size: PIN_SIZE,
        describe: (id) => `${id} goes to ${where}`,
    };
    const delivered: IRow = {
        kind: MarkKind.Delivered,
        ids: address.delivered,
        offset: DELIVERED_ROW,
        size: ORDER_SIZE,
        describe: (id) => `${id} was delivered to ${where}`,
    };
    return [
        ...(shown.has(MapLayer.Restaurants) ? [pins] : []),
        ...(shown.has(MapLayer.Delivered) ? [delivered] : []),
    ];
}

/** Every row's marks and badges at a place. */
function placeMarks(
    place: IPlace,
    rows: readonly IRow[],
    unit: number,
    selectedKey: string | null,
): { readonly marks: readonly IDrawnMark[]; readonly badges: readonly IDrawnBadge[] } {
    const drawn = rows.map((row) => rowMarks(place, row, unit, selectedKey));
    return {
        marks: drawn.flatMap((row) => row.marks),
        badges: drawn.flatMap((row) => row.badges),
    };
}

/** The streets as two SVG paths, main roads and local streets, with north up. */
function streetPaths(scene: IMapScene): IDrawnStreets {
    const segment = (street: ISceneStreet): string => {
        const fromY = scene.heightMetres - street.from.north;
        const toY = scene.heightMetres - street.to.north;
        return `M${street.from.east} ${fromY}L${street.to.east} ${toY}`;
    };
    const main = scene.streets.filter((street) => street.isMain).map(segment);
    const local = scene.streets.filter((street) => !street.isMain).map(segment);
    return { main: main.join(''), local: local.join('') };
}

/**
 * A place's icon with its order marks and badges, before anything is dimmed. An address has no
 * icon of its own: its pins are its marks.
 */
interface IPlaceDrawing {
    readonly mark: IDrawnMark | null;
    readonly marks: readonly IDrawnMark[];
    readonly badges: readonly IDrawnBadge[];
}

/** Whether the order or driver selected shows anywhere at a place: its icon, a mark, or a list. */
const isPlaceSelected = (place: IPlaceDrawing, selectedKey: string | null): boolean =>
    place.mark?.isSelected === true ||
    place.marks.some((mark) => mark.isSelected) ||
    place.badges.some((badge) => badge.items.some((item) => item.choice.key === selectedKey));

/**
 * A place with everything not part of the selection faded: its icon stays clear when anything
 * selected shows there, so the selected order's restaurant and driver are found at a glance.
 */
function dimmed(place: IPlaceDrawing, selectedKey: string | null): IPlaceDrawing {
    const isHere = isPlaceSelected(place, selectedKey);
    return {
        mark: place.mark === null ? null : { ...place.mark, isDimmed: !isHere },
        marks: place.marks.map((mark) => ({ ...mark, isDimmed: !mark.isSelected })),
        badges: place.badges.map((badge) => ({
            ...badge,
            isDimmed: !badge.items.some((item) => item.choice.key === selectedKey),
        })),
    };
}

/**
 * The size of an icon in view: about 28 pixels at the whole city, growing as the map zooms in, to
 * at most twice that (FND-90).
 */
function iconSize(fitted: IViewWindow, fittedUnit: number, view: IViewWindow | null): number {
    if (view === null) {
        return fittedUnit;
    }
    const zoom = fitted.width / view.width;
    const root = Math.sqrt(zoom);
    const atLeastOne = Math.max(root, 1);
    const growth = Math.min(atLeastOne, MOST_GROWTH);
    return (fittedUnit * growth) / zoom;
}

/**
 * What the Map tab draws: the areas, each area's waiting point, the drivers' tracks, an icon for
 * each restaurant and driver, a mark for each order view the layers shown allow, a house pin at
 * the address of each order on its way and a faint mark for each delivered there, and a badge for
 * more than five of one kind at a place. Addresses are drawn first, under everything else. SVG
 * units are metres, with north up. Icons are about 28 pixels across at the whole city and grow as
 * the map zooms in, up to twice that. While an order or driver is selected, everything not part of
 * it fades (FND-90).
 */
export function mapDrawing(
    scene: IMapScene,
    shown: ReadonlySet<MapLayer>,
    selectedKey: string | null,
    view: IViewWindow | null = null,
): IMapDrawing {
    const fittedUnit = Math.max(scene.widthMetres, scene.heightMetres) / ICONS_ACROSS;
    const padding = PADDING * fittedUnit;
    const fitted: IViewWindow = {
        x: -padding,
        y: -padding,
        width: scene.widthMetres + 2 * padding,
        height: scene.heightMetres + 2 * padding,
    };
    const shownWindow = view ?? fitted;
    const unit = iconSize(fitted, fittedUnit, view);
    const toY = (point: IScenePoint): number => scene.heightMetres - point.north;
    const areas = scene.areas.map((area) => ({
        id: area.id,
        x: area.corner.east,
        y: scene.heightMetres - area.corner.north - area.sideMetres,
        side: area.sideMetres,
    }));
    const waitingPoints = scene.waitingPoints.map((point) => ({
        key: point.areaId,
        x: point.at.east,
        y: toY(point.at),
        tooltip: `Waiting point of ${point.areaId}, where its drivers wait with nothing to do`,
    }));
    const restaurants = scene.restaurants.map((restaurant): IPlaceDrawing => {
        const place = { key: `r:${restaurant.id}`, x: restaurant.at.east, y: toY(restaurant.at) };
        const mark: IDrawnMark = {
            ...place,
            kind: MarkKind.Restaurant,
            size: unit,
            tooltip: `Restaurant ${restaurant.id}, in ${restaurant.areaId}`,
            choice: null,
            isSelected: false,
            isDimmed: false,
        };
        const rows = restaurantRows(restaurant, shown);
        return { mark, ...placeMarks(place, rows, unit, selectedKey) };
    });
    const addresses = scene.addresses.map((address): IPlaceDrawing => {
        const place = { key: `a:${address.id}`, x: address.at.east, y: toY(address.at) };
        const rows = addressRows(address, shown);
        return { mark: null, ...placeMarks(place, rows, unit, selectedKey) };
    });
    const placed = scene.drivers.filter((driver) => driver.at !== null);
    const drivers = placed.map((driver): IPlaceDrawing => {
        const at = driver.at ?? { east: 0, north: 0 };
        const place = { key: `d:${driver.id}`, x: at.east, y: toY(at) };
        const choice = driverChoice(driver.id);
        const mark: IDrawnMark = {
            ...place,
            kind: MarkKind.Driver,
            size: unit,
            tooltip: `Driver ${driver.id}, in ${driver.areaId}, at the last location they sent`,
            choice,
            isSelected: choice.key === selectedKey,
            isDimmed: false,
        };
        const rows = driverRows(driver, shown);
        return { mark, ...placeMarks(place, rows, unit, selectedKey) };
    });
    const drawn = [...addresses, ...restaurants, ...drivers];
    const hasSelection = drawn.some((place) => isPlaceSelected(place, selectedKey));
    const everything = hasSelection ? drawn.map((place) => dimmed(place, selectedKey)) : drawn;
    const tracks = placed
        .filter((driver) => driver.track.length > 1)
        .map((driver) => ({
            key: driver.id,
            points: driver.track.map((point) => `${point.east},${toY(point)}`).join(' '),
            isDimmed: hasSelection && `d:${driver.id}` !== selectedKey,
        }));
    const routes = shown.has(MapLayer.Drivers)
        ? placed
              .filter((driver) => driver.ahead.length > 1)
              .map((driver) => ({
                  key: driver.id,
                  points: driver.ahead.map((point) => `${point.east},${toY(point)}`).join(' '),
                  tooltip: `${driver.id}'s route still to go, to ${driver.aheadTo ?? ''}`,
                  isDimmed: hasSelection && `d:${driver.id}` !== selectedKey,
              }))
        : [];
    return {
        viewBox: viewBoxOf(shownWindow),
        fitted,
        unit,
        areas,
        streets: streetPaths(scene),
        waitingPoints,
        tracks,
        routes,
        marks: everything.flatMap((place) =>
            place.mark === null ? place.marks : [place.mark, ...place.marks],
        ),
        badges: everything.flatMap((place) => place.badges),
        unplaced: scene.drivers.filter((driver) => driver.at === null).map((driver) => driver.id),
    };
}
