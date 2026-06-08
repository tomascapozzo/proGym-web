import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Squad, SquadColor, CalendarEvent, CalendarEventRecurrence, ClubPeriod, PeriodType } from "@/types";
import CalendarClient from "@/components/calendar/CalendarClient";

const FALLBACK_COLORS: SquadColor[] = [
  "green", "blue", "amber", "purple", "pink", "orange", "teal", "red",
];

export default async function CalendarPage() {
  const { user, membership, club } = await getCurrentMembership();
  if (!user) redirect("/auth/login");
  if (!membership || !club) redirect("/club/new");

  const supabase = await createClient();

  const [{ data: groupsRaw }, { data: eventsRaw }, { data: periodsRaw }] = await Promise.all([
    supabase
      .from("club_groups")
      .select("id, name, description, color")
      .eq("club_id", club.id)
      .eq("kind", "squad")
      .order("created_at"),
    supabase
      .from("club_events")
      .select("*")
      .eq("club_id", club.id)
      .order("starts_at"),
    supabase
      .from("club_periods")
      .select("*")
      .eq("club_id", club.id)
      .order("start_date"),
  ]);

  const squads: Squad[] = (groupsRaw ?? []).map((g, i) => ({
    id: g.id,
    name: g.name,
    color: (g.color as SquadColor) ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    description: g.description,
    memberCount: 0,
  }));

  const events: CalendarEvent[] = (eventsRaw ?? []).map(e => ({
    id: e.id,
    type: e.type as "entrenamiento" | "partido",
    title: e.title,
    description: e.description,
    startsAt: e.starts_at,
    endsAt: e.ends_at,
    opponent: e.opponent,
    location: e.location as "local" | "visitante" | null,
    groupIds: (e.group_ids as string[]) ?? [],
    recurrence: (e.recurrence as CalendarEventRecurrence | null) ?? null,
  }));

  const periods: ClubPeriod[] = (periodsRaw ?? []).map(p => ({
    id: p.id,
    name: p.name,
    type: p.type as PeriodType,
    startDate: p.start_date,
    endDate: p.end_date,
    color: p.color as SquadColor,
  }));

  return <CalendarClient initialEvents={events} squads={squads} initialPeriods={periods} />;
}
