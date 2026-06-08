"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ExercisePicker from "@/components/routines/ExercisePicker";
import {
  createForm, updateForm, addQuestion, updateQuestion,
  deleteQuestion, reorderQuestions, distributeForm, deleteDistribution,
  upsertSchedule, deleteSchedule, toggleScheduleActive,
} from "@/app/(dashboard)/forms/actions";
import type { ClubForm, ClubFormQuestion, ClubFormDistribution, ClubFormSchedule, QuestionType, QuestionOptions } from "@/types/forms";
import type { LibraryExercise } from "@/types/routine";

// ─── Constants ───────────────────────────────────────────────────────────────

const QUESTION_TYPES: { value: QuestionType; label: string; desc: string }[] = [
  { value: "text",            label: "Texto",            desc: "Respuesta libre"         },
  { value: "scale",           label: "Escala",           desc: "Valor numérico del 1 al N" },
  { value: "multiple_choice", label: "Opción múltiple",  desc: "El jugador elige una opción" },
  { value: "yes_no",          label: "Sí / No",          desc: "Respuesta binaria"       },
  { value: "one_rm",          label: "1RM",              desc: "Peso máximo en un ejercicio" },
];

const TYPE_LABEL: Record<QuestionType, string> = {
  text: "Texto", scale: "Escala", multiple_choice: "Opción múltiple", yes_no: "Sí / No", one_rm: "1RM",
};

// ─── Question editor subcomponent ────────────────────────────────────────────

type QuestionEditorProps = {
  question: ClubFormQuestion;
  formId: string;
  idx: number;
  total: number;
  clubId: string;
  onMove: (id: string, dir: "up" | "down") => void;
  onDelete: (id: string) => void;
  onSaved: () => void;
};

