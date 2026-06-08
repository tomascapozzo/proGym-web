"use client";

import { useState, useMemo } from "react";
import Topbar from "@/components/dashboard/Topbar";
import SquadChip from "@/components/squads/SquadChip";
import CalendarMonthGrid from "@/components/calendar/CalendarMonthGrid";
import CalendarWeekGrid from "@/components/calendar/CalendarWeekGrid";
import CreateEventModal from "@/components/calendar/CreateEventModal";
import EventDetailModal from "@/components/calendar/EventDetailModal";
import ScheduleImporterModal from "@/components/calendar/ScheduleImporterModal";
import ManagePeriodsModal from "@/components/calendar/ManagePeriodsModal";
import { CalendarEvent, CalendarView, Squad, ClubPeriod, SquadColor } from "@/types";
import { SQUAD_COLOR_MAP } from "@/components/squads/SquadChip";
import { expandEvents, getMonthRange, getWeekRange, getPeriodsInRange } from "@/lib/calendarUtils";
import { createEvent, updateEvent, deleteEvent, bulkCreateMatches, MatchImportRow } from "@/app/(dashboard)/calendar/actions";
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Upload } from "lucide-react";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface CalendarClientProps {
  initialEvents: CalendarEvent[];
  squads: Squad[];
  initialPeriods: ClubPeriod[];
}

