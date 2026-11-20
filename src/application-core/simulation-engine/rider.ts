import type { DriverId } from '../../domain/drivers/driver';
import { Duration } from '../../domain/system/time/duration';

/**
 * A driver as the simulator rides them, outside the service: how often their app sends its
 * location while they are online, and how fast they ride (FND-90). It is the simulated actor's,
 * so it sits in the run's script, not in the service's records.
 */
export interface IRider {
    readonly driverId: DriverId;
    /** How long the app waits between two locations it sends. */
    readonly sendEvery: Duration;
    /** How fast the driver rides along the streets, in kilometres an hour. */
    readonly speedKmh: number;
    /**
     * Set for a driver in a run saved before waiting points, who stays where their last stop left
     * them, so the run goes on as it was run (FND-90).
     */
    readonly isStayingWhenIdle?: true;
}

const DEFAULT_SEND_EVERY_SECONDS = 30;

/** An app sends its location every 30 seconds unless a scenario says otherwise (FND-90). */
export const DEFAULT_SEND_EVERY = Duration.ofSeconds(DEFAULT_SEND_EVERY_SECONDS);

/** A driver rides at 20 km/h unless a scenario says otherwise: the speed V1.0.0 assumes. */
export const DEFAULT_SPEED_KMH = 20;
