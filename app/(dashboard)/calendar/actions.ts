"use server";

import { createClient } from "@/lib/supabase/server";
import { CalendarEvent, CalendarEventRecurrence, ClubPeriod, PeriodType, SquadColor } from "@/types";

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
    return { error: "Solo el staff puede gestionar eventos." as const };
  }

  return { supabase, user, clubId: membership.club_id };
}

function rowToEvent(row: {
  id: string;
  type: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  opponent: string | null;
  location: string | null;
  group_ids: string[];
  recurrence: unknown;
}): CalendarEvent {
  return {
    id: row.id,
    type: row.type as "entrenamiento" | "partido",
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    opponent: row.opponent,
    location: row.location as "local" | "visitante" | null,
    groupIds: row.group_ids ?? [],
    recurrence: (row.recurrence as CalendarEventRecurrence | null) ?? null,
  };
}

export async function createEvent(
  data: Omit<CalendarEvent, "id">,
): Promise<{ event: CalendarEvent } | { error: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { error: ctx.error as string };

  const { supabase, user, clubId } = ctx;
  const { data: row, error } = await supabase
    .from("club_events")
    .insert({
      club_id: clubId as string,
      created_by: user.id,
      type: data.type,
      title: data.title,
      description: data.description,
      starts_at: data.startsAt,
      ends_at: data.endsAt,
      opponent: data.opponent,
      location: data.location,
      group_ids: data.groupIds,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recurrence: data.recurrence as any,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { event: rowToEvent(row) };
}

export async function updateEvent(
  id: string,
  data: Omit<CalendarEvent, "id">,
): Promise<{ event: CalendarEvent } | { error: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { error: ctx.error as string };

  const { supabase } = ctx;
  const { data: row, error } = await supabase
    .from("club_events")
    .update({
      type: data.type,
      title: data.title,
      description: data.description,
      starts_at: data.startsAt,
      ends_at: data.endsAt,
      opponent: data.opponent,
      location: data.location,
      group_ids: data.groupIds,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recurrence: data.recurrence as any,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { event: rowToEvent(row) };
}

export async function deleteEvent(
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { error: ctx.error as string };

  const { supabase } = ctx;
  const { error } = await supabase
    .from("club_events")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  return { ok: true };
}

// ── Bulk match import ─────────────────────────────────────────────────────────

export interface MatchImportRow {
  date: string;        // YYYY-MM-DD
  opponent: string;
  location: "local" | "visitante";
  groupIds: string[];
  description?: string | null;
}

export async function bulkCreateMatches(
  rows: MatchImportRow[],
): Promise<{ count: number } | { error: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { error: ctx.error as string };

  const { supabase, user, clubId } = ctx;

  const inserts = rows
    .filter(r => r.date && r.opponent.trim())
    .map(r => ({
      club_id: clubId as string,
      created_by: user.id,
      type: "partido" as const,
      title: `vs ${r.opponent.trim()}`,
      description: r.description ?? null,
      // Store at noon UTC to avoid timezone date-shift issues
      starts_at: `${r.date}T12:00:00.000Z`,
      ends_at: null,
      opponent: r.opponent.trim(),
      location: r.location,
      group_ids: r.groupIds,
      recurrence: null,
    }));

  if (inserts.length === 0) return { error: "Sin partidos válidos para importar." };

  const { error } = await supabase.from("club_events").insert(inserts);
  if (error) return { error: error.message };
  return { count: inserts.length };
}

// ── Period CRUD ───────────────────────────────────────────────────────────────

function rowToPeriod(row: {
  id: string;
  name: string;
  type: string;
  start_date: string;
  end_date: string;
  color: string;
}): ClubPeriod {
  return {
    id: row.id,
    name: row.name,
    type: row.type as PeriodType,
    startDate: row.start_date,
    endDate: row.end_date,
    color: row.color as SquadColor,
  };
}

export async function createPeriod(data: {
  name: string;
  type: PeriodType;
  startDate: string;
  endDate: string;
  color: SquadColor;
}): Promise<{ period: ClubPeriod } | { error: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { error: ctx.error as string };

  const { supabase, user, clubId } = ctx;
  const { data: row, error } = await supabase
    .from("club_periods")
    .insert({
      club_id: clubId as string,
      created_by: user.id,
      name: data.name,
      type: data.type,
      start_date: data.startDate,
      end_date: data.endDate,
      color: data.color,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { period: rowToPeriod(row) };
}

export async function updatePeriod(
  id: string,
  data: { name: string; type: PeriodType; startDate: string; endDate: string; color: SquadColor },
): Promise<{ period: ClubPeriod } | { error: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { error: ctx.error as string };

  const { supabase } = ctx;
  const { data: row, error } = await supabase
    .from("club_periods")
    .update({
      name: data.name,
      type: data.type,
      start_date: data.startDate,
      end_date: data.endDate,
      color: data.color,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { period: rowToPeriod(row) };
}

export async function deletePeriod(
  id: string,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await getStaffContext();
  if ("error" in ctx) return { error: ctx.error as string };

  const { supabase } = ctx;
  const { error } = await supabase.from("club_periods").delete().eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}