export default function CalendarClient({ initialEvents, squads, initialPeriods }: CalendarClientProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [periods, setPeriods] = useState<ClubPeriod[]>(initialPeriods);
  const [view, setView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createInitialDate, setCreateInitialDate] = useState<Date | undefined>();
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [importerOpen, setImporterOpen] = useState(false);
  const [periodsOpen, setPeriodsOpen] = useState(false);

  const displayRange = useMemo(() => {
    if (view === "month") {
      return getMonthRange(currentDate.getFullYear(), currentDate.getMonth());
    }
    return getWeekRange(currentDate);
  }, [view, currentDate]);

  const displayEvents = useMemo(() => {
    const byGroup =
      selectedGroupIds.length === 0
        ? events
        : events.filter(e => e.groupIds.some(id => selectedGroupIds.includes(id)));
    return expandEvents(byGroup, displayRange.start, displayRange.end);
  }, [events, selectedGroupIds, displayRange]);

  const activePeriods = useMemo(
    () => getPeriodsInRange(displayRange.start, displayRange.end, periods),
    [periods, displayRange],
  );

  const toggleGroup = (id: string) =>
    setSelectedGroupIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );

  const navigate = (dir: "prev" | "next") => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (view === "month") {
        d.setMonth(d.getMonth() + (dir === "next" ? 1 : -1));
      } else {
        d.setDate(d.getDate() + (dir === "next" ? 7 : -7));
      }
      return d;
    });
  };

  const handleDayClick = (date: Date) => {
    setCreateInitialDate(date);
    setEditingEvent(null);
    setCreateOpen(true);
  };

  const handleSave = async (data: Omit<CalendarEvent, "id">, id?: string) => {
    if (id) {
      const result = await updateEvent(id, data);
      if ("event" in result) {
        setEvents(prev => prev.map(e => e.id === id ? result.event : e));
      }
    } else {
      const result = await createEvent(data);
      if ("event" in result) {
        setEvents(prev => [...prev, result.event]);
      }
    }
    setCreateOpen(false);
    setEditingEvent(null);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteEvent(id);
    if ("ok" in result) {
      setEvents(prev => prev.filter(e => e.id !== id));
      setSelectedEvent(null);
    }
  };

  const handleEdit = (event: CalendarEvent) => {
    setSelectedEvent(null);
    setEditingEvent(event);
    setCreateInitialDate(undefined);
    setCreateOpen(true);
  };

  const handleImport = async (rows: MatchImportRow[]) => {
    const result = await bulkCreateMatches(rows);
    if ("count" in result) {
      // Re-fetch would be ideal but for now do a full reload
      window.location.reload();
    }
    setImporterOpen(false);
  };

  const subtitle =
    view === "month"
      ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
      : (() => {
          const { start, end } = getWeekRange(currentDate);
          return `${start.getDate()} — ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
        })();

  return (
    <>
      <Topbar
        title="Calendario"
        subtitle={subtitle}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", background: "var(--pg-surface)", border: "1px solid var(--pg-border)", borderRadius: 7, overflow: "hidden" }}>
              {(["month", "week"] as CalendarView[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: "5px 12px",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: view === v ? "rgba(212,168,83,0.12)" : "transparent",
                    border: "none",
                    color: view === v ? "var(--pg-accent)" : "var(--pg-muted)",
                    transition: "all 0.1s",
                  }}
                >
                  {v === "month" ? "Mes" : "Semana"}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 2 }}>
              <button
                onClick={() => navigate("prev")}
                style={{ width: 28, height: 28, borderRadius: 6, background: "var(--pg-surface)", border: "1px solid var(--pg-border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--pg-muted)" }}
              >
                <ChevronLeft size={12} />
              </button>
              <button
                onClick={() => navigate("next")}
                style={{ width: 28, height: 28, borderRadius: 6, background: "var(--pg-surface)", border: "1px solid var(--pg-border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--pg-muted)" }}
              >
                <ChevronRight size={12} />
              </button>
            </div>

            <button
              onClick={() => setPeriodsOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "var(--pg-surface)", border: "1px solid var(--pg-border)", color: "var(--pg-muted)" }}
            >
              <CalendarDays size={12} />
              Períodos
            </button>

            <button
              onClick={() => setImporterOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "var(--pg-surface)", border: "1px solid var(--pg-border)", color: "var(--pg-muted)" }}
            >
              <Upload size={12} />
              Fixture
            </button>

            <button
              onClick={() => { setEditingEvent(null); setCreateInitialDate(undefined); setCreateOpen(true); }}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", background: "var(--pg-accent)", border: "none", color: "var(--pg-accent-text)" }}
            >
              <Plus size={12} />
              Nuevo evento
            </button>
          </div>
        }
      />

      {/* Active periods banner */}
      {activePeriods.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 20px", borderBottom: "1px solid var(--pg-border)", background: "var(--pg-card)", flexShrink: 0, overflowX: "auto" }}>
          {activePeriods.map(p => (
            <PeriodChip key={p.id} period={p} />
          ))}
        </div>
      )}

      {/* Group filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", borderBottom: "1px solid var(--pg-border)", background: "var(--pg-card)", overflowX: "auto", flexShrink: 0 }}>
        <button
          onClick={() => setSelectedGroupIds([])}
          style={{
            padding: "3px 9px",
            borderRadius: 12,
            fontSize: 10,
            fontWeight: selectedGroupIds.length === 0 ? 700 : 500,
            border: "1px solid var(--pg-border)",
            background: selectedGroupIds.length === 0 ? "rgba(212,168,83,0.12)" : "transparent",
            color: selectedGroupIds.length === 0 ? "var(--pg-accent)" : "var(--pg-muted)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Todos
        </button>
        {squads.map(squad => (
          <SquadChip
            key={squad.id}
            squad={squad}
            active={selectedGroupIds.includes(squad.id)}
            onClick={() => toggleGroup(squad.id)}
          />
        ))}
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {view === "month" ? (
          <CalendarMonthGrid
            year={currentDate.getFullYear()}
            month={currentDate.getMonth()}
            events={displayEvents}
            squads={squads}
            periods={periods}
            onDayClick={handleDayClick}
            onEventClick={setSelectedEvent}
          />
        ) : (
          <CalendarWeekGrid
            date={currentDate}
            events={displayEvents}
            squads={squads}
            periods={periods}
            onDayClick={handleDayClick}
            onEventClick={setSelectedEvent}
          />
        )}
      </div>

      <CreateEventModal
        visible={createOpen}
        initial={createInitialDate ? { date: createInitialDate } : null}
        eventToEdit={editingEvent}
        squads={squads}
        onSave={handleSave}
        onClose={() => { setCreateOpen(false); setEditingEvent(null); }}
      />

      <EventDetailModal
        visible={selectedEvent !== null}
        event={selectedEvent}
        squads={squads}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onClose={() => setSelectedEvent(null)}
      />

      <ScheduleImporterModal
        visible={importerOpen}
        squads={squads}
        onImport={handleImport}
        onClose={() => setImporterOpen(false)}
      />

      <ManagePeriodsModal
        visible={periodsOpen}
        periods={periods}
        onPeriodsChange={setPeriods}
        onClose={() => setPeriodsOpen(false)}
      />
    </>
  );
}

// ── Period chip ───────────────────────────────────────────────────────────────

function PeriodChip({ period }: { period: ClubPeriod }) {
  const color = SQUAD_COLOR_MAP[period.color as SquadColor];
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "2px 9px",
      borderRadius: 10,
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.5px",
      textTransform: "uppercase",
      border: `1px solid ${color}40`,
      background: `${color}12`,
      color,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {period.name}
    </span>
  );
}
