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
  status: string;
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
    .select("id, user_id, data, type, status")
    .in("user_id", staffIds.length ? staffIds : [PLACEHOLDER])
    .order("created_at", { ascending: false });

  const routines: RoutineRow[] = ((rawRoutines ?? []) as unknown as RawRoutine[]).map((r) => {
    const parsed = parseData(r.data);
    const dias = parsed?.dias ?? [];
    return {
      id:             r.id,
      name:           parsed?.nombre || "Sin nombre",
      type:           (r.type as RoutineRow["type"]) || "daily",
      status:         (r.status as RoutineRow["status"]) || "active",
      daysCount:      dias.length,
      exercisesCount: countExercises(dias),
      ownerName:      nameByUserId.get(r.user_id) ?? "—",
    };
  });

  return (
    <>
      <Topbar
        title="Rutinas"
        subtitle={`${routines.filter(r => r.status === "active").length} activas`}
      />
      <RoutinesTable routines={routines} clubId={club.id} />
    </>
  );
}
