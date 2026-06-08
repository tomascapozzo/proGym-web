import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Topbar from "@/components/dashboard/Topbar";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ClubRole } from "@/types/club";

// Defensive exercise JSON types — the mobile app owns this shape
type ExSet = {
  reps?: number;
  weight?: number;
  weight_kg?: number;
  duration_seconds?: number;
  completed?: boolean;
};
type ExEntry = {
  name?: string;
  exercise_name?: string;
  sets?: ExSet[];
  completed_sets?: ExSet[];
};

function parseExercises(raw: unknown): ExEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw as ExEntry[];
}

function formatSet(s: ExSet): string | null {
  const weight = s.weight ?? s.weight_kg;
  if (s.reps && weight) return `${s.reps}×${weight}kg`;
  if (s.reps) return `${s.reps} reps`;
  if (s.duration_seconds) return `${Math.round(s.duration_seconds / 60)}min`;
  return null;
}

function calcExerciseVolume(sets: ExSet[]): number {
  return sets.reduce((acc, s) => {
    const w = s.weight ?? s.weight_kg ?? 0;
    return acc + (s.reps ?? 0) * w;
  }, 0);
}

function calcSessionVolume(exercises: ExEntry[]): number {
  return exercises.reduce((acc, ex) => {
    const sets = ex.sets ?? ex.completed_sets ?? [];
    return acc + calcExerciseVolume(sets);
  }, 0);
}

function SetChip({ s }: { s: ExSet }) {
  const weight = s.weight ?? s.weight_kg;
  const completed = s.completed !== false; // treat undefined as completed
  let label = "";
  if (s.reps && weight) label = `${s.reps}×${weight}kg`;
  else if (s.reps) label = `${s.reps}`;
  else if (s.duration_seconds) label = `${Math.round(s.duration_seconds / 60)}′`;
  else label = "—";

  return (
    <span style={{
      display: "inline-block",
      fontSize: 10,
      fontWeight: 600,
      padding: "2px 7px",
      borderRadius: 4,
      background: completed ? "rgba(212,168,83,0.12)" : "rgba(255,255,255,0.05)",
      color: completed ? "var(--pg-accent)" : "var(--pg-disabled)",
      fontVariantNumeric: "tabular-nums",
      letterSpacing: "0.2px",
      border: completed ? "1px solid rgba(212,168,83,0.25)" : "1px solid rgba(255,255,255,0.07)",
      textDecoration: completed ? "none" : "line-through",
    }}>
      {label}
    </span>
  );
}

const ROLE_LABEL: Record<ClubRole, string> = { admin: "Admin", coach: "Coach", player: "Jugador" };
const ROLE_COLOR: Record<ClubRole, { bg: string; fg: string }> = {
  admin:  { bg: "var(--pg-red-bg)",    fg: "var(--pg-red)"    },
  coach:  { bg: "var(--pg-blue-bg)",   fg: "var(--pg-blue)"   },
  player: { bg: "var(--pg-accent-bg)", fg: "var(--pg-accent)" },
};

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function formatDuration(s: number) {
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;
  return `Hace ${Math.floor(days / 30)} meses`;
}

