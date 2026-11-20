import type { DriverVersion } from '../../domain/drivers/driver';
import type { DriverLocationVersion } from '../../domain/drivers/driver-location';
import type { DriverStatusVersion } from '../../domain/drivers/driver-status';
import type { NotificationVersion } from '../../domain/drivers/deliveries/notification';
import type { OrderDeliveryVersion } from '../../domain/drivers/deliveries/order-delivery';
import type { OrderCopyVersion } from '../../domain/drivers/deliveries/order-copy';
import type { DeliveryCopyVersion } from '../../domain/orders/delivery-copy';
import type { OrderVersion } from '../../domain/orders/order';

/** A version of any record. */
export type RecordVersion =
    | OrderVersion
    | DeliveryCopyVersion
    | OrderDeliveryVersion
    | OrderCopyVersion
    | NotificationVersion
    | DriverVersion
    | DriverStatusVersion
    | DriverLocationVersion;
