import type { List } from 'immutable';

import type { IScenarioProblem } from '../../application-core/scenarios/scenario';

/**
 * The lines the run workspace shows for a scenario's warnings, each with its place in the file,
 * as the runs page shows a scenario's problems (FND-84).
 */
export const warningLines = (warnings: List<IScenarioProblem>): readonly string[] =>
    warnings.map(({ path, message }) => `${path}: ${message}`).toArray();
