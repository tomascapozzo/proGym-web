import { CalendarEvent, ClubPeriod, SquadColor } from "@/types";
import { SQUAD_COLOR_MAP } from "@/components/squads/SquadChip";

/** Expands recurring events into individual instances within [rangeStart, rangeEnd]. */
export function expandEvents(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): CalendarEvent[] {
  const result: CalendarEvent[] = [];
  for (const event of events) {
    if (!event.recurrence) {
      const s = new Date(event.startsAt);
      if (s >= rangeStart && s <= rangeEnd) result.push(event);
    } else {
      result.push(...expandRecurring(event, rangeStart, rangeEnd));
    }
  }
  return result;
}

function expandRecurring(
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
): CalendarEvent[] {
  const { frequency, days_of_week, until } = event.recurrence!;
  const effectiveEnd = until
    ? new Date(Math.min(new Date(until + "T23:59:59").getTime(), rangeEnd.getTime()))
    : rangeEnd;

  const base = new Date(event.startsAt);
  const duration = event.endsAt
    ? new Date(event.endsAt).getTime() - base.getTime()
    : 2 * 3600 * 1000;
  const intervalDays = frequency === "biweekly" ? 14 : 7;

  const instances: CalendarEvent[] = [];

  for (const dow of days_of_week) {
    const daysAhead = (dow - base.getDay() + 7) % 7;
    const cursor = new Date(base);
    cursor.setDate(base.getDate() + daysAhead);
    cursor.setHours(base.getHours(), base.getMinutes(), 0, 0);

    while (cursor <= effectiveEnd) {
      if (cursor >= rangeStart) {
        const instanceEnd = new Date(cursor.getTime() + duration);
        instances.push({
          ...event,
          startsAt: cursor.toISOString(),
          endsAt: instanceEnd.toISOString(),
        });
      }
      cursor.setDate(cursor.getDate() + intervalDays);
    }
  }

  return instances;
}

/** Returns YYYY-MM-DD for a Date using local time — safe for period comparisons. */
export function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** True if the given date (local) falls within the period's inclusive date range. */
export function dateIsInPeriod(date: Date, period: ClubPeriod): boolean {
  const d = toLocalDateStr(date);
  return d >= period.startDate && d <= period.endDate;
}

/** Returns the period(s) that cover a given date, or [] if none. */
export function getPeriodsForDate(date: Date, periods: ClubPeriod[]): ClubPeriod[] {
  return periods.filter(p => dateIsInPeriod(date, p));
}

/** Returns background color (with alpha) for the first period covering the date, or undefined. */
export function getPeriodBgColor(date: Date, periods: ClubPeriod[]): string | undefined {
  const p = periods.find(period => dateIsInPeriod(date, period));
  if (!p) return undefined;
  const hex = SQUAD_COLOR_MAP[p.color as SquadColor];
  return hex ? `${hex}18` : undefined;
}

/** Returns the period that starts on this exact date (for showing the period label). */
export function getPeriodStartingOn(date: Date, periods: ClubPeriod[]): ClubPeriod | undefined {
  const d = toLocalDateStr(date);
  return periods.find(p => p.startDate === d);
}

/** Returns all periods that overlap a date range. */
export function getPeriodsInRange(start: Date, end: Date, periods: ClubPeriod[]): ClubPeriod[] {
  const s = toLocalDateStr(start);
  const e = toLocalDateStr(end);
  return periods.filter(p => p.startDate <= e && p.endDate >= s);
}

export function getWeekRange(date: Date): { start: Date; end: Date } {
  const dow = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - ((dow + 6) % 7));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getMonthRange(year: number, month: number): { start: Date; end: Date } {
  return {
    start: new Date(year, month, 1, 0, 0, 0, 0),
    end: new Date(year, month + 1, 0, 23, 59, 59, 999),
  };
}
