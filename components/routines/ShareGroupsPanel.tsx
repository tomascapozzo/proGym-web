"use client";

import { useState } from "react";
import {
  shareRoutine,
  unshareRoutine,
  shareRoutineWithPlayer,
  unshareRoutineFromPlayer,
} from "@/app/(dashboard)/routines/actions";

interface Group  { id: string; name: string }
interface Player { id: string; name: string }
interface GroupShare  { id: string; group_id: string }
interface PlayerShare { id: string; player_id: string }

const toggleBtn = (shared: boolean, loading: boolean): React.CSSProperties => ({
  padding: "3px 10px",
  borderRadius: 6,
  fontSize: 10,
  fontWeight: 700,
  cursor: loading ? "default" : "pointer",
  opacity: loading ? 0.5 : 1,
  transition: "opacity 0.1s",
  ...(shared
    ? { background: "var(--pg-red-bg)", border: "1px solid rgba(229,57,53,0.3)", color: "var(--pg-red)" }
    : { background: "transparent", border: "1px solid rgba(212,168,83,0.4)", color: "var(--pg-accent)" }),
});

export default function ShareGroupsPanel({
  routineId,
  groups,
  existingGroupShares,
  players,
  existingPlayerShares,
}: {
  routineId: string;
  groups: Group[];
  existingGroupShares: GroupShare[];
  players: Player[];
  existingPlayerShares: PlayerShare[];
}) {
  const [groupShares,  setGroupShares]  = useState<GroupShare[]>(existingGroupShares);
  const [playerShares, setPlayerShares] = useState<PlayerShare[]>(existingPlayerShares);
  const [pendingGroup,  setPendingGroup]  = useState<string | null>(null);
  const [pendingPlayer, setPendingPlayer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGroupToggle(groupId: string) {
    const existing = groupShares.find(s => s.group_id === groupId);
    setPendingGroup(groupId);
    setError(null);
    if (existing) {
      const result = await unshareRoutine(existing.id, routineId);
      if (result.ok) setGroupShares(prev => prev.filter(s => s.id !== existing.id));
      else setError(result.error ?? "Error al quitar el grupo.");
    } else {
      const result = await shareRoutine(routineId, groupId);
      if (result.ok) setGroupShares(prev => [...prev, { id: `tmp-${Date.now()}-${Math.random()}`, group_id: groupId }]);
      else setError(result.error ?? "Error al compartir.");
    }
    setPendingGroup(null);
  }

  async function handlePlayerToggle(playerId: string) {
    const existing = playerShares.find(s => s.player_id === playerId);
    setPendingPlayer(playerId);
    setError(null);
    if (existing) {
      const result = await unshareRoutineFromPlayer(existing.id, routineId);
      if (result.ok) setPlayerShares(prev => prev.filter(s => s.id !== existing.id));
      else setError(result.error ?? "Error al quitar el jugador.");
    } else {
      const result = await shareRoutineWithPlayer(routineId, playerId);
      if (result.ok) setPlayerShares(prev => [...prev, { id: `tmp-${Date.now()}-${Math.random()}`, player_id: playerId }]);
      else setError(result.error ?? "Error al compartir.");
    }
    setPendingPlayer(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

      {/* Groups card */}
      <div style={{ background: "var(--pg-card)", border: "1px solid var(--pg-border)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--pg-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--pg-text)" }}>Grupos de entrenamiento</span>
          <span style={{ fontSize: 10, color: "var(--pg-muted)" }}>{groupShares.length} activos</span>
        </div>
        {groups.length === 0 ? (
          <div style={{ padding: "16px 12px", fontSize: 11, color: "var(--pg-disabled)", textAlign: "center" }}>
            No hay grupos de entrenamiento creados.
          </div>
        ) : (
          <div>
            {groups.map(g => {
              const shared = !!groupShares.find(s => s.group_id === g.id);
              const isLoading = pendingGroup === g.id;
              return (
                <div key={g.id} className="pg-row" style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--pg-text)", fontWeight: 500 }}>{g.name}</span>
                  <button onClick={() => handleGroupToggle(g.id)} disabled={isLoading} style={toggleBtn(shared, isLoading)}>
                    {isLoading ? "..." : shared ? "Quitar" : "Compartir"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Players card */}
      <div style={{ background: "var(--pg-card)", border: "1px solid var(--pg-border)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--pg-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--pg-text)" }}>Jugadores</span>
          <span style={{ fontSize: 10, color: "var(--pg-muted)" }}>{playerShares.length} activos</span>
        </div>
        {players.length === 0 ? (
          <div style={{ padding: "16px 12px", fontSize: 11, color: "var(--pg-disabled)", textAlign: "center" }}>
            No hay jugadores activos en el club.
          </div>
        ) : (
          <div>
            {players.map(p => {
              const shared = !!playerShares.find(s => s.player_id === p.id);
              const isLoading = pendingPlayer === p.id;
              return (
                <div key={p.id} className="pg-row" style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--pg-text)", fontWeight: 500 }}>{p.name}</span>
                  <button onClick={() => handlePlayerToggle(p.id)} disabled={isLoading} style={toggleBtn(shared, isLoading)}>
                    {isLoading ? "..." : shared ? "Quitar" : "Compartir"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: "6px 12px", fontSize: 10, color: "var(--pg-red)", background: "var(--pg-card)", border: "1px solid var(--pg-border)", borderRadius: 6 }}>
          {error}
        </div>
      )}
    </div>
  );
}