function QuestionEditor({ question, formId, idx, total, clubId, onMove, onDelete, onSaved }: QuestionEditorProps) {
  const [text, setText] = useState(question.question_text);
  const [options, setOptions] = useState<QuestionOptions>(question.options ?? {});
  const [required, setRequired] = useState(question.required);
  const [saving, setSaving] = useState(false);
  const [showExPicker, setShowExPicker] = useState(false);
  const [exLib, setExLib] = useState<LibraryExercise[]>([]);
  const [loadingLib, setLoadingLib] = useState(false);

  const openExPicker = async () => {
    if (exLib.length === 0) {
      setLoadingLib(true);
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("exercises")
        .select("id, name, muscle_group, movement_pattern, equipment")
        .order("name");
      setExLib((data ?? []) as LibraryExercise[]);
      setLoadingLib(false);
    }
    setShowExPicker(true);
  };

  const handleExSelect = (exercises: LibraryExercise[]) => {
    if (exercises[0]) {
      setOptions((o) => ({ ...o, exercise_name: exercises[0].name, exercise_id: exercises[0].id }));
    }
    setShowExPicker(false);
  };

  const save = async () => {
    setSaving(true);
    await updateQuestion(question.id, formId, { question_text: text, options, required });
    setSaving(false);
    onSaved();
  };

  const choicesStr = (options.choices ?? []).join("\n");
  const setChoices = (raw: string) =>
    setOptions((o) => ({ ...o, choices: raw.split("\n").map((s) => s.trim()).filter(Boolean) }));

  return (
    <div style={{
      background: "var(--pg-card)",
      border: "1px solid var(--pg-border)",
      borderRadius: 10,
      padding: "14px 16px",
      marginBottom: 8,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
          color: "var(--pg-accent)", background: "var(--pg-accent-bg)",
          padding: "2px 6px", borderRadius: 4, flexShrink: 0,
        }}>
          {TYPE_LABEL[question.type]}
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={() => onMove(question.id, "up")} disabled={idx === 0}
          style={arrowBtn(idx === 0)}>▲</button>
        <button onClick={() => onMove(question.id, "down")} disabled={idx === total - 1}
          style={arrowBtn(idx === total - 1)}>▼</button>
        <button onClick={() => onDelete(question.id)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pg-red)", fontSize: 16, padding: "0 4px" }}>
          ×
        </button>
      </div>

      {/* Question text */}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Texto de la pregunta"
        style={inputStyle}
      />

      {/* Type-specific options */}
      {question.type === "one_rm" && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            flex: 1, padding: "8px 12px", borderRadius: 8,
            background: "var(--pg-surface)", border: "1px solid var(--pg-border)",
            fontSize: 12, color: options.exercise_name ? "var(--pg-text)" : "var(--pg-muted)",
          }}>
            {options.exercise_name ?? "Sin ejercicio seleccionado"}
          </div>
          <button onClick={openExPicker} style={accentBtn}>
            {loadingLib ? "Cargando..." : "Elegir ejercicio"}
          </button>
        </div>
      )}

      {question.type === "scale" && (
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <input type="number" value={options.min ?? 1} onChange={(e) => setOptions((o) => ({ ...o, min: +e.target.value }))}
            placeholder="Mín" style={{ ...inputStyle, width: 80 }} />
          <input type="number" value={options.max ?? 10} onChange={(e) => setOptions((o) => ({ ...o, max: +e.target.value }))}
            placeholder="Máx" style={{ ...inputStyle, width: 80 }} />
          <input value={options.min_label ?? ""} onChange={(e) => setOptions((o) => ({ ...o, min_label: e.target.value }))}
            placeholder="Etiqueta mínimo" style={inputStyle} />
          <input value={options.max_label ?? ""} onChange={(e) => setOptions((o) => ({ ...o, max_label: e.target.value }))}
            placeholder="Etiqueta máximo" style={inputStyle} />
        </div>
      )}

      {question.type === "multiple_choice" && (
        <div style={{ marginTop: 8 }}>
          <textarea
            value={choicesStr}
            onChange={(e) => setChoices(e.target.value)}
            placeholder={"Opción 1\nOpción 2\nOpción 3"}
            rows={3}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />
          <div style={{ fontSize: 10, color: "var(--pg-muted)", marginTop: 3 }}>Una opción por línea</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--pg-muted)", cursor: "pointer" }}>
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)}
            style={{ accentColor: "var(--pg-accent)" }} />
          Obligatoria
        </label>
        <div style={{ flex: 1 }} />
        <button onClick={save} disabled={saving} style={saveBtn(saving)}>
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>

      {/* ExercisePicker for 1RM */}
      <ExercisePicker
        visible={showExPicker}
        onClose={() => setShowExPicker(false)}
        onSelectMultiple={handleExSelect}
        library={exLib}
        loading={loadingLib}
        title="Elegir ejercicio para 1RM"
        clubId={clubId}
      />
    </div>
  );
}

// ─── Add question panel ───────────────────────────────────────────────────────

type AddQuestionPanelProps = {
  formId: string;
  nextIndex: number;
  clubId: string;
  onAdded: (q: ClubFormQuestion) => void;
};

