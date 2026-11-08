/** Whoever gives an input to a run, by the name the input gives it. */
export type InputActor = string & { readonly brand: 'InputActor' };
/** Marks text as the name of whoever gives an input to a run. */
export const toInputActor = (value: string): InputActor => value as InputActor;

/** An input's own name for an order. The run gives the order its real ID when it is made. */
export type InputOrderName = string & { readonly brand: 'InputOrderName' };
/** Marks text as an input's own name for an order. */
export const toInputOrderName = (value: string): InputOrderName => value as InputOrderName;

/** A name an input gives an indirect effect, so that a later input can follow from it. */
export type IndirectLabel = string & { readonly brand: 'IndirectLabel' };
/** Marks text as the name an input gives an indirect effect. */
export const toIndirectLabel = (value: string): IndirectLabel => value as IndirectLabel;
