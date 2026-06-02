import { notFound, redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Topbar from "@/components/dashboard/Topbar";
import FormBuilderClient from "@/components/forms/FormBuilderClient";
import type { ClubForm, ClubFormQuestion, ClubFormDistribution, ClubFormSchedule } from "@/types/forms";

export default async function FormDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, membership, club } = await getCurrentMembership();
  if (!user) redirect("/auth/login");
  if (!membership || !club) redirect("/club/new");

  const supabase = await createClient();

  const [{ data: form }, { data: questions }, { data: distributions }, { data: schedules }] = await Promise.all([
    supabase.from("club_forms").select("*").eq("id", id).eq("club_id", club.id).single(),
    supabase.from("club_form_questions").select("*").eq("form_id", id).order("order_index"),
    supabase.from("club_form_distributions").select("*").eq("form_id", id).order("created_at"),
    supabase.from("club_form_schedules").select("*").eq("form_id", id).order("created_at"),
  ]);

  if (!form) notFound();

  // Groups and players for distribution picker
  const { data: groups } = await supabase
    .from("club_groups")
    .select("id, name")
    .eq("club_id", club.id)
    .order("name");

  const { data: players } = await supabase
    .from("club_members")
    .select("user_id, profile:profiles(name)")
    .eq("club_id", club.id)
    .eq("role", "player")
    .eq("status", "active");

  type PlayerRow = { user_id: string; profile: { name: string } | null };

  return (
    <>
      <Topbar title={form.title} subtitle="Editor de formulario" />
      <FormBuilderClient
        clubId={club.id}
        form={form as ClubForm}
        questions={(questions ?? []) as ClubFormQuestion[]}
        groups={(groups ?? []) as { id: string; name: string }[]}
        players={((players ?? []) as unknown as PlayerRow[]).map((p) => ({
          id: p.user_id,
          name: p.profile?.name ?? "—",
        }))}
        distributions={(distributions ?? []) as ClubFormDistribution[]}
        schedules={(schedules ?? []) as ClubFormSchedule[]}
      />
    </>
  );
}
