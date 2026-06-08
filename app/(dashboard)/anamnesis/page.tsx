import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Topbar from "@/components/dashboard/Topbar";
import AnamnesisEditor from "@/components/anamnesis/AnamnesisEditor";
import type { ClubForm, ClubFormQuestion } from "@/types/forms";
import { ensureAnamnesisForm } from "./actions";

export default async function AnamnesisPage() {
  const { user, membership, club } = await getCurrentMembership();
  if (!user) redirect("/auth/login");
  if (!membership || !club) redirect("/club/new");

  const isStaff = membership.role === "admin" || membership.role === "coach";

  const supabase = await createClient();

  // Auto-create the anamnesis form if it doesn't exist yet
  const formId = await ensureAnamnesisForm(club.id);

  let form: ClubForm | null = null;
  let questions: ClubFormQuestion[] = [];

  if (formId) {
    const { data: formRaw } = await supabase
      .from("club_forms")
      .select("*")
      .eq("id", formId)
      .single();

    form = formRaw as ClubForm | null;

    const { data: qsRaw } = await supabase
      .from("club_form_questions")
      .select("*")
      .eq("form_id", formId)
      .order("order_index");

    questions = (qsRaw ?? []) as unknown as ClubFormQuestion[];
  }

  return (
    <>
      <Topbar
        title="Anamnesis"
        subtitle="Formulario de incorporación de jugadores"
      />
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {form ? (
          <AnamnesisEditor
            form={form}
            questions={questions}
            canEdit={isStaff}
          />
        ) : (
          <div style={{ color: "var(--pg-muted)", fontSize: 13, padding: 24, textAlign: "center" }}>
            No se pudo cargar el formulario.
          </div>
        )}
      </div>
    </>
  );
}
