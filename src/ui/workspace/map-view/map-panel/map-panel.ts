import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output,
    signal,
} from '@angular/core';

import { Tooltip } from '../../../shell/tooltip/tooltip';
import type { ISubjectChoice } from '../../watched-run-store';
import type { IDrawnBadge, IDrawnMark } from '../map-drawing';
import { MarkKind, mapDrawing } from '../map-drawing';
import { ALL_LAYERS, MapLayer } from '../map-layer';
import type { IMapScene } from '../map-scene';
import type { IMapPoint, IViewWindow } from '../map-zoom';
import { pannedBy, wheelFactor, zoomedAt } from '../map-zoom';

/**
 * The drawing's transform from map units to the screen, from the surface an event reached, the
 * one place the map reads the DOM; null where the browser cannot say.
 */
function screenMatrixOf(event: MouseEvent): DOMMatrix | null {
    const surface = event.currentTarget;
    const isMeasurable =
        surface instanceof SVGSVGElement && typeof surface.getScreenCTM === 'function';
    return isMeasurable ? surface.getScreenCTM() : null;
}

/** Where on the map the pointer is; the middle of the view where the browser cannot say. */
function mapPointOf(event: MouseEvent, view: IViewWindow): IMapPoint {
    const matrix = screenMatrixOf(event);
    if (matrix === null) {
        return { x: view.x + view.width / 2, y: view.y + view.height / 2 };
    }
    const inverse = matrix.inverse();
    const screen = new DOMPoint(event.clientX, event.clientY);
    const point = screen.matrixTransform(inverse);
    return { x: point.x, y: point.y };
}

/** How many map units one screen pixel spans; one where the browser cannot say. */
function unitsPerPixel(event: MouseEvent, view: IViewWindow): number {
    const matrix = screenMatrixOf(event);
    if (matrix !== null && matrix.a > 0) {
        return 1 / matrix.a;
    }
    const surface = event.currentTarget;
    const width = surface instanceof Element ? surface.clientWidth : 0;
    return width > 0 ? view.width / width : 1;
}

/** A drag that pans the map: where it started on the screen, and the window it started from. */
interface IPanStart {
    readonly clientX: number;
    readonly clientY: number;
    readonly view: IViewWindow;
}

/** How much wider a badge grows for each digit of its count, against its height. */
const BADGE_DIGIT = 0.45;

/** A switch above the map: its layer, what it says, and its tooltip. */
interface ILayerSwitch {
    readonly layer: MapLayer;
    readonly label: string;
    readonly tooltip: string;
}

const SWITCHES: readonly ILayerSwitch[] = [
    {
        layer: MapLayer.Restaurants,
        label: "Restaurants' views",
        tooltip: 'Show or hide each order as its restaurant’s module holds it',
    },
    {
        layer: MapLayer.Drivers,
        label: "Drivers' views",
        tooltip: 'Show or hide the requests each driver was notified of, and those they accepted',
    },
    {
        layer: MapLayer.Parcels,
        label: 'Physical orders',
        tooltip: 'Show or hide where each order physically is believed to be',
    },
    {
        layer: MapLayer.Delivered,
        label: 'Delivered',
        tooltip: 'Show or hide the orders delivered, faint at the addresses they went to',
    },
];

/**
 * The Map tab: the city's areas, the restaurants, the drivers with their tracks, and each order's
 * views, at the commit shown, drawn in SVG with north up (FND-90). Clicking a driver or an order
 * selects it, as the timeline's views do.
 */
@Component({
    selector: 'app-map-panel',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [Tooltip],
    templateUrl: './map-panel.html',
    styleUrl: './map-panel.css',
})
export class MapPanel {
    protected readonly switches = SWITCHES;
    protected readonly kinds = MarkKind;
    /** The badge whose list is open, by its key, if any. */
    protected readonly openBadge = signal<string | null>(null);
    /** The part of the map in view, or null while it is fitted to the whole city (FND-90). */
    protected readonly view = signal<IViewWindow | null>(null);
    /** The drag panning the map, if one is going on. */
    protected readonly panStart = signal<IPanStart | null>(null);
    protected readonly drawing = computed(() => {
        const scene = this.scene();
        const layers = this.layers();
        const selectedKey = this.selectedKey();
        const view = this.view();
        return scene === null ? null : mapDrawing(scene, layers, selectedKey, view);
    });
    protected readonly badgeList = computed<IDrawnBadge | null>(() => {
        const key = this.openBadge();
        return this.drawing()?.badges.find((badge) => badge.key === key) ?? null;
    });
    readonly scene = input.required<IMapScene | null>();
    readonly layers = input<ReadonlySet<MapLayer>>(ALL_LAYERS);
    /** The key of the order or driver selected, such as `o:order-1`, if any. */
    readonly selectedKey = input<string | null>(null);
    /** Selects an order or a driver, or clears it when it is selected already. */
    readonly choose = output<ISubjectChoice>();
    readonly toggleLayer = output<MapLayer>();

    /** Half a mark's size, its radius. */
    protected half(mark: { readonly size: number }): number {
        return mark.size / 2;
    }

    /** A badge's width: room for its count, however many digits. */
    protected badgeWidth(badge: IDrawnBadge): number {
        const digits = String(badge.count).length;
        return badge.size * (1 + BADGE_DIGIT * digits);
    }

    /** The points of a diamond around a mark. */
    protected diamond(mark: IDrawnMark): string {
        const half = mark.size / 2;
        return `${mark.x},${mark.y - half} ${mark.x + half},${mark.y} ${mark.x},${mark.y + half} ${mark.x - half},${mark.y}`;
    }

    protected chooseMark(mark: IDrawnMark): void {
        if (mark.choice !== null) {
            this.choose.emit(mark.choice);
        }
    }

    protected toggleBadge(badge: IDrawnBadge): void {
        this.openBadge.update((open) => (open === badge.key ? null : badge.key));
    }

    protected chooseItem(choice: ISubjectChoice): void {
        this.openBadge.set(null);
        this.choose.emit(choice);
    }

    /** Zooms around the pointer: in for a scroll up, out for one down (FND-90). */
    protected zoom(event: WheelEvent): void {
        const drawing = this.drawing();
        if (drawing === null) {
            return;
        }
        event.preventDefault();
        const view = this.view() ?? drawing.fitted;
        const point = mapPointOf(event, view);
        const factor = wheelFactor(event.deltaY);
        const zoomed = zoomedAt(view, drawing.fitted, point, factor);
        this.view.set(zoomed);
    }

    /** Starts a drag that pans the map, unless it starts on a mark or a badge, which it clicks. */
    protected startPan(event: PointerEvent): void {
        const drawing = this.drawing();
        const target = event.target;
        const isOnMark = target instanceof Element && target.closest('.mark, .badge') !== null;
        if (drawing === null || isOnMark) {
            return;
        }
        const view = this.view() ?? drawing.fitted;
        this.panStart.set({ clientX: event.clientX, clientY: event.clientY, view });
    }

    /** Moves the map with the drag. */
    protected pan(event: PointerEvent): void {
        const start = this.panStart();
        if (start === null) {
            return;
        }
        const perPixel = unitsPerPixel(event, start.view);
        const right = (event.clientX - start.clientX) * perPixel;
        const down = (event.clientY - start.clientY) * perPixel;
        const panned = pannedBy(start.view, right, down);
        this.view.set(panned);
    }

    protected endPan(): void {
        this.panStart.set(null);
    }

    /** Brings the whole city back into view. */
    protected fit(): void {
        this.view.set(null);
    }
}
