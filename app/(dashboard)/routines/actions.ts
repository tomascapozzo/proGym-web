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
