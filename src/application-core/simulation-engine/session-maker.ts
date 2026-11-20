import type { Maker } from '../../domain/system/records/maker';
import { required } from '../../domain/system/validation/required';
import type { ICommitLine } from './commit-line';

/**
 * The maker of the versions a call makes now: the job run or API call under way, made once when
 * it opened. A state function that makes versions is only ever called inside one (FND-81).
 */
export function sessionMaker(line: ICommitLine): Maker {
    const session = required(line.session, 'the job run or API call under way');
    return session.maker;
}
