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
      accounting_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          end_date: string
          id: string
          ledger_id: string | null
          metadata: Json
          period_name: string
          period_type: string
          start_date: string
          status: string
          workspace_id: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          ledger_id?: string | null
          metadata?: Json
          period_name: string
          period_type: string
          start_date: string
          status?: string
          workspace_id: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          ledger_id?: string | null
          metadata?: Json
          period_name?: string
          period_type?: string
          start_date?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_periods_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_periods_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log_translations: {
        Row: {
          action_name: string
          description: string | null
          id: string
          locale: string
          log_id: string | null
        }
        Insert: {
          action_name: string
          description?: string | null
          id?: string
          locale: string
          log_id?: string | null
        }
        Update: {
          action_name?: string
          description?: string | null
          id?: string
          locale?: string
          log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_translations_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "activity_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          activity_type: string
          actor_id: string | null
          amount: number | null
          created_at: string
          currency_code: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          ledger_id: string | null
          metadata: Json
          organization_id: string
          read_at: string | null
          workspace_id: string | null
        }
        Insert: {
          activity_type: string
          actor_id?: string | null
          amount?: number | null
          created_at?: string
          currency_code?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          ledger_id?: string | null
          metadata?: Json
          organization_id: string
          read_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          activity_type?: string
          actor_id?: string | null
          amount?: number | null
          created_at?: string
          currency_code?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          ledger_id?: string | null
          metadata?: Json
          organization_id?: string
          read_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_snapshots: {
        Row: {
          avg_daily_expense: number | null
          budget_utilization: Json
          by_category: Json
          by_funding_source: Json
          by_household_member: Json
          by_payment_instrument: Json
          computed_at: string
          created_at: string
          currency_code: string
          expense_scope: string | null
          household_member_id: string | null
          id: string
          is_final: boolean
          ledger_id: string
          metadata: Json
          net_balance: number | null
          period_end: string
          period_label: string
          period_start: string
          snapshot_type: string
          top_merchants: Json
          total_expense: number
          total_income: number
          transaction_count: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          avg_daily_expense?: number | null
          budget_utilization?: Json
          by_category?: Json
          by_funding_source?: Json
          by_household_member?: Json
          by_payment_instrument?: Json
          computed_at?: string
          created_at?: string
          currency_code: string
          expense_scope?: string | null
          household_member_id?: string | null
          id?: string
          is_final?: boolean
          ledger_id: string
          metadata?: Json
          net_balance?: number | null
          period_end: string
          period_label: string
          period_start: string
          snapshot_type: string
          top_merchants?: Json
          total_expense?: number
          total_income?: number
          transaction_count?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          avg_daily_expense?: number | null
          budget_utilization?: Json
          by_category?: Json
          by_funding_source?: Json
          by_household_member?: Json
          by_payment_instrument?: Json
          computed_at?: string
          created_at?: string
          currency_code?: string
          expense_scope?: string | null
          household_member_id?: string | null
          id?: string
          is_final?: boolean
          ledger_id?: string
          metadata?: Json
          net_balance?: number | null
          period_end?: string
          period_label?: string
          period_start?: string
          snapshot_type?: string
          top_merchants?: Json
          total_expense?: number
          total_income?: number
          transaction_count?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_snapshots_household_member_id_fkey"
            columns: ["household_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_snapshots_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_snapshots_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflow_translations: {
        Row: {
          id: string
          locale: string
          name: string
          workflow_id: string | null
        }
        Insert: {
          id?: string
          locale: string
          name: string
          workflow_id?: string | null
        }
        Update: {
          id?: string
          locale?: string
          name?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflow_translations_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflows: {
        Row: {
          assigned_to: string | null
          created_at: string
          current_step: number
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          due_at: string | null
          entity_id: string
          entity_type: string
          id: string
          ledger_id: string | null
          metadata: Json
          status: Database["public"]["Enums"]["approval_status"]
          total_steps: number
          trigger_amount: number | null
          trigger_currency: string | null
          updated_at: string
          workflow_name: string | null
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          current_step?: number
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          due_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ledger_id?: string | null
          metadata?: Json
          status?: Database["public"]["Enums"]["approval_status"]
          total_steps?: number
          trigger_amount?: number | null
          trigger_currency?: string | null
          updated_at?: string
          workflow_name?: string | null
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          current_step?: number
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          due_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ledger_id?: string | null
          metadata?: Json
          status?: Database["public"]["Enums"]["approval_status"]
          total_steps?: number
          trigger_amount?: number | null
          trigger_currency?: string | null
          updated_at?: string
          workflow_name?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflows_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflows_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log_translations: {
        Row: {
          action_name: string
          description: string | null
          id: string
          locale: string
          log_id: string | null
        }
        Insert: {
          action_name: string
          description?: string | null
          id?: string
          locale: string
          log_id?: string | null
        }
        Update: {
          action_name?: string
          description?: string | null
          id?: string
          locale?: string
          log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_translations_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "audit_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_ip: unknown
          actor_role: string | null
          actor_user_agent: string | null
          created_at: string
          description: string | null
          diff: Json | null
          entity_id: string | null
          entity_ref: string | null
          entity_type: string
          event_type: string
          id: string
          is_sensitive: boolean
          ledger_id: string | null
          metadata: Json
          new_values: Json | null
          old_values: Json | null
          organization_id: string
          session_id: string | null
          severity: string
          workspace_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_ip?: unknown
          actor_role?: string | null
          actor_user_agent?: string | null
          created_at?: string
          description?: string | null
          diff?: Json | null
          entity_id?: string | null
          entity_ref?: string | null
          entity_type: string
          event_type: string
          id?: string
          is_sensitive?: boolean
          ledger_id?: string | null
          metadata?: Json
          new_values?: Json | null
          old_values?: Json | null
          organization_id: string
          session_id?: string | null
          severity?: string
          workspace_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_ip?: unknown
          actor_role?: string | null
          actor_user_agent?: string | null
          created_at?: string
          description?: string | null
          diff?: Json | null
          entity_id?: string | null
          entity_ref?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          is_sensitive?: boolean
          ledger_id?: string | null
          metadata?: Json
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string
          session_id?: string | null
          severity?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_v3_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_v3_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_v3_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_imports: {
        Row: {
          account_number_masked: string | null
          bank_code: string | null
          bank_name: string | null
          closing_balance: number | null
          created_at: string
          currency_code: string | null
          financial_account_id: string | null
          format_detected: string | null
          id: string
          import_job_id: string
          metadata: Json
          opening_balance: number | null
          statement_period_end: string | null
          statement_period_start: string | null
        }
        Insert: {
          account_number_masked?: string | null
          bank_code?: string | null
          bank_name?: string | null
          closing_balance?: number | null
          created_at?: string
          currency_code?: string | null
          financial_account_id?: string | null
          format_detected?: string | null
          id?: string
          import_job_id: string
          metadata?: Json
          opening_balance?: number | null
          statement_period_end?: string | null
          statement_period_start?: string | null
        }
        Update: {
          account_number_masked?: string | null
          bank_code?: string | null
          bank_name?: string | null
          closing_balance?: number | null
          created_at?: string
          currency_code?: string | null
          financial_account_id?: string | null
          format_detected?: string | null
          id?: string
          import_job_id?: string
          metadata?: Json
          opening_balance?: number | null
          statement_period_end?: string | null
          statement_period_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_imports_financial_account_id_fkey"
            columns: ["financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_imports_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_rows: {
        Row: {
          balance: number | null
          bank_statement_import_id: string
          created_at: string
          credit_amount: number | null
          currency_code: string | null
          debit_amount: number | null
          description: string | null
          id: string
          import_row_id: string | null
          is_reconciled: boolean
          metadata: Json
          posting_date: string | null
          reconciled_transaction_id: string | null
          reference_number: string | null
          row_number: number
          value_date: string | null
        }
        Insert: {
          balance?: number | null
          bank_statement_import_id: string
          created_at?: string
          credit_amount?: number | null
          currency_code?: string | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          import_row_id?: string | null
          is_reconciled?: boolean
          metadata?: Json
          posting_date?: string | null
          reconciled_transaction_id?: string | null
          reference_number?: string | null
          row_number: number
          value_date?: string | null
        }
        Update: {
          balance?: number | null
          bank_statement_import_id?: string
          created_at?: string
          credit_amount?: number | null
          currency_code?: string | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          import_row_id?: string | null
          is_reconciled?: boolean
          metadata?: Json
          posting_date?: string | null
          reconciled_transaction_id?: string | null
          reference_number?: string | null
          row_number?: number
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_rows_bank_statement_import_id_fkey"
            columns: ["bank_statement_import_id"]
            isOneToOne: false
            referencedRelation: "bank_statement_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_rows_import_row_id_fkey"
            columns: ["import_row_id"]
            isOneToOne: false
            referencedRelation: "import_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_rows_reconciled_transaction_id_fkey"
            columns: ["reconciled_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          budget_limit: number
          category_code: string | null
          category_type: string
          chart_of_account_id: string | null
          color: string | null
          created_at: string
          emoji: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_recurring: boolean
          is_shared: boolean
          is_system: boolean
          keywords: string[]
          metadata: Json
          parent_id: string | null
          path: string | null
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          budget_limit?: number
          category_code?: string | null
          category_type?: string
          chart_of_account_id?: string | null
          color?: string | null
          created_at?: string
          emoji?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          is_shared?: boolean
          is_system?: boolean
          keywords?: string[]
          metadata?: Json
          parent_id?: string | null
          path?: string | null
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          budget_limit?: number
          category_code?: string | null
          category_type?: string
          chart_of_account_id?: string | null
          color?: string | null
          created_at?: string
          emoji?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_recurring?: boolean
          is_shared?: boolean
          is_system?: boolean
          keywords?: string[]
          metadata?: Json
          parent_id?: string | null
          path?: string | null
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_chart_of_account_id_fkey"
            columns: ["chart_of_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "category_balances"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      category_rule_translations: {
        Row: {
          id: string
          locale: string
          name: string
          rule_id: string | null
        }
        Insert: {
          id?: string
          locale: string
          name: string
          rule_id?: string | null
        }
        Update: {
          id?: string
          locale?: string
          name?: string
          rule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_rule_translations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "category_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      category_rules: {
        Row: {
          category_id: string
          condition_tree: Json | null
          created_at: string
          id: string
          is_active: boolean
          is_system: boolean
          last_matched_at: string | null
          match_count: number
          match_field: string | null
          match_operator: string | null
          match_value: string | null
          match_value_secondary: string | null
          match_values: Json | null
          metadata: Json
          priority: number
          rule_name: string
          rule_type: string
          suggested_expense_scope: string | null
          suggested_payment_instrument_type: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          category_id: string
          condition_tree?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          last_matched_at?: string | null
          match_count?: number
          match_field?: string | null
          match_operator?: string | null
          match_value?: string | null
          match_value_secondary?: string | null
          match_values?: Json | null
          metadata?: Json
          priority?: number
          rule_name: string
          rule_type: string
          suggested_expense_scope?: string | null
          suggested_payment_instrument_type?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          category_id?: string
          condition_tree?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          last_matched_at?: string | null
          match_count?: number
          match_field?: string | null
          match_operator?: string | null
          match_value?: string | null
          match_value_secondary?: string | null
          match_values?: Json | null
          metadata?: Json
          priority?: number
          rule_name?: string
          rule_type?: string
          suggested_expense_scope?: string | null
          suggested_payment_instrument_type?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_balances"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "category_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      category_templates: {
        Row: {
          categories: Json
          created_at: string
          description_en: string | null
          description_ja: string | null
          description_vi: string | null
          id: string
          is_active: boolean
          is_system: boolean
          metadata: Json
          region: string | null
          rules: Json
          template_name: string
          template_name_en: string
          template_name_ja: string
          template_name_vi: string
          usage_count: number
          use_case: string | null
        }
        Insert: {
          categories?: Json
          created_at?: string
          description_en?: string | null
          description_ja?: string | null
          description_vi?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          metadata?: Json
          region?: string | null
          rules?: Json
          template_name: string
          template_name_en: string
          template_name_ja: string
          template_name_vi: string
          usage_count?: number
          use_case?: string | null
        }
        Update: {
          categories?: Json
          created_at?: string
          description_en?: string | null
          description_ja?: string | null
          description_vi?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          metadata?: Json
          region?: string | null
          rules?: Json
          template_name?: string
          template_name_en?: string
          template_name_ja?: string
          template_name_vi?: string
          usage_count?: number
          use_case?: string | null
        }
        Relationships: []
      }
      category_translations: {
        Row: {
          category_id: string | null
          description: string | null
          id: string
          locale: string
          name: string
        }
        Insert: {
          category_id?: string | null
          description?: string | null
          id?: string
          locale: string
          name: string
        }
        Update: {
          category_id?: string | null
          description?: string | null
          id?: string
          locale?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_balances"
            referencedColumns: ["group_id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_code: string
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          description_en: string | null
          description_ja: string | null
          description_vi: string | null
          id: string
          is_active: boolean
          is_system: boolean
          metadata: Json
          normal_balance: Database["public"]["Enums"]["normal_balance"]
          parent_id: string | null
          path: unknown
          updated_at: string
          workspace_id: string
        }
        Insert: {
          account_code: string
          account_type: Database["public"]["Enums"]["account_type"]
          created_at?: string
          description_en?: string | null
          description_ja?: string | null
          description_vi?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          metadata?: Json
          normal_balance: Database["public"]["Enums"]["normal_balance"]
          parent_id?: string | null
          path?: unknown
          updated_at?: string
          workspace_id: string
        }
        Update: {
          account_code?: string
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          description_en?: string | null
          description_ja?: string | null
          description_vi?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          metadata?: Json
          normal_balance?: Database["public"]["Enums"]["normal_balance"]
          parent_id?: string | null
          path?: unknown
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts_translations: {
        Row: {
          account_id: string | null
          account_name: string
          description: string | null
          id: string
          locale: string
        }
        Insert: {
          account_id?: string | null
          account_name: string
          description?: string | null
          id?: string
          locale: string
        }
        Update: {
          account_id?: string | null
          account_name?: string
          description?: string | null
          id?: string
          locale?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_translations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      device_verifications: {
        Row: {
          created_at: string
          device_id: string
          device_name: string | null
          id: string
          is_trusted: boolean
          last_login_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          device_name?: string | null
          id?: string
          is_trusted?: boolean
          last_login_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          device_name?: string | null
          id?: string
          is_trusted?: boolean
          last_login_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dimension_translations: {
        Row: {
          dimension_id: string | null
          id: string
          locale: string
          name: string
        }
        Insert: {
          dimension_id?: string | null
          id?: string
          locale: string
          name: string
        }
        Update: {
          dimension_id?: string | null
          id?: string
          locale?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "dimension_translations_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
        ]
      }
      dimension_value_translations: {
        Row: {
          id: string
          locale: string
          name: string
          value_id: string | null
        }
        Insert: {
          id?: string
          locale: string
          name: string
          value_id?: string | null
        }
        Update: {
          id?: string
          locale?: string
          name?: string
          value_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dimension_value_translations_value_id_fkey"
            columns: ["value_id"]
            isOneToOne: false
            referencedRelation: "dimension_values"
            referencedColumns: ["id"]
          },
        ]
      }
      dimension_values: {
        Row: {
          color: string | null
          created_at: string
          dimension_id: string
          id: string
          is_active: boolean
          metadata: Json
          sort_order: number
          value_key: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          dimension_id: string
          id?: string
          is_active?: boolean
          metadata?: Json
          sort_order?: number
          value_key: string
        }
        Update: {
          color?: string | null
          created_at?: string
          dimension_id?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          sort_order?: number
          value_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "dimension_values_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
        ]
      }
      dimensions: {
        Row: {
          created_at: string
          dimension_key: string
          id: string
          is_active: boolean
          is_required: boolean
          metadata: Json
          sort_order: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          dimension_key: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          metadata?: Json
          sort_order?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          dimension_key?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          metadata?: Json
          sort_order?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dimensions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          created_at: string
          from_currency: string
          id: string
          is_official: boolean
          metadata: Json
          rate: number
          rate_date: string
          source: string
          to_currency: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          from_currency: string
          id?: string
          is_official?: boolean
          metadata?: Json
          rate: number
          rate_date: string
          source?: string
          to_currency: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          from_currency?: string
          id?: string
          is_official?: boolean
          metadata?: Json
          rate?: number
          rate_date?: string
          source?: string
          to_currency?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_allocations: {
        Row: {
          allocation_type: string
          amount: number | null
          created_at: string
          expense_scope: string
          household_member_id: string | null
          id: string
          is_settled: boolean
          metadata: Json
          notes: string | null
          percentage: number | null
          settled_at: string | null
          settled_by_transaction_id: string | null
          transaction_id: string
          transaction_split_id: string | null
          weight: number | null
        }
        Insert: {
          allocation_type: string
          amount?: number | null
          created_at?: string
          expense_scope?: string
          household_member_id?: string | null
          id?: string
          is_settled?: boolean
          metadata?: Json
          notes?: string | null
          percentage?: number | null
          settled_at?: string | null
          settled_by_transaction_id?: string | null
          transaction_id: string
          transaction_split_id?: string | null
          weight?: number | null
        }
        Update: {
          allocation_type?: string
          amount?: number | null
          created_at?: string
          expense_scope?: string
          household_member_id?: string | null
          id?: string
          is_settled?: boolean
          metadata?: Json
          notes?: string | null
          percentage?: number | null
          settled_at?: string | null
          settled_by_transaction_id?: string | null
          transaction_id?: string
          transaction_split_id?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_allocations_household_member_id_fkey"
            columns: ["household_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_allocations_settled_by_transaction_id_fkey"
            columns: ["settled_by_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_allocations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_allocations_transaction_split_id_fkey"
            columns: ["transaction_split_id"]
            isOneToOne: false
            referencedRelation: "transaction_splits"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          account_name: string
          account_number_masked: string | null
          account_type: string
          chart_of_account_id: string | null
          color: string | null
          created_at: string
          credit_limit: number | null
          currency: string
          current_balance: number
          deleted_at: string | null
          icon: string | null
          id: string
          institution_code: string | null
          institution_name: string | null
          is_active: boolean
          is_tracked: boolean
          ledger_id: string
          metadata: Json
          payment_due_day: number | null
          statement_day: number | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number_masked?: string | null
          account_type: string
          chart_of_account_id?: string | null
          color?: string | null
          created_at?: string
          credit_limit?: number | null
          currency?: string
          current_balance?: number
          deleted_at?: string | null
          icon?: string | null
          id?: string
          institution_code?: string | null
          institution_name?: string | null
          is_active?: boolean
          is_tracked?: boolean
          ledger_id: string
          metadata?: Json
          payment_due_day?: number | null
          statement_day?: number | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number_masked?: string | null
          account_type?: string
          chart_of_account_id?: string | null
          color?: string | null
          created_at?: string
          credit_limit?: number | null
          currency?: string
          current_balance?: number
          deleted_at?: string | null
          icon?: string | null
          id?: string
          institution_code?: string | null
          institution_name?: string | null
          is_active?: boolean
          is_tracked?: boolean
          ledger_id?: string
          metadata?: Json
          payment_due_day?: number | null
          statement_day?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_accounts_chart_of_account_id_fkey"
            columns: ["chart_of_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_accounts_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_source_translations: {
        Row: {
          id: string
          locale: string
          name: string
          source_id: string | null
        }
        Insert: {
          id?: string
          locale: string
          name: string
          source_id?: string | null
        }
        Update: {
          id?: string
          locale?: string
          name?: string
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funding_source_translations_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "funding_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_sources: {
        Row: {
          created_at: string
          financial_account_id: string | null
          id: string
          institution: string | null
          is_active: boolean
          is_default: boolean
          ledger_id: string
          metadata: Json
          name: string
          payment_due_day: number | null
          payment_instrument_id: string | null
          priority_order: number
          rewards_currency: string | null
          rewards_rate: number | null
          settlement_day: number | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          financial_account_id?: string | null
          id?: string
          institution?: string | null
          is_active?: boolean
          is_default?: boolean
          ledger_id: string
          metadata?: Json
          name: string
          payment_due_day?: number | null
          payment_instrument_id?: string | null
          priority_order?: number
          rewards_currency?: string | null
          rewards_rate?: number | null
          settlement_day?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          financial_account_id?: string | null
          id?: string
          institution?: string | null
          is_active?: boolean
          is_default?: boolean
          ledger_id?: string
          metadata?: Json
          name?: string
          payment_due_day?: number | null
          payment_instrument_id?: string | null
          priority_order?: number
          rewards_currency?: string | null
          rewards_rate?: number | null
          settlement_day?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funding_sources_financial_account_id_fkey"
            columns: ["financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_sources_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_sources_payment_instrument_id_fkey"
            columns: ["payment_instrument_id"]
            isOneToOne: false
            referencedRelation: "payment_instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      group_ledgers: {
        Row: {
          group_id: string
          ledger_id: string
        }
        Insert: {
          group_id: string
          ledger_id: string
        }
        Update: {
          group_id?: string
          ledger_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_ledgers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_ledgers_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          created_at: string
          group_id: string
          id: string
          inherited_from: string | null
          joined_at: string
          permission_source: Database["public"]["Enums"]["permission_source"]
          permissions: string[] | null
          role: Database["public"]["Enums"]["membership_role"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          inherited_from?: string | null
          joined_at?: string
          permission_source?: Database["public"]["Enums"]["permission_source"]
          permissions?: string[] | null
          role: Database["public"]["Enums"]["membership_role"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          inherited_from?: string | null
          joined_at?: string
          permission_source?: Database["public"]["Enums"]["permission_source"]
          permissions?: string[] | null
          role?: Database["public"]["Enums"]["membership_role"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_memberships_inherited_from_fkey"
            columns: ["inherited_from"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          code: string
          created_at: string
          currency_policy: Database["public"]["Enums"]["currency_policy"]
          description: Json | null
          group_type: Database["public"]["Enums"]["group_type"]
          id: string
          level: number
          metadata: Json | null
          name: Json
          organization_id: string
          parent_id: string | null
          path: unknown
          reconciliation_mode: Database["public"]["Enums"]["reconciliation_mode"]
          status: Database["public"]["Enums"]["group_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          code: string
          created_at?: string
          currency_policy?: Database["public"]["Enums"]["currency_policy"]
          description?: Json | null
          group_type?: Database["public"]["Enums"]["group_type"]
          id?: string
          level?: number
          metadata?: Json | null
          name: Json
          organization_id: string
          parent_id?: string | null
          path: unknown
          reconciliation_mode?: Database["public"]["Enums"]["reconciliation_mode"]
          status?: Database["public"]["Enums"]["group_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          code?: string
          created_at?: string
          currency_policy?: Database["public"]["Enums"]["currency_policy"]
          description?: Json | null
          group_type?: Database["public"]["Enums"]["group_type"]
          id?: string
          level?: number
          metadata?: Json | null
          name?: Json
          organization_id?: string
          parent_id?: string | null
          path?: unknown
          reconciliation_mode?: Database["public"]["Enums"]["reconciliation_mode"]
          status?: Database["public"]["Enums"]["group_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          avatar_url: string | null
          color: string | null
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          metadata: Json
          organization_id: string
          relationship_type: string | null
          role: string
          sort_order: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          color?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          metadata?: Json
          organization_id: string
          relationship_type?: string | null
          role?: string
          sort_order?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          color?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          organization_id?: string
          relationship_type?: string | null
          role?: string
          sort_order?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          batch_number: number
          created_at: string
          error_message: string | null
          id: string
          import_job_id: string
          metadata: Json
          processed_at: string | null
          row_end: number
          row_start: number
          status: string
        }
        Insert: {
          batch_number: number
          created_at?: string
          error_message?: string | null
          id?: string
          import_job_id: string
          metadata?: Json
          processed_at?: string | null
          row_end: number
          row_start: number
          status?: string
        }
        Update: {
          batch_number?: number
          created_at?: string
          error_message?: string | null
          id?: string
          import_job_id?: string
          metadata?: Json
          processed_at?: string | null
          row_end?: number
          row_start?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_errors: {
        Row: {
          batch_id: string | null
          created_at: string
          error_code: string
          error_message: string
          error_message_en: string | null
          error_message_ja: string | null
          error_message_vi: string | null
          error_stage: string
          id: string
          import_job_id: string
          import_row_id: string | null
          is_recoverable: boolean
          metadata: Json
          raw_data: Json
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          error_code: string
          error_message: string
          error_message_en?: string | null
          error_message_ja?: string | null
          error_message_vi?: string | null
          error_stage: string
          id?: string
          import_job_id: string
          import_row_id?: string | null
          is_recoverable?: boolean
          metadata?: Json
          raw_data?: Json
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          error_code?: string
          error_message?: string
          error_message_en?: string | null
          error_message_ja?: string | null
          error_message_vi?: string | null
          error_stage?: string
          id?: string
          import_job_id?: string
          import_row_id?: string | null
          is_recoverable?: boolean
          metadata?: Json
          raw_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "import_errors_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_errors_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_errors_import_row_id_fkey"
            columns: ["import_row_id"]
            isOneToOne: false
            referencedRelation: "import_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          committed_at: string | null
          committed_by: string | null
          committed_rows: number
          completed_at: string | null
          created_at: string
          current_stage: string | null
          date_range_end: string | null
          date_range_start: string | null
          detected_currency: string | null
          duplicate_rows: number
          error_rows: number
          error_summary: string | null
          file_name: string
          file_size_bytes: number | null
          file_type: string
          id: string
          imported_by: string | null
          ledger_id: string
          metadata: Json
          parsed_rows: number
          processing_ms: number | null
          provider: string
          provider_format_version: string | null
          reviewed_by: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["import_status"]
          storage_path: string | null
          total_rows: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          committed_at?: string | null
          committed_by?: string | null
          committed_rows?: number
          completed_at?: string | null
          created_at?: string
          current_stage?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          detected_currency?: string | null
          duplicate_rows?: number
          error_rows?: number
          error_summary?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_type: string
          id?: string
          imported_by?: string | null
          ledger_id: string
          metadata?: Json
          parsed_rows?: number
          processing_ms?: number | null
          provider: string
          provider_format_version?: string | null
          reviewed_by?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          storage_path?: string | null
          total_rows?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          committed_at?: string | null
          committed_by?: string | null
          committed_rows?: number
          completed_at?: string | null
          created_at?: string
          current_stage?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          detected_currency?: string | null
          duplicate_rows?: number
          error_rows?: number
          error_summary?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string
          id?: string
          imported_by?: string | null
          ledger_id?: string
          metadata?: Json
          parsed_rows?: number
          processing_ms?: number | null
          provider?: string
          provider_format_version?: string | null
          reviewed_by?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          storage_path?: string | null
          total_rows?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      import_matches: {
        Row: {
          confidence_score: number
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          decision_status: string
          id: string
          import_row_id: string
          match_fields: Json
          match_reason: string | null
          match_type: string
          matched_import_row_id: string | null
          matched_transaction_id: string | null
          metadata: Json
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          decision_status?: string
          id?: string
          import_row_id: string
          match_fields?: Json
          match_reason?: string | null
          match_type: string
          matched_import_row_id?: string | null
          matched_transaction_id?: string | null
          metadata?: Json
        }
        Update: {
          confidence_score?: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          decision_status?: string
          id?: string
          import_row_id?: string
          match_fields?: Json
          match_reason?: string | null
          match_type?: string
          matched_import_row_id?: string | null
          matched_transaction_id?: string | null
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "import_matches_import_row_id_fkey"
            columns: ["import_row_id"]
            isOneToOne: false
            referencedRelation: "import_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_matches_matched_import_row_id_fkey"
            columns: ["matched_import_row_id"]
            isOneToOne: false
            referencedRelation: "import_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_matches_matched_transaction_id_fkey"
            columns: ["matched_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      import_rows: {
        Row: {
          ai_category_confidence: number | null
          ai_scope_confidence: number | null
          cashback_amount: number | null
          committed_transaction_id: string | null
          created_at: string
          id: string
          import_batch_id: string | null
          import_job_id: string
          is_duplicate: boolean
          is_settlement_match: boolean
          metadata: Json
          parsed_amount: number | null
          parsed_currency: string | null
          parsed_date: string | null
          parsed_description: string | null
          parsed_merchant: string | null
          parsed_merchant_normalized: string | null
          parsed_type: string | null
          payment_method_label: string | null
          points_used: number | null
          provider_category: string | null
          provider_note: string | null
          provider_transaction_id: string | null
          raw_amount: string | null
          raw_balance: string | null
          raw_data: Json
          raw_date: string | null
          raw_description: string | null
          row_number: number
          status: string
          suggested_category_id: string | null
          suggested_expense_scope: string | null
          updated_at: string
        }
        Insert: {
          ai_category_confidence?: number | null
          ai_scope_confidence?: number | null
          cashback_amount?: number | null
          committed_transaction_id?: string | null
          created_at?: string
          id?: string
          import_batch_id?: string | null
          import_job_id: string
          is_duplicate?: boolean
          is_settlement_match?: boolean
          metadata?: Json
          parsed_amount?: number | null
          parsed_currency?: string | null
          parsed_date?: string | null
          parsed_description?: string | null
          parsed_merchant?: string | null
          parsed_merchant_normalized?: string | null
          parsed_type?: string | null
          payment_method_label?: string | null
          points_used?: number | null
          provider_category?: string | null
          provider_note?: string | null
          provider_transaction_id?: string | null
          raw_amount?: string | null
          raw_balance?: string | null
          raw_data?: Json
          raw_date?: string | null
          raw_description?: string | null
          row_number: number
          status?: string
          suggested_category_id?: string | null
          suggested_expense_scope?: string | null
          updated_at?: string
        }
        Update: {
          ai_category_confidence?: number | null
          ai_scope_confidence?: number | null
          cashback_amount?: number | null
          committed_transaction_id?: string | null
          created_at?: string
          id?: string
          import_batch_id?: string | null
          import_job_id?: string
          is_duplicate?: boolean
          is_settlement_match?: boolean
          metadata?: Json
          parsed_amount?: number | null
          parsed_currency?: string | null
          parsed_date?: string | null
          parsed_description?: string | null
          parsed_merchant?: string | null
          parsed_merchant_normalized?: string | null
          parsed_type?: string | null
          payment_method_label?: string | null
          points_used?: number | null
          provider_category?: string | null
          provider_note?: string | null
          provider_transaction_id?: string | null
          raw_amount?: string | null
          raw_balance?: string | null
          raw_data?: Json
          raw_date?: string | null
          raw_description?: string | null
          row_number?: number
          status?: string
          suggested_category_id?: string | null
          suggested_expense_scope?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_rows_committed_transaction_id_fkey"
            columns: ["committed_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_rows_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_rows_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_rows_suggested_category_id_fkey"
            columns: ["suggested_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_rows_suggested_category_id_fkey"
            columns: ["suggested_category_id"]
            isOneToOne: false
            referencedRelation: "category_balances"
            referencedColumns: ["group_id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          inviter_id: string | null
          ledger_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          inviter_id?: string | null
          ledger_id: string
          role: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          inviter_id?: string | null
          ledger_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          accounting_period_id: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          currency_code: string
          description: string | null
          entry_date: string
          entry_type: Database["public"]["Enums"]["journal_entry_type"]
          id: string
          is_locked: boolean
          ledger_id: string
          metadata: Json
          posted_at: string | null
          posted_by: string | null
          posting_date: string | null
          prepared_by: string | null
          reference_number: string | null
          reversed_by_entry_id: string | null
          reverses_entry_id: string | null
          status: string
          total_credit: number
          total_debit: number
          transaction_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          accounting_period_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency_code: string
          description?: string | null
          entry_date: string
          entry_type?: Database["public"]["Enums"]["journal_entry_type"]
          id?: string
          is_locked?: boolean
          ledger_id: string
          metadata?: Json
          posted_at?: string | null
          posted_by?: string | null
          posting_date?: string | null
          prepared_by?: string | null
          reference_number?: string | null
          reversed_by_entry_id?: string | null
          reverses_entry_id?: string | null
          status?: string
          total_credit?: number
          total_debit?: number
          transaction_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          accounting_period_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency_code?: string
          description?: string | null
          entry_date?: string
          entry_type?: Database["public"]["Enums"]["journal_entry_type"]
          id?: string
          is_locked?: boolean
          ledger_id?: string
          metadata?: Json
          posted_at?: string | null
          posted_by?: string | null
          posting_date?: string | null
          prepared_by?: string | null
          reference_number?: string | null
          reversed_by_entry_id?: string | null
          reverses_entry_id?: string | null
          status?: string
          total_credit?: number
          total_debit?: number
          transaction_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_accounting_period_id_fkey"
            columns: ["accounting_period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversed_by_entry_id_fkey"
            columns: ["reversed_by_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reverses_entry_id_fkey"
            columns: ["reverses_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_translations: {
        Row: {
          description: string
          entry_id: string | null
          id: string
          locale: string
        }
        Insert: {
          description: string
          entry_id?: string | null
          id?: string
          locale: string
        }
        Update: {
          description?: string
          entry_id?: string | null
          id?: string
          locale?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_translations_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_line_translations: {
        Row: {
          description: string
          id: string
          line_id: string | null
          locale: string
        }
        Insert: {
          description: string
          id?: string
          line_id?: string | null
          locale: string
        }
        Update: {
          description?: string
          id?: string
          line_id?: string | null
          locale?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_line_translations_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "journal_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          amount: number
          base_amount: number | null
          base_currency_code: string | null
          chart_of_account_id: string
          created_at: string
          currency_code: string
          description: string | null
          exchange_rate: number | null
          expense_scope: string | null
          household_member_id: string | null
          id: string
          journal_entry_id: string
          line_number: number
          metadata: Json
          side: string
        }
        Insert: {
          amount: number
          base_amount?: number | null
          base_currency_code?: string | null
          chart_of_account_id: string
          created_at?: string
          currency_code: string
          description?: string | null
          exchange_rate?: number | null
          expense_scope?: string | null
          household_member_id?: string | null
          id?: string
          journal_entry_id: string
          line_number?: number
          metadata?: Json
          side: string
        }
        Update: {
          amount?: number
          base_amount?: number | null
          base_currency_code?: string | null
          chart_of_account_id?: string
          created_at?: string
          currency_code?: string
          description?: string | null
          exchange_rate?: number | null
          expense_scope?: string | null
          household_member_id?: string | null
          id?: string
          journal_entry_id?: string
          line_number?: number
          metadata?: Json
          side?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_chart_of_account_id_fkey"
            columns: ["chart_of_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_household_member_id_fkey"
            columns: ["household_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_members: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          last_active_at: string | null
          ledger_id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          last_active_at?: string | null
          ledger_id: string
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          last_active_at?: string | null
          ledger_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_members_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ledgers: {
        Row: {
          base_currency: string
          code: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          fiscal_year_start: string | null
          id: string
          is_default: boolean
          ledger_type: string
          locale: string
          metadata: Json
          name: string
          settings: Json
          timezone: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          base_currency?: string
          code?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          fiscal_year_start?: string | null
          id?: string
          is_default?: boolean
          ledger_type?: string
          locale?: string
          metadata?: Json
          name: string
          settings?: Json
          timezone?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          base_currency?: string
          code?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          fiscal_year_start?: string | null
          id?: string
          is_default?: boolean
          ledger_type?: string
          locale?: string
          metadata?: Json
          name?: string
          settings?: Json
          timezone?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledgers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          base_currency: string
          business_type: string | null
          country_code: string | null
          created_at: string
          deleted_at: string | null
          fiscal_year_start_month: number
          id: string
          metadata: Json
          name: string
          plan: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          base_currency?: string
          business_type?: string | null
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          fiscal_year_start_month?: number
          id?: string
          metadata?: Json
          name: string
          plan?: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          base_currency?: string
          business_type?: string | null
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          fiscal_year_start_month?: number
          id?: string
          metadata?: Json
          name?: string
          plan?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_instrument_translations: {
        Row: {
          id: string
          instrument_id: string | null
          locale: string
          name: string
        }
        Insert: {
          id?: string
          instrument_id?: string | null
          locale: string
          name: string
        }
        Update: {
          id?: string
          instrument_id?: string | null
          locale?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_instrument_translations_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "payment_instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_instruments: {
        Row: {
          card_last4: string | null
          color: string | null
          created_at: string
          expiry_month: number | null
          expiry_year: number | null
          icon: string | null
          id: string
          is_active: boolean
          is_default: boolean
          is_transit_card: boolean
          ledger_id: string
          linked_financial_account_id: string | null
          metadata: Json
          name: string
          provider: string
          settlement_type: string
          sort_order: number
          supports_auto_charge: boolean
          type: string
          updated_at: string
        }
        Insert: {
          card_last4?: string | null
          color?: string | null
          created_at?: string
          expiry_month?: number | null
          expiry_year?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_transit_card?: boolean
          ledger_id: string
          linked_financial_account_id?: string | null
          metadata?: Json
          name: string
          provider: string
          settlement_type: string
          sort_order?: number
          supports_auto_charge?: boolean
          type: string
          updated_at?: string
        }
        Update: {
          card_last4?: string | null
          color?: string | null
          created_at?: string
          expiry_month?: number | null
          expiry_year?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_transit_card?: boolean
          ledger_id?: string
          linked_financial_account_id?: string | null
          metadata?: Json
          name?: string
          provider?: string
          settlement_type?: string
          sort_order?: number
          supports_auto_charge?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_instruments_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_instruments_linked_financial_account_id_fkey"
            columns: ["linked_financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          job_title: string | null
          legal_name: string | null
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          job_title?: string | null
          legal_name?: string | null
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          job_title?: string | null
          legal_name?: string | null
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      receipt_documents: {
        Row: {
          created_at: string
          currency_code: string | null
          detected_language: string | null
          file_name: string
          file_size_bytes: number | null
          file_type: string
          id: string
          is_matched: boolean
          ledger_id: string
          linked_transaction_id: string | null
          merchant_name: string | null
          merchant_name_en: string | null
          merchant_name_ja: string | null
          merchant_name_vi: string | null
          metadata: Json
          ocr_confidence: number | null
          ocr_engine: string | null
          ocr_status: Database["public"]["Enums"]["ocr_status"]
          organization_id: string
          receipt_date: string | null
          storage_path: string
          tax_amount: number | null
          thumbnail_path: string | null
          tip_amount: number | null
          total_amount: number | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          currency_code?: string | null
          detected_language?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_type: string
          id?: string
          is_matched?: boolean
          ledger_id: string
          linked_transaction_id?: string | null
          merchant_name?: string | null
          merchant_name_en?: string | null
          merchant_name_ja?: string | null
          merchant_name_vi?: string | null
          metadata?: Json
          ocr_confidence?: number | null
          ocr_engine?: string | null
          ocr_status?: Database["public"]["Enums"]["ocr_status"]
          organization_id: string
          receipt_date?: string | null
          storage_path: string
          tax_amount?: number | null
          thumbnail_path?: string | null
          tip_amount?: number | null
          total_amount?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          currency_code?: string | null
          detected_language?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string
          id?: string
          is_matched?: boolean
          ledger_id?: string
          linked_transaction_id?: string | null
          merchant_name?: string | null
          merchant_name_en?: string | null
          merchant_name_ja?: string | null
          merchant_name_vi?: string | null
          metadata?: Json
          ocr_confidence?: number | null
          ocr_engine?: string | null
          ocr_status?: Database["public"]["Enums"]["ocr_status"]
          organization_id?: string
          receipt_date?: string | null
          storage_path?: string
          tax_amount?: number | null
          thumbnail_path?: string | null
          tip_amount?: number | null
          total_amount?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_documents_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_documents_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_line_item_translations: {
        Row: {
          id: string
          item_id: string | null
          locale: string
          name: string
        }
        Insert: {
          id?: string
          item_id?: string | null
          locale: string
          name: string
        }
        Update: {
          id?: string
          item_id?: string | null
          locale?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_line_item_translations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "receipt_line_items"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_line_items: {
        Row: {
          ai_confidence: number | null
          created_at: string
          currency_code: string | null
          discount_amount: number | null
          expense_scope: string | null
          id: string
          is_accepted: boolean
          is_reviewed: boolean
          line_number: number
          metadata: Json
          normalized_name: string | null
          quantity: number | null
          raw_text: string | null
          receipt_document_id: string
          suggested_category_id: string | null
          tax_rate: number | null
          total_amount: number | null
          transaction_id: string | null
          transaction_split_id: string | null
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          ai_confidence?: number | null
          created_at?: string
          currency_code?: string | null
          discount_amount?: number | null
          expense_scope?: string | null
          id?: string
          is_accepted?: boolean
          is_reviewed?: boolean
          line_number: number
          metadata?: Json
          normalized_name?: string | null
          quantity?: number | null
          raw_text?: string | null
          receipt_document_id: string
          suggested_category_id?: string | null
          tax_rate?: number | null
          total_amount?: number | null
          transaction_id?: string | null
          transaction_split_id?: string | null
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          ai_confidence?: number | null
          created_at?: string
          currency_code?: string | null
          discount_amount?: number | null
          expense_scope?: string | null
          id?: string
          is_accepted?: boolean
          is_reviewed?: boolean
          line_number?: number
          metadata?: Json
          normalized_name?: string | null
          quantity?: number | null
          raw_text?: string | null
          receipt_document_id?: string
          suggested_category_id?: string | null
          tax_rate?: number | null
          total_amount?: number | null
          transaction_id?: string | null
          transaction_split_id?: string | null
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_line_items_receipt_document_id_fkey"
            columns: ["receipt_document_id"]
            isOneToOne: false
            referencedRelation: "receipt_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_line_items_suggested_category_id_fkey"
            columns: ["suggested_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_line_items_suggested_category_id_fkey"
            columns: ["suggested_category_id"]
            isOneToOne: false
            referencedRelation: "category_balances"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "receipt_line_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_line_items_transaction_split_id_fkey"
            columns: ["transaction_split_id"]
            isOneToOne: false
            referencedRelation: "transaction_splits"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_ocr_jobs: {
        Row: {
          api_cost_usd: number | null
          completed_at: string | null
          created_at: string
          enhance_mode: string
          error_code: string | null
          error_message: string | null
          id: string
          language_hint: string | null
          max_retries: number
          metadata: Json
          ocr_engine: string
          processing_ms: number | null
          receipt_document_id: string
          retry_count: number
          started_at: string | null
          status: Database["public"]["Enums"]["ocr_status"]
          tokens_used: number | null
        }
        Insert: {
          api_cost_usd?: number | null
          completed_at?: string | null
          created_at?: string
          enhance_mode?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          language_hint?: string | null
          max_retries?: number
          metadata?: Json
          ocr_engine?: string
          processing_ms?: number | null
          receipt_document_id: string
          retry_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["ocr_status"]
          tokens_used?: number | null
        }
        Update: {
          api_cost_usd?: number | null
          completed_at?: string | null
          created_at?: string
          enhance_mode?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          language_hint?: string | null
          max_retries?: number
          metadata?: Json
          ocr_engine?: string
          processing_ms?: number | null
          receipt_document_id?: string
          retry_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["ocr_status"]
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_ocr_jobs_receipt_document_id_fkey"
            columns: ["receipt_document_id"]
            isOneToOne: false
            referencedRelation: "receipt_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_ocr_results: {
        Row: {
          confidence_score: number | null
          created_at: string
          detected_language: string | null
          extracted_currency: string | null
          extracted_date: string | null
          extracted_items: Json
          extracted_merchant: string | null
          extracted_taxes: Json
          extracted_total: string | null
          id: string
          ocr_job_id: string
          parsing_version: string | null
          raw_response: Json
          receipt_document_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          detected_language?: string | null
          extracted_currency?: string | null
          extracted_date?: string | null
          extracted_items?: Json
          extracted_merchant?: string | null
          extracted_taxes?: Json
          extracted_total?: string | null
          id?: string
          ocr_job_id: string
          parsing_version?: string | null
          raw_response?: Json
          receipt_document_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          detected_language?: string | null
          extracted_currency?: string | null
          extracted_date?: string | null
          extracted_items?: Json
          extracted_merchant?: string | null
          extracted_taxes?: Json
          extracted_total?: string | null
          id?: string
          ocr_job_id?: string
          parsing_version?: string | null
          raw_response?: Json
          receipt_document_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_ocr_results_ocr_job_id_fkey"
            columns: ["ocr_job_id"]
            isOneToOne: false
            referencedRelation: "receipt_ocr_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_ocr_results_receipt_document_id_fkey"
            columns: ["receipt_document_id"]
            isOneToOne: false
            referencedRelation: "receipt_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_items: {
        Row: {
          bank_statement_row_id: string | null
          book_amount: number | null
          cleared_at: string | null
          cleared_by: string | null
          clearing_note: string | null
          created_at: string
          currency_code: string | null
          difference_amount: number | null
          id: string
          import_match_id: string | null
          is_cleared: boolean
          match_confidence: number
          match_type: string
          metadata: Json
          reconciliation_session_id: string
          statement_amount: number | null
          transaction_id: string | null
        }
        Insert: {
          bank_statement_row_id?: string | null
          book_amount?: number | null
          cleared_at?: string | null
          cleared_by?: string | null
          clearing_note?: string | null
          created_at?: string
          currency_code?: string | null
          difference_amount?: number | null
          id?: string
          import_match_id?: string | null
          is_cleared?: boolean
          match_confidence?: number
          match_type: string
          metadata?: Json
          reconciliation_session_id: string
          statement_amount?: number | null
          transaction_id?: string | null
        }
        Update: {
          bank_statement_row_id?: string | null
          book_amount?: number | null
          cleared_at?: string | null
          cleared_by?: string | null
          clearing_note?: string | null
          created_at?: string
          currency_code?: string | null
          difference_amount?: number | null
          id?: string
          import_match_id?: string | null
          is_cleared?: boolean
          match_confidence?: number
          match_type?: string
          metadata?: Json
          reconciliation_session_id?: string
          statement_amount?: number | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_items_bank_statement_row_id_fkey"
            columns: ["bank_statement_row_id"]
            isOneToOne: false
            referencedRelation: "bank_statement_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_items_import_match_id_fkey"
            columns: ["import_match_id"]
            isOneToOne: false
            referencedRelation: "import_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_items_reconciliation_session_id_fkey"
            columns: ["reconciliation_session_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_sessions: {
        Row: {
          accounting_period_id: string | null
          bank_statement_import_id: string | null
          book_closing_balance: number | null
          book_opening_balance: number | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          financial_account_id: string
          id: string
          ledger_id: string
          metadata: Json
          notes: string | null
          session_name: string | null
          session_type: string
          started_at: string | null
          started_by: string | null
          statement_closing_balance: number | null
          statement_currency: string | null
          statement_date: string | null
          statement_opening_balance: number | null
          status: Database["public"]["Enums"]["reconciliation_status"]
          unreconciled_amount: number | null
          updated_at: string
        }
        Insert: {
          accounting_period_id?: string | null
          bank_statement_import_id?: string | null
          book_closing_balance?: number | null
          book_opening_balance?: number | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          financial_account_id: string
          id?: string
          ledger_id: string
          metadata?: Json
          notes?: string | null
          session_name?: string | null
          session_type?: string
          started_at?: string | null
          started_by?: string | null
          statement_closing_balance?: number | null
          statement_currency?: string | null
          statement_date?: string | null
          statement_opening_balance?: number | null
          status?: Database["public"]["Enums"]["reconciliation_status"]
          unreconciled_amount?: number | null
          updated_at?: string
        }
        Update: {
          accounting_period_id?: string | null
          bank_statement_import_id?: string | null
          book_closing_balance?: number | null
          book_opening_balance?: number | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          financial_account_id?: string
          id?: string
          ledger_id?: string
          metadata?: Json
          notes?: string | null
          session_name?: string | null
          session_type?: string
          started_at?: string | null
          started_by?: string | null
          statement_closing_balance?: number | null
          statement_currency?: string | null
          statement_date?: string | null
          statement_opening_balance?: number | null
          status?: Database["public"]["Enums"]["reconciliation_status"]
          unreconciled_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_sessions_accounting_period_id_fkey"
            columns: ["accounting_period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_sessions_bank_statement_import_id_fkey"
            columns: ["bank_statement_import_id"]
            isOneToOne: false
            referencedRelation: "bank_statement_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_sessions_financial_account_id_fkey"
            columns: ["financial_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_sessions_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_transactions: {
        Row: {
          amount: number
          applied_months: string[] | null
          category: string
          created_at: string
          day_of_month: number
          description: string
          group_id: string | null
          id: string
          is_active: boolean
          note: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          applied_months?: string[] | null
          category: string
          created_at?: string
          day_of_month: number
          description: string
          group_id?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          applied_months?: string[] | null
          category?: string
          created_at?: string
          day_of_month?: number
          description?: string
          group_id?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_profile_translations: {
        Row: {
          id: string
          locale: string
          profile_id: string | null
          profile_name: string
        }
        Insert: {
          id?: string
          locale: string
          profile_id?: string | null
          profile_name: string
        }
        Update: {
          id?: string
          locale?: string
          profile_id?: string | null
          profile_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_profile_translations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "settlement_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_profiles: {
        Row: {
          condition_expression: string | null
          created_at: string
          funding_source_id: string
          id: string
          is_primary: boolean
          ledger_id: string
          metadata: Json
          payment_instrument_id: string
          profile_name: string
          settlement_cycle: string
          settlement_date_rule: string | null
        }
        Insert: {
          condition_expression?: string | null
          created_at?: string
          funding_source_id: string
          id?: string
          is_primary?: boolean
          ledger_id: string
          metadata?: Json
          payment_instrument_id: string
          profile_name: string
          settlement_cycle?: string
          settlement_date_rule?: string | null
        }
        Update: {
          condition_expression?: string | null
          created_at?: string
          funding_source_id?: string
          id?: string
          is_primary?: boolean
          ledger_id?: string
          metadata?: Json
          payment_instrument_id?: string
          profile_name?: string
          settlement_cycle?: string
          settlement_date_rule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlement_profiles_funding_source_id_fkey"
            columns: ["funding_source_id"]
            isOneToOne: false
            referencedRelation: "funding_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_profiles_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_profiles_payment_instrument_id_fkey"
            columns: ["payment_instrument_id"]
            isOneToOne: false
            referencedRelation: "payment_instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_translations: {
        Row: {
          id: string
          locale: string
          name: string
          tag_id: string | null
        }
        Insert: {
          id?: string
          locale: string
          name: string
          tag_id?: string | null
        }
        Update: {
          id?: string
          locale?: string
          name?: string
          tag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tag_translations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          name: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_attachments: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_size_bytes: number | null
          file_type: string
          id: string
          metadata: Json
          storage_path: string
          thumbnail_path: string | null
          transaction_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_type: string
          id?: string
          metadata?: Json
          storage_path: string
          thumbnail_path?: string | null
          transaction_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string
          id?: string
          metadata?: Json
          storage_path?: string
          thumbnail_path?: string | null
          transaction_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_attachments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_dimensions: {
        Row: {
          created_at: string
          dimension_id: string
          dimension_value_id: string
          id: string
          transaction_id: string
        }
        Insert: {
          created_at?: string
          dimension_id: string
          dimension_value_id: string
          id?: string
          transaction_id: string
        }
        Update: {
          created_at?: string
          dimension_id?: string
          dimension_value_id?: string
          id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_dimensions_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_dimensions_dimension_value_id_fkey"
            columns: ["dimension_value_id"]
            isOneToOne: false
            referencedRelation: "dimension_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_dimensions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_participants: {
        Row: {
          created_at: string
          household_member_id: string | null
          id: string
          metadata: Json
          notes: string | null
          role: string
          transaction_id: string
        }
        Insert: {
          created_at?: string
          household_member_id?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          role: string
          transaction_id: string
        }
        Update: {
          created_at?: string
          household_member_id?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          role?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_participants_household_member_id_fkey"
            columns: ["household_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_participants_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_splits: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          currency_code: string
          expense_scope: string
          id: string
          metadata: Json
          name_en: string | null
          name_ja: string | null
          name_vi: string | null
          notes: string | null
          sort_order: number
          transaction_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          currency_code: string
          expense_scope?: string
          id?: string
          metadata?: Json
          name_en?: string | null
          name_ja?: string | null
          name_vi?: string | null
          notes?: string | null
          sort_order?: number
          transaction_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          currency_code?: string
          expense_scope?: string
          id?: string
          metadata?: Json
          name_en?: string | null
          name_ja?: string | null
          name_vi?: string | null
          notes?: string | null
          sort_order?: number
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_splits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_balances"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "transaction_splits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_tags: {
        Row: {
          created_at: string
          tag_id: string
          transaction_id: string
        }
        Insert: {
          created_at?: string
          tag_id: string
          transaction_id: string
        }
        Update: {
          created_at?: string
          tag_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          accounting_period_id: string | null
          amount: number
          base_amount: number | null
          base_currency_code: string | null
          business_event_type: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          exchange_rate: number | null
          exchange_rate_source: string | null
          external_hash: string | null
          external_id: string | null
          funding_source_id: string | null
          id: string
          is_reconciled: boolean
          ledger_id: string
          merchant_category_code: string | null
          merchant_name: string | null
          merchant_normalized: string | null
          metadata: Json
          notes: string | null
          organization_id: string
          payment_instrument_id: string | null
          posted_date: string | null
          receipt_document_id: string | null
          reconciled_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          settlement_account_id: string | null
          source: string | null
          source_reference: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_date: string
          transaction_type: string
          updated_at: string
          value_date: string | null
          workspace_id: string
        }
        Insert: {
          accounting_period_id?: string | null
          amount: number
          base_amount?: number | null
          base_currency_code?: string | null
          business_event_type?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code: string
          deleted_at?: string | null
          description?: string | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          external_hash?: string | null
          external_id?: string | null
          funding_source_id?: string | null
          id?: string
          is_reconciled?: boolean
          ledger_id: string
          merchant_category_code?: string | null
          merchant_name?: string | null
          merchant_normalized?: string | null
          metadata?: Json
          notes?: string | null
          organization_id: string
          payment_instrument_id?: string | null
          posted_date?: string | null
          receipt_document_id?: string | null
          reconciled_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          settlement_account_id?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date: string
          transaction_type: string
          updated_at?: string
          value_date?: string | null
          workspace_id: string
        }
        Update: {
          accounting_period_id?: string | null
          amount?: number
          base_amount?: number | null
          base_currency_code?: string | null
          business_event_type?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          exchange_rate?: number | null
          exchange_rate_source?: string | null
          external_hash?: string | null
          external_id?: string | null
          funding_source_id?: string | null
          id?: string
          is_reconciled?: boolean
          ledger_id?: string
          merchant_category_code?: string | null
          merchant_name?: string | null
          merchant_normalized?: string | null
          metadata?: Json
          notes?: string | null
          organization_id?: string
          payment_instrument_id?: string | null
          posted_date?: string | null
          receipt_document_id?: string | null
          reconciled_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          settlement_account_id?: string | null
          source?: string | null
          source_reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
          value_date?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_txn_v3_receipt_document"
            columns: ["receipt_document_id"]
            isOneToOne: false
            referencedRelation: "receipt_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v3_accounting_period_id_fkey"
            columns: ["accounting_period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v3_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v3_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_balances"
            referencedColumns: ["group_id"]
          },
          {
            foreignKeyName: "transactions_v3_funding_source_id_fkey"
            columns: ["funding_source_id"]
            isOneToOne: false
            referencedRelation: "funding_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v3_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v3_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v3_payment_instrument_id_fkey"
            columns: ["payment_instrument_id"]
            isOneToOne: false
            referencedRelation: "payment_instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v3_settlement_account_id_fkey"
            columns: ["settlement_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_v3_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ui_translations: {
        Row: {
          created_at: string | null
          id: string
          key: string
          locale: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          locale: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          locale?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          currency: string | null
          dashboard_density: string | null
          date_formatting: string | null
          fiscal_year_start: string | null
          hidden_balances: boolean | null
          lang: string | null
          locale: string | null
          notification_settings: Json
          number_formatting: string | null
          start_page: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          dashboard_density?: string | null
          date_formatting?: string | null
          fiscal_year_start?: string | null
          hidden_balances?: boolean | null
          lang?: string | null
          locale?: string | null
          notification_settings?: Json
          number_formatting?: string | null
          start_page?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          dashboard_density?: string | null
          date_formatting?: string | null
          fiscal_year_start?: string | null
          hidden_balances?: boolean | null
          lang?: string | null
          locale?: string | null
          notification_settings?: Json
          number_formatting?: string | null
          start_page?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          default_currency: string
          deleted_at: string | null
          fiscal_year_start_month: number
          id: string
          metadata: Json
          name: string
          organization_id: string
          slug: string
          updated_at: string
          workspace_type: string
        }
        Insert: {
          created_at?: string
          default_currency?: string
          deleted_at?: string | null
          fiscal_year_start_month?: number
          id?: string
          metadata?: Json
          name: string
          organization_id: string
          slug: string
          updated_at?: string
          workspace_type?: string
        }
        Update: {
          created_at?: string
          default_currency?: string
          deleted_at?: string | null
          fiscal_year_start_month?: number
          id?: string
          metadata?: Json
          name?: string
          organization_id?: string
          slug?: string
          updated_at?: string
          workspace_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      category_balances: {
        Row: {
          group_id: string | null
          ledger_id: string | null
          month: string | null
          net_balance: number | null
          total_expense: number | null
          total_income: number | null
          transaction_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_v3_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_ledger_with_owner: {
        Args: {
          p_code: string
          p_currency: string
          p_fiscal_year_start: string
          p_locale: string
          p_name: string
          p_timezone: string
          p_workspace_id: string
        }
        Returns: string
      }
      create_new_ledger_system: {
        Args: {
          base_currency: string
          fiscal_year_start: string
          ledger_name: string
          locale: string
          org_name: string
          timezone: string
        }
        Returns: Json
      }
      text2ltree: { Args: { "": string }; Returns: unknown }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "income" | "expense"
      approval_status:
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
        | "escalated"
      currency_policy: "workspace-default" | "group-fixed" | "multi-currency"
      group_status: "active" | "archived" | "locked" | "suspended"
      group_type:
        | "organization"
        | "department"
        | "team"
        | "project"
        | "shared"
        | "financial"
        | "temporary"
      import_status:
        | "pending"
        | "parsing"
        | "normalizing"
        | "detecting_duplicates"
        | "classifying"
        | "review"
        | "committing"
        | "completed"
        | "failed"
      journal_entry_type:
        | "standard"
        | "opening"
        | "closing"
        | "reversal"
        | "correcting"
        | "adjustment"
      membership_role:
        | "owner"
        | "finance-admin"
        | "auditor"
        | "manager"
        | "operator"
        | "viewer"
      normal_balance: "debit" | "credit"
      ocr_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "review_required"
      permission_source: "direct" | "inherited" | "workspace" | "organization"
      reconciliation_mode: "strict" | "balanced" | "manual"
      reconciliation_status: "open" | "in_progress" | "completed" | "cancelled"
      transaction_status:
        | "draft"
        | "pending"
        | "posted"
        | "voided"
        | "reversed"
        | "reconciled"
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
    Enums: {
      account_type: ["asset", "liability", "equity", "income", "expense"],
      approval_status: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "escalated",
      ],
      currency_policy: ["workspace-default", "group-fixed", "multi-currency"],
      group_status: ["active", "archived", "locked", "suspended"],
      group_type: [
        "organization",
        "department",
        "team",
        "project",
        "shared",
        "financial",
        "temporary",
      ],
      import_status: [
        "pending",
        "parsing",
        "normalizing",
        "detecting_duplicates",
        "classifying",
        "review",
        "committing",
        "completed",
        "failed",
      ],
      journal_entry_type: [
        "standard",
        "opening",
        "closing",
        "reversal",
        "correcting",
        "adjustment",
      ],
      membership_role: [
        "owner",
        "finance-admin",
        "auditor",
        "manager",
        "operator",
        "viewer",
      ],
      normal_balance: ["debit", "credit"],
      ocr_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "review_required",
      ],
      permission_source: ["direct", "inherited", "workspace", "organization"],
      reconciliation_mode: ["strict", "balanced", "manual"],
      reconciliation_status: ["open", "in_progress", "completed", "cancelled"],
      transaction_status: [
        "draft",
        "pending",
        "posted",
        "voided",
        "reversed",
        "reconciled",
      ],
    },
  },
} as const

