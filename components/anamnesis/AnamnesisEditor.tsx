"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, Pencil, Trash2, Plus } from "lucide-react";
import type { ClubForm, ClubFormQuestion, QuestionType } from "@/types/forms";
import {
  addQuestion,
  updateQuestion,
  deleteQuestion,
  swapQuestionOrder,
  toggleRequired,
} from "@/app/(dashboard)/anamnesis/actions";

// ─── Type labels ───────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<QuestionType, string> = {
  text:             "Texto libre",
  yes_no:           "Sí / No",
  scale:            "Escala",
  multiple_choice:  "Opción múltiple",
  one_rm:           "1RM",
};

const TYPE_COLOR: Record<QuestionType, string> = {
  text:             "var(--pg-blue)",
  yes_no:           "var(--pg-green)",
  scale:            "var(--pg-purple)",
  multiple_choice:  "var(--pg-accent)",
  one_rm:           "var(--pg-amber)",
};

// ─── Empty form state ──────────────────────────────────────────────────────────

function emptyForm(type: QuestionType) {
  return {
    question_text: "",
    type,
    required: true,
    // type-specific defaults
    scale_min: "1",
    scale_max: "5",
    scale_min_label: "",
    scale_max_label: "",
    choices: [""],
    exercise_name: "",
    // dependency
    depends_on_question_id: "" as string,
    depends_on_answer: "si" as "si" | "no",
  };
}

type FormState = ReturnType<typeof emptyForm>;

// ─── Build options JSON for saving ────────────────────────────────────────────

function buildOptions(s: FormState): unknown {
  switch (s.type) {
    case "scale":
      return {
        min: Number(s.scale_min) || 1,
        max: Number(s.scale_max) || 5,
        min_label: s.scale_min_label || undefined,
        max_label: s.scale_max_label || undefined,
      };
    case "multiple_choice":
      return s.choices.filter(c => c.trim() !== "");
    case "one_rm":
      return { exercise_name: s.exercise_name.trim() || "Ejercicio" };
    default:
      return null;
  }
}

// ─── Populate form state from an existing question ────────────────────────────

function questionToFormState(q: ClubFormQuestion): FormState {
  const opts = q.options as Record<string, unknown> | null;
  const s = emptyForm(q.type);
  s.question_text = q.question_text;
  s.required = q.required;

  if (q.type === "scale" && opts) {
    s.scale_min = String((opts.min as number) ?? 1);
    s.scale_max = String((opts.max as number) ?? 5);
    s.scale_min_label = String(opts.min_label ?? "");
    s.scale_max_label = String(opts.max_label ?? "");
  }
  if (q.type === "multiple_choice") {
    const arr = Array.isArray(q.options) ? (q.options as string[]) : (opts?.choices as string[] ?? []);
    s.choices = arr.length ? arr : [""];
  }
  if (q.type === "one_rm" && opts) {
    s.exercise_name = String(opts.exercise_name ?? "");
  }
  s.depends_on_question_id = q.depends_on_question_id ?? "";
  s.depends_on_answer = q.depends_on_answer ?? "si";
  return s;
}

// ─── Question card ─────────────────────────────────────────────────────────────

