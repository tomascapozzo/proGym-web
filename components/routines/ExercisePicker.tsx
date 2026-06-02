"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LibraryExercise } from "@/types/routine";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectMultiple: (exercises: LibraryExercise[]) => void;
  library: LibraryExercise[];
  loading?: boolean;
  title?: string;
  clubId: string;
};

const EMPTY_FORM = { name: "", muscle_group: "", movement_pattern: "", equipment: "" };

export default function ExercisePicker({
  visible,
  onClose,
  onSelectMultiple,
  library,
  loading = false,
  title = "Elegir ejercicios",
  clubId,
}: Props) {
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [equipFilter, setEquipFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filtered, setFiltered] = useState<LibraryExercise[]>(library);

  // custom exercises created this session
  const [customExercises, setCustomExercises] = useState<LibraryExercise[]>([]);

  // inline form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const allExercises = [...library, ...customExercises];
  const muscleGroups = [...new Set(allExercises.map((e) => e.muscle_group))].sort();
  const equipments = [...new Set(allExercises.map((e) => e.equipment))].sort();

  useEffect(() => {
    let result = allExercises;
    if (muscleFilter) result = result.filter((e) => e.muscle_group === muscleFilter);
    if (equipFilter) result = result.filter((e) => e.equipment === equipFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.muscle_group ?? "").toLowerCase().includes(q) ||
          (e.movement_pattern ?? "").toLowerCase().includes(q),
      );
    }
    setFiltered(result);
  }, [search, muscleFilter, equipFilter, library, customExercises]);

  const reset = () => {
    setSearch("");
    setMuscleFilter("");
    setEquipFilter("");
    setSelected(new Set());
    setShowForm(false);
    setForm(EMPTY_FORM);
    setFormError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirm = () => {
    const exercises = allExercises.filter((e) => selected.has(e.id));
    reset();
    onSelectMultiple(exercises);
  };

  const saveCustomExercise = async () => {
    if (!form.name.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setFormError("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("club_custom_exercises")
      .insert({
        club_id: clubId,
        name: form.name.trim(),
        muscle_group: form.muscle_group.trim(),
        movement_pattern: form.movement_pattern.trim(),
        equipment: form.equipment.trim(),
      })
      .select("id, name, muscle_group, movement_pattern, equipment")
      .single();

    setSaving(false);
    if (error || !data) {
      setFormError("No se pudo guardar el ejercicio. Intentá de nuevo.");
      return;
    }

    const newExercise: LibraryExercise = {
      id: data.id,
      name: data.name,
      muscle_group: data.muscle_group,
      movement_pattern: data.movement_pattern,
      equipment: data.equipment,
      source: "custom",
      club_id: clubId,
    };

    setCustomExercises((prev) => [...prev, newExercise]);
    setSelected((prev) => new Set(prev).add(data.id));
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: "var(--pg-card)",
          borderRadius: 14,
          border: "1px solid var(--pg-border)",
          width: "min(640px, 95vw)",
          height: "min(680px, 90vh)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px 14px",
            borderBottom: "1px solid var(--pg-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--pg-text)" }}>{title}</span>
          <button
            onClick={handleClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pg-muted)", fontSize: 14 }}
          >
            Cerrar
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: "12px 20px 10px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o músculo..."
            style={{
              background: "var(--pg-surface)",
              border: "1px solid var(--pg-border)",
              borderRadius: 8,
              padding: "9px 12px",
              color: "var(--pg-text)",
              fontSize: 13,
              outline: "none",
              width: "100%",
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={muscleFilter}
              onChange={(e) => setMuscleFilter(e.target.value)}
              style={{
                flex: 1,
                background: "var(--pg-surface)",
                border: "1px solid var(--pg-border)",
                borderRadius: 8,
                padding: "7px 10px",
                color: muscleFilter ? "var(--pg-accent)" : "var(--pg-muted)",
                fontSize: 12,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="">Músculo</option>
              {muscleGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <select
              value={equipFilter}
              onChange={(e) => setEquipFilter(e.target.value)}
              style={{
                flex: 1,
                background: "var(--pg-surface)",
                border: "1px solid var(--pg-border)",
                borderRadius: 8,
                padding: "7px 10px",
                color: equipFilter ? "var(--pg-accent)" : "var(--pg-muted)",
                fontSize: 12,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="">Equipamiento</option>
              {equipments.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          {(muscleFilter || equipFilter || search.trim()) && (
            <span style={{ fontSize: 10, color: "var(--pg-muted)" }}>
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Agregar ejercicio nuevo */}
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 20px",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--pg-border)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  flexShrink: 0,
                  background: "var(--pg-surface)",
                  border: "1px dashed var(--pg-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--pg-accent)",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                +
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--pg-accent)" }}>
                Agregar ejercicio nuevo
              </span>
            </button>
          ) : (
            <div
              style={{
                padding: "14px 20px 16px",
                background: "var(--pg-surface)",
                borderBottom: "1px solid var(--pg-border)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--pg-accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Nuevo ejercicio
              </span>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre *"
                style={inputStyle}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <input
                  value={form.muscle_group}
                  onChange={(e) => setForm((f) => ({ ...f, muscle_group: e.target.value }))}
                  placeholder="Músculo"
                  style={inputStyle}
                />
                <input
                  value={form.movement_pattern}
                  onChange={(e) => setForm((f) => ({ ...f, movement_pattern: e.target.value }))}
                  placeholder="Patrón"
                  style={inputStyle}
                />
                <input
                  value={form.equipment}
                  onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value }))}
                  placeholder="Equipamiento"
                  style={inputStyle}
                />
              </div>
              {formError && (
                <span style={{ fontSize: 11, color: "var(--pg-red)" }}>{formError}</span>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                <button
                  onClick={saveCustomExercise}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 8,
                    border: "none",
                    background: "var(--pg-accent)",
                    color: "var(--pg-accent-text)",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: saving ? "default" : "pointer",
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
                <button
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(""); }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid var(--pg-border)",
                    background: "transparent",
                    color: "var(--pg-muted)",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Exercise list */}
          {loading ? (
            <div style={{ textAlign: "center", paddingTop: 40, color: "var(--pg-muted)", fontSize: 13 }}>
              Cargando...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 40, color: "var(--pg-muted)", fontSize: 13 }}>
              No se encontraron ejercicios
            </div>
          ) : (
            filtered.map((item) => {
              const isSelected = selected.has(item.id);
              const isCustom = item.source === "custom";
              return (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "11px 20px",
                    background: isSelected ? "var(--pg-accent-bg)" : "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--pg-border)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      flexShrink: 0,
                      background: isSelected ? "var(--pg-accent)" : "var(--pg-surface)",
                      border: `1px solid ${isSelected ? "var(--pg-accent)" : "var(--pg-border)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isSelected && (
                      <span style={{ color: "var(--pg-accent-text)", fontSize: 11, fontWeight: 700 }}>
                        ✓
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: isSelected ? "var(--pg-accent)" : "var(--pg-text)",
                        }}
                      >
                        {item.name}
                      </span>
                      {isCustom && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: "var(--pg-blue)",
                            background: "var(--pg-blue-bg)",
                            padding: "1px 5px",
                            borderRadius: 4,
                          }}
                        >
                          Personalizado
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--pg-muted)", marginTop: 2 }}>
                      {item.muscle_group} · {item.movement_pattern} · {item.equipment}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--pg-border)", flexShrink: 0 }}>
          <button
            onClick={confirm}
            disabled={selected.size === 0}
            style={{
              width: "100%",
              padding: "11px 0",
              borderRadius: 10,
              border: "none",
              background: selected.size > 0 ? "var(--pg-accent)" : "var(--pg-surface)",
              color: selected.size > 0 ? "var(--pg-accent-text)" : "var(--pg-muted)",
              fontWeight: 700,
              fontSize: 14,
              cursor: selected.size > 0 ? "pointer" : "default",
            }}
          >
            {selected.size > 0
              ? `Agregar ${selected.size} ejercicio${selected.size !== 1 ? "s" : ""}`
              : "Seleccioná ejercicios"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--pg-card)",
  border: "1px solid var(--pg-border)",
  borderRadius: 8,
  padding: "8px 10px",
  color: "var(--pg-text)",
  fontSize: 12,
  outline: "none",
  width: "100%",
};
