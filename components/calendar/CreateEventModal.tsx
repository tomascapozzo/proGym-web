"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { CalendarEvent, CalendarEventRecurrence, Squad } from "@/types";
import SquadChip from "@/components/squads/SquadChip";

interface CreateEventModalProps {
  visible: boolean;
  initial?: { date?: Date } | null;
  eventToEdit?: CalendarEvent | null;
  squads: Squad[];
  onSave: (event: Omit<CalendarEvent, "id">, id?: string) => void;
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--pg-surface)",
  border: "1px solid var(--pg-border)",
  borderRadius: 7,
  padding: "8px 10px",
  fontSize: 12,
  color: "var(--pg-text)",
  outline: "none",
  boxSizing: "border-box",
};

const DOW_LABELS = ["D", "L", "M", "X", "J", "V", "S"];

function dateToInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeToInput(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function CreateEventModal({ visible, initial, eventToEdit, squads, onSave, onClose }: CreateEventModalProps) {
  const [type, setType] = useState<"entrenamiento" | "partido">("entrenamiento");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [opponent, setOpponent] = useState("");
  const [location, setLocation] = useState<"local" | "visitante">("local");
  const [description, setDescription] = useState("");

  // Recurrence state
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<"weekly" | "biweekly">("weekly");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [until, setUntil] = useState("");

  const isEditing = !!eventToEdit;

  useEffect(() => {
    if (!visible) return;

    if (eventToEdit) {
      const s = new Date(eventToEdit.startsAt);
      setType(eventToEdit.type);
      setTitle(eventToEdit.title);
      setDate(dateToInputValue(s));
      setStartTime(timeToInput(s));
      setEndTime(eventToEdit.endsAt ? timeToInput(new Date(eventToEdit.endsAt)) : "11:00");
      setSelectedGroups(eventToEdit.groupIds);
      setOpponent(eventToEdit.opponent ?? "");
      setLocation(eventToEdit.location ?? "local");
      setDescription(eventToEdit.description ?? "");
      if (eventToEdit.recurrence) {
        setRecurring(true);
        setFrequency(eventToEdit.recurrence.frequency);
        setDaysOfWeek(eventToEdit.recurrence.days_of_week);
        setUntil(eventToEdit.recurrence.until ?? "");
      } else {
        setRecurring(false);
        setFrequency("weekly");
        setDaysOfWeek([]);
        setUntil("");
      }
    } else {
      const d = initial?.date ?? new Date();
      setDate(dateToInputValue(d));
      setStartTime(initial?.date ? timeToInput(d) : "09:00");
      setEndTime(initial?.date ? timeToInput(new Date(d.getTime() + 2 * 3600000)) : "11:00");
      setType("entrenamiento");
      setTitle("");
      setSelectedGroups([]);
      setOpponent("");
      setLocation("local");
      setDescription("");
      setRecurring(false);
      setFrequency("weekly");
      setDaysOfWeek([]);
      setUntil("");
    }
  }, [visible, initial, eventToEdit]);

  if (!visible) return null;

  const toggleGroup = (id: string) =>
    setSelectedGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleDow = (dow: number) =>
    setDaysOfWeek(prev => prev.includes(dow) ? prev.filter(d => d !== dow) : [...prev, dow]);

  const isMatch = type === "partido";

  const handleSave = () => {
    if (!title.trim() || !date) return;
    let startsAt: string;
    let endsAt: string | null;

    if (isMatch) {
      // All-day: store at noon UTC to avoid date-shift in any timezone
      startsAt = `${date}T12:00:00.000Z`;
      endsAt = null;
    } else {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      const [y, mo, d] = date.split("-").map(Number);
      startsAt = new Date(y, mo - 1, d, sh, sm).toISOString();
      endsAt = new Date(y, mo - 1, d, eh, em).toISOString();
    }

    let recurrence: CalendarEventRecurrence | null = null;
    if (recurring && daysOfWeek.length > 0) {
      recurrence = {
        frequency,
        days_of_week: [...daysOfWeek].sort(),
        until: until || null,
      };
    }

    onSave(
      {
        type,
        title: title.trim(),
        description: description.trim() || null,
        startsAt,
        endsAt,
        opponent: type === "partido" ? (opponent.trim() || null) : null,
        location: type === "partido" ? location : null,
        groupIds: selectedGroups,
        recurrence,
      },
      isEditing ? eventToEdit!.id : undefined,
    );
  };

  const typeBtn = (t: "entrenamiento" | "partido", label: string) => (
    <button
      onClick={() => setType(t)}
      style={{
        flex: 1,
        padding: "7px 0",
        borderRadius: 7,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        border: `1px solid ${type === t ? "var(--pg-accent)" : "var(--pg-border)"}`,
        background: type === t ? "rgba(212,168,83,0.12)" : "transparent",
        color: type === t ? "var(--pg-accent)" : "var(--pg-muted)",
        transition: "all 0.1s",
      }}
    >
      {label}
    </button>
  );

  const canSave = title.trim() && date && (!recurring || daysOfWeek.length > 0);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--pg-card)", border: "1px solid var(--pg-border)", borderRadius: 12, width: "100%", maxWidth: 460, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--pg-border)", flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--pg-text)" }}>
            {isEditing ? "Editar evento" : "Nuevo evento"}
          </span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--pg-muted)", padding: 4, borderRadius: 5 }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

          <div>
            <label style={{ fontSize: 10, color: "var(--pg-muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Tipo</label>
            <div style={{ display: "flex", gap: 8 }}>
              {typeBtn("entrenamiento", "Entrenamiento")}
              {typeBtn("partido", "Partido")}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 10, color: "var(--pg-muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Título *</label>
            <input
              style={inputStyle}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={type === "partido" ? "Ej: vs Alumni AC" : "Ej: Entrenamiento táctico"}
              autoFocus
            />
          </div>

          {/* Date (+ times only for trainings) */}
          {isMatch ? (
            <div>
              <label style={{ fontSize: 10, color: "var(--pg-muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Fecha *</label>
              <input type="date" style={{ ...inputStyle, maxWidth: 180 }} value={date} onChange={e => setDate(e.target.value)} />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div>
                <label style={{ fontSize: 10, color: "var(--pg-muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Fecha *</label>
                <input type="date" style={inputStyle} value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "var(--pg-muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Inicio</label>
                <input type="time" style={inputStyle} value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "var(--pg-muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Fin</label>
                <input type="time" style={inputStyle} value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>
          )}

          {squads.length > 0 && (
            <div>
              <label style={{ fontSize: 10, color: "var(--pg-muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Planteles</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {squads.map(s => (
                  <SquadChip
                    key={s.id}
                    squad={s}
                    active={selectedGroups.includes(s.id)}
                    onClick={() => toggleGroup(s.id)}
                    size="md"
                  />
                ))}
              </div>
            </div>
          )}

          {type === "partido" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px", background: "var(--pg-surface)", borderRadius: 8, border: "1px solid var(--pg-border)" }}>
              <div>
                <label style={{ fontSize: 10, color: "var(--pg-muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Rival</label>
                <input style={inputStyle} value={opponent} onChange={e => setOpponent(e.target.value)} placeholder="Nombre del club rival" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "var(--pg-muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Cancha</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["local", "visitante"] as const).map(loc => (
                    <button
                      key={loc}
                      onClick={() => setLocation(loc)}
                      style={{
                        flex: 1,
                        padding: "6px 0",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        border: `1px solid ${location === loc ? "var(--pg-accent)" : "var(--pg-border)"}`,
                        background: location === loc ? "rgba(212,168,83,0.12)" : "transparent",
                        color: location === loc ? "var(--pg-accent)" : "var(--pg-muted)",
                        transition: "all 0.1s",
                        textTransform: "capitalize",
                      }}
                    >
                      {loc === "local" ? "Local" : "Visitante"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recurrence — only for trainings */}
          {!isMatch && <div style={{ borderTop: "1px solid var(--pg-border)", paddingTop: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={recurring}
                onChange={e => setRecurring(e.target.checked)}
                style={{ accentColor: "var(--pg-accent)", width: 14, height: 14, cursor: "pointer" }}
              />
              <span style={{ fontSize: 11, fontWeight: 600, color: recurring ? "var(--pg-text)" : "var(--pg-muted)" }}>
                Repetir evento
              </span>
            </label>

            {recurring && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12, padding: "12px", background: "var(--pg-surface)", borderRadius: 8, border: "1px solid var(--pg-border)" }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--pg-muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Frecuencia</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {([["weekly", "Semanal"], ["biweekly", "Quincenal"]] as const).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setFrequency(val)}
                        style={{
                          flex: 1,
                          padding: "6px 0",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          border: `1px solid ${frequency === val ? "var(--pg-accent)" : "var(--pg-border)"}`,
                          background: frequency === val ? "rgba(212,168,83,0.12)" : "transparent",
                          color: frequency === val ? "var(--pg-accent)" : "var(--pg-muted)",
                          transition: "all 0.1s",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 10, color: "var(--pg-muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Días *
                  </label>
                  <div style={{ display: "flex", gap: 5 }}>
                    {DOW_LABELS.map((label, dow) => (
                      <button
                        key={dow}
                        onClick={() => toggleDow(dow)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: "pointer",
                          border: `1px solid ${daysOfWeek.includes(dow) ? "var(--pg-accent)" : "var(--pg-border)"}`,
                          background: daysOfWeek.includes(dow) ? "rgba(212,168,83,0.15)" : "transparent",
                          color: daysOfWeek.includes(dow) ? "var(--pg-accent)" : "var(--pg-muted)",
                          transition: "all 0.1s",
                          flexShrink: 0,
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {recurring && daysOfWeek.length === 0 && (
                    <div style={{ fontSize: 9, color: "var(--pg-red)", marginTop: 4 }}>
                      Seleccioná al menos un día
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 10, color: "var(--pg-muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Hasta (opcional)</label>
                  <input
                    type="date"
                    style={{ ...inputStyle, width: "auto" }}
                    value={until}
                    onChange={e => setUntil(e.target.value)}
                    min={date}
                  />
                </div>
              </div>
            )}
          </div>}

          <div>
            <label style={{ fontSize: 10, color: "var(--pg-muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Descripción (opcional)</label>
            <textarea style={{ ...inputStyle, resize: "none", height: 56, lineHeight: 1.4 }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Notas adicionales..." />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 18px", borderTop: "1px solid var(--pg-border)", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", border: "1px solid var(--pg-border)", color: "var(--pg-muted)" }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{ padding: "7px 14px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: canSave ? "pointer" : "not-allowed", background: "var(--pg-accent)", border: "none", color: "var(--pg-accent-text)", opacity: canSave ? 1 : 0.5 }}
          >
            {isEditing ? "Guardar cambios" : "Crear evento"}
          </button>
        </div>
      </div>
    </div>
  );
}
