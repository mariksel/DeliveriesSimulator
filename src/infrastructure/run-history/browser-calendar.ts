import { Calendar } from '../../application-core/run-history/calendar';
import type { CalendarTime } from '../../domain/simulation-engine/numbers';
import { toCalendarTime } from '../../domain/simulation-engine/numbers';

/** The calendar, from the browser's clock. */
export class BrowserCalendar extends Calendar {
    now(): CalendarTime {
        const now = Date.now();
        return toCalendarTime(now);
    }
}
