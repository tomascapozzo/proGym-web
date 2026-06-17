"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  shareRoutine,
  unshareRoutine,
  shareRoutineWithPlayer,
  unshareRoutineFromPlayer,
  finalizeShare,
} from "@/app/(dashboard)/routines/actions";

interface Group  { id: string; name: string }
interface Player { id: string; name: string }

type ShareStatus = "scheduled" | "active" | "expired";

interface GroupShare  { id: string; group_id: string;  starts_at: string | null; ends_at: string | null; status: ShareStatus }
interface PlayerShare { id: string; player_id: string; starts_at: string | null; ends_at: string | null; status: ShareStatus }

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function localToISO(local: string): string {
  return new Date(local).toISOString();
}

const STATUS_LABEL: Record<ShareStatus, string> = {
  scheduled: "Programado",
  active:    "Activa",
  expired:   "Vencida",
};
const STATUS_COLOR: Record<ShareStatus, string> = {
  scheduled: "var(--pg-amber)",
  active:    "var(--pg-green)",
  expired:   "var(--pg-muted)",
};

// ---- ShareIntervalModal ------------------------------------------------------

interface ShareIntervalModalProps {
  targetName: string;
  onConfirm: (startsAt: string | null, endsAt: string | null) => void;
  onCancel: () => void;
  loading: boolean;
}

function ShareIntervalModal({ targetName, onConfirm, onCancel, loading }: ShareIntervalModalProps) {
  const [startsAt, setStartsAt] = useState("");
  const [endsAt,   setEndsAt]   = useState("");

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", fontSize: 12,
    background: "var(--pg-surface)", border: "1px solid var(--pg-border2)",
    borderRadius: 7, color: "var(--pg-text)", outline: "none",
    colorScheme: "dark", boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--pg-card)", border: "1px solid var(--pg-border)", borderRadius: 12, width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--pg-border)" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--pg-text)" }}>Compartir rutina</div>
            <div style={{ fontSize: 10, color: "var(--pg-muted)", marginTop: 2 }}>{targetName}</div>
          </div>
          <button onClick={onCancel} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--pg-muted)", padding: 4, borderRadius: 5 }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--pg-muted)", display: "block", marginBottom: 6 }}>
              Inicio (opcional)
            </label>
            <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} style={inputStyle} />
            <div style={{ fontSize: 9, color: "var(--pg-disabled)", marginTop: 4 }}>
              Sin fecha de inicio la rutina se asigna de inmediato.
            </div>
          </div>
          <div>
            <label style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--pg-muted)", display: "block", marginBottom: 6 }}>
              Vencimiento (opcional)
            </label>
            <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} style={inputStyle} />
            <div style={{ fontSize: 9, color: "var(--pg-disabled)", marginTop: 4 }}>
              La rutina seguira visible tras el vencimiento pero se mostrara como vencida.
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 18px", borderTop: "1px solid var(--pg-border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={loading} style={{ padding: "7px 14px", fontSize: 11, borderRadius: 7, cursor: "pointer", background: "transparent", border: "1px solid var(--pg-border2)", color: "var(--pg-muted)" }}>
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(startsAt ? localToISO(startsAt) : null, endsAt ? localToISO(endsAt) : null)}
            disabled={loading}
            style={{ padding: "7px 16px", fontSize: 11, fontWeight: 700, borderRadius: 7, cursor: loading ? "default" : "pointer", opacity: loading ? 0.5 : 1, background: "rgba(212,168,83,0.15)", border: "1px solid rgba(212,168,83,0.4)", color: "var(--pg-accent)" }}
          >
            {loading ? "..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- ShareIntervalInfo -------------------------------------------------------

type ShareInfo = { id: string; starts_at: string | null; ends_at: string | null; status: ShareStatus };

function ShareIntervalInfo({ share }: { share: ShareInfo }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: STATUS_COLOR[share.status] }}>
        {STATUS_LABEL[share.status]}
      </span>
      {share.starts_at != null && (
        <span style={{ fontSize: 9, color: "var(--pg-muted)" }}>
          desde {formatDateTime(share.starts_at)}
        </span>
      )}
      {share.ends_at != null && (
        <span style={{ fontSize: 9, color: "var(--pg-muted)" }}>
          vence {formatDateTime(share.ends_at)}
        </span>
      )}
    </div>
  );
}

