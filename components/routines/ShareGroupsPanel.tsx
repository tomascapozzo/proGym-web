"use client";

import { useState } from "react";
import { shareRoutine, unshareRoutine } from "@/app/(dashboard)/routines/actions";

interface Group {
  id: string;
  name: string;
}

interface Share {
  id: string;
  group_id: string;
}

export default function ShareGroupsPanel({
  routineId,
  groups,
  existingShares,
}: {
  routineId: string;
  groups: Group[];
  existingShares: Share[];
}) {
  const [shares, setShares] = useState<Share[]>(existingShares);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function getShare(groupId: string): Share | undefined {
    return shares.find(s => s.group_id === groupId);
  }

  async function handleToggle(groupId: string) {
    const existing = getShare(groupId);
    setPending(groupId);
    setError(null);

    if (existing) {
      const result = await unshareRoutine(existing.id, routineId);
      if (result.ok) {
        setShares(prev => prev.filter(s => s.id !== existing.id));
      } else {
        setError(result.error ?? "Error al quitar el grupo.");
      }
    } else {
      const result = await shareRoutine(routineId, groupId);
      if (result.ok) {
        setShares(prev => [...prev, { id: crypto.randomUUID(), group_id: groupId }]);
      } else {
        setError(result.error ?? "Error al compartir.");
      }
    }

    setPending(null);
  }

  return (
    <div style={{ background: "var(--pg-card)", border: "1px solid var(--pg-border)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--pg-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--pg-text)" }}>Compartir con grupos</span>
        <span style={{ fontSize: 10, color: "var(--pg-muted)" }}>{shares.length} activos</span>
      </div>

      {groups.length === 0 ? (
        <div style={{ padding: "16px 12px", fontSize: 11, color: "var(--pg-disabled)", textAlign: "center" }}>
          No hay grupos de entrenamiento creados.
        </div>
      ) : (
        <div>
          {groups.map(g => {
            const shared = !!getShare(g.id);
            const isLoading = pending === g.id;
            return (
              <div
                key={g.id}
                className="pg-row"
                style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
              >
                <span style={{ fontSize: 12, color: "var(--pg-text)", fontWeight: 500 }}>{g.name}</span>
                <button
                  onClick={() => handleToggle(g.id)}
                  disabled={isLoading}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: isLoading ? "default" : "pointer",
                    opacity: isLoading ? 0.5 : 1,
                    transition: "opacity 0.1s",
                    ...(shared
                      ? {
                          background: "var(--pg-red-bg)",
                          border: "1px solid rgba(229,57,53,0.3)",
                          color: "var(--pg-red)",
                        }
                      : {
                          background: "transparent",
                          border: "1px solid rgba(212,168,83,0.4)",
                          color: "var(--pg-accent)",
                        }),
                  }}
                >
                  {isLoading ? "..." : shared ? "Quitar" : "Compartir"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div style={{ padding: "6px 12px", fontSize: 10, color: "var(--pg-red)", borderTop: "1px solid var(--pg-border)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
