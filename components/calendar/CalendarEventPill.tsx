"use client";

import { CalendarEvent } from "@/types";

interface CalendarEventPillProps {
  event: CalendarEvent;
  color: string;
  compact?: boolean;
  onClick?: () => void;
}

export default function CalendarEventPill({ event, color, compact = true, onClick }: CalendarEventPillProps) {
  const isGame = event.type === "partido";

  if (compact) {
    if (isGame) {
      return (
        <div
          onClick={e => { e.stopPropagation(); onClick?.(); }}
          title={event.title}
          style={{
            borderTop: `1px solid ${color}60`,
            borderRight: `1px solid ${color}60`,
            borderBottom: `1px solid ${color}60`,
            borderLeft: `3px solid ${color}`,
            background: `${color}22`,
            borderRadius: 4,
            padding: "2px 6px",
            fontSize: 10,
            fontWeight: 700,
            color,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            cursor: "pointer",
            letterSpacing: "0.1px",
          }}
        >
          {event.title}
        </div>
      );
    }

    return (
      <div
        onClick={e => { e.stopPropagation(); onClick?.(); }}
        title={event.title}
        style={{
          borderLeft: `2px solid ${color}`,
          background: `${color}18`,
          borderRadius: 3,
          padding: "1px 5px",
          fontSize: 9,
          fontWeight: 600,
          color,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          cursor: "pointer",
        }}
      >
        {event.title}
      </div>
    );
  }

  const timeStr = new Date(event.startsAt).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      onClick={e => { e.stopPropagation(); onClick?.(); }}
      style={{
        borderLeft: `2px solid ${color}`,
        background: `${color}18`,
        borderRadius: 4,
        padding: "3px 6px",
        cursor: "pointer",
        overflow: "hidden",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {event.title}
      </div>
      <div style={{ fontSize: 8, color: "var(--pg-muted)", marginTop: 1 }}>{timeStr}</div>
    </div>
  );
}
