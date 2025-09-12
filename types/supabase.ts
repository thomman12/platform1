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
  auth: {
    Tables: {
      audit_log_entries: {
        Row: {
          created_at: string | null
          id: string
          instance_id: string | null
          ip_address: string
          payload: Json | null
        }
        Insert: {
          created_at?: string | null
          id: string
          instance_id?: string | null
          ip_address?: string
          payload?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instance_id?: string | null
          ip_address?: string
          payload?: Json | null
        }
        Relationships: []
      }
      flow_state: {
        Row: {
          auth_code: string
          auth_code_issued_at: string | null
          authentication_method: string
          code_challenge: string
          code_challenge_method: Database["auth"]["Enums"]["code_challenge_method"]
          created_at: string | null
          id: string
          provider_access_token: string | null
          provider_refresh_token: string | null
          provider_type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auth_code: string
          auth_code_issued_at?: string | null
          authentication_method: string
          code_challenge: string
          code_challenge_method: Database["auth"]["Enums"]["code_challenge_method"]
          created_at?: string | null
          id: string
          provider_access_token?: string | null
          provider_refresh_token?: string | null
          provider_type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auth_code?: string
          auth_code_issued_at?: string | null
          authentication_method?: string
          code_challenge?: string
          code_challenge_method?: Database["auth"]["Enums"]["code_challenge_method"]
          created_at?: string | null
          id?: string
          provider_access_token?: string | null
          provider_refresh_token?: string | null
          provider_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      identities: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          identity_data: Json
          last_sign_in_at: string | null
          provider: string
          provider_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          identity_data: Json
          last_sign_in_at?: string | null
          provider: string
          provider_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          identity_data?: Json
          last_sign_in_at?: string | null
          provider?: string
          provider_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "identities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      instances: {
        Row: {
          created_at: string | null
          id: string
          raw_base_config: string | null
          updated_at: string | null
          uuid: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          raw_base_config?: string | null
          updated_at?: string | null
          uuid?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          raw_base_config?: string | null
          updated_at?: string | null
          uuid?: string | null
        }
        Relationships: []
      }
      mfa_amr_claims: {
        Row: {
          authentication_method: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          authentication_method: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
        }
        Update: {
          authentication_method?: string
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mfa_amr_claims_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_challenges: {
        Row: {
          created_at: string
          factor_id: string
          id: string
          ip_address: unknown
          otp_code: string | null
          verified_at: string | null
          web_authn_session_data: Json | null
        }
        Insert: {
          created_at: string
          factor_id: string
          id: string
          ip_address: unknown
          otp_code?: string | null
          verified_at?: string | null
          web_authn_session_data?: Json | null
        }
        Update: {
          created_at?: string
          factor_id?: string
          id?: string
          ip_address?: unknown
          otp_code?: string | null
          verified_at?: string | null
          web_authn_session_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mfa_challenges_auth_factor_id_fkey"
            columns: ["factor_id"]
            isOneToOne: false
            referencedRelation: "mfa_factors"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_factors: {
        Row: {
          created_at: string
          factor_type: Database["auth"]["Enums"]["factor_type"]
          friendly_name: string | null
          id: string
          last_challenged_at: string | null
          phone: string | null
          secret: string | null
          status: Database["auth"]["Enums"]["factor_status"]
          updated_at: string
          user_id: string
          web_authn_aaguid: string | null
          web_authn_credential: Json | null
        }
        Insert: {
          created_at: string
          factor_type: Database["auth"]["Enums"]["factor_type"]
          friendly_name?: string | null
          id: string
          last_challenged_at?: string | null
          phone?: string | null
          secret?: string | null
          status: Database["auth"]["Enums"]["factor_status"]
          updated_at: string
          user_id: string
          web_authn_aaguid?: string | null
          web_authn_credential?: Json | null
        }
        Update: {
          created_at?: string
          factor_type?: Database["auth"]["Enums"]["factor_type"]
          friendly_name?: string | null
          id?: string
          last_challenged_at?: string | null
          phone?: string | null
          secret?: string | null
          status?: Database["auth"]["Enums"]["factor_status"]
          updated_at?: string
          user_id?: string
          web_authn_aaguid?: string | null
          web_authn_credential?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mfa_factors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_clients: {
        Row: {
          client_id: string
          client_name: string | null
          client_secret_hash: string
          client_uri: string | null
          created_at: string
          deleted_at: string | null
          grant_types: string
          id: string
          logo_uri: string | null
          redirect_uris: string
          registration_type: Database["auth"]["Enums"]["oauth_registration_type"]
          updated_at: string
        }
        Insert: {
          client_id: string
          client_name?: string | null
          client_secret_hash: string
          client_uri?: string | null
          created_at?: string
          deleted_at?: string | null
          grant_types: string
          id: string
          logo_uri?: string | null
          redirect_uris: string
          registration_type: Database["auth"]["Enums"]["oauth_registration_type"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_name?: string | null
          client_secret_hash?: string
          client_uri?: string | null
          created_at?: string
          deleted_at?: string | null
          grant_types?: string
          id?: string
          logo_uri?: string | null
          redirect_uris?: string
          registration_type?: Database["auth"]["Enums"]["oauth_registration_type"]
          updated_at?: string
        }
        Relationships: []
      }
      one_time_tokens: {
        Row: {
          created_at: string
          id: string
          relates_to: string
          token_hash: string
          token_type: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          relates_to: string
          token_hash: string
          token_type: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          relates_to?: string
          token_hash?: string
          token_type?: Database["auth"]["Enums"]["one_time_token_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_time_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      refresh_tokens: {
        Row: {
          created_at: string | null
          id: number
          instance_id: string | null
          parent: string | null
          revoked: boolean | null
          session_id: string | null
          token: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          instance_id?: string | null
          parent?: string | null
          revoked?: boolean | null
          session_id?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          instance_id?: string | null
          parent?: string | null
          revoked?: boolean | null
          session_id?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refresh_tokens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      saml_providers: {
        Row: {
          attribute_mapping: Json | null
          created_at: string | null
          entity_id: string
          id: string
          metadata_url: string | null
          metadata_xml: string
          name_id_format: string | null
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          attribute_mapping?: Json | null
          created_at?: string | null
          entity_id: string
          id: string
          metadata_url?: string | null
          metadata_xml: string
          name_id_format?: string | null
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          attribute_mapping?: Json | null
          created_at?: string | null
          entity_id?: string
          id?: string
          metadata_url?: string | null
          metadata_xml?: string
          name_id_format?: string | null
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saml_providers_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            isOneToOne: false
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      saml_relay_states: {
        Row: {
          created_at: string | null
          flow_state_id: string | null
          for_email: string | null
          id: string
          redirect_to: string | null
          request_id: string
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          flow_state_id?: string | null
          for_email?: string | null
          id: string
          redirect_to?: string | null
          request_id: string
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          flow_state_id?: string | null
          for_email?: string | null
          id?: string
          redirect_to?: string | null
          request_id?: string
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saml_relay_states_flow_state_id_fkey"
            columns: ["flow_state_id"]
            isOneToOne: false
            referencedRelation: "flow_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saml_relay_states_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            isOneToOne: false
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          version: string
        }
        Insert: {
          version: string
        }
        Update: {
          version?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          aal: Database["auth"]["Enums"]["aal_level"] | null
          created_at: string | null
          factor_id: string | null
          id: string
          ip: unknown | null
          not_after: string | null
          refreshed_at: string | null
          tag: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          aal?: Database["auth"]["Enums"]["aal_level"] | null
          created_at?: string | null
          factor_id?: string | null
          id: string
          ip?: unknown | null
          not_after?: string | null
          refreshed_at?: string | null
          tag?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          aal?: Database["auth"]["Enums"]["aal_level"] | null
          created_at?: string | null
          factor_id?: string | null
          id?: string
          ip?: unknown | null
          not_after?: string | null
          refreshed_at?: string | null
          tag?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_domains: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          sso_provider_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          id: string
          sso_provider_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          sso_provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sso_domains_sso_provider_id_fkey"
            columns: ["sso_provider_id"]
            isOneToOne: false
            referencedRelation: "sso_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_providers: {
        Row: {
          created_at: string | null
          disabled: boolean | null
          id: string
          resource_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          disabled?: boolean | null
          id: string
          resource_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          disabled?: boolean | null
          id?: string
          resource_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          aud: string | null
          banned_until: string | null
          confirmation_sent_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          email_change: string | null
          email_change_confirm_status: number | null
          email_change_sent_at: string | null
          email_change_token_current: string | null
          email_change_token_new: string | null
          email_confirmed_at: string | null
          encrypted_password: string | null
          id: string
          instance_id: string | null
          invited_at: string | null
          is_anonymous: boolean
          is_sso_user: boolean
          is_super_admin: boolean | null
          last_sign_in_at: string | null
          phone: string | null
          phone_change: string | null
          phone_change_sent_at: string | null
          phone_change_token: string | null
          phone_confirmed_at: string | null
          raw_app_meta_data: Json | null
          raw_user_meta_data: Json | null
          reauthentication_sent_at: string | null
          reauthentication_token: string | null
          recovery_sent_at: string | null
          recovery_token: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id: string
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean
          is_sso_user?: boolean
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          aud?: string | null
          banned_until?: string | null
          confirmation_sent_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          email_change?: string | null
          email_change_confirm_status?: number | null
          email_change_sent_at?: string | null
          email_change_token_current?: string | null
          email_change_token_new?: string | null
          email_confirmed_at?: string | null
          encrypted_password?: string | null
          id?: string
          instance_id?: string | null
          invited_at?: string | null
          is_anonymous?: boolean
          is_sso_user?: boolean
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_sent_at?: string | null
          phone_change_token?: string | null
          phone_confirmed_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          reauthentication_sent_at?: string | null
          reauthentication_token?: string | null
          recovery_sent_at?: string | null
          recovery_token?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      jwt: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      aal_level: "aal1" | "aal2" | "aal3"
      code_challenge_method: "s256" | "plain"
      factor_status: "unverified" | "verified"
      factor_type: "totp" | "webauthn" | "phone"
      oauth_registration_type: "dynamic" | "manual"
      one_time_token_type:
        | "confirmation_token"
        | "reauthentication_token"
        | "recovery_token"
        | "email_change_token_new"
        | "email_change_token_current"
        | "phone_change_token"
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          format: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          format?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_level: {
        Args: { name: string }
        Returns: number
      }
      get_prefix: {
        Args: { name: string }
        Returns: string
      }
      get_prefixes: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS"
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
  auth: {
    Enums: {
      aal_level: ["aal1", "aal2", "aal3"],
      code_challenge_method: ["s256", "plain"],
      factor_status: ["unverified", "verified"],
      factor_type: ["totp", "webauthn", "phone"],
      oauth_registration_type: ["dynamic", "manual"],
      one_time_token_type: [
        "confirmation_token",
        "reauthentication_token",
        "recovery_token",
        "email_change_token_new",
        "email_change_token_current",
        "phone_change_token",
      ],
    },
  },
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
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS"],
    },
  },
} as const
