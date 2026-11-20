import { FunctionLookup } from '../../application-core/simulation-engine/function-lookup';
import type {
    FunctionVersionTable,
    IStateFunctions,
} from '../../application-core/simulation-engine/function-name';
import { FunctionName } from '../../application-core/simulation-engine/function-name';
import { DeliveriesState } from '../../domain/drivers/deliveries/deliveries-state';
import { OrdersState } from '../../domain/orders/orders-state';
import type { VersionNumber } from '../../domain/system/records/version-chain';
import { toVersionNumber } from '../../domain/system/records/version-chain';
import { required } from '../../domain/system/validation/required';

/**
 * Every version of every state function, oldest first, by name: version n is the nth (FND-81).
 * When a function's behaviour changes, its old body is copied into its module's `versions`
 * folder and listed here under its old number, and the newest goes last; a version never leaves,
 * so any saved run can be worked out again. The registry of stored IDs lists the same functions.
 */
export const FUNCTION_VERSIONS: FunctionVersionTable = {
    [FunctionName.OrdersCreateOrder]: [OrdersState.createOrder],
    [FunctionName.OrdersRequestDelivery]: [OrdersState.requestDelivery],
    [FunctionName.OrdersMarkReady]: [OrdersState.markReady],
    [FunctionName.OrdersPickUp]: [OrdersState.pickUp],
    [FunctionName.OrdersDeliver]: [OrdersState.deliver],
    [FunctionName.OrdersCompleteHandoff]: [OrdersState.completeHandoff],
    [FunctionName.OrdersReadDeliveriesEvent]: [OrdersState.readDeliveriesEvent],
    [FunctionName.OrdersRecordDeliveriesEventRead]: [OrdersState.recordDeliveriesEventRead],
    [FunctionName.OrdersRetryHandoffs]: [OrdersState.retryHandoffs],
    [FunctionName.DeliveriesReceiveDeliveryRequest]: [DeliveriesState.receiveDeliveryRequest],
    [FunctionName.DeliveriesAnswerFromOrders]: [DeliveriesState.answerFromOrders],
    [FunctionName.DeliveriesAcceptRequest]: [DeliveriesState.acceptRequest],
    [FunctionName.DeliveriesNotifyNextDriver]: [DeliveriesState.notifyNextDriver],
    [FunctionName.DeliveriesReadOrdersEvent]: [DeliveriesState.readOrdersEvent],
    [FunctionName.DeliveriesRecordOrdersEventRead]: [DeliveriesState.recordOrdersEventRead],
    [FunctionName.DeliveriesPickUp]: [DeliveriesState.pickUp],
    [FunctionName.DeliveriesDeliver]: [DeliveriesState.deliver],
    [FunctionName.DeliveriesReceiveLocation]: [DeliveriesState.receiveLocation],
    [FunctionName.DeliveriesReceiveLocations]: [DeliveriesState.receiveLocations],
};

/**
 * The repository's lookup of state functions by name and version, which the core declares and a
 * run carries (FND-81).
 */
export class RegistryFunctionLookup extends FunctionLookup {
    constructor(private readonly table: FunctionVersionTable = FUNCTION_VERSIONS) {
        super();
    }

    functionOf<TName extends FunctionName>(
        name: TName,
        version: VersionNumber,
    ): IStateFunctions[TName] {
        const versions: readonly IStateFunctions[TName][] = this.table[name];
        return required(versions[version - 1], `version ${version} of ${name}`);
    }

    versionsOf(name: FunctionName): readonly VersionNumber[] {
        return this.table[name].map((_fn, index) => toVersionNumber(index + 1));
    }
}

/** The lookup every run is made with, from every version registered. */
export const REGISTERED_FUNCTIONS: FunctionLookup = new RegistryFunctionLookup();
