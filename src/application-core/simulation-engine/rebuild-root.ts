import type { BranchId } from './branch-id';
import type { CommitId } from './commit-id';
import type { Position } from '../../domain/system/math/math';
import { DeliveriesState } from '../../domain/drivers/deliveries/deliveries-state';
import { DriversState } from '../../domain/drivers/drivers-state';
import { OrdersState } from '../../domain/orders/orders-state';
import type { DirectEffect } from './direct-effect';
import type { FunctionLookup } from './function-lookup';
import type { FunctionName } from './function-name';
import { FUNCTION_NAMES } from './function-name';
import type { IndirectEffect } from './indirect-effect';
import type { IMainRoot } from './main-root';
import {
    withDeliveries,
    withDirectEffect,
    withDrivers,
    withIndirectEffect,
    withOrders,
} from './main-root';
import type { IStateCall, StateFunction } from './state-call';

/*
 * Working a commit's root out again from the root before it and what the commit holds, as a run
 * saved at "minimum" is opened (FND-81): a state commit's call runs again on its module's state,
 * and an effect or indirect commit adds its own effect, as the engine did.
 */

/** What a commit holds that its root is worked out from. */
export interface IRebuildable {
    readonly effect: DirectEffect | null;
    readonly indirect: IndirectEffect | null;
    readonly call: IStateCall | null;
}

/**
 * A root worked out again that did not match what was kept for it, at this commit of this
 * branch, as when a run saved at "minimum" opens (FND-81). The error a load throws then carries
 * it, so a snapshot test can say which commit came out differently.
 */
export interface IRebuildMismatch {
    readonly kind: 'RebuildMismatch';
    readonly branch: BranchId;
    readonly place: Position;
    readonly commit: CommitId;
}

/** Whether an error is a rebuild's mismatch, naming the commit that came out differently. */
export const isRebuildMismatch = (error: unknown): error is Error & IRebuildMismatch =>
    error instanceof Error && Reflect.get(error, 'kind') === 'RebuildMismatch';

/** A root with a commit's own direct or indirect effect added, as the engine adds it. */
export function withEffectsOf(
    root: IMainRoot,
    effect: DirectEffect | null,
    indirect: IndirectEffect | null,
): IMainRoot {
    const withEffect = effect === null ? root : withDirectEffect(root, effect);
    return indirect === null ? withEffect : withIndirectEffect(withEffect, indirect);
}

/** The name of a function a lookup holds under some version; a function it lacks is a bug. */
export function functionNameOf(functions: FunctionLookup, fn: StateFunction): FunctionName {
    const name = FUNCTION_NAMES.find((each) => {
        const versions = functions.versionsOf(each);
        return versions.some((version) => {
            const found: StateFunction = functions.functionOf(each, version);
            return found === fn;
        });
    });
    if (name === undefined) {
        throw new Error(`The state function ${fn.name} is no version of any function.`);
    }
    return name;
}

/** Whether a function belongs to the orders module, by its name; the rest are Deliveries'. */
const isOrdersFunction = (name: FunctionName): boolean => name.startsWith('orders.');

/** A state function's result's state, which must be of the module it ran on. */
function resultState<TState>(
    result: unknown,
    isState: (value: unknown) => value is TState,
    name: FunctionName,
): TState {
    const found: unknown =
        typeof result === 'object' && result !== null ? Reflect.get(result, 'state') : undefined;
    if (!isState(found)) {
        throw new Error(`${name} gave back no state of its module.`);
    }
    return found;
}

const isOrdersState = (value: unknown): value is OrdersState => value instanceof OrdersState;
const isDeliveriesState = (value: unknown): value is DeliveriesState =>
    value instanceof DeliveriesState;

/** The drivers' state a Deliveries function gave back beside its own, if it gave any. */
function resultDrivers(result: unknown): DriversState | undefined {
    const drivers: unknown =
        typeof result === 'object' && result !== null ? Reflect.get(result, 'drivers') : undefined;
    return drivers instanceof DriversState ? drivers : undefined;
}

/** A state commit's root: its call run again on its module's state in the root before it. */
export function rootOfCall(
    parent: IMainRoot,
    call: IStateCall,
    functions: FunctionLookup,
): IMainRoot {
    const name = functionNameOf(functions, call.fn);
    if (isOrdersFunction(name)) {
        const result: unknown = Reflect.apply(call.fn, undefined, [
            parent.state.orders,
            ...call.args,
        ]);
        const orders = resultState(result, isOrdersState, name);
        return withOrders(parent, orders);
    }
    const result: unknown = Reflect.apply(call.fn, undefined, [
        parent.state.deliveries,
        ...call.args,
    ]);
    const deliveries = resultState(result, isDeliveriesState, name);
    const drivers = resultDrivers(result);
    const withNewDrivers = drivers === undefined ? parent : withDrivers(parent, drivers);
    return withDeliveries(withNewDrivers, deliveries);
}

/**
 * A commit's root, worked out again from the root before it and what the commit holds: its call
 * run again, or its own effect added.
 */
export function rebuiltRoot(
    parent: IMainRoot,
    commit: IRebuildable,
    functions: FunctionLookup,
): IMainRoot {
    const afterCall = commit.call === null ? parent : rootOfCall(parent, commit.call, functions);
    return withEffectsOf(afterCall, commit.effect, commit.indirect);
}
