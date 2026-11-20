import { DeliveriesState } from '../../domain/drivers/deliveries/deliveries-state';
import { OrdersState } from '../../domain/orders/orders-state';
import type { VersionNumber } from '../../domain/system/records/version-chain';
import { toVersionNumber } from '../../domain/system/records/version-chain';
import { required } from '../../domain/system/validation/required';
import { FunctionLookup } from './function-lookup';
import type { FunctionName, FunctionVersionTable, IStateFunctions } from './function-name';
import { FunctionName as Name } from './function-name';

/** Today's functions, each its only version, as the core's tests run with them. */
export const TODAYS_FUNCTIONS: FunctionVersionTable = {
    [Name.OrdersCreateOrder]: [OrdersState.createOrder],
    [Name.OrdersRequestDelivery]: [OrdersState.requestDelivery],
    [Name.OrdersMarkReady]: [OrdersState.markReady],
    [Name.OrdersPickUp]: [OrdersState.pickUp],
    [Name.OrdersDeliver]: [OrdersState.deliver],
    [Name.OrdersCompleteHandoff]: [OrdersState.completeHandoff],
    [Name.OrdersReadDeliveriesEvent]: [OrdersState.readDeliveriesEvent],
    [Name.OrdersRecordDeliveriesEventRead]: [OrdersState.recordDeliveriesEventRead],
    [Name.OrdersRetryHandoffs]: [OrdersState.retryHandoffs],
    [Name.DeliveriesReceiveDeliveryRequest]: [DeliveriesState.receiveDeliveryRequest],
    [Name.DeliveriesAnswerFromOrders]: [DeliveriesState.answerFromOrders],
    [Name.DeliveriesAcceptRequest]: [DeliveriesState.acceptRequest],
    [Name.DeliveriesNotifyNextDriver]: [DeliveriesState.notifyNextDriver],
    [Name.DeliveriesReadOrdersEvent]: [DeliveriesState.readOrdersEvent],
    [Name.DeliveriesRecordOrdersEventRead]: [DeliveriesState.recordOrdersEventRead],
    [Name.DeliveriesPickUp]: [DeliveriesState.pickUp],
    [Name.DeliveriesDeliver]: [DeliveriesState.deliver],
    [Name.DeliveriesReceiveLocation]: [DeliveriesState.receiveLocation],
    [Name.DeliveriesReceiveLocations]: [DeliveriesState.receiveLocations],
};

/** A lookup over a table of every version of every function, oldest first. */
export class TableFunctionLookup extends FunctionLookup {
    constructor(private readonly table: FunctionVersionTable) {
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

/** The lookup the core's tests give a run: today's functions, each at version 1. */
export const TESTING_FUNCTIONS: FunctionLookup = new TableFunctionLookup(TODAYS_FUNCTIONS);
