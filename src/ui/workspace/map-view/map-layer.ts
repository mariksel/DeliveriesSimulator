/** The kinds of view a switch above the map shows or hides (FND-90). */
export const MapLayer = {
    /** Each order as its restaurant's module holds it. */
    Restaurants: 'Restaurants',
    /** The requests each driver was notified of, and those they accepted. */
    Drivers: 'Drivers',
    /** Where each order physically is believed to be. */
    Parcels: 'Parcels',
    /** The orders delivered, faint at the addresses they went to. */
    Delivered: 'Delivered',
} as const;

/** One of the values of {@link MapLayer}. */
export type MapLayer = (typeof MapLayer)[keyof typeof MapLayer];

const LAYERS = Object.values(MapLayer);

/** Every layer, as the map starts. */
export const ALL_LAYERS: ReadonlySet<MapLayer> = new Set(LAYERS);
