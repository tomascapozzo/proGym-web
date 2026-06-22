import Link from "next/link";
import { redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import TeamRow from "@/components/dashboard/TeamRow";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ClubRole } from "@/types/club";

interface MemberRow {
  id: string;
  user_id: string;
  role: ClubRole;
  status: "active" | "suspended";
  joined_at: string;
  profile: { id: string; name: string; lastname: string } | null;
}

interface GroupMembershipRow {
  user_id: string;
  group: { id: string; name: string } | null;
}

const COL = "28px 2.4fr 70px 70px 1fr 100px";
const HEADERS = ["", "Miembro", "Rol", "Estado", "Planteles", "Se unió"];

export default async function TeamPage() {
  const { user, membership, club } = await getCurrentMembership();
  if (!user) redirect("/auth/login");
  if (!membership || !club) redirect("/club/new");

  const supabase = await createClient();

  const { data: membersRaw } = await supabase
    .from("club_members")
    .select("*, profile:profiles(id, name, lastname)")
    .eq("club_id", club.id)
    .order("joined_at");

  const members = (membersRaw ?? []) as unknown as MemberRow[];

  const { data: groupsRaw } = await supabase
    .from("club_groups")
    .select("id, name")
    .eq("club_id", club.id);

  const groupIds = (groupsRaw ?? []).map(g => g.id);

  let groupMemberships: GroupMembershipRow[] = [];
  if (groupIds.length > 0) {
    const { data: gmRaw } = await supabase
      .from("club_group_members")
      .select("user_id, group:club_groups(id, name)")
      .in("group_id", groupIds);
    groupMemberships = (gmRaw ?? []) as unknown as GroupMembershipRow[];
  }

  const groupsByUser = new Map<string, { id: string; name: string }[]>();
  for (const gm of groupMemberships) {
    if (!gm.group) continue;
    const list = groupsByUser.get(gm.user_id) ?? [];
    list.push(gm.group);
    groupsByUser.set(gm.user_id, list);
  }

  const isStaff = membership.role === "admin" || membership.role === "coach";

  return (
    <>
      <Topbar
        title="Equipo"
        subtitle={`${members.length} ${members.length === 1 ? "miembro" : "miembros"}`}
        actions={
          isStaff ? (
            <Link
              href="/invitations"
              style={{
                padding: "5px 12px",
                borderRadius: 7,
                fontSize: 11,
                fontWeight: 700,
                background: "var(--pg-accent)",
                color: "var(--pg-accent-text)",
                textDecoration: "none",
              }}
            >
              + Invitar miembro
            </Link>
          ) : null
        }
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        <div style={{ background: "var(--pg-card)", border: "1px solid var(--pg-border)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: COL, padding: "8px 16px", borderBottom: "1px solid var(--pg-border)", background: "rgba(0,0,0,0.2)", gap: 10 }}>
            {HEADERS.map(h => (
              <span key={h} style={{ fontSize: 8, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", fontWeight: 500 }}>{h}</span>
            ))}
          </div>

          {members.map(m => (
            <TeamRow
              key={m.id}
              memberId={m.id}
              userId={m.user_id}
              role={m.role}
              status={m.status}
              joinedAt={m.joined_at}
              name={m.profile?.name?.trim() || "Sin nombre"}
              lastname={m.profile?.lastname || ""}
              groups={groupsByUser.get(m.user_id) ?? []}
            />
          ))}

          {members.length === 0 && (
            <div style={{ padding: 28, textAlign: "center", fontSize: 12, color: "var(--pg-muted)" }}>
              Aún no hay miembros en este club.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
