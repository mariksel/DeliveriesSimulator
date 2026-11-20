import type { Coordinates } from '../../map-and-routing/coordinates';
import type { DriverId } from '../driver';

/** A location one driver's app sent, as one of the sends the service receives at once (FND-90). */
export interface ISentLocation {
    readonly driverId: DriverId;
    readonly coordinates: Coordinates;
}
