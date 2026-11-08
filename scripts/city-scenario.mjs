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
const ACCEPT_AFTER = 120_000;
const PICK_UP_AFTER = 600_000;
const DELIVER_AFTER = 1_800_000;
const LAST_ORDER_BEFORE_END = 2_400_000;
const MS_DIGITS = 3;

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

/** The steps of one order, from creation to delivered, spread over about half an hour. */
function orderSteps(index, startsAt, restaurant, driver) {
    const order = `order-${index}`;
    const step = (after, actor, command) => ({ at: startsAt + after, actor, command, order });
    return [
        step(0, restaurant, 'create-order'),
        step(SECOND, restaurant, 'request-delivery'),
        step(MINUTE, restaurant, 'mark-ready'),
        step(ACCEPT_AFTER, driver, 'accept'),
        step(PICK_UP_AFTER, driver, 'pick-up'),
        step(DELIVER_AFTER, driver, 'deliver'),
    ];
}

/**
 * A city with the given number of drivers and orders, in one area. Each driver reports a location
 * stamped with the end of the day, so it never goes stale: the scenario format has no way yet for
 * a driver to move or report again.
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
        restaurants: Array.from({ length: restaurantCount }, (_unused, index) => ({
            id: `restaurant-${index}`,
            area: 'area-1',
            location: { latitude: LATITUDE + spread(index), longitude: LONGITUDE },
        })),
        drivers: Array.from({ length: driverCount }, (_unused, index) => ({
            id: `driver-${index}`,
            area: 'area-1',
            availability: 'Available',
            location: { latitude: LATITUDE, longitude: LONGITUDE + spread(index) },
            locatedAt: CLOCK_HOURS_END,
        })),
        steps: Array.from({ length: orderCount }, (_unused, index) => {
            const floor = Math.floor((index * lastStart) / orderCount);
            return orderSteps(
                index,
                floor,
                `restaurant-${index % restaurantCount}`,
                `driver-${index % driverCount}`,
            );
        })
            .flat()
            .toSorted((first, second) => first.at - second.at)
            .map((step) => ({ ...step, at: clockTime(step.at) })),
    };
}
