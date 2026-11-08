/**
 * A module's state function: its state first, then its other arguments. Every module's state
 * functions fit this, whatever their arguments.
 */
export type StateFunction = (state: never, ...args: never) => unknown;

/**
 * The pure function a state commit ran, and its arguments after the module's state, which the
 * commit's parent root holds. The function is a direct reference, so renaming it changes nothing
 * stored: only the repository knows its stored ID.
 */
export interface IStateCall {
    readonly fn: StateFunction;
    readonly args: readonly unknown[];
}

/** A state function's result, and the call that gave it. */
export interface ICalled<TResult> {
    readonly result: TResult;
    readonly call: IStateCall;
}

/** Calls a module's state function, keeping the call for the commit it makes. */
export function callState<TState, TArgs extends readonly unknown[], TResult>(
    fn: (state: TState, ...args: TArgs) => TResult,
    state: TState,
    ...args: TArgs
): ICalled<TResult> {
    const result = fn(state, ...args);
    const stateFunction: StateFunction = fn;
    return { result, call: { fn: stateFunction, args } };
}
