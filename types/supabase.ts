// Hand-written to match supabase/migrations/*.sql (Foundation schema).
// No live Supabase project is linked in this environment, so this could not be
// produced via `supabase gen types typescript` — regenerate with that command
// once a project is linked, and this file should come out equivalent.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      currencies: {
        Row: {
          id: string
          code: string
          numeric_code: string
          name: string
          symbol: string
          decimal_places: number
          minor_unit: string | null
          rounding_mode: string
          format_pattern: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
          version: number
          metadata: Json
        }
        Insert: {
          id?: string
          code: string
          numeric_code: string
          name: string
          symbol: string
          decimal_places: number
          minor_unit?: string | null
          rounding_mode?: string
          format_pattern?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          version?: number
          metadata?: Json
        }
        Update: {
          id?: string
          code?: string
          numeric_code?: string
          name?: string
          symbol?: string
          decimal_places?: number
          minor_unit?: string | null
          rounding_mode?: string
          format_pattern?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          version?: number
          metadata?: Json
        }
        Relationships: []
      }
      languages: {
        Row: {
          id: string
          code: string
          locale: string
          name: string
          native_name: string
          text_direction: string
          is_supported: boolean
          is_default: boolean
          status: string
          created_at: string
          updated_at: string
          deleted_at: string | null
          version: number
          metadata: Json
        }
        Insert: {
          id?: string
          code: string
          locale: string
          name: string
          native_name: string
          text_direction?: string
          is_supported?: boolean
          is_default?: boolean
          status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          version?: number
          metadata?: Json
        }
        Update: {
          id?: string
          code?: string
          locale?: string
          name?: string
          native_name?: string
          text_direction?: string
          is_supported?: boolean
          is_default?: boolean
          status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          version?: number
          metadata?: Json
        }
        Relationships: []
      }
      countries: {
        Row: {
          id: string
          code: string
          code3: string
          numeric_code: string | null
          name: string
          native_name: string | null
          phone_code: string | null
          capital: string | null
          continent: string | null
          currency_code: string
          timezone_default: string | null
          locale: string | null
          flag_emoji: string | null
          flag_svg_url: string | null
          is_supported: boolean
          status: string
          created_at: string
          updated_at: string
          deleted_at: string | null
          version: number
          metadata: Json
        }
        Insert: {
          id?: string
          code: string
          code3: string
          numeric_code?: string | null
          name: string
          native_name?: string | null
          phone_code?: string | null
          capital?: string | null
          continent?: string | null
          currency_code: string
          timezone_default?: string | null
          locale?: string | null
          flag_emoji?: string | null
          flag_svg_url?: string | null
          is_supported?: boolean
          status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          version?: number
          metadata?: Json
        }
        Update: {
          id?: string
          code?: string
          code3?: string
          numeric_code?: string | null
          name?: string
          native_name?: string | null
          phone_code?: string | null
          capital?: string | null
          continent?: string | null
          currency_code?: string
          timezone_default?: string | null
          locale?: string | null
          flag_emoji?: string | null
          flag_svg_url?: string | null
          is_supported?: boolean
          status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          version?: number
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "countries_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      time_zones: {
        Row: {
          id: string
          code: string
          name: string
          utc_offset_minutes: number
          supports_dst: boolean
          country_code: string | null
          status: string
          created_at: string
          updated_at: string
          deleted_at: string | null
          version: number
          metadata: Json
        }
        Insert: {
          id?: string
          code: string
          name: string
          utc_offset_minutes: number
          supports_dst?: boolean
          country_code?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          version?: number
          metadata?: Json
        }
        Update: {
          id?: string
          code?: string
          name?: string
          utc_offset_minutes?: number
          supports_dst?: boolean
          country_code?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          version?: number
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "time_zones_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      users: {
        Row: {
          id: string
          auth_user_id: string
          email: string
          username: string | null
          display_name: string
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          phone: string | null
          birth_date: string | null
          gender: string | null
          language_code: string
          timezone_id: string | null
          country_code: string | null
          default_currency_code: string
          status: string
          email_verified: boolean
          phone_verified: boolean
          two_factor_enabled: boolean
          last_login_at: string | null
          last_active_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          created_by: string | null
          updated_by: string | null
          deleted_by: string | null
          version: number
          metadata: Json
        }
        Insert: {
          id?: string
          auth_user_id: string
          email: string
          username?: string | null
          display_name: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          birth_date?: string | null
          gender?: string | null
          language_code?: string
          timezone_id?: string | null
          country_code?: string | null
          default_currency_code?: string
          status?: string
          email_verified?: boolean
          phone_verified?: boolean
          two_factor_enabled?: boolean
          last_login_at?: string | null
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          deleted_by?: string | null
          version?: number
          metadata?: Json
        }
        Update: {
          id?: string
          auth_user_id?: string
          email?: string
          username?: string | null
          display_name?: string
          first_name?: string | null
          last_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          birth_date?: string | null
          gender?: string | null
          language_code?: string
          timezone_id?: string | null
          country_code?: string | null
          default_currency_code?: string
          status?: string
          email_verified?: boolean
          phone_verified?: boolean
          two_factor_enabled?: boolean
          last_login_at?: string | null
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          deleted_by?: string | null
          version?: number
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "users_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "users_timezone_id_fkey"
            columns: ["timezone_id"]
            isOneToOne: false
            referencedRelation: "time_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "users_default_currency_code_fkey"
            columns: ["default_currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_calendars: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          start_month: number
          start_day: number
          months_in_year: number
          calendar_type: string
          is_default: boolean
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
          version: number
          metadata: Json
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string | null
          start_month: number
          start_day?: number
          months_in_year?: number
          calendar_type?: string
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          version?: number
          metadata?: Json
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string | null
          start_month?: number
          start_day?: number
          months_in_year?: number
          calendar_type?: string
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          version?: number
          metadata?: Json
        }
        Relationships: []
      }
      fiscal_periods: {
        Row: {
          id: string
          fiscal_calendar_id: string
          fiscal_year: number
          period_number: number
          period_code: string
          period_name: string
          start_date: string
          end_date: string
          period_type: string
          status: string
          closed_at: string | null
          closed_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          version: number
          metadata: Json
        }
        Insert: {
          id?: string
          fiscal_calendar_id: string
          fiscal_year: number
          period_number: number
          period_code: string
          period_name: string
          start_date: string
          end_date: string
          period_type?: string
          status?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          version?: number
          metadata?: Json
        }
        Update: {
          id?: string
          fiscal_calendar_id?: string
          fiscal_year?: number
          period_number?: number
          period_code?: string
          period_name?: string
          start_date?: string
          end_date?: string
          period_type?: string
          status?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          version?: number
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_periods_fiscal_calendar_id_fkey"
            columns: ["fiscal_calendar_id"]
            isOneToOne: false
            referencedRelation: "fiscal_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_periods_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          id: string
          code: string
          name: string
          display_name: string | null
          owner_user_id: string
          default_language_code: string
          default_currency_code: string
          default_timezone_id: string
          status: string
          created_at: string
          updated_at: string
          deleted_at: string | null
          created_by: string | null
          updated_by: string | null
          deleted_by: string | null
          version: number
          metadata: Json
        }
        Insert: {
          id?: string
          code: string
          name: string
          display_name?: string | null
          owner_user_id: string
          default_language_code: string
          default_currency_code: string
          default_timezone_id: string
          status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          deleted_by?: string | null
          version?: number
          metadata?: Json
        }
        Update: {
          id?: string
          code?: string
          name?: string
          display_name?: string | null
          owner_user_id?: string
          default_language_code?: string
          default_currency_code?: string
          default_timezone_id?: string
          status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          deleted_by?: string | null
          version?: number
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "tenants_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_default_language_code_fkey"
            columns: ["default_language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "tenants_default_currency_code_fkey"
            columns: ["default_currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "tenants_default_timezone_id_fkey"
            columns: ["default_timezone_id"]
            isOneToOne: false
            referencedRelation: "time_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          id: string
          tenant_id: string
          code: string
          name: string
          legal_name: string | null
          organization_type: string
          registration_number: string | null
          tax_number: string | null
          email: string | null
          phone: string | null
          website: string | null
          country_code: string | null
          currency_code: string
          timezone_id: string
          fiscal_calendar_id: string
          owner_user_id: string
          status: string
          created_at: string
          updated_at: string
          deleted_at: string | null
          created_by: string | null
          updated_by: string | null
          deleted_by: string | null
          version: number
          metadata: Json
        }
        Insert: {
          id?: string
          tenant_id: string
          code: string
          name: string
          legal_name?: string | null
          organization_type: string
          registration_number?: string | null
          tax_number?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          country_code?: string | null
          currency_code: string
          timezone_id: string
          fiscal_calendar_id: string
          owner_user_id: string
          status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          deleted_by?: string | null
          version?: number
          metadata?: Json
        }
        Update: {
          id?: string
          tenant_id?: string
          code?: string
          name?: string
          legal_name?: string | null
          organization_type?: string
          registration_number?: string | null
          tax_number?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          country_code?: string | null
          currency_code?: string
          timezone_id?: string
          fiscal_calendar_id?: string
          owner_user_id?: string
          status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          deleted_by?: string | null
          version?: number
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "organizations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "organizations_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "organizations_timezone_id_fkey"
            columns: ["timezone_id"]
            isOneToOne: false
            referencedRelation: "time_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_fiscal_calendar_id_fkey"
            columns: ["fiscal_calendar_id"]
            isOneToOne: false
            referencedRelation: "fiscal_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          id: string
          tenant_id: string
          code: string
          name: string
          owner_user_id: string
          country_code: string | null
          currency_code: string
          timezone_id: string
          fiscal_calendar_id: string
          status: string
          created_at: string
          updated_at: string
          deleted_at: string | null
          created_by: string | null
          updated_by: string | null
          deleted_by: string | null
          version: number
          metadata: Json
        }
        Insert: {
          id?: string
          tenant_id: string
          code: string
          name: string
          owner_user_id: string
          country_code?: string | null
          currency_code: string
          timezone_id: string
          fiscal_calendar_id: string
          status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          deleted_by?: string | null
          version?: number
          metadata?: Json
        }
        Update: {
          id?: string
          tenant_id?: string
          code?: string
          name?: string
          owner_user_id?: string
          country_code?: string | null
          currency_code?: string
          timezone_id?: string
          fiscal_calendar_id?: string
          status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          deleted_by?: string | null
          version?: number
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "households_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "households_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "households_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "households_timezone_id_fkey"
            columns: ["timezone_id"]
            isOneToOne: false
            referencedRelation: "time_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "households_fiscal_calendar_id_fkey"
            columns: ["fiscal_calendar_id"]
            isOneToOne: false
            referencedRelation: "fiscal_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "households_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          scope: string
          is_system: boolean
          is_default: boolean
          priority: number
          status: string
          created_at: string
          updated_at: string
          deleted_at: string | null
          created_by: string | null
          updated_by: string | null
          deleted_by: string | null
          version: number
          metadata: Json
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string | null
          scope?: string
          is_system?: boolean
          is_default?: boolean
          priority?: number
          status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          deleted_by?: string | null
          version?: number
          metadata?: Json
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string | null
          scope?: string
          is_system?: boolean
          is_default?: boolean
          priority?: number
          status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          deleted_by?: string | null
          version?: number
          metadata?: Json
        }
        Relationships: []
      }
      permissions: {
        Row: {
          id: string
          code: string
          resource: string
          action: string
          scope: string
          name: string
          description: string | null
          module: string
          is_system: boolean
          status: string
          created_at: string
          updated_at: string
          deleted_at: string | null
          created_by: string | null
          updated_by: string | null
          deleted_by: string | null
          version: number
          metadata: Json
        }
        Insert: {
          id?: string
          code: string
          resource: string
          action: string
          scope?: string
          name: string
          description?: string | null
          module: string
          is_system?: boolean
          status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          deleted_by?: string | null
          version?: number
          metadata?: Json
        }
        Update: {
          id?: string
          code?: string
          resource?: string
          action?: string
          scope?: string
          name?: string
          description?: string | null
          module?: string
          is_system?: boolean
          status?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          deleted_by?: string | null
          version?: number
          metadata?: Json
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          id: string
          role_id: string
          permission_id: string
          effect: string
          created_at: string
          updated_at: string
          deleted_at: string | null
          created_by: string | null
          updated_by: string | null
          deleted_by: string | null
          version: number
          metadata: Json
        }
        Insert: {
          id?: string
          role_id: string
          permission_id: string
          effect?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          deleted_by?: string | null
          version?: number
          metadata?: Json
        }
        Update: {
          id?: string
          role_id?: string
          permission_id?: string
          effect?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          deleted_by?: string | null
          version?: number
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          id: string
          user_id: string
          household_id: string | null
          organization_id: string | null
          role_id: string
          invitation_email: string | null
          invitation_token: string | null
          invited_by: string | null
          invited_at: string | null
          accepted_at: string | null
          rejected_at: string | null
          left_at: string | null
          status: string
          is_owner: boolean
          is_default: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
          created_by: string | null
          updated_by: string | null
          deleted_by: string | null
          version: number
          metadata: Json
        }
        Insert: {
          id?: string
          user_id: string
          household_id?: string | null
          organization_id?: string | null
          role_id: string
          invitation_email?: string | null
          invitation_token?: string | null
          invited_by?: string | null
          invited_at?: string | null
          accepted_at?: string | null
          rejected_at?: string | null
          left_at?: string | null
          status?: string
          is_owner?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          deleted_by?: string | null
          version?: number
          metadata?: Json
        }
        Update: {
          id?: string
          user_id?: string
          household_id?: string | null
          organization_id?: string | null
          role_id?: string
          invitation_email?: string | null
          invitation_token?: string | null
          invited_by?: string | null
          invited_at?: string | null
          accepted_at?: string | null
          rejected_at?: string | null
          left_at?: string | null
          status?: string
          is_owner?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          created_by?: string | null
          updated_by?: string | null
          deleted_by?: string | null
          version?: number
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          language_code: string
          currency_code: string
          timezone_id: string
          date_format: string
          time_format: string
          week_starts_on: number
          fiscal_year_start_month: number
          theme: string
          accent_color: string | null
          number_format: string
          decimal_separator: string
          thousand_separator: string
          dashboard_layout: string
          email_notifications: boolean
          push_notifications: boolean
          marketing_notifications: boolean
          auto_categorization: boolean
          created_at: string
          updated_at: string
          version: number
          metadata: Json
        }
        Insert: {
          id?: string
          user_id: string
          language_code: string
          currency_code: string
          timezone_id: string
          date_format?: string
          time_format?: string
          week_starts_on?: number
          fiscal_year_start_month?: number
          theme?: string
          accent_color?: string | null
          number_format?: string
          decimal_separator?: string
          thousand_separator?: string
          dashboard_layout?: string
          email_notifications?: boolean
          push_notifications?: boolean
          marketing_notifications?: boolean
          auto_categorization?: boolean
          created_at?: string
          updated_at?: string
          version?: number
          metadata?: Json
        }
        Update: {
          id?: string
          user_id?: string
          language_code?: string
          currency_code?: string
          timezone_id?: string
          date_format?: string
          time_format?: string
          week_starts_on?: number
          fiscal_year_start_month?: number
          theme?: string
          accent_color?: string | null
          number_format?: string
          decimal_separator?: string
          thousand_separator?: string
          dashboard_layout?: string
          email_notifications?: boolean
          push_notifications?: boolean
          marketing_notifications?: boolean
          auto_categorization?: boolean
          created_at?: string
          updated_at?: string
          version?: number
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_preferences_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_preferences_timezone_id_fkey"
            columns: ["timezone_id"]
            isOneToOne: false
            referencedRelation: "time_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          category: string
          enabled_by_default: boolean
          status: string
          created_at: string
          updated_at: string
          version: number
          metadata: Json
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string | null
          category: string
          enabled_by_default?: boolean
          status?: string
          created_at?: string
          updated_at?: string
          version?: number
          metadata?: Json
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string | null
          category?: string
          enabled_by_default?: boolean
          status?: string
          created_at?: string
          updated_at?: string
          version?: number
          metadata?: Json
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string
          key: string
          value: string | null
          value_type: string
          category: string
          description: string | null
          is_public: boolean
          editable: boolean
          created_at: string
          updated_at: string
          version: number
          metadata: Json
        }
        Insert: {
          id?: string
          key: string
          value?: string | null
          value_type?: string
          category: string
          description?: string | null
          is_public?: boolean
          editable?: boolean
          created_at?: string
          updated_at?: string
          version?: number
          metadata?: Json
        }
        Update: {
          id?: string
          key?: string
          value?: string | null
          value_type?: string
          category?: string
          description?: string | null
          is_public?: boolean
          editable?: boolean
          created_at?: string
          updated_at?: string
          version?: number
          metadata?: Json
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          id: string
          from_currency_code: string
          to_currency_code: string
          exchange_rate: number
          inverse_rate: number | null
          rate_type: string
          provider: string | null
          effective_from: string
          effective_to: string | null
          fetched_at: string | null
          is_official: boolean
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
          version: number
          metadata: Json
        }
        Insert: {
          id?: string
          from_currency_code: string
          to_currency_code: string
          exchange_rate: number
          inverse_rate?: number | null
          rate_type?: string
          provider?: string | null
          effective_from: string
          effective_to?: string | null
          fetched_at?: string | null
          is_official?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          version?: number
          metadata?: Json
        }
        Update: {
          id?: string
          from_currency_code?: string
          to_currency_code?: string
          exchange_rate?: number
          inverse_rate?: number | null
          rate_type?: string
          provider?: string | null
          effective_from?: string
          effective_to?: string | null
          fetched_at?: string | null
          is_official?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          version?: number
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_from_currency_code_fkey"
            columns: ["from_currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "exchange_rates_to_currency_code_fkey"
            columns: ["to_currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_active_co_member: {
        Args: {
          p_user_id: string
          p_household_id: string | null
          p_organization_id: string | null
        }
        Returns: boolean
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
