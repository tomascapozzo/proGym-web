"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

async function getStaffContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." as const };

  const { data: membership } = await supabase
    .from("club_members")
    .select("club_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return { error: "Sin club asignado." as const };
  if (membership.role !== "admin" && membership.role !== "coach") {
    return { error: "Solo el staff puede modificar planteles." as const };
  }

  return { supabase, user, clubId: membership.club_id };
}

async function bulkAddByPosition(
  supabase: SupabaseClient,
  clubId: string,
  groupId: string,
  addedBy: string,
  positionRules: string[]
) {
  if (positionRules.length === 0) return;

  const { data: members } = await supabase
    .from("club_members")
    .select("user_id, profile:profiles!inner(position)")
    .eq("club_id", clubId)
    .eq("status", "active");

  const matching = (members ?? [])
    .filter(m => {
      const profile = m.profile as unknown as { position: string | null } | null;
      return profile?.position && positionRules.includes(profile.position);
    })
    .map(m => ({ group_id: groupId, user_id: m.user_id, added_by: addedBy }));

  if (matching.length > 0) {
    await supabase
      .from("club_group_members")
      .upsert(matching, { onConflict: "group_id,user_id", ignoreDuplicates: true });
  }
}

export async function createGroup(
  name: string,
  description: string | null,
  kind: "squad" | "training" = "squad",
  positionRules: string[] = []
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "El nombre es obligatorio." };

  const { data, error } = await ctx.supabase
    .from("club_groups")
    .insert({
      club_id: ctx.clubId,
      name: trimmed,
      description: description?.trim() || null,
      created_by: ctx.user.id,
      kind,
      position_rules: positionRules,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  if (data?.id) {
    await bulkAddByPosition(ctx.supabase, ctx.clubId, data.id, ctx.user.id, positionRules);
  }

  if (kind === "training") revalidatePath("/groups");
  else revalidatePath("/squads");
  return { ok: true, id: data?.id };
}

export async function updateGroup(
  id: string,
  name: string,
  description: string | null,
  positionRules: string[] = []
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "El nombre es obligatorio." };

  const { error } = await ctx.supabase
    .from("club_groups")
    .update({ name: trimmed, description: description?.trim() || null, position_rules: positionRules })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await bulkAddByPosition(ctx.supabase, ctx.clubId, id, ctx.user.id, positionRules);

  revalidatePath("/squads");
  revalidatePath(`/squads/${id}`);
  return { ok: true };
}

export async function deleteGroup(id: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.supabase.from("club_groups").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/squads");
  return { ok: true };
}

export async function addMemberToGroup(
  groupId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.supabase.from("club_group_members").insert({
    group_id: groupId,
    user_id: userId,
    added_by: ctx.user.id,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/squads/${groupId}`);
  revalidatePath("/squads");
  return { ok: true };
}

export async function removeMemberFromGroup(
  groupId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.supabase
    .from("club_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/squads/${groupId}`);
  revalidatePath("/squads");
  return { ok: true };
}
