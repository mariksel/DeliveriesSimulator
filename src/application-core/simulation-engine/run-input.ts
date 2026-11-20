import type { FunctionName } from './function-name';
import type { VersionNumber } from '../../domain/system/records/version-chain';
import type { List } from 'immutable';

import type { ParameterChange } from '../../domain/business-rules/parameter-change';
import type { NewDriver } from '../../domain/drivers/driver';
import type { City } from '../../domain/map-and-routing/city';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import type { RestaurantPlace } from '../../domain/restaurants/restaurant-place';
import type { Customer, CustomerId } from '../../domain/restaurants/customers/customer';
import type {
    AddressId,
    DeliveryAddress,
} from '../../domain/restaurants/customers/delivery-address';
import type { OrderCommand } from './input-command';
import type { IRider } from './rider';
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
    readonly command: OrderCommand;
    /** The input's own name for the order. The run gives it its real ID when it is created. */
    readonly order: InputOrderName;
    /** The label of an earlier indirect step that led to this call, if one did (FND-89). */
    readonly after?: IndirectLabel;
    /** For create-order: the customer the order is for (FND-90). */
    readonly customer?: CustomerId;
    /** For create-order: which of the customer's stored addresses it goes to. */
    readonly address?: AddressId;
    /**
     * For a pick-up or delivery: run at its time even if the driver has not arrived, to test a
     * driver who reports early. Otherwise it waits for them (FND-90).
     */
    readonly isAtItsTime?: boolean;
}

/**
 * Rule parameters to change at a stated simulated time, by rule ID, as a config change commit
 * (FND-84).
 */
export interface IRulesInput {
    readonly at: SimTime;
    readonly changes: List<ParameterChange>;
    /** The label of an earlier indirect step that led to the change, if one did (FND-89). */
    readonly after?: IndirectLabel;
}

/** A state function to use from now on, by its name, at one of its versions (FND-81). */
export interface IFunctionUse {
    readonly function: FunctionName;
    readonly version: VersionNumber;
}

/**
 * State functions to switch to other versions at a stated simulated time, as an implementation
 * change commit (FND-81).
 */
export interface IUseInput {
    readonly at: SimTime;
    readonly uses: List<IFunctionUse>;
    /** The label of an earlier indirect step that led to the switch, if one did (FND-89). */
    readonly after?: IndirectLabel;
}

/**
 * A decision or change outside the service at a stated simulated time, as an indirect commit
 * (FND-89).
 */
export interface IIndirectInput {
    readonly at: SimTime;
    readonly indirect: IndirectStatement;
}

/**
 * One input in a run's script: a command, rules to change, functions to switch, or an indirect
 * effect.
 */
export type ScriptInput = IRunInput | IRulesInput | IUseInput | IIndirectInput;

/** Whether a script's input changes rules, rather than giving a command. */
export const isRulesInput = (input: ScriptInput): input is IRulesInput => 'changes' in input;

/** Whether a script's input switches functions to other versions. */
export const isUseInput = (input: ScriptInput): input is IUseInput => 'uses' in input;

/** Whether a script's input states an indirect effect. */
export const isIndirectInput = (input: ScriptInput): input is IIndirectInput =>
    'indirect' in input;

/** The city, who exists when a run with inputs begins, and the rule values it starts with. */
export interface IRunStart {
    /** The city the run happens in (FND-90). None, unless given. */
    readonly city?: City;
    readonly restaurants: List<RestaurantPlace>;
    /** The restaurants' customers (FND-90). None, unless given. */
    readonly customers?: List<Customer>;
    /** The customers' stored addresses, which orders go to. None, unless given. */
    readonly addresses?: List<DeliveryAddress>;
    /** The drivers the simulator rides, whose apps send their locations. None, unless given. */
    readonly riders?: List<IRider>;
    readonly drivers: List<NewDriver>;
    /** Changes to the rules the run starts with, which make no commit. None, unless given. */
    readonly rules?: List<ParameterChange>;
}
