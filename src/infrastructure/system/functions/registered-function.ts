/** Where a registered function's state comes from in a main root. */
export const StateModule = {
    Orders: 'orders',
    Deliveries: 'deliveries',
} as const;

/** One of the values of {@link StateModule}. */
export type StateModule = (typeof StateModule)[keyof typeof StateModule];

/**
 * How a state function's argument is persisted: as plain data, or as where to find it in the
 * commit's parent root, so a saved commit never copies it.
 */
export const ArgumentKind = {
    /** Plain data, copied as it is: an ID, or an outcome passed in. */
    Value: 'Value',
    /** A moment, persisted as its milliseconds. */
    Instant: 'Instant',
    /** The call to orders a driver's command asked for, with its moment as milliseconds. */
    CallOrders: 'CallOrders',
    /** A restaurant's place, a Domain instance, persisted through its own mapping. */
    RestaurantPlace: 'RestaurantPlace',
    /** What orders hands over with a delivery request, persisted through its own mapping. */
    DeliveryHandoff: 'DeliveryHandoff',
    OrdersOutbox: 'OrdersOutbox',
    DeliveriesOutbox: 'DeliveriesOutbox',
    /** One event of the orders outbox, found by its ID. */
    OrdersOutboxEvent: 'OrdersOutboxEvent',
    /** One event of the deliveries outbox, found by its ID. */
    DeliveriesOutboxEvent: 'DeliveriesOutboxEvent',
    OrdersRules: 'OrdersRules',
    DeliveriesRules: 'DeliveriesRules',
    DriversRules: 'DriversRules',
    /** The drivers' state, which a Deliveries function reads or changes beside its own. */
    DriversState: 'DriversState',
} as const;

/** One of the values of {@link ArgumentKind}. */
export type ArgumentKind = (typeof ArgumentKind)[keyof typeof ArgumentKind];

/** A module's state function, whatever its arguments, as a commit holds it. */
export type RegisteredStateFunction = (state: never, ...args: never) => unknown;

/**
 * A state function with its stored ID, which is readable and fixed once assigned. A behaviour
 * change registers a new version with a new ID, and the old one stays while a saved run needs it.
 */
export interface IRegisteredFunction {
    readonly id: string;
    readonly fn: RegisteredStateFunction;
    readonly module: StateModule;
    /** How each argument after the state is persisted, in order. */
    readonly args: readonly ArgumentKind[];
}
