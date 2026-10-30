export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4";
  };
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      collections: {
        Row: {
          created_at: string;
          description: string | null;
          flashcard_count: number;
          id: number;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          flashcard_count?: number;
          id?: number;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          flashcard_count?: number;
          id?: number;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      english_audio_files: {
        Row: {
          audio_type: string;
          audio_url: string;
          created_at: string | null;
          dialogue_id: string;
          duration_ms: number | null;
          id: number;
          turn_index: number;
          voice_id: string | null;
        };
        Insert: {
          audio_type: string;
          audio_url: string;
          created_at?: string | null;
          dialogue_id: string;
          duration_ms?: number | null;
          id?: number;
          turn_index: number;
          voice_id?: string | null;
        };
        Update: {
          audio_type?: string;
          audio_url?: string;
          created_at?: string | null;
          dialogue_id?: string;
          duration_ms?: number | null;
          id?: number;
          turn_index?: number;
          voice_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "english_audio_files_dialogue_id_fkey";
            columns: ["dialogue_id"];
            isOneToOne: false;
            referencedRelation: "english_dialogues";
            referencedColumns: ["id"];
          },
        ];
      };
      english_dialogues: {
        Row: {
          created_at: string | null;
          estimated_duration_seconds: number | null;
          id: string;
          image_url: string | null;
          intro: Json | null;
          lesson: number;
          level: string;
          presentation: Json | null;
          revision_from: string[] | null;
          sort_order: number;
          stage: number;
          tags: string[];
          target_structures: string[];
          target_vocab: string[];
          title: string;
          turns: Json;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          estimated_duration_seconds?: number | null;
          id: string;
          image_url?: string | null;
          intro?: Json | null;
          lesson: number;
          level: string;
          presentation?: Json | null;
          revision_from?: string[] | null;
          sort_order?: number;
          stage: number;
          tags?: string[];
          target_structures?: string[];
          target_vocab?: string[];
          title: string;
          turns: Json;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          estimated_duration_seconds?: number | null;
          id?: string;
          image_url?: string | null;
          intro?: Json | null;
          lesson?: number;
          level?: string;
          presentation?: Json | null;
          revision_from?: string[] | null;
          sort_order?: number;
          stage?: number;
          tags?: string[];
          target_structures?: string[];
          target_vocab?: string[];
          title?: string;
          turns?: Json;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      english_progress: {
        Row: {
          completed_at: string | null;
          correct_turns: number;
          dialogue_id: string;
          duration_seconds: number | null;
          id: number;
          score: number;
          total_turns: number;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          correct_turns: number;
          dialogue_id: string;
          duration_seconds?: number | null;
          id?: number;
          score: number;
          total_turns: number;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          correct_turns?: number;
          dialogue_id?: string;
          duration_seconds?: number | null;
          id?: number;
          score?: number;
          total_turns?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "english_progress_dialogue_id_fkey";
            columns: ["dialogue_id"];
            isOneToOne: false;
            referencedRelation: "english_dialogues";
            referencedColumns: ["id"];
          },
        ];
      };
      flashcards: {
        Row: {
          back: string;
          collection_id: number | null;
          created_at: string;
          front: string;
          generation_id: number | null;
          id: number;
          source: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          back: string;
          collection_id?: number | null;
          created_at?: string;
          front: string;
          generation_id?: number | null;
          id?: number;
          source: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          back?: string;
          collection_id?: number | null;
          created_at?: string;
          front?: string;
          generation_id?: number | null;
          id?: number;
          source?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flashcards_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
        ];
      };
      generation_error_logs: {
        Row: {
          created_at: string;
          error_code: string;
          error_message: string;
          id: number;
          model: string;
          source_text_hash: string;
          source_text_length: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          error_code: string;
          error_message: string;
          id?: number;
          model: string;
          source_text_hash: string;
          source_text_length: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          error_code?: string;
          error_message?: string;
          id?: number;
          model?: string;
          source_text_hash?: string;
          source_text_length?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      generations: {
        Row: {
          accepted_edited_count: number | null;
          accepted_unedited_count: number | null;
          created_at: string;
          error: string | null;
          generated_count: number;
          generation_duration: number;
          id: number;
          model: string;
          source_text_hash: string;
          source_text_length: number;
          status: string | null;
          text: string | null;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          accepted_edited_count?: number | null;
          accepted_unedited_count?: number | null;
          created_at?: string;
          error?: string | null;
          generated_count: number;
          generation_duration: number;
          id?: number;
          model: string;
          source_text_hash: string;
          source_text_length: number;
          status?: string | null;
          text?: string | null;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accepted_edited_count?: number | null;
          accepted_unedited_count?: number | null;
          created_at?: string;
          error?: string | null;
          generated_count?: number;
          generation_duration?: number;
          id?: number;
          model?: string;
          source_text_hash?: string;
          source_text_length?: number;
          status?: string | null;
          text?: string | null;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      households: {
        Row: {
          created_at: string;
          id: string;
          owner_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          owner_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      household_members: {
        Row: {
          created_at: string;
          household_id: string;
          member_role: "administrator" | "user";
          user_id: string;
        };
        Insert: {
          created_at?: string;
          household_id: string;
          member_role: "administrator" | "user";
          user_id: string;
        };
        Update: {
          created_at?: string;
          household_id?: string;
          member_role?: "administrator" | "user";
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          active_child_id: string | null;
          ai_usage_last_reset_at: string;
          avatar_url: string | null;
          birth_date: string | null;
          created_at: string;
          current_ai_token_usage: number;
          display_name: string | null;
          first_name: string | null;
          last_name: string | null;
          locale: string | null;
          monthly_ai_token_limit: number;
          parent_note: string | null;
          phone: string | null;
          role: "administrator" | "user";
          school_grade: string | null;
          timezone: string | null;
          updated_at: string;
          user_id: string;
          username: string | null;
        };
        Insert: {
          active_child_id?: string | null;
          ai_usage_last_reset_at?: string;
          avatar_url?: string | null;
          birth_date?: string | null;
          created_at?: string;
          current_ai_token_usage?: number;
          display_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          locale?: string | null;
          monthly_ai_token_limit?: number;
          parent_note?: string | null;
          phone?: string | null;
          role?: "administrator" | "user";
          school_grade?: string | null;
          timezone?: string | null;
          updated_at?: string;
          user_id: string;
          username?: string | null;
        };
        Update: {
          active_child_id?: string | null;
          ai_usage_last_reset_at?: string;
          avatar_url?: string | null;
          birth_date?: string | null;
          created_at?: string;
          current_ai_token_usage?: number;
          display_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          locale?: string | null;
          monthly_ai_token_limit?: number;
          parent_note?: string | null;
          phone?: string | null;
          role?: "administrator" | "user";
          school_grade?: string | null;
          timezone?: string | null;
          updated_at?: string;
          user_id?: string;
          username?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      current_profile_role: { Args: never; Returns: string };
      is_guardian_of: { Args: { target_user_id: string }; Returns: boolean };
      owns_or_guards: { Args: { target_user_id: string }; Returns: boolean };
      check_generation_exists: { Args: { gen_id: number }; Returns: boolean };
      check_policy: {
        Args: never;
        Returns: {
          result: boolean;
        }[];
      };
      create_generation_with_flashcards: {
        Args: { flashcards_data: Json; generation_data: Json };
        Returns: Json;
      };
      debug_generation_visibility: {
        Args: { gen_id: number };
        Returns: {
          exists_at_all: boolean;
          user_id: string;
          visible_to_me: boolean;
        }[];
      };
      ensure_generation_exists: {
        Args: { gen_id: number; uid: string };
        Returns: boolean;
      };
      get_available_flashcards_for_collection: {
        Args: { generation_id: number };
        Returns: Json;
      };
      get_available_flashcards_for_import: {
        Args: { gen_id: number };
        Returns: {
          back: string;
          collection_id: number | null;
          created_at: string;
          front: string;
          generation_id: number | null;
          id: number;
          source: string;
          updated_at: string;
          user_id: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "flashcards";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      import_flashcards_to_collection: {
        Args: { collection_id: number; flashcard_ids: Json };
        Returns: Json;
      };
      increment_ai_token_usage: {
        Args: { p_tokens_used: number; p_user_id: string };
        Returns: undefined;
      };
      insert_flashcards: { Args: { flashcards_data: Json }; Returns: Json };
      insert_generation: { Args: { generation_data: Json }; Returns: Json };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
