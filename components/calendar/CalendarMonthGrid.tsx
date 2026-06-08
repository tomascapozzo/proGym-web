"use client";

import { CalendarEvent, Squad, SquadColor, ClubPeriod } from "@/types";
import CalendarEventPill from "./CalendarEventPill";
import { SQUAD_COLOR_MAP } from "@/components/squads/SquadChip";
import { getPeriodBgColor, getPeriodStartingOn } from "@/lib/calendarUtils";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function getDaysInGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const days: Date[] = [];
  for (let i = -startOffset; i < 42 - startOffset; i++) {
    days.push(new Date(year, month, 1 + i));
  }
  return days;
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

interface CalendarMonthGridProps {
  year: number;
  month: number;
  events: CalendarEvent[];
  squads: Squad[];
  periods: ClubPeriod[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export default function CalendarMonthGrid({ year, month, events, squads, periods, onDayClick, onEventClick }: CalendarMonthGridProps) {
  const days = getDaysInGrid(year, month);
  const today = new Date();

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--pg-border)", flexShrink: 0 }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{ padding: "6px 0", textAlign: "center", fontSize: 8, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--pg-muted)", fontWeight: 500 }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: "repeat(6, 1fr)", overflow: "hidden" }}>
        {days.map((day, i) => {
          const isCurrentMonth = day.getMonth() === month;
          const isToday = isSameDay(day, today);
          const dayEvents = events.filter(e => isSameDay(new Date(e.startsAt), day));
          const overflow = dayEvents.length > 3;
          const visible = dayEvents.slice(0, 3);
          const periodBg = getPeriodBgColor(day, periods);
          const periodStart = getPeriodStartingOn(day, periods);

          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              style={{
                borderRight: i % 7 !== 6 ? "1px solid var(--pg-border)" : "none",
                borderBottom: i < 35 ? "1px solid var(--pg-border)" : "none",
                padding: "5px 6px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                opacity: isCurrentMonth ? 1 : 0.3,
                background: periodBg ?? "transparent",
                transition: "background 0.1s",
                position: "relative",
              }}
            >
              {/* Period label on first day of a new period */}
              {periodStart && isCurrentMonth && (
                <div style={{
                  position: "absolute",
                  top: 2,
                  left: 4,
                  fontSize: 7,
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  color: SQUAD_COLOR_MAP[periodStart.color as SquadColor],
                  opacity: 0.9,
                  pointerEvents: "none",
                }}>
                  {periodStart.name}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 1, marginTop: periodStart ? 8 : 0 }}>
                <span style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? "var(--pg-accent-text)" : "var(--pg-muted)",
                  background: isToday ? "var(--pg-accent)" : "transparent",
                  flexShrink: 0,
                }}>
                  {day.getDate()}
                </span>
              </div>
              {visible.map(e => (
                <CalendarEventPill
                  key={`${e.id}_${e.startsAt}`}
                  event={e}
                  color={getEventColor(e, squads)}
                  compact
                  onClick={() => onEventClick(e)}
                />
              ))}
              {overflow && (
                <span style={{ fontSize: 8, color: "var(--pg-muted)", paddingLeft: 4 }}>
                  +{dayEvents.length - 3} más
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
