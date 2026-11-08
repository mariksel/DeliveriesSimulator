/** Identifies a job run or API call, which groups the commits made during it. */
export type SessionId = string & { readonly brand: 'SessionId' };
/** Makes a {@link SessionId} from a string. */
export const toSessionId = (value: string): SessionId => value as SessionId;
