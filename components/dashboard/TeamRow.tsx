"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClubRole } from "@/types/club";

const ROLE_LABEL: Record<ClubRole, string> = {
  admin: "Admin",
  coach: "Coach",
  player: "Jugador",
};

const ROLE_COLOR: Record<ClubRole, { bg: string; fg: string }> = {
  admin:  { bg: "var(--pg-red-bg)",    fg: "var(--pg-red)" },
  coach:  { bg: "var(--pg-blue-bg)",   fg: "var(--pg-blue)" },
  player: { bg: "var(--pg-accent-bg)", fg: "var(--pg-accent)" },
};

const COL = "28px 2.4fr 70px 70px 1fr 100px";

function initials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  memberId: string;
  userId: string;
  role: ClubRole;
  status: "active" | "suspended";
  joinedAt: string;
  name: string;
  lastname: string;
  groups: { id: string; name: string }[];
}

export default function TeamRow({ memberId, role, status, joinedAt, name, lastname, groups }: Props) {
  const router = useRouter();
  const roleColor = ROLE_COLOR[role];
  const isSuspended = status === "suspended";
  const fullName = [name, lastname].filter(Boolean).join(" ");

  return (
    <div
      className="pg-row"
      onClick={() => router.push(`/team/${memberId}`)}
      style={{
        display: "grid",
        gridTemplateColumns: COL,
        padding: "10px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.03)",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
      }}
    >
      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--pg-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "var(--pg-muted)" }}>
        {initials(fullName)}
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--pg-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {fullName}
      </div>

      <span style={{
        justifySelf: "start",
        fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
        background: roleColor.bg, color: roleColor.fg,
        textTransform: "uppercase", letterSpacing: "0.5px",
      }}>
        {ROLE_LABEL[role]}
      </span>

      <span style={{
        justifySelf: "start",
        fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
        background: isSuspended ? "var(--pg-amber-bg)" : "var(--pg-green-bg)",
        color: isSuspended ? "var(--pg-amber)" : "var(--pg-green)",
        textTransform: "uppercase", letterSpacing: "0.5px",
      }}>
        {isSuspended ? "Suspend." : "Activo"}
      </span>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {groups.length === 0 ? (
          <span style={{ fontSize: 10, color: "var(--pg-disabled)" }}>—</span>
        ) : (
          groups.map(g => (
            <Link
              key={g.id}
              href={`/squads/${g.id}`}
              onClick={e => e.stopPropagation()}
              style={{
                fontSize: 10, padding: "1px 6px", borderRadius: 4,
                background: "var(--pg-surface)", color: "var(--pg-muted)",
                textDecoration: "none",
              }}
            >
              {g.name}
            </Link>
          ))
        )}
      </div>

      <span style={{ fontSize: 10, color: "var(--pg-muted)", fontVariantNumeric: "tabular-nums" }}>
        {formatDate(joinedAt)}
      </span>
    </div>
  );
}
