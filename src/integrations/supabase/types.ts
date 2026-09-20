export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      publications: {
        Row: {
          author_id: string
          content: string
          cover_url: string | null
          created_at: string
          hashtags: string[] | null
          id: string
          pages: number | null
          reads_count: number | null
          status: string | null
          summary: string | null
          title: string
          upvotes_count: number | null
          pan_settings: Json | null
          buy_link: string | null
        }
        Insert: {
          author_id: string
          content: string
          cover_url?: string | null
          created_at?: string
          hashtags?: string[] | null
          id?: string
          pages?: number | null
          reads_count?: number | null
          status?: string | null
          summary?: string | null
          title: string
          upvotes_count?: number | null
          pan_settings?: Json | null
          buy_link?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          cover_url?: string | null
          created_at?: string
          hashtags?: string[] | null
          id?: string
          pages?: number | null
          reads_count?: number | null
          status?: string | null
          summary?: string | null
          title?: string
          upvotes_count?: number | null
          pan_settings?: Json | null
          buy_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publications_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          biography: string | null
          created_at: string | null
          external_links: Json | null
          followers_count: number | null
          following_count: number | null
          id: string
          name: string
          payment_tier_status: string | null
          username: string
          avatar_url: string | null
        }
        Insert: {
          biography?: string | null
          created_at?: string | null
          external_links?: Json | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          name: string
          payment_tier_status?: string | null
          username: string
          avatar_url?: string | null
        }
        Update: {
          biography?: string | null
          created_at?: string | null
          external_links?: Json | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          name?: string
          payment_tier_status?: string | null
          username?: string
          avatar_url?: string | null
        }
        Relationships: []
      }
      upvotes_ledger: {
        Row: {
          created_at: string | null
          id: string
          publication_id: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          publication_id: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          publication_id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upvotes_ledger_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upvotes_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_coauthors: {
        Row: {
          id: string
          publication_id: string
          user_id: string
          invited_by: string
          book_title: string
          role: string
          full_permissions: boolean | null
          invitation_status: string
          created_at: string
        }
        Insert: {
          id?: string
          publication_id: string
          user_id: string
          invited_by: string
          book_title?: string
          role?: string
          full_permissions?: boolean | null
          invitation_status?: string
          created_at?: string
        }
        Update: {
          id?: string
          publication_id?: string
          user_id?: string
          invited_by?: string
          book_title?: string
          role?: string
          full_permissions?: boolean | null
          invitation_status?: string
          created_at?: string
        }
        Relationships: []
      }
      publication_revisions: {
        Row: {
          id: string
          publication_id: string
          helper_id: string
          proposed_body: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          publication_id: string
          helper_id: string
          proposed_body: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          publication_id?: string
          helper_id?: string
          proposed_body?: string
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      trophy_claims: {
        Row: {
          claimed_at: string | null
          contact_name: string
          email: string
          id: string
          phone_number: string | null
          shipping_address: string
          status: string | null
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          contact_name: string
          email: string
          id?: string
          phone_number?: string | null
          shipping_address: string
          status?: string | null
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          contact_name?: string
          email?: string
          id?: string
          phone_number?: string | null
          shipping_address?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trophy_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      redeem_hof_code: { Args: { _code: string }; Returns: Json }
      username_available: { Args: { _username: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
