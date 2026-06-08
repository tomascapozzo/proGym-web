export type LibraryExercise = {
  id: string;
  name: string;
  muscle_group: string;
  movement_pattern: string;
  equipment: string;
  // Present when querying exercises_combined view
  source?: "global" | "custom";
  club_id?: string | null;
};

export type CustomExercise = {
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

export type ExerciseEntry = {
  nombre: string;
  reps: string[];
  peso?: string[];
  rir?: string[];
  nota?: string;
  rpe?: boolean;
};

export type RoutineDayExercise = ExerciseEntry & {
  series: number;
  descanso: string;
};

export type RoutineCircuit = {
  nombre: string;
  rondas: number;
  descanso: string;
  ejercicios: ExerciseEntry[];
  rpe?: boolean;
};

export type RoutineDay = {
  dia: string;
  enfoque: string;
  ejercicios: RoutineDayExercise[];
  circuitos?: RoutineCircuit[];
};

export type RoutineType = "daily" | "weekly" | "monthly";
export type RoutineStatus = "active" | "past" | "pending_restart";
export type RpePromptType = "serie" | "bloque" | "sesion" | "none";

export type RoutineProgress = {
  completed_days: number[];
  skipped_days?: number[];
};

export type Routine = {
  id: string;
  type: RoutineType;
  status: RoutineStatus;
  progress: RoutineProgress;
  data: { nombre: string; dias: RoutineDay[]; rpe_prompt?: RpePromptType };
  created_at: string;
};

export const DEFAULT_EXERCISE: RoutineDayExercise = {
  nombre: "",
  series: 3,
  reps: ["", "", ""],
  descanso: "60s",
};
