const CLOCK_TIME = /^h(\d{2,}):m([0-5]\d):s([0-5]\d):ms(\d{2,3})$/;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

/**
 * Reads a time like h00:m05:s00:ms00 as milliseconds since the run began, or null if it is not
 * one.
 */
export function parseClockTime(text: string): number | null {
    const match = CLOCK_TIME.exec(text);
    if (match === null) {
        return null;
    }
    const [hours = 0, minutes = 0, seconds = 0, milliseconds = 0] = match.slice(1).map(Number);
    const total =
        ((hours * MINUTES_PER_HOUR + minutes) * SECONDS_PER_MINUTE + seconds) * MS_PER_SECOND +
        milliseconds;
    return Number.isSafeInteger(total) ? total : null;
}

/** Writes milliseconds since the run began as a time like h00:m05:s00:ms00. */
export function formatClockTime(time: number): string {
    const pad = (value: number): string => String(value).padStart(2, '0');
    const totalSeconds = Math.floor(time / MS_PER_SECOND);
    const totalMinutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
    const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
    const minutes = totalMinutes % MINUTES_PER_HOUR;
    return `h${pad(hours)}:m${pad(minutes)}:s${pad(totalSeconds % SECONDS_PER_MINUTE)}:ms${pad(time % MS_PER_SECOND)}`;
}
