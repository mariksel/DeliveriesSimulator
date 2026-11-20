import type { CalendarTime } from '../../domain/simulation-engine/numbers';

/**
 * The date and time, as a person reads them, such as when a run was saved. Application.Core
 * declares it, and Infrastructure reads the browser's.
 */
export abstract class Calendar {
    /** The moment now, on the calendar. */
    abstract now(): CalendarTime;
}
