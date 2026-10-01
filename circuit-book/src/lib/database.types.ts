/**
 * Generated from the Supabase project, narrowed to the cb_* tables.
 * The project is shared with other apps, so only Circuit Book's own tables
 * appear here — anything else is out of this app's reach anyway, because RLS
 * scopes every row to the signed-in user.
 */

export type Database = {
  public: {
    Tables: {
      cb_workouts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          category: string | null;
          target_sets: number | null;
          target_reps: string | null;
          target_duration_seconds: number | null;
          image_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          description?: string | null;
          category?: string | null;
          target_sets?: number | null;
          target_reps?: string | null;
          target_duration_seconds?: number | null;
          image_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          category?: string | null;
          target_sets?: number | null;
          target_reps?: string | null;
          target_duration_seconds?: number | null;
          image_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cb_routines: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          accent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          description?: string | null;
          accent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          accent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cb_routine_days: {
        Row: {
          id: string;
          user_id: string;
          routine_id: string;
          day_of_week: number;
        };
        Insert: {
          id?: string;
          user_id?: string;
          routine_id: string;
          day_of_week: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          routine_id?: string;
          day_of_week?: number;
        };
        Relationships: [
          {
            foreignKeyName: "cb_routine_days_routine_id_fkey";
            columns: ["routine_id"];
            isOneToOne: false;
            referencedRelation: "cb_routines";
            referencedColumns: ["id"];
          },
        ];
      };
      cb_routine_items: {
        Row: {
          id: string;
          user_id: string;
          routine_id: string;
          workout_id: string;
          position: number;
          sets_override: number | null;
          reps_override: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          routine_id: string;
          workout_id: string;
          position?: number;
          sets_override?: number | null;
          reps_override?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          routine_id?: string;
          workout_id?: string;
          position?: number;
          sets_override?: number | null;
          reps_override?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cb_routine_items_routine_id_fkey";
            columns: ["routine_id"];
            isOneToOne: false;
            referencedRelation: "cb_routines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cb_routine_items_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "cb_workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      cb_sessions: {
        Row: {
          id: string;
          user_id: string;
          routine_id: string | null;
          routine_name: string;
          started_at: string;
          completed_at: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          routine_id?: string | null;
          routine_name: string;
          started_at?: string;
          completed_at?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          routine_id?: string | null;
          routine_name?: string;
          started_at?: string;
          completed_at?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cb_sessions_routine_id_fkey";
            columns: ["routine_id"];
            isOneToOne: false;
            referencedRelation: "cb_routines";
            referencedColumns: ["id"];
          },
        ];
      };
      cb_session_items: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          workout_id: string | null;
          workout_name: string;
          description: string | null;
          category: string | null;
          target_sets: number | null;
          target_reps: string | null;
          target_duration_seconds: number | null;
          image_path: string | null;
          position: number;
          completed_at: string | null;
          swapped_from: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          session_id: string;
          workout_id?: string | null;
          workout_name: string;
          description?: string | null;
          category?: string | null;
          target_sets?: number | null;
          target_reps?: string | null;
          target_duration_seconds?: number | null;
          image_path?: string | null;
          position?: number;
          completed_at?: string | null;
          swapped_from?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string;
          workout_id?: string | null;
          workout_name?: string;
          description?: string | null;
          category?: string | null;
          target_sets?: number | null;
          target_reps?: string | null;
          target_duration_seconds?: number | null;
          image_path?: string | null;
          position?: number;
          completed_at?: string | null;
          swapped_from?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cb_session_items_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "cb_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cb_session_items_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "cb_workouts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type Workout = Database["public"]["Tables"]["cb_workouts"]["Row"];
export type WorkoutInsert = Database["public"]["Tables"]["cb_workouts"]["Insert"];
export type Routine = Database["public"]["Tables"]["cb_routines"]["Row"];
export type RoutineDay = Database["public"]["Tables"]["cb_routine_days"]["Row"];
export type RoutineItem = Database["public"]["Tables"]["cb_routine_items"]["Row"];
export type Session = Database["public"]["Tables"]["cb_sessions"]["Row"];
export type SessionItem = Database["public"]["Tables"]["cb_session_items"]["Row"];

/** A routine item joined to the workout it points at. */
export type RoutineItemWithWorkout = RoutineItem & { workout: Workout | null };

/** A routine with its day assignments and station count, as the lists need it. */
export type RoutineSummary = Routine & {
  days: number[];
  stationCount: number;
};

export const IMAGE_BUCKET = "cb-workout-images";

/**
 * Categories are free text in the database so the user is never boxed in, but
 * these are offered as one-tap choices in the editor.
 */
export const SUGGESTED_CATEGORIES = [
  "Strength",
  "Cardio",
  "Soccer",
  "Mobility",
  "Core",
  "Plyo",
] as const;
