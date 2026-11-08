import { List, Set as ImmutableSet } from 'immutable';

import { toAreaId } from '../../domain/map-and-routing/area-id';
import { toDriverId } from '../../domain/drivers/driver';
import { toRestaurantId } from '../../domain/restaurants/restaurant-place';
import {
    toScenarioActor,
    toScenarioOrderName,
} from '../../application-core/scenarios/scripted-step';
import { toVersionId } from '../../domain/versions/version-id';
import { DriverLocation, NewDriver } from '../../domain/drivers/driver';
import { RestaurantPlace } from '../../domain/restaurants/restaurant-place';
import { DriverAvailability } from '../../domain/drivers/driver-availability';
import { ScriptedCommand } from '../../application-core/scenarios/scripted-command';
import type { ScenarioStep } from '../../application-core/scenarios/scripted-step';
import { readRuleSettings } from './read-rule-settings';
import { readAfter, readIndirectStep } from './read-indirect-step';
import type { IScenarioProblem, ScenarioResult } from '../../application-core/scenarios/scenario';
import { problemAt } from '../../application-core/scenarios/scenario';
import type { Fields, IReading } from './scenario-reader';
import {
    isFields,
    readClockTime,
    readCoordinates,
    readList,
    readText,
    unknownFields,
} from './scenario-reader';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';

/** The version of the scenario format that this code reads. */
export const SCENARIO_FORMAT = 1;

const RESTAURANT_COMMANDS: readonly ScriptedCommand[] = [
    ScriptedCommand.CreateOrder,
    ScriptedCommand.RequestDelivery,
    ScriptedCommand.MarkReady,
];

const COMMANDS = Object.values(ScriptedCommand);

const OFFLINE = 'Offline';

const AVAILABILITIES: readonly (typeof OFFLINE | DriverAvailability)[] = [
    OFFLINE,
    ...Object.values(DriverAvailability),
];

const VERSION = /^V\d+\.\d+\.\d+(-[a-z0-9-]+)?$/;

const MAX_SEED = 4294967295;

const NONE = List<IScenarioProblem>();

/** Something read from a list in the file, with its place there. */
interface IReadEntry<T> {
    readonly value: T | null;
    readonly path: string;
}

interface IHasId {
    readonly id: string;
}

/** The restaurants and drivers a step may name. */
interface IKnownActors {
    readonly restaurants: ImmutableSet<string>;
    readonly drivers: ImmutableSet<string>;
}

/** How far reading the steps has got. */
interface IStepsSoFar {
    readonly steps: List<ScenarioStep>;
    readonly problems: List<IScenarioProblem>;
    readonly warnings: List<IScenarioProblem>;
    readonly created: ImmutableSet<string>;
    /** The labels indirect steps have given, which a later action may follow from (FND-89). */
    readonly labels: ImmutableSet<string>;
    /** The time the next step must not be before. */
    readonly previous: number;
}

function readRestaurant(fields: Fields, path: string): IReading<RestaurantPlace> {
    const id = readText(fields, path, 'id');
    const areaId = readText(fields, path, 'area');
    const coordinates = readCoordinates(fields, path);
    return {
        value:
            id.value !== null && areaId.value !== null && coordinates.value !== null
                ? RestaurantPlace.create({
                      id: toRestaurantId(id.value),
                      areaId: toAreaId(areaId.value),
                      coordinates: coordinates.value,
                  })
                : null,
        problems: unknownFields(fields, path, ['id', 'area', 'location']).concat(
            id.problems,
            areaId.problems,
            coordinates.problems,
        ),
    };
}

function readLocation(fields: Fields, path: string): IReading<DriverLocation> {
    const hasLocation = fields['location'] !== undefined;
    if (hasLocation !== (fields['locatedAt'] !== undefined)) {
        return {
            value: null,
            problems: problemAt(
                `${path}${hasLocation ? 'locatedAt' : 'location'}`,
                'is missing: a location and its time go together',
            ),
        };
    }
    if (!hasLocation) {
        return { value: null, problems: NONE };
    }
    const coordinates = readCoordinates(fields, path);
    const deviceTime = readClockTime(fields, path, 'locatedAt');
    return {
        value:
            coordinates.value !== null && deviceTime.value !== null
                ? DriverLocation.create({
                      coordinates: coordinates.value,
                      deviceTime: toSimTime(deviceTime.value),
                  })
                : null,
        problems: coordinates.problems.concat(deviceTime.problems),
    };
}

