"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/auth";

// ─── Ensure anamnesis form exists for this club ───────────────────────────────

export async function ensureAnamnesisForm(clubId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("club_forms")
    .select("id")
    .eq("club_id", clubId)
    .eq("template_type", "anamnesis")
    .maybeSingle();

  if (existing) return existing.id;

  const { user } = await getCurrentMembership();
  if (!user) return null;

  const { data: created, error } = await supabase
    .from("club_forms")
    .insert({
      club_id: clubId,
      created_by: user.id,
      title: "Anamnesis",
      template_type: "anamnesis",
      status: "active",
    })
    .select("id")
    .single();

  if (error || !created) return null;
  return created.id;
}

// ─── Add question ─────────────────────────────────────────────────────────────

export async function addQuestion(formData: FormData) {
  const supabase = await createClient();
  const { membership } = await getCurrentMembership();
  if (!membership || (membership.role !== "admin" && membership.role !== "coach")) {
    return { error: "Sin permisos" };
  }

  const formId                  = formData.get("form_id") as string;
  const questionText            = formData.get("question_text") as string;
  const type                    = formData.get("type") as "text" | "scale" | "multiple_choice" | "yes_no" | "one_rm";
  const required                = formData.get("required") === "true";
  const optionsRaw              = formData.get("options") as string | null;
  const dependsOnQuestionId     = formData.get("depends_on_question_id") as string | null;
  const dependsOnAnswer         = formData.get("depends_on_answer") as "si" | "no" | null;

  if (!formId || !questionText?.trim() || !type) {
    return { error: "Datos incompletos" };
  }

  // Get current max order_index
  const { data: existing } = await supabase
    .from("club_form_questions")
    .select("order_index")
    .eq("form_id", formId)
    .order("order_index", { ascending: false })
    .limit(1);

  const nextIndex = existing && existing.length > 0 ? (existing[0].order_index + 1) : 0;

  const options = optionsRaw ? JSON.parse(optionsRaw) : null;

  const { error } = await supabase.from("club_form_questions").insert({
    form_id: formId,
    question_text: questionText.trim(),
    type,
    required,
    options,
    order_index: nextIndex,
    depends_on_question_id: dependsOnQuestionId || null,
    depends_on_answer: dependsOnAnswer || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/anamnesis");
  return { error: null };
}

// ─── Update question ──────────────────────────────────────────────────────────

export async function updateQuestion(formData: FormData) {
  const supabase = await createClient();
  const { membership } = await getCurrentMembership();
  if (!membership || (membership.role !== "admin" && membership.role !== "coach")) {
    return { error: "Sin permisos" };
  }

  const questionId              = formData.get("question_id") as string;
  const questionText            = formData.get("question_text") as string;
  const type                    = formData.get("type") as "text" | "scale" | "multiple_choice" | "yes_no" | "one_rm";
  const required                = formData.get("required") === "true";
  const optionsRaw              = formData.get("options") as string | null;
  const dependsOnQuestionId     = formData.get("depends_on_question_id") as string | null;
  const dependsOnAnswer         = formData.get("depends_on_answer") as "si" | "no" | null;

  if (!questionId || !questionText?.trim()) return { error: "Datos incompletos" };

  const options = optionsRaw ? JSON.parse(optionsRaw) : null;

  const { error } = await supabase
    .from("club_form_questions")
    .update({
      question_text: questionText.trim(),
      type,
      required,
      options,
      depends_on_question_id: dependsOnQuestionId || null,
      depends_on_answer: dependsOnAnswer || null,
    })
    .eq("id", questionId);

  if (error) return { error: error.message };

  revalidatePath("/anamnesis");
  return { error: null };
}

// ─── Delete question ──────────────────────────────────────────────────────────

export async function deleteQuestion(questionId: string) {
  const supabase = await createClient();
  const { membership } = await getCurrentMembership();
  if (!membership || (membership.role !== "admin" && membership.role !== "coach")) {
    return { error: "Sin permisos" };
  }

  const { error } = await supabase
    .from("club_form_questions")
    .delete()
    .eq("id", questionId);

  if (error) return { error: error.message };

  revalidatePath("/anamnesis");
  return { error: null };
}

// ─── Reorder question (swap with neighbour) ───────────────────────────────────

export async function swapQuestionOrder(
  questionId: string,
  currentIndex: number,
  targetIndex: number,
  formId: string,
) {
  const supabase = await createClient();
  const { membership } = await getCurrentMembership();
  if (!membership || (membership.role !== "admin" && membership.role !== "coach")) {
    return { error: "Sin permisos" };
  }

  // Find the question at targetIndex
  const { data: target } = await supabase
    .from("club_form_questions")
    .select("id, order_index")
    .eq("form_id", formId)
    .eq("order_index", targetIndex)
    .maybeSingle();

  if (!target) return { error: "Pregunta destino no encontrada" };

  // Swap order_index values
  const { error: e1 } = await supabase
    .from("club_form_questions")
    .update({ order_index: targetIndex })
    .eq("id", questionId);

  const { error: e2 } = await supabase
    .from("club_form_questions")
    .update({ order_index: currentIndex })
    .eq("id", target.id);

  if (e1 || e2) return { error: "Error al reordenar" };

  revalidatePath("/anamnesis");
  return { error: null };
}

// ─── Toggle required ──────────────────────────────────────────────────────────

export async function toggleRequired(questionId: string, required: boolean) {
  const supabase = await createClient();
  const { membership } = await getCurrentMembership();
  if (!membership || (membership.role !== "admin" && membership.role !== "coach")) {
    return { error: "Sin permisos" };
  }

  const { error } = await supabase
    .from("club_form_questions")
    .update({ required })
    .eq("id", questionId);

  if (error) return { error: error.message };

  revalidatePath("/anamnesis");
  return { error: null };
}
