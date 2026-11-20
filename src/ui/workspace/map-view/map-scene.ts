import type { IShownWorld } from '../../../application/verification/watched-run';
import type { City } from '../../../domain/map-and-routing/city';
import type { Coordinates } from '../../../domain/map-and-routing/coordinates';
import { toPlane } from '../../../domain/map-and-routing/local-plane';
import type { DriverVersion } from '../../../domain/drivers/driver';
import type { DriverLocationVersion } from '../../../domain/drivers/driver-location';
import { DeliveryState } from '../../../domain/drivers/deliveries/order-delivery';
import type { OrderView } from '../../../domain/orders/order-view';
import { OrderStatus } from '../../../domain/orders/order-status';
import type { OrderId } from '../../../domain/orders/order';
import { versionChain } from '../../../domain/system/records/version-chain';
import type { ICrossing } from '../../../domain/map-and-routing/street-grid';
import { StreetGrid } from '../../../domain/map-and-routing/street-grid';
import { SeededRandom } from '../../../domain/simulation-engine/seeded-random';
import { toSeed } from '../../../domain/simulation-engine/numbers';
import { required } from '../../../domain/system/validation/required';
import { RideKind, routeAhead } from '../../../application-core/simulation-engine/ride';

const METRES_PER_KILOMETRE = 1000;

/** A point on the map, in metres east and north of the city's south-west corner. */
export interface IScenePoint {
    readonly east: number;
    readonly north: number;
}

/** A street between two neighbouring crossings, and whether it is a main road. */
export interface ISceneStreet {
    readonly from: IScenePoint;
    readonly to: IScenePoint;
    readonly isMain: boolean;
}

/** One of the city's square areas. */
export interface ISceneArea {
    readonly id: string;
    /** Its south-west corner. */
    readonly corner: IScenePoint;
    readonly sideMetres: number;
}

/** Where a driver with nothing to do waits in an area (FND-90). */
export interface ISceneWaitingPoint {
    readonly areaId: string;
    readonly at: IScenePoint;
}

/** An order as its restaurant's module holds it: its state, in words (FND-90). */
export interface IRestaurantOrder {
    readonly orderId: string;
    readonly state: string;
}

/**
 * A restaurant on the map, with its view of its orders, and the orders physically there, which
 * have not been picked up.
 */
export interface ISceneRestaurant {
    readonly id: string;
    readonly areaId: string;
    readonly at: IScenePoint;
    readonly orders: readonly IRestaurantOrder[];
    readonly parcels: readonly string[];
}

/**
 * A driver on the map, at the last location they sent, with every earlier one behind them, the
 * requests they were notified of and still have outstanding, those they accepted, and the orders
 * physically with them (FND-90).
 */
export interface ISceneDriver {
    readonly id: string;
    readonly areaId: string;
    /** None until the driver sends a location; such a driver is not drawn. */
    readonly at: IScenePoint | null;
    /** Each location they sent, oldest first, the last being where they are. */
    readonly track: readonly IScenePoint[];
    readonly notified: readonly string[];
    readonly accepted: readonly string[];
    readonly parcels: readonly string[];
    /** The route still to go along the streets, from where they are; none once arrived. */
    readonly ahead: readonly IScenePoint[];
    /** Where that route goes, in words, or null with none. */
    readonly aheadTo: string | null;
}

/**
 * A customer's address that orders go to: the orders on their way there, each with a pin, and
 * those delivered there (FND-90).
 */
export interface ISceneAddress {
    readonly id: string;
    readonly customerId: string;
    readonly areaId: string;
    readonly at: IScenePoint;
    /** The orders going there and not delivered yet. */
    readonly pending: readonly string[];
    readonly delivered: readonly string[];
}

/** Everything the Map view draws, at the commit shown (FND-90). */
export interface IMapScene {
    readonly widthMetres: number;
    readonly heightMetres: number;
    readonly areas: readonly ISceneArea[];
    /** Each area's waiting point, in the order of the areas. */
    readonly waitingPoints: readonly ISceneWaitingPoint[];
    /** The city's streets, each between two neighbouring crossings (FND-90). */
    readonly streets: readonly ISceneStreet[];
    readonly restaurants: readonly ISceneRestaurant[];
    readonly drivers: readonly ISceneDriver[];
    /** Each address an order has gone to or is going to, in the order first used. */
    readonly addresses: readonly ISceneAddress[];
}

/** Where an order physically is believed to be: with a restaurant, a driver, or neither. */
interface IParcelPlace {
    readonly restaurantId: string | null;
    readonly driverId: string | null;
}

const STATE_WORDS: Readonly<Record<OrderStatus, string>> = {
    [OrderStatus.Created]: 'Created',
    [OrderStatus.DeliveryRequested]: 'Delivery requested',
    [OrderStatus.DriverAssigned]: 'Driver assigned',
    [OrderStatus.PickedUp]: 'Picked up',
    [OrderStatus.Delivered]: 'Delivered',
};

