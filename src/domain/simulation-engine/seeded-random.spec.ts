import { describe, expect, it } from 'vitest';

import type { RandomDraw } from './random-stream';
import { RandomStream, scaleToRange, TWO_32 } from './random-stream';
import { SeededRandom } from './seeded-random';
import { toRandomWord, toSeed } from './numbers';
import { toFraction } from '../system/math/math';

const uint32 = (stream: RandomStream): RandomDraw => stream.nextUint32();
const fraction = (stream: RandomStream): RandomDraw => stream.nextFraction();

/**
 * Draws from a stream many times, threading it through, and gives the values and where it ended.
 */
function drawMany(
    start: RandomStream,
    count: number,
    draw: (stream: RandomStream) => RandomDraw,
): { values: number[]; stream: RandomStream } {
    const values: number[] = [];
    let stream = start;
    for (let index = 0; index < count; index++) {
        const [value, next] = draw(stream);
        values.push(value);
        stream = next;
    }
    return { values, stream };
}

function take(random: SeededRandom, name: string, count: number): number[] {
    const start = random.streamOf(name);
    return drawMany(start, count, uint32).values;
}

/** Draws from a named stream, and gives the values and the randomness after them. */
function takeInto(
    start: SeededRandom,
    name: string,
    count: number,
): { values: number[]; random: SeededRandom } {
    const values: number[] = [];
    let random = start;
    for (let index = 0; index < count; index++) {
        const [value, next] = random.drawFrom(name, uint32);
        values.push(value);
        random = next;
    }
    return { values, random };
}

