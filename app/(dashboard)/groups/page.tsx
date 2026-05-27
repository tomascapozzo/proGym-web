import Link from "next/link";
import { redirect } from "next/navigation";
import { Layers } from "lucide-react";
import Topbar from "@/components/dashboard/Topbar";
import CreateGroupForm from "@/components/club/CreateGroupForm";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  member_count: { count: number }[];
}

export default async function GroupsPage() {
  const { user, membership, club } = await getCurrentMembership();
  if (!user) redirect("/auth/login");
  if (!membership || !club) redirect("/club/new");

  const isStaff = membership.role === "admin" || membership.role === "coach";
  const supabase = await createClient();

  const { data: groupsRaw } = await supabase
    .from("club_groups")
    .select("id, name, description, created_at, member_count:club_group_members(count)")
    .eq("club_id", club.id)
    .eq("kind", "training")
    .order("name");

  const groups = (groupsRaw ?? []) as unknown as GroupRow[];

  return (
    <>
      <Topbar
        title="Grupos"
        subtitle={`${groups.length} ${groups.length === 1 ? "grupo" : "grupos"}`}
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {isStaff && (
          <div style={{ marginBottom: 16 }}>
            <CreateGroupForm kind="training" />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {groups.map(g => {
            const count = g.member_count?.[0]?.count ?? 0;
            return (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                style={{
                  background: "var(--pg-card)",
                  border: "1px solid var(--pg-border)",
                  borderRadius: 10,
                  padding: "1rem",
                  textDecoration: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  minHeight: 110,
                  transition: "border-color 0.15s, background 0.15s",
                }}
                className="pg-row"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: "var(--pg-blue-bg)",
                    border: "1px solid rgba(74,144,217,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--pg-blue)",
                  }}>
                    <Layers size={14} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--pg-text)" }}>
                    {g.name}
                  </div>
                </div>
                {g.description && (
                  <div style={{ fontSize: 11, color: "var(--pg-muted)", lineHeight: 1.4 }}>
                    {g.description}
                  </div>
                )}
                <div style={{ marginTop: "auto", fontSize: 10, color: "var(--pg-disabled)", letterSpacing: "1px", textTransform: "uppercase", fontWeight: 600 }}>
                  {count} {count === 1 ? "jugador" : "jugadores"}
                </div>
              </Link>
            );
          })}

          {groups.length === 0 && (
            <div style={{
              gridColumn: "1 / -1",
              padding: 32,
              textAlign: "center",
              background: "var(--pg-card)",
              border: "1px solid var(--pg-border)",
              borderRadius: 10,
              fontSize: 12,
              color: "var(--pg-muted)",
            }}>
              {isStaff
                ? "Aún no hay grupos. Crea uno para organizar jugadores por posición, estado físico u otro criterio."
                : "No hay grupos de entrenamiento creados."}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
