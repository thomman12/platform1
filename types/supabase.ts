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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      audio_participants: {
        Row: {
          ap_profile_id: string
          id: string
          joined_at: string
          role: string
          room_id: string
        }
        Insert: {
          ap_profile_id: string
          id?: string
          joined_at?: string
          role?: string
          room_id: string
        }
        Update: {
          ap_profile_id?: string
          id?: string
          joined_at?: string
          role?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_participants_ap_profile_id_fkey"
            columns: ["ap_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "audio_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_rooms: {
        Row: {
          ar_post_id: string
          created_at: string | null
          created_by: string
          id: string
        }
        Insert: {
          ar_post_id: string
          created_at?: string | null
          created_by: string
          id?: string
        }
        Update: {
          ar_post_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_rooms_ar_post_id_fkey"
            columns: ["ar_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          banner_alt: string | null
          banner_path: string | null
          banner_updated_at: string | null
          blocked_words: string[]
          created_at: string
          creator_id: string
          description: string | null
          flagged_keywords: string[] | null
          id: string
          is_archived: boolean
          is_hidden: boolean
          name: string
          post_daily_limit: number | null
          post_rate_per_hour: number | null
          post_requires_approval: boolean
          premod_all: boolean
          premod_enabled: boolean
          premod_first_post: boolean
          premod_keywords: string[]
          premod_links: boolean
          premod_min_account_days: number | null
          require_mod_review: boolean
          search_vector: unknown | null
          visibility: Database["public"]["Enums"]["visibility_enum"]
        }
        Insert: {
          banner_alt?: string | null
          banner_path?: string | null
          banner_updated_at?: string | null
          blocked_words?: string[]
          created_at?: string
          creator_id: string
          description?: string | null
          flagged_keywords?: string[] | null
          id?: string
          is_archived?: boolean
          is_hidden?: boolean
          name: string
          post_daily_limit?: number | null
          post_rate_per_hour?: number | null
          post_requires_approval?: boolean
          premod_all?: boolean
          premod_enabled?: boolean
          premod_first_post?: boolean
          premod_keywords?: string[]
          premod_links?: boolean
          premod_min_account_days?: number | null
          require_mod_review?: boolean
          search_vector?: unknown | null
          visibility?: Database["public"]["Enums"]["visibility_enum"]
        }
        Update: {
          banner_alt?: string | null
          banner_path?: string | null
          banner_updated_at?: string | null
          blocked_words?: string[]
          created_at?: string
          creator_id?: string
          description?: string | null
          flagged_keywords?: string[] | null
          id?: string
          is_archived?: boolean
          is_hidden?: boolean
          name?: string
          post_daily_limit?: number | null
          post_rate_per_hour?: number | null
          post_requires_approval?: boolean
          premod_all?: boolean
          premod_enabled?: boolean
          premod_first_post?: boolean
          premod_keywords?: string[]
          premod_links?: boolean
          premod_min_account_days?: number | null
          require_mod_review?: boolean
          search_vector?: unknown | null
          visibility?: Database["public"]["Enums"]["visibility_enum"]
        }
        Relationships: []
      }
      community_followers: {
        Row: {
          community_id: string
          followed_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          community_id: string
          followed_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          community_id?: string
          followed_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_followers_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          created_at: string
          id: string
          profile_id: string
          role: Database["public"]["Enums"]["member_role_enum"]
          status: Database["public"]["Enums"]["member_status_enum"]
          status_changed_at: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          profile_id: string
          role?: Database["public"]["Enums"]["member_role_enum"]
          status?: Database["public"]["Enums"]["member_status_enum"]
          status_changed_at?: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["member_role_enum"]
          status?: Database["public"]["Enums"]["member_status_enum"]
          status_changed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_mod_logs: {
        Row: {
          action: string
          actor_id: string
          community_id: string
          created_at: string
          id: string
          reason: string | null
          target_id: string
        }
        Insert: {
          action: string
          actor_id: string
          community_id: string
          created_at?: string
          id?: string
          reason?: string | null
          target_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          community_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_mod_logs_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_domains: {
        Row: {
          base_domain: string
          id: number
          institution_id: string
          is_ambiguous: boolean
          is_student_only: boolean
          notes: string | null
        }
        Insert: {
          base_domain: string
          id?: number
          institution_id: string
          is_ambiguous?: boolean
          is_student_only?: boolean
          notes?: string | null
        }
        Update: {
          base_domain?: string
          id?: number
          institution_id?: string
          is_ambiguous?: boolean
          is_student_only?: boolean
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_domains_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          id: string
          official_name: string
          short_name: string
          slug: string
          status_notes: string | null
          type: string
          ukprn: string | null
          updated_at: string
        }
        Insert: {
          id: string
          official_name: string
          short_name: string
          slug: string
          status_notes?: string | null
          type?: string
          ukprn?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          official_name?: string
          short_name?: string
          slug?: string
          status_notes?: string | null
          type?: string
          ukprn?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      live_chat_presence: {
        Row: {
          last_seen_at: string
          post_id: string
        }
        Insert: {
          last_seen_at?: string
          post_id: string
        }
        Update: {
          last_seen_at?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_presence_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_chats: {
        Row: {
          id: string
          message: string
          pc_post_id: string
          sender_id: string
          sent_at: string | null
        }
        Insert: {
          id?: string
          message: string
          pc_post_id: string
          sender_id: string
          sent_at?: string | null
        }
        Update: {
          id?: string
          message?: string
          pc_post_id?: string
          sender_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_chats_pc_post_id_fkey"
            columns: ["pc_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_chats_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_votes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          profile_id: string
          vote_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          profile_id: string
          vote_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          profile_id?: string
          vote_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_votes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          audio_room_active: boolean
          community_id: string | null
          content: string | null
          created_at: string | null
          has_live_chat: boolean | null
          id: string
          live_chat_status: string | null
          mod_notes: string | null
          status: Database["public"]["Enums"]["post_status_enum"]
          title: string
          user_id: string | null
          visibility: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          audio_room_active?: boolean
          community_id?: string | null
          content?: string | null
          created_at?: string | null
          has_live_chat?: boolean | null
          id?: string
          live_chat_status?: string | null
          mod_notes?: string | null
          status?: Database["public"]["Enums"]["post_status_enum"]
          title: string
          user_id?: string | null
          visibility?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          audio_room_active?: boolean
          community_id?: string | null
          content?: string | null
          created_at?: string | null
          has_live_chat?: boolean | null
          id?: string
          live_chat_status?: string | null
          mod_notes?: string | null
          status?: Database["public"]["Enums"]["post_status_enum"]
          title?: string
          user_id?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_id: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          institution_id: string | null
          is_moderator: boolean
          is_student_verified: boolean
          perks_provisional: boolean
          username: string
          verification_method: string | null
          verified_at: string | null
        }
        Insert: {
          avatar_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id: string
          institution_id?: string | null
          is_moderator?: boolean
          is_student_verified?: boolean
          perks_provisional?: boolean
          username: string
          verification_method?: string | null
          verified_at?: string | null
        }
        Update: {
          avatar_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          institution_id?: string | null
          is_moderator?: boolean
          is_student_verified?: boolean
          perks_provisional?: boolean
          username?: string
          verification_method?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      saved_posts: {
        Row: {
          id: string
          saved_at: string | null
          sp_post_id: string
          sp_profile_id: string
        }
        Insert: {
          id?: string
          saved_at?: string | null
          sp_post_id: string
          sp_profile_id: string
        }
        Update: {
          id?: string
          saved_at?: string | null
          sp_post_id?: string
          sp_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_sp_post_id_fkey"
            columns: ["sp_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_posts_sp_profile_id_fkey"
            columns: ["sp_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_otps: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          password: string
          preset_avatar_id: string
          username: string
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          password: string
          preset_avatar_id: string
          username: string
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          password?: string
          preset_avatar_id?: string
          username?: string
        }
        Relationships: []
      }
      student_verifications: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          email: string
          id: string
          institution_id: string | null
          method: string
          notes: string | null
          status: string
          storage_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email: string
          id?: string
          institution_id?: string | null
          method: string
          notes?: string | null
          status?: string
          storage_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email?: string
          id?: string
          institution_id?: string | null
          method?: string
          notes?: string | null
          status?: string
          storage_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_verifications_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_staging: {
        Row: {
          base_domain: string
          created_at: string
          email: string
          id: string
          staging_token: string
          storage_path: string
          used_at: string | null
        }
        Insert: {
          base_domain: string
          created_at?: string
          email: string
          id?: string
          staging_token: string
          storage_path: string
          used_at?: string | null
        }
        Update: {
          base_domain?: string
          created_at?: string
          email?: string
          id?: string
          staging_token?: string
          storage_path?: string
          used_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_approve_member: {
        Args: { p_community: string; p_profile: string }
        Returns: undefined
      }
      admin_approve_request: {
        Args: { p_community: string; p_profile: string; p_reason?: string }
        Returns: undefined
      }
      admin_ban_member: {
        Args: { p_community: string; p_profile: string; p_reason?: string }
        Returns: undefined
      }
      admin_is_moderator: {
        Args: { p_community: string; p_profile?: string }
        Returns: boolean
      }
      admin_list_audit: {
        Args: { p_community: string }
        Returns: {
          action: string
          actor_id: string
          actor_name: string
          created_at: string
          id: string
          reason: string
          target_id: string
          target_name: string
        }[]
      }
      admin_list_banned: {
        Args: { p_community: string }
        Returns: {
          avatar_id: string
          banned_at: string
          profile_id: string
          username: string
        }[]
      }
      admin_list_members: {
        Args: { p_community: string }
        Returns: {
          avatar_id: string
          joined_at: string
          profile_id: string
          role: Database["public"]["Enums"]["member_role_enum"]
          username: string
        }[]
      }
      admin_list_pending: {
        Args: { p_community: string }
        Returns: {
          avatar_id: string
          profile_id: string
          requested_at: string
          username: string
        }[]
      }
      admin_reject_request: {
        Args: { p_community: string; p_profile: string; p_reason?: string }
        Returns: undefined
      }
      admin_remove_member: {
        Args:
          | { p_community: string; p_profile: string }
          | { p_community: string; p_profile: string; p_reason?: string }
        Returns: undefined
      }
      admin_set_role: {
        Args: {
          p_community: string
          p_profile: string
          p_role: Database["public"]["Enums"]["member_role_enum"]
        }
        Returns: undefined
      }
      admin_transfer_ownership: {
        Args: { p_community: string; p_new_owner: string }
        Returns: undefined
      }
      admin_unban_member: {
        Args: { p_community: string; p_profile: string; p_reason?: string }
        Returns: undefined
      }
      can_moderate: {
        Args: { comm_id: string } | { p_community: string; p_user: string }
        Returns: boolean
      }
      can_post_in_community: {
        Args: { p_actor: string; p_community: string }
        Returns: boolean
      }
      compute_post_status: {
        Args: { author_id: string; comm_id: string }
        Returns: Database["public"]["Enums"]["post_status_enum"]
      }
      create_student_verification: {
        Args: {
          p_base_domain: string
          p_email: string
          p_storage_path?: string
        }
        Returns: string
      }
      delete_community_hard: {
        Args: { p_community: string }
        Returns: undefined
      }
      enable_provisional_perks_if_applicable: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      is_admin_of: {
        Args: { comm_id: string; profile_id: string }
        Returns: boolean
      }
      is_approved_member: {
        Args: { comm_id: string } | { p_community: string; p_profile: string }
        Returns: boolean
      }
      is_archived: {
        Args: { comm_id: string }
        Returns: boolean
      }
      is_community_admin: {
        Args: { p_community: string; p_profile: string }
        Returns: boolean
      }
      is_community_archived: {
        Args: { comm_id: string }
        Returns: boolean
      }
      is_moderator: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      join_community: {
        Args: { p_community: string }
        Returns: Json
      }
      mark_student_verified_student_subdomain: {
        Args: { p_base_domain: string; p_email: string }
        Returns: undefined
      }
      matches_flagged_keywords: {
        Args: { p_content: string; p_keywords: string[] }
        Returns: boolean
      }
      moderator_approve: {
        Args: { p_notes?: string; p_req: string }
        Returns: undefined
      }
      moderator_reject: {
        Args: { p_notes?: string; p_req: string }
        Returns: undefined
      }
      start_student_verification: {
        Args: { p_base_domain: string; p_email: string; p_storage_path: string }
        Returns: string
      }
      under_daily_quota: {
        Args: { author_id: string; comm_id: string }
        Returns: boolean
      }
      violates_blocked_words: {
        Args: { comm_id: string; content: string; title: string }
        Returns: boolean
      }
    }
    Enums: {
      audio_role: "host" | "speaker" | "listener"
      member_role_enum: "owner" | "moderator" | "member"
      member_status_enum: "approved" | "pending" | "banned"
      post_status: "pending" | "published" | "rejected"
      post_status_enum: "published" | "pending" | "removed" | "rejected"
      visibility_enum: "public" | "restricted" | "private"
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
    Enums: {
      audio_role: ["host", "speaker", "listener"],
      member_role_enum: ["owner", "moderator", "member"],
      member_status_enum: ["approved", "pending", "banned"],
      post_status: ["pending", "published", "rejected"],
      post_status_enum: ["published", "pending", "removed", "rejected"],
      visibility_enum: ["public", "restricted", "private"],
    },
  },
} as const
