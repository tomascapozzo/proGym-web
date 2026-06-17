/**
 * routine-share-scheduler
 *
 * Runs every 15 minutes via Supabase cron. Handles two jobs:
 *
 *  1. ACTIVATE — finds 'scheduled' shares where starts_at <= now(),
 *     enrolls their target players (replacing any existing club routine),
 *     and sets status → 'active'.
 *
 *  2. EXPIRE — finds 'active' shares where ends_at <= now(),
 *     sets status → 'expired'. Enrollments are NOT touched (soft deadline:
 *     the mobile app shows a badge but the routine stays accessible).
 *
 * Deploy:
 *   supabase functions deploy routine-share-scheduler --no-verify-jwt
 *
 * Schedule (Supabase Dashboard → Edge Functions → Schedules, or via SQL):
 *   select cron.schedule('routine-share-tick', '* /15 * * * *', $$
 *     select net.http_post(
 *       url := 'https://<project-ref>.supabase.co/functions/v1/routine-share-scheduler',
 *       headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
 *     );
 *   $$);
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ─── helpers ──────────────────────────────────────────────────────────────────

async function enrollPlayers(
  routineId: string,
  shareId: string,
  playerIds: string[],
  endsAt: string | null,
) {
  if (playerIds.length === 0) return;

  // Archive existing active club-assigned enrollments for other routines
  await supabase
    .from("routine_enrollments")
    .update({ status: "past" })
    .in("user_id", playerIds)
    .not("source_share_id", "is", null)
    .eq("status", "active")
    .neq("routine_id", routineId);

  await supabase
    .from("routine_enrollments")
    .upsert(
      playerIds.map((userId) => ({
        routine_id: routineId,
        user_id: userId,
        status: "active",
        progress: { completed_days: [] },
        source_share_id: shareId,
        ends_at: endsAt,
      })),
      { onConflict: "routine_id,user_id" },
    );
}

// ─── job 1: activate scheduled shares ────────────────────────────────────────

async function activateScheduledShares(): Promise<{ activated: number; errors: string[] }> {
  const { data: shares, error } = await supabase
    .from("routine_shares")
    .select("id, routine_id, club_id, target_type, target_group_id, target_user_id, ends_at")
    .eq("status", "scheduled")
    .lte("starts_at", new Date().toISOString());

  if (error) return { activated: 0, errors: [error.message] };
  if (!shares || shares.length === 0) return { activated: 0, errors: [] };

  let activated = 0;
  const errors: string[] = [];

  for (const share of shares) {
    try {
      let playerIds: string[] = [];

      if (share.target_type === "group" && share.target_group_id) {
        // Get all active players in the group
        const { data: groupMembers } = await supabase
          .from("club_group_members")
          .select("user_id")
          .eq("group_id", share.target_group_id);

        const groupMemberIds = (groupMembers ?? []).map((m: { user_id: string }) => m.user_id);

        if (groupMemberIds.length > 0) {
          const { data: activePlayers } = await supabase
            .from("club_members")
            .select("user_id")
            .eq("club_id", share.club_id)
            .eq("role", "player")
            .eq("status", "active")
            .in("user_id", groupMemberIds);

          playerIds = (activePlayers ?? []).map((m: { user_id: string }) => m.user_id);
        }
      } else if (share.target_type === "player" && share.target_user_id) {
        playerIds = [share.target_user_id];
      }

      await enrollPlayers(share.routine_id, share.id, playerIds, share.ends_at);

      // Mark the share as active
      await supabase
        .from("routine_shares")
        .update({ status: "active" })
        .eq("id", share.id);

      activated++;
    } catch (err) {
      errors.push(`share ${share.id}: ${String(err)}`);
    }
  }

  return { activated, errors };
}

// ─── job 2: expire active shares past their deadline ─────────────────────────

async function expireActiveShares(): Promise<{ expired: number; error?: string }> {
  const { data, error } = await supabase
    .from("routine_shares")
    .update({ status: "expired" })
    .eq("status", "active")
    .lte("ends_at", new Date().toISOString())
    .not("ends_at", "is", null)
    .select("id");

  if (error) return { expired: 0, error: error.message };
  return { expired: (data ?? []).length };
}

// ─── handler ──────────────────────────────────────────────────────────────────

Deno.serve(async () => {
  const [activateResult, expireResult] = await Promise.all([
    activateScheduledShares(),
    expireActiveShares(),
  ]);

  const hasErrors = activateResult.errors.length > 0 || !!expireResult.error;

  console.log("routine-share-scheduler:", {
    activated: activateResult.activated,
    activateErrors: activateResult.errors,
    expired: expireResult.expired,
    expireError: expireResult.error,
  });

  return new Response(
    JSON.stringify({
      activated: activateResult.activated,
      expired: expireResult.expired,
      errors: [...activateResult.errors, ...(expireResult.error ? [expireResult.error] : [])],
    }),
    {
      status: hasErrors ? 207 : 200,
      headers: { "Content-Type": "application/json" },
    },
  );
});
