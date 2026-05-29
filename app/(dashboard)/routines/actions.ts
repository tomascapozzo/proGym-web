"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PLACEHOLDER = "00000000-0000-0000-0000-000000000000";

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
    return { error: "Solo el staff puede compartir rutinas." as const };
  }

  return { supabase, user, clubId: membership.club_id };
}

/**
 * Auto-enroll a list of players in a routine.
 * Before enrolling, archives any existing active coach-assigned enrollment
 * (source_share_id IS NOT NULL) so players aren't left juggling two club routines.
 */
async function enrollPlayers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  routineId: string,
  shareId: string,
  playerIds: string[],
) {
  if (playerIds.length === 0) return;

  // Archive any currently active coach-assigned enrollment for these players
  await supabase
    .from("routine_enrollments")
    .update({ status: "past" })
    .in("user_id", playerIds)
    .not("source_share_id", "is", null)
    .eq("status", "active");

  // Enroll in the new routine — upsert in case a past enrollment already exists
  // (ON CONFLICT resets progress and re-activates it)
  await supabase
    .from("routine_enrollments")
    .upsert(
      playerIds.map((userId) => ({
        routine_id: routineId,
        user_id: userId,
        status: "active",
        progress: { completed_days: [] },
        source_share_id: shareId,
      })),
      { onConflict: "routine_id,user_id" },
    );
}

// ─── Share with group ─────────────────────────────────────────────────────────

export async function shareRoutine(
  routineId: string,
  groupId: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const { data: share, error: shareError } = await ctx.supabase
    .from("routine_shares")
    .insert({
      routine_id: routineId,
      club_id: ctx.clubId,
      shared_by: ctx.user.id,
      target_type: "group",
      target_group_id: groupId,
    })
    .select("id")
    .single();

  if (shareError) return { ok: false, error: shareError.message };

  // Fetch active players in the group that belong to this club
  const { data: groupMembers } = await ctx.supabase
    .from("club_group_members")
    .select("user_id")
    .eq("group_id", groupId);

  const groupMemberIds = (groupMembers ?? []).map((m) => m.user_id);

  if (groupMemberIds.length > 0) {
    const { data: activePlayers } = await ctx.supabase
      .from("club_members")
      .select("user_id")
      .eq("club_id", ctx.clubId)
      .eq("role", "player")
      .eq("status", "active")
      .in("user_id", groupMemberIds);

    const playerIds = (activePlayers ?? []).map((m) => m.user_id);
    await enrollPlayers(ctx.supabase, routineId, share.id, playerIds);
  }

  revalidatePath(`/routines/${routineId}`);
  return { ok: true };
}

export async function unshareRoutine(
  shareId: string,
  routineId: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  // Archive enrollments created from this share before deleting it
  // (preserves session history; source_share_id will become null via ON DELETE SET NULL)
  await ctx.supabase
    .from("routine_enrollments")
    .update({ status: "past" })
    .eq("source_share_id", shareId)
    .eq("status", "active");

  const { error } = await ctx.supabase
    .from("routine_shares")
    .delete()
    .eq("id", shareId)
    .eq("club_id", ctx.clubId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/routines/${routineId}`);
  return { ok: true };
}

// ─── Share with individual player ─────────────────────────────────────────────

export async function shareRoutineWithPlayer(
  routineId: string,
  playerId: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const { data: playerMembership } = await ctx.supabase
    .from("club_members")
    .select("id")
    .eq("club_id", ctx.clubId)
    .eq("user_id", playerId)
    .eq("role", "player")
    .eq("status", "active")
    .maybeSingle();

  if (!playerMembership) {
    return { ok: false, error: "El jugador no pertenece a este club." };
  }

  // Get existing share or create a new one
  let shareId: string;
  const { data: existing } = await ctx.supabase
    .from("routine_shares")
    .select("id")
    .eq("routine_id", routineId)
    .eq("target_type", "player")
    .eq("target_user_id", playerId)
    .maybeSingle();

  if (existing) {
    shareId = existing.id;
  } else {
    const { data: newShare, error: shareError } = await ctx.supabase
      .from("routine_shares")
      .insert({
        routine_id: routineId,
        club_id: ctx.clubId,
        shared_by: ctx.user.id,
        target_type: "player",
        target_user_id: playerId,
      })
      .select("id")
      .single();
    if (shareError) return { ok: false, error: shareError.message };
    shareId = newShare.id;
  }

  await enrollPlayers(ctx.supabase, routineId, shareId, [playerId]);

  revalidatePath(`/routines/${routineId}`);
  return { ok: true };
}

export async function unshareRoutineFromPlayer(
  shareId: string,
  routineId: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  // Archive the player's enrollment before removing the share record
  await ctx.supabase
    .from("routine_enrollments")
    .update({ status: "past" })
    .eq("source_share_id", shareId)
    .eq("status", "active");

  const { error } = await ctx.supabase
    .from("routine_shares")
    .delete()
    .eq("id", shareId)
    .eq("club_id", ctx.clubId)
    .eq("target_type", "player");

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/routines/${routineId}`);
  return { ok: true };
}
