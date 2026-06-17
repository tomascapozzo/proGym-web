"use client";

import React from "react";
import type { useRoutineCreator } from "@/hooks/useRoutineCreator";
import type { EffortType, RoutineCircuit, RoutineDayExercise, RoutineDay, RpePromptType } from "@/types/routine";
import ExercisePicker from "./ExercisePicker";
import RepsPicker from "./RepsPicker";

const DESCANSO_OPTIONS = ["30s", "45s", "60s", "90s", "2min", "3min", "5min"];

const ROUTINE_TYPES: { value: "daily" | "weekly" | "monthly"; label: string }[] = [
  { value: "daily", label: "Diaria" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
];

const EFFORT_TYPE_OPTIONS: { value: EffortType; label: string }[] = [
  { value: "rir", label: "RIR" },
  { value: "rpe", label: "RPE" },
];

const RPE_OPTIONS: { value: RpePromptType; label: string; desc: string }[] = [
  { value: "serie",  label: "Por serie",   desc: "Al finalizar cada serie" },
  { value: "bloque", label: "Por bloque",  desc: "Al finalizar cada circuito o superset" },
  { value: "sesion", label: "Por sesion",  desc: "Al finalizar el entrenamiento" },
  { value: "none",   label: "Sin RPE",     desc: "No registrar esfuerzo" },
];

const inputStyle: React.CSSProperties = {
  background: "var(--pg-surface)",
  border: "1px solid var(--pg-border)",
  borderRadius: 8,
  padding: "8px 10px",
  color: "var(--pg-text)",
  fontSize: 13,
  outline: "none",
  width: "100%",
};

const stepperBtn: React.CSSProperties = {
  width: 26,
  height: 26,
  background: "var(--pg-surface)",
  border: "1px solid var(--pg-border)",
  borderRadius: 6,
  cursor: "pointer",
  color: "var(--pg-text)",
  fontSize: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

// ExerciseRow

function ExerciseRow({
  ej,
  onRemove,
  onUpdateDescanso,
  onUpdateSeries,
  onUpdateRep,
  onUpdatePeso,
  onUpdateRir,
  onSetEffortType,
  onUpdateNota,
  onToggleRpe,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  ej: RoutineDayExercise;
  onRemove: () => void;
  onUpdateDescanso: (v: string) => void;
  onUpdateSeries: (v: number) => void;
  onUpdateRep: (si: number, v: string) => void;
  onUpdatePeso: (si: number, v: string) => void;
  onUpdateRir: (si: number, v: string) => void;
  onSetEffortType: (v: EffortType) => void;
  onUpdateNota: (v: string) => void;
  onToggleRpe: () => void;
  onMove: (dir: "up" | "down") => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const effortType = ej.effortType ?? "rir";
  const effortLabel = effortType === "rpe" ? "RPE" : "RIR";

  return (
    <div style={{ background: "var(--pg-bg)", borderRadius: 10, padding: 12, marginBottom: 8, border: "1px solid var(--pg-border)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--pg-text)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ej.nombre}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 8 }}>
          <button onClick={() => onMove("up")} disabled={!canMoveUp} style={{ ...stepperBtn, width: 22, height: 22, opacity: canMoveUp ? 1 : 0.3 }}>up</button>
          <button onClick={() => onMove("down")} disabled={!canMoveDown} style={{ ...stepperBtn, width: 22, height: 22, opacity: canMoveDown ? 1 : 0.3 }}>dn</button>
          <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pg-red)", fontSize: 17, lineHeight: 1, padding: "0 0 0 4px" }}>x</button>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--pg-muted)" }}>Series</span>
          <button style={stepperBtn} onClick={() => onUpdateSeries(Math.max(1, ej.series - 1))}>-</button>
          <span style={{ width: 20, textAlign: "center", fontSize: 13, color: "var(--pg-text)" }}>{ej.series}</span>
          <button style={stepperBtn} onClick={() => onUpdateSeries(Math.min(10, ej.series + 1))}>+</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <span style={{ fontSize: 11, color: "var(--pg-muted)" }}>Descanso</span>
          <select value={ej.descanso} onChange={(e) => onUpdateDescanso(e.target.value)} style={{ background: "var(--pg-surface)", border: "1px solid var(--pg-border)", borderRadius: 6, padding: "4px 8px", color: "var(--pg-text)", fontSize: 12, outline: "none", cursor: "pointer" }}>
            {DESCANSO_OPTIONS.map((d) => (<option key={d} value={d}>{d}</option>))}
          </select>
        </div>
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 6, gap: 8 }}>
          <span style={{ fontSize: 10, color: "var(--pg-muted)", flex: 1 }}>PESO (kg) y {effortLabel} por serie</span>
          <div style={{ display: "flex", background: "var(--pg-surface)", borderRadius: 6, border: "1px solid var(--pg-border)", overflow: "hidden" }}>
            {EFFORT_TYPE_OPTIONS.map(({ value, label }) => (
              <button key={value} onClick={() => onSetEffortType(value)} style={{ padding: "3px 8px", fontSize: 10, fontWeight: 700, border: "none", cursor: "pointer", background: effortType === value ? "var(--pg-accent)" : "transparent", color: effortType === value ? "var(--pg-accent-text)" : "var(--pg-muted)", borderRadius: 5 }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr 1fr", gap: 5, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "var(--pg-muted)" }} />
          <span style={{ fontSize: 10, color: "var(--pg-muted)", textAlign: "center" }}>REPS</span>
          <span style={{ fontSize: 10, color: "var(--pg-muted)", textAlign: "center" }}>PESO (kg)</span>
          <span style={{ fontSize: 10, textAlign: "center", color: "var(--pg-accent)", fontWeight: 700 }}>{effortLabel}</span>
          {ej.reps.map((rep, si) => (
            <React.Fragment key={si}>
              <span style={{ fontSize: 11, color: "var(--pg-muted)" }}>S{si + 1}</span>
              <RepsPicker value={rep} onChange={(v) => onUpdateRep(si, v)} />
              <input value={ej.peso?.[si] ?? ""} onChange={(e) => onUpdatePeso(si, e.target.value)} placeholder="&mdash;" style={{ ...inputStyle, padding: "5px 8px", fontSize: 12, textAlign: "center" }} />
              <input value={ej.rir?.[si] ?? ""} onChange={(e) => onUpdateRir(si, e.target.value)} placeholder="0" type="number" style={{ ...inputStyle, padding: "5px 8px", fontSize: 12, textAlign: "center", background: "var(--pg-accent-bg)", color: "var(--pg-accent)", border: "1px solid var(--pg-accent)", fontWeight: 700 }} />
            </React.Fragment>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        <input value={ej.nota ?? ""} onChange={(e) => onUpdateNota(e.target.value)} placeholder="Agregar nota..." style={{ ...inputStyle, flex: 1, fontSize: 11, padding: "5px 8px", color: ej.nota ? "var(--pg-text)" : "var(--pg-muted)" }} />
        <button onClick={onToggleRpe} style={{ fontSize: 10, padding: "5px 10px", borderRadius: 5, border: `1px solid ${ej.rpe ? "var(--pg-blue)" : "var(--pg-border)"}`, background: ej.rpe ? "var(--pg-blue-dim)" : "transparent", color: ej.rpe ? "var(--pg-blue)" : "var(--pg-muted)", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>Pedir RPE</button>
      </div>
    </div>
  );
}

// CircuitExerciseRow

function CircuitExerciseRow({
  ex,
  exIdx,
  onMoveEx,
  onRemoveEx,
  onUpdateExRep,
  onUpdateExPeso,
  onUpdateExRir,
  onSetExEffortType,
  onUpdateExNota,
  onToggleExRpe,
  totalEjercicios,
}: {
  ex: import("@/types/routine").ExerciseEntry;
  exIdx: number;
  rondas: number;
  onMoveEx: (dir: "up" | "down") => void;
  onRemoveEx: () => void;
  onUpdateExRep: (ri: number, v: string) => void;
  onUpdateExPeso: (ri: number, v: string) => void;
  onUpdateExRir: (ri: number, v: string) => void;
  onSetExEffortType: (v: EffortType) => void;
  onUpdateExNota: (v: string) => void;
  onToggleExRpe: () => void;
  totalEjercicios: number;
}) {
  const effortType = ex.effortType ?? "rir";
  const effortLabel = effortType === "rpe" ? "RPE" : "RIR";

  return (
    <div style={{ background: "var(--pg-bg)", borderRadius: 8, padding: 10, marginBottom: 6, border: "1px solid var(--pg-border)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--pg-text)" }}>{ex.nombre}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={() => onMoveEx("up")} disabled={exIdx === 0} style={{ ...stepperBtn, width: 22, height: 22, opacity: exIdx === 0 ? 0.3 : 1 }}>up</button>
          <button onClick={() => onMoveEx("down")} disabled={exIdx === totalEjercicios - 1} style={{ ...stepperBtn, width: 22, height: 22, opacity: exIdx === totalEjercicios - 1 ? 0.3 : 1 }}>dn</button>
          <button onClick={onRemoveEx} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pg-red)", fontSize: 15, lineHeight: 1, padding: "0 0 0 4px" }}>x</button>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 5, gap: 8 }}>
        <span style={{ fontSize: 10, color: "var(--pg-muted)", flex: 1 }}>PESO (kg) y {effortLabel} por ronda</span>
        <div style={{ display: "flex", background: "var(--pg-surface)", borderRadius: 6, border: "1px solid var(--pg-border)", overflow: "hidden" }}>
          {EFFORT_TYPE_OPTIONS.map(({ value, label }) => (
            <button key={value} onClick={() => onSetExEffortType(value)} style={{ padding: "2px 7px", fontSize: 10, fontWeight: 700, border: "none", cursor: "pointer", background: effortType === value ? "var(--pg-accent)" : "transparent", color: effortType === value ? "var(--pg-accent-text)" : "var(--pg-muted)", borderRadius: 5 }}>{label}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr 1fr", gap: 5, alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "var(--pg-muted)" }} />
        <span style={{ fontSize: 10, color: "var(--pg-muted)", textAlign: "center" }}>REPS</span>
        <span style={{ fontSize: 10, color: "var(--pg-muted)", textAlign: "center" }}>PESO (kg)</span>
        <span style={{ fontSize: 10, textAlign: "center", color: "var(--pg-accent)", fontWeight: 700 }}>{effortLabel}</span>
        {ex.reps.map((rep, ri) => (
          <React.Fragment key={ri}>
            <span style={{ fontSize: 11, color: "var(--pg-muted)" }}>R{ri + 1}</span>
            <RepsPicker value={rep} onChange={(v) => onUpdateExRep(ri, v)} />
            <input value={ex.peso?.[ri] ?? ""} onChange={(e) => onUpdateExPeso(ri, e.target.value)} placeholder="&mdash;" style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, textAlign: "center" }} />
            <input value={ex.rir?.[ri] ?? ""} onChange={(e) => onUpdateExRir(ri, e.target.value)} placeholder="0" type="number" style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, textAlign: "center", background: "var(--pg-accent-bg)", color: "var(--pg-accent)", border: "1px solid var(--pg-accent)", fontWeight: 700 }} />
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <input value={ex.nota ?? ""} onChange={(e) => onUpdateExNota(e.target.value)} placeholder="Agregar nota..." style={{ ...inputStyle, flex: 1, fontSize: 11, padding: "4px 7px", color: ex.nota ? "var(--pg-text)" : "var(--pg-muted)" }} />
        <button onClick={onToggleExRpe} style={{ fontSize: 10, padding: "4px 9px", borderRadius: 5, border: `1px solid ${ex.rpe ? "var(--pg-blue)" : "var(--pg-border)"}`, background: ex.rpe ? "var(--pg-blue-dim)" : "transparent", color: ex.rpe ? "var(--pg-blue)" : "var(--pg-muted)", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>Pedir RPE</button>
      </div>
    </div>
  );
}

// CircuitCard

function CircuitCard({
  circ,
  onUpdate,
  onRemove,
  onToggleRpe,
  onOpenExPicker,
  onMoveEx,
  onRemoveEx,
  onUpdateExRep,
  onUpdateExPeso,
  onUpdateExRir,
  onSetExEffortType,
  onUpdateExNota,
  onToggleExRpe,
}: {
  circ: RoutineCircuit;
  onUpdate: (field: keyof RoutineCircuit, v: string | number) => void;
  onRemove: () => void;
  onToggleRpe: () => void;
  onOpenExPicker: () => void;
  onMoveEx: (exIdx: number, dir: "up" | "down") => void;
  onRemoveEx: (exIdx: number) => void;
  onUpdateExRep: (exIdx: number, ri: number, v: string) => void;
  onUpdateExPeso: (exIdx: number, ri: number, v: string) => void;
  onUpdateExRir: (exIdx: number, ri: number, v: string) => void;
  onSetExEffortType: (exIdx: number, v: EffortType) => void;
  onUpdateExNota: (exIdx: number, v: string) => void;
  onToggleExRpe: (exIdx: number) => void;
}) {
  return (
    <div style={{ border: "1px solid rgba(124,58,237,0.3)", borderRadius: 10, padding: 12, marginTop: 8, background: "rgba(124,58,237,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "var(--pg-purple-dim)", color: "var(--pg-purple)", letterSpacing: 0.5, flexShrink: 0 }}>CIRCUITO</span>
        <input value={circ.nombre} onChange={(e) => onUpdate("nombre", e.target.value)} placeholder="Nombre del circuito" style={{ ...inputStyle, flex: 1 }} />
        <button onClick={onToggleRpe} style={{ fontSize: 10, padding: "4px 9px", borderRadius: 5, border: `1px solid ${circ.rpe ? "var(--pg-blue)" : "rgba(124,58,237,0.3)"}`, background: circ.rpe ? "var(--pg-blue-dim)" : "transparent", color: circ.rpe ? "var(--pg-blue)" : "#C4B5FD", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>Pedir RPE</button>
        <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pg-red)", fontSize: 17, lineHeight: 1, padding: 0, flexShrink: 0 }}>x</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--pg-muted)" }}>Series</span>
          <button style={stepperBtn} onClick={() => onUpdate("rondas", Math.max(1, circ.rondas - 1))}>-</button>
          <span style={{ width: 20, textAlign: "center", fontSize: 13, color: "var(--pg-text)" }}>{circ.rondas}</span>
          <button style={stepperBtn} onClick={() => onUpdate("rondas", Math.min(10, circ.rondas + 1))}>+</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <span style={{ fontSize: 11, color: "var(--pg-muted)" }}>Descanso</span>
          <select value={circ.descanso} onChange={(e) => onUpdate("descanso", e.target.value)} style={{ background: "var(--pg-surface)", border: "1px solid var(--pg-border)", borderRadius: 6, padding: "4px 8px", color: "var(--pg-text)", fontSize: 12, outline: "none", cursor: "pointer" }}>
            {DESCANSO_OPTIONS.map((d) => (<option key={d} value={d}>{d}</option>))}
          </select>
        </div>
      </div>
      {circ.ejercicios.map((ex, exIdx) => (
        <CircuitExerciseRow
          key={exIdx}
          ex={ex}
          exIdx={exIdx}
          rondas={circ.rondas}
          totalEjercicios={circ.ejercicios.length}
          onMoveEx={(dir) => onMoveEx(exIdx, dir)}
          onRemoveEx={() => onRemoveEx(exIdx)}
          onUpdateExRep={(ri, v) => onUpdateExRep(exIdx, ri, v)}
          onUpdateExPeso={(ri, v) => onUpdateExPeso(exIdx, ri, v)}
          onUpdateExRir={(ri, v) => onUpdateExRir(exIdx, ri, v)}
          onSetExEffortType={(v) => onSetExEffortType(exIdx, v)}
          onUpdateExNota={(v) => onUpdateExNota(exIdx, v)}
          onToggleExRpe={() => onToggleExRpe(exIdx)}
        />
      ))}
      <button onClick={onOpenExPicker} style={{ width: "100%", padding: "8px 0", borderRadius: 8, border: "1px solid rgba(124,58,237,0.3)", background: "transparent", color: "#C4B5FD", fontSize: 12, cursor: "pointer", marginTop: 4 }}>+ Agregar ejercicio al circuito</button>
    </div>
  );
}

// DayCard

function DayCard({
  day,
  dayIdx,
  isEditing,
  onToggleEdit,
  canRemove,
  onRemove,
  onDuplicate,
  onUpdateField,
  onRemoveExercise,
  onUpdateDescanso,
  onUpdateSeries,
  onUpdateRep,
  onUpdatePeso,
  onUpdateRir,
  onSetEffortType,
  onUpdateNota,
  onToggleRpe,
  onOpenExPicker,
  onMoveExercise,
  onAddCircuit,
  onUpdateCircuit,
  onRemoveCircuit,
  onOpenCircuitExPicker,
  onMoveCircuitEx,
  onRemoveCircuitEx,
  onUpdateCircuitExRep,
  onUpdateCircuitExPeso,
  onUpdateCircuitExRir,
  onSetCircuitExEffortType,
  onUpdateCircuitExNota,
  onToggleCircuitExRpe,
  onToggleCircuitRpe,
}: {
  day: RoutineDay;
  dayIdx: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  canRemove: boolean;
  onRemove: () => void;
  onDuplicate: () => void;
  onUpdateField: (f: "dia" | "enfoque", v: string) => void;
  onRemoveExercise: (exIdx: number) => void;
  onUpdateDescanso: (exIdx: number, v: string) => void;
  onUpdateSeries: (exIdx: number, v: number) => void;
  onUpdateRep: (exIdx: number, si: number, v: string) => void;
  onUpdatePeso: (exIdx: number, si: number, v: string) => void;
  onUpdateRir: (exIdx: number, si: number, v: string) => void;
  onSetEffortType: (exIdx: number, v: EffortType) => void;
  onUpdateNota: (exIdx: number, v: string) => void;
  onToggleRpe: (exIdx: number) => void;
  onOpenExPicker: () => void;
  onMoveExercise: (exIdx: number, dir: "up" | "down") => void;
  onAddCircuit: () => void;
  onUpdateCircuit: (circIdx: number, f: keyof RoutineCircuit, v: string | number) => void;
  onRemoveCircuit: (circIdx: number) => void;
  onOpenCircuitExPicker: (circIdx: number) => void;
  onMoveCircuitEx: (circIdx: number, exIdx: number, dir: "up" | "down") => void;
  onRemoveCircuitEx: (circIdx: number, exIdx: number) => void;
  onUpdateCircuitExRep: (circIdx: number, exIdx: number, ri: number, v: string) => void;
  onUpdateCircuitExPeso: (circIdx: number, exIdx: number, ri: number, v: string) => void;
  onUpdateCircuitExRir: (circIdx: number, exIdx: number, ri: number, v: string) => void;
  onSetCircuitExEffortType: (circIdx: number, exIdx: number, v: EffortType) => void;
  onUpdateCircuitExNota: (circIdx: number, exIdx: number, v: string) => void;
  onToggleCircuitExRpe: (circIdx: number, exIdx: number) => void;
  onToggleCircuitRpe: (circIdx: number) => void;
}) {
  const circuits = day.circuitos ?? [];

  return (
    <div style={{ background: "var(--pg-card)", borderRadius: 12, padding: 14, marginBottom: 10, border: `1px solid ${isEditing ? "var(--pg-accent)" : "var(--pg-border)"}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onToggleEdit} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", flex: 1, padding: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--pg-text)" }}>
            {day.dia || `Dia ${dayIdx + 1}`}
            {day.enfoque && <span style={{ color: "var(--pg-accent)", fontWeight: 400 }}> - {day.enfoque}</span>}
          </div>
          <div style={{ fontSize: 11, color: "var(--pg-muted)", marginTop: 2 }}>
            {day.ejercicios.length} ejercicio{day.ejercicios.length !== 1 ? "s" : ""}
            {circuits.length > 0 && ` - ${circuits.length} circuito${circuits.length !== 1 ? "s" : ""}`}
          </div>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button onClick={onDuplicate} title="Duplicar dia" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pg-muted)", padding: "0 6px", fontSize: 14, lineHeight: 1 }}>D</button>
          {canRemove && (
            <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pg-red)", fontSize: 18, padding: "0 0 0 6px" }}>x</button>
          )}
        </div>
      </div>
      {isEditing && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input value={day.dia} onChange={(e) => onUpdateField("dia", e.target.value)} placeholder="Nombre del dia" style={inputStyle} />
            <input value={day.enfoque} onChange={(e) => onUpdateField("enfoque", e.target.value)} placeholder="Enfoque" style={inputStyle} />
          </div>
          {day.ejercicios.map((ej, exIdx) => (
            <ExerciseRow
              key={exIdx}
              ej={ej}
              onRemove={() => onRemoveExercise(exIdx)}
              onUpdateDescanso={(v) => onUpdateDescanso(exIdx, v)}
              onUpdateSeries={(v) => onUpdateSeries(exIdx, v)}
              onUpdateRep={(si, v) => onUpdateRep(exIdx, si, v)}
              onUpdatePeso={(si, v) => onUpdatePeso(exIdx, si, v)}
              onUpdateRir={(si, v) => onUpdateRir(exIdx, si, v)}
              onSetEffortType={(v) => onSetEffortType(exIdx, v)}
              onUpdateNota={(v) => onUpdateNota(exIdx, v)}
              onToggleRpe={() => onToggleRpe(exIdx)}
              onMove={(dir) => onMoveExercise(exIdx, dir)}
              canMoveUp={exIdx > 0}
              canMoveDown={exIdx < day.ejercicios.length - 1}
            />
          ))}
          <button onClick={onOpenExPicker} style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: "1px solid var(--pg-border)", background: "transparent", color: "var(--pg-accent)", fontSize: 13, cursor: "pointer", marginTop: 4 }}>+ Agregar ejercicio</button>
          {circuits.map((circ, circIdx) => (
            <CircuitCard
              key={circIdx}
              circ={circ}
              onUpdate={(f, v) => onUpdateCircuit(circIdx, f, v)}
              onRemove={() => onRemoveCircuit(circIdx)}
              onToggleRpe={() => onToggleCircuitRpe(circIdx)}
              onOpenExPicker={() => onOpenCircuitExPicker(circIdx)}
              onMoveEx={(exIdx, dir) => onMoveCircuitEx(circIdx, exIdx, dir)}
              onRemoveEx={(exIdx) => onRemoveCircuitEx(circIdx, exIdx)}
              onUpdateExRep={(exIdx, ri, v) => onUpdateCircuitExRep(circIdx, exIdx, ri, v)}
              onUpdateExPeso={(exIdx, ri, v) => onUpdateCircuitExPeso(circIdx, exIdx, ri, v)}
              onUpdateExRir={(exIdx, ri, v) => onUpdateCircuitExRir(circIdx, exIdx, ri, v)}
              onSetExEffortType={(exIdx, v) => onSetCircuitExEffortType(circIdx, exIdx, v)}
              onUpdateExNota={(exIdx, v) => onUpdateCircuitExNota(circIdx, exIdx, v)}
              onToggleExRpe={(exIdx) => onToggleCircuitExRpe(circIdx, exIdx)}
            />
          ))}
          <button onClick={onAddCircuit} style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: "1px solid rgba(124,58,237,0.3)", background: "transparent", color: "#C4B5FD", fontSize: 13, cursor: "pointer", marginTop: 8 }}>+ Crear circuito</button>
        </div>
      )}
    </div>
  );
}

// Main Modal

type Props = ReturnType<typeof useRoutineCreator> & { clubId: string };

export default function RoutineCreatorModal({
  createVisible,
  editingRoutineId,
  closeCreateRoutine,
  newRoutineName,
  setNewRoutineName,
  newRoutineType,
  changeRoutineType,
  rpePrompt,
  changeRpePrompt,
  newDays,
  editingDayIdx,
  setEditingDayIdx,
  savingRoutine,
  saveError,
  exPickerVisible,
  setExPickerVisible,
  circuitExPickerVisible,
  setCircuitExPickerVisible,
  library,
  loadingLibrary,
  addDay,
  updateDay,
  removeDay,
  duplicateDay,
  updateExercise,
  updateExerciseSeries,
  updateExerciseRep,
  updateExercisePeso,
  updateExerciseRir,
  setExerciseEffortType,
  updateExerciseNota,
  toggleExerciseRpe,
  removeExercise,
  openExPickerForDay,
  pickExercises,
  addCircuit,
  updateCircuit,
  removeCircuit,
  updateCircuitExRep,
  updateCircuitExPeso,
  updateCircuitExRir,
  setCircuitExEffortType,
  updateCircuitExNota,
  toggleCircuitRpe,
  toggleCircuitExRpe,
  removeCircuitEx,
  moveExercise,
  moveCircuitEx,
  openCircuitExPicker,
  pickCircuitExercises,
  saveRoutine,
  clubId,
}: Props) {
  const isEditing = !!editingRoutineId;
  const canSave =
    !!newRoutineName.trim() &&
    newDays.length > 0 &&
    newDays.some((d) => d.ejercicios.length > 0 || (d.circuitos ?? []).some((c) => c.ejercicios.length > 0));

  if (!createVisible) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--pg-bg)", borderRadius: 16, border: "1px solid var(--pg-border)", width: "min(760px, 96vw)", height: "min(90vh, 920px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "18px 22px 16px", borderBottom: "1px solid var(--pg-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "var(--pg-text)" }}>{isEditing ? "Editar rutina" : "Crear rutina"}</span>
          <button onClick={closeCreateRoutine} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pg-muted)", fontSize: 14 }}>Cancelar</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px 24px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "var(--pg-muted)", marginBottom: 8 }}>NOMBRE DE LA RUTINA</div>
          <input value={newRoutineName} onChange={(e) => setNewRoutineName(e.target.value)} placeholder="Ej: Push Pull Legs" style={{ ...inputStyle, marginBottom: 22, fontSize: 15, padding: "11px 13px" }} />
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "var(--pg-muted)", marginBottom: 8 }}>TIPO DE RUTINA</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {ROUTINE_TYPES.map(({ value, label }) => {
              const active = newRoutineType === value;
              return (
                <button key={value} onClick={() => changeRoutineType(value)} style={{ flex: 1, paddingTop: 10, paddingBottom: 10, borderRadius: 10, border: `1.5px solid ${active ? "var(--pg-accent)" : "var(--pg-border)"}`, background: active ? "var(--pg-accent-bg)" : "var(--pg-card)", color: active ? "var(--pg-accent)" : "var(--pg-muted)", fontWeight: active ? 700 : 400, fontSize: 13, cursor: "pointer" }}>
                  {label}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "var(--pg-muted)", marginBottom: 8 }}>REGISTRO DE ESFUERZO (RPE)</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {RPE_OPTIONS.map(({ value, label, desc }) => {
              const active = rpePrompt === value;
              return (
                <button key={value} onClick={() => changeRpePrompt(value)} style={{ flex: 1, padding: "10px 8px", borderRadius: 10, border: `1.5px solid ${active ? "var(--pg-blue)" : "var(--pg-border)"}`, background: active ? "var(--pg-blue-dim)" : "var(--pg-card)", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: active ? 700 : 400, color: active ? "var(--pg-blue)" : "var(--pg-muted)", marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 10, color: active ? "var(--pg-blue)" : "var(--pg-disabled)", lineHeight: 1.3 }}>{desc}</div>
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "var(--pg-muted)", marginBottom: 12 }}>DIAS ({newDays.length})</div>
          {newDays.map((day, dayIdx) => (
            <DayCard
              key={dayIdx}
              day={day}
              dayIdx={dayIdx}
              isEditing={editingDayIdx === dayIdx}
              onToggleEdit={() => setEditingDayIdx(editingDayIdx === dayIdx ? null : dayIdx)}
              canRemove={newRoutineType !== "daily"}
              onRemove={() => removeDay(dayIdx)}
              onDuplicate={() => duplicateDay(dayIdx)}
              onUpdateField={(f, v) => updateDay(dayIdx, f, v)}
              onRemoveExercise={(exIdx) => removeExercise(dayIdx, exIdx)}
              onUpdateDescanso={(exIdx, v) => updateExercise(dayIdx, exIdx, "descanso", v)}
              onUpdateSeries={(exIdx, v) => updateExerciseSeries(dayIdx, exIdx, v)}
              onUpdateRep={(exIdx, si, v) => updateExerciseRep(dayIdx, exIdx, si, v)}
              onUpdatePeso={(exIdx, si, v) => updateExercisePeso(dayIdx, exIdx, si, v)}
              onUpdateRir={(exIdx, si, v) => updateExerciseRir(dayIdx, exIdx, si, v)}
              onSetEffortType={(exIdx, v) => setExerciseEffortType(dayIdx, exIdx, v)}
              onUpdateNota={(exIdx, v) => updateExerciseNota(dayIdx, exIdx, v)}
              onToggleRpe={(exIdx) => toggleExerciseRpe(dayIdx, exIdx)}
              onOpenExPicker={() => openExPickerForDay(dayIdx)}
              onMoveExercise={(exIdx, dir) => moveExercise(dayIdx, exIdx, dir)}
              onAddCircuit={() => addCircuit(dayIdx)}
              onUpdateCircuit={(circIdx, f, v) => updateCircuit(dayIdx, circIdx, f, v)}
              onRemoveCircuit={(circIdx) => removeCircuit(dayIdx, circIdx)}
              onOpenCircuitExPicker={(circIdx) => openCircuitExPicker(dayIdx, circIdx)}
              onMoveCircuitEx={(circIdx, exIdx, dir) => moveCircuitEx(dayIdx, circIdx, exIdx, dir)}
              onRemoveCircuitEx={(circIdx, exIdx) => removeCircuitEx(dayIdx, circIdx, exIdx)}
              onUpdateCircuitExRep={(circIdx, exIdx, ri, v) => updateCircuitExRep(dayIdx, circIdx, exIdx, ri, v)}
              onUpdateCircuitExPeso={(circIdx, exIdx, ri, v) => updateCircuitExPeso(dayIdx, circIdx, exIdx, ri, v)}
              onUpdateCircuitExRir={(circIdx, exIdx, ri, v) => updateCircuitExRir(dayIdx, circIdx, exIdx, ri, v)}
              onSetCircuitExEffortType={(circIdx, exIdx, v) => setCircuitExEffortType(dayIdx, circIdx, exIdx, v)}
              onUpdateCircuitExNota={(circIdx, exIdx, v) => updateCircuitExNota(dayIdx, circIdx, exIdx, v)}
              onToggleCircuitExRpe={(circIdx, exIdx) => toggleCircuitExRpe(dayIdx, circIdx, exIdx)}
              onToggleCircuitRpe={(circIdx) => toggleCircuitRpe(dayIdx, circIdx)}
            />
          ))}
          {newRoutineType !== "daily" && (
            <button onClick={addDay} style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "1px solid var(--pg-border)", background: "transparent", color: "var(--pg-accent)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>+ Agregar dia</button>
          )}
        </div>
        {(canSave || saveError) && (
          <div style={{ padding: "14px 22px", borderTop: "1px solid var(--pg-border)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
            {saveError && <span style={{ fontSize: 12, color: "var(--pg-red)", flex: 1 }}>{saveError}</span>}
            {canSave && (
              <button onClick={saveRoutine} disabled={savingRoutine} style={{ padding: "12px 32px", borderRadius: 12, border: "none", background: "var(--pg-accent)", color: "var(--pg-accent-text)", fontWeight: 700, fontSize: 14, cursor: savingRoutine ? "default" : "pointer", opacity: savingRoutine ? 0.7 : 1, flexShrink: 0 }}>
                {savingRoutine ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar rutina"}
              </button>
            )}
          </div>
        )}
      </div>
      <ExercisePicker visible={exPickerVisible} onClose={() => setExPickerVisible(false)} onSelectMultiple={pickExercises} library={library} loading={loadingLibrary} title="Elegir ejercicios" clubId={clubId} />
      <ExercisePicker visible={circuitExPickerVisible} onClose={() => setCircuitExPickerVisible(false)} onSelectMultiple={pickCircuitExercises} library={library} loading={loadingLibrary} title="Elegir ejercicios para circuito" clubId={clubId} />
    </div>
  );
}
