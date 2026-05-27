"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, Trash2 } from "lucide-react";

type ActionResult = { ok: boolean; error?: string };

const RUGBY_POSITIONS = [
  "Primera linea",
  "Segunda linea",
  "Ala",
  "Octavo",
  "Medio-scrum",
  "Apertura",
  "Centro",
  "Wing",
];

const inputStyle: React.CSSProperties = {
  background: "var(--pg-surface)",
  border: "1px solid var(--pg-border)",
  borderRadius: 7,
  padding: "4px 8px",
  color: "var(--pg-text)",
  fontSize: 13,
  fontWeight: 600,
  outline: "none",
};

export default function GroupHeaderEditor({
  groupId,
  initialName,
  initialDescription,
  initialPositionRules = [],
  showPositionRules = false,
  canEdit,
  entityLabel = "plantel",
  backHref = "/squads",
  onUpdate,
  onDelete,
}: {
  groupId: string;
  initialName: string;
  initialDescription: string | null;
  initialPositionRules?: string[];
  showPositionRules?: boolean;
  canEdit: boolean;
  entityLabel?: string;
  backHref?: string;
  onUpdate: (id: string, name: string, description: string | null, positionRules: string[]) => Promise<ActionResult>;
  onDelete: (id: string) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [positionRules, setPositionRules] = useState<string[]>(initialPositionRules);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function togglePosition(pos: string) {
    setPositionRules(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await onUpdate(groupId, name, description || null, positionRules);
      if (!result.ok) {
        setError(result.error ?? "No se pudo guardar.");
        return;
      }
      setEditing(false);
    });
  }

  function handleCancel() {
    setName(initialName);
    setDescription(initialDescription ?? "");
    setPositionRules(initialPositionRules);
    setError(null);
    setEditing(false);
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar el ${entityLabel} "${initialName}"? Esto también quita a todos sus miembros del ${entityLabel}.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await onDelete(groupId);
      if (!result.ok) {
        setError(result.error ?? "No se pudo eliminar.");
        return;
      }
      router.push(backHref);
    });
  }

  if (!editing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {description && (
          <p style={{ fontSize: 11, color: "var(--pg-muted)", margin: 0, lineHeight: 1.5 }}>{description}</p>
        )}
        {showPositionRules && initialPositionRules.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
            {initialPositionRules.map(pos => (
              <span
                key={pos}
                style={{
                  fontSize: 9, padding: "2px 7px", borderRadius: 4,
                  background: "var(--pg-accent-bg)", color: "var(--pg-accent)",
                  fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px",
                }}
              >
                {pos}
              </span>
            ))}
          </div>
        )}
        {canEdit && (
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              onClick={() => setEditing(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 7,
                fontSize: 10, fontWeight: 600,
                background: "transparent", border: "1px solid var(--pg-border)",
                color: "var(--pg-muted)", cursor: "pointer",
              }}
            >
              <Pencil size={10} /> Editar
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 7,
                fontSize: 10, fontWeight: 600,
                background: "transparent", border: "1px solid rgba(239,68,68,0.3)",
                color: "var(--pg-red)", cursor: "pointer",
              }}
            >
              <Trash2 size={10} /> Eliminar {entityLabel}
            </button>
            {error && <span style={{ fontSize: 10, color: "var(--pg-red)", alignSelf: "center" }}>{error}</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        style={{ ...inputStyle, fontSize: 14 }}
        autoFocus
      />
      <input
        type="text"
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Descripción (opcional)"
        style={{ ...inputStyle, fontSize: 11, fontWeight: 400, color: "var(--pg-muted)" }}
      />

      {showPositionRules && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--pg-muted)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 6 }}>
            Agregar jugadores por posicion
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {RUGBY_POSITIONS.map(pos => {
              const active = positionRules.includes(pos);
              return (
                <button
                  key={pos}
                  type="button"
                  onClick={() => togglePosition(pos)}
                  style={{
                    fontSize: 10, padding: "3px 9px", borderRadius: 5,
                    border: active ? "1px solid var(--pg-accent)" : "1px solid var(--pg-border)",
                    background: active ? "var(--pg-accent-bg)" : "transparent",
                    color: active ? "var(--pg-accent)" : "var(--pg-muted)",
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    transition: "none",
                  }}
                >
                  {pos}
                </button>
              );
            })}
          </div>
          {positionRules.length > 0 && (
            <div style={{ fontSize: 10, color: "var(--pg-muted)", marginTop: 6, lineHeight: 1.4 }}>
              Los jugadores con esas posiciones se agregaran automaticamente ahora y en el futuro.
            </div>
          )}
        </div>
      )}

      {error && <div style={{ fontSize: 10, color: "var(--pg-red)" }}>{error}</div>}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={handleSave}
          disabled={isPending || !name.trim()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "4px 10px", borderRadius: 7,
            fontSize: 10, fontWeight: 700,
            background: "var(--pg-accent)", border: "none", color: "var(--pg-accent-text)",
            cursor: isPending || !name.trim() ? "default" : "pointer",
            opacity: isPending || !name.trim() ? 0.6 : 1,
          }}
        >
          <Check size={10} /> Guardar
        </button>
        <button
          onClick={handleCancel}
          disabled={isPending}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "4px 10px", borderRadius: 7,
            fontSize: 10, fontWeight: 600,
            background: "transparent", border: "1px solid var(--pg-border)",
            color: "var(--pg-muted)", cursor: "pointer",
          }}
        >
          <X size={10} /> Cancelar
        </button>
      </div>
    </div>
  );
}