function getMonday() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function TeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { user, membership, club } = await getCurrentMembership();
  if (!user) redirect("/auth/login");
  if (!membership || !club) redirect("/club/new");

  const supabase = await createClient();

  // Member must belong to the same club
  const { data: memberRaw } = await supabase
    .from("club_members")
    .select("id, user_id, role, status, joined_at, profile:profiles(name, lastname)")
    .eq("id", id)
    .eq("club_id", club.id)
    .single();

  if (!memberRaw) notFound();

  const member = memberRaw as unknown as {
    id: string;
    user_id: string;
    role: ClubRole;
    status: string;
    joined_at: string;
    profile: { name: string; lastname: string } | null;
  };

  const name = [member.profile?.name, member.profile?.lastname].filter(Boolean).join(" ") || "Sin nombre";

  // Groups this member belongs to (within this club only)
  const { data: gmRaw } = await supabase
    .from("club_group_members")
    .select("group:club_groups(id, name, club_id)")
    .eq("user_id", member.user_id);

  const groups = ((gmRaw ?? []) as unknown as { group: { id: string; name: string; club_id: string } | null }[])
    .map(g => g.group)
    .filter(g => g && g.club_id === club.id) as { id: string; name: string }[];

  // Total session count (accurate, no data fetched)
  const { count: totalCount } = await supabase
    .from("workout_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", member.user_id);

  // Last 50 sessions for the history list
  const { data: logsRaw } = await supabase
    .from("workout_logs")
    .select("id, created_at, duration_seconds, routine_day_name, notes, exercises")
    .eq("user_id", member.user_id)
    .order("created_at", { ascending: false })
    .limit(50);

  const logs = logsRaw ?? [];

  // 1RM answers from form responses
  const { data: oneRmRaw } = await supabase
    .from("club_form_answers")
    .select(`
      answer_number,
      question:club_form_questions(options, type),
      response:club_form_responses(submitted_at)
    `)
    .eq("club_form_responses.user_id", member.user_id)
    .not("answer_number", "is", null);

  type OneRmRow = {
    answer_number: number;
    question: { options: { exercise_name?: string } | null; type: string } | null;
    response: { submitted_at: string } | null;
  };

  // Keep only one_rm type questions, one entry per exercise (most recent)
  const oneRmMap = new Map<string, { weight: number; submitted_at: string }>();
  for (const row of ((oneRmRaw ?? []) as unknown as OneRmRow[])) {
    if (row.question?.type !== "one_rm") continue;
    const exName = row.question.options?.exercise_name;
    if (!exName || row.answer_number == null) continue;
    const existing = oneRmMap.get(exName);
    const submittedAt = row.response?.submitted_at ?? "";
    if (!existing || submittedAt > existing.submitted_at) {
      oneRmMap.set(exName, { weight: row.answer_number, submitted_at: submittedAt });
    }
  }
  const oneRmEntries = Array.from(oneRmMap.entries()).map(([exercise, data]) => ({ exercise, ...data }));

  const weekStart = getMonday();
  const sessionsThisWeek = logs.filter(l => new Date(l.created_at) >= weekStart).length;
  const logsWithDuration = logs.filter(l => l.duration_seconds);
  const avgDuration = logsWithDuration.length > 0
    ? logsWithDuration.reduce((acc, l) => acc + (l.duration_seconds ?? 0), 0) / logsWithDuration.length
    : 0;

  return (
    <>
      <Topbar
        title={name}
        subtitle="Perfil del jugador"
        actions={
          <Link
            href="/team"
            style={{ fontSize: 11, color: "var(--pg-muted)", textDecoration: "none" }}
          >
            ← Volver al equipo
          </Link>
        }
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Player header card */}
        <div style={{ background: "var(--pg-card)", border: "1px solid var(--pg-border)", borderRadius: 8, padding: 16 }}>

          {/* Identity row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--pg-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "var(--pg-muted)", flexShrink: 0 }}>
              {initials(name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--pg-text)", marginBottom: 3 }}>{name}</div>
              <div style={{ fontSize: 11, color: "var(--pg-muted)" }}>
                {member.profile?.lastname || "—"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: ROLE_COLOR[member.role].bg, color: ROLE_COLOR[member.role].fg, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {ROLE_LABEL[member.role]}
              </span>
              <span style={{ fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: member.status === "suspended" ? "var(--pg-amber-bg)" : "var(--pg-green-bg)", color: member.status === "suspended" ? "var(--pg-amber)" : "var(--pg-green)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {member.status === "suspended" ? "Suspendido" : "Activo"}
              </span>
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: groups.length > 0 ? 14 : 0 }}>
            {[
              { label: "Sesiones totales", value: (totalCount ?? 0).toString() },
              { label: "Esta semana",      value: sessionsThisWeek.toString() },
              { label: "Duración prom.",   value: avgDuration > 0 ? formatDuration(Math.round(avgDuration)) : "—" },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--pg-surface)", borderRadius: 6, padding: "10px 12px" }}>
                <div style={{ fontSize: 8, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--pg-muted)", marginBottom: 4, fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--pg-accent)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Groups */}
          {groups.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 9, letterSpacing: "1px", textTransform: "uppercase", color: "var(--pg-muted)", fontWeight: 500, flexShrink: 0 }}>Planteles:</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {groups.map(g => (
                  <Link key={g.id} href={`/squads/${g.id}`} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "var(--pg-surface)", color: "var(--pg-muted)", textDecoration: "none" }}>
                    {g.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 1RM */}
        {oneRmEntries.length > 0 && (
          <div style={{ background: "var(--pg-card)", border: "1px solid var(--pg-border)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--pg-border)" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--pg-text)" }}>1RM</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 1, background: "var(--pg-border)" }}>
              {oneRmEntries.map(({ exercise, weight, submitted_at }) => (
                <div key={exercise} style={{ background: "var(--pg-card)", padding: "12px 14px" }}>
                  <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "1px", color: "var(--pg-muted)", marginBottom: 4 }}>
                    {exercise}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--pg-accent)", fontVariantNumeric: "tabular-nums" }}>
                    {weight}<span style={{ fontSize: 12, fontWeight: 500, color: "var(--pg-muted)", marginLeft: 2 }}>kg</span>
                  </div>
                  <div style={{ fontSize: 9, color: "var(--pg-disabled)", marginTop: 4 }}>
                    {new Date(submitted_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Session history */}
        <div style={{ background: "var(--pg-card)", border: "1px solid var(--pg-border)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--pg-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--pg-text)" }}>Historial de sesiones</span>
            <span style={{ fontSize: 10, color: "var(--pg-muted)" }}>
              {(totalCount ?? 0) > 50 ? "Últimas 50 sesiones" : `${totalCount ?? 0} en total`}
            </span>
          </div>

          {logs.length === 0 ? (
            <div style={{ padding: 28, textAlign: "center", fontSize: 12, color: "var(--pg-muted)" }}>
              Este jugador aún no registró sesiones.
            </div>
          ) : (
            logs.map((log, i) => {
              const exercises = parseExercises(log.exercises);
              const isLast = i === logs.length - 1;
              return (
                <div
                  key={log.id}
                  style={{ padding: "14px 16px", borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)" }}
                >
                  {/* Session header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: (exercises.length > 0 || log.notes) ? 10 : 0 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--pg-text)", marginBottom: 3 }}>
                        {log.routine_day_name || "Sesión libre"}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--pg-muted)" }}>
                        {formatRelative(log.created_at)} · {formatDate(log.created_at)} · {formatTime(log.created_at)}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      {exercises.length > 0 && (
                        <span style={{ fontSize: 9, color: "var(--pg-disabled)" }}>
                          {exercises.length} ejercicio{exercises.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      {(() => {
                        const vol = calcSessionVolume(exercises);
                        return vol > 0 ? (
                          <span style={{ fontSize: 9, color: "var(--pg-muted)", fontVariantNumeric: "tabular-nums" }}>
                            {vol.toLocaleString("es-AR")} kg
                          </span>
                        ) : null;
                      })()}
                      {log.duration_seconds && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--pg-accent)", fontVariantNumeric: "tabular-nums" }}>
                          {formatDuration(log.duration_seconds)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {log.notes && (
                    <div style={{ fontSize: 11, color: "var(--pg-muted)", fontStyle: "italic", marginBottom: exercises.length > 0 ? 8 : 0, padding: "6px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 5, borderLeft: "2px solid var(--pg-border2)" }}>
                      {log.notes}
                    </div>
                  )}

                  {/* Exercise list */}
                  {exercises.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {exercises.map((ex, j) => {
                        const exName = ex.name || ex.exercise_name || `Ejercicio ${j + 1}`;
                        const sets = ex.sets ?? ex.completed_sets ?? [];
                        const completedSets = sets.filter(s => s.completed !== false);
                        const volume = calcExerciseVolume(sets);
                        return (
                          <div key={j} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 6 }}>
                            {/* Exercise name + meta */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--pg-text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {exName}
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                                {sets.length > 0 && (
                                  <span style={{ fontSize: 9, color: completedSets.length === sets.length ? "var(--pg-green)" : "var(--pg-amber)", letterSpacing: "0.3px" }}>
                                    {completedSets.length}/{sets.length} series
                                  </span>
                                )}
                                {volume > 0 && (
                                  <span style={{ fontSize: 9, color: "var(--pg-muted)", letterSpacing: "0.3px" }}>
                                    {volume.toLocaleString("es-AR")} kg vol.
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Set chips */}
                            {sets.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {sets.map((s, k) => <SetChip key={k} s={s} />)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </>
  );
}