function AddQuestionPanel({ formId, nextIndex, clubId, onAdded }: AddQuestionPanelProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<QuestionType>("text");
  const [text, setText] = useState("");
  const [options, setOptions] = useState<QuestionOptions>({});
  const [required, setRequired] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showExPicker, setShowExPicker] = useState(false);
  const [exLib, setExLib] = useState<LibraryExercise[]>([]);
  const [loadingLib, setLoadingLib] = useState(false);

  const reset = () => { setText(""); setOptions({}); setRequired(false); setType("text"); setOpen(false); };

  const openExPicker = async () => {
    if (exLib.length === 0) {
      setLoadingLib(true);
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("exercises")
        .select("id, name, muscle_group, movement_pattern, equipment")
        .order("name");
      setExLib((data ?? []) as LibraryExercise[]);
      setLoadingLib(false);
    }
    setShowExPicker(true);
  };

  const handleExSelect = (exercises: LibraryExercise[]) => {
    if (exercises[0]) {
      setOptions((o) => ({ ...o, exercise_name: exercises[0].name, exercise_id: exercises[0].id }));
      setText(text || `1RM ${exercises[0].name}`);
    }
    setShowExPicker(false);
  };

  const handleAdd = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const res = await addQuestion(formId, type, text.trim(), options, required, nextIndex);
    setSaving(false);
    if (res.ok && res.id) {
      onAdded({ id: res.id, form_id: formId, type, question_text: text.trim(), options, required, order_index: nextIndex, depends_on_question_id: null, depends_on_answer: null });
      reset();
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        width: "100%", padding: "10px", borderRadius: 9,
        border: "1px dashed var(--pg-border2)",
        background: "transparent", cursor: "pointer",
        fontSize: 13, color: "var(--pg-muted)", marginTop: 4,
      }}>
        + Agregar pregunta
      </button>
    );
  }

  return (
    <div style={{ background: "var(--pg-surface)", border: "1px solid var(--pg-border)", borderRadius: 10, padding: "14px 16px", marginTop: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--pg-accent)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
        Nueva pregunta
      </div>

      {/* Type selector */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {QUESTION_TYPES.map((qt) => (
          <button
            key={qt.value}
            onClick={() => { setType(qt.value); setOptions({}); }}
            style={{
              padding: "5px 10px", borderRadius: 6, border: "1px solid",
              fontSize: 11, fontWeight: 600, cursor: "pointer",
              borderColor: type === qt.value ? "var(--pg-accent)" : "var(--pg-border)",
              background: type === qt.value ? "var(--pg-accent-bg)" : "transparent",
              color: type === qt.value ? "var(--pg-accent)" : "var(--pg-muted)",
            }}
          >
            {qt.label}
          </button>
        ))}
      </div>

      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Texto de la pregunta"
        style={{ ...inputStyle, marginBottom: 8 }}
      />

      {/* Type-specific */}
      {type === "one_rm" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{
            flex: 1, padding: "8px 12px", borderRadius: 8,
            background: "var(--pg-card)", border: "1px solid var(--pg-border)",
            fontSize: 12, color: options.exercise_name ? "var(--pg-text)" : "var(--pg-muted)",
          }}>
            {options.exercise_name ?? "Sin ejercicio seleccionado"}
          </div>
          <button onClick={openExPicker} style={accentBtn}>
            {loadingLib ? "Cargando..." : "Elegir ejercicio"}
          </button>
        </div>
      )}

      {type === "scale" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input type="number" value={options.min ?? 1} onChange={(e) => setOptions((o) => ({ ...o, min: +e.target.value }))}
            placeholder="Mín" style={{ ...inputStyle, width: 80 }} />
          <input type="number" value={options.max ?? 10} onChange={(e) => setOptions((o) => ({ ...o, max: +e.target.value }))}
            placeholder="Máx" style={{ ...inputStyle, width: 80 }} />
          <input value={options.min_label ?? ""} onChange={(e) => setOptions((o) => ({ ...o, min_label: e.target.value }))}
            placeholder="Etiqueta mínimo" style={inputStyle} />
          <input value={options.max_label ?? ""} onChange={(e) => setOptions((o) => ({ ...o, max_label: e.target.value }))}
            placeholder="Etiqueta máximo" style={inputStyle} />
        </div>
      )}

      {type === "multiple_choice" && (
        <div style={{ marginBottom: 8 }}>
          <textarea
            value={(options.choices ?? []).join("\n")}
            onChange={(e) => setOptions((o) => ({ ...o, choices: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) }))}
            placeholder={"Opción 1\nOpción 2\nOpción 3"}
            rows={3}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />
          <div style={{ fontSize: 10, color: "var(--pg-muted)", marginTop: 2 }}>Una opción por línea</div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--pg-muted)", cursor: "pointer" }}>
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)}
            style={{ accentColor: "var(--pg-accent)" }} />
          Obligatoria
        </label>
        <div style={{ flex: 1 }} />
        <button onClick={reset} style={ghostBtn}>Cancelar</button>
        <button onClick={handleAdd} disabled={saving || !text.trim()} style={saveBtn(saving || !text.trim())}>
          {saving ? "Guardando..." : "Agregar"}
        </button>
      </div>

      <ExercisePicker
        visible={showExPicker}
        onClose={() => setShowExPicker(false)}
        onSelectMultiple={handleExSelect}
        library={exLib}
        loading={loadingLib}
        title="Elegir ejercicio para 1RM"
        clubId={clubId}
      />
    </div>
  );
}