describe('the seeded random numbers', () => {
    // From a separate implementation. Stored and golden runs depend on these exact numbers.
    it.each<[number, string, number[]]>([
        [42, 'driver:17', [2244238117, 203850833, 1983477408, 2672135486, 4242512953, 4273160263]],
        [
            42,
            'restaurant:3',
            [671560404, 4174649364, 156868204, 956801393, 3393123275, 1376565918],
        ],
        [0, '', [2256143385, 4281914685, 940484069]],
        [4294967295, 'orders', [4002251600, 2659222076, 3413533175]],
    ])('gives the pinned sequence for seed %i and stream "%s"', (seed, name, expected) => {
        const secondSeed = toSeed(seed);
        const random = SeededRandom.createNew(secondSeed);
        const secondTake = take(random, name, expected.length);
        expect(secondTake).toEqual(expected);
    });

    it('repeats exactly from the same seed', () => {
        const seed = toSeed(7);
        const random = SeededRandom.createNew(seed);
        const secondSeed = toSeed(7);
        const secondRandom = SeededRandom.createNew(secondSeed);
        const secondTake = take(random, 'a', 100);
        const expected = take(secondRandom, 'a', 100);
        expect(secondTake).toEqual(expected);
    });

    it('differs between seeds, and between streams', () => {
        const seed = toSeed(7);
        const random = SeededRandom.createNew(seed);
        const base = take(random, 'a', 10);

        const secondSeed = toSeed(8);
        const secondRandom = SeededRandom.createNew(secondSeed);
        const secondTake = take(secondRandom, 'a', 10);
        expect(secondTake).not.toEqual(base);
        const thirdSeed = toSeed(7);
        const thirdRandom = SeededRandom.createNew(thirdSeed);
        const thirdTake = take(thirdRandom, 'b', 10);
        expect(thirdTake).not.toEqual(base);
    });

    it('keeps one stream for one name, carrying on where it left off', () => {
        const seed = toSeed(7);
        const start = SeededRandom.createNew(seed);
        const into = takeInto(start, 'a', 3);

        const rest = takeInto(into.random, 'a', 3);

        const secondSeed = toSeed(7);
        const random = SeededRandom.createNew(secondSeed);
        const expected = take(random, 'a', 6);
        expect([...into.values, ...rest.values]).toEqual(expected);
    });

    it('leaves the randomness it was given where it was, so a snapshot can draw the same again', () => {
        const seed = toSeed(7);
        const random = SeededRandom.createNew(seed);
        const start = takeInto(random, 'a', 3).random;

        const once = takeInto(start, 'a', 3).values;
        const again = takeInto(start, 'a', 3).values;

        expect(again).toEqual(once);
    });

    it('leaves other streams unchanged by an extra draw', () => {
        const seed = toSeed(7);
        const start = SeededRandom.createNew(seed);
        const busy = takeInto(start, 'driver:17', 1000).random;

        const secondTake = take(busy, 'driver:18', 20);
        const secondSeed = toSeed(7);
        const random = SeededRandom.createNew(secondSeed);
        const expected = take(random, 'driver:18', 20);
        expect(secondTake).toEqual(expected);
    });

    it('does not depend on the order streams are first used in', () => {
        const seed = toSeed(7);
        const start = SeededRandom.createNew(seed);
        const oneThenTwo = takeInto(start, 'a', 5);

        const second = takeInto(oneThenTwo.random, 'b', 5).values;

        const secondSeed = toSeed(7);
        const random = SeededRandom.createNew(secondSeed);
        const secondTake = take(random, 'b', 5);
        expect(secondTake).toEqual(second);
        const thirdSeed = toSeed(7);
        const secondRandom = SeededRandom.createNew(thirdSeed);
        const thirdTake = take(secondRandom, 'a', 5);
        expect(thirdTake).toEqual(oneThenTwo.values);
    });

    it('gives numbers from 0 up to, but not including, 1, spread evenly', () => {
        const seed = toSeed(1);
        const random = SeededRandom.createNew(seed);
        const start = random.streamOf('a');
        const { values } = drawMany(start, 10000, fraction);

        const min = Math.min(...values);
        expect(min).toBeGreaterThanOrEqual(0);
        const max = Math.max(...values);
        expect(max).toBeLessThan(1);
        expect(values.reduce((sum, value) => sum + value, 0) / values.length).toBeCloseTo(0.5, 1);
    });

    it('stays inside a range at the largest possible draw', () => {
        const fraction = toFraction((TWO_32 - 1) / TWO_32);
        const secondScaleToRange = scaleToRange(fraction, 3, 7);
        expect(secondScaleToRange).toBe(7);
    });

    it('allows the widest range', () => {
        const seed = toSeed(1);
        const random = SeededRandom.createNew(seed);
        const stream = random.streamOf('a');
        const [value] = stream.nextBetween(0, 4294967295);

        expect(value).toBeGreaterThanOrEqual(0);
    });

    it('gives whole numbers in a range, including both ends', () => {
        const seed = toSeed(1);
        const random = SeededRandom.createNew(seed);
        const start = random.streamOf('a');
        const { values } = drawMany(start, 2000, (stream) => stream.nextBetween(3, 7));

        const sort = [...new Set(values)].sort();
        expect(sort).toEqual([3, 4, 5, 6, 7]);
    });

    it('gives the only number in a range of one', () => {
        const seed = toSeed(1);
        const random = SeededRandom.createNew(seed);
        const stream = random.streamOf('a');
        const [value] = stream.nextBetween(5, 5);

        expect(value).toBe(5);
    });

    it.each<[number, number]>([
        [2, 1],
        [0.5, 1],
        [0, Number.POSITIVE_INFINITY],
        [0, 4294967296],
        [-5, 4294967295],
    ])('refuses the range %s to %s', (min, max) => {
        expect(() => {
            const seed = toSeed(1);
            const random = SeededRandom.createNew(seed);
            const stream = random.streamOf('a');
            return stream.nextBetween(min, max);
        }).toThrow(RangeError);
    });

    it('cannot change, and draws into a new instance', () => {
        const seed = toSeed(1);
        const random = SeededRandom.createNew(seed);
        const [, after] = random.drawFrom('a', uint32);

        const isFrozen = Object.isFrozen(random);
        expect(isFrozen).toBe(true);
        expect(after).toBeInstanceOf(SeededRandom);
        expect(random.streams.size).toBe(0);
        const drawn = after.streams.get('a');
        expect(drawn).toBeInstanceOf(RandomStream);
    });

    it('rebuilds a stream from its four words, which must each fit 32 bits', () => {
        const stream = RandomStream.create({
            wordA: toRandomWord(1),
            wordB: toRandomWord(2),
            wordC: toRandomWord(3),
            wordD: toRandomWord(4294967295),
        });

        expect(stream).toMatchObject({ wordA: 1, wordB: 2, wordC: 3, wordD: 4294967295 });
        expect(() =>
            RandomStream.create({
                wordA: toRandomWord(-1),
                wordB: toRandomWord(0),
                wordC: toRandomWord(0),
                wordD: toRandomWord(0),
            }),
        ).toThrow(RangeError);
        expect(() =>
            RandomStream.create({
                wordA: toRandomWord(0),
                wordB: toRandomWord(0),
                wordC: toRandomWord(0),
                wordD: toRandomWord(4294967296),
            }),
        ).toThrow(RangeError);
    });

    it('keeps every word of a drawn stream in 32 bits', () => {
        const seed = toSeed(42);
        const random = SeededRandom.createNew(seed);
        const start = random.streamOf('driver:17');
        const { stream } = drawMany(start, 50, uint32);

        const words = [stream.wordA, stream.wordB, stream.wordC, stream.wordD];
        const rebuilt = RandomStream.create({
            wordA: stream.wordA,
            wordB: stream.wordB,
            wordC: stream.wordC,
            wordD: stream.wordD,
        });
        const isEveryWordIn32Bits = words.every((word) => word >= 0 && word < TWO_32);
        expect(isEveryWordIn32Bits).toBe(true);
        expect(rebuilt).toEqual(stream);
    });

    it('rebuilds randomness from a seed and its streams, refusing a bad seed', () => {
        const seed = toSeed(3);
        const random = SeededRandom.createNew(seed);
        const [, after] = random.drawFrom('a', uint32);

        const rebuilt = SeededRandom.create({ seed: after.seed, streams: after.streams });
        expect(rebuilt).toEqual(after);
        expect(() => SeededRandom.create({ seed: toSeed(-1), streams: after.streams })).toThrow(
            RangeError,
        );
    });

    it("draws a fraction as System's random source, one stream at a time", () => {
        const seed = toSeed(7);
        const random = SeededRandom.createNew(seed);
        const [value, after] = random.nextFraction('a');
        const [again] = random.nextFraction('a');
        const [other] = after.nextFraction('b');

        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
        expect(again).toBe(value);
        const hasStream = after.streams.has('a');
        expect(hasStream).toBe(true);
        expect(other).toBeLessThan(1);
    });
});
