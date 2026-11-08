import type { List } from 'immutable';

import type { ParameterChange } from '../../domain/business-rules/parameter-change';
import type { NewDriver } from '../../domain/drivers/driver';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import type { RestaurantPlace } from '../../domain/restaurants/restaurant-place';
import type { InputCommand } from './input-command';
import type { IndirectLabel, InputActor, InputOrderName } from './input-names';
import { toIndirectLabel, toInputActor, toInputOrderName } from './input-names';
import type { IndirectStatement } from './indirect-effect';

export type { IndirectLabel, InputActor, InputOrderName };
export { toIndirectLabel, toInputActor, toInputOrderName };

/**
 * One command from outside the service, at a stated simulated time: the engine's own form of
 * whatever supplies a run's inputs, such as a scenario's script.
 */
export interface IRunInput {
    readonly at: SimTime;
    /** The restaurant or driver acting, by the name the input gives it. */
    readonly actor: InputActor;
    readonly command: InputCommand;
    /** The input's own name for the order. The run gives it its real ID when it is created. */
    readonly order: InputOrderName;
    /** The label of an earlier indirect step that led to this call, if one did (FND-89). */
    readonly after?: IndirectLabel;
}

/**
 * Rule parameters to change at a stated simulated time, by rule ID, as a config change commit
 * (FND-84).
 */
export interface IRulesInput {
    readonly at: SimTime;
    readonly changes: List<ParameterChange>;
}

/**
 * A decision or change outside the service at a stated simulated time, as an indirect commit
 * (FND-89).
 */
export interface IIndirectInput {
    readonly at: SimTime;
    readonly indirect: IndirectStatement;
}

/** One input in a run's script: a command, rules to change, or an indirect effect. */
export type ScriptInput = IRunInput | IRulesInput | IIndirectInput;

/** Whether a script's input changes rules, rather than giving a command. */
export const isRulesInput = (input: ScriptInput): input is IRulesInput => 'changes' in input;

/** Whether a script's input states an indirect effect. */
export const isIndirectInput = (input: ScriptInput): input is IIndirectInput =>
    'indirect' in input;

/** Who exists when a run with inputs begins, and the rule values it starts with. */
export interface IRunStart {
    readonly restaurants: List<RestaurantPlace>;
    readonly drivers: List<NewDriver>;
    /** Changes to the rules the run starts with, which make no commit. None, unless given. */
    readonly rules?: List<ParameterChange>;
}
