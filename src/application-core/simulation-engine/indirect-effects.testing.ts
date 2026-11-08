import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { toDuration } from '../../domain/system/time/duration';
import type {
    ICustomerWontTakeOrder,
    IDriverIgnoresRequest,
    IndirectEffect,
    IndirectStatement,
    IRestaurantRunsLate,
} from './indirect-effect';
import { IndirectKind } from './indirect-effect';
import { toIndirectLabel, toInputActor, toInputOrderName } from './run-input';

const LATE_BY_MS = 90_000;
const IGNORED_AT_MS = 45_000;
const LATE_AT_MS = 20_000;
const REFUSED_AT_MS = 120_000;

/** Driver 1 ignores the request for order A, named "ignored". */
export const DRIVER_IGNORES: IDriverIgnoresRequest = {
    kind: IndirectKind.DriverIgnoresRequest,
    label: toIndirectLabel('ignored'),
    actor: toInputActor('driver-1'),
    order: toInputOrderName('A'),
};

/** Restaurant 1 expects order A ready a minute and a half later, unnamed. */
export const RESTAURANT_LATE: IRestaurantRunsLate = {
    kind: IndirectKind.RestaurantRunsLate,
    label: null,
    actor: toInputActor('restaurant-1'),
    order: toInputOrderName('A'),
    lateBy: toDuration(LATE_BY_MS),
};

/** The customer won't take order A, named "refused". */
export const CUSTOMER_WONT: ICustomerWontTakeOrder = {
    kind: IndirectKind.CustomerWontTakeOrder,
    label: toIndirectLabel('refused'),
    order: toInputOrderName('A'),
};

/** A statement as the indirect effect it makes at a time, by hand unless a script stated it. */
export const effectOf = (
    statement: IndirectStatement,
    milliseconds: number,
    isScripted = false,
): IndirectEffect => ({ ...statement, at: toSimTime(milliseconds), isScripted });

/** The driver ignoring the request at 45 seconds, in a script. */
export const IGNORED = effectOf(DRIVER_IGNORES, IGNORED_AT_MS, true);
/** The restaurant running late at 20 seconds, by hand. */
export const LATE = effectOf(RESTAURANT_LATE, LATE_AT_MS);
/** The customer not taking the order at 2 minutes, by hand. */
export const REFUSED = effectOf(CUSTOMER_WONT, REFUSED_AT_MS);
