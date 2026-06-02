"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormStatus, QuestionType, QuestionOptions, ClubFormSchedule } from "@/types/forms";

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
  if (membership.role !== "admin" && membership.role !== "coach")
    return { error: "Solo el staff puede gestionar formularios." as const };

  return { supabase, user, clubId: membership.club_id };
}

// ─── Forms ───────────────────────────────────────────────────────────────────

export async function createForm(
  title: string,
  description: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("club_forms")
    .insert({ club_id: ctx.clubId, created_by: ctx.user.id, title, description: description || null, status: "draft" })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/forms");
  return { ok: true, id: data.id };
}

export async function updateForm(
  formId: string,
  fields: { title?: string; description?: string; status?: FormStatus },
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.supabase
    .from("club_forms")
    .update(fields)
    .eq("id", formId)
    .eq("club_id", ctx.clubId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/forms");
  revalidatePath(`/forms/${formId}`);
  return { ok: true };
}

export async function deleteForm(
  formId: string,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.supabase
    .from("club_forms")
    .delete()
    .eq("id", formId)
    .eq("club_id", ctx.clubId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/forms");
  return { ok: true };
}

// ─── Questions ───────────────────────────────────────────────────────────────

export async function addQuestion(
  formId: string,
  type: QuestionType,
  questionText: string,
  options: QuestionOptions | null,
  required: boolean,
  orderIndex: number,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("club_form_questions")
    .insert({ form_id: formId, type, question_text: questionText, options, required, order_index: orderIndex })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/forms/${formId}`);
  return { ok: true, id: data.id };
}

export async function updateQuestion(
  questionId: string,
  formId: string,
  fields: { question_text?: string; options?: QuestionOptions | null; required?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.supabase
    .from("club_form_questions")
    .update(fields)
    .eq("id", questionId)
    .eq("form_id", formId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/forms/${formId}`);
  return { ok: true };
}

export async function deleteQuestion(
  questionId: string,
  formId: string,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.supabase
    .from("club_form_questions")
    .delete()
    .eq("id", questionId)
    .eq("form_id", formId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/forms/${formId}`);
  return { ok: true };
}

export async function reorderQuestions(
  formId: string,
  ordered: { id: string; order_index: number }[],
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const updates = ordered.map(({ id, order_index }) =>
    ctx.supabase
      .from("club_form_questions")
      .update({ order_index })
      .eq("id", id)
      .eq("form_id", formId),
  );
  await Promise.all(updates);
  revalidatePath(`/forms/${formId}`);
  return { ok: true };
}

// ─── Distribution ─────────────────────────────────────────────────────────────

export async function distributeForm(
  formId: string,
  targetType: "group" | "player",
  targetId: string,
  dueAt: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  // Prevent duplicate distributions
  const { data: existing } = await ctx.supabase
    .from("club_form_distributions")
    .select("id")
    .eq("form_id", formId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();

  if (existing) return { ok: false, error: "Este formulario ya fue enviado a ese destino." };

  const { error } = await ctx.supabase
    .from("club_form_distributions")
    .insert({ form_id: formId, target_type: targetType, target_id: targetId, due_at: dueAt || null, created_by: ctx.user.id });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/forms/${formId}`);
  return { ok: true };
}

export async function deleteDistribution(
  distributionId: string,
  formId: string,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.supabase
    .from("club_form_distributions")
    .delete()
    .eq("id", distributionId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/forms/${formId}`);
  return { ok: true };
}

// ─── Schedules (wellness) ─────────────────────────────────────────────────────

export async function upsertSchedule(
  formId: string,
  scheduleId: string | null,
  targetType: "group" | "player",
  targetId: string,
  daysOfWeek: number[],
  sendTime: string,
): Promise<{ ok: boolean; data?: ClubFormSchedule; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  if (scheduleId) {
    const { data, error } = await ctx.supabase
      .from("club_form_schedules")
      .update({ target_type: targetType, target_id: targetId, days_of_week: daysOfWeek, send_time: sendTime })
      .eq("id", scheduleId)
      .eq("club_id", ctx.clubId)
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/forms/${formId}`);
    return { ok: true, data: data as ClubFormSchedule };
  }

  const { data, error } = await ctx.supabase
    .from("club_form_schedules")
    .insert({ form_id: formId, club_id: ctx.clubId, target_type: targetType, target_id: targetId, days_of_week: daysOfWeek, send_time: sendTime, created_by: ctx.user.id })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/forms/${formId}`);
  return { ok: true, data: data as ClubFormSchedule };
}

export async function deleteSchedule(
  scheduleId: string,
  formId: string,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.supabase
    .from("club_form_schedules")
    .delete()
    .eq("id", scheduleId)
    .eq("club_id", ctx.clubId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/forms/${formId}`);
  return { ok: true };
}

export async function toggleScheduleActive(
  scheduleId: string,
  formId: string,
  active: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.supabase
    .from("club_form_schedules")
    .update({ active })
    .eq("id", scheduleId)
    .eq("club_id", ctx.clubId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/forms/${formId}`);
  return { ok: true };
}
