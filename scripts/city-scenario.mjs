// A scenario file's value for a busy day in one city, built from a formula, so it is always the
// same.

const LATITUDE = 10.33;
const LONGITUDE = 20.82;
const RESTAURANTS_PER_DRIVER = 0.2;
const MS_PER_DAY = 86_400_000;
const MINUTE = 60_000;
const SECOND = 1000;
const SEED = 42;
const LOCATION_SPREAD = 0.0002;
const SPREAD_STEPS = 10;
const CLOCK_HOURS_END = 'h24:m00:s00:ms00';
const CLOCK_START = 'h00:m00:s00:ms00';
const ACCEPT_AFTER = 120_000;
const PICK_UP_AFTER = 600_000;
const DELIVER_AFTER = 1_800_000;
const LAST_ORDER_BEFORE_END = 2_400_000;
const MS_DIGITS = 3;
/** The city's south-west corner, about half a kilometre south and west of every place. */
const CITY_CORNER_LATITUDE = 10.325;
const CITY_CORNER_LONGITUDE = 20.815;
/** Four 1 km areas, with restaurants and drivers in area-1, as in the built-in one-order. */
const CITY_KM = 2;
const AREAS_EACH_WAY = 2;
/** Each restaurant has one customer, with this many addresses, one in each area in turn. */
const ADDRESSES_PER_CUSTOMER = 5;
const AREA_COUNT = AREAS_EACH_WAY * AREAS_EACH_WAY;

const pad = (value, width = 2) => String(value).padStart(width, '0');

/** Writes milliseconds as a time like h00:m05:s00:ms00. */
function clockTime(time) {
    const totalSeconds = Math.floor(time / SECOND);
    const totalMinutes = Math.floor(totalSeconds / (MINUTE / SECOND));
    const hours = Math.floor(totalMinutes / (MINUTE / SECOND));
    const seconds = totalSeconds % (MINUTE / SECOND);
    const minutes = totalMinutes % (MINUTE / SECOND);
    return `h${pad(hours)}:m${pad(minutes)}:s${pad(seconds)}:ms${pad(time % SECOND, MS_DIGITS)}`;
}

/** A restaurant's one customer, whose addresses give only an area, where the seed places them. */
function customerOf(restaurantIndex) {
    return {
        id: `customer-${restaurantIndex}`,
        restaurant: `restaurant-${restaurantIndex}`,
        addresses: Array.from({ length: ADDRESSES_PER_CUSTOMER }, (_unused, index) => ({
            id: `address-${restaurantIndex}-${index}`,
            area: `area-${(index % AREA_COUNT) + 1}`,
        })),
    };
}

/**
 * The steps of one order, from creation to delivered, spread over about half an hour. It goes to
 * one of its restaurant's customer's addresses in turn.
 */
function orderSteps(index, startsAt, restaurantIndex, driver) {
    const order = `order-${index}`;
    const restaurant = `restaurant-${restaurantIndex}`;
    const step = (after, actor, command) => ({ at: startsAt + after, actor, command, order });
    const destination = {
        customer: `customer-${restaurantIndex}`,
        address: `address-${restaurantIndex}-${index % ADDRESSES_PER_CUSTOMER}`,
    };
    return [
        { ...step(0, restaurant, 'create-order'), ...destination },
        step(SECOND, restaurant, 'request-delivery'),
        step(MINUTE, restaurant, 'mark-ready'),
        step(ACCEPT_AFTER, driver, 'accept'),
        step(PICK_UP_AFTER, driver, 'pick-up'),
        step(DELIVER_AFTER, driver, 'deliver'),
    ];
}

/**
 * A city with the given number of drivers and orders, in one area. Each driver starts with a
 * location sent at the start, which their app keeps fresh by sending every 30 seconds (FND-90).
 */
export function cityScenario(driverCount, orderCount) {
    const round = Math.round(driverCount * RESTAURANTS_PER_DRIVER);
    const restaurantCount = Math.max(1, round);
    const spread = (index) => (index % SPREAD_STEPS) * LOCATION_SPREAD;
    const lastStart = MS_PER_DAY - LAST_ORDER_BEFORE_END;
    return {
        format: 1,
        name: `A city: ${driverCount} drivers, ${orderCount} orders, one day`,
        version: 'V1.0.0',
        seed: SEED,
        runUntil: CLOCK_HOURS_END,
        city: {
            origin: { latitude: CITY_CORNER_LATITUDE, longitude: CITY_CORNER_LONGITUDE },
            widthKm: CITY_KM,
            heightKm: CITY_KM,
            across: AREAS_EACH_WAY,
            down: AREAS_EACH_WAY,
            seed: SEED,
        },
        restaurants: Array.from({ length: restaurantCount }, (_unused, index) => ({
            id: `restaurant-${index}`,
            area: 'area-1',
            location: { latitude: LATITUDE + spread(index), longitude: LONGITUDE },
        })),
        customers: Array.from({ length: restaurantCount }, (_unused, index) => customerOf(index)),
        drivers: Array.from({ length: driverCount }, (_unused, index) => ({
            id: `driver-${index}`,
            area: 'area-1',
            availability: 'Available',
            location: { latitude: LATITUDE, longitude: LONGITUDE + spread(index) },
            locatedAt: CLOCK_START,
        })),
        steps: Array.from({ length: orderCount }, (_unused, index) => {
            const floor = Math.floor((index * lastStart) / orderCount);
            return orderSteps(
                index,
                floor,
                index % restaurantCount,
                `driver-${index % driverCount}`,
            );
        })
            .flat()
            .toSorted((first, second) => first.at - second.at)
            .map((step) => ({ ...step, at: clockTime(step.at) })),
    };
}
