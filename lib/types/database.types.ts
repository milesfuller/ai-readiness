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
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          industry: string | null
          size_category: 'startup' | 'small' | 'medium' | 'large' | 'enterprise' | null
          contact_email: string | null
          contact_name: string | null
          phone: string | null
          settings: Json
          branding: Json
          subscription_tier: string
          is_active: boolean
          trial_ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          industry?: string | null
          size_category?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise' | null
          contact_email?: string | null
          contact_name?: string | null
          phone?: string | null
          settings?: Json
          branding?: Json
          subscription_tier?: string
          is_active?: boolean
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          industry?: string | null
          size_category?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise' | null
          contact_email?: string | null
          contact_name?: string | null
          phone?: string | null
          settings?: Json
          branding?: Json
          subscription_tier?: string
          is_active?: boolean
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          email: string
          first_name: string | null
          last_name: string | null
          display_name: string | null
          role: 'user' | 'org_admin' | 'admin'
          organization_id: string | null
          job_title: string | null
          department: string | null
          manager_email: string | null
          preferences: Json
          last_login_at: string | null
          login_count: number
          survey_count: number
          is_active: boolean
          email_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          display_name?: string | null
          role?: 'user' | 'org_admin' | 'admin'
          organization_id?: string | null
          job_title?: string | null
          department?: string | null
          manager_email?: string | null
          preferences?: Json
          last_login_at?: string | null
          login_count?: number
          survey_count?: number
          is_active?: boolean
          email_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          display_name?: string | null
          role?: 'user' | 'org_admin' | 'admin'
          organization_id?: string | null
          job_title?: string | null
          department?: string | null
          manager_email?: string | null
          preferences?: Json
          last_login_at?: string | null
          login_count?: number
          survey_count?: number
          is_active?: boolean
          email_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      surveys: {
        Row: {
          id: string
          organization_id: string | null
          title: string
          description: string | null
          instructions: string | null
          version: string
          question_count: number
          estimated_duration_minutes: number
          is_voice_enabled: boolean
          is_anonymous: boolean
          jtbd_framework_version: string
          custom_questions: Json
          status: 'draft' | 'active' | 'paused' | 'archived'
          is_template: boolean
          created_by: string | null
          modified_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          title?: string
          description?: string | null
          instructions?: string | null
          version?: string
          question_count?: number
          estimated_duration_minutes?: number
          is_voice_enabled?: boolean
          is_anonymous?: boolean
          jtbd_framework_version?: string
          custom_questions?: Json
          status?: 'draft' | 'active' | 'paused' | 'archived'
          is_template?: boolean
          created_by?: string | null
          modified_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          title?: string
          description?: string | null
          instructions?: string | null
          version?: string
          question_count?: number
          estimated_duration_minutes?: number
          is_voice_enabled?: boolean
          is_anonymous?: boolean
          jtbd_framework_version?: string
          custom_questions?: Json
          status?: 'draft' | 'active' | 'paused' | 'archived'
          is_template?: boolean
          created_by?: string | null
          modified_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      survey_questions: {
        Row: {
          id: string
          survey_id: string
          question_number: number
          question_text: string
          question_context: string | null
          placeholder_text: string | null
          jtbd_force: 'demographic' | 'pain_of_old' | 'pull_of_new' | 'anchors_to_old' | 'anxiety_of_new'
          force_description: string | null
          input_type: 'text' | 'voice' | 'text_or_voice' | 'multiple_choice'
          is_required: boolean
          max_length: number
          min_length: number
          options: Json
          order_index: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          survey_id: string
          question_number: number
          question_text: string
          question_context?: string | null
          placeholder_text?: string | null
          jtbd_force: 'demographic' | 'pain_of_old' | 'pull_of_new' | 'anchors_to_old' | 'anxiety_of_new'
          force_description?: string | null
          input_type?: 'text' | 'voice' | 'text_or_voice' | 'multiple_choice'
          is_required?: boolean
          max_length?: number
          min_length?: number
          options?: Json
          order_index: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          survey_id?: string
          question_number?: number
          question_text?: string
          question_context?: string | null
          placeholder_text?: string | null
          jtbd_force?: 'demographic' | 'pain_of_old' | 'pull_of_new' | 'anchors_to_old' | 'anxiety_of_new'
          force_description?: string | null
          input_type?: 'text' | 'voice' | 'text_or_voice' | 'multiple_choice'
          is_required?: boolean
          max_length?: number
          min_length?: number
          options?: Json
          order_index?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          }
        ]
      }
      survey_sessions: {
        Row: {
          id: string
          survey_id: string
          user_id: string | null
          organization_id: string | null
          respondent_email: string | null
          respondent_name: string | null
          respondent_role: string | null
          respondent_department: string | null
          respondent_metadata: Json
          session_token: string
          current_question_number: number
          total_questions: number
          status: 'not_started' | 'in_progress' | 'completed' | 'abandoned' | 'expired'
          is_completed: boolean
          completion_percentage: number
          started_at: string
          completed_at: string | null
          last_activity_at: string
          expires_at: string
          total_time_spent_seconds: number
          user_agent: string | null
          ip_address: string | null
          device_type: string | null
          browser_info: Json
          quality_score: number | null
          voice_usage_percentage: number
          edit_count: number
          overall_readiness_score: number | null
          jtbd_scores: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          survey_id: string
          user_id?: string | null
          organization_id?: string | null
          respondent_email?: string | null
          respondent_name?: string | null
          respondent_role?: string | null
          respondent_department?: string | null
          respondent_metadata?: Json
          session_token?: string
          current_question_number?: number
          total_questions?: number
          status?: 'not_started' | 'in_progress' | 'completed' | 'abandoned' | 'expired'
          is_completed?: boolean
          completion_percentage?: number
          started_at?: string
          completed_at?: string | null
          last_activity_at?: string
          expires_at?: string
          total_time_spent_seconds?: number
          user_agent?: string | null
          ip_address?: string | null
          device_type?: string | null
          browser_info?: Json
          quality_score?: number | null
          voice_usage_percentage?: number
          edit_count?: number
          overall_readiness_score?: number | null
          jtbd_scores?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          survey_id?: string
          user_id?: string | null
          organization_id?: string | null
          respondent_email?: string | null
          respondent_name?: string | null
          respondent_role?: string | null
          respondent_department?: string | null
          respondent_metadata?: Json
          session_token?: string
          current_question_number?: number
          total_questions?: number
          status?: 'not_started' | 'in_progress' | 'completed' | 'abandoned' | 'expired'
          is_completed?: boolean
          completion_percentage?: number
          started_at?: string
          completed_at?: string | null
          last_activity_at?: string
          expires_at?: string
          total_time_spent_seconds?: number
          user_agent?: string | null
          ip_address?: string | null
          device_type?: string | null
          browser_info?: Json
          quality_score?: number | null
          voice_usage_percentage?: number
          edit_count?: number
          overall_readiness_score?: number | null
          jtbd_scores?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      survey_responses: {
        Row: {
          id: string
          session_id: string
          question_id: string
          response_text: string | null
          original_text: string | null
          voice_recording_url: string | null
          voice_recording_duration_seconds: number | null
          transcription_text: string | null
          transcription_confidence: number | null
          was_transcription_edited: boolean
          transcription_edit_count: number
          input_method: 'text' | 'voice' | 'mixed'
          response_quality: 'poor' | 'fair' | 'good' | 'excellent'
          word_count: number | null
          character_count: number | null
          time_spent_seconds: number
          first_response_at: string
          final_response_at: string
          revision_count: number
          edit_history: Json
          is_complete: boolean
          is_flagged: boolean
          flag_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          question_id: string
          response_text?: string | null
          original_text?: string | null
          voice_recording_url?: string | null
          voice_recording_duration_seconds?: number | null
          transcription_text?: string | null
          transcription_confidence?: number | null
          was_transcription_edited?: boolean
          transcription_edit_count?: number
          input_method: 'text' | 'voice' | 'mixed'
          response_quality?: 'poor' | 'fair' | 'good' | 'excellent'
          word_count?: number | null
          character_count?: number | null
          time_spent_seconds?: number
          first_response_at?: string
          final_response_at?: string
          revision_count?: number
          edit_history?: Json
          is_complete?: boolean
          is_flagged?: boolean
          flag_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          question_id?: string
          response_text?: string | null
          original_text?: string | null
          voice_recording_url?: string | null
          voice_recording_duration_seconds?: number | null
          transcription_text?: string | null
          transcription_confidence?: number | null
          was_transcription_edited?: boolean
          transcription_edit_count?: number
          input_method?: 'text' | 'voice' | 'mixed'
          response_quality?: 'poor' | 'fair' | 'good' | 'excellent'
          word_count?: number | null
          character_count?: number | null
          time_spent_seconds?: number
          first_response_at?: string
          final_response_at?: string
          revision_count?: number
          edit_history?: Json
          is_complete?: boolean
          is_flagged?: boolean
          flag_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "survey_sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      response_analysis: {
        Row: {
          id: string
          response_id: string
          primary_jtbd_force: 'demographic' | 'pain_of_old' | 'pull_of_new' | 'anchors_to_old' | 'anxiety_of_new'
          secondary_jtbd_forces: string[]
          force_distribution: Json
          force_strength_score: number | null
          confidence_score: number | null
          consistency_score: number | null
          sentiment_score: number | null
          sentiment_label: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive' | null
          key_themes: string[]
          theme_confidence: Json
          summary_insight: string
          detailed_analysis: string | null
          actionable_recommendations: string[]
          risk_indicators: string[]
          opportunity_indicators: string[]
          llm_model: string
          llm_provider: string | null
          prompt_version: string | null
          api_cost_cents: number
          analysis_timestamp: string
          processing_time_ms: number | null
          retry_count: number
          is_reviewed: boolean
          reviewer_id: string | null
          reviewer_notes: string | null
          manual_override: Json
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'manual_review'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          response_id: string
          primary_jtbd_force: 'demographic' | 'pain_of_old' | 'pull_of_new' | 'anchors_to_old' | 'anxiety_of_new'
          secondary_jtbd_forces?: string[]
          force_distribution?: Json
          force_strength_score?: number | null
          confidence_score?: number | null
          consistency_score?: number | null
          sentiment_score?: number | null
          sentiment_label?: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive' | null
          key_themes?: string[]
          theme_confidence?: Json
          summary_insight: string
          detailed_analysis?: string | null
          actionable_recommendations?: string[]
          risk_indicators?: string[]
          opportunity_indicators?: string[]
          llm_model: string
          llm_provider?: string | null
          prompt_version?: string | null
          api_cost_cents?: number
          analysis_timestamp?: string
          processing_time_ms?: number | null
          retry_count?: number
          is_reviewed?: boolean
          reviewer_id?: string | null
          reviewer_notes?: string | null
          manual_override?: Json
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'manual_review'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          response_id?: string
          primary_jtbd_force?: 'demographic' | 'pain_of_old' | 'pull_of_new' | 'anchors_to_old' | 'anxiety_of_new'
          secondary_jtbd_forces?: string[]
          force_distribution?: Json
          force_strength_score?: number | null
          confidence_score?: number | null
          consistency_score?: number | null
          sentiment_score?: number | null
          sentiment_label?: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive' | null
          key_themes?: string[]
          theme_confidence?: Json
          summary_insight?: string
          detailed_analysis?: string | null
          actionable_recommendations?: string[]
          risk_indicators?: string[]
          opportunity_indicators?: string[]
          llm_model?: string
          llm_provider?: string | null
          prompt_version?: string | null
          api_cost_cents?: number
          analysis_timestamp?: string
          processing_time_ms?: number | null
          retry_count?: number
          is_reviewed?: boolean
          reviewer_id?: string | null
          reviewer_notes?: string | null
          manual_override?: Json
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'manual_review'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "response_analysis_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: true
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "response_analysis_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      organization_insights: {
        Row: {
          id: string
          organization_id: string
          survey_id: string
          overall_readiness_score: number | null
          readiness_level: 'not_ready' | 'cautiously_ready' | 'ready' | 'very_ready' | null
          confidence_level: 'low' | 'medium' | 'high' | 'very_high' | null
          pain_of_old_score: number | null
          pull_of_new_score: number | null
          anchors_to_old_score: number | null
          anxiety_of_new_score: number | null
          total_responses: number
          completed_responses: number
          completion_rate: number | null
          avg_time_to_complete_minutes: number | null
          voice_usage_rate: number | null
          mobile_usage_rate: number | null
          avg_response_quality: number | null
          high_quality_responses_count: number
          flagged_responses_count: number
          top_themes_overall: Json
          themes_by_force: Json
          sentiment_distribution: Json
          avg_sentiment_score: number | null
          insights_by_role: Json
          insights_by_department: Json
          insights_by_seniority: Json
          key_insights: string[]
          priority_recommendations: string[]
          implementation_roadmap: Json
          risk_factors: string[]
          success_factors: string[]
          generated_at: string
          generated_by: string | null
          is_latest: boolean
          report_version: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          survey_id: string
          overall_readiness_score?: number | null
          readiness_level?: 'not_ready' | 'cautiously_ready' | 'ready' | 'very_ready' | null
          confidence_level?: 'low' | 'medium' | 'high' | 'very_high' | null
          pain_of_old_score?: number | null
          pull_of_new_score?: number | null
          anchors_to_old_score?: number | null
          anxiety_of_new_score?: number | null
          total_responses?: number
          completed_responses?: number
          completion_rate?: number | null
          avg_time_to_complete_minutes?: number | null
          voice_usage_rate?: number | null
          mobile_usage_rate?: number | null
          avg_response_quality?: number | null
          high_quality_responses_count?: number
          flagged_responses_count?: number
          top_themes_overall?: Json
          themes_by_force?: Json
          sentiment_distribution?: Json
          avg_sentiment_score?: number | null
          insights_by_role?: Json
          insights_by_department?: Json
          insights_by_seniority?: Json
          key_insights?: string[]
          priority_recommendations?: string[]
          implementation_roadmap?: Json
          risk_factors?: string[]
          success_factors?: string[]
          generated_at?: string
          generated_by?: string | null
          is_latest?: boolean
          report_version?: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          survey_id?: string
          overall_readiness_score?: number | null
          readiness_level?: 'not_ready' | 'cautiously_ready' | 'ready' | 'very_ready' | null
          confidence_level?: 'low' | 'medium' | 'high' | 'very_high' | null
          pain_of_old_score?: number | null
          pull_of_new_score?: number | null
          anchors_to_old_score?: number | null
          anxiety_of_new_score?: number | null
          total_responses?: number
          completed_responses?: number
          completion_rate?: number | null
          avg_time_to_complete_minutes?: number | null
          voice_usage_rate?: number | null
          mobile_usage_rate?: number | null
          avg_response_quality?: number | null
          high_quality_responses_count?: number
          flagged_responses_count?: number
          top_themes_overall?: Json
          themes_by_force?: Json
          sentiment_distribution?: Json
          avg_sentiment_score?: number | null
          insights_by_role?: Json
          insights_by_department?: Json
          insights_by_seniority?: Json
          key_insights?: string[]
          priority_recommendations?: string[]
          implementation_roadmap?: Json
          risk_factors?: string[]
          success_factors?: string[]
          generated_at?: string
          generated_by?: string | null
          is_latest?: boolean
          report_version?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_insights_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_insights_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_log: {
        Row: {
          id: string
          event_type: string
          event_category: 'authentication' | 'survey' | 'admin' | 'data_access' | 'export' | 'system' | null
          description: string | null
          user_id: string | null
          organization_id: string | null
          affected_user_id: string | null
          entity_type: string | null
          entity_id: string | null
          ip_address: string | null
          user_agent: string | null
          session_id: string | null
          event_data: Json
          before_state: Json | null
          after_state: Json | null
          status: 'success' | 'failure' | 'warning'
          impact_level: 'low' | 'medium' | 'high' | 'critical'
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          event_category?: 'authentication' | 'survey' | 'admin' | 'data_access' | 'export' | 'system' | null
          description?: string | null
          user_id?: string | null
          organization_id?: string | null
          affected_user_id?: string | null
          entity_type?: string | null
          entity_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          session_id?: string | null
          event_data?: Json
          before_state?: Json | null
          after_state?: Json | null
          status?: 'success' | 'failure' | 'warning'
          impact_level?: 'low' | 'medium' | 'high' | 'critical'
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          event_category?: 'authentication' | 'survey' | 'admin' | 'data_access' | 'export' | 'system' | null
          description?: string | null
          user_id?: string | null
          organization_id?: string | null
          affected_user_id?: string | null
          entity_type?: string | null
          entity_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          session_id?: string | null
          event_data?: Json
          before_state?: Json | null
          after_state?: Json | null
          status?: 'success' | 'failure' | 'warning'
          impact_level?: 'low' | 'medium' | 'high' | 'critical'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_affected_user_id_fkey"
            columns: ["affected_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      api_usage_log: {
        Row: {
          id: string
          organization_id: string | null
          user_id: string | null
          service_type: 'llm_analysis' | 'voice_transcription' | 'report_generation' | 'email_service'
          provider: string | null
          model_name: string | null
          usage_count: number
          tokens_used: number
          processing_time_ms: number
          cost_estimate_cents: number
          currency: string
          request_size_bytes: number | null
          response_size_bytes: number | null
          request_metadata: Json
          status: 'success' | 'failure' | 'timeout' | 'rate_limited'
          error_details: string | null
          usage_date: string
          usage_hour: number
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          user_id?: string | null
          service_type: 'llm_analysis' | 'voice_transcription' | 'report_generation' | 'email_service'
          provider?: string | null
          model_name?: string | null
          usage_count?: number
          tokens_used?: number
          processing_time_ms?: number
          cost_estimate_cents?: number
          currency?: string
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          request_metadata?: Json
          status?: 'success' | 'failure' | 'timeout' | 'rate_limited'
          error_details?: string | null
          usage_date?: string
          usage_hour?: number
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          user_id?: string | null
          service_type?: 'llm_analysis' | 'voice_transcription' | 'report_generation' | 'email_service'
          provider?: string | null
          model_name?: string | null
          usage_count?: number
          tokens_used?: number
          processing_time_ms?: number
          cost_estimate_cents?: number
          currency?: string
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          request_metadata?: Json
          status?: 'success' | 'failure' | 'timeout' | 'rate_limited'
          error_details?: string | null
          usage_date?: string
          usage_hour?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      system_notifications: {
        Row: {
          id: string
          title: string
          message: string
          notification_type: 'info' | 'warning' | 'error' | 'success' | 'maintenance' | null
          target_type: 'all_users' | 'organization' | 'role' | 'specific_user' | null
          target_criteria: Json
          organization_id: string | null
          user_id: string | null
          scheduled_at: string
          sent_at: string | null
          delivery_method: string[]
          is_active: boolean
          is_sent: boolean
          read_count: number
          click_count: number
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          message: string
          notification_type?: 'info' | 'warning' | 'error' | 'success' | 'maintenance' | null
          target_type?: 'all_users' | 'organization' | 'role' | 'specific_user' | null
          target_criteria?: Json
          organization_id?: string | null
          user_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          delivery_method?: string[]
          is_active?: boolean
          is_sent?: boolean
          read_count?: number
          click_count?: number
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          message?: string
          notification_type?: 'info' | 'warning' | 'error' | 'success' | 'maintenance' | null
          target_type?: 'all_users' | 'organization' | 'role' | 'specific_user' | null
          target_criteria?: Json
          organization_id?: string | null
          user_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          delivery_method?: string[]
          is_active?: boolean
          is_sent?: boolean
          read_count?: number
          click_count?: number
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_org_admin: {
        Args: {
          org_id: string
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

// Helper types for better developer experience
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Specific table types
export type Organization = Tables<'organizations'>
export type Profile = Tables<'profiles'>
export type Survey = Tables<'surveys'>
export type SurveyQuestion = Tables<'survey_questions'>
export type SurveySession = Tables<'survey_sessions'>
export type SurveyResponse = Tables<'survey_responses'>
export type ResponseAnalysis = Tables<'response_analysis'>
export type OrganizationInsights = Tables<'organization_insights'>
export type AuditLog = Tables<'audit_log'>
export type ApiUsageLog = Tables<'api_usage_log'>
export type SystemNotification = Tables<'system_notifications'>

// Insert types for forms
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type SurveyInsert = Database['public']['Tables']['surveys']['Insert']
export type SurveySessionInsert = Database['public']['Tables']['survey_sessions']['Insert']
export type SurveyResponseInsert = Database['public']['Tables']['survey_responses']['Insert']

// Update types for mutations
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type SurveyUpdate = Database['public']['Tables']['surveys']['Update']
export type SurveySessionUpdate = Database['public']['Tables']['survey_sessions']['Update']
export type SurveyResponseUpdate = Database['public']['Tables']['survey_responses']['Update']

// JTBD Force types
export type JTBDForce = 'demographic' | 'pain_of_old' | 'pull_of_new' | 'anchors_to_old' | 'anxiety_of_new'
export type UserRole = 'user' | 'org_admin' | 'admin'
export type SurveyStatus = 'draft' | 'active' | 'paused' | 'archived'
export type SessionStatus = 'not_started' | 'in_progress' | 'completed' | 'abandoned' | 'expired'
export type InputMethod = 'text' | 'voice' | 'mixed'
export type ResponseQuality = 'poor' | 'fair' | 'good' | 'excellent'
export type SentimentLabel = 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive'
export type ReadinessLevel = 'not_ready' | 'cautiously_ready' | 'ready' | 'very_ready'
export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'very_high'