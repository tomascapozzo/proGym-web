/**
 * wellness-scheduler
 *
 * Runs daily via Supabase cron. Finds all active wellness schedules where
 * today's day of week matches, then creates club_form_distributions for each.
 *
 * Deploy:
 *   supabase functions deploy wellness-scheduler --no-verify-jwt
 *
 * Schedule (in Supabase Dashboard → Edge Functions → Schedules, or via SQL):
 *   select cron.schedule('wellness-daily', '0 6 * * *', $$
 *     select net.http_post(
 *       url := 'https://<project-ref>.supabase.co/functions/v1/wellness-scheduler',
 *       headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
 *     );
 *   $$);
 *
 * Or use the pg_cron + pg_net approach shown above, or schedule it from the
 * Supabase dashboard under Project → Edge Functions → wellness-scheduler → Schedules.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async () => {
  const now = new Date();
  // day_of_week: 0=Sun, 1=Mon, ..., 6=Sat (matches JS getDay())
  const todayDow = now.getDay();

  // Fetch all active schedules where today is in days_of_week
  const { data: schedules, error: schedError } = await supabase
    .from("club_form_schedules")
    .select("id, form_id, club_id, target_type, target_id, days_of_week")
    .eq("active", true)
    .contains("days_of_week", [todayDow]);

  if (schedError) {
    console.error("Error fetching schedules:", schedError);
    return new Response(JSON.stringify({ error: schedError.message }), { status: 500 });
  }

  if (!schedules || schedules.length === 0) {
    return new Response(JSON.stringify({ distributed: 0 }), { status: 200 });
  }

  // Build today's date string for dedup check (one distribution per form+target per day)
  const todayStr = now.toISOString().slice(0, 10); // "YYYY-MM-DD"

  let distributed = 0;
  const errors: string[] = [];

  for (const schedule of schedules) {
    // Check if a distribution for this form+target already exists today
    const { data: existing } = await supabase
      .from("club_form_distributions")
      .select("id")
      .eq("form_id", schedule.form_id)
      .eq("target_type", schedule.target_type)
      .eq("target_id", schedule.target_id)
      .gte("created_at", `${todayStr}T00:00:00Z`)
      .lt("created_at", `${todayStr}T23:59:59Z`)
      .maybeSingle();

    if (existing) continue; // already distributed today

    const { error: distError } = await supabase
      .from("club_form_distributions")
      .insert({
        form_id: schedule.form_id,
        target_type: schedule.target_type,
        target_id: schedule.target_id,
        due_at: null,
        created_by: null, // system-generated
      });

    if (distError) {
      errors.push(`schedule ${schedule.id}: ${distError.message}`);
    } else {
      distributed++;
    }
  }

  console.log(`wellness-scheduler: distributed=${distributed}, errors=${errors.length}`);

  return new Response(
    JSON.stringify({ distributed, errors }),
    { status: errors.length > 0 ? 207 : 200, headers: { "Content-Type": "application/json" } },
  );
});
