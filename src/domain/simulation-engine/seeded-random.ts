import { OrderedMap } from 'immutable';

import type { FieldsOf } from '../system/classes/fields-of';
import type { Seed } from './numbers';
import type { RandomDraw } from './random-stream';
import { RandomStream } from './random-stream';
import type { Fraction } from '../system/math/math';
import type { IRandomSource } from '../system/randomness/random-source';

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const SEED_MULTIPLIER = 0x9e3779b1;

/** FNV-1a: turns a stream's name into a number. */
const hashName = (name: string): number =>
    Array.from({ length: name.length }, (_unused, index) => name.charCodeAt(index)).reduce(
        (hash, code) => Math.imul(hash ^ code, FNV_PRIME),
        FNV_OFFSET,
    ) >>> 0;

/**
 * All of a run's randomness. Each actor or purpose draws from its own named stream, so an extra
 * draw in one stream leaves every other stream unchanged, and versions compare cleanly.
 */
export class SeededRandom implements IRandomSource {
    /** A run's randomness at its start, from its seed. */
    static createNew(seed: Seed): SeededRandom {
        const empty = OrderedMap<string, RandomStream>();
        return SeededRandom.create({ seed, streams: empty });
    }

    /** A run's randomness from its seed and where each named stream has got to. */
    static create({ seed, streams }: FieldsOf<SeededRandom>): SeededRandom {
        return new SeededRandom(seed, streams);
    }

    declare private readonly brand: never;

    private constructor(
        readonly seed: Seed,
        readonly streams: OrderedMap<string, RandomStream>,
    ) {
        Object.freeze(this);
    }

    /** The named stream, where it has got to. A new name starts a new stream. */
    streamOf(name: string): RandomStream {
        const start = Math.imul(this.seed, SEED_MULTIPLIER) ^ hashName(name);
        return this.streams.get(name) ?? RandomStream.createNew(start);
    }

    /** A fraction drawn from a named stream, as System's random source gives one (FND-83). */
    nextFraction(stream: string): readonly [value: Fraction, source: SeededRandom] {
        return this.drawFrom(stream, (named) => named.nextFraction());
    }

    /** A number drawn from a named stream, and the randomness as it stands after the draw. */
    drawFrom<TValue extends number>(
        name: string,
        draw: (stream: RandomStream) => RandomDraw<TValue>,
    ): readonly [value: TValue, random: SeededRandom] {
        const before = this.streamOf(name);
        const [value, stream] = draw(before);
        const streams = this.streams.set(name, stream);
        return [value, new SeededRandom(this.seed, streams)];
    }
}
