import { List } from 'immutable';

import type { IScenarioProblem } from '../../application-core/scenarios/scenario';
import { problemAt } from '../../application-core/scenarios/scenario';
import { ScriptedCommand } from '../../application-core/scenarios/scripted-command';
import type { Fields } from './scenario-reader';

const NONE = List<IScenarioProblem>();

const WAITING_COMMANDS: readonly ScriptedCommand[] = [
    ScriptedCommand.PickUp,
    ScriptedCommand.Deliver,
];

/**
 * Reads whether a pick-up or delivery runs at its time even if its driver has not arrived, to
 * test a driver who reports early. Without it, the step waits for them (FND-90).
 */
export function readAtItsTime(
    step: Fields,
    path: string,
    command: ScriptedCommand | undefined,
): {
    readonly value: { readonly isAtItsTime?: true };
    readonly problems: List<IScenarioProblem>;
} {
    const given = step['atItsTime'];
    if (given === undefined) {
        return { value: {}, problems: NONE };
    }
    if (command !== undefined && !WAITING_COMMANDS.includes(command)) {
        const problems = problemAt(`${path}atItsTime`, 'is only for a pick-up or delivery step');
        return { value: {}, problems };
    }
    if (typeof given !== 'boolean') {
        return { value: {}, problems: problemAt(`${path}atItsTime`, 'must be true or false') };
    }
    return { value: given ? { isAtItsTime: true } : {}, problems: NONE };
}
