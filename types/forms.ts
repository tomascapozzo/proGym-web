export type FormStatus = "draft" | "active" | "archived";
export type FormTemplateType = "anamnesis" | "wellness" | null;

export type QuestionType = "text" | "scale" | "multiple_choice" | "yes_no" | "one_rm";

export type QuestionOptions = {
  // multiple_choice
  choices?: string[];
  // scale
  min?: number;
  max?: number;
  min_label?: string;
  max_label?: string;
  // one_rm
  exercise_name?: string;
  exercise_id?: string;
};

export type ClubFormQuestion = {
  id: string;
  form_id: string;
  type: QuestionType;
  question_text: string;
  options: QuestionOptions | null;
  order_index: number;
  required: boolean;
  depends_on_question_id: string | null;
  depends_on_answer: 'si' | 'no' | null;
};

export type ClubForm = {
  id: string;
  club_id: string;
  created_by: string;
  title: string;
  description: string | null;
  status: FormStatus;
  template_type: FormTemplateType;
  created_at: string;
  questions?: ClubFormQuestion[];
};

export type ClubFormSchedule = {
  id: string;
  form_id: string;
  club_id: string;
  target_type: "group" | "player";
  target_id: string;
  days_of_week: number[]; // 0=Sun … 6=Sat
  send_time: string;      // "HH:MM"
  active: boolean;
  created_by: string;
  created_at: string;
};

export type DistributionTargetType = "group" | "player";

export type ClubFormDistribution = {
  id: string;
  form_id: string;
  target_type: DistributionTargetType;
  target_id: string;
  due_at: string | null;
  created_by: string;
  created_at: string;
};

export type ClubFormResponse = {
  id: string;
  distribution_id: string;
  user_id: string;
  submitted_at: string;
  player_name?: string;
};

export type ClubFormAnswer = {
  id: string;
  response_id: string;
  question_id: string;
  answer_text: string | null;
  answer_number: number | null;
  answer_options: string[] | null;
};
