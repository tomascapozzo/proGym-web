"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useRoutineCreator } from "@/hooks/useRoutineCreator";
import RoutineCreatorModal from "./RoutineCreatorModal";
import { deleteRoutine } from "@/app/(dashboard)/routines/actions";

export interface RoutineRow {
  id: string;
  name: string;
  type: "daily" | "weekly" | "monthly";
  shareStatus: "active" | "scheduled" | "none";
  daysCount: number;
  exercisesCount: number;
  ownerName: string;
}

const TYPE_LABELS: Record<string, string> = { daily: "Diaria", weekly: "Semanal", monthly: "Mensual" };
const TYPE_COLOR: Record<string, string>  = { daily: "var(--pg-blue)", weekly: "var(--pg-accent)", monthly: "var(--pg-purple)" };
const TYPE_BG: Record<string, string>     = { daily: "rgba(14,165,233,0.12)", weekly: "rgba(212,168,83,0.12)", monthly: "rgba(167,139,250,0.12)" };

const SHARE_LABELS: Record<string, string> = { active: "Compartida", scheduled: "Programada", none: "Sin compartir" };
const SHARE_COLOR: Record<string, string>  = { active: "var(--pg-green)", scheduled: "var(--pg-amber)", none: "var(--pg-disabled)" };
const SHARE_BG: Record<string, string>     = { active: "rgba(74,222,128,0.12)", scheduled: "rgba(245,158,11,0.12)", none: "rgba(255,255,255,0.05)" };

type Filter = "all" | "shared" | "unshared";
const TABS: { key: Filter; label: string }[] = [
  { key: "all",      label: "Todas"         },
  { key: "shared",   label: "Compartidas"   },
  { key: "unshared", label: "Sin compartir" },
];

const COL = "1fr 90px 46px 72px 1fr 90px 56px";
const HEADERS = ["Nombre", "Tipo", "Días", "Ejercicios", "Creador", "Estado", ""];

export default function RoutinesTable({ routines, clubId }: { routines: RoutineRow[]; clubId: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localRoutines, setLocalRoutines] = useState<RoutineRow[]>(routines);
  const router = useRouter();
  const creator = useRoutineCreator(() => router.refresh());

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta rutina? Se archivarán las asignaciones activas.")) return;
    setDeletingId(id);
    const result = await deleteRoutine(id);
    setDeletingId(null);
    if (result.ok) {
      setLocalRoutines(prev => prev.filter(r => r.id !== id));
    } else {
      alert(result.error ?? "No se pudo eliminar la rutina.");
    }
  }
  const { openEditRoutine, duplicateRoutine } = creator;

  const filtered = filter === "all"
    ? localRoutines
    : filter === "shared"
    ? localRoutines.filter(r => r.shareStatus === "active" || r.shareStatus === "scheduled")
    : localRoutines.filter(r => r.shareStatus === "none");

  const sharedCount = localRoutines.filter(r => r.shareStatus === "active" || r.shareStatus === "scheduled").length;

  return (
    <>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--pg-border)", padding: "0 20px", background: "var(--pg-card)", flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: "var(--pg-muted)", marginRight: 12 }}>{sharedCount} compartidas</span>
        {TABS.map(tab => {
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                padding: "10px 14px",
                fontSize: 11,
                fontWeight: active ? 600 : 400,
                color: active ? "var(--pg-text)" : "var(--pg-muted)",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${active ? "var(--pg-accent)" : "transparent"}`,
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          );
        })}
        <button
          onClick={creator.openCreateRoutine}
          style={{
            marginLeft: "auto",
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            background: "var(--pg-accent)",
            border: "none",
            color: "var(--pg-accent-text)",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Plus size={12} />
          Crear rutina
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        <div style={{ background: "var(--pg-card)", border: "1px solid var(--pg-border)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: COL, padding: "6px 16px", borderBottom: "1px solid var(--pg-border)", background: "rgba(0,0,0,0.2)" }}>
            {HEADERS.map(h => (
              <span key={h} style={{ fontSize: 8, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", fontWeight: 500 }}>{h}</span>
            ))}
          </div>

          {filtered.map(r => (
            <div key={r.id} className="pg-row" style={{ display: "grid", gridTemplateColumns: COL, padding: "9px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)", alignItems: "center" }}>
              <Link href={`/routines/${r.id}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--pg-text)", textDecoration: "none" }}>
                {r.name}
              </Link>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: TYPE_BG[r.type], color: TYPE_COLOR[r.type], display: "inline-block", width: "fit-content" }}>
                {TYPE_LABELS[r.type]}
              </span>
              <span style={{ fontSize: 11, color: "var(--pg-muted)", fontVariantNumeric: "tabular-nums" }}>{r.daysCount}</span>
              <span style={{ fontSize: 11, color: "var(--pg-muted)", fontVariantNumeric: "tabular-nums" }}>{r.exercisesCount}</span>
              <span style={{ fontSize: 11, color: "var(--pg-muted)" }}>{r.ownerName}</span>
              <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: SHARE_BG[r.shareStatus], color: SHARE_COLOR[r.shareStatus], display: "inline-block", width: "fit-content" }}>
                {SHARE_LABELS[r.shareStatus]}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <button
                  onClick={() => duplicateRoutine(r.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pg-muted)", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}
                  title="Duplicar rutina"
                >
                  <Copy size={13} />
                </button>
                <button
                  onClick={() => openEditRoutine(r.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pg-muted)", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}
                  title="Editar rutina"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={deletingId === r.id}
                  style={{ background: "none", border: "none", cursor: deletingId === r.id ? "wait" : "pointer", color: deletingId === r.id ? "var(--pg-disabled)" : "var(--pg-red)", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, opacity: deletingId === r.id ? 0.5 : 1 }}
                  title="Eliminar rutina"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: "28px", textAlign: "center", fontSize: 12, color: "var(--pg-muted)" }}>
              {localRoutines.length === 0 ? "No hay rutinas creadas todavía." : "Sin rutinas en esta categoría."}
            </div>
          )}
        </div>
      </div>
    </div>
    <RoutineCreatorModal {...creator} clubId={clubId} />
    </>
  );
}
