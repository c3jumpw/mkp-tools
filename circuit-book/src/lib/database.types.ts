/**
 * Generated from the Supabase project, narrowed to the cb_* tables.
 * The project is shared with other apps, so only Circuit Book's own tables
 * appear here — anything else is out of this app's reach anyway, because RLS
 * scopes every row to the signed-in user.
 */

/** How the exercises inside a block relate to each other. */
export type BlockMode = "straight" | "superset" | "circuit";

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
          muscles: string[];
          target_area: string | null;
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
          muscles?: string[];
          target_area?: string | null;
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
          muscles?: string[];
          target_area?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cb_workout_images: {
        Row: {
          id: string;
          user_id: string;
          workout_id: string;
          path: string;
          caption: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          workout_id: string;
          path: string;
          caption?: string | null;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workout_id?: string;
          path?: string;
          caption?: string | null;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cb_workout_images_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "cb_workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      cb_routine_blocks: {
        Row: {
          id: string;
          user_id: string;
          routine_id: string;
          position: number;
          mode: BlockMode;
          rounds: number;
          rest_seconds: number | null;
          label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          routine_id: string;
          position?: number;
          mode?: BlockMode;
          rounds?: number;
          rest_seconds?: number | null;
          label?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          routine_id?: string;
          position?: number;
          mode?: BlockMode;
          rounds?: number;
          rest_seconds?: number | null;
          label?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cb_routine_blocks_routine_id_fkey";
            columns: ["routine_id"];
            isOneToOne: false;
            referencedRelation: "cb_routines";
            referencedColumns: ["id"];
          },
        ];
      };
      cb_session_blocks: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          position: number;
          mode: BlockMode;
          rounds: number;
          rest_seconds: number | null;
          label: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          session_id: string;
          position?: number;
          mode?: BlockMode;
          rounds?: number;
          rest_seconds?: number | null;
          label?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string;
          position?: number;
          mode?: BlockMode;
          rounds?: number;
          rest_seconds?: number | null;
          label?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cb_session_blocks_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "cb_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      cb_session_sets: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          session_item_id: string;
          round_number: number;
          completed_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          session_id: string;
          session_item_id: string;
          round_number: number;
          completed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string;
          session_item_id?: string;
          round_number?: number;
          completed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cb_session_sets_session_item_id_fkey";
            columns: ["session_item_id"];
            isOneToOne: false;
            referencedRelation: "cb_session_items";
            referencedColumns: ["id"];
          },
        ];
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
          block_id: string;
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
          block_id: string;
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
          block_id?: string;
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
          image_paths: string[];
          muscles: string[];
          target_area: string | null;
          block_id: string;
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
          image_paths?: string[];
          muscles?: string[];
          target_area?: string | null;
          block_id: string;
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
          image_paths?: string[];
          muscles?: string[];
          target_area?: string | null;
          block_id?: string;
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
export type WorkoutImage = Database["public"]["Tables"]["cb_workout_images"]["Row"];
export type Routine = Database["public"]["Tables"]["cb_routines"]["Row"];
export type RoutineDay = Database["public"]["Tables"]["cb_routine_days"]["Row"];
export type RoutineBlock = Database["public"]["Tables"]["cb_routine_blocks"]["Row"];
export type RoutineItem = Database["public"]["Tables"]["cb_routine_items"]["Row"];
export type Session = Database["public"]["Tables"]["cb_sessions"]["Row"];
export type SessionBlock = Database["public"]["Tables"]["cb_session_blocks"]["Row"];
export type SessionItem = Database["public"]["Tables"]["cb_session_items"]["Row"];
export type SessionSet = Database["public"]["Tables"]["cb_session_sets"]["Row"];

/** A workout with its photo sequence attached. */
export type WorkoutWithImages = Workout & { images: WorkoutImage[] };

/** A routine item joined to the workout it points at. */
export type RoutineItemWithWorkout = RoutineItem & { workout: Workout | null };

/** A block and the exercises inside it, in order. */
export type BlockWithItems = RoutineBlock & { items: RoutineItemWithWorkout[] };

/** A session block and its exercises, as session mode draws it. */
export type SessionBlockWithItems = SessionBlock & { items: SessionItem[] };

export const IMAGE_BUCKET = "cb-workout-images";

/** How many photos one workout may carry. Enough for a movement, not an album. */
export const MAX_IMAGES_PER_WORKOUT = 6;

export const BLOCK_MODES: { id: BlockMode; label: string; blurb: string }[] = [
  {
    id: "straight",
    label: "Straight sets",
    blurb: "All sets of one exercise, resting between each.",
  },
  {
    id: "superset",
    label: "Superset",
    blurb: "Two exercises back to back, alternating each round.",
  },
  {
    id: "circuit",
    label: "Circuit",
    blurb: "Three or more exercises cycled through each round.",
  },
];

export function modeForCount(count: number): BlockMode {
  if (count >= 3) return "circuit";
  if (count === 2) return "superset";
  return "straight";
}

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