const isBeforePickUp = (status: OrderStatus): boolean =>
    status !== OrderStatus.PickedUp && status !== OrderStatus.Delivered;

/** An order's state as Orders holds it, in words, with whether it is ready before pick-up. */
export function orderStateWords(view: OrderView): string {
    const words = STATE_WORDS[view.status];
    return view.isReady && isBeforePickUp(view.status) ? `${words}, ready` : words;
}

function pointOf(city: City, place: Coordinates): IScenePoint {
    const { eastMetres, northMetres } = toPlane(city.origin, place);
    return { east: eastMetres, north: northMetres };
}

/** The city's areas, row by row from its south-west corner. */
function areasOf(city: City): readonly ISceneArea[] {
    const side = city.areaSideMetres();
    return city.areaIds.toArray().map((id, index) => ({
        id,
        corner: {
            east: (index % city.across) * side,
            north: Math.floor(index / city.across) * side,
        },
        sideMetres: side,
    }));
}

/** Each of the city's areas' waiting points, in the order of the areas. */
function waitingPointsOf(city: City): readonly ISceneWaitingPoint[] {
    return city.areaIds.toArray().flatMap((areaId): ISceneWaitingPoint[] => {
        const point = city.waitingPointIn(areaId);
        return point === undefined ? [] : [{ areaId, at: pointOf(city, point) }];
    });
}

/**
 * A city's streets, from its seed, as the routes along them follow them (FND-90). The city does
 * not change during a run, so these are worked out once for it, not at every commit.
 */
export function streetsOf(city: City): readonly ISceneStreet[] {
    const seed = toSeed(city.seed);
    const random = SeededRandom.createNew(seed);
    const grid = StreetGrid.createNew(city, random);
    const point = (crossing: ICrossing): IScenePoint => {
        const { eastMetres, northMetres } = grid.pointOf(crossing);
        return { east: eastMetres, north: northMetres };
    };
    return grid.streets
        .map((street) => ({
            from: point(street.from),
            to: point(street.to),
            isMain: street.isMain,
        }))
        .toArray();
}

/**
 * Each location a driver sent, oldest first, from their location's versions, leaving out
 * repeats; none before their device has said where they are (FND-81).
 */
export function trackOf(latest: DriverLocationVersion | undefined): readonly Coordinates[] {
    if (latest === undefined) {
        return [];
    }
    const versions = versionChain(latest).toArray();
    const places = versions.map((version) => version.coordinates);
    return places.filter((place, index) => index === 0 || place !== places[index - 1]);
}

/**
 * Where an order physically is believed to be: Deliveries hears of a pick-up and a delivery from
 * the driver, so once it has the order its record says; before that, the order is at its
 * restaurant, unless Orders holds it picked up or delivered (FND-90).
 */
function parcelPlace(world: IShownWorld, orderId: OrderId): IParcelPlace {
    const { orders, deliveries } = world.state;
    const restaurantId = orders.restaurants.get(orderId)?.id ?? null;
    const delivery = deliveries.deliveryVersions.get(orderId);
    if (delivery !== undefined) {
        if (delivery.state === DeliveryState.Delivered) {
            return { restaurantId: null, driverId: null };
        }
        return delivery.state === DeliveryState.PickedUp
            ? { restaurantId: null, driverId: delivery.driverId }
            : { restaurantId, driverId: null };
    }
    const status = orders.viewOf(orderId)?.status;
    return status === undefined || isBeforePickUp(status)
        ? { restaurantId, driverId: null }
        : { restaurantId: null, driverId: null };
}

/** The restaurant's view of each order it holds, until Orders holds it delivered (FND-90). */
function restaurantOrders(world: IShownWorld, restaurantId: string): readonly IRestaurantOrder[] {
    const { orders } = world.state;
    return orders.orderVersions
        .keySeq()
        .filter((orderId) => orders.restaurants.get(orderId)?.id === restaurantId)
        .flatMap((orderId): IRestaurantOrder[] => {
            const view = orders.viewOf(orderId);
            return view === undefined || view.status === OrderStatus.Delivered
                ? []
                : [{ orderId, state: orderStateWords(view) }];
        })
        .toArray();
}

/** The orders whose parcels are at a restaurant or with a driver. */
function parcelsWhere(
    world: IShownWorld,
    isHere: (place: IParcelPlace) => boolean,
): readonly string[] {
    return world.state.orders.orders
        .keySeq()
        .filter((orderId) => {
            const place = parcelPlace(world, orderId);
            return isHere(place);
        })
        .toArray();
}

/**
 * The requests a driver was notified of and has not answered: still outstanding, as an ignore
 * frees one, and still open, as an accept, by them or another driver, closes it. A notification
 * holds its slot after an accept, so the open request is what tells the map it was answered
 * (FND-90).
 */
