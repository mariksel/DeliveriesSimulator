import type { DriverRefusal } from '../../domain/drivers/deliveries/driver-refusal';
import type { OrderRefusal } from '../../domain/orders/order-refusal';

/** Why the script refuses a step itself, before the service sees it. */
export const ScriptRefusal = {
    /** The step names an order the script has not created. */
    UnknownOrder: 'UnknownOrder',
    /** A create order step's actor is not one of the run's restaurants. */
    UnknownRestaurant: 'UnknownRestaurant',
    /** A create order step names an order the script has already created. */
    OrderAlreadyCreated: 'OrderAlreadyCreated',
} as const;

/** One of the values of {@link ScriptRefusal}. */
export type ScriptRefusal = (typeof ScriptRefusal)[keyof typeof ScriptRefusal];

/** Why an actor's command was refused: by the script, by orders, or by deliveries. */
export type CommandRefusal = ScriptRefusal | OrderRefusal | DriverRefusal;

/** What an actor's command came to. */
export type CommandOutcome =
    { readonly isOk: true } | { readonly isOk: false; readonly refusal: CommandRefusal };
