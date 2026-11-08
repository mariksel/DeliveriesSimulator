import type { FieldsOf } from '../system/classes/fields-of';
import type { RandomWord } from './numbers';
import type { Fraction } from '../system/math/math';
import { toRandomWord } from './numbers';
import { toFraction } from '../system/math/math';

/** How many values a 32-bit word can hold. */
export const TWO_32 = 4294967296;
const WORD_BITS = 32;
const SPLIT_MIX_GAMMA = 0x9e3779b9;
const SPLIT_MIX_MULTIPLIER_1 = 0xbf58476d;
const SPLIT_MIX_MULTIPLIER_2 = 0x94d049bb;
const SPLIT_MIX_SHIFT_1 = 15;
const SPLIT_MIX_SHIFT_2 = 12;
const SPLIT_MIX_SHIFT_3 = 15;
const OUTPUT_MULTIPLIER_1 = 5;
const OUTPUT_ROTATION = 7;
const OUTPUT_MULTIPLIER_2 = 9;
const STATE_SHIFT = 11;
const STATE_ROTATION = 11;

/** SplitMix32: spreads one number into the generator's starting state. */
function nextSplitMix(state: number): readonly [next: number, output: number] {
    const next = (state + SPLIT_MIX_GAMMA) | 0;
    const first = Math.imul(next ^ (next >>> SPLIT_MIX_SHIFT_1), SPLIT_MIX_MULTIPLIER_1);
    const second = Math.imul(first ^ (first >>> SPLIT_MIX_SHIFT_2), SPLIT_MIX_MULTIPLIER_2);
    return [next, (second ^ (second >>> SPLIT_MIX_SHIFT_3)) >>> 0];
}

const rotateLeft = (value: number, by: number): number =>
    (value << by) | (value >>> (WORD_BITS - by));

/** Where a fraction falls in a range of whole numbers, both ends included. */
export const scaleToRange = (fraction: Fraction, min: number, max: number): number =>
    min + Math.floor(fraction * (max - min + 1));

/** A number drawn, and the stream as it stands after the draw. */
export type RandomDraw<TValue extends number = number> = readonly [
    value: TValue,
    stream: RandomStream,
];

/**
 * Where one sequence of random numbers has got to, from xoshiro128**. Stored and golden runs
 * depend on this exact sequence, so changing the algorithm is a change to every run.
 */
export class RandomStream {
    /** A stream at its start, spread from one number. */
    static createNew(start: number): RandomStream {
        const [stateA, wordA] = nextSplitMix(start | 0);
        const [stateB, wordB] = nextSplitMix(stateA);
        const [stateC, wordC] = nextSplitMix(stateB);
        const [, wordD] = nextSplitMix(stateC);
        const secondWordA = toRandomWord(wordA);
        const secondWordB = toRandomWord(wordB);
        const secondWordC = toRandomWord(wordC);
        const secondWordD = toRandomWord(wordD);
        return new RandomStream(secondWordA, secondWordB, secondWordC, secondWordD);
    }

    /** A stream from its four words. */
    static create({ wordA, wordB, wordC, wordD }: FieldsOf<RandomStream>): RandomStream {
        return new RandomStream(wordA, wordB, wordC, wordD);
    }

    declare private readonly brand: never;

    private constructor(
        readonly wordA: RandomWord,
        readonly wordB: RandomWord,
        readonly wordC: RandomWord,
        readonly wordD: RandomWord,
    ) {
        Object.freeze(this);
    }

    /** The next whole number from 0 to 2^32 - 1. */
    nextUint32(): RandomDraw<RandomWord> {
        const { wordA, wordB, wordC, wordD } = this;
        const imul = Math.imul(wordB, OUTPUT_MULTIPLIER_1);
        const rotated = rotateLeft(imul, OUTPUT_ROTATION);
        const value = Math.imul(rotated, OUTPUT_MULTIPLIER_2);
        const mixedC = wordC ^ wordA;
        const mixedD = wordD ^ wordB;
        const nextD = rotateLeft(mixedD, STATE_ROTATION);
        const secondWordA = toRandomWord((wordA ^ mixedD) >>> 0);
        const secondWordB = toRandomWord((wordB ^ mixedC) >>> 0);
        const secondWordC = toRandomWord((mixedC ^ (wordB << STATE_SHIFT)) >>> 0);
        const secondWordD = toRandomWord(nextD >>> 0);
        const next = new RandomStream(secondWordA, secondWordB, secondWordC, secondWordD);
        const drawn = toRandomWord(value >>> 0);
        return [drawn, next];
    }

    /** A number from 0 up to, but not including, 1. */
    nextFraction(): RandomDraw<Fraction> {
        const [value, next] = this.nextUint32();
        const fraction = toFraction(value / TWO_32);
        return [fraction, next];
    }

    /** A whole number from min to max, both included. */
    nextBetween(min: number, max: number): RandomDraw {
        if (
            !Number.isSafeInteger(min) ||
            !Number.isSafeInteger(max) ||
            max < min ||
            max - min >= TWO_32
        ) {
            throw new RangeError(`Invalid range: ${min} to ${max}.`);
        }
        const [fraction, next] = this.nextFraction();
        return [scaleToRange(fraction, min, max), next];
    }
}