// ─── Distribution panel ───────────────────────────────────────────────────────

type DistributionPanelProps = {
  formId: string;
  groups: { id: string; name: string }[];
  players: { id: string; name: string }[];
  distributions: ClubFormDistribution[];
  onUpdate: (d: ClubFormDistribution[]) => void;
};

function DistributionPanel({ formId, groups, players, distributions, onUpdate }: DistributionPanelProps) {
  const [targetType, setTargetType] = useState<"group" | "player">("group");
  const [targetId, setTargetId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const targetOptions = targetType === "group" ? groups : players;

  const send = async () => {
    if (!targetId) return;
    setSaving(true);
    setError("");
    const res = await distributeForm(formId, targetType, targetId, dueAt || null);
    setSaving(false);
    if (!res.ok) { setError(res.error ?? "Error"); return; }
    setTargetId("");
    setDueAt("");
    // Optimistic update — page will refresh on next nav
  };

  const remove = async (distId: string) => {
    await deleteDistribution(distId, formId);
    onUpdate(distributions.filter((d) => d.id !== distId));
  };

  const getTargetLabel = (d: ClubFormDistribution) => {
    if (d.target_type === "group") return groups.find((g) => g.id === d.target_id)?.name ?? d.target_id;
    return players.find((p) => p.id === d.target_id)?.name ?? d.target_id;
  };

  return (
    <div style={{ background: "var(--pg-card)", border: "1px solid var(--pg-border)", borderRadius: 10, padding: "16px 18px" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--pg-text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Distribución
      </div>

      {/* Existing distributions */}
      {distributions.length > 0 && (
        <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {distributions.map((d) => (
            <div key={d.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "var(--pg-surface)", borderRadius: 7, padding: "7px 10px",
            }}>
              <span style={{
                fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                color: d.target_type === "group" ? "var(--pg-blue)" : "var(--pg-accent)",
                background: d.target_type === "group" ? "var(--pg-blue-bg)" : "var(--pg-accent-bg)",
                padding: "2px 6px", borderRadius: 4,
              }}>
                {d.target_type === "group" ? "Grupo" : "Jugador"}
              </span>
              <span style={{ flex: 1, fontSize: 12, color: "var(--pg-text)" }}>{getTargetLabel(d)}</span>
              {d.due_at && (
                <span style={{ fontSize: 10, color: "var(--pg-muted)" }}>
                  Vence {new Date(d.due_at).toLocaleDateString("es-AR")}
                </span>
              )}
              <button onClick={() => remove(d.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pg-red)", fontSize: 14 }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add distribution */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--pg-border)" }}>
          {(["group", "player"] as const).map((t) => (
            <button key={t} onClick={() => { setTargetType(t); setTargetId(""); }}
              style={{
                padding: "6px 12px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                background: targetType === t ? "var(--pg-accent)" : "var(--pg-surface)",
                color: targetType === t ? "var(--pg-accent-text)" : "var(--pg-muted)",
              }}>
              {t === "group" ? "Grupo" : "Jugador"}
            </button>
          ))}
        </div>

        <select value={targetId} onChange={(e) => setTargetId(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 140, cursor: "pointer" }}>
          <option value="">Seleccionar...</option>
          {targetOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>

        <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)}
          style={{ ...inputStyle, width: 140 }} title="Fecha límite (opcional)" />

        <button onClick={send} disabled={saving || !targetId} style={saveBtn(saving || !targetId)}>
          {saving ? "Enviando..." : "Enviar"}
        </button>
      </div>
      {error && <div style={{ fontSize: 11, color: "var(--pg-red)", marginTop: 6 }}>{error}</div>}
    </div>
  );
}

// ─── Wellness schedule panel ──────────────────────────────────────────────────

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type SchedulePanelProps = {
  formId: string;
  groups: { id: string; name: string }[];
  players: { id: string; name: string }[];
  schedules: ClubFormSchedule[];
  onUpdate: (s: ClubFormSchedule[]) => void;
};

function SchedulePanel({ formId, groups, players, schedules, onUpdate }: SchedulePanelProps) {
  const [targetType, setTargetType] = useState<"group" | "player">("group");
  const [targetId, setTargetId] = useState("");
  const [days, setDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
  const [sendTime, setSendTime] = useState("08:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleDay = (d: number) =>
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());

  const add = async () => {
    if (!targetId || days.length === 0) return;
    setSaving(true); setError("");
    const res = await upsertSchedule(formId, null, targetType, targetId, days, sendTime);
    setSaving(false);
    if (!res.ok) { setError(res.error ?? "Error"); return; }
    if (res.data) onUpdate([...schedules, res.data]);
    setTargetId(""); setDays([1, 3, 5]);
  };

  const remove = async (id: string) => {
    await deleteSchedule(id, formId);
    onUpdate(schedules.filter((s) => s.id !== id));
  };

  const toggle = async (s: ClubFormSchedule) => {
    await toggleScheduleActive(s.id, formId, !s.active);
    onUpdate(schedules.map((x) => x.id === s.id ? { ...x, active: !x.active } : x));
  };

  const getTargetLabel = (s: ClubFormSchedule) => {
    if (s.target_type === "group") return groups.find((g) => g.id === s.target_id)?.name ?? "—";
    return players.find((p) => p.id === s.target_id)?.name ?? "—";
  };

  return (
    <div style={{ background: "var(--pg-card)", border: "1px solid var(--pg-border)", borderRadius: 10, padding: "16px 18px" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--pg-text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Programación automática
      </div>

      {schedules.length > 0 && (
        <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {schedules.map((s) => (
            <div key={s.id} style={{
              background: "var(--pg-surface)", borderRadius: 8, padding: "10px 12px",
              border: `1px solid ${s.active ? "var(--pg-border2)" : "var(--pg-border)"}`,
              opacity: s.active ? 1 : 0.5,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                  color: s.target_type === "group" ? "var(--pg-blue)" : "var(--pg-accent)",
                  background: s.target_type === "group" ? "var(--pg-blue-bg)" : "var(--pg-accent-bg)",
                  padding: "2px 6px", borderRadius: 4,
                }}>
                  {s.target_type === "group" ? "Grupo" : "Jugador"}
                </span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--pg-text)" }}>{getTargetLabel(s)}</span>
                <span style={{ fontSize: 10, color: "var(--pg-muted)" }}>{s.send_time.slice(0, 5)}</span>
                <button onClick={() => toggle(s)} style={{
                  fontSize: 9, padding: "2px 7px", borderRadius: 4, border: "none", cursor: "pointer",
                  background: s.active ? "var(--pg-green-bg)" : "var(--pg-surface)",
                  color: s.active ? "var(--pg-green)" : "var(--pg-muted)",
                }}>
                  {s.active ? "Activo" : "Pausado"}
                </button>
                <button onClick={() => remove(s.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pg-red)", fontSize: 14 }}>×</button>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {DAY_LABELS.map((label, i) => (
                  <span key={i} style={{
                    fontSize: 9, padding: "2px 5px", borderRadius: 3,
                    background: s.days_of_week.includes(i) ? "var(--pg-accent-bg)" : "var(--pg-c3)",
                    color: s.days_of_week.includes(i) ? "var(--pg-accent)" : "var(--pg-disabled)",
                    fontWeight: 600,
                  }}>{label}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add schedule */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--pg-border)" }}>
          {(["group", "player"] as const).map((t) => (
            <button key={t} onClick={() => { setTargetType(t); setTargetId(""); }}
              style={{
                padding: "6px 10px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                background: targetType === t ? "var(--pg-accent)" : "var(--pg-surface)",
                color: targetType === t ? "var(--pg-accent-text)" : "var(--pg-muted)",
              }}>
              {t === "group" ? "Grupo" : "Jugador"}
            </button>
          ))}
        </div>

        <select value={targetId} onChange={(e) => setTargetId(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 120, cursor: "pointer" }}>
          <option value="">Seleccionar...</option>
          {(targetType === "group" ? groups : players).map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>

        <input type="time" value={sendTime} onChange={(e) => setSendTime(e.target.value)}
          style={{ ...inputStyle, width: 100 }} />
      </div>

      {/* Day picker */}
      <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
        {DAY_LABELS.map((label, i) => (
          <button key={i} onClick={() => toggleDay(i)} style={{
            flex: 1, padding: "5px 0", borderRadius: 5, border: "1px solid",
            fontSize: 10, fontWeight: 700, cursor: "pointer",
            borderColor: days.includes(i) ? "var(--pg-accent)" : "var(--pg-border)",
            background: days.includes(i) ? "var(--pg-accent-bg)" : "transparent",
            color: days.includes(i) ? "var(--pg-accent)" : "var(--pg-muted)",
          }}>{label}</button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8, gap: 6 }}>
        {error && <span style={{ fontSize: 11, color: "var(--pg-red)", flex: 1, alignSelf: "center" }}>{error}</span>}
        <button onClick={add} disabled={saving || !targetId || days.length === 0} style={saveBtn(saving || !targetId || days.length === 0)}>
          {saving ? "Guardando..." : "Agregar programación"}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  clubId: string;
  form: ClubForm | null;
  questions: ClubFormQuestion[];
  groups: { id: string; name: string }[];
  players: { id: string; name: string }[];
  distributions: ClubFormDistribution[];
  schedules: ClubFormSchedule[];
};

export default function FormBuilderClient({ clubId, form: initialForm, questions: initialQuestions, groups, players, distributions: initialDistributions, schedules: initialSchedules }: Props) {
  const router = useRouter();

  const [formId, setFormId] = useState(initialForm?.id ?? null);
  const [title, setTitle] = useState(initialForm?.title ?? "");
  const [description, setDescription] = useState(initialForm?.description ?? "");
  const [status, setStatus] = useState(initialForm?.status ?? "draft");
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaError, setMetaError] = useState("");

  const [questions, setQuestions] = useState<ClubFormQuestion[]>(initialQuestions);
  const [distributions, setDistributions] = useState<ClubFormDistribution[]>(initialDistributions);
  const [schedules, setSchedules] = useState<ClubFormSchedule[]>(initialSchedules);

  const templateType = initialForm?.template_type ?? null;
  const isTemplate = templateType !== null;
  const TEMPLATE_LABEL: Record<string, string> = { anamnesis: "Anamnesis", wellness: "Wellness" };

  const saveMeta = async () => {
    if (!title.trim()) return;
    setSavingMeta(true);
    setMetaError("");
    if (!formId) {
      const res = await createForm(title, description);
      setSavingMeta(false);
      if (!res.ok) { setMetaError(res.error ?? "Error"); return; }
      router.replace(`/forms/${res.id}`);
    } else {
      const res = await updateForm(formId, { title, description, status });
      setSavingMeta(false);
      if (!res.ok) { setMetaError(res.error ?? "Error"); return; }
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!formId) return;
    await deleteQuestion(id, formId);
    const updated = questions.filter((q) => q.id !== id);
    // Reindex
    const reindexed = updated.map((q, i) => ({ ...q, order_index: i }));
    setQuestions(reindexed);
    if (reindexed.length > 0) {
      await reorderQuestions(formId, reindexed.map((q) => ({ id: q.id, order_index: q.order_index })));
    }
  };

  const handleMove = async (id: string, dir: "up" | "down") => {
    if (!formId) return;
    const idx = questions.findIndex((q) => q.id === id);
    if (idx < 0) return;
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= questions.length) return;
    const updated = [...questions];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    const reindexed = updated.map((q, i) => ({ ...q, order_index: i }));
    setQuestions(reindexed);
    await reorderQuestions(formId, reindexed.map((q) => ({ id: q.id, order_index: q.order_index })));
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "20px 24px", display: "flex", gap: 20, alignItems: "flex-start" }}>

      {/* Left — form meta + questions */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Meta card */}
        <div style={{ background: "var(--pg-card)", border: "1px solid var(--pg-border)", borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--pg-text)" }}>
              Información
            </span>
            {isTemplate && (
              <span style={{
                fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
                padding: "2px 7px", borderRadius: 4,
                background: templateType === "anamnesis" ? "var(--pg-blue-bg)" : "var(--pg-green-bg)",
                color: templateType === "anamnesis" ? "var(--pg-blue)" : "var(--pg-green)",
              }}>
                {TEMPLATE_LABEL[templateType!]}
              </span>
            )}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título del formulario *"
            style={{ ...inputStyle, marginBottom: 8, fontSize: 14, fontWeight: 600 }}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (opcional)"
            rows={2}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", marginBottom: 10 }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {formId && !isTemplate && (
              <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}
                style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="draft">Borrador</option>
                <option value="active">Activo</option>
                <option value="archived">Archivado</option>
              </select>
            )}
            <div style={{ flex: 1 }} />
            {metaError && <span style={{ fontSize: 11, color: "var(--pg-red)" }}>{metaError}</span>}
            <button onClick={saveMeta} disabled={savingMeta || !title.trim()} style={saveBtn(savingMeta || !title.trim())}>
              {savingMeta ? "Guardando..." : formId ? "Guardar cambios" : "Crear formulario"}
            </button>
          </div>
        </div>

        {/* Questions */}
        {formId && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--pg-muted)", marginBottom: 8 }}>
              Preguntas ({questions.length})
            </div>
            {questions.map((q, idx) => (
              <QuestionEditor
                key={q.id}
                question={q}
                formId={formId}
                idx={idx}
                total={questions.length}
                clubId={clubId}
                onMove={handleMove}
                onDelete={handleDeleteQuestion}
                onSaved={() => {}}
              />
            ))}
            <AddQuestionPanel
              formId={formId}
              nextIndex={questions.length}
              clubId={clubId}
              onAdded={(q) => setQuestions((prev) => [...prev, q])}
            />
          </div>
        )}

        {!formId && (
          <div style={{ textAlign: "center", paddingTop: 20, fontSize: 12, color: "var(--pg-muted)" }}>
            Guardá el formulario primero para agregar preguntas.
          </div>
        )}
      </div>

      {/* Right — distribution or schedule */}
      {formId && (
        <div style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {templateType === "wellness" ? (
            <SchedulePanel
              formId={formId}
              groups={groups}
              players={players}
              schedules={schedules}
              onUpdate={setSchedules}
            />
          ) : (
            <DistributionPanel
              formId={formId}
              groups={groups}
              players={players}
              distributions={distributions}
              onUpdate={setDistributions}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: "var(--pg-surface)",
  border: "1px solid var(--pg-border)",
  borderRadius: 8,
  padding: "8px 10px",
  color: "var(--pg-text)",
  fontSize: 12,
  outline: "none",
  width: "100%",
};

const accentBtn: React.CSSProperties = {
  padding: "7px 12px", borderRadius: 8, border: "none",
  background: "var(--pg-accent)", color: "var(--pg-accent-text)",
  fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0,
};

const ghostBtn: React.CSSProperties = {
  padding: "7px 12px", borderRadius: 8,
  border: "1px solid var(--pg-border)", background: "transparent",
  color: "var(--pg-muted)", fontSize: 12, cursor: "pointer",
};

const saveBtn = (disabled: boolean): React.CSSProperties => ({
  padding: "7px 14px", borderRadius: 8, border: "none",
  background: disabled ? "var(--pg-surface)" : "var(--pg-accent)",
  color: disabled ? "var(--pg-muted)" : "var(--pg-accent-text)",
  fontSize: 12, fontWeight: 600,
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.6 : 1,
});

const arrowBtn = (disabled: boolean): React.CSSProperties => ({
  background: "none", border: "none",
  cursor: disabled ? "default" : "pointer",
  color: disabled ? "var(--pg-disabled)" : "var(--pg-muted)",
  fontSize: 10, padding: "0 3px",
});
