"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Squad } from "@/types";
import { MatchImportRow } from "@/app/(dashboard)/calendar/actions";
import SquadChip from "@/components/squads/SquadChip";

interface ScheduleImporterModalProps {
  visible: boolean;
  squads: Squad[];
  onImport: (rows: MatchImportRow[]) => void;
  onClose: () => void;
}

// Internal row state — same as MatchImportRow (description stores tournament name)
type RowState = MatchImportRow;

const emptyRow = (prev?: RowState, allSquadIds?: string[]): RowState => ({
  date: prev?.date ?? "",
  opponent: prev?.opponent ?? "",
  location: "local",
  groupIds: allSquadIds ?? [],
  description: prev?.description ?? null,
});

// colorScheme: "dark" makes the browser date picker icon white on dark backgrounds
const dateInputStyle: React.CSSProperties = {
  background: "var(--pg-surface)",
  border: "1px solid var(--pg-border)",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 11,
  color: "var(--pg-text)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  colorScheme: "dark",
};

const inputStyle: React.CSSProperties = {
  background: "var(--pg-surface)",
  border: "1px solid var(--pg-border)",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 11,
  color: "var(--pg-text)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  cursor: "pointer",
};

const COL = "110px 1fr 74px 148px 1fr 28px";

export default function ScheduleImporterModal({ visible, squads, onImport, onClose }: ScheduleImporterModalProps) {
  const allSquadIds = squads.map(s => s.id);

  const [rows, setRows] = useState<RowState[]>([emptyRow(undefined, allSquadIds)]);
  const [tournaments, setTournaments] = useState<string[]>([]);
  const [newTournament, setNewTournament] = useState("");

  if (!visible) return null;

  // ── Tournament management ─────────────────────────────────────────────────

  const addTournament = () => {
    const name = newTournament.trim();
    if (!name || tournaments.includes(name)) return;
    setTournaments(prev => [...prev, name]);
    setNewTournament("");
  };

  const removeTournament = (name: string) => {
    setTournaments(prev => prev.filter(t => t !== name));
    // Clear from rows that were using it
    setRows(prev => prev.map(r => r.description === name ? { ...r, description: null } : r));
  };

  // ── Row management ────────────────────────────────────────────────────────

  const updateRow = (i: number, patch: Partial<RowState>) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));

  const toggleGroup = (rowIdx: number, gId: string) => {
    const row = rows[rowIdx];
    const next = row.groupIds.includes(gId)
      ? row.groupIds.filter(id => id !== gId)
      : [...row.groupIds, gId];
    updateRow(rowIdx, { groupIds: next });
  };

  const addRow = () => {
    const last = rows[rows.length - 1];
    let nextDate = last.date;
    if (nextDate) {
      const d = new Date(nextDate + "T12:00:00Z");
      d.setDate(d.getDate() + 7);
      nextDate = d.toISOString().slice(0, 10);
    }
    setRows(prev => [...prev, { ...emptyRow(last, allSquadIds), date: nextDate }]);
  };

  const removeRow = (i: number) =>
    setRows(prev => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i));

  // ── Import ────────────────────────────────────────────────────────────────

  const validRows = rows.filter(r => r.date && r.opponent.trim());
  const canImport = validRows.length > 0;

  const handleImport = () => {
    if (canImport) onImport(validRows);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--pg-card)", border: "1px solid var(--pg-border)", borderRadius: 12, width: "100%", maxWidth: 820, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--pg-border)", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--pg-text)" }}>Importar fixture</div>
            <div style={{ fontSize: 10, color: "var(--pg-muted)", marginTop: 2 }}>
              Definí los torneos primero, luego cargá los partidos. La fecha avanza 7 días automáticamente.
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--pg-muted)", padding: 4, borderRadius: 5 }}>
            <X size={14} />
          </button>
        </div>

        {/* Tournament section */}
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--pg-border)", flexShrink: 0, background: "var(--pg-surface)" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--pg-muted)", marginBottom: 8 }}>
            Torneos
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* Existing tournament chips */}
            {tournaments.map(t => (
              <span
                key={t}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600, background: "rgba(212,168,83,0.12)", border: "1px solid rgba(212,168,83,0.3)", color: "var(--pg-accent)", whiteSpace: "nowrap" }}
              >
                {t}
                <button
                  onClick={() => removeTournament(t)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--pg-accent)", padding: 0, lineHeight: 1, display: "flex", alignItems: "center", opacity: 0.7 }}
                >
                  <X size={9} />
                </button>
              </span>
            ))}

            {/* Add tournament input */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                style={{ ...inputStyle, width: 180 }}
                value={newTournament}
                onChange={e => setNewTournament(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTournament()}
                placeholder="Nombre del torneo..."
              />
              <button
                onClick={addTournament}
                disabled={!newTournament.trim()}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: newTournament.trim() ? "pointer" : "not-allowed", background: newTournament.trim() ? "rgba(212,168,83,0.12)" : "transparent", border: "1px solid var(--pg-border)", color: newTournament.trim() ? "var(--pg-accent)" : "var(--pg-muted)", opacity: newTournament.trim() ? 1 : 0.5 }}
              >
                <Plus size={10} />
                Agregar
              </button>
            </div>
          </div>
        </div>

        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: COL, gap: 6, padding: "8px 18px", borderBottom: "1px solid var(--pg-border)", flexShrink: 0 }}>
          {["Fecha", "Rival", "Cancha", "Torneo", "Planteles", ""].map(h => (
            <div key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--pg-muted)" }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((row, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: COL, gap: 6, alignItems: "center" }}>

              {/* Date — colorScheme dark makes the calendar icon white */}
              <input
                type="date"
                style={dateInputStyle}
                value={row.date}
                onChange={e => updateRow(i, { date: e.target.value })}
              />

              {/* Opponent */}
              <input
                style={inputStyle}
                value={row.opponent}
                onChange={e => updateRow(i, { opponent: e.target.value })}
                placeholder="Nombre del club"
              />

              {/* Location toggle */}
              <div style={{ display: "flex", gap: 3 }}>
                {(["local", "visitante"] as const).map(loc => (
                  <button
                    key={loc}
                    onClick={() => updateRow(i, { location: loc })}
                    style={{
                      flex: 1,
                      padding: "5px 0",
                      borderRadius: 5,
                      fontSize: 9,
                      fontWeight: 700,
                      cursor: "pointer",
                      border: `1px solid ${row.location === loc ? "var(--pg-accent)" : "var(--pg-border)"}`,
                      background: row.location === loc ? "rgba(212,168,83,0.12)" : "transparent",
                      color: row.location === loc ? "var(--pg-accent)" : "var(--pg-muted)",
                    }}
                  >
                    {loc === "local" ? "L" : "V"}
                  </button>
                ))}
              </div>

              {/* Tournament select */}
              <select
                style={selectStyle}
                value={row.description ?? ""}
                onChange={e => updateRow(i, { description: e.target.value || null })}
              >
                <option value="">— Ninguno —</option>
                {tournaments.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {/* Squad chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                {squads.map(s => (
                  <SquadChip
                    key={s.id}
                    squad={s}
                    active={row.groupIds.includes(s.id)}
                    onClick={() => toggleGroup(i, s.id)}
                    size="sm"
                  />
                ))}
                {squads.length === 0 && (
                  <span style={{ fontSize: 10, color: "var(--pg-muted)" }}>Sin planteles</span>
                )}
              </div>

              {/* Remove */}
              <button
                onClick={() => removeRow(i)}
                disabled={rows.length === 1}
                style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid var(--pg-border)", borderRadius: 5, cursor: rows.length === 1 ? "not-allowed" : "pointer", color: "var(--pg-muted)", opacity: rows.length === 1 ? 0.3 : 1, flexShrink: 0 }}
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderTop: "1px solid var(--pg-border)", flexShrink: 0 }}>
          <button
            onClick={addRow}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", border: "1px solid var(--pg-border)", color: "var(--pg-muted)" }}
          >
            <Plus size={11} />
            Agregar partido
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onClose}
              style={{ padding: "7px 14px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", border: "1px solid var(--pg-border)", color: "var(--pg-muted)" }}
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={!canImport}
              style={{ padding: "7px 14px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: canImport ? "pointer" : "not-allowed", background: "var(--pg-accent)", border: "none", color: "var(--pg-accent-text)", opacity: canImport ? 1 : 0.5 }}
            >
              Importar {validRows.length > 0 ? `${validRows.length} partido${validRows.length !== 1 ? "s" : ""}` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
