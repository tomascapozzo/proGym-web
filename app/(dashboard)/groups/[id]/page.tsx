import { notFound, redirect } from "next/navigation";
import Topbar from "@/components/dashboard/Topbar";
import GroupHeaderEditor from "@/components/club/GroupHeaderEditor";
import GroupMemberManager from "@/components/club/GroupMemberManager";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  updateTrainingGroup,
  deleteTrainingGroup,
  addMemberToTrainingGroup,
  removeMemberFromTrainingGroup,
} from "@/app/(dashboard)/groups/actions";

interface GroupRow {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  kind: string;
}

interface ProfileRow {
  user_id: string;
  profile: { id: string; name: string; username: string } | null;
}

export default async function GroupDetailPage({
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
    .select("id, club_id, name, description, kind")
    .eq("id", id)
    .maybeSingle();

  const group = groupRaw as GroupRow | null;
  if (!group || group.club_id !== club.id || group.kind !== "training") notFound();

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
        .select("user_id, profile:profiles(id, name, username)")
        .eq("club_id", club.id)
        .in("user_id", memberUserIds)
    : { data: [] };

  const memberRows = (memberRowsRaw ?? []) as unknown as ProfileRow[];

  const members = memberRows
    .filter(r => r.profile != null)
    .map(r => ({
      user_id: r.user_id,
      name: r.profile!.name ?? "",
      username: r.profile!.username ?? "",
    }));

  const { data: clubMembersRaw } = await supabase
    .from("club_members")
    .select("user_id, profile:profiles(id, name, username)")
    .eq("club_id", club.id)
    .eq("role", "player");

  const clubMembers = (clubMembersRaw ?? []) as unknown as ProfileRow[];

  const available = clubMembers
    .filter(r => r.profile != null && !existingIds.has(r.user_id))
    .map(r => ({
      user_id: r.user_id,
      name: r.profile!.name ?? "",
      username: r.profile!.username ?? "",
    }));

  return (
    <>
      <Topbar
        back={{ href: "/groups", label: "Grupos" }}
        title={group.name}
        subtitle={`${members.length} ${members.length === 1 ? "jugador" : "jugadores"}`}
      />

      <div style={{ padding: "12px 20px 0", flexShrink: 0 }}>
        <GroupHeaderEditor
          groupId={group.id}
          initialName={group.name}
          initialDescription={group.description}
          canEdit={isStaff}
          entityLabel="grupo"
          backHref="/groups"
          onUpdate={updateTrainingGroup}
          onDelete={deleteTrainingGroup}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        <GroupMemberManager
          groupId={group.id}
          members={members}
          available={available}
          canManage={isStaff}
          entityLabel="grupo"
          onAdd={addMemberToTrainingGroup}
          onRemove={removeMemberFromTrainingGroup}
        />
      </div>
    </>
  );
}
