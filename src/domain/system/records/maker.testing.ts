import { Maker, toWorkId } from './maker';

const TEST_WORK = toWorkId('work-test');

/** A maker for tests that make versions outside a run. */
export const TEST_MAKER = Maker.work(TEST_WORK);
