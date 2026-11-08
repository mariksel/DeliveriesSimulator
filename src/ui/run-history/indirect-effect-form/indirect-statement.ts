import type { IndirectStatement } from '../../../application-core/simulation-engine/indirect-effect';
import { IndirectKind } from '../../../application-core/simulation-engine/indirect-effect';
import {
    toInputActor,
    toInputOrderName,
} from '../../../application-core/simulation-engine/run-input';
import { parseClockTime } from '../../../domain/simulation-engine/clock-time';
import { toDuration } from '../../../domain/system/time/duration';

/** Who and what the run's scenario names, which the form offers to choose from. */
export interface IIndirectNames {
    readonly drivers: readonly string[];
    readonly restaurants: readonly string[];
    readonly orders: readonly string[];
}

/** One kind of indirect effect, as the form offers it. */
export interface IIndirectChoice {
    readonly kind: IndirectKind;
    readonly label: string;
    /** Who decides: the scenario's drivers or restaurants, or nobody it names. */
    readonly actors: 'drivers' | 'restaurants' | null;
}

/** The kind the form starts with. */
export const FIRST_CHOICE: IIndirectChoice = {
    kind: IndirectKind.DriverIgnoresRequest,
    label: 'A driver ignores a request',
    actors: 'drivers',
};

/** The kinds the form offers, in words (FND-89). */
export const INDIRECT_CHOICES: readonly IIndirectChoice[] = [
    FIRST_CHOICE,
    {
        kind: IndirectKind.RestaurantRunsLate,
        label: 'A restaurant runs late',
        actors: 'restaurants',
    },
    {
        kind: IndirectKind.CustomerWontTakeOrder,
        label: "The customer won't take an order",
        actors: null,
    },
];

/** What the form holds when it is sent. */
export interface IIndirectFields {
    readonly kind: IndirectKind;
    readonly actor: string;
    readonly order: string;
    readonly lateBy: string;
}

/** What the form came to: a statement to make, or what is wrong. */
export type IndirectFormResult =
    | { readonly isOk: true; readonly statement: IndirectStatement }
    | { readonly isOk: false; readonly problem: string };

const refused = (problem: string): IndirectFormResult => ({ isOk: false, problem });

/** The choice for a kind, or the first when the text names none. */
export function choiceOf(kind: string): IIndirectChoice {
    const found = INDIRECT_CHOICES.find((choice) => choice.kind === kind);
    return found ?? FIRST_CHOICE;
}

/** Who can decide, for a kind: the scenario's drivers or restaurants, or nobody. */
export function actorsFor(kind: IndirectKind, names: IIndirectNames): readonly string[] {
    const { actors } = choiceOf(kind);
    return actors === null ? [] : names[actors];
}

/** How much later a late restaurant expects the order ready, or null when it is not a time. */
function lateByOf(text: string): number | null {
    const trimmed = text.trim();
    const milliseconds = parseClockTime(trimmed);
    return milliseconds === null || milliseconds <= 0 ? null : milliseconds;
}

/**
 * The statement the form's fields make, stated by hand, so with no label, or what is wrong with
 * them.
 */
export function indirectStatementOf(fields: IIndirectFields): IndirectFormResult {
    if (fields.order === '') {
        return refused('Choose an order.');
    }
    const order = toInputOrderName(fields.order);
    if (fields.kind === IndirectKind.CustomerWontTakeOrder) {
        return { isOk: true, statement: { kind: fields.kind, order, label: null } };
    }
    if (fields.actor === '') {
        return refused('Choose who decides.');
    }
    const actor = toInputActor(fields.actor);
    if (fields.kind === IndirectKind.DriverIgnoresRequest) {
        return { isOk: true, statement: { kind: fields.kind, order, label: null, actor } };
    }
    const lateBy = lateByOf(fields.lateBy);
    if (lateBy === null) {
        return refused('How much later is a time above none, such as h00:m01:s30:ms00.');
    }
    const duration = toDuration(lateBy);
    const statement = { kind: fields.kind, order, label: null, actor, lateBy: duration };
    return { isOk: true, statement };
}