function readDriver(fields: Fields, path: string): IReading<NewDriver> {
    const id = readText(fields, path, 'id');
    const areaId = readText(fields, path, 'area');
    const availability = fields['availability'];
    const validAvailability = AVAILABILITIES.find((option) => option === availability);
    const location = readLocation(fields, path);
    return {
        value:
            id.value !== null && areaId.value !== null && validAvailability !== undefined
                ? NewDriver.create({
                      id: toDriverId(id.value),
                      areaId: toAreaId(areaId.value),
                      availability: validAvailability === OFFLINE ? null : validAvailability,
                      location: location.value,
                  })
                : null,
        problems: unknownFields(fields, path, [
            'id',
            'area',
            'availability',
            'location',
            'locatedAt',
        ]).concat(
            id.problems,
            areaId.problems,
            validAvailability === undefined
                ? problemAt(`${path}availability`, `must be one of ${AVAILABILITIES.join(', ')}`)
                : NONE,
            location.problems,
        ),
    };
}

function duplicates(entries: List<IReadEntry<IHasId>>): List<IScenarioProblem> {
    const found = entries.reduce(
        (soFar, { value, path }) => {
            if (value === null) {
                return soFar;
            }
            const seen = soFar.seen.add(value.id);
            if (!soFar.seen.has(value.id)) {
                return { seen, problems: soFar.problems };
            }
            const repeated = problemAt(`${path}id`, `repeats "${value.id}"`);
            return { seen, problems: soFar.problems.concat(repeated) };
        },
        { seen: ImmutableSet<string>(), problems: NONE },
    );
    return found.problems;
}

function stepTimeProblems(
    path: string,
    at: number | null,
    previous: number,
    runUntil: number | null,
): List<IScenarioProblem> {
    if (at === null) {
        return NONE;
    }
    return (
        at < previous
            ? problemAt(`${path}at`, 'is before the step above it: steps must be in time order')
            : NONE
    ).concat(
        runUntil !== null && at > runUntil ? problemAt(`${path}at`, 'is after runUntil') : NONE,
    );
}

function stepActorProblems(
    path: string,
    command: ScriptedCommand | undefined,
    actor: string | null,
    known: IKnownActors,
): List<IScenarioProblem> {
    if (command === undefined || actor === null) {
        return NONE;
    }
    const isRestaurantCommand = RESTAURANT_COMMANDS.includes(command);
    if (isRestaurantCommand && !known.restaurants.has(actor)) {
        return problemAt(`${path}actor`, `must be a restaurant for ${command}`);
    }
    return !isRestaurantCommand && !known.drivers.has(actor)
        ? problemAt(`${path}actor`, `must be a driver for ${command}`)
        : NONE;
}

function stepOrderProblems(
    path: string,
    command: ScriptedCommand | undefined,
    order: string | null,
    created: ImmutableSet<string>,
): List<IScenarioProblem> {
    if (command === undefined || order === null) {
        return NONE;
    }
    if (command === ScriptedCommand.CreateOrder) {
        return created.has(order)
            ? problemAt(`${path}order`, `"${order}" is already created`)
            : NONE;
    }
    return created.has(order)
        ? NONE
        : problemAt(`${path}order`, `"${order}" is not created by an earlier step`);
}

/** Reads a step that changes rules at its time, in place of an action (FND-84). */
function readRulesStep(
    soFar: IStepsSoFar,
    step: Fields,
    path: string,
    runUntil: number | null,
): IStepsSoFar {
    const at = readClockTime(step, path, 'at');
    const settings = readRuleSettings(step, path, 'set', true);
    const timeProblems = stepTimeProblems(path, at.value, soFar.previous, runUntil);
    const problems = unknownFields(step, path, ['at', 'set']).concat(
        at.problems,
        timeProblems,
        settings.problems,
    );
    return {
        ...soFar,
        steps:
            at.value !== null && settings.problems.isEmpty()
                ? soFar.steps.push({ at: toSimTime(at.value), set: settings.changes })
                : soFar.steps,
        problems: soFar.problems.concat(problems),
        warnings: soFar.warnings.concat(settings.warnings),
        previous: Math.max(soFar.previous, at.value ?? soFar.previous),
    };
}

