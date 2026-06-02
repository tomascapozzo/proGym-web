import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Topbar from "@/components/dashboard/Topbar";
import FormsListClient from "@/components/forms/FormsListClient";
import type { ClubForm } from "@/types/forms";

export default async function FormsPage() {
  const { user, membership, club } = await getCurrentMembership();
  if (!user) redirect("/auth/login");
  if (!membership || !club) redirect("/club/new");

  const supabase = await createClient();

  const { data: forms } = await supabase
    .from("club_forms")
    .select("id, title, description, status, created_at")
    .eq("club_id", club.id)
    .order("created_at", { ascending: false });

  // Question counts per form
  const formIds = (forms ?? []).map((f) => f.id);
  const { data: questionCounts } = formIds.length
    ? await supabase
        .from("club_form_questions")
        .select("form_id")
        .in("form_id", formIds)
    : { data: [] };

  const countByForm = new Map<string, number>();
  for (const q of questionCounts ?? []) {
    countByForm.set(q.form_id, (countByForm.get(q.form_id) ?? 0) + 1);
  }

  const rows: (ClubForm & { question_count: number })[] = (forms ?? []).map((f) => ({
    ...(f as ClubForm),
    question_count: countByForm.get(f.id) ?? 0,
  }));

  return (
    <>
      <Topbar
        title="Formularios"
        subtitle={`${rows.filter((f) => f.status === "active").length} activos`}
        actions={
          <Link
            href="/forms/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 9,
              background: "var(--pg-accent)",
              color: "var(--pg-accent-text)",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            + Nuevo formulario
          </Link>
        }
      />
      <FormsListClient forms={rows} />
    </>
  );
}
