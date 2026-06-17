import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Topbar from "@/components/dashboard/Topbar";
import RoutinesTable from "@/components/routines/RoutinesTable";
import type { RoutineRow } from "@/components/routines/RoutinesTable";

type ParsedData = { nombre?: string; dias?: unknown[] };

type RawRoutine = {
  id: string;
  user_id: string;
  data: ParsedData | string | null;
  type: string;
};

type RawDay = {
  ejercicios?: unknown[];
  circuitos?: Array<{ ejercicios?: unknown[] }>;
};

function parseData(raw: ParsedData | string | null): ParsedData | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as ParsedData; } catch { return null; }
  }
  return raw;
}

function countExercises(dias: unknown[]): number {
  return (dias as RawDay[]).reduce((sum, d) => {
    const direct = d.ejercicios?.length ?? 0;
    const inCircuits = d.circuitos?.reduce((cs, c) => cs + (c.ejercicios?.length ?? 0), 0) ?? 0;
    return sum + direct + inCircuits;
  }, 0);
}

export default async function RoutinesPage() {
  const { user, membership, club } = await getCurrentMembership();
  if (!user) redirect("/auth/login");
  if (!membership || !club) redirect("/club/new");

  const supabase = await createClient();

  // Staff members (admins + coaches) with their profile names
  const { data: staffRaw } = await supabase
    .from("club_members")
    .select("user_id, profile:profiles(name)")
    .eq("club_id", club.id)
    .in("role", ["admin", "coach"]);

  type MemberRef = { user_id: string; profile: { name: string } | null };
  const staff = (staffRaw ?? []) as unknown as MemberRef[];
  const staffIds = staff.map(m => m.user_id);
  const nameByUserId = new Map(staff.map(m => [m.user_id, m.profile?.name || "—"]));

  // Coach-created templates only (owned by staff, not player copies)
  const PLACEHOLDER = "00000000-0000-0000-0000-000000000000";
  const { data: rawRoutines } = await supabase
    .from("routines")
    .select("id, user_id, data, type")
    .in("user_id", staffIds.length ? staffIds : [PLACEHOLDER])
    .order("created_at", { ascending: false });

  // Active/scheduled shares per routine — determines "shared" status in the UI
  const routineIds = (rawRoutines ?? []).map(r => r.id);
  const { data: sharesRaw } = routineIds.length
    ? await supabase
        .from("routine_shares")
        .select("routine_id, status")
        .in("routine_id", routineIds)
        .in("status", ["active", "scheduled"])
    : { data: [] };

  // Build a map: routineId → highest-priority share status
  const shareStatusById = new Map<string, "active" | "scheduled">();
  for (const s of sharesRaw ?? []) {
    const current = shareStatusById.get(s.routine_id);
    // active > scheduled
    if (!current || (current === "scheduled" && s.status === "active")) {
      shareStatusById.set(s.routine_id, s.status as "active" | "scheduled");
    }
  }

  const routines: RoutineRow[] = ((rawRoutines ?? []) as unknown as RawRoutine[]).map((r) => {
    const parsed = parseData(r.data);
    const dias = parsed?.dias ?? [];
    return {
      id:             r.id,
      name:           parsed?.nombre || "Sin nombre",
      type:           (r.type as RoutineRow["type"]) || "daily",
      shareStatus:    shareStatusById.get(r.id) ?? "none",
      daysCount:      dias.length,
      exercisesCount: countExercises(dias),
      ownerName:      nameByUserId.get(r.user_id) ?? "—",
    };
  });

  const sharedCount = routines.filter(r => r.shareStatus === "active" || r.shareStatus === "scheduled").length;

  return (
    <>
      <Topbar
        title="Rutinas"
        subtitle={`${sharedCount} compartidas`}
      />
      <RoutinesTable routines={routines} clubId={club.id} />
    </>
  );
}