// ---- ShareRow ----------------------------------------------------------------

interface ShareRowProps {
  name: string;
  share: ShareInfo | null;
  isPending: boolean;
  onShareClick: () => void;
  onUnshare: () => void;
  onFinalize: () => void;
}

function ShareRow({ name, share, isPending, onShareClick, onUnshare, onFinalize }: ShareRowProps) {
  const canFinalize = share != null && share.status !== "expired";

  return (
    <div className="pg-row" style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 12, color: "var(--pg-text)", fontWeight: 500 }}>{name}</span>
        {share != null && <ShareIntervalInfo share={share} />}
      </div>
      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
        {share == null ? (
          <button
            onClick={onShareClick}
            disabled={isPending}
            style={{ padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: isPending ? "default" : "pointer", opacity: isPending ? 0.5 : 1, background: "transparent", border: "1px solid rgba(212,168,83,0.4)", color: "var(--pg-accent)" }}
          >
            {isPending ? "..." : "Compartir"}
          </button>
        ) : (
          <>
            {canFinalize && (
              <button
                onClick={onFinalize}
                disabled={isPending}
                style={{ padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: isPending ? "default" : "pointer", opacity: isPending ? 0.5 : 1, background: "rgba(212,168,83,0.08)", border: "1px solid rgba(212,168,83,0.3)", color: "var(--pg-accent)" }}
              >
                {isPending ? "..." : "Finalizar"}
              </button>
            )}
            <button
              onClick={onUnshare}
              disabled={isPending}
              style={{ padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: isPending ? "default" : "pointer", opacity: isPending ? 0.5 : 1, background: "var(--pg-red-bg)", border: "1px solid rgba(229,57,53,0.3)", color: "var(--pg-red)" }}
            >
              {isPending ? "..." : "Eliminar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---- ShareGroupsPanel --------------------------------------------------------

type ModalTarget = { type: "group" | "player"; id: string; name: string };

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
  const [modal, setModal] = useState<ModalTarget | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleModalConfirm(startsAt: string | null, endsAt: string | null) {
    if (!modal) return;
    setModalLoading(true);
    setError(null);
    if (modal.type === "group") {
      const result = await shareRoutine(routineId, modal.id, startsAt, endsAt);
      if (result.ok && result.shareId) {
        const isScheduled = startsAt != null && new Date(startsAt) > new Date();
        setGroupShares(prev => [...prev, { id: result.shareId!, group_id: modal.id, starts_at: startsAt, ends_at: endsAt, status: isScheduled ? "scheduled" : "active" }]);
        setModal(null);
      } else if (!result.ok) {
        setError(result.error ?? "Error al compartir.");
      }
    } else {
      const result = await shareRoutineWithPlayer(routineId, modal.id, startsAt, endsAt);
      if (result.ok && result.shareId) {
        const isScheduled = startsAt != null && new Date(startsAt) > new Date();
        setPlayerShares(prev => [...prev, { id: result.shareId!, player_id: modal.id, starts_at: startsAt, ends_at: endsAt, status: isScheduled ? "scheduled" : "active" }]);
        setModal(null);
      } else if (!result.ok) {
        setError(result.error ?? "Error al compartir.");
      }
    }
    setModalLoading(false);
  }

  async function handleGroupFinalize(groupId: string) {
    const existing = groupShares.find(s => s.group_id === groupId);
    if (!existing) return;
    setPendingGroup(groupId);
    setError(null);
    const result = await finalizeShare(existing.id, routineId);
    if (result.ok) {
      const now = new Date().toISOString();
      setGroupShares(prev => prev.map(s => s.id === existing.id ? { ...s, status: "expired", ends_at: now } : s));
    } else {
      setError(result.error ?? "Error al finalizar.");
    }
    setPendingGroup(null);
  }

  async function handleGroupUnshare(groupId: string) {
    const existing = groupShares.find(s => s.group_id === groupId);
    if (!existing) return;
    setPendingGroup(groupId);
    setError(null);
    const result = await unshareRoutine(existing.id, routineId);
    if (result.ok) setGroupShares(prev => prev.filter(s => s.id !== existing.id));
    else setError(result.error ?? "Error al eliminar.");
    setPendingGroup(null);
  }

  async function handlePlayerFinalize(playerId: string) {
    const existing = playerShares.find(s => s.player_id === playerId);
    if (!existing) return;
    setPendingPlayer(playerId);
    setError(null);
    const result = await finalizeShare(existing.id, routineId);
    if (result.ok) {
      const now = new Date().toISOString();
      setPlayerShares(prev => prev.map(s => s.id === existing.id ? { ...s, status: "expired", ends_at: now } : s));
    } else {
      setError(result.error ?? "Error al finalizar.");
    }
    setPendingPlayer(null);
  }

  async function handlePlayerUnshare(playerId: string) {
    const existing = playerShares.find(s => s.player_id === playerId);
    if (!existing) return;
    setPendingPlayer(playerId);
    setError(null);
    const result = await unshareRoutineFromPlayer(existing.id, routineId);
    if (result.ok) setPlayerShares(prev => prev.filter(s => s.id !== existing.id));
    else setError(result.error ?? "Error al eliminar.");
    setPendingPlayer(null);
  }

  const activeGroups    = groupShares.filter(s => s.status === "active").length;
  const scheduledGroups = groupShares.filter(s => s.status === "scheduled").length;
  const activePlayers    = playerShares.filter(s => s.status === "active").length;
  const scheduledPlayers = playerShares.filter(s => s.status === "scheduled").length;

  return (
    <>
      {modal && (
        <ShareIntervalModal
          targetName={modal.name}
          onConfirm={handleModalConfirm}
          onCancel={() => { setModal(null); setError(null); }}
          loading={modalLoading}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ background: "var(--pg-card)", border: "1px solid var(--pg-border)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--pg-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--pg-text)" }}>Grupos</span>
            <span style={{ fontSize: 10, color: "var(--pg-muted)" }}>
              {activeGroups} activos{scheduledGroups > 0 ? ` · ${scheduledGroups} programados` : ""}
            </span>
          </div>
          {groups.length === 0 ? (
            <div style={{ padding: "16px 12px", fontSize: 11, color: "var(--pg-disabled)", textAlign: "center" }}>No hay grupos creados.</div>
          ) : (
            <div>
              {groups.map(g => {
                const share = groupShares.find(s => s.group_id === g.id) ?? null;
                return (
                  <ShareRow key={g.id} name={g.name} share={share}
                    isPending={pendingGroup === g.id}
                    onShareClick={() => { setModal({ type: "group", id: g.id, name: g.name }); setError(null); }}
                    onFinalize={() => handleGroupFinalize(g.id)}
                    onUnshare={() => handleGroupUnshare(g.id)} />
                );
              })}
            </div>
          )}
        </div>

        <div style={{ background: "var(--pg-card)", border: "1px solid var(--pg-border)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--pg-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--pg-text)" }}>Jugadores</span>
            <span style={{ fontSize: 10, color: "var(--pg-muted)" }}>
              {activePlayers} activos{scheduledPlayers > 0 ? ` · ${scheduledPlayers} programados` : ""}
            </span>
          </div>
          {players.length === 0 ? (
            <div style={{ padding: "16px 12px", fontSize: 11, color: "var(--pg-disabled)", textAlign: "center" }}>No hay jugadores activos en el club.</div>
          ) : (
            <div>
              {players.map(p => {
                const share = playerShares.find(s => s.player_id === p.id) ?? null;
                return (
                  <ShareRow key={p.id} name={p.name} share={share}
                    isPending={pendingPlayer === p.id}
                    onShareClick={() => { setModal({ type: "player", id: p.id, name: p.name }); setError(null); }}
                    onFinalize={() => handlePlayerFinalize(p.id)}
                    onUnshare={() => handlePlayerUnshare(p.id)} />
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
    </>
  );
}
