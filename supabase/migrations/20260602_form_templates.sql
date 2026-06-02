-- Migration: form templates (anamnesis + wellness) and wellness schedules
-- Place in ../proGym/supabase/migrations/ with a matching timestamp prefix.

-- ─── 0. Extend question type check constraint to include one_rm ──────────────

ALTER TABLE club_form_questions
  DROP CONSTRAINT IF EXISTS club_form_questions_type_check;

ALTER TABLE club_form_questions
  ADD CONSTRAINT club_form_questions_type_check
    CHECK (type IN ('text', 'scale', 'multiple_choice', 'yes_no', 'one_rm'));

-- ─── 1. Missing columns on club_forms ────────────────────────────────────────

ALTER TABLE club_forms
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'archived'));

ALTER TABLE club_forms
  ADD COLUMN IF NOT EXISTS template_type text
    CHECK (template_type IN ('anamnesis', 'wellness'));

-- One anamnesis and one wellness per club
CREATE UNIQUE INDEX IF NOT EXISTS club_forms_club_template_unique
  ON club_forms (club_id, template_type)
  WHERE template_type IS NOT NULL;

-- ─── 2. wellness schedules ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS club_form_schedules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id        uuid NOT NULL REFERENCES club_forms(id) ON DELETE CASCADE,
  club_id        uuid NOT NULL,
  target_type    text NOT NULL CHECK (target_type IN ('group', 'player')),
  target_id      uuid NOT NULL,
  days_of_week   int[] NOT NULL,   -- 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  send_time      time NOT NULL DEFAULT '08:00',
  active         boolean NOT NULL DEFAULT true,
  created_by     uuid NOT NULL REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE club_form_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club staff can manage schedules"
  ON club_form_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = club_form_schedules.club_id
        AND club_members.user_id = auth.uid()
        AND club_members.role IN ('admin', 'coach')
        AND club_members.status = 'active'
    )
  );

-- ─── 3. Seed templates for existing clubs ────────────────────────────────────

INSERT INTO club_forms (club_id, created_by, title, description, status, template_type)
SELECT
  c.id,
  c.created_by,
  'Anamnesis',
  'Formulario inicial para conocer el estado del jugador al ingresar al club.',
  'active',
  'anamnesis'
FROM clubs c
WHERE NOT EXISTS (
  SELECT 1 FROM club_forms cf
  WHERE cf.club_id = c.id AND cf.template_type = 'anamnesis'
)
ON CONFLICT DO NOTHING;

INSERT INTO club_forms (club_id, created_by, title, description, status, template_type)
SELECT
  c.id,
  c.created_by,
  'Wellness',
  'Control de bienestar diario para monitorear el estado del jugador.',
  'active',
  'wellness'
FROM clubs c
WHERE NOT EXISTS (
  SELECT 1 FROM club_forms cf
  WHERE cf.club_id = c.id AND cf.template_type = 'wellness'
)
ON CONFLICT DO NOTHING;

-- ─── 4. Default questions for anamnesis ──────────────────────────────────────

INSERT INTO club_form_questions (form_id, type, question_text, options, order_index, required)
SELECT
  cf.id,
  q.type,
  q.question_text,
  q.options,
  q.order_index,
  q.required
FROM club_forms cf
CROSS JOIN (VALUES
  ('text',    '¿Cuál es tu objetivo principal?',                    NULL::jsonb,                                                         0, true),
  ('yes_no',  '¿Tenés alguna lesión o condición física actual?',    NULL::jsonb,                                                         1, true),
  ('text',    'Si tenés lesiones, describílas brevemente.',         NULL::jsonb,                                                         2, false),
  ('yes_no',  '¿Realizás algún otro deporte o actividad física?',   NULL::jsonb,                                                         3, false),
  ('scale',   '¿Cómo calificás tu nivel de condición física?',      '{"min":1,"max":10,"min_label":"Muy bajo","max_label":"Muy alto"}'::jsonb, 4, true),
  ('one_rm',  '1RM Sentadilla',                                     '{"exercise_name":"Sentadilla"}'::jsonb,                             5, false),
  ('one_rm',  '1RM Press de banca',                                 '{"exercise_name":"Press de banca"}'::jsonb,                        6, false),
  ('one_rm',  '1RM Peso muerto',                                    '{"exercise_name":"Peso muerto"}'::jsonb,                           7, false)
) AS q(type, question_text, options, order_index, required)
WHERE cf.template_type = 'anamnesis'
  AND NOT EXISTS (
    SELECT 1 FROM club_form_questions WHERE form_id = cf.id
  );

-- ─── 5. Default questions for wellness ───────────────────────────────────────

INSERT INTO club_form_questions (form_id, type, question_text, options, order_index, required)
SELECT
  cf.id,
  q.type,
  q.question_text,
  q.options,
  q.order_index,
  q.required
