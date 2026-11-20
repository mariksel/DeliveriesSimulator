import type { CalendarTime } from '../../../domain/simulation-engine/numbers';

const TWO_DIGITS = 2;
/** Date counts months from 0. */
const FIRST_MONTH = 1;

const padded = (value: number): string => String(value).padStart(TWO_DIGITS, '0');

/** A moment on the calendar as a person reads it, in their own time zone: "2026-11-09 21:40". */
export function calendarLabel(at: CalendarTime): string {
    const date = new Date(at);
    const monthNumber = date.getMonth() + FIRST_MONTH;
    const dayNumber = date.getDate();
    const hourNumber = date.getHours();
    const minuteNumber = date.getMinutes();
    const month = padded(monthNumber);
    const day = padded(dayNumber);
    const hours = padded(hourNumber);
    const minutes = padded(minuteNumber);
    return `${date.getFullYear()}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * The name a run is offered when it is saved: its scenario's name and the date and time, in the
 * person's own time zone, such as "One order, 2026-11-09 21:40" (FND-81).
 */
export function savedRunName(scenarioName: string, at: CalendarTime): string {
    const label = calendarLabel(at);
    return `${scenarioName}, ${label}`;
}
