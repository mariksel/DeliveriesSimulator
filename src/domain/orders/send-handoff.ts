import type { DeliveryHandoff } from '../drivers/deliveries/delivery-handoff';
import type { FollowUpKind } from '../drivers/deliveries/follow-up-kind';
import type { IInstant } from '../system/time/instant';

/** Asks the engine to hand a delivery request to deliveries, and bring back its answer. */
export interface ISendHandoff {
    readonly kind: typeof FollowUpKind.SendHandoff;
    readonly at: IInstant;
    readonly handoff: DeliveryHandoff;
}