function notifiedOf(world: IShownWorld, driverId: string): readonly string[] {
    const { deliveries } = world.state;
    return deliveries.notificationsByOrder
        .filter((notifications, orderId) => {
            const isOpen =
                deliveries.deliveryVersions.get(orderId)?.state === DeliveryState.Requested;
            return (
                isOpen &&
                notifications.some((notification) => {
                    const version = deliveries.notificationVersions.get(notification.id);
                    return notification.driverId === driverId && version?.isOutstanding === true;
                })
            );
        })
        .keySeq()
        .toArray();
}

/** The requests a driver accepted and has not delivered yet. */
function acceptedBy(world: IShownWorld, driverId: string): readonly string[] {
    return world.state.deliveries.deliveryVersions
        .filter(
            (version) =>
                version.driverId === driverId &&
                (version.state === DeliveryState.Assigned ||
                    version.state === DeliveryState.PickedUp),
        )
        .keySeq()
        .toArray();
}

/**
 * Each address Orders holds an order going to, with the orders still on their way there and
 * those delivered there, by Orders' status (FND-90).
 */
function addressesOf(world: IShownWorld, city: City): readonly ISceneAddress[] {
    const { orders } = world.state;
    const byAddress = orders.addresses.groupBy((address) => address.id);
    return byAddress
        .valueSeq()
        .map((going): ISceneAddress => {
            const first = going.first();
            // Every group holds at least the order that made it.
            const address = required(first, 'an order going to the address');
            const ids = going.keySeq().toArray();
            const isDelivered = (orderId: OrderId): boolean =>
                orders.viewOf(orderId)?.status === OrderStatus.Delivered;
            return {
                id: address.id,
                customerId: address.customerId,
                areaId: address.areaId,
                at: pointOf(city, address.coordinates),
                pending: ids.filter((orderId) => !isDelivered(orderId)),
                delivered: ids.filter(isDelivered),
            };
        })
        .toArray();
}

/** A driver's route still to go at the commit shown, and where it goes (FND-90). */
function aheadOf(
    world: IShownWorld,
    city: City,
    id: string,
): { readonly ahead: readonly IScenePoint[]; readonly aheadTo: string | null } {
    const ride = world.rides.get(id);
    if (ride === undefined) {
        return { ahead: [], aheadTo: null };
    }
    const route = routeAhead(city, ride.at, ride.leg, world.at);
    const ahead = route.map((place) => pointOf(city, place)).toArray();
    if (ahead.length === 0) {
        return { ahead, aheadTo: null };
    }
    const { leg } = ride;
    if (leg.kind === RideKind.GoesToWait) {
        return { ahead, aheadTo: `the waiting point of ${leg.areaId}` };
    }
    const stop = leg.isPickUp ? 'restaurant' : 'address';
    return { ahead, aheadTo: `${leg.stopOrder}'s ${stop}` };
}

function driverOf(world: IShownWorld, city: City, latest: DriverVersion): ISceneDriver {
    const id = latest.driverId;
    const location = world.state.drivers.locationOf(id);
    const track = trackOf(location).map((place) => pointOf(city, place));
    return {
        id,
        areaId: latest.areaId,
        at: track.at(-1) ?? null,
        track,
        notified: notifiedOf(world, id),
        accepted: acceptedBy(world, id),
        parcels: parcelsWhere(world, (place) => place.driverId === id),
        ...aheadOf(world, city, id),
    };
}

/**
 * Everything the Map view draws at the commit shown: the city's areas, each restaurant with its
 * view of its orders and the parcels there, each driver with their track, requests, and parcels,
 * and each address orders go to, with the city's streets as given (FND-90). Nothing for a run
 * with no city.
 */
export function mapScene(world: IShownWorld, streets: readonly ISceneStreet[]): IMapScene | null {
    const { city } = world.script;
    if (city === null) {
        return null;
    }
    const restaurants = world.script.restaurants
        .valueSeq()
        .map((restaurant): ISceneRestaurant => ({
            id: restaurant.id,
            areaId: restaurant.areaId,
            at: pointOf(city, restaurant.coordinates),
            orders: restaurantOrders(world, restaurant.id),
            parcels: parcelsWhere(world, (place) => place.restaurantId === restaurant.id),
        }))
        .toArray();
    const drivers = world.state.drivers.driverVersions
        .valueSeq()
        .map((latest) => driverOf(world, city, latest))
        .toArray();
    return {
        widthMetres: city.widthKm * METRES_PER_KILOMETRE,
        heightMetres: city.heightKm * METRES_PER_KILOMETRE,
        areas: areasOf(city),
        waitingPoints: waitingPointsOf(city),
        streets,
        restaurants,
        drivers,
        addresses: addressesOf(world, city),
    };
}