function QuestionCard({
  q,
  index,
  total,
  canEdit,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleRequired,
  dependsOnLabel,
}: {
  q: ClubFormQuestion;
  index: number;
  total: number;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleRequired: () => void;
  dependsOnLabel?: string; // e.g. "Solo si «¿Tenés lesiones?» = Sí"
}) {
  const color = TYPE_COLOR[q.type];

  return (
    <div style={{
      background: "var(--pg-card)",
      border: "1px solid var(--pg-border)",
      borderRadius: 9,
      padding: "12px 14px",
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
    }}>
      {/* Drag handle / order indicator */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 2, flexShrink: 0 }}>
        <button
          onClick={onMoveUp}
          disabled={!canEdit || index === 0}
          title="Subir"
          style={{
            background: "none", border: "none", cursor: index === 0 ? "default" : "pointer",
            padding: 2, color: index === 0 ? "var(--pg-disabled)" : "var(--pg-muted)",
            lineHeight: 1,
          }}
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={!canEdit || index === total - 1}
          title="Bajar"
          style={{
            background: "none", border: "none", cursor: index === total - 1 ? "default" : "pointer",
            padding: 2, color: index === total - 1 ? "var(--pg-disabled)" : "var(--pg-muted)",
            lineHeight: 1,
          }}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase",
            padding: "2px 7px", borderRadius: 4, background: color + "20", color,
          }}>
            {TYPE_LABEL[q.type]}
          </span>
          <button
            onClick={onToggleRequired}
            disabled={!canEdit}
            title={q.required ? "Marcar como opcional" : "Marcar como requerida"}
            style={{
              fontSize: 9, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase",
              padding: "2px 7px", borderRadius: 4, border: "none", cursor: canEdit ? "pointer" : "default",
              background: q.required ? "var(--pg-accent-bg)" : "var(--pg-surface)",
              color: q.required ? "var(--pg-accent)" : "var(--pg-muted)",
            }}
          >
            {q.required ? "Requerida" : "Opcional"}
          </button>
          <span style={{ fontSize: 9, color: "var(--pg-disabled)", marginLeft: "auto" }}>#{index + 1}</span>
        </div>
        <div style={{ fontSize: 13, color: "var(--pg-text)", fontWeight: 500 }}>
          {q.question_text}
          {q.required && <span style={{ color: "var(--pg-red)", marginLeft: 4, fontSize: 13 }}>*</span>}
        </div>
        {dependsOnLabel && (
          <div style={{ fontSize: 10, color: "var(--pg-blue)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ opacity: 0.6 }}>↳</span> {dependsOnLabel}
          </div>
        )}
        {/* Options preview */}
        {q.type === "scale" && q.options && (() => {
          const o = q.options as { min: number; max: number; min_label?: string; max_label?: string };
          return (
            <div style={{ fontSize: 10, color: "var(--pg-muted)", marginTop: 4 }}>
              Escala {o.min}–{o.max}
              {o.min_label ? ` · "${o.min_label}"` : ""}
              {o.max_label ? ` → "${o.max_label}"` : ""}
            </div>
          );
        })()}
        {q.type === "multiple_choice" && Array.isArray(q.options) && (
          <div style={{ fontSize: 10, color: "var(--pg-muted)", marginTop: 4 }}>
            {(q.options as string[]).join(" · ")}
          </div>
        )}
        {q.type === "one_rm" && q.options && (
          <div style={{ fontSize: 10, color: "var(--pg-muted)", marginTop: 4 }}>
            Ejercicio: {(q.options as { exercise_name: string }).exercise_name}
          </div>
        )}
      </div>

      {/* Actions */}
      {canEdit && (
        <div style={{ display: "flex", gap: 6, flexShrink: 0, paddingTop: 2 }}>
          <button
            onClick={onEdit}
            title="Editar"
            style={{
              background: "var(--pg-surface)", border: "1px solid var(--pg-border)",
              borderRadius: 6, padding: "4px 8px", cursor: "pointer",
              color: "var(--pg-muted)", display: "flex", alignItems: "center",
            }}
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={onDelete}
            title="Eliminar"
            style={{
              background: "var(--pg-red-bg)", border: "1px solid transparent",
              borderRadius: 6, padding: "4px 8px", cursor: "pointer",
              color: "var(--pg-red)", display: "flex", alignItems: "center",
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Question form (used in add/edit modal) ────────────────────────────────────

function QuestionFormFields({
  state,
  onChange,
  yesNoQuestions,
}: {
  state: FormState;
  onChange: (next: FormState) => void;
  yesNoQuestions: ClubFormQuestion[];
}) {
  const set = (patch: Partial<FormState>) => onChange({ ...state, ...patch });

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--pg-surface)",
    border: "1px solid var(--pg-border2)",
    borderRadius: 8,
    padding: "8px 12px",
    color: "var(--pg-text)",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, letterSpacing: "0.8px",
    textTransform: "uppercase", color: "var(--pg-muted)", marginBottom: 5, display: "block",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Type selector */}
      <div>
        <label style={labelStyle}>Tipo de pregunta</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(Object.keys(TYPE_LABEL) as QuestionType[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => set({ type: t })}
              style={{
                fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                border: state.type === t ? `1px solid ${TYPE_COLOR[t]}` : "1px solid var(--pg-border)",
                background: state.type === t ? TYPE_COLOR[t] + "20" : "var(--pg-surface)",
                color: state.type === t ? TYPE_COLOR[t] : "var(--pg-muted)",
              }}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Question text */}
      <div>
        <label style={labelStyle}>Texto de la pregunta</label>
        <textarea
          value={state.question_text}
          onChange={e => set({ question_text: e.target.value })}
          placeholder="Ej: ¿Cuántas veces por semana entrenás?"
          rows={2}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
        />
      </div>

      {/* Required toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          onClick={() => set({ required: !state.required })}
          style={{
            width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
            background: state.required ? "var(--pg-accent)" : "var(--pg-surface)",
            position: "relative", transition: "background 0.15s",
            flexShrink: 0,
          }}
        >
          <span style={{
            position: "absolute", top: 2, left: state.required ? 18 : 2,
            width: 16, height: 16, borderRadius: "50%",
            background: "var(--pg-text)", transition: "left 0.15s",
          }} />
        </button>
        <span style={{ fontSize: 12, color: "var(--pg-muted)" }}>
          {state.required ? "Requerida" : "Opcional"}
        </span>
      </div>

      {/* Type-specific fields */}
      {state.type === "scale" && (
        <>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Mínimo</label>
              <input type="number" value={state.scale_min} onChange={e => set({ scale_min: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Máximo</label>
              <input type="number" value={state.scale_max} onChange={e => set({ scale_max: e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Etiqueta mínimo</label>
              <input type="text" value={state.scale_min_label} onChange={e => set({ scale_min_label: e.target.value })} placeholder="Ej: Nunca" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Etiqueta máximo</label>
              <input type="text" value={state.scale_max_label} onChange={e => set({ scale_max_label: e.target.value })} placeholder="Ej: Todos los días" style={inputStyle} />
            </div>
          </div>
        </>
      )}

      {state.type === "multiple_choice" && (
        <div>
          <label style={labelStyle}>Opciones</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {state.choices.map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="text"
                  value={c}
                  onChange={e => {
                    const next = [...state.choices];
                    next[i] = e.target.value;
                    set({ choices: next });
                  }}
                  placeholder={`Opción ${i + 1}`}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => set({ choices: state.choices.filter((_, j) => j !== i) })}
                  disabled={state.choices.length <= 1}
                  style={{
                    background: "var(--pg-red-bg)", border: "none", borderRadius: 6,
                    color: "var(--pg-red)", cursor: state.choices.length <= 1 ? "default" : "pointer",
                    padding: "5px 8px", fontSize: 12, flexShrink: 0,
                    opacity: state.choices.length <= 1 ? 0.4 : 1,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set({ choices: [...state.choices, ""] })}
              style={{
                alignSelf: "flex-start", fontSize: 11, fontWeight: 600,
                background: "none", border: "1px dashed var(--pg-border2)", borderRadius: 7,
                color: "var(--pg-muted)", padding: "5px 12px", cursor: "pointer",
              }}
            >
              + Agregar opción
            </button>
          </div>
        </div>
      )}

      {state.type === "one_rm" && (
        <div>
          <label style={labelStyle}>Nombre del ejercicio</label>
          <input
            type="text"
            value={state.exercise_name}
            onChange={e => set({ exercise_name: e.target.value })}
            placeholder="Ej: Sentadilla"
            style={inputStyle}
          />
        </div>
      )}

      {/* Dependency on a yes/no question */}
      {yesNoQuestions.length > 0 && (
        <div style={{ borderTop: "1px solid var(--pg-border)", paddingTop: 14 }}>
          <label style={labelStyle}>Condición de visibilidad</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={state.depends_on_question_id}
              onChange={e => set({ depends_on_question_id: e.target.value })}
              style={{ ...inputStyle, flex: 2, minWidth: 0 }}
            >
              <option value="">Siempre visible</option>
              {yesNoQuestions.map(q => (
                <option key={q.id} value={q.id}>
                  {q.question_text.length > 50 ? q.question_text.slice(0, 50) + "…" : q.question_text}
                </option>
              ))}
            </select>
            {state.depends_on_question_id && (
              <select
                value={state.depends_on_answer}
                onChange={e => set({ depends_on_answer: e.target.value as "si" | "no" })}
                style={{ ...inputStyle, flex: 1, minWidth: 80 }}
              >
                <option value="si">= Sí</option>
                <option value="no">= No</option>
              </select>
            )}
          </div>
          {state.depends_on_question_id && (
            <div style={{ fontSize: 10, color: "var(--pg-muted)", marginTop: 6 }}>
              Esta pregunta solo aparece si la anterior tiene esa respuesta.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Modal wrapper ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.6)", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--pg-card)", border: "1px solid var(--pg-border2)",
          borderRadius: 12, padding: 20, width: "100%", maxWidth: 520,
          maxHeight: "85vh", overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--pg-text)" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--pg-muted)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Main editor ───────────────────────────────────────────────────────────────

export default function AnamnesisEditor({
  form,
  questions: initialQuestions,
  canEdit,
}: {
  form: ClubForm;
  questions: ClubFormQuestion[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ClubFormQuestion | null>(null);
  const [formState, setFormState] = useState<FormState>(emptyForm("text"));
  const [modalError, setModalError] = useState("");

  // Yes/no questions available as dependency triggers
  const yesNoQuestions = initialQuestions.filter(q => q.type === "yes_no");

  // Map question id → short label for dependency display
  const questionById = new Map(initialQuestions.map(q => [q.id, q]));
  const dependsOnLabel = (q: ClubFormQuestion) => {
    if (!q.depends_on_question_id) return undefined;
    const parent = questionById.get(q.depends_on_question_id);
    if (!parent) return undefined;
    const answerLabel = q.depends_on_answer === "si" ? "Sí" : "No";
    const text = parent.question_text.length > 40
      ? parent.question_text.slice(0, 40) + "…"
      : parent.question_text;
    return `Solo si «${text}» = ${answerLabel}`;
  };

  const openAdd = () => {
    setFormState(emptyForm("text"));
    setModalError("");
    setAddModalOpen(true);
  };

  const openEdit = (q: ClubFormQuestion) => {
    setFormState(questionToFormState(q));
    setModalError("");
    setEditingQuestion(q);
  };

  const closeModals = () => {
    setAddModalOpen(false);
    setEditingQuestion(null);
  };

  const handleSave = () => {
    if (!formState.question_text.trim()) {
      setModalError("Ingresá el texto de la pregunta.");
      return;
    }
    if (formState.type === "multiple_choice" && formState.choices.filter(c => c.trim()).length < 2) {
      setModalError("Agregá al menos 2 opciones.");
      return;
    }

    const fd = new FormData();
    fd.set("question_text", formState.question_text);
    fd.set("type", formState.type);
    fd.set("required", String(formState.required));
    const opts = buildOptions(formState);
    if (opts !== null) fd.set("options", JSON.stringify(opts));
    if (formState.depends_on_question_id) {
      fd.set("depends_on_question_id", formState.depends_on_question_id);
      fd.set("depends_on_answer", formState.depends_on_answer);
    }

    startTransition(async () => {
      if (editingQuestion) {
        fd.set("question_id", editingQuestion.id);
        const result = await updateQuestion(fd);
        if (result.error) { setModalError(result.error); return; }
      } else {
        fd.set("form_id", form.id);
        const result = await addQuestion(fd);
        if (result.error) { setModalError(result.error); return; }
      }
      closeModals();
      router.refresh();
    });
  };

  const handleDelete = (q: ClubFormQuestion) => {
    if (!confirm(`¿Eliminar la pregunta "${q.question_text}"?`)) return;
    startTransition(async () => {
      await deleteQuestion(q.id);
      router.refresh();
    });
  };

  const handleMove = (q: ClubFormQuestion, direction: "up" | "down") => {
    const target = direction === "up" ? q.order_index - 1 : q.order_index + 1;
    startTransition(async () => {
      await swapQuestionOrder(q.id, q.order_index, target, form.id);
      router.refresh();
    });
  };

  const handleToggleRequired = (q: ClubFormQuestion) => {
    startTransition(async () => {
      await toggleRequired(q.id, !q.required);
      router.refresh();
    });
  };

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Header info */}
      <div style={{
        background: "var(--pg-card)", border: "1px solid var(--pg-border)",
        borderRadius: 9, padding: "12px 16px", marginBottom: 16,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--pg-text)", marginBottom: 2 }}>
            {form.title}
          </div>
          <div style={{ fontSize: 11, color: "var(--pg-muted)" }}>
            4 fijas + {initialQuestions.length} del club · Los jugadores completan este formulario al unirse
          </div>
        </div>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase",
          padding: "3px 9px", borderRadius: 5,
          background: form.status === "active" ? "var(--pg-green-bg)" : "var(--pg-amber-bg)",
          color: form.status === "active" ? "var(--pg-green)" : "var(--pg-amber)",
        }}>
          {form.status === "active" ? "Activo" : form.status === "draft" ? "Borrador" : "Archivado"}
        </span>
      </div>

      {/* System questions — always present, locked */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", marginBottom: 8 }}>
          Preguntas base — siempre presentes
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { label: "Edad", type: "Texto libre", detail: "Valor numérico en años" },
            { label: "Altura", type: "Texto libre", detail: "Valor en cm" },
            { label: "Peso", type: "Texto libre", detail: "Valor en kg" },
            { label: "Posición", type: "Opción múltiple", detail: "Primera línea, Segunda línea, Ala…" },
          ].map(({ label, type, detail }) => (
            <div
              key={label}
              style={{
                background: "var(--pg-card)", border: "1px solid var(--pg-border)",
                borderRadius: 9, padding: "10px 14px",
                display: "flex", alignItems: "center", gap: 12,
                opacity: 0.8,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.6px", textTransform: "uppercase", padding: "2px 7px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "var(--pg-muted)" }}>
                    {type}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", padding: "2px 7px", borderRadius: 4, background: "var(--pg-accent-bg)", color: "var(--pg-accent)" }}>
                    Requerida
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--pg-text)" }}>{label}</div>
                <div style={{ fontSize: 10, color: "var(--pg-muted)", marginTop: 2 }}>{detail}</div>
              </div>
              <span title="Pregunta fija — no se puede eliminar" style={{ fontSize: 10, color: "var(--pg-disabled)", padding: "3px 8px", borderRadius: 5, background: "var(--pg-surface)", border: "1px solid var(--pg-border)", whiteSpace: "nowrap" }}>
                Fija
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom question list */}
      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", marginBottom: 8 }}>
        Preguntas del club
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {initialQuestions.map((q, i) => (
          <QuestionCard
            key={q.id}
            q={q}
            index={i}
            total={initialQuestions.length}
            canEdit={canEdit}
            onEdit={() => openEdit(q)}
            onDelete={() => handleDelete(q)}
            onMoveUp={() => handleMove(q, "up")}
            onMoveDown={() => handleMove(q, "down")}
            onToggleRequired={() => handleToggleRequired(q)}
            dependsOnLabel={dependsOnLabel(q)}
          />
        ))}

        {initialQuestions.length === 0 && (
          <div style={{
            background: "var(--pg-card)", border: "1px dashed var(--pg-border)",
            borderRadius: 9, padding: "28px 20px", textAlign: "center",
            color: "var(--pg-muted)", fontSize: 12,
          }}>
            Aún no hay preguntas. Agregá la primera para comenzar.
          </div>
        )}
      </div>

      {/* Add button */}
      {canEdit && (
        <button
          onClick={openAdd}
          disabled={isPending}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "var(--pg-accent)", color: "var(--pg-accent-text)",
            border: "none", borderRadius: 8, padding: "8px 16px",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            opacity: isPending ? 0.7 : 1,
          }}
        >
          <Plus size={14} />
          Agregar pregunta
        </button>
      )}

      {/* Add modal */}
      {addModalOpen && (
        <Modal title="Nueva pregunta" onClose={closeModals}>
          <QuestionFormFields state={formState} onChange={setFormState} yesNoQuestions={yesNoQuestions} />
          {modalError && (
            <div style={{ marginTop: 12, fontSize: 11, color: "var(--pg-red)" }}>{modalError}</div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <button
              onClick={closeModals}
              style={{
                padding: "7px 16px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: "var(--pg-surface)", border: "1px solid var(--pg-border)",
                color: "var(--pg-muted)", cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              style={{
                padding: "7px 16px", borderRadius: 7, fontSize: 12, fontWeight: 700,
                background: "var(--pg-accent)", border: "none",
                color: "var(--pg-accent-text)", cursor: "pointer",
                opacity: isPending ? 0.7 : 1,
              }}
            >
              Guardar
            </button>
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {editingQuestion && (
        <Modal title="Editar pregunta" onClose={closeModals}>
          <QuestionFormFields state={formState} onChange={setFormState} yesNoQuestions={yesNoQuestions} />
          {modalError && (
            <div style={{ marginTop: 12, fontSize: 11, color: "var(--pg-red)" }}>{modalError}</div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <button
              onClick={closeModals}
              style={{
                padding: "7px 16px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: "var(--pg-surface)", border: "1px solid var(--pg-border)",
                color: "var(--pg-muted)", cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              style={{
                padding: "7px 16px", borderRadius: 7, fontSize: 12, fontWeight: 700,
                background: "var(--pg-accent)", border: "none",
                color: "var(--pg-accent-text)", cursor: "pointer",
                opacity: isPending ? 0.7 : 1,
              }}
            >
              Guardar cambios
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
