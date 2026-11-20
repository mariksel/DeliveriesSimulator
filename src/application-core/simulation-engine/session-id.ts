import type { Count } from '../../domain/system/math/math';
import { toCount } from '../../domain/system/math/math';

/** Identifies a job run or API call, which groups the commits made during it. */
export type SessionId = string & { readonly brand: 'SessionId' };
/** Makes a {@link SessionId} from a string. */
export const toSessionId = (value: string): SessionId => value as SessionId;

const PREFIX = 'session-';

/** The ID of a line's job run or API call by its number, counting from 1 along the line. */
export const sessionIdOf = (number: Count): SessionId => toSessionId(`${PREFIX}${number}`);

/** A job run's or API call's number along its line, which its ID holds. */
export function sessionNumberOf(id: SessionId): Count {
    const digits = id.slice(PREFIX.length);
    const number = Number(digits);
    return toCount(number);
}
