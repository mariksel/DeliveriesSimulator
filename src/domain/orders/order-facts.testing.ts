import type { DriverId } from '../drivers/driver';
import type { VersionNumber } from '../system/records/version-chain';
import type { OrderStatus } from './order-status';
import type { OrderView } from './order-view';

/** What an order's full view says, flat, as tests match it. */
export interface IOrderFacts {
    readonly status: OrderStatus;
    readonly number: VersionNumber;
    readonly isReady: boolean;
    readonly driverId: DriverId | null;
    readonly isDeliveryRequestPending: boolean;
}

/** What an order's full view says, flat, or undefined for no order. */
export function orderFacts(view: OrderView | undefined): IOrderFacts | undefined {
    if (view === undefined) {
        return undefined;
    }
    return {
        status: view.status,
        number: view.version.number,
        isReady: view.isReady,
        driverId: view.driverId,
        isDeliveryRequestPending: view.isDeliveryRequestPending,
    };
}
