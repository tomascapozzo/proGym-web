"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  endsAt?: string | null,
) {
  if (playerIds.length === 0) return;

  // Archive any active coach-assigned enrollment for these players in OTHER routines
  // (each player should only have one active club routine at a time)
  await supabase
    .from("routine_enrollments")
    .update({ status: "past" })
    .in("user_id", playerIds)
    .not("source_share_id", "is", null)
    .eq("status", "active")
    .neq("routine_id", routineId);

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
        ends_at: endsAt ?? null,
      })),
      { onConflict: "routine_id,user_id" },
    );
}

// ─── Share with group ─────────────────────────────────────────────────────────

export async function shareRoutine(
  routineId: string,
  groupId: string,
  startsAt?: string | null,
  endsAt?: string | null,
): Promise<{ ok: boolean; shareId?: string; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  // Prevent duplicate shares for the same routine+group
  const { data: existing } = await ctx.supabase
    .from("routine_shares")
    .select("id")
    .eq("routine_id", routineId)
    .eq("target_type", "group")
    .eq("target_group_id", groupId)
    .maybeSingle();

  if (existing) return { ok: true, shareId: existing.id }; // already shared, nothing to do

  // Determine if this is a future-scheduled share or immediate
  const isScheduled = !!startsAt && new Date(startsAt) > new Date();
  const shareStatus = isScheduled ? "scheduled" : "active";

  const { data: share, error: shareError } = await ctx.supabase
    .from("routine_shares")
    .insert({
      routine_id: routineId,
      club_id: ctx.clubId,
      shared_by: ctx.user.id,
      target_type: "group",
      target_group_id: groupId,
      starts_at: startsAt ?? null,
      ends_at: endsAt ?? null,
      status: shareStatus,
    })
    .select("id")
    .single();

  if (shareError) return { ok: false, error: shareError.message };

  // Only enroll immediately if not scheduled for the future
  if (!isScheduled) {
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
      await enrollPlayers(ctx.supabase, routineId, share.id, playerIds, endsAt);
    }
  }

  revalidatePath(`/routines/${routineId}`);
  return { ok: true, shareId: share.id };
}

// ─── Delete routine ───────────────────────────────────────────────────────────

export async function deleteRoutine(
  routineId: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  // Verify the routine belongs to a staff member of this club
  const { data: routine } = await ctx.supabase
    .from("routines")
    .select("user_id")
    .eq("id", routineId)
    .single();

  if (!routine) return { ok: false, error: "Rutina no encontrada." };

  const { data: ownership } = await ctx.supabase
    .from("club_members")
    .select("id")
    .eq("club_id", ctx.clubId)
    .eq("user_id", routine.user_id)
    .in("role", ["admin", "coach"])
    .maybeSingle();

  if (!ownership) return { ok: false, error: "No tenés permiso para eliminar esta rutina." };

  // Clean up dependent records before deleting
  // 1. Archive enrollments
  await ctx.supabase
    .from("routine_enrollments")
    .update({ status: "past" })
    .eq("routine_id", routineId)
    .eq("status", "active");

  // 2. Delete shares (routine_enrollments.source_share_id will be orphaned but that's fine)
  await ctx.supabase
    .from("routine_shares")
    .delete()
    .eq("routine_id", routineId);

  // 3. Delete the routine
  const { error } = await ctx.supabase
    .from("routines")
    .delete()
    .eq("id", routineId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/routines");
  return { ok: true };
}

/**
 * Finalize a share early — sets ends_at to now and status to 'expired'.
 * Enrollments are NOT touched (soft end: routine stays visible but marked expired).
 */
export async function finalizeShare(
  shareId: string,
  routineId: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const now = new Date().toISOString();

  const { error } = await ctx.supabase
    .from("routine_shares")
    .update({ status: "expired", ends_at: now })
    .eq("id", shareId)
    .eq("club_id", ctx.clubId);

  if (error) return { ok: false, error: error.message };

  // Also stamp ends_at on any active enrollments from this share so the
  // mobile app picks up the deadline immediately (doesn't wait for next cron run)
  await ctx.supabase
    .from("routine_enrollments")
    .update({ ends_at: now })
    .eq("source_share_id", shareId)
    .eq("status", "active");

  revalidatePath(`/routines/${routineId}`);
  return { ok: true };
}

export async function unshareRoutine(
  shareId: string,
  routineId: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  // Fetch the share to get target group + routine
  const { data: share } = await ctx.supabase
    .from("routine_shares")
    .select("routine_id, target_group_id")
    .eq("id", shareId)
    .single();

  if (share?.target_group_id) {
    // Get all players in the group so we can archive any enrollment for this routine,
    // regardless of source_share_id (handles orphaned null-source enrollments too)
    const { data: groupMembers } = await ctx.supabase
      .from("club_group_members")
      .select("user_id")
      .eq("group_id", share.target_group_id);

    const playerIds = (groupMembers ?? []).map((m) => m.user_id);

    if (playerIds.length > 0) {
      await ctx.supabase
        .from("routine_enrollments")
        .update({ status: "past" })
        .eq("routine_id", share.routine_id)
        .in("user_id", playerIds)
        .eq("status", "active");
    }
  } else {
    // Fallback: archive by source_share_id only
    await ctx.supabase
      .from("routine_enrollments")
      .update({ status: "past" })
      .eq("source_share_id", shareId)
      .eq("status", "active");
  }

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
  playerId: string,
  startsAt?: string | null,
  endsAt?: string | null,
): Promise<{ ok: boolean; shareId?: string; error?: string }> {
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
    const isScheduled = !!startsAt && new Date(startsAt) > new Date();
    const shareStatus = isScheduled ? "scheduled" : "active";

    const { data: newShare, error: shareError } = await ctx.supabase
      .from("routine_shares")
      .insert({
        routine_id: routineId,
        club_id: ctx.clubId,
        shared_by: ctx.user.id,
        target_type: "player",
        target_user_id: playerId,
        starts_at: startsAt ?? null,
        ends_at: endsAt ?? null,
        status: shareStatus,
      })
      .select("id")
      .single();
    if (shareError) return { ok: false, error: shareError.message };
    shareId = newShare.id;

    if (!isScheduled) {
      await enrollPlayers(ctx.supabase, routineId, shareId, [playerId], endsAt);
    }
  }

  revalidatePath(`/routines/${routineId}`);
  return { ok: true, shareId };
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
