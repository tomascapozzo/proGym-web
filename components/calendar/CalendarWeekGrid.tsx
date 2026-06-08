"use client";

import { CalendarEvent, Squad, SquadColor, ClubPeriod } from "@/types";
import CalendarEventPill from "./CalendarEventPill";
import { SQUAD_COLOR_MAP } from "@/components/squads/SquadChip";
import { getPeriodBgColor, getPeriodsForDate } from "@/lib/calendarUtils";

const HOUR_START = 7;
const HOUR_END = 22;
const ROW_HEIGHT = 44;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const GUTTER = 48;

const DAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function getWeekDays(date: Date): Date[] {
  const d = new Date(date);
  const dow = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function getEventColor(event: CalendarEvent, squads: Squad[]): string {
  const squad = squads.find(s => event.groupIds.includes(s.id));
  return SQUAD_COLOR_MAP[(squad?.color ?? "blue") as SquadColor];
}

interface CalendarWeekGridProps {
  date: Date;
  events: CalendarEvent[];
  squads: Squad[];
  periods: ClubPeriod[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export default function CalendarWeekGrid({ date, events, squads, periods, onDayClick, onEventClick }: CalendarWeekGridProps) {
  const weekDays = getWeekDays(date);
  const today = new Date();
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i);
  const totalHeight = TOTAL_HOURS * ROW_HEIGHT;

  // Split events into all-day (matches) and timed (trainings)
  const allDayEvents = events.filter(e => e.type === "partido");
  const timedEvents = events.filter(e => e.type !== "partido");
  const hasAllDay = allDayEvents.length > 0;

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: `${GUTTER}px repeat(7, 1fr)`, borderBottom: "1px solid var(--pg-border)", flexShrink: 0 }}>
        <div />
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today);
          const dayPeriods = getPeriodsForDate(day, periods);
          const periodBg = getPeriodBgColor(day, periods);
          return (
            <div key={i} style={{ padding: "6px 8px", textAlign: "center", borderLeft: "1px solid var(--pg-border)", background: periodBg }}>
              {dayPeriods.length > 0 && (
                <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: SQUAD_COLOR_MAP[dayPeriods[0].color as SquadColor], marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {dayPeriods[0].name}
                </div>
              )}
              <div style={{ fontSize: 8, letterSpacing: "1px", textTransform: "uppercase", color: isToday ? "var(--pg-accent)" : "var(--pg-muted)", fontWeight: 500 }}>
                {DAY_SHORT[i]}
              </div>
              <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? "var(--pg-accent)" : "var(--pg-text)", marginTop: 1 }}>
                {day.getDate()} <span style={{ fontSize: 9, fontWeight: 400, color: "var(--pg-muted)" }}>{MONTHS_SHORT[day.getMonth()]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day row (matches) */}
      {hasAllDay && (
        <div style={{ display: "grid", gridTemplateColumns: `${GUTTER}px repeat(7, 1fr)`, borderBottom: "1px solid var(--pg-border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8, fontSize: 7, color: "var(--pg-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Todo el día
          </div>
          {weekDays.map((day, di) => {
            const dayMatches = allDayEvents.filter(e => isSameDay(new Date(e.startsAt), day));
            return (
              <div key={di} style={{ borderLeft: "1px solid var(--pg-border)", padding: "3px 4px", minHeight: 30, display: "flex", flexDirection: "column", gap: 2 }}>
                {dayMatches.map(e => (
                  <CalendarEventPill
                    key={`${e.id}_${e.startsAt}`}
                    event={e}
                    color={getEventColor(e, squads)}
                    compact
                    onClick={() => onEventClick(e)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `${GUTTER}px repeat(7, 1fr)`, position: "relative", height: totalHeight }}>

          <div style={{ gridColumn: 1, gridRow: `1 / ${TOTAL_HOURS + 1}`, position: "relative", zIndex: 1 }}>
            {hours.map(hour => (
              <div key={hour} style={{ height: ROW_HEIGHT, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingRight: 8, paddingTop: 3, fontSize: 8, color: "var(--pg-muted)", fontVariantNumeric: "tabular-nums" }}>
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {weekDays.map((day, di) => {
            const dayEvents = timedEvents.filter(e => isSameDay(new Date(e.startsAt), day));

            return (
              <div
                key={di}
                style={{ gridColumn: di + 2, gridRow: `1 / ${TOTAL_HOURS + 1}`, borderLeft: "1px solid var(--pg-border)", position: "relative" }}
              >
                {hours.map(hour => (
                  <div
                    key={hour}
                    onClick={() => {
                      const d = new Date(day);
                      d.setHours(hour, 0, 0, 0);
                      onDayClick(d);
                    }}
                    style={{ height: ROW_HEIGHT, borderTop: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}
                  />
                ))}

                {dayEvents.map(e => {
                  const start = new Date(e.startsAt);
                  const end = e.endsAt
                    ? new Date(e.endsAt)
                    : new Date(start.getTime() + 60 * 60 * 1000);
                  const startMin = (start.getHours() - HOUR_START) * 60 + start.getMinutes();
                  const durationMin = (end.getTime() - start.getTime()) / 60000;
                  const top = (startMin / 60) * ROW_HEIGHT;
                  const height = Math.max((durationMin / 60) * ROW_HEIGHT, 24);
                  if (startMin < 0 || startMin >= TOTAL_HOURS * 60) return null;
                  return (
                    <div
                      key={`${e.id}_${e.startsAt}`}
                      style={{ position: "absolute", top, left: 2, right: 2, height, zIndex: 2 }}
                    >
                      <CalendarEventPill
                        event={e}
                        color={getEventColor(e, squads)}
                        compact={false}
                        onClick={() => onEventClick(e)}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
