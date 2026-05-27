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

export async function shareRoutine(
  routineId: string,
  groupId: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.supabase.from("routine_shares").insert({
    routine_id: routineId,
    club_id: ctx.clubId,
    shared_by: ctx.user.id,
    target_type: "group",
    target_group_id: groupId,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/routines/${routineId}`);
  return { ok: true };
}

export async function unshareRoutine(
  shareId: string,
  routineId: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.supabase
    .from("routine_shares")
    .delete()
    .eq("id", shareId)
    .eq("club_id", ctx.clubId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/routines/${routineId}`);
  return { ok: true };
}

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

  const { data: existing } = await ctx.supabase
    .from("routine_shares")
    .select("id")
    .eq("routine_id", routineId)
    .eq("target_type", "player")
    .eq("target_user_id", playerId)
    .maybeSingle();

  if (existing) return { ok: true };

  const { error } = await ctx.supabase.from("routine_shares").insert({
    routine_id: routineId,
    club_id: ctx.clubId,
    shared_by: ctx.user.id,
    target_type: "player",
    target_user_id: playerId,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/routines/${routineId}`);
  return { ok: true };
}

export async function unshareRoutineFromPlayer(
  shareId: string,
  routineId: string
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

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
