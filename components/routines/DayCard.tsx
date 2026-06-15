"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { RoutineDay } from "@/types/routine";

const EX_COL = "28px 1fr 60px 72px 60px";

type Props = {
  day: RoutineDay;
  index: number;
  isDone: boolean;
};

export default function DayCard({ day, index, isDone }: Props) {
  const [open, setOpen] = useState(true);

  const totalExercises =
    (day.ejercicios?.length ?? 0) +
    (day.circuitos?.reduce((s, c) => s + (c.ejercicios?.length ?? 0), 0) ?? 0);

  return (
    <div
      style={{
        background: "var(--pg-card)",
        border: `1px solid ${isDone ? "rgba(74,222,128,0.2)" : "var(--pg-border)"}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "9px 14px",
          borderTop: "none",
          borderLeft: "none",
          borderRight: "none",
          borderBottom: open ? "1px solid var(--pg-border)" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ChevronDown
            size={13}
            color="var(--pg-muted)"
            style={{
              transition: "transform 180ms ease",
              transform: open ? "rotate(0deg)" : "rotate(-90deg)",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--pg-text)" }}>
            {day.dia || `Día ${index + 1}`}
          </span>
          {day.enfoque && (
            <span style={{ fontSize: 10, color: "var(--pg-muted)" }}>{day.enfoque}</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "var(--pg-muted)" }}>
            {totalExercises} ejercicios
          </span>
          {isDone && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "1px 6px",
                borderRadius: 4,
                background: "rgba(74,222,128,0.15)",
                color: "var(--pg-green)",
              }}
            >
              Completado
            </span>
          )}
        </div>
      </button>

      {/* Collapsible body */}
      {open && (
        <>
          {/* Direct exercises */}
          {(day.ejercicios?.length ?? 0) > 0 && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: EX_COL,
                  padding: "5px 14px",
                  borderBottom: "1px solid var(--pg-border)",
                  background: "rgba(0,0,0,0.2)",
                }}
              >
                {["#", "Ejercicio", "Series", "Reps", "Descanso"].map((h) => (
                  <span
                    key={h}
                    style={{
                      fontSize: 8,
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.2)",
                      fontWeight: 500,
                    }}
                  >
                    {h}
                  </span>
                ))}
              </div>
              {day.ejercicios!.map((ex, j) => (
                <div
                  key={j}
                  className="pg-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: EX_COL,
                    padding: "7px 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--pg-disabled)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {j + 1}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "var(--pg-text)" }}>
                    {ex.nombre}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--pg-muted)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {ex.series}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--pg-muted)" }}>
                    {ex.reps?.join(" / ") || "—"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--pg-muted)" }}>{ex.descanso}</span>
                </div>
              ))}
            </>
          )}

          {/* Circuits */}
          {day.circuitos?.map((circuit, ci) => (
            <div key={ci}>
              <div
                style={{
                  padding: "7px 14px",
                  background: "rgba(0,0,0,0.15)",
                  borderBottom: "1px solid var(--pg-border)",
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--pg-blue)" }}>
                  {circuit.nombre || `Circuito ${ci + 1}`}
                </span>
                <span style={{ fontSize: 9, color: "var(--pg-muted)" }}>
                  {circuit.rondas} rondas · {circuit.descanso} descanso
                </span>
              </div>
              {circuit.ejercicios?.map((ex, ei) => (
                <div
                  key={ei}
                  className="pg-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: EX_COL,
                    padding: "7px 14px 7px 28px",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--pg-disabled)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {ei + 1}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "var(--pg-text)" }}>
                    {ex.nombre}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--pg-muted)" }}>—</span>
                  <span style={{ fontSize: 11, color: "var(--pg-muted)" }}>
                    {ex.reps?.join(" / ") || "—"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--pg-muted)" }}>—</span>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
