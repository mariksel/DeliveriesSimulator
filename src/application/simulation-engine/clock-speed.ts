import type { SpeedMultiple } from '../../domain/simulation-engine/numbers';
import { toSpeedMultiple } from '../../domain/simulation-engine/numbers';

/** The speed that jumps from one piece of work to the next without waiting. */
export const MAX_SPEED = 'max';

/** A multiple of real time, or {@link MAX_SPEED}. */
export type ClockSpeed = SpeedMultiple | typeof MAX_SPEED;

const SECONDS_PER_MINUTE = 60;

/** One simulated minute per real second. An interactive run starts at this speed. */
export const DEFAULT_SPEED: ClockSpeed = toSpeedMultiple(SECONDS_PER_MINUTE);