/** Reads a step that states an indirect effect at its time, in place of an action (FND-89). */
function readIndirect(
    soFar: IStepsSoFar,
    step: Fields,
    path: string,
    known: IKnownActors,
    runUntil: number | null,
): IStepsSoFar {
    const at = readClockTime(step, path, 'at');
    const named = { ...known, created: soFar.created, labels: soFar.labels };
    const statement = readIndirectStep(step, path, named);
    const timeProblems = stepTimeProblems(path, at.value, soFar.previous, runUntil);
    const problems = at.problems.concat(timeProblems, statement.problems);
    const label = statement.value?.label ?? null;
    return {
        ...soFar,
        steps:
            at.value !== null && statement.value !== null
                ? soFar.steps.push({ at: toSimTime(at.value), indirect: statement.value })
                : soFar.steps,
        problems: soFar.problems.concat(problems),
        labels: label === null ? soFar.labels : soFar.labels.add(label),
        previous: Math.max(soFar.previous, at.value ?? soFar.previous),
    };
}

/** Reads a step: an action, rules to change, or an indirect effect. */
function readStep(
    soFar: IStepsSoFar,
    step: Fields,
    path: string,
    known: IKnownActors,
    runUntil: number | null,
): IStepsSoFar {
    if (step['set'] !== undefined) {
        return readRulesStep(soFar, step, path, runUntil);
    }
    if (step['indirect'] !== undefined) {
        return readIndirect(soFar, step, path, known, runUntil);
    }
    return readAction(soFar, step, path, known, runUntil);
}

/** Reads an action by a restaurant or a driver, which may follow from an indirect step. */
function readAction(
    soFar: IStepsSoFar,
    step: Fields,
    path: string,
    known: IKnownActors,
    runUntil: number | null,
): IStepsSoFar {
    const at = readClockTime(step, path, 'at');
    const actor = readText(step, path, 'actor');
    const order = readText(step, path, 'order');
    const command = COMMANDS.find((option) => option === step['command']);
    const valuesOrCollections = stepTimeProblems(path, at.value, soFar.previous, runUntil);
    const scenarioProblems = stepActorProblems(path, command, actor.value, known);
    const secondScenarioProblems = stepOrderProblems(path, command, order.value, soFar.created);
    const after = readAfter(step, path, soFar.labels);
    const fields = ['at', 'actor', 'command', 'order', 'after'];
    const problems = unknownFields(step, path, fields).concat(
        after.problems,
        at.problems,
        actor.problems,
        order.problems,
        command === undefined
            ? problemAt(`${path}command`, `must be one of ${COMMANDS.join(', ')}`)
            : NONE,
        valuesOrCollections,
        scenarioProblems,
        secondScenarioProblems,
    );
    return {
        ...soFar,
        steps:
            at.value !== null &&
            actor.value !== null &&
            order.value !== null &&
            command !== undefined
                ? soFar.steps.push({
                      at: toSimTime(at.value),
                      actor: toScenarioActor(actor.value),
                      command,
                      order: toScenarioOrderName(order.value),
                      ...(after.value === null ? {} : { after: after.value }),
                  })
                : soFar.steps,
        problems: soFar.problems.concat(problems),
        created:
            command === ScriptedCommand.CreateOrder && order.value !== null
                ? soFar.created.add(order.value)
                : soFar.created,
        previous: Math.max(soFar.previous, at.value ?? soFar.previous),
    };
}

function readSteps(fields: Fields, known: IKnownActors, runUntil: number | null): IStepsSoFar {
    const list = readList(fields, 'steps');
    return list.entries.reduce<IStepsSoFar>(
        (soFar, [step, path]) => readStep(soFar, step, path, known, runUntil),
        {
            steps: List(),
            problems: list.problems,
            warnings: NONE,
            created: ImmutableSet(),
            labels: ImmutableSet(),
            previous: 0,
        },
    );
}

