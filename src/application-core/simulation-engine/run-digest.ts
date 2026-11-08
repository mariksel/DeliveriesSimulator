import { textDigest } from '../../domain/simulation-engine/text-digest';
import type { RunLogEntry } from './run-log-entry';
import { runLogEntryPart } from './run-log-entry-digest';

/** Each entry, written out, in log order. */
function* partsOf(entries: Iterable<RunLogEntry>): Generator<string> {
    for (const entry of entries) {
        yield runLogEntryPart(entry);
    }
}

/**
 * A short fingerprint of a whole run: two runs with the same digest match event for event. Each
 * entry is written out field by field, by its kind, and the texts are hashed in log order.
 */
export function runDigest(entries: Iterable<RunLogEntry>): string {
    const parts = partsOf(entries);
    return textDigest(parts);
}
