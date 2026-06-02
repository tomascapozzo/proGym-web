-- Migration: club_custom_exercises + exercises_combined view
-- Place this file in ../proGym/supabase/migrations/ with a matching timestamp prefix.

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS club_custom_exercises (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          uuid NOT NULL, -- references clubs(id); FK omitted to avoid dependency ordering issues
  created_by       uuid NOT NULL REFERENCES auth.users(id),
  name             text NOT NULL,
  muscle_group     text NOT NULL DEFAULT '',
  movement_pattern text NOT NULL DEFAULT '',
  equipment        text NOT NULL DEFAULT '',
  description      text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE club_custom_exercises ENABLE ROW LEVEL SECURITY;

-- Club members can read their club's custom exercises
CREATE POLICY "club members can read custom exercises"
  ON club_custom_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_custom_exercises.club_id
        AND club_members.user_id = auth.uid()
        AND club_members.status = 'active'
    )
  );

-- Only staff (admin/coach) can insert
CREATE POLICY "club staff can insert custom exercises"
  ON club_custom_exercises FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_custom_exercises.club_id
        AND club_members.user_id = auth.uid()
        AND club_members.role IN ('admin', 'coach')
        AND club_members.status = 'active'
    )
  );

-- Staff can update
CREATE POLICY "club staff can update custom exercises"
  ON club_custom_exercises FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_custom_exercises.club_id
        AND club_members.user_id = auth.uid()
        AND club_members.role IN ('admin', 'coach')
        AND club_members.status = 'active'
    )
  );

-- Staff can delete
CREATE POLICY "club staff can delete custom exercises"
  ON club_custom_exercises FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_custom_exercises.club_id
        AND club_members.user_id = auth.uid()
        AND club_members.role IN ('admin', 'coach')
        AND club_members.status = 'active'
    )
  );

-- ─── View: exercises_combined ─────────────────────────────────────────────────
-- Unions the global library with each club's custom exercises.
-- `source` distinguishes origin; `club_id` is NULL for global exercises.

CREATE OR REPLACE VIEW exercises_combined AS
  SELECT
    id,
    name,
    muscle_group,
    movement_pattern,
    equipment,
    'global'::text  AS source,
    NULL::uuid      AS club_id
  FROM exercises

  UNION ALL

  SELECT
    id,
    name,
    muscle_group,
    movement_pattern,
    equipment,
    'custom'::text  AS source,
    club_id
  FROM club_custom_exercises;
