export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          lastname: string;
          onboarding_completed: boolean;
          lesiones_previas: Json | null;
          gimnasio: string | null;
          position: string | null;
          pr_exercises: string[];
          one_rm: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string;
          lastname?: string;
          onboarding_completed?: boolean;
          lesiones_previas?: Json | null;
          gimnasio?: string | null;
          position?: string | null;
          pr_exercises?: string[];
          one_rm?: Json;
        };
        Update: {
          name?: string;
          lastname?: string;
          onboarding_completed?: boolean;
          lesiones_previas?: Json | null;
          gimnasio?: string | null;
          position?: string | null;
          pr_exercises?: string[];
          one_rm?: Json;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          name: string;
          type: string | null;
          muscle_group: string;
          movement_pattern: string | null;
          equipment: string;
          difficulty: string | null;
          secondary_groups: string | null;
          modalities: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          name: string;
          type?: string | null;
          muscle_group: string;
          movement_pattern?: string | null;
          equipment: string;
          difficulty?: string | null;
          secondary_groups?: string | null;
          modalities?: string | null;
          notes?: string | null;
        };
        Update: {
          name?: string;
          type?: string | null;
          muscle_group?: string;
          movement_pattern?: string | null;
          equipment?: string;
          difficulty?: string | null;
          secondary_groups?: string | null;
          modalities?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      routines: {
        Row: {
          id: string;
          user_id: string;
          data: Json;
          type: string;
          status: string;
          progress: Json;
          created_at: string;
        };
        Insert: {
          user_id: string;
          data?: Json;
          type?: string;
          status?: string;
          progress?: Json;
        };
        Update: {
          user_id?: string;
          data?: Json;
          type?: string;
          status?: string;
          progress?: Json;
        };
        Relationships: [];
      };
      workout_logs: {
        Row: {
          id: string;
          user_id: string;
          notes: string | null;
          exercises: Json;
          duration_seconds: number | null;
          routine_id: string | null;
          routine_day_index: number | null;
          routine_day_name: string | null;
          routine_share_id: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          notes?: string | null;
          exercises?: Json;
          duration_seconds?: number | null;
          routine_id?: string | null;
          routine_day_index?: number | null;
          routine_day_name?: string | null;
          routine_share_id?: string | null;
        };
        Update: {
          user_id?: string;
          notes?: string | null;
          exercises?: Json;
          duration_seconds?: number | null;
          routine_id?: string | null;
          routine_day_index?: number | null;
          routine_day_name?: string | null;
          routine_share_id?: string | null;
        };
        Relationships: [];
      };
      clubs: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          logo_url: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          name: string;
          description?: string | null;
          logo_url?: string | null;
          created_by: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          logo_url?: string | null;
        };
        Relationships: [];
      };
      club_members: {
        Row: {
          id: string;
          club_id: string;
          user_id: string;
          role: "admin" | "coach" | "player";
          status: "active" | "suspended";
          joined_at: string;
        };
        Insert: {
          club_id: string;
          user_id: string;
          role: "admin" | "coach" | "player";
          status?: "active" | "suspended";
        };
        Update: {
          role?: "admin" | "coach" | "player";
          status?: "active" | "suspended";
        };
        Relationships: [];
      };
      club_groups: {
        Row: {
          id: string;
          club_id: string;
          name: string;
          description: string | null;
          position_rules: string[];
          created_by: string;
          created_at: string;
          kind: "squad" | "training";
          color: "red" | "amber" | "blue" | "green" | "purple" | "pink" | "orange" | "teal";
        };
        Insert: {
          club_id: string;
          name: string;
          description?: string | null;
          position_rules?: string[];
          created_by: string;
          kind?: "squad" | "training";
          color?: "red" | "amber" | "blue" | "green" | "purple" | "pink" | "orange" | "teal";
        };
        Update: {
          name?: string;
          description?: string | null;
          position_rules?: string[];
          kind?: "squad" | "training";
          color?: "red" | "amber" | "blue" | "green" | "purple" | "pink" | "orange" | "teal";
        };
        Relationships: [];
      };
      club_events: {
        Row: {
          id: string;
          club_id: string;
          created_by: string;
          type: "entrenamiento" | "partido";
          title: string;
          description: string | null;
          starts_at: string;
          ends_at: string | null;
          opponent: string | null;
          location: "local" | "visitante" | null;
          group_ids: string[];
          recurrence: Json | null;
          created_at: string;
        };
        Insert: {
          club_id: string;
          created_by: string;
          type: "entrenamiento" | "partido";
          title: string;
          description?: string | null;
          starts_at: string;
          ends_at?: string | null;
          opponent?: string | null;
          location?: "local" | "visitante" | null;
          group_ids?: string[];
          recurrence?: Json | null;
        };
        Update: {
          type?: "entrenamiento" | "partido";
          title?: string;
          description?: string | null;
          starts_at?: string;
          ends_at?: string | null;
          opponent?: string | null;
          location?: "local" | "visitante" | null;
          group_ids?: string[];
          recurrence?: Json | null;
        };
        Relationships: [];
      };
      routine_shares: {
        Row: {
          id: string;
          routine_id: string;
          shared_by: string;
          club_id: string;
          target_type: "group" | "player";
          target_group_id: string | null;
          target_user_id: string | null;
          shared_at: string;
        };
        Insert: {
          routine_id: string;
          shared_by: string;
          club_id: string;
          target_type: "group" | "player";
          target_group_id?: string | null;
          target_user_id?: string | null;
        };
        Update: {
          target_type?: "group" | "player";
          target_group_id?: string | null;
          target_user_id?: string | null;
        };
        Relationships: [];
      };
      club_group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          added_by: string;
          added_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          added_by: string;
        };
        Update: {
          group_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      routine_enrollments: {
        Row: {
          id: string;
          routine_id: string;
          user_id: string;
          status: string;
          progress: Json | null;
          enrolled_at: string;
          source_share_id: string | null;
        };
        Insert: {
          routine_id: string;
          user_id: string;
          status?: string;
          progress?: Json | null;
          source_share_id?: string | null;
        };
        Update: {
          status?: string;
          progress?: Json | null;
          source_share_id?: string | null;
        };
        Relationships: [];
      };
      club_invitations: {
        Row: {
          id: string;
          club_id: string;
          created_by: string;
          code: string;
          role: "coach" | "player";
          max_uses: number | null;
          uses_count: number;
          expires_at: string | null;
          target_group_id: string | null;
          status: "active" | "expired" | "revoked";
          created_at: string;
        };
        Insert: {
          club_id: string;
          created_by: string;
          code: string;
          role: "coach" | "player";
          max_uses?: number | null;
          uses_count?: number;
          expires_at?: string | null;
          target_group_id?: string | null;
          status?: "active" | "expired" | "revoked";
        };
        Update: {
          max_uses?: number | null;
          uses_count?: number;
          expires_at?: string | null;
          target_group_id?: string | null;
          status?: "active" | "expired" | "revoked";
        };
        Relationships: [];
      };
      club_forms: {
        Row: {
          id: string;
          club_id: string;
          created_by: string;
          title: string;
          description: string | null;
          status: "draft" | "active" | "archived";
          template_type: "anamnesis" | "wellness" | null;
          created_at: string;
        };
        Insert: {
          club_id: string;
          created_by: string;
          title: string;
          description?: string | null;
          status?: "draft" | "active" | "archived";
          template_type?: "anamnesis" | "wellness" | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          status?: "draft" | "active" | "archived";
          template_type?: "anamnesis" | "wellness" | null;
        };
        Relationships: [];
      };
      club_form_questions: {
        Row: {
          id: string;
          form_id: string;
          type: "text" | "scale" | "multiple_choice" | "yes_no" | "one_rm";
          question_text: string;
          options: Json | null;
          order_index: number;
          required: boolean;
          depends_on_question_id: string | null;
          depends_on_answer: "si" | "no" | null;
        };
        Insert: {
          form_id: string;
          type: "text" | "scale" | "multiple_choice" | "yes_no" | "one_rm";
          question_text: string;
          options?: Json | null;
          order_index: number;
          required?: boolean;
          depends_on_question_id?: string | null;
          depends_on_answer?: "si" | "no" | null;
        };
        Update: {
          type?: "text" | "scale" | "multiple_choice" | "yes_no" | "one_rm";
          question_text?: string;
          options?: Json | null;
          order_index?: number;
          required?: boolean;
          depends_on_question_id?: string | null;
          depends_on_answer?: "si" | "no" | null;
        };
        Relationships: [];
      };
      club_form_distributions: {
        Row: {
          id: string;
          form_id: string;
          target_type: "group" | "player";
          target_id: string;
          due_at: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          form_id: string;
          target_type: "group" | "player";
          target_id: string;
          due_at?: string | null;
          created_by: string;
        };
        Update: {
          target_type?: "group" | "player";
          target_id?: string;
          due_at?: string | null;
        };
        Relationships: [];
      };
      club_form_schedules: {
        Row: {
          id: string;
          form_id: string;
          club_id: string;
          target_type: "group" | "player";
          target_id: string;
          days_of_week: number[];
          send_time: string;
          active: boolean;
          created_by: string;
          created_at: string;
        };
        Insert: {
          form_id: string;
          club_id: string;
          target_type: "group" | "player";
          target_id: string;
          days_of_week: number[];
          send_time?: string;
          active?: boolean;
          created_by: string;
        };
        Update: {
          target_type?: "group" | "player";
          target_id?: string;
          days_of_week?: number[];
          send_time?: string;
          active?: boolean;
        };
        Relationships: [];
      };
      club_form_responses: {
        Row: {
          id: string;
          distribution_id: string;
          user_id: string;
          submitted_at: string;
        };
        Insert: {
          distribution_id: string;
          user_id: string;
          submitted_at?: string;
        };
        Update: {
          submitted_at?: string;
        };
        Relationships: [];
      };
      club_form_answers: {
        Row: {
          id: string;
          response_id: string;
          question_id: string;
          answer_text: string | null;
          answer_number: number | null;
          answer_options: Json | null;
        };
        Insert: {
          response_id: string;
          question_id: string;
          answer_text?: string | null;
          answer_number?: number | null;
          answer_options?: Json | null;
        };
        Update: {
          answer_text?: string | null;
          answer_number?: number | null;
          answer_options?: Json | null;
        };
        Relationships: [];
      };
      club_periods: {
        Row: {
          id: string;
          club_id: string;
          created_by: string;
          name: string;
          type: "temporada" | "pretemporada" | "postemporada" | "torneo" | "otro";
          start_date: string;
          end_date: string;
          color: "red" | "amber" | "blue" | "green" | "purple" | "pink" | "orange" | "teal";
          created_at: string;
        };
        Insert: {
          club_id: string;
          created_by: string;
          name: string;
          type: "temporada" | "pretemporada" | "postemporada" | "torneo" | "otro";
          start_date: string;
          end_date: string;
          color?: "red" | "amber" | "blue" | "green" | "purple" | "pink" | "orange" | "teal";
        };
        Update: {
          name?: string;
          type?: "temporada" | "pretemporada" | "postemporada" | "torneo" | "otro";
          start_date?: string;
          end_date?: string;
          color?: "red" | "amber" | "blue" | "green" | "purple" | "pink" | "orange" | "teal";
        };
        Relationships: [];
      };
      club_custom_exercises: {
        Row: {
          id: string;
          club_id: string;
          created_by: string;
          name: string;
          muscle_group: string;
          movement_pattern: string;
          equipment: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          club_id: string;
          created_by?: string;
          name: string;
          muscle_group?: string;
          movement_pattern?: string;
          equipment?: string;
          description?: string | null;
        };
        Update: {
          name?: string;
          muscle_group?: string;
          movement_pattern?: string;
          equipment?: string;
          description?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_club_staff: {
        Args: { p_club_id: string };
        Returns: boolean;
      };
      is_club_member: {
        Args: { p_club_id: string };
        Returns: boolean;
      };
      redeem_club_invitation: {
        Args: { p_code: string };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
