"use client";

import { useState } from "react";
import { X, Plus, Trash2, Pencil, Check } from "lucide-react";
import { ClubPeriod, PeriodType, PERIOD_TYPE_LABELS, SquadColor } from "@/types";
import { SQUAD_COLOR_MAP } from "@/components/squads/SquadChip";
import { createPeriod, updatePeriod, deletePeriod } from "@/app/(dashboard)/calendar/actions";

const COLORS: SquadColor[] = ["green", "amber", "blue", "red", "purple", "pink", "orange", "teal"];
const PERIOD_TYPES: PeriodType[] = ["temporada", "pretemporada", "postemporada", "torneo", "otro"];

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

interface PeriodFormState {
  name: string;
  type: PeriodType;
  startDate: string;
  endDate: string;
  color: SquadColor;
}

const EMPTY_FORM: PeriodFormState = {
  name: "",
  type: "temporada",
  startDate: "",
  endDate: "",
  color: "green",
};

interface ManagePeriodsModalProps {
  visible: boolean;
  periods: ClubPeriod[];
  onPeriodsChange: (periods: ClubPeriod[]) => void;
  onClose: () => void;
}

export default function ManagePeriodsModal({ visible, periods, onPeriodsChange, onClose }: ManagePeriodsModalProps) {
  const [form, setForm] = useState<PeriodFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!visible) return null;

  const startEdit = (p: ClubPeriod) => {
    setEditingId(p.id);
    setForm({ name: p.name, type: p.type, startDate: p.startDate, endDate: p.endDate, color: p.color });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const canSave = form.name.trim() && form.startDate && form.endDate && form.endDate >= form.startDate;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      color: form.color,
    };
    if (editingId) {
      const result = await updatePeriod(editingId, payload);
      if ("period" in result) {
        onPeriodsChange(periods.map(p => p.id === editingId ? result.period : p));
        cancelEdit();
      }
    } else {
      const result = await createPeriod(payload);
      if ("period" in result) {
        onPeriodsChange([...periods, result.period].sort((a, b) => a.startDate.localeCompare(b.startDate)));
        setForm(EMPTY_FORM);
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const result = await deletePeriod(id);
    if ("ok" in result) {
      onPeriodsChange(periods.filter(p => p.id !== id));
      if (editingId === id) cancelEdit();
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--pg-card)", border: "1px solid var(--pg-border)", borderRadius: 12, width: "100%", maxWidth: 520, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--pg-border)", flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--pg-text)" }}>Períodos de temporada</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--pg-muted)", padding: 4, borderRadius: 5 }}>
            <X size={14} />
          </button>
        </div>

        {/* Existing periods */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
          {periods.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--pg-muted)", textAlign: "center", padding: "20px 0" }}>
              Aún no hay períodos definidos.
            </div>
          )}
          {periods.map(p => {
            const color = SQUAD_COLOR_MAP[p.color as SquadColor];
            const isEditing = editingId === p.id;
            return (
              <div key={p.id} style={{ borderRadius: 8, border: `1px solid ${isEditing ? color + "60" : "var(--pg-border)"}`, background: isEditing ? `${color}08` : "var(--pg-surface)", overflow: "hidden" }}>
                {!isEditing ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--pg-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: "var(--pg-muted)", marginTop: 1 }}>
                        {PERIOD_TYPE_LABELS[p.type]} · {formatDate(p.startDate)} — {formatDate(p.endDate)}
                      </div>
                    </div>
                    <button onClick={() => startEdit(p)} style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid var(--pg-border)", borderRadius: 5, cursor: "pointer", color: "var(--pg-muted)" }}>
                      <Pencil size={10} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid var(--pg-border)", borderRadius: 5, cursor: "pointer", color: "var(--pg-muted)" }}>
                      <Trash2 size={10} />
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: "12px" }}>
                    <PeriodForm form={form} onChange={setForm} />
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <button onClick={cancelEdit} style={{ flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", background: "transparent", border: "1px solid var(--pg-border)", color: "var(--pg-muted)" }}>
                        Cancelar
                      </button>
                      <button onClick={handleSave} disabled={!canSave || saving} style={{ flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: canSave && !saving ? "pointer" : "not-allowed", background: "var(--pg-accent)", border: "none", color: "var(--pg-accent-text)", opacity: canSave && !saving ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <Check size={10} />
                        Guardar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* New period form */}
        {!editingId && (
          <div style={{ borderTop: "1px solid var(--pg-border)", padding: "14px 18px", flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--pg-muted)", marginBottom: 10 }}>
              Nuevo período
            </div>
            <PeriodForm form={form} onChange={setForm} />
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              style={{ marginTop: 10, width: "100%", padding: "8px 0", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: canSave && !saving ? "pointer" : "not-allowed", background: "var(--pg-accent)", border: "none", color: "var(--pg-accent-text)", opacity: canSave && !saving ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
            >
              <Plus size={11} />
              Agregar período
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

const inputStyleLocal: React.CSSProperties = {
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

function PeriodForm({ form, onChange }: { form: PeriodFormState; onChange: (f: PeriodFormState) => void }) {
  const set = (patch: Partial<PeriodFormState>) => onChange({ ...form, ...patch });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Name + type */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8 }}>
        <div>
          <label style={{ fontSize: 9, color: "var(--pg-muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Nombre *</label>
          <input style={inputStyleLocal} value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Ej: Temporada 2026" />
        </div>
        <div>
          <label style={{ fontSize: 9, color: "var(--pg-muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Tipo</label>
          <select
            style={{ ...inputStyleLocal, appearance: "none" }}
            value={form.type}
            onChange={e => set({ type: e.target.value as PeriodType })}
          >
            {PERIOD_TYPES.map(t => (
              <option key={t} value={t}>{PERIOD_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <label style={{ fontSize: 9, color: "var(--pg-muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Desde *</label>
          <input type="date" style={inputStyleLocal} value={form.startDate} onChange={e => set({ startDate: e.target.value })} />
        </div>
        <div>
          <label style={{ fontSize: 9, color: "var(--pg-muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Hasta *</label>
          <input type="date" style={inputStyleLocal} value={form.endDate} onChange={e => set({ endDate: e.target.value })} min={form.startDate} />
        </div>
      </div>

      {/* Color */}
      <div>
        <label style={{ fontSize: 9, color: "var(--pg-muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Color</label>
        <div style={{ display: "flex", gap: 6 }}>
          {COLORS.map(c => {
            const hex = SQUAD_COLOR_MAP[c];
            return (
              <button
                key={c}
                onClick={() => set({ color: c })}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: hex,
                  border: form.color === c ? `2px solid var(--pg-text)` : "2px solid transparent",
                  cursor: "pointer",
                  flexShrink: 0,
                  outline: form.color === c ? `2px solid ${hex}` : "none",
                  outlineOffset: 1,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