function readVersion(value: Fields): IReading<string> {
    const version = readText(value, '', 'version');
    return version.value !== null && !VERSION.test(version.value)
        ? { value: version.value, problems: problemAt('version', 'must be a version like V1.0.0') }
        : version;
}

function readSeed(value: Fields): IReading<number> {
    const seed = value['seed'];
    return typeof seed === 'number' && Number.isInteger(seed) && seed >= 0 && seed <= MAX_SEED
        ? { value: seed, problems: NONE }
        : {
              value: null,
              problems: problemAt('seed', `must be a whole number from 0 to ${MAX_SEED}`),
          };
}

/**
 * Everything read from one list in the file: its entries, and what is wrong with the list and each
 * entry.
 */
function readEntries<T>(
    value: Fields,
    key: string,
    read: (fields: Fields, path: string) => IReading<T>,
): { readonly entries: List<IReadEntry<T>>; readonly problems: List<IScenarioProblem> } {
    const list = readList(value, key);
    const readings = list.entries.map(([fields, path]) => ({ reading: read(fields, path), path }));
    const valuesOrCollections = readings.flatMap(({ reading }) => reading.problems);
    return {
        entries: readings.map(({ reading, path }) => ({ value: reading.value, path })),
        problems: list.problems.concat(valuesOrCollections),
    };
}

const present = <T>(entries: List<IReadEntry<T>>): List<T> =>
    entries.flatMap(({ value }) => (value === null ? [] : [value]));

const readDescription = (value: Fields): IReading<string> =>
    value['description'] === undefined
        ? { value: null, problems: NONE }
        : readText(value, '', 'description');

const topLevelProblems = (value: Fields): List<IScenarioProblem> =>
    unknownFields(value, '', [
        'format',
        'name',
        'description',
        'version',
        'seed',
        'runUntil',
        'restaurants',
        'drivers',
        'rules',
        'steps',
    ]).concat(
        value['format'] === SCENARIO_FORMAT
            ? NONE
            : problemAt('format', `must be ${SCENARIO_FORMAT}`),
    );

/**
 * Checks that a value read from JSON is a well-formed scenario. Says everything that is wrong with
 * it.
 */
export function readScenario(value: unknown): ScenarioResult {
    if (!isFields(value)) {
        return {
            isOk: false,
            problems: problemAt('', 'a scenario must be an object with fields'),
        };
    }
    const name = readText(value, '', 'name');
    const description = readDescription(value);
    const version = readVersion(value);
    const seed = readSeed(value);
    const runUntil = readClockTime(value, '', 'runUntil');
    const restaurantEntries = readEntries(value, 'restaurants', readRestaurant);
    const driverEntries = readEntries(value, 'drivers', readDriver);
    const restaurants = present(restaurantEntries.entries);
    const drivers = present(driverEntries.entries);
    const secondRestaurants = restaurants.map((restaurant) => restaurant.id);
    const secondDrivers = drivers.map((driver) => driver.id);
    const steps = readSteps(
        value,
        {
            restaurants: ImmutableSet(secondRestaurants),
            drivers: ImmutableSet(secondDrivers),
        },
        runUntil.value,
    );
    const rules = readRuleSettings(value, '', 'rules', false);
    const valuesOrCollections = duplicates(restaurantEntries.entries);
    const scenarioProblems = duplicates(driverEntries.entries);
    const problems = topLevelProblems(value).concat(
        name.problems,
        description.problems,
        version.problems,
        seed.problems,
        runUntil.problems,
        restaurantEntries.problems,
        driverEntries.problems,
        valuesOrCollections,
        scenarioProblems,
        rules.problems,
        steps.problems,
    );
    if (
        problems.size > 0 ||
        name.value === null ||
        version.value === null ||
        seed.value === null ||
        runUntil.value === null
    ) {
        return { isOk: false, problems };
    }
    return {
        isOk: true,
        scenario: {
            name: name.value,
            description: description.value,
            version: toVersionId(version.value),
            seed: toSeed(seed.value),
            runUntil: toSimTime(runUntil.value),
            start: { restaurants, drivers, rules: rules.changes },
            steps: steps.steps,
        },
        warnings: rules.warnings.concat(steps.warnings),
    };
}
