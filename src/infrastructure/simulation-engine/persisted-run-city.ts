import { persistedCityAround } from '../map-and-routing/city-around-records';
import type { IPersistedRun } from './persisted-run';

/**
 * A persisted run with a city in its script. One saved before runs had cities gets one square
 * area around its restaurants and starting drivers, named as the one area they use; one whose
 * places use several areas is refused, saying why (FND-90).
 */
export function withPersistedCity(run: IPersistedRun): IPersistedRun {
    if (run.script.city !== undefined) {
        return run;
    }
    const restaurants = run.script.restaurants.map(({ areaId, coordinates }) => ({
        areaId,
        coordinates,
    }));
    const { driverVersions, locations } = run.start.state.drivers;
    const drivers = driverVersions.map(({ driverId, areaId }) => ({
        areaId,
        coordinates:
            locations.find((location) => location.driverId === driverId)?.coordinates ?? null,
    }));
    const city = persistedCityAround([...restaurants, ...drivers], 'This saved run');
    return { ...run, script: { ...run.script, city } };
}
