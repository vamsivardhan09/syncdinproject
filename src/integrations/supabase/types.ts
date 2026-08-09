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
      connection_requests: {
        Row: {
          created_at: string
          id: string
          intro_note: string | null
          recipient_id: string
          requester_id: string
          responded_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intro_note?: string | null
          recipient_id: string
          requester_id: string
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intro_note?: string | null
          recipient_id?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          created_at: string
          id: string
          peer_slug: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          peer_slug: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          peer_slug?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      demo_profiles: {
        Row: {
          accent: string
          ai_summary: string
          bio: string
          company: string
          complementary_skills: string[]
          conversation_starter: string
          created_at: string
          goals: string[]
          id: string
          initials: string
          interests: string[]
          kind: string
          latitude: number | null
          location: string
          longitude: number | null
          match: number
          name: string
          photo_url: string
          projects: string[]
          reasons: string[]
          role: string
          shared_goals: string[]
          skills: string[]
          slug: string
          suggested_collaboration: string
        }
        Insert: {
          accent?: string
          ai_summary: string
          bio: string
          company: string
          complementary_skills?: string[]
          conversation_starter: string
          created_at?: string
          goals?: string[]
          id?: string
          initials: string
          interests?: string[]
          kind: string
          latitude?: number | null
          location: string
          longitude?: number | null
          match?: number
          name: string
          photo_url: string
          projects?: string[]
          reasons?: string[]
          role: string
          shared_goals?: string[]
          skills?: string[]
          slug: string
          suggested_collaboration: string
        }
        Update: {
          accent?: string
          ai_summary?: string
          bio?: string
          company?: string
          complementary_skills?: string[]
          conversation_starter?: string
          created_at?: string
          goals?: string[]
          id?: string
          initials?: string
          interests?: string[]
          kind?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          match?: number
          name?: string
          photo_url?: string
          projects?: string[]
          reasons?: string[]
          role?: string
          shared_goals?: string[]
          skills?: string[]
          slug?: string
          suggested_collaboration?: string
        }
        Relationships: []
      }
      email_deliveries: {
        Row: {
          actor_id: string | null
          created_at: string
          dedupe_key: string
          id: string
          kind: string
          recipient_id: string
          status: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          dedupe_key: string
          id?: string
          kind: string
          recipient_id: string
          status?: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          dedupe_key?: string
          id?: string
          kind?: string
          recipient_id?: string
          status?: string
        }
        Relationships: []
      }
      event_presence: {
        Row: {
          active: boolean
          created_at: string
          event_code: string
          id: string
          last_active_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          event_code: string
          id?: string
          last_active_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          event_code?: string
          id?: string
          last_active_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          peer_slug: string
          recipient_id: string | null
          sender: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          peer_slug: string
          recipient_id?: string | null
          sender?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          peer_slug?: string
          recipient_id?: string | null
          sender?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          id: string
          kind: string
          metadata: Json
          read: boolean
          reference_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          read?: boolean
          reference_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          read?: boolean
          reference_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email_relationship_notifications: boolean
          full_name: string | null
          goals: string[]
          headline: string | null
          id: string
          interests: string[]
          is_discoverable: boolean
          last_active_at: string
          latitude: number | null
          location: string | null
          location_updated_at: string | null
          longitude: number | null
          onboarded: boolean
          previous_active_at: string | null
          public_card: boolean
          skills: string[]
          twin_intelligence: number
          twin_summary: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email_relationship_notifications?: boolean
          full_name?: string | null
          goals?: string[]
          headline?: string | null
          id: string
          interests?: string[]
          is_discoverable?: boolean
          last_active_at?: string
          latitude?: number | null
          location?: string | null
          location_updated_at?: string | null
          longitude?: number | null
          onboarded?: boolean
          previous_active_at?: string | null
          public_card?: boolean
          skills?: string[]
          twin_intelligence?: number
          twin_summary?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email_relationship_notifications?: boolean
          full_name?: string | null
          goals?: string[]
          headline?: string | null
          id?: string
          interests?: string[]
          is_discoverable?: boolean
          last_active_at?: string
          latitude?: number | null
          location?: string | null
          location_updated_at?: string | null
          longitude?: number | null
          onboarded?: boolean
          previous_active_at?: string | null
          public_card?: boolean
          skills?: string[]
          twin_intelligence?: number
          twin_summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      twin_sources: {
        Row: {
          created_at: string
          gain: number
          id: string
          kind: string
          source_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gain?: number
          id?: string
          kind?: string
          source_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          gain?: number
          id?: string
          kind?: string
          source_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_notification_actors: {
        Args: { _ids: string[] }
        Returns: {
          avatar_url: string
          full_name: string
          headline: string
          id: string
        }[]
      }
      get_public_profile: {
        Args: { _id: string }
        Returns: {
          avatar_url: string
          created_at: string
          full_name: string
          goals: string[]
          headline: string
          id: string
          interests: string[]
          last_active_at: string
          location: string
          skills: string[]
          twin_intelligence: number
          twin_summary: string
        }[]
      }
      get_shared_card: {
        Args: { _id: string }
        Returns: {
          avatar_url: string
          full_name: string
          goals: string[]
          headline: string
          id: string
          interests: string[]
          location: string
          skills: string[]
          twin_intelligence: number
          twin_summary: string
        }[]
      }
      list_my_connections: {
        Args: never
        Returns: {
          avatar_url: string
          connected_at: string
          full_name: string
          goals: string[]
          headline: string
          id: string
          interests: string[]
          last_active_at: string
          location: string
          skills: string[]
          twin_intelligence: number
          twin_summary: string
        }[]
      }
      search_people: {
        Args: { _limit?: number; _q?: string }
        Returns: {
          avatar_url: string
          full_name: string
          headline: string
          id: string
          location: string
          skills: string[]
          twin_intelligence: number
        }[]
      }
      search_people_ranked: {
        Args: { _limit?: number; _q?: string }
        Returns: {
          avatar_url: string
          created_at: string
          full_name: string
          goals: string[]
          headline: string
          id: string
          interests: string[]
          last_active_at: string
          location: string
          skills: string[]
          twin_intelligence: number
          twin_summary: string
        }[]
      }
      touch_activity: { Args: never; Returns: string }
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
