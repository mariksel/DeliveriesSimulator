import type { ICallOrders } from '../../domain/drivers/deliveries/call-orders';
import type { ISendHandoff } from '../../domain/orders/send-handoff';

/** Something a module's step asks for, which the simulation engine must still carry out. */
export type FollowUp = ISendHandoff | ICallOrders;
