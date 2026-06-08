import { notFound, redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import GroupHeaderEditor from "@/components/club/GroupHeaderEditor";
import GroupMemberManager from "@/components/club/GroupMemberManager";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateGroup, deleteGroup, addMemberToGroup, removeMemberFromGroup } from "@/app/(dashboard)/squads/actions";

interface GroupRow {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  position_rules: string[];
}

interface ProfileRow {
  user_id: string;
  profile: { id: string; name: string; lastname: string } | null;
}

export default async function SquadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { user, membership, club } = await getCurrentMembership();
  if (!user) redirect("/auth/login");
  if (!membership || !club) redirect("/club/new");

  const supabase = await createClient();

  const { data: groupRaw } = await supabase
    .from("club_groups")
    .select("id, club_id, name, description, position_rules")
    .eq("id", id)
    .maybeSingle();

  const group = groupRaw as GroupRow | null;
  if (!group || group.club_id !== club.id) notFound();

  const isStaff = membership.role === "admin" || membership.role === "coach";

  const { data: groupMemberIdsRaw } = await supabase
    .from("club_group_members")
    .select("user_id")
    .eq("group_id", id);

  const existingIds = new Set((groupMemberIdsRaw ?? []).map(r => r.user_id));

  const memberUserIds = [...existingIds];
  const { data: memberRowsRaw } = memberUserIds.length > 0
    ? await supabase
        .from("club_members")
        .select("user_id, profile:profiles(id, name, lastname)")
        .eq("club_id", club.id)
        .in("user_id", memberUserIds)
    : { data: [] };

  const memberRows = (memberRowsRaw ?? []) as unknown as ProfileRow[];

  const members = memberRows
    .filter(r => r.profile != null)
    .map(r => ({
      user_id: r.user_id,
      name: r.profile!.name ?? "",
      lastname: r.profile!.lastname ?? "",
    }));

  const { data: clubMembersRaw } = await supabase
    .from("club_members")
    .select("user_id, profile:profiles(id, name, lastname)")
    .eq("club_id", club.id);

  const clubMembers = (clubMembersRaw ?? []) as unknown as ProfileRow[];

  const available = clubMembers
    .filter(r => r.profile != null && !existingIds.has(r.user_id))
    .map(r => ({
      user_id: r.user_id,
      name: r.profile!.name ?? "",
      lastname: r.profile!.lastname ?? "",
    }));

  return (
    <>
      <Topbar
        back={{ href: "/squads", label: "Planteles" }}
        title={group.name}
        subtitle={`${members.length} ${members.length === 1 ? "miembro" : "miembros"}`}
      />

      <div style={{ padding: "12px 20px 0", flexShrink: 0 }}>
        <GroupHeaderEditor
          groupId={group.id}
          initialName={group.name}
          initialDescription={group.description}
          initialPositionRules={group.position_rules ?? []}
          showPositionRules
          canEdit={isStaff}
          entityLabel="plantel"
          backHref="/squads"
          onUpdate={updateGroup}
          onDelete={deleteGroup}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        <GroupMemberManager
          groupId={group.id}
          members={members}
          available={available}
          canManage={isStaff}
          entityLabel="plantel"
          onAdd={addMemberToGroup}
          onRemove={removeMemberFromGroup}
        />
      </div>
    </>
  );
}
