import type { DriversRules } from '../../domain/drivers/drivers-rules';

import type { DeliveriesRules } from '../../domain/drivers/deliveries/deliveries-rules';
import type { OrdersRules } from '../../domain/orders/orders-rules';

/**
 * The service's config values in use: every value tunable today. They sit in the direct part, and
 * rule functions receive them as an argument.
 */
export interface IRunValues {
    readonly drivers: DriversRules;
    readonly orders: OrdersRules;
    readonly deliveries: DeliveriesRules;
}
