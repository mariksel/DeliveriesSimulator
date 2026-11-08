const START_LOW = 0xdeadbeef;
const START_HIGH = 0x41c6ce57;
const MIX_LOW = 2654435761;
const MIX_HIGH = 1597334677;
const FINISH_SHIFT_1 = 16;
const FINISH_SHIFT_2 = 13;
const FINISH_MULTIPLIER_1 = 2246822507;
const FINISH_MULTIPLIER_2 = 3266489909;
const HEX = 16;
const HEX_PER_WORD = 8;

const finish = (first: number, second: number): number =>
    Math.imul(first ^ (first >>> FINISH_SHIFT_1), FINISH_MULTIPLIER_1) ^
    Math.imul(second ^ (second >>> FINISH_SHIFT_2), FINISH_MULTIPLIER_2);

/**
 * A short fingerprint of a run of texts, taken in order as if they were one text. It uses cyrb53,
 * which is simple and needs no library, and it only has to spot accidental differences.
 */
export function textDigest(texts: Iterable<string>): string {
    // The one proven exception to immutability (FND-73). This function is pure from outside, and
    // only these local numbers change. On a city's log, reduce took 8.5 s and 1.6 GB, and this
    // loop 0.15 s and 0.4 GB. See docs/design/modules/simulation-engine.md#performance.
    /* eslint-disable functional/no-let */
    let mixedLow = START_LOW;
    let mixedHigh = START_HIGH;
    for (const text of texts) {
        for (let index = 0; index < text.length; index++) {
            const code = text.charCodeAt(index);
            mixedLow = Math.imul(mixedLow ^ code, MIX_LOW);
            mixedHigh = Math.imul(mixedHigh ^ code, MIX_HIGH);
        }
    }
    /* eslint-enable functional/no-let */
    const finishedLow = finish(mixedLow, mixedHigh);
    const finishedHigh = finish(mixedHigh, finishedLow);
    const high = (finishedHigh >>> 0).toString(HEX).padStart(HEX_PER_WORD, '0');
    const low = (finishedLow >>> 0).toString(HEX).padStart(HEX_PER_WORD, '0');
    return `${high}${low}`;
}
