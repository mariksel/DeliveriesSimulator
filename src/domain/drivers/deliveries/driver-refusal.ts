import type { IneligibleReason } from '../eligibility';
import type { OrderRefusal } from '../../orders/order-refusal';

/** Why deliveries refuses a driver's command, apart from eligibility. */
export const DriverRefusalCode = {
    UnknownOrder: 'UnknownOrder',
    UnknownDriver: 'UnknownDriver',
    NoOpenRequest: 'NoOpenRequest',
    NotTheAssignedDriver: 'NotTheAssignedDriver',
} as const;

/** One of the values of {@link DriverRefusalCode}. */
export type DriverRefusalCode = (typeof DriverRefusalCode)[keyof typeof DriverRefusalCode];

/** Why a driver's command was refused: by deliveries, for eligibility, or by orders. */
export type DriverRefusal =
    DriverRefusalCode | IneligibleReason | { readonly orders: OrderRefusal };
