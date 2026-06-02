-- Migration: add one_rm question type to club_form_questions
-- Run in ../proGym/supabase/migrations/ with a matching timestamp prefix.

ALTER TYPE club_form_question_type ADD VALUE IF NOT EXISTS 'one_rm';
