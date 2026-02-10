export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      english_dialogues: {
        Row: {
          id: string;
          stage: number;
          lesson: number;
          level: string;
          title: string;
          tags: string[];
          target_vocab: string[];
          target_structures: string[];
          turns: Json;
          revision_from: string[];
          estimated_duration_seconds: number | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          stage: number;
          lesson: number;
          level: string;
          title: string;
          tags?: string[];
          target_vocab?: string[];
          target_structures?: string[];
          turns: Json;
          revision_from?: string[];
          estimated_duration_seconds?: number | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          stage?: number;
          lesson?: number;
          level?: string;
          title?: string;
          tags?: string[];
          target_vocab?: string[];
          target_structures?: string[];
          turns?: Json;
          revision_from?: string[];
          estimated_duration_seconds?: number | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      english_progress: {
        Row: {
          id: number;
          user_id: string;
          dialogue_id: string;
          score: number;
          total_turns: number;
          correct_turns: number;
          duration_seconds: number | null;
          completed_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          dialogue_id: string;
          score: number;
          total_turns: number;
          correct_turns: number;
          duration_seconds?: number | null;
          completed_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          dialogue_id?: string;
          score?: number;
          total_turns?: number;
          correct_turns?: number;
          duration_seconds?: number | null;
          completed_at?: string;
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
      english_audio_files: {
        Row: {
          id: number;
          dialogue_id: string;
          turn_index: number;
          audio_type: string;
          audio_url: string;
          voice_id: string | null;
          duration_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          dialogue_id: string;
          turn_index: number;
          audio_type: string;
          audio_url: string;
          voice_id?: string | null;
          duration_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          dialogue_id?: string;
          turn_index?: number;
          audio_type?: string;
          audio_url?: string;
          voice_id?: string | null;
          duration_ms?: number | null;
          created_at?: string;
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
      profiles: {
        Row: {
          ai_usage_last_reset_at: string;
          avatar_url: string | null;
          current_ai_token_usage: number;
          monthly_ai_token_limit: number;
          user_id: string;
          username: string | null;
        };
        Insert: {
          ai_usage_last_reset_at?: string;
          avatar_url?: string | null;
          current_ai_token_usage?: number;
          monthly_ai_token_limit?: number;
          user_id: string;
          username?: string | null;
        };
        Update: {
          ai_usage_last_reset_at?: string;
          avatar_url?: string | null;
          current_ai_token_usage?: number;
          monthly_ai_token_limit?: number;
          user_id?: string;
          username?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      check_generation_exists: {
        Args: { gen_id: number };
        Returns: boolean;
      };
      check_policy: {
        Args: Record<PropertyKey, never>;
        Returns: {
          result: boolean;
        }[];
      };
      create_generation_with_flashcards: {
        Args: { generation_data: Json; flashcards_data: Json };
        Returns: Json;
      };
      debug_generation_visibility: {
        Args: { gen_id: number };
        Returns: {
          exists_at_all: boolean;
          visible_to_me: boolean;
          user_id: string;
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
      };
      import_flashcards_to_collection: {
        Args: { collection_id: number; flashcard_ids: Json };
        Returns: Json;
      };
      increment_ai_token_usage: {
        Args: { p_user_id: string; p_tokens_used: number };
        Returns: undefined;
      };
      insert_flashcards: {
        Args: { flashcards_data: Json };
        Returns: Json;
      };
      insert_generation: {
        Args: { generation_data: Json };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
