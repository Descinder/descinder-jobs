export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      alert_deliveries: {
        Row: {
          alert_id: string
          id: string
          job_id: string
          sent_at: string
        }
        Insert: {
          alert_id: string
          id?: string
          job_id: string
          sent_at?: string
        }
        Update: {
          alert_id?: string
          id?: string
          job_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_deliveries_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "job_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_deliveries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          cover_letter: string | null
          cv_file_id: string | null
          external_status: string | null
          id: string
          job_id: string
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string
          updated_at: string
          user_id: string | null
          withdrawn: boolean
          withdrawn_at: string | null
        }
        Insert: {
          cover_letter?: string | null
          cv_file_id?: string | null
          external_status?: string | null
          id?: string
          job_id: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string
          updated_at?: string
          user_id?: string | null
          withdrawn?: boolean
          withdrawn_at?: string | null
        }
        Update: {
          cover_letter?: string | null
          cv_file_id?: string | null
          external_status?: string | null
          id?: string
          job_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string
          updated_at?: string
          user_id?: string | null
          withdrawn?: boolean
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_cv_file_fk"
            columns: ["cv_file_id"]
            isOneToOne: false
            referencedRelation: "cv_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          approval_decided_at: string | null
          approval_decided_by: string | null
          approval_rejection_reason: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          created_at: string
          description: string | null
          id: string
          location: string | null
          logo_url: string | null
          name: string
          size: string | null
          slug: string
          stripe_customer_id: string | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          tier: string
          updated_at: string
          website: string | null
        }
        Insert: {
          approval_decided_at?: string | null
          approval_decided_by?: string | null
          approval_rejection_reason?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name: string
          size?: string | null
          slug: string
          stripe_customer_id?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          tier?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          approval_decided_at?: string | null
          approval_decided_by?: string | null
          approval_rejection_reason?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name?: string
          size?: string | null
          slug?: string
          stripe_customer_id?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          tier?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_approval_decided_by_fkey"
            columns: ["approval_decided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["company_member_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["company_member_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["company_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_log: {
        Row: {
          event_type: Database["public"]["Enums"]["consent_event_type"]
          id: string
          metadata: Json | null
          policy_version: string | null
          recorded_at: string
          user_id: string | null
        }
        Insert: {
          event_type: Database["public"]["Enums"]["consent_event_type"]
          id?: string
          metadata?: Json | null
          policy_version?: string | null
          recorded_at?: string
          user_id?: string | null
        }
        Update: {
          event_type?: Database["public"]["Enums"]["consent_event_type"]
          id?: string
          metadata?: Json | null
          policy_version?: string | null
          recorded_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_files: {
        Row: {
          filename: string
          id: string
          is_primary: boolean
          kind: Database["public"]["Enums"]["cv_kind"]
          mime_type: string
          r2_object_key: string
          size_bytes: number
          source_cv_id: string | null
          tailored_for_job_id: string | null
          uploaded_at: string
          user_id: string
        }
        Insert: {
          filename: string
          id?: string
          is_primary?: boolean
          kind?: Database["public"]["Enums"]["cv_kind"]
          mime_type: string
          r2_object_key: string
          size_bytes: number
          source_cv_id?: string | null
          tailored_for_job_id?: string | null
          uploaded_at?: string
          user_id: string
        }
        Update: {
          filename?: string
          id?: string
          is_primary?: boolean
          kind?: Database["public"]["Enums"]["cv_kind"]
          mime_type?: string
          r2_object_key?: string
          size_bytes?: number
          source_cv_id?: string | null
          tailored_for_job_id?: string | null
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_files_source_cv_id_fkey"
            columns: ["source_cv_id"]
            isOneToOne: false
            referencedRelation: "cv_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_files_tailored_for_job_id_fkey"
            columns: ["tailored_for_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_generations: {
        Row: {
          ai_model_used: string
          ai_provider: string
          base_cv_id: string | null
          created_at: string
          error_message: string | null
          generated_cv_id: string | null
          id: string
          input_tokens: number | null
          job_id: string | null
          latency_ms: number | null
          output_tokens: number | null
          prompt_version: string
          success: boolean
          user_id: string
        }
        Insert: {
          ai_model_used: string
          ai_provider: string
          base_cv_id?: string | null
          created_at?: string
          error_message?: string | null
          generated_cv_id?: string | null
          id?: string
          input_tokens?: number | null
          job_id?: string | null
          latency_ms?: number | null
          output_tokens?: number | null
          prompt_version: string
          success?: boolean
          user_id: string
        }
        Update: {
          ai_model_used?: string
          ai_provider?: string
          base_cv_id?: string | null
          created_at?: string
          error_message?: string | null
          generated_cv_id?: string | null
          id?: string
          input_tokens?: number | null
          job_id?: string | null
          latency_ms?: number | null
          output_tokens?: number | null
          prompt_version?: string
          success?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_generations_base_cv_id_fkey"
            columns: ["base_cv_id"]
            isOneToOne: false
            referencedRelation: "cv_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_generations_generated_cv_id_fkey"
            columns: ["generated_cv_id"]
            isOneToOne: false
            referencedRelation: "cv_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_generations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      data_export_requests: {
        Row: {
          completed_at: string | null
          id: string
          r2_object_key: string | null
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          r2_object_key?: string | null
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          r2_object_key?: string | null
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_export_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      external_apply_clicks: {
        Row: {
          clicked_at: string
          id: string
          job_id: string
          user_id: string | null
        }
        Insert: {
          clicked_at?: string
          id?: string
          job_id: string
          user_id?: string | null
        }
        Update: {
          clicked_at?: string
          id?: string
          job_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_apply_clicks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_apply_clicks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_runs: {
        Row: {
          category_filter: string | null
          country: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          jobs_expired: number
          jobs_inserted: number
          jobs_updated: number
          source: Database["public"]["Enums"]["job_source"]
          started_at: string
          success: boolean
        }
        Insert: {
          category_filter?: string | null
          country?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          jobs_expired?: number
          jobs_inserted?: number
          jobs_updated?: number
          source: Database["public"]["Enums"]["job_source"]
          started_at?: string
          success?: boolean
        }
        Update: {
          category_filter?: string | null
          country?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          jobs_expired?: number
          jobs_inserted?: number
          jobs_updated?: number
          source?: Database["public"]["Enums"]["job_source"]
          started_at?: string
          success?: boolean
        }
        Relationships: []
      }
      job_alerts: {
        Row: {
          created_at: string
          filters: Json
          frequency: Database["public"]["Enums"]["alert_frequency"]
          id: string
          is_premium: boolean
          last_run_at: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          frequency?: Database["public"]["Enums"]["alert_frequency"]
          id?: string
          is_premium?: boolean
          last_run_at?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          frequency?: Database["public"]["Enums"]["alert_frequency"]
          id?: string
          is_premium?: boolean
          last_run_at?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_seeker_profiles: {
        Row: {
          bio: string | null
          created_at: string
          desired_role_types: string[]
          github_url: string | null
          headline: string | null
          linkedin_url: string | null
          location: string | null
          open_to_offers: boolean
          portfolio_url: string | null
          primary_cv_id: string | null
          skills: string[]
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          desired_role_types?: string[]
          github_url?: string | null
          headline?: string | null
          linkedin_url?: string | null
          location?: string | null
          open_to_offers?: boolean
          portfolio_url?: string | null
          primary_cv_id?: string | null
          skills?: string[]
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          desired_role_types?: string[]
          github_url?: string | null
          headline?: string | null
          linkedin_url?: string | null
          location?: string | null
          open_to_offers?: boolean
          portfolio_url?: string | null
          primary_cv_id?: string | null
          skills?: string[]
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_seeker_profiles_primary_cv_fk"
            columns: ["primary_cv_id"]
            isOneToOne: false
            referencedRelation: "cv_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_seeker_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          apply_method: Database["public"]["Enums"]["job_apply_method"]
          company_id: string | null
          country: string | null
          created_at: string
          description: string
          employment_type: Database["public"]["Enums"]["job_employment_type"]
          experience_level:
            | Database["public"]["Enums"]["job_experience_level"]
            | null
          expires_at: string | null
          external_apply_url: string | null
          external_id: string | null
          featured: boolean
          featured_until: string | null
          id: string
          ingested_at: string | null
          location: string | null
          posted_at: string | null
          salary_currency: string
          salary_is_predicted: boolean
          salary_max: number | null
          salary_min: number | null
          search_vector: unknown
          skills_required: string[]
          source: Database["public"]["Enums"]["job_source"]
          source_attribution: string | null
          source_company_name: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
          work_mode: Database["public"]["Enums"]["job_work_mode"] | null
        }
        Insert: {
          apply_method?: Database["public"]["Enums"]["job_apply_method"]
          company_id?: string | null
          country?: string | null
          created_at?: string
          description: string
          employment_type: Database["public"]["Enums"]["job_employment_type"]
          experience_level?:
            | Database["public"]["Enums"]["job_experience_level"]
            | null
          expires_at?: string | null
          external_apply_url?: string | null
          external_id?: string | null
          featured?: boolean
          featured_until?: string | null
          id?: string
          ingested_at?: string | null
          location?: string | null
          posted_at?: string | null
          salary_currency?: string
          salary_is_predicted?: boolean
          salary_max?: number | null
          salary_min?: number | null
          search_vector?: unknown
          skills_required?: string[]
          source?: Database["public"]["Enums"]["job_source"]
          source_attribution?: string | null
          source_company_name?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
          work_mode?: Database["public"]["Enums"]["job_work_mode"] | null
        }
        Update: {
          apply_method?: Database["public"]["Enums"]["job_apply_method"]
          company_id?: string | null
          country?: string | null
          created_at?: string
          description?: string
          employment_type?: Database["public"]["Enums"]["job_employment_type"]
          experience_level?:
            | Database["public"]["Enums"]["job_experience_level"]
            | null
          expires_at?: string | null
          external_apply_url?: string | null
          external_id?: string | null
          featured?: boolean
          featured_until?: string | null
          id?: string
          ingested_at?: string | null
          location?: string | null
          posted_at?: string | null
          salary_currency?: string
          salary_is_predicted?: boolean
          salary_max?: number | null
          salary_min?: number | null
          search_vector?: unknown
          skills_required?: string[]
          source?: Database["public"]["Enums"]["job_source"]
          source_attribution?: string | null
          source_company_name?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
          work_mode?: Database["public"]["Enums"]["job_work_mode"] | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          owner_id: string
          owner_type: Database["public"]["Enums"]["subscription_owner_type"]
          purpose: Database["public"]["Enums"]["payment_purpose"]
          related_id: string | null
          status: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          owner_id: string
          owner_type: Database["public"]["Enums"]["subscription_owner_type"]
          purpose: Database["public"]["Enums"]["payment_purpose"]
          related_id?: string | null
          status: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          owner_id?: string
          owner_type?: Database["public"]["Enums"]["subscription_owner_type"]
          purpose?: Database["public"]["Enums"]["payment_purpose"]
          related_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: []
      }
      processed_stripe_events: {
        Row: {
          processed_at: string
          stripe_event_id: string
        }
        Insert: {
          processed_at?: string
          stripe_event_id: string
        }
        Update: {
          processed_at?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket: string
          count: number
          identifier: string
          window_start: string
        }
        Insert: {
          bucket: string
          count?: number
          identifier: string
          window_start: string
        }
        Update: {
          bucket?: string
          count?: number
          identifier?: string
          window_start?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          action_taken: string | null
          created_at: string
          description: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target_type"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_jobs: {
        Row: {
          job_id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          job_id: string
          saved_at?: string
          user_id: string
        }
        Update: {
          job_id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          csrf_token: string
          expires_at: string
          gotrue_refresh_token: string
          id: string
          ip: string | null
          last_seen_at: string
          revoked_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          csrf_token: string
          expires_at: string
          gotrue_refresh_token: string
          id?: string
          ip?: string | null
          last_seen_at?: string
          revoked_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          csrf_token?: string
          expires_at?: string
          gotrue_refresh_token?: string
          id?: string
          ip?: string | null
          last_seen_at?: string
          revoked_at?: string | null
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
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_event_at: string | null
          owner_id: string
          owner_type: Database["public"]["Enums"]["subscription_owner_type"]
          plan_key: string
          started_at: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_event_at?: string | null
          owner_id: string
          owner_type: Database["public"]["Enums"]["subscription_owner_type"]
          plan_key: string
          started_at?: string
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_event_at?: string | null
          owner_id?: string
          owner_type?: Database["public"]["Enums"]["subscription_owner_type"]
          plan_key?: string
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          acquisition_source:
            | Database["public"]["Enums"]["acquisition_source"]
            | null
          acquisition_source_detail: string | null
          ai_cv_uses_reset_at: string
          ai_cv_uses_this_period: number
          approval_decided_at: string | null
          approval_decided_by: string | null
          approval_rejection_reason: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          assessment_score: number | null
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          last_login_at: string | null
          marketing_consent: boolean
          marketing_consent_at: string | null
          name: string | null
          notification_preferences: Json
          plan: string | null
          role: Database["public"]["Enums"]["user_role"]
          stripe_customer_id: string | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
        }
        Insert: {
          acquisition_source?:
            | Database["public"]["Enums"]["acquisition_source"]
            | null
          acquisition_source_detail?: string | null
          ai_cv_uses_reset_at?: string
          ai_cv_uses_this_period?: number
          approval_decided_at?: string | null
          approval_decided_by?: string | null
          approval_rejection_reason?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          assessment_score?: number | null
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          id: string
          last_login_at?: string | null
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          name?: string | null
          notification_preferences?: Json
          plan?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
        }
        Update: {
          acquisition_source?:
            | Database["public"]["Enums"]["acquisition_source"]
            | null
          acquisition_source_detail?: string | null
          ai_cv_uses_reset_at?: string
          ai_cv_uses_this_period?: number
          approval_decided_at?: string | null
          approval_decided_by?: string | null
          approval_rejection_reason?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          assessment_score?: number | null
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          id?: string
          last_login_at?: string | null
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          name?: string | null
          notification_preferences?: Json
          plan?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_approval_decided_by_fkey"
            columns: ["approval_decided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_suspended_by_fkey"
            columns: ["suspended_by"]
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
      bump_rate_limit: {
        Args: { p_bucket: string; p_identifier: string; p_window_start: string }
        Returns: number
      }
      consume_ai_cv_credit: {
        Args: { p_cap: number; p_user: string }
        Returns: boolean
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_company_member: { Args: { p_company_id: string }; Returns: boolean }
      is_company_owner: { Args: { p_company_id: string }; Returns: boolean }
      refund_ai_cv_credit: { Args: { p_user: string }; Returns: undefined }
    }
    Enums: {
      acquisition_source:
        | "google"
        | "social_linkedin"
        | "social_twitter"
        | "social_other"
        | "referral"
        | "press_blog"
        | "event_university"
        | "paid_ad"
        | "other"
      alert_frequency: "instant" | "daily" | "weekly"
      application_status:
        | "submitted"
        | "reviewed"
        | "shortlisted"
        | "rejected"
        | "hired"
      approval_status: "auto_approved" | "pending" | "approved" | "rejected"
      company_member_role: "owner" | "recruiter"
      consent_event_type:
        | "terms_accepted"
        | "privacy_accepted"
        | "marketing_opt_in"
        | "cookie_analytics_opt_in"
      cv_kind: "uploaded_base" | "profile_built" | "ai_tailored"
      job_apply_method: "native" | "external"
      job_employment_type: "full_time" | "part_time" | "contract" | "internship"
      job_experience_level: "entry" | "mid" | "senior" | "lead"
      job_source: "native" | "adzuna" | "reed"
      job_status: "draft" | "published" | "closed" | "expired"
      job_work_mode: "remote" | "hybrid" | "on_site"
      payment_purpose:
        | "job_post"
        | "featured_listing"
        | "subscription"
        | "other"
      report_reason: "spam" | "inappropriate" | "scam" | "harassment" | "other"
      report_status: "open" | "reviewed" | "dismissed" | "actioned"
      report_target_type: "job" | "company" | "user"
      subscription_owner_type: "user" | "company"
      user_role: "job_seeker" | "employer" | "admin"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
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
      acquisition_source: [
        "google",
        "social_linkedin",
        "social_twitter",
        "social_other",
        "referral",
        "press_blog",
        "event_university",
        "paid_ad",
        "other",
      ],
      alert_frequency: ["instant", "daily", "weekly"],
      application_status: [
        "submitted",
        "reviewed",
        "shortlisted",
        "rejected",
        "hired",
      ],
      approval_status: ["auto_approved", "pending", "approved", "rejected"],
      company_member_role: ["owner", "recruiter"],
      consent_event_type: [
        "terms_accepted",
        "privacy_accepted",
        "marketing_opt_in",
        "cookie_analytics_opt_in",
      ],
      cv_kind: ["uploaded_base", "profile_built", "ai_tailored"],
      job_apply_method: ["native", "external"],
      job_employment_type: ["full_time", "part_time", "contract", "internship"],
      job_experience_level: ["entry", "mid", "senior", "lead"],
      job_source: ["native", "adzuna", "reed"],
      job_status: ["draft", "published", "closed", "expired"],
      job_work_mode: ["remote", "hybrid", "on_site"],
      payment_purpose: [
        "job_post",
        "featured_listing",
        "subscription",
        "other",
      ],
      report_reason: ["spam", "inappropriate", "scam", "harassment", "other"],
      report_status: ["open", "reviewed", "dismissed", "actioned"],
      report_target_type: ["job", "company", "user"],
      subscription_owner_type: ["user", "company"],
      user_role: ["job_seeker", "employer", "admin"],
      verification_status: ["unverified", "pending", "verified", "rejected"],
    },
  },
} as const

