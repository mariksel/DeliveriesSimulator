import type { Set as ImmutableSet } from 'immutable';
import { List } from 'immutable';

import type { IScenarioProblem } from '../../application-core/scenarios/scenario';
import { problemAt } from '../../application-core/scenarios/scenario';
import type { IndirectStatement } from '../../application-core/simulation-engine/indirect-effect';
import { IndirectKind } from '../../application-core/simulation-engine/indirect-effect';
import type { IndirectLabel } from '../../application-core/simulation-engine/run-input';
import {
    toIndirectLabel,
    toInputActor,
    toInputOrderName,
} from '../../application-core/simulation-engine/run-input';
import { toDuration } from '../../domain/system/time/duration';
import type { Fields, IReading } from './scenario-reader';
import { readClockTime, readText, unknownFields } from './scenario-reader';

/** What the steps above a step have named, which it may refer to. */
export interface INamedSoFar {
    readonly restaurants: ImmutableSet<string>;
    readonly drivers: ImmutableSet<string>;
    /** The orders a create order step has named. */
    readonly created: ImmutableSet<string>;
    /** The labels indirect steps have given. */
    readonly labels: ImmutableSet<string>;
}

const KINDS = Object.values(IndirectKind);

const NONE = List<IScenarioProblem>();

/** Who decides, for each kind: a driver, a restaurant, or nobody the scenario names. */
const ACTOR_OF: Readonly<Record<IndirectKind, 'driver' | 'restaurant' | null>> = {
    [IndirectKind.DriverIgnoresRequest]: 'driver',
    [IndirectKind.RestaurantRunsLate]: 'restaurant',
    [IndirectKind.CustomerWontTakeOrder]: null,
};

/** The fields each kind takes. */
const FIELDS_OF: Readonly<Record<IndirectKind, readonly string[]>> = {
    [IndirectKind.DriverIgnoresRequest]: ['at', 'indirect', 'actor', 'order', 'label'],
    [IndirectKind.RestaurantRunsLate]: ['at', 'indirect', 'actor', 'order', 'label', 'lateBy'],
    [IndirectKind.CustomerWontTakeOrder]: ['at', 'indirect', 'order', 'label'],
};

/** A step's label, if it has one, which must not repeat an earlier step's. */
function readLabel(step: Fields, path: string, labels: ImmutableSet<string>): IReading<string> {
    if (step['label'] === undefined) {
        return { value: null, problems: NONE };
    }
    const label = readText(step, path, 'label');
    return label.value !== null && labels.has(label.value)
        ? { value: null, problems: problemAt(`${path}label`, `repeats "${label.value}"`) }
        : label;
}

/** Who decides, which must be one of the scenario's drivers or restaurants, as the kind says. */
function readActor(
    step: Fields,
    path: string,
    kind: IndirectKind,
    named: INamedSoFar,
): IReading<string> {
    const actorKind = ACTOR_OF[kind];
    if (actorKind === null) {
        return { value: null, problems: NONE };
    }
    const actor = readText(step, path, 'actor');
    const known = actorKind === 'driver' ? named.drivers : named.restaurants;
    return actor.value === null || known.has(actor.value)
        ? actor
        : {
              value: null,
              problems: problemAt(`${path}actor`, `must be a ${actorKind} for ${kind}`),
          };
}

/** The order, which an earlier step must have created. */
function readOrder(step: Fields, path: string, created: ImmutableSet<string>): IReading<string> {
    const order = readText(step, path, 'order');
    return order.value === null || created.has(order.value)
        ? order
        : {
              value: null,
              problems: problemAt(
                  `${path}order`,
                  `"${order.value}" is not created by an earlier step`,
              ),
          };
}

/** How much later a late restaurant expects the order to be ready, which must be some time. */
function readLateBy(step: Fields, path: string, kind: IndirectKind): IReading<number> {
    if (kind !== IndirectKind.RestaurantRunsLate) {
        return { value: 0, problems: NONE };
    }
    const lateBy = readClockTime(step, path, 'lateBy');
    return lateBy.value === 0
        ? { value: null, problems: problemAt(`${path}lateBy`, 'must be longer than no time') }
        : lateBy;
}

/** What a step states, from the parts read, each of which its kind needs. */
interface IStatedParts {
    readonly kind: IndirectKind;
    readonly order: string;
    readonly label: IndirectLabel | null;
    readonly actor: string | null;
    readonly lateBy: number;
}

function statementOf(parts: IStatedParts): IndirectStatement | null {
    const order = toInputOrderName(parts.order);
    const { label } = parts;
    if (parts.kind === IndirectKind.CustomerWontTakeOrder) {
        return { kind: parts.kind, order, label };
    }
    if (parts.actor === null) {
        return null;
    }
    const actor = toInputActor(parts.actor);
    if (parts.kind === IndirectKind.DriverIgnoresRequest) {
        return { kind: parts.kind, order, label, actor };
    }
    const lateBy = toDuration(parts.lateBy);
    return { kind: parts.kind, order, label, actor, lateBy };
}

/**
 * Reads what an indirect step states: its kind, and the data that kind takes, each checked against
 * what the steps above it named (FND-89). Its time is read with the other steps'.
 */
export function readIndirectStep(
    step: Fields,
    path: string,
    named: INamedSoFar,
): IReading<IndirectStatement> {
    const kind = KINDS.find((option) => option === step['indirect']);
    if (kind === undefined) {
        return {
            value: null,
            problems: problemAt(`${path}indirect`, `must be one of ${KINDS.join(', ')}`),
        };
    }
    const actor = readActor(step, path, kind, named);
    const order = readOrder(step, path, named.created);
    const label = readLabel(step, path, named.labels);
    const lateBy = readLateBy(step, path, kind);
    const problems = unknownFields(step, path, FIELDS_OF[kind]).concat(
        actor.problems,
        order.problems,
        label.problems,
        lateBy.problems,
    );
    if (!problems.isEmpty() || order.value === null || lateBy.value === null) {
        return { value: null, problems };
    }
    const value = statementOf({
        kind,
        order: order.value,
        label: label.value === null ? null : toIndirectLabel(label.value),
        actor: actor.value,
        lateBy: lateBy.value,
    });
    return { value, problems };
}

/**
 * The label of the indirect step an action follows from, if it names one, which an earlier step
 * must have given.
 */
export function readAfter(
    step: Fields,
    path: string,
    labels: ImmutableSet<string>,
): IReading<IndirectLabel> {
    if (step['after'] === undefined) {
        return { value: null, problems: NONE };
    }
    const after = readText(step, path, 'after');
    if (after.value === null) {
        return { value: null, problems: after.problems };
    }
    return labels.has(after.value)
        ? { value: toIndirectLabel(after.value), problems: NONE }
        : {
              value: null,
              problems: problemAt(
                  `${path}after`,
                  `"${after.value}" is not the label of an earlier indirect step`,
              ),
          };
}
