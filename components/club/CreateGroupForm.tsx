"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createGroup } from "@/app/(dashboard)/squads/actions";

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
  width: "100%",
  background: "var(--pg-surface)",
  border: "1px solid var(--pg-border)",
  borderRadius: 8,
  padding: "0.55rem 0.75rem",
  color: "var(--pg-text)",
  fontSize: 12,
  outline: "none",
};

export default function CreateGroupForm({
  kind = "squad",
}: {
  kind?: "squad" | "training";
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [positionRules, setPositionRules] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const label = kind === "training" ? "grupo" : "plantel";

  function togglePosition(pos: string) {
    setPositionRules(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createGroup(name, description || null, kind, positionRules);
      if (!result.ok) {
        setError(result.error ?? `No se pudo crear el ${label}.`);
        return;
      }
      setOpen(false);
      setName("");
      setDescription("");
      setPositionRules([]);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "5px 12px", borderRadius: 7,
          fontSize: 11, fontWeight: 700,
          cursor: "pointer", background: "var(--pg-accent)",
          border: "none", color: "var(--pg-accent-text)",
        }}
      >
        <Plus size={12} />
        Nuevo {label}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "var(--pg-card)",
        border: "1px solid var(--pg-border)",
        borderRadius: 10,
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        marginBottom: 14,
      }}
    >
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pg-muted)", display: "block", marginBottom: 5 }}>Nombre</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={kind === "training" ? "Ej: Delanteros, Lesionados, Sub-20" : "Ej: Primera, Reservas, M20"}
          required
          autoFocus
          style={inputStyle}
        />
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pg-muted)", display: "block", marginBottom: 5 }}>Descripcion (opcional)</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Una descripcion breve"
          style={inputStyle}
        />
      </div>

      {kind === "squad" && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--pg-muted)", display: "block", marginBottom: 6 }}>
            Agregar jugadores por posicion (opcional)
          </label>
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

      {error && (
        <div style={{ fontSize: 10, color: "var(--pg-red)" }}>{error}</div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); setPositionRules([]); }}
          disabled={isPending}
          style={{
            padding: "5px 12px", borderRadius: 7,
            fontSize: 11, fontWeight: 500,
            background: "transparent", border: "1px solid var(--pg-border)",
            color: "var(--pg-muted)", cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          style={{
            padding: "5px 14px", borderRadius: 7,
            fontSize: 11, fontWeight: 700,
            background: "var(--pg-accent)", border: "none",
            color: "var(--pg-accent-text)",
            cursor: isPending || !name.trim() ? "default" : "pointer",
            opacity: isPending || !name.trim() ? 0.6 : 1,
          }}
        >
          {isPending ? "Creando..." : `Crear ${label}`}
        </button>
      </div>
    </form>
  );
}
