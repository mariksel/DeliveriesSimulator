import type { IndirectStatement } from '../../../application-core/simulation-engine/indirect-effect';
import { IndirectKind } from '../../../application-core/simulation-engine/indirect-effect';
import type { IndirectLabel } from '../../../application-core/simulation-engine/run-input';
import {
    toIndirectLabel,
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
    /** A label a later step can follow from, or blank for none (FND-89). */
    readonly label: string;
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

/** The label typed, or null when blank, or what is wrong: one the run already uses (FND-89). */
function labelOf(
    text: string,
    usedLabels: readonly string[],
): { readonly label: IndirectLabel | null } | { readonly problem: string } {
    const trimmed = text.trim();
    if (trimmed === '') {
        return { label: null };
    }
    if (usedLabels.includes(trimmed)) {
        return { problem: `The label "${trimmed}" is already used in this run.` };
    }
    return { label: toIndirectLabel(trimmed) };
}

/**
 * The statement the form's fields make, stated by hand, with the label typed if any, or what is
 * wrong with them, such as a label the run already uses, scripted or by hand (FND-89).
 */
export function indirectStatementOf(
    fields: IIndirectFields,
    usedLabels: readonly string[] = [],
): IndirectFormResult {
    if (fields.order === '') {
        return refused('Choose an order.');
    }
    const labelled = labelOf(fields.label, usedLabels);
    if ('problem' in labelled) {
        return refused(labelled.problem);
    }
    const { label } = labelled;
    const order = toInputOrderName(fields.order);
    if (fields.kind === IndirectKind.CustomerWontTakeOrder) {
        return { isOk: true, statement: { kind: fields.kind, order, label } };
    }
    if (fields.actor === '') {
        return refused('Choose who decides.');
    }
    const actor = toInputActor(fields.actor);
    if (fields.kind === IndirectKind.DriverIgnoresRequest) {
        return { isOk: true, statement: { kind: fields.kind, order, label, actor } };
    }
    const lateBy = lateByOf(fields.lateBy);
    if (lateBy === null) {
        return refused('How much later is a time above none, such as h00:m01:s30:ms00.');
    }
    const duration = toDuration(lateBy);
    const statement = { kind: fields.kind, order, label, actor, lateBy: duration };
    return { isOk: true, statement };
}