FROM club_forms cf
CROSS JOIN (VALUES
  ('scale', '¿Cómo dormiste anoche?',                    '{"min":1,"max":5,"min_label":"Muy mal","max_label":"Muy bien"}'::jsonb,      0, true),
  ('scale', '¿Cómo está tu nivel de energía hoy?',       '{"min":1,"max":5,"min_label":"Sin energía","max_label":"Lleno de energía"}'::jsonb, 1, true),
  ('scale', '¿Cómo está tu nivel de estrés?',            '{"min":1,"max":5,"min_label":"Muy estresado","max_label":"Muy relajado"}'::jsonb,   2, true),
  ('scale', '¿Sentís dolor muscular o fatiga?',          '{"min":1,"max":5,"min_label":"Mucho dolor","max_label":"Sin dolor"}'::jsonb,  3, true),
  ('scale', '¿Cómo te sentís para entrenar hoy?',        '{"min":1,"max":5,"min_label":"No quiero entrenar","max_label":"Listo para todo"}'::jsonb, 4, true),
  ('text',  'Comentarios adicionales (opcional)',        NULL::jsonb,                                                                   5, false)
) AS q(type, question_text, options, order_index, required)
WHERE cf.template_type = 'wellness'
  AND NOT EXISTS (
    SELECT 1 FROM club_form_questions WHERE form_id = cf.id
  );

-- ─── 6. Trigger: seed templates for new clubs ────────────────────────────────

CREATE OR REPLACE FUNCTION seed_club_form_templates()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  anamnesis_id uuid;
  wellness_id  uuid;
BEGIN
  -- Anamnesis
  INSERT INTO club_forms (club_id, created_by, title, description, status, template_type)
  VALUES (NEW.id, NEW.created_by, 'Anamnesis', 'Formulario inicial para conocer el estado del jugador al ingresar al club.', 'active', 'anamnesis')
  RETURNING id INTO anamnesis_id;

  INSERT INTO club_form_questions (form_id, type, question_text, options, order_index, required) VALUES
    (anamnesis_id, 'text',    '¿Cuál es tu objetivo principal?',                    NULL,                                                                     0, true),
    (anamnesis_id, 'yes_no',  '¿Tenés alguna lesión o condición física actual?',    NULL,                                                                     1, true),
    (anamnesis_id, 'text',    'Si tenés lesiones, describílas brevemente.',         NULL,                                                                     2, false),
    (anamnesis_id, 'yes_no',  '¿Realizás algún otro deporte o actividad física?',   NULL,                                                                     3, false),
    (anamnesis_id, 'scale',   '¿Cómo calificás tu nivel de condición física?',      '{"min":1,"max":10,"min_label":"Muy bajo","max_label":"Muy alto"}',       4, true),
    (anamnesis_id, 'one_rm',  '1RM Sentadilla',                                     '{"exercise_name":"Sentadilla"}',                                        5, false),
    (anamnesis_id, 'one_rm',  '1RM Press de banca',                                 '{"exercise_name":"Press de banca"}',                                    6, false),
    (anamnesis_id, 'one_rm',  '1RM Peso muerto',                                    '{"exercise_name":"Peso muerto"}',                                       7, false);

  -- Wellness
  INSERT INTO club_forms (club_id, created_by, title, description, status, template_type)
  VALUES (NEW.id, NEW.created_by, 'Wellness', 'Control de bienestar diario para monitorear el estado del jugador.', 'active', 'wellness')
  RETURNING id INTO wellness_id;

  INSERT INTO club_form_questions (form_id, type, question_text, options, order_index, required) VALUES
    (wellness_id, 'scale', '¿Cómo dormiste anoche?',                    '{"min":1,"max":5,"min_label":"Muy mal","max_label":"Muy bien"}',             0, true),
    (wellness_id, 'scale', '¿Cómo está tu nivel de energía hoy?',       '{"min":1,"max":5,"min_label":"Sin energía","max_label":"Lleno de energía"}', 1, true),
    (wellness_id, 'scale', '¿Cómo está tu nivel de estrés?',            '{"min":1,"max":5,"min_label":"Muy estresado","max_label":"Muy relajado"}',   2, true),
    (wellness_id, 'scale', '¿Sentís dolor muscular o fatiga?',          '{"min":1,"max":5,"min_label":"Mucho dolor","max_label":"Sin dolor"}',        3, true),
    (wellness_id, 'scale', '¿Cómo te sentís para entrenar hoy?',        '{"min":1,"max":5,"min_label":"No quiero entrenar","max_label":"Listo para todo"}', 4, true),
    (wellness_id, 'text',  'Comentarios adicionales (opcional)',         NULL,                                                                          5, false);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_club_created_seed_forms ON clubs;
CREATE TRIGGER on_club_created_seed_forms
  AFTER INSERT ON clubs
  FOR EACH ROW EXECUTE FUNCTION seed_club_form_templates();
