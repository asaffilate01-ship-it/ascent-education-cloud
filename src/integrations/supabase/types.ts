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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      academic_events: {
        Row: {
          all_day: boolean
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          event_type: string
          id: string
          location: string | null
          start_date: string
          tenant_id: string
          title: string
          updated_at: string
          visible_to: string[] | null
        }
        Insert: {
          all_day?: boolean
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          location?: string | null
          start_date: string
          tenant_id: string
          title: string
          updated_at?: string
          visible_to?: string[] | null
        }
        Update: {
          all_day?: boolean
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          location?: string | null
          start_date?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          visible_to?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_progression_audit: {
        Row: {
          changed_by: string | null
          created_at: string
          evidence_id: string
          id: string
          new_status: string | null
          old_status: string | null
          tenant_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          evidence_id: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          tenant_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          evidence_id?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_progression_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_progression_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_progression_evidence: {
        Row: {
          awarding_body: string
          created_at: string
          destination_country: string
          destination_institution: string
          destination_programme: string
          english_requirements: string | null
          entry_stage: string | null
          grade_requirements: string | null
          id: string
          qualification_level: string
          qualification_name: string
          recheck_due: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_kind: string
          source_url: string | null
          student_visible: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          awarding_body: string
          created_at?: string
          destination_country: string
          destination_institution: string
          destination_programme: string
          english_requirements?: string | null
          entry_stage?: string | null
          grade_requirements?: string | null
          id?: string
          qualification_level: string
          qualification_name: string
          recheck_due?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_kind?: string
          source_url?: string | null
          student_visible?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          awarding_body?: string
          created_at?: string
          destination_country?: string
          destination_institution?: string
          destination_programme?: string
          english_requirements?: string | null
          entry_stage?: string | null
          grade_requirements?: string | null
          id?: string
          qualification_level?: string
          qualification_name?: string
          recheck_due?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_kind?: string
          source_url?: string | null
          student_visible?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_progression_evidence_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_progression_evidence_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      accreditation_bodies: {
        Row: {
          country: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          short_name: string
          tenant_id: string | null
          website_url: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          short_name: string
          tenant_id?: string | null
          website_url?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          short_name?: string
          tenant_id?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accreditation_bodies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accreditation_bodies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          agent_id: string | null
          counsellor: string | null
          created_at: string
          destination: string | null
          document_checklist: Json | null
          email: string
          id: string
          intake: string | null
          level: string | null
          notes: string | null
          phone: string | null
          programme_id: string | null
          programme_name: string | null
          source: string | null
          stage: Database["public"]["Enums"]["application_stage"]
          student_name: string
          study_level: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          counsellor?: string | null
          created_at?: string
          destination?: string | null
          document_checklist?: Json | null
          email: string
          id?: string
          intake?: string | null
          level?: string | null
          notes?: string | null
          phone?: string | null
          programme_id?: string | null
          programme_name?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["application_stage"]
          student_name: string
          study_level?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          counsellor?: string | null
          created_at?: string
          destination?: string | null
          document_checklist?: Json | null
          email?: string
          id?: string
          intake?: string | null
          level?: string | null
          notes?: string | null
          phone?: string | null
          programme_id?: string | null
          programme_name?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["application_stage"]
          student_name?: string
          study_level?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string
          deadline: string
          description: string | null
          id: string
          max_marks: number
          module_id: string | null
          status: string
          tenant_id: string
          title: string
          type: string
          updated_at: string
          word_count: string | null
        }
        Insert: {
          created_at?: string
          deadline: string
          description?: string | null
          id?: string
          max_marks?: number
          module_id?: string | null
          status?: string
          tenant_id: string
          title: string
          type?: string
          updated_at?: string
          word_count?: string | null
        }
        Update: {
          created_at?: string
          deadline?: string
          description?: string | null
          id?: string
          max_marks?: number
          module_id?: string | null
          status?: string
          tenant_id?: string
          title?: string
          type?: string
          updated_at?: string
          word_count?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_corrections: {
        Row: {
          attendance_date: string
          created_at: string
          id: string
          module_id: string
          original_method: string | null
          original_status: Database["public"]["Enums"]["attendance_status"]
          reason: string
          record_id: string
          requested_by: string
          requested_status: Database["public"]["Enums"]["attendance_status"]
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          attendance_date: string
          created_at?: string
          id: string
          module_id: string
          original_method?: string | null
          original_status: Database["public"]["Enums"]["attendance_status"]
          reason: string
          record_id: string
          requested_by: string
          requested_status: Database["public"]["Enums"]["attendance_status"]
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string
          student_id: string
          tenant_id: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          id?: string
          module_id?: string
          original_method?: string | null
          original_status?: Database["public"]["Enums"]["attendance_status"]
          reason?: string
          record_id?: string
          requested_by?: string
          requested_status?: Database["public"]["Enums"]["attendance_status"]
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_corrections_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_corrections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          created_at: string
          date: string
          id: string
          method: string | null
          module_id: string | null
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          method?: string | null
          module_id?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          method?: string | null
          module_id?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          tenant_id: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          tenant_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          tenant_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      career_organisations: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          id: string
          name: string
          organisation_type: string
          partner_status: string
          tenant_id: string
          verified: boolean
          website: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
          organisation_type: string
          partner_status?: string
          tenant_id: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          organisation_type?: string
          partner_status?: string
          tenant_id?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      cctv_access_events: {
        Row: {
          camera_id: string
          created_at: string
          ends_at: string | null
          id: string
          mode: string
          reason: string | null
          starts_at: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          camera_id: string
          created_at?: string
          ends_at?: string | null
          id?: string
          mode: string
          reason?: string | null
          starts_at?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          camera_id?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          mode?: string
          reason?: string | null
          starts_at?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cctv_access_events_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "unipathway_cctv_cameras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cctv_access_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cctv_access_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_verifications: {
        Row: {
          awarding_body: string
          certificate_number: string
          created_at: string
          expiry_date: string | null
          grade: string | null
          id: string
          issue_date: string
          level: string
          programme_title: string
          status: string
          student_name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          awarding_body?: string
          certificate_number: string
          created_at?: string
          expiry_date?: string | null
          grade?: string | null
          id?: string
          issue_date: string
          level: string
          programme_title: string
          status?: string
          student_name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          awarding_body?: string
          certificate_number?: string
          created_at?: string
          expiry_date?: string | null
          grade?: string | null
          id?: string
          issue_date?: string
          level?: string
          programme_title?: string
          status?: string
          student_name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_verifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_verifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      classroom_recordings: {
        Row: {
          class_release_session_id: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          file_size_mb: number | null
          host_id: string
          host_name: string | null
          id: string
          recorded_at: string
          recording_url: string | null
          room_name: string
          session_id: string | null
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          class_release_session_id?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          file_size_mb?: number | null
          host_id: string
          host_name?: string | null
          id?: string
          recorded_at?: string
          recording_url?: string | null
          room_name: string
          session_id?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          class_release_session_id?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          file_size_mb?: number | null
          host_id?: string
          host_name?: string | null
          id?: string
          recorded_at?: string
          recording_url?: string | null
          room_name?: string
          session_id?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classroom_recordings_class_release_session_id_fkey"
            columns: ["class_release_session_id"]
            isOneToOne: false
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "classroom_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_recordings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_recordings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      classroom_sessions: {
        Row: {
          created_at: string
          display_name: string
          ended_at: string | null
          host_id: string
          id: string
          module_id: string | null
          participant_count: number
          recording_url: string | null
          room_name: string
          started_at: string
          status: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          ended_at?: string | null
          host_id: string
          id?: string
          module_id?: string | null
          participant_count?: number
          recording_url?: string | null
          room_name: string
          started_at?: string
          status?: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          ended_at?: string | null
          host_id?: string
          id?: string
          module_id?: string | null
          participant_count?: number
          recording_url?: string | null
          room_name?: string
          started_at?: string
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classroom_sessions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_checklists: {
        Row: {
          awarding_body: string
          category: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          due_date: string | null
          evidence_notes: string | null
          evidence_url: string | null
          id: string
          is_completed: boolean
          item_description: string | null
          item_title: string
          priority: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          awarding_body: string
          category: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_date?: string | null
          evidence_notes?: string | null
          evidence_url?: string | null
          id?: string
          is_completed?: boolean
          item_description?: string | null
          item_title: string
          priority?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          awarding_body?: string
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_date?: string | null
          evidence_notes?: string | null
          evidence_url?: string | null
          id?: string
          is_completed?: boolean
          item_description?: string | null
          item_title?: string
          priority?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checklists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_checklists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          consent_type: string
          created_at: string
          granted: boolean
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          granted?: boolean
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          granted?: boolean
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          name: string | null
          tenant_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          tenant_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          tenant_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      e_signatures: {
        Row: {
          created_at: string
          document_id: string | null
          document_type: string
          full_name: string
          id: string
          ip_address: string | null
          signature_data: string
          signed_at: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          document_type: string
          full_name: string
          id?: string
          ip_address?: string | null
          signature_data: string
          signed_at?: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          document_type?: string
          full_name?: string
          id?: string
          ip_address?: string | null
          signature_data?: string
          signed_at?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "e_signatures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "e_signatures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      education_partner_applications: {
        Row: {
          approval_reference: string | null
          approval_verified_at: string | null
          approval_verified_by: string | null
          country: string
          created_at: string
          documents_checklist: string | null
          id: string
          next_action: string | null
          next_action_at: string | null
          notes: string | null
          official_application_url: string | null
          organisation_name: string
          owner_id: string | null
          programme: string
          stage: string
          submitted_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approval_reference?: string | null
          approval_verified_at?: string | null
          approval_verified_by?: string | null
          country: string
          created_at?: string
          documents_checklist?: string | null
          id?: string
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          official_application_url?: string | null
          organisation_name: string
          owner_id?: string | null
          programme: string
          stage?: string
          submitted_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approval_reference?: string | null
          approval_verified_at?: string | null
          approval_verified_by?: string | null
          country?: string
          created_at?: string
          documents_checklist?: string | null
          id?: string
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          official_application_url?: string | null
          organisation_name?: string
          owner_id?: string | null
          programme?: string
          stage?: string
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_partner_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "education_partner_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      education_staff_credentials: {
        Row: {
          created_at: string
          credential_name: string
          credential_number: string | null
          evidence_reference: string | null
          expires_on: string | null
          id: string
          issued_on: string | null
          provider_name: string
          staff_id: string
          status: string
          tenant_id: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          credential_name: string
          credential_number?: string | null
          evidence_reference?: string | null
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          provider_name: string
          staff_id: string
          status?: string
          tenant_id: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          credential_name?: string
          credential_number?: string | null
          evidence_reference?: string | null
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          provider_name?: string
          staff_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "education_staff_credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "education_staff_credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          category: Database["public"]["Enums"]["expense_category"]
          commission_percentage: number | null
          created_at: string
          created_by: string | null
          currency: string
          description: string
          expense_date: string
          id: string
          is_recurring: boolean
          is_reimbursable: boolean
          notes: string | null
          paid_by_name: string | null
          paid_by_user_id: string | null
          payment_method: Database["public"]["Enums"]["expense_payment_method"]
          payment_reference: string | null
          receipt_url: string | null
          recurring_frequency: string | null
          reimbursed_amount: number | null
          reimbursed_at: string | null
          reimbursed_by: string | null
          reimbursement_status: string | null
          rejection_reason: string | null
          related_invoice_id: string | null
          status: string
          student_id: string | null
          student_name: string | null
          subcategory: string | null
          tenant_id: string | null
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          agent_id?: string | null
          agent_name?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          commission_percentage?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          is_reimbursable?: boolean
          notes?: string | null
          paid_by_name?: string | null
          paid_by_user_id?: string | null
          payment_method?: Database["public"]["Enums"]["expense_payment_method"]
          payment_reference?: string | null
          receipt_url?: string | null
          recurring_frequency?: string | null
          reimbursed_amount?: number | null
          reimbursed_at?: string | null
          reimbursed_by?: string | null
          reimbursement_status?: string | null
          rejection_reason?: string | null
          related_invoice_id?: string | null
          status?: string
          student_id?: string | null
          student_name?: string | null
          subcategory?: string | null
          tenant_id?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          agent_id?: string | null
          agent_name?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          commission_percentage?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          is_reimbursable?: boolean
          notes?: string | null
          paid_by_name?: string | null
          paid_by_user_id?: string | null
          payment_method?: Database["public"]["Enums"]["expense_payment_method"]
          payment_reference?: string | null
          receipt_url?: string | null
          recurring_frequency?: string | null
          reimbursed_amount?: number | null
          reimbursed_at?: string | null
          reimbursed_by?: string | null
          reimbursement_status?: string | null
          rejection_reason?: string | null
          related_invoice_id?: string | null
          status?: string
          student_id?: string | null
          student_name?: string | null
          subcategory?: string | null
          tenant_id?: string | null
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_related_invoice_id_fkey"
            columns: ["related_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_replies: {
        Row: {
          author_id: string
          author_name: string
          content: string
          created_at: string | null
          id: string
          is_solution: boolean | null
          thread_id: string
          updated_at: string | null
          upvotes: number | null
        }
        Insert: {
          author_id: string
          author_name: string
          content: string
          created_at?: string | null
          id?: string
          is_solution?: boolean | null
          thread_id: string
          updated_at?: string | null
          upvotes?: number | null
        }
        Update: {
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string | null
          id?: string
          is_solution?: boolean | null
          thread_id?: string
          updated_at?: string | null
          upvotes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_threads: {
        Row: {
          author_id: string
          author_name: string
          content: string
          created_at: string | null
          id: string
          is_locked: boolean | null
          is_pinned: boolean | null
          last_activity_at: string | null
          module_id: string | null
          reply_count: number | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          author_name: string
          content: string
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_activity_at?: string | null
          module_id?: string | null
          reply_count?: number | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_activity_at?: string | null
          module_id?: string | null
          reply_count?: number | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_threads_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_threads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_threads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      gradebook_entries: {
        Row: {
          assessment_title: string
          assessment_type: string | null
          created_at: string | null
          feedback: string | null
          grade: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          max_grade: number | null
          module_id: string
          programme_id: string
          status: string | null
          student_id: string
          tenant_id: string
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          assessment_title: string
          assessment_type?: string | null
          created_at?: string | null
          feedback?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          max_grade?: number | null
          module_id: string
          programme_id: string
          status?: string | null
          student_id: string
          tenant_id: string
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          assessment_title?: string
          assessment_type?: string | null
          created_at?: string | null
          feedback?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          max_grade?: number | null
          module_id?: string
          programme_id?: string
          status?: string | null
          student_id?: string
          tenant_id?: string
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gradebook_entries_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradebook_entries_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradebook_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradebook_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      health_records: {
        Row: {
          allergies: string[] | null
          blood_group: string | null
          created_at: string
          doctor_name: string | null
          doctor_phone: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          id: string
          insurance_number: string | null
          insurance_provider: string | null
          last_checkup_date: string | null
          medical_conditions: string[] | null
          medications: string[] | null
          notes: string | null
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allergies?: string[] | null
          blood_group?: string | null
          created_at?: string
          doctor_name?: string | null
          doctor_phone?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          last_checkup_date?: string | null
          medical_conditions?: string[] | null
          medications?: string[] | null
          notes?: string | null
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allergies?: string[] | null
          blood_group?: string | null
          created_at?: string
          doctor_name?: string | null
          doctor_phone?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          last_checkup_date?: string | null
          medical_conditions?: string[] | null
          medications?: string[] | null
          notes?: string | null
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ielts_mock_rehearsals: {
        Row: {
          assessed_at: string | null
          assessed_by: string | null
          assigned_by: string
          created_at: string
          delivery: string
          id: string
          listening_correct: number | null
          listening_questions: number | null
          reading_correct: number | null
          reading_questions: number | null
          rehearsal_type: string
          scheduled_at: string
          speaking_observations: string | null
          status: string
          student_id: string
          tenant_id: string
          track: string
          tutor_next_steps: string | null
          updated_at: string
          writing_observations: string | null
        }
        Insert: {
          assessed_at?: string | null
          assessed_by?: string | null
          assigned_by: string
          created_at?: string
          delivery: string
          id?: string
          listening_correct?: number | null
          listening_questions?: number | null
          reading_correct?: number | null
          reading_questions?: number | null
          rehearsal_type: string
          scheduled_at: string
          speaking_observations?: string | null
          status?: string
          student_id: string
          tenant_id: string
          track: string
          tutor_next_steps?: string | null
          updated_at?: string
          writing_observations?: string | null
        }
        Update: {
          assessed_at?: string | null
          assessed_by?: string | null
          assigned_by?: string
          created_at?: string
          delivery?: string
          id?: string
          listening_correct?: number | null
          listening_questions?: number | null
          reading_correct?: number | null
          reading_questions?: number | null
          rehearsal_type?: string
          scheduled_at?: string
          speaking_observations?: string | null
          status?: string
          student_id?: string
          tenant_id?: string
          track?: string
          tutor_next_steps?: string | null
          updated_at?: string
          writing_observations?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ielts_mock_rehearsals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ielts_mock_rehearsals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ielts_practice_submissions: {
        Row: {
          answer_text: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          skill: string
          student_id: string
          submitted_at: string
          teacher_band: number | null
          teacher_feedback: string | null
          tenant_id: string
          track: string
          unit_week: number
        }
        Insert: {
          answer_text: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          skill: string
          student_id: string
          submitted_at?: string
          teacher_band?: number | null
          teacher_feedback?: string | null
          tenant_id: string
          track: string
          unit_week: number
        }
        Update: {
          answer_text?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          skill?: string
          student_id?: string
          submitted_at?: string
          teacher_band?: number | null
          teacher_feedback?: string | null
          tenant_id?: string
          track?: string
          unit_week?: number
        }
        Relationships: [
          {
            foreignKeyName: "ielts_practice_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ielts_practice_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ielts_speaking_recordings: {
        Row: {
          consent_at: string
          created_at: string
          duration_seconds: number
          fluency_band: number | null
          grammar_band: number | null
          id: string
          lexical_band: number | null
          mime_type: string
          prompt_key: string
          pronunciation_band: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          storage_path: string
          student_id: string
          teacher_feedback: string | null
          tenant_id: string
          track: string
        }
        Insert: {
          consent_at: string
          created_at?: string
          duration_seconds: number
          fluency_band?: number | null
          grammar_band?: number | null
          id?: string
          lexical_band?: number | null
          mime_type: string
          prompt_key: string
          pronunciation_band?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          storage_path: string
          student_id: string
          teacher_feedback?: string | null
          tenant_id: string
          track: string
        }
        Update: {
          consent_at?: string
          created_at?: string
          duration_seconds?: number
          fluency_band?: number | null
          grammar_band?: number | null
          id?: string
          lexical_band?: number | null
          mime_type?: string
          prompt_key?: string
          pronunciation_band?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          storage_path?: string
          student_id?: string
          teacher_feedback?: string | null
          tenant_id?: string
          track?: string
        }
        Relationships: [
          {
            foreignKeyName: "ielts_speaking_recordings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ielts_speaking_recordings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ielts_study_plans: {
        Row: {
          id: string
          started_at: string
          student_id: string
          study_goal: string
          target_band: number
          tenant_id: string
          track: string
          updated_at: string
        }
        Insert: {
          id?: string
          started_at?: string
          student_id: string
          study_goal?: string
          target_band?: number
          tenant_id: string
          track: string
          updated_at?: string
        }
        Update: {
          id?: string
          started_at?: string
          student_id?: string
          study_goal?: string
          target_band?: number
          tenant_id?: string
          track?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ielts_study_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ielts_study_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ielts_unit_completions: {
        Row: {
          completed_at: string
          id: string
          student_id: string
          tenant_id: string
          track: string
          unit_week: number
        }
        Insert: {
          completed_at?: string
          id?: string
          student_id: string
          tenant_id: string
          track: string
          unit_week: number
        }
        Update: {
          completed_at?: string
          id?: string
          student_id?: string
          tenant_id?: string
          track?: string
          unit_week?: number
        }
        Relationships: [
          {
            foreignKeyName: "ielts_unit_completions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ielts_unit_completions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      interactive_lab_ai_usage: {
        Row: {
          request_count: number
          usage_day: string
          user_id: string
        }
        Insert: {
          request_count?: number
          usage_day: string
          user_id: string
        }
        Update: {
          request_count?: number
          usage_day?: string
          user_id?: string
        }
        Relationships: []
      }
      interactive_lab_attempts: {
        Row: {
          activity_id: string
          audio_path: string | null
          content: string
          created_at: string
          feedback_at: string | null
          feedback_by: string | null
          id: string
          lab_kind: string
          passed: boolean | null
          result: Json
          score: number | null
          session_id: string | null
          teacher_feedback: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          activity_id: string
          audio_path?: string | null
          content?: string
          created_at?: string
          feedback_at?: string | null
          feedback_by?: string | null
          id?: string
          lab_kind: string
          passed?: boolean | null
          result?: Json
          score?: number | null
          session_id?: string | null
          teacher_feedback?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          activity_id?: string
          audio_path?: string | null
          content?: string
          created_at?: string
          feedback_at?: string | null
          feedback_by?: string | null
          id?: string
          lab_kind?: string
          passed?: boolean | null
          result?: Json
          score?: number | null
          session_id?: string | null
          teacher_feedback?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactive_lab_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interactive_lab_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interactive_lab_participants: {
        Row: {
          current_activity: string | null
          display_name: string
          hand_raised: boolean
          id: string
          joined_at: string
          last_seen: string
          location: string
          session_id: string
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          current_activity?: string | null
          display_name?: string
          hand_raised?: boolean
          id?: string
          joined_at?: string
          last_seen?: string
          location?: string
          session_id: string
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          current_activity?: string | null
          display_name?: string
          hand_raised?: boolean
          id?: string
          joined_at?: string
          last_seen?: string
          location?: string
          session_id?: string
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactive_lab_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interactive_lab_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interactive_lab_sessions: {
        Row: {
          activity_id: string | null
          activity_revision: number
          broadcast: Json
          created_at: string
          created_by: string
          ended_at: string | null
          id: string
          join_code: string
          kind: string
          locked: boolean
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          activity_id?: string | null
          activity_revision?: number
          broadcast?: Json
          created_at?: string
          created_by: string
          ended_at?: string | null
          id?: string
          join_code: string
          kind: string
          locked?: boolean
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          activity_id?: string | null
          activity_revision?: number
          broadcast?: Json
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          join_code?: string
          kind?: string
          locked?: boolean
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      international_education_partners: {
        Row: {
          accreditation_status: string
          agreement_signed_on: string | null
          countries: string[]
          created_at: string
          id: string
          last_reviewed_at: string | null
          name: string
          next_action: string | null
          next_action_at: string | null
          notes: string | null
          owner_id: string | null
          partner_kind: string
          relationship_status: string
          slug: string
          tenant_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          accreditation_status?: string
          agreement_signed_on?: string | null
          countries?: string[]
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          name: string
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          owner_id?: string | null
          partner_kind: string
          relationship_status?: string
          slug: string
          tenant_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          accreditation_status?: string
          agreement_signed_on?: string | null
          countries?: string[]
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          name?: string
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          owner_id?: string | null
          partner_kind?: string
          relationship_status?: string
          slug?: string
          tenant_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "international_education_partners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "international_education_partners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      international_partner_agreements: {
        Row: {
          agreement_type: string
          clawback_days: number | null
          commission_amount: number | null
          commission_basis: string | null
          commission_currency: string | null
          created_at: string
          document_id: string | null
          document_reference: string | null
          ends_on: string | null
          id: string
          notes: string | null
          partner_id: string
          starts_on: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          agreement_type: string
          clawback_days?: number | null
          commission_amount?: number | null
          commission_basis?: string | null
          commission_currency?: string | null
          created_at?: string
          document_id?: string | null
          document_reference?: string | null
          ends_on?: string | null
          id?: string
          notes?: string | null
          partner_id: string
          starts_on?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          agreement_type?: string
          clawback_days?: number | null
          commission_amount?: number | null
          commission_basis?: string | null
          commission_currency?: string | null
          created_at?: string
          document_id?: string | null
          document_reference?: string | null
          ends_on?: string | null
          id?: string
          notes?: string | null
          partner_id?: string
          starts_on?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreement_document_tenant"
            columns: ["document_id", "tenant_id", "partner_id"]
            isOneToOne: false
            referencedRelation: "international_partner_documents"
            referencedColumns: ["id", "tenant_id", "partner_id"]
          },
          {
            foreignKeyName: "agreements_partner_tenant"
            columns: ["partner_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "international_education_partners"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "international_partner_agreements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "international_partner_agreements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      international_partner_audit: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_table: string
          id: string
          new_status: string | null
          old_status: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_table: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_table?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "international_partner_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "international_partner_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      international_partner_documents: {
        Row: {
          created_at: string
          id: string
          original_name: string
          partner_id: string
          storage_path: string
          tenant_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          original_name: string
          partner_id: string
          storage_path: string
          tenant_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          original_name?: string
          partner_id?: string
          storage_path?: string
          tenant_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "international_partner_documents_partner_id_tenant_id_fkey"
            columns: ["partner_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "international_education_partners"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "international_partner_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "international_partner_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      international_partner_referrals: {
        Row: {
          created_at: string
          external_application_ref: string | null
          id: string
          international_application_id: string | null
          partner_id: string
          recipient_name: string
          route_id: string | null
          status: string
          student_consent_at: string | null
          student_id: string
          submitted_at: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          external_application_ref?: string | null
          id?: string
          international_application_id?: string | null
          partner_id: string
          recipient_name?: string
          route_id?: string | null
          status?: string
          student_consent_at?: string | null
          student_id: string
          submitted_at?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          external_application_ref?: string | null
          id?: string
          international_application_id?: string | null
          partner_id?: string
          recipient_name?: string
          route_id?: string | null
          status?: string
          student_consent_at?: string | null
          student_id?: string
          submitted_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "international_partner_referrals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "international_partner_referrals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_route_matches_partner"
            columns: ["route_id", "tenant_id", "partner_id"]
            isOneToOne: false
            referencedRelation: "international_pathway_routes"
            referencedColumns: ["id", "tenant_id", "partner_id"]
          },
          {
            foreignKeyName: "referrals_same_tenant_application"
            columns: ["international_application_id", "tenant_id", "student_id"]
            isOneToOne: false
            referencedRelation: "international_university_applications"
            referencedColumns: ["id", "tenant_id", "student_id"]
          },
          {
            foreignKeyName: "referrals_same_tenant_partner"
            columns: ["partner_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "international_education_partners"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "referrals_same_tenant_route"
            columns: ["route_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "international_pathway_routes"
            referencedColumns: ["id", "tenant_id"]
          },
        ]
      }
      international_pathway_routes: {
        Row: {
          awarding_body_id: string | null
          created_at: string
          destination_country: string
          destination_institution: string
          destination_programme: string
          english_requirements: string | null
          entry_stage: string | null
          evidence_reviewed_at: string | null
          evidence_url: string | null
          grade_requirements: string | null
          id: string
          notes: string | null
          partner_id: string
          pathway_type: string
          qualification_level: string | null
          qualification_name: string | null
          review_status: string
          route_name: string
          student_visible: boolean
          tenant_id: string
          updated_at: string
          verified_by: string | null
        }
        Insert: {
          awarding_body_id?: string | null
          created_at?: string
          destination_country: string
          destination_institution: string
          destination_programme: string
          english_requirements?: string | null
          entry_stage?: string | null
          evidence_reviewed_at?: string | null
          evidence_url?: string | null
          grade_requirements?: string | null
          id?: string
          notes?: string | null
          partner_id: string
          pathway_type?: string
          qualification_level?: string | null
          qualification_name?: string | null
          review_status?: string
          route_name: string
          student_visible?: boolean
          tenant_id: string
          updated_at?: string
          verified_by?: string | null
        }
        Update: {
          awarding_body_id?: string | null
          created_at?: string
          destination_country?: string
          destination_institution?: string
          destination_programme?: string
          english_requirements?: string | null
          entry_stage?: string | null
          evidence_reviewed_at?: string | null
          evidence_url?: string | null
          grade_requirements?: string | null
          id?: string
          notes?: string | null
          partner_id?: string
          pathway_type?: string
          qualification_level?: string | null
          qualification_name?: string | null
          review_status?: string
          route_name?: string
          student_visible?: boolean
          tenant_id?: string
          updated_at?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "international_pathway_routes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "international_pathway_routes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_same_tenant_awarder"
            columns: ["awarding_body_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "international_education_partners"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "route_same_tenant_partner"
            columns: ["partner_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "international_education_partners"
            referencedColumns: ["id", "tenant_id"]
          },
        ]
      }
      international_service_enrolments: {
        Row: {
          assigned_by: string
          billing_mode: string
          created_at: string
          enquiry_id: string
          id: string
          service_type: string
          status: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          billing_mode: string
          created_at?: string
          enquiry_id: string
          id?: string
          service_type: string
          status?: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          billing_mode?: string
          created_at?: string
          enquiry_id?: string
          id?: string
          service_type?: string
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "international_service_enrolments_enquiry_id_tenant_id_fkey"
            columns: ["enquiry_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "international_service_enrolments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "international_service_enrolments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      international_support_tasks: {
        Row: {
          application_id: string
          completed_at: string | null
          created_at: string
          due_at: string | null
          id: string
          notes: string | null
          owner_id: string | null
          status: string
          task_type: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          application_id: string
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          status?: string
          task_type: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          status?: string
          task_type?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "international_support_tasks_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "international_university_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_same_tenant_application"
            columns: ["application_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "international_university_applications"
            referencedColumns: ["id", "tenant_id"]
          },
        ]
      }
      international_university_applications: {
        Row: {
          accommodation_status: string
          arrival_support_status: string
          commission_currency: string | null
          commission_expected: number | null
          commission_status: string
          counsellor_id: string | null
          created_at: string
          currency: string | null
          destination_country: string
          documents: Json
          id: string
          intake: string | null
          offer_reference: string | null
          offer_type: string | null
          predeparture_status: string
          programme: string
          status: string
          student_id: string
          tenant_id: string
          tuition_fee: number | null
          university_organisation_id: string
          updated_at: string
        }
        Insert: {
          accommodation_status?: string
          arrival_support_status?: string
          commission_currency?: string | null
          commission_expected?: number | null
          commission_status?: string
          counsellor_id?: string | null
          created_at?: string
          currency?: string | null
          destination_country: string
          documents?: Json
          id?: string
          intake?: string | null
          offer_reference?: string | null
          offer_type?: string | null
          predeparture_status?: string
          programme: string
          status?: string
          student_id: string
          tenant_id: string
          tuition_fee?: number | null
          university_organisation_id: string
          updated_at?: string
        }
        Update: {
          accommodation_status?: string
          arrival_support_status?: string
          commission_currency?: string | null
          commission_expected?: number | null
          commission_status?: string
          counsellor_id?: string | null
          created_at?: string
          currency?: string | null
          destination_country?: string
          documents?: Json
          id?: string
          intake?: string | null
          offer_reference?: string | null
          offer_type?: string | null
          predeparture_status?: string
          programme?: string
          status?: string
          student_id?: string
          tenant_id?: string
          tuition_fee?: number | null
          university_organisation_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "international_university_applic_university_organisation_id_fkey"
            columns: ["university_organisation_id"]
            isOneToOne: false
            referencedRelation: "career_organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          funding_note: string
          id: string
          instalments: number | null
          issued_date: string
          paid: number
          sponsor_amount: number
          sponsor_due_on: string | null
          sponsor_name: string
          sponsor_paid: number
          sponsor_reference: string
          status: Database["public"]["Enums"]["invoice_status"]
          student_id: string | null
          student_name: string
          tenant_id: string | null
          type: Database["public"]["Enums"]["invoice_type"]
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date?: string | null
          funding_note?: string
          id?: string
          instalments?: number | null
          issued_date?: string
          paid?: number
          sponsor_amount?: number
          sponsor_due_on?: string | null
          sponsor_name?: string
          sponsor_paid?: number
          sponsor_reference?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          student_id?: string | null
          student_name: string
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["invoice_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          funding_note?: string
          id?: string
          instalments?: number | null
          issued_date?: string
          paid?: number
          sponsor_amount?: number
          sponsor_due_on?: string | null
          sponsor_name?: string
          sponsor_paid?: number
          sponsor_reference?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          student_id?: string | null
          student_name?: string
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["invoice_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      job_listings: {
        Row: {
          company: string
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          location: string
          salary: string | null
          status: string
          tenant_id: string | null
          title: string
          type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          company: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          location: string
          salary?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          type?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          company?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          location?: string
          salary?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_listings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_listings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          created_at: string
          document_type: string
          expiry_date: string | null
          file_name: string | null
          file_url: string | null
          id: string
          metadata: Json | null
          rejection_reason: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          expiry_date?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          expiry_date?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kyc_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_class_runs: {
        Row: {
          cohort_reference: string
          created_at: string
          ends_at: string | null
          id: string
          lead_instructor_id: string
          live_class_session_id: string | null
          max_concurrent: number
          starts_at: string | null
          status: string
          ta_user_ids: string[]
          template_id: string
          tenant_id: string
        }
        Insert: {
          cohort_reference: string
          created_at?: string
          ends_at?: string | null
          id?: string
          lead_instructor_id: string
          live_class_session_id?: string | null
          max_concurrent?: number
          starts_at?: string | null
          status?: string
          ta_user_ids?: string[]
          template_id: string
          tenant_id: string
        }
        Update: {
          cohort_reference?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          lead_instructor_id?: string
          live_class_session_id?: string | null
          max_concurrent?: number
          starts_at?: string | null
          status?: string
          ta_user_ids?: string[]
          template_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_class_runs_live_class_session_id_fkey"
            columns: ["live_class_session_id"]
            isOneToOne: false
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_class_runs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "lab_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_evidence: {
        Row: {
          captured_at: string
          evidence_reference: string | null
          evidence_type: string
          id: string
          session_id: string
          signed_off_at: string | null
          signed_off_by: string | null
          task_id: string | null
          tenant_id: string
          verification: Json
        }
        Insert: {
          captured_at?: string
          evidence_reference?: string | null
          evidence_type: string
          id?: string
          session_id: string
          signed_off_at?: string | null
          signed_off_by?: string | null
          task_id?: string | null
          tenant_id: string
          verification?: Json
        }
        Update: {
          captured_at?: string
          evidence_reference?: string | null
          evidence_type?: string
          id?: string
          session_id?: string
          signed_off_at?: string | null
          signed_off_by?: string | null
          task_id?: string | null
          tenant_id?: string
          verification?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lab_evidence_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lab_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_evidence_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "lab_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_help_requests: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          id: string
          message: string | null
          priority: string
          requested_at: string
          resolved_at: string | null
          session_id: string
          status: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          id?: string
          message?: string | null
          priority?: string
          requested_at?: string
          resolved_at?: string | null
          session_id: string
          status?: string
          student_id: string
          tenant_id: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          id?: string
          message?: string | null
          priority?: string
          requested_at?: string
          resolved_at?: string | null
          session_id?: string
          status?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_help_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lab_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_instructor_access: {
        Row: {
          ended_at: string | null
          id: string
          instructor_id: string
          metadata: Json
          mode: string
          reason: string
          session_id: string
          started_at: string
          tenant_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          instructor_id: string
          metadata?: Json
          mode: string
          reason: string
          session_id: string
          started_at?: string
          tenant_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          instructor_id?: string
          metadata?: Json
          mode?: string
          reason?: string
          session_id?: string
          started_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_instructor_access_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lab_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_provider_configs: {
        Row: {
          budget_currency: string
          budget_monthly: number | null
          capabilities: Json
          credential_status: string
          display_name: string
          enabled: boolean
          hard_stop_minutes: number
          id: string
          idle_shutdown_minutes: number
          max_concurrent: number
          metadata: Json
          provider: string
          tenant_id: string
          verified_at: string | null
        }
        Insert: {
          budget_currency?: string
          budget_monthly?: number | null
          capabilities?: Json
          credential_status?: string
          display_name: string
          enabled?: boolean
          hard_stop_minutes?: number
          id?: string
          idle_shutdown_minutes?: number
          max_concurrent?: number
          metadata?: Json
          provider: string
          tenant_id: string
          verified_at?: string | null
        }
        Update: {
          budget_currency?: string
          budget_monthly?: number | null
          capabilities?: Json
          credential_status?: string
          display_name?: string
          enabled?: boolean
          hard_stop_minutes?: number
          id?: string
          idle_shutdown_minutes?: number
          max_concurrent?: number
          metadata?: Json
          provider?: string
          tenant_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      lab_screen_shares: {
        Row: {
          ended_at: string | null
          id: string
          is_active: boolean
          lab_session_id: string
          started_at: string
          user_id: string
          user_name: string
          user_role: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          is_active?: boolean
          lab_session_id: string
          started_at?: string
          user_id: string
          user_name: string
          user_role?: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          is_active?: boolean
          lab_session_id?: string
          started_at?: string
          user_id?: string
          user_name?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_screen_shares_lab_session_id_fkey"
            columns: ["lab_session_id"]
            isOneToOne: false
            referencedRelation: "lab_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_sessions: {
        Row: {
          attempt_no: number
          broker_ready_at: string | null
          class_run_id: string | null
          classroom_session_id: string | null
          cohort_reference: string | null
          created_at: string
          description: string | null
          ended_at: string | null
          estimated_cost: number
          expires_at: string | null
          id: string
          idle_shutdown_minutes: number
          is_lab_mode: boolean
          last_activity_at: string | null
          launch_mode: string | null
          lecturer_id: string
          minutes_used: number
          module_id: string | null
          offering_id: string | null
          provider_session_id: string | null
          scheduled_at: string | null
          started_at: string | null
          status: string
          stop_requested_at: string | null
          student_id: string | null
          template_id: string | null
          tenant_id: string
          title: string
          updated_at: string
          workspace_reference: string | null
        }
        Insert: {
          attempt_no?: number
          broker_ready_at?: string | null
          class_run_id?: string | null
          classroom_session_id?: string | null
          cohort_reference?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          estimated_cost?: number
          expires_at?: string | null
          id?: string
          idle_shutdown_minutes?: number
          is_lab_mode?: boolean
          last_activity_at?: string | null
          launch_mode?: string | null
          lecturer_id: string
          minutes_used?: number
          module_id?: string | null
          offering_id?: string | null
          provider_session_id?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          stop_requested_at?: string | null
          student_id?: string | null
          template_id?: string | null
          tenant_id: string
          title?: string
          updated_at?: string
          workspace_reference?: string | null
        }
        Update: {
          attempt_no?: number
          broker_ready_at?: string | null
          class_run_id?: string | null
          classroom_session_id?: string | null
          cohort_reference?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          estimated_cost?: number
          expires_at?: string | null
          id?: string
          idle_shutdown_minutes?: number
          is_lab_mode?: boolean
          last_activity_at?: string | null
          launch_mode?: string | null
          lecturer_id?: string
          minutes_used?: number
          module_id?: string | null
          offering_id?: string | null
          provider_session_id?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          stop_requested_at?: string | null
          student_id?: string | null
          template_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          workspace_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_sessions_class_run_id_fkey"
            columns: ["class_run_id"]
            isOneToOne: false
            referencedRelation: "lab_class_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_sessions_classroom_session_id_fkey"
            columns: ["classroom_session_id"]
            isOneToOne: false
            referencedRelation: "classroom_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_sessions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_sessions_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "lms_lab_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "lab_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_task_progress: {
        Row: {
          attempts: number
          completed_at: string | null
          id: string
          session_id: string
          status: string
          task_id: string
          tenant_id: string
          verification_result: Json
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          id?: string
          session_id: string
          status?: string
          task_id: string
          tenant_id: string
          verification_result?: Json
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          id?: string
          session_id?: string
          status?: string
          task_id?: string
          tenant_id?: string
          verification_result?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lab_task_progress_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lab_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_task_progress_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "lab_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_tasks: {
        Row: {
          coding_language: string | null
          execution_mode: string
          exercise_kind: string
          id: string
          instructions: string | null
          points: number
          sequence_no: number
          starter_code: string | null
          template_id: string
          tenant_id: string
          title: string
          verification_config: Json
          verification_type: string
        }
        Insert: {
          coding_language?: string | null
          execution_mode?: string
          exercise_kind?: string
          id?: string
          instructions?: string | null
          points?: number
          sequence_no: number
          starter_code?: string | null
          template_id: string
          tenant_id: string
          title: string
          verification_config?: Json
          verification_type?: string
        }
        Update: {
          coding_language?: string | null
          execution_mode?: string
          exercise_kind?: string
          id?: string
          instructions?: string | null
          points?: number
          sequence_no?: number
          starter_code?: string | null
          template_id?: string
          tenant_id?: string
          title?: string
          verification_config?: Json
          verification_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "lab_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_templates: {
        Row: {
          access_mode: string
          active: boolean
          created_by: string | null
          duration_minutes: number
          environment_reference: string | null
          estimated_cost_gbp: number
          id: string
          instructor_assist: boolean
          instructor_observe: boolean
          learning_outcomes: string | null
          max_attempts: number
          module_id: string | null
          preparation_notes: string | null
          provider: string
          published: boolean
          tenant_id: string
          title: string
        }
        Insert: {
          access_mode?: string
          active?: boolean
          created_by?: string | null
          duration_minutes?: number
          environment_reference?: string | null
          estimated_cost_gbp?: number
          id?: string
          instructor_assist?: boolean
          instructor_observe?: boolean
          learning_outcomes?: string | null
          max_attempts?: number
          module_id?: string | null
          preparation_notes?: string | null
          provider: string
          published?: boolean
          tenant_id: string
          title: string
        }
        Update: {
          access_mode?: string
          active?: boolean
          created_by?: string | null
          duration_minutes?: number
          environment_reference?: string | null
          estimated_cost_gbp?: number
          id?: string
          instructor_assist?: boolean
          instructor_observe?: boolean
          learning_outcomes?: string | null
          max_attempts?: number
          module_id?: string | null
          preparation_notes?: string | null
          provider?: string
          published?: boolean
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_templates_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_vms: {
        Row: {
          allocated_at: string
          connection_url: string | null
          created_at: string
          id: string
          instance_id: string | null
          instance_type: string | null
          ip_address: string | null
          lab_session_id: string | null
          last_accessed_at: string | null
          os_type: string
          specs: Json | null
          student_id: string
          tenant_id: string
          updated_at: string
          vm_name: string
          vm_status: string
          workspace_id: string | null
        }
        Insert: {
          allocated_at?: string
          connection_url?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_type?: string | null
          ip_address?: string | null
          lab_session_id?: string | null
          last_accessed_at?: string | null
          os_type?: string
          specs?: Json | null
          student_id: string
          tenant_id: string
          updated_at?: string
          vm_name: string
          vm_status?: string
          workspace_id?: string | null
        }
        Update: {
          allocated_at?: string
          connection_url?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_type?: string | null
          ip_address?: string | null
          lab_session_id?: string | null
          last_accessed_at?: string | null
          os_type?: string
          specs?: Json | null
          student_id?: string
          tenant_id?: string
          updated_at?: string
          vm_name?: string
          vm_status?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_vms_lab_session_id_fkey"
            columns: ["lab_session_id"]
            isOneToOne: false
            referencedRelation: "lab_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_vms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_vms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          days_count: number
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          rejection_reason: string | null
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days_count?: number
          end_date: string
          id?: string
          leave_type?: string
          reason?: string | null
          rejection_reason?: string | null
          start_date: string
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days_count?: number
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          rejection_reason?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_reminders: {
        Row: {
          id: string
          lecture_date: string
          reminder_type: string
          scheduled_lecture_id: string
          sent_at: string
        }
        Insert: {
          id?: string
          lecture_date: string
          reminder_type: string
          scheduled_lecture_id: string
          sent_at?: string
        }
        Update: {
          id?: string
          lecture_date?: string
          reminder_type?: string
          scheduled_lecture_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_reminders_scheduled_lecture_id_fkey"
            columns: ["scheduled_lecture_id"]
            isOneToOne: false
            referencedRelation: "scheduled_lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_ai_packs: {
        Row: {
          glossary: Json
          id: string
          key_concepts: Json
          quiz: Json
          reviewed_at: string | null
          reviewed_by: string | null
          revision_questions: Json
          session_id: string
          source_artifact_ids: string[]
          status: string
          summary: string | null
          tenant_id: string
        }
        Insert: {
          glossary?: Json
          id?: string
          key_concepts?: Json
          quiz?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_questions?: Json
          session_id: string
          source_artifact_ids?: string[]
          status?: string
          summary?: string | null
          tenant_id: string
        }
        Update: {
          glossary?: Json
          id?: string
          key_concepts?: Json
          quiz?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_questions?: Json
          session_id?: string
          source_artifact_ids?: string[]
          status?: string
          summary?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_ai_packs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plans: {
        Row: {
          activities: string | null
          assessment_method: string | null
          created_at: string
          duration_minutes: number
          homework: string | null
          id: string
          lecturer_id: string
          module_id: string | null
          notes: string | null
          objectives: string[] | null
          resources: string | null
          session_date: string
          status: string
          tenant_id: string
          title: string
          topics: string[] | null
          updated_at: string
        }
        Insert: {
          activities?: string | null
          assessment_method?: string | null
          created_at?: string
          duration_minutes?: number
          homework?: string | null
          id?: string
          lecturer_id: string
          module_id?: string | null
          notes?: string | null
          objectives?: string[] | null
          resources?: string | null
          session_date: string
          status?: string
          tenant_id: string
          title: string
          topics?: string[] | null
          updated_at?: string
        }
        Update: {
          activities?: string | null
          assessment_method?: string | null
          created_at?: string
          duration_minutes?: number
          homework?: string | null
          id?: string
          lecturer_id?: string
          module_id?: string | null
          notes?: string | null
          objectives?: string[] | null
          resources?: string | null
          session_date?: string
          status?: string
          tenant_id?: string
          title?: string
          topics?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plans_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_whiteboard_operations: {
        Row: {
          actor_id: string
          board_id: string
          created_at: string
          id: string
          operation: Json
          sequence: number
          session_id: string
          tenant_id: string
        }
        Insert: {
          actor_id: string
          board_id: string
          created_at?: string
          id?: string
          operation: Json
          sequence: number
          session_id: string
          tenant_id: string
        }
        Update: {
          actor_id?: string
          board_id?: string
          created_at?: string
          id?: string
          operation?: Json
          sequence?: number
          session_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_whiteboard_operations_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "lesson_whiteboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_whiteboard_operations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_whiteboard_snapshots: {
        Row: {
          board_id: string
          created_at: string
          created_by: string
          session_id: string
          shapes: Json
          tenant_id: string
          through_sequence: number
        }
        Insert: {
          board_id: string
          created_at?: string
          created_by: string
          session_id: string
          shapes: Json
          tenant_id: string
          through_sequence: number
        }
        Update: {
          board_id?: string
          created_at?: string
          created_by?: string
          session_id?: string
          shapes?: Json
          tenant_id?: string
          through_sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_whiteboard_snapshots_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "lesson_whiteboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_whiteboard_snapshots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_whiteboard_view_receipts: {
        Row: {
          board_id: string
          first_opened_at: string
          last_opened_at: string
          session_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          board_id: string
          first_opened_at?: string
          last_opened_at?: string
          session_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          board_id?: string
          first_opened_at?: string
          last_opened_at?: string
          session_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_whiteboard_view_receipts_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "lesson_whiteboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_whiteboard_view_receipts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_whiteboards: {
        Row: {
          content_reference: string | null
          created_at: string
          current_sequence: number
          id: string
          locked_after_class: boolean
          microsoft_whiteboard_reference: string | null
          module_id: string | null
          prepared_by: string | null
          session_id: string | null
          template: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content_reference?: string | null
          created_at?: string
          current_sequence?: number
          id?: string
          locked_after_class?: boolean
          microsoft_whiteboard_reference?: string | null
          module_id?: string | null
          prepared_by?: string | null
          session_id?: string | null
          template?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content_reference?: string | null
          created_at?: string
          current_sequence?: number
          id?: string
          locked_after_class?: boolean
          microsoft_whiteboard_reference?: string | null
          module_id?: string | null
          prepared_by?: string | null
          session_id?: string | null
          template?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_whiteboards_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_whiteboards_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_artifacts: {
        Row: {
          artifact_type: string
          available_at: string | null
          created_at: string
          id: string
          metadata: Json
          provider_reference: string | null
          publication_status: string
          session_id: string
          storage_reference: string | null
          tenant_id: string
        }
        Insert: {
          artifact_type: string
          available_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          provider_reference?: string | null
          publication_status?: string
          session_id: string
          storage_reference?: string | null
          tenant_id: string
        }
        Update: {
          artifact_type?: string
          available_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          provider_reference?: string | null
          publication_status?: string
          session_id?: string
          storage_reference?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_class_artifacts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_attendance: {
        Row: {
          attendance_minutes: number
          engagement: Json
          id: string
          joined_at: string | null
          left_at: string | null
          provider_participant_id: string | null
          session_id: string
          student_id: string | null
          tenant_id: string
        }
        Insert: {
          attendance_minutes?: number
          engagement?: Json
          id?: string
          joined_at?: string | null
          left_at?: string | null
          provider_participant_id?: string | null
          session_id: string
          student_id?: string | null
          tenant_id: string
        }
        Update: {
          attendance_minutes?: number
          engagement?: Json
          id?: string
          joined_at?: string | null
          left_at?: string | null
          provider_participant_id?: string | null
          session_id?: string
          student_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_class_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_hand_requests: {
        Row: {
          raised_at: string
          responded_at: string | null
          responded_by: string | null
          session_id: string
          status: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          raised_at?: string
          responded_at?: string | null
          responded_by?: string | null
          session_id: string
          status?: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          raised_at?: string
          responded_at?: string | null
          responded_by?: string | null
          session_id?: string
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_class_hand_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_invitations: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          invited_by: string
          session_id: string
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          invited_by: string
          session_id: string
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          session_id?: string
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_class_invitations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_moderation_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          moderator_user_id: string
          notes: string | null
          session_id: string
          student_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          moderator_user_id: string
          notes?: string | null
          session_id: string
          student_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          moderator_user_id?: string
          notes?: string | null
          session_id?: string
          student_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_class_moderation_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_published_answers: {
        Row: {
          answer_text: string
          id: string
          published_at: string
          published_by: string
          question_text: string
          session_id: string
          source_question_id: string
          tenant_id: string
        }
        Insert: {
          answer_text: string
          id?: string
          published_at?: string
          published_by: string
          question_text: string
          session_id: string
          source_question_id: string
          tenant_id: string
        }
        Update: {
          answer_text?: string
          id?: string
          published_at?: string
          published_by?: string
          question_text?: string
          session_id?: string
          source_question_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_class_published_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_class_published_answers_source_question_id_fkey"
            columns: ["source_question_id"]
            isOneToOne: true
            referencedRelation: "live_class_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          body: string
          created_at: string
          id: string
          session_id: string
          status: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          body: string
          created_at?: string
          id?: string
          session_id: string
          status?: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          body?: string
          created_at?: string
          id?: string
          session_id?: string
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_class_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_sessions: {
        Row: {
          actual_ended_at: string | null
          artifact_sync_status: string
          attendee_camera_default: boolean
          attendee_mic_default: boolean
          breakout_enabled: boolean
          capacity: number
          class_mode: string
          cohort_reference: string | null
          created_at: string
          end_evidence_reference: string | null
          ends_at: string
          id: string
          join_url: string | null
          lesson_pack_status: string
          moderator_user_ids: string[]
          module_id: string | null
          organiser_user_id: string
          polls_enabled: boolean
          provider: string
          provider_event_id: string | null
          provider_meeting_id: string | null
          qna_enabled: boolean
          recording_enabled: boolean
          schedule_source: string
          starts_at: string
          status: string
          teams_sync_status: string
          tenant_id: string
          title: string
          transcript_enabled: boolean
          whiteboard_enabled: boolean
        }
        Insert: {
          actual_ended_at?: string | null
          artifact_sync_status?: string
          attendee_camera_default?: boolean
          attendee_mic_default?: boolean
          breakout_enabled?: boolean
          capacity?: number
          class_mode?: string
          cohort_reference?: string | null
          created_at?: string
          end_evidence_reference?: string | null
          ends_at: string
          id?: string
          join_url?: string | null
          lesson_pack_status?: string
          moderator_user_ids?: string[]
          module_id?: string | null
          organiser_user_id: string
          polls_enabled?: boolean
          provider?: string
          provider_event_id?: string | null
          provider_meeting_id?: string | null
          qna_enabled?: boolean
          recording_enabled?: boolean
          schedule_source?: string
          starts_at: string
          status?: string
          teams_sync_status?: string
          tenant_id: string
          title: string
          transcript_enabled?: boolean
          whiteboard_enabled?: boolean
        }
        Update: {
          actual_ended_at?: string | null
          artifact_sync_status?: string
          attendee_camera_default?: boolean
          attendee_mic_default?: boolean
          breakout_enabled?: boolean
          capacity?: number
          class_mode?: string
          cohort_reference?: string | null
          created_at?: string
          end_evidence_reference?: string | null
          ends_at?: string
          id?: string
          join_url?: string | null
          lesson_pack_status?: string
          moderator_user_ids?: string[]
          module_id?: string | null
          organiser_user_id?: string
          polls_enabled?: boolean
          provider?: string
          provider_event_id?: string | null
          provider_meeting_id?: string | null
          qna_enabled?: boolean
          recording_enabled?: boolean
          schedule_source?: string
          starts_at?: string
          status?: string
          teams_sync_status?: string
          tenant_id?: string
          title?: string
          transcript_enabled?: boolean
          whiteboard_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "live_class_sessions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_lab_class_invitations: {
        Row: {
          created_at: string
          invited_by: string
          run_id: string
          status: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          invited_by: string
          run_id: string
          status?: string
          student_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          invited_by?: string
          run_id?: string
          status?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_lab_class_invitations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "lab_class_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_lab_class_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_lab_class_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_lab_offerings: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          launch_enabled: boolean
          max_active_learners: number
          modes: string[]
          module_id: string
          published: boolean
          self_study_attempts: number
          session_minutes: number
          template_id: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          id?: string
          launch_enabled?: boolean
          max_active_learners?: number
          modes?: string[]
          module_id: string
          published?: boolean
          self_study_attempts?: number
          session_minutes?: number
          template_id: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          launch_enabled?: boolean
          max_active_learners?: number
          modes?: string[]
          module_id?: string
          published?: boolean
          self_study_attempts?: number
          session_minutes?: number
          template_id?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_lab_offerings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_lab_offerings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "lab_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_lab_offerings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_lab_offerings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
          sender_name: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
          sender_name: string
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      microsoft_education_accounts: {
        Row: {
          disabled_at: string | null
          entra_object_id: string | null
          id: string
          institutional_email: string | null
          license_sku: string | null
          provisioned_at: string | null
          provisioning_status: string
          role_type: string
          tenant_id: string
          user_id: string
          user_principal_name: string | null
        }
        Insert: {
          disabled_at?: string | null
          entra_object_id?: string | null
          id?: string
          institutional_email?: string | null
          license_sku?: string | null
          provisioned_at?: string | null
          provisioning_status?: string
          role_type: string
          tenant_id: string
          user_id: string
          user_principal_name?: string | null
        }
        Update: {
          disabled_at?: string | null
          entra_object_id?: string | null
          id?: string
          institutional_email?: string | null
          license_sku?: string | null
          provisioned_at?: string | null
          provisioning_status?: string
          role_type?: string
          tenant_id?: string
          user_id?: string
          user_principal_name?: string | null
        }
        Relationships: []
      }
      modules: {
        Row: {
          code: string | null
          created_at: string
          credits: number | null
          id: string
          lecturer_id: string | null
          module_number: string | null
          programme_id: string
          status: Database["public"]["Enums"]["programme_status"]
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          credits?: number | null
          id?: string
          lecturer_id?: string | null
          module_number?: string | null
          programme_id: string
          status?: Database["public"]["Enums"]["programme_status"]
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          credits?: number | null
          id?: string
          lecturer_id?: string | null
          module_number?: string | null
          programme_id?: string
          status?: Database["public"]["Enums"]["programme_status"]
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          assignment_deadlines_email: boolean | null
          assignment_deadlines_push: boolean | null
          assignment_deadlines_sms: boolean | null
          attendance_warnings_email: boolean | null
          attendance_warnings_push: boolean | null
          attendance_warnings_sms: boolean | null
          class_changes_email: boolean | null
          class_changes_push: boolean | null
          class_changes_sms: boolean | null
          created_at: string | null
          fee_reminders_email: boolean | null
          fee_reminders_push: boolean | null
          fee_reminders_sms: boolean | null
          grade_releases_email: boolean | null
          grade_releases_push: boolean | null
          grade_releases_sms: boolean | null
          id: string
          messages_email: boolean | null
          messages_push: boolean | null
          messages_sms: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assignment_deadlines_email?: boolean | null
          assignment_deadlines_push?: boolean | null
          assignment_deadlines_sms?: boolean | null
          attendance_warnings_email?: boolean | null
          attendance_warnings_push?: boolean | null
          attendance_warnings_sms?: boolean | null
          class_changes_email?: boolean | null
          class_changes_push?: boolean | null
          class_changes_sms?: boolean | null
          created_at?: string | null
          fee_reminders_email?: boolean | null
          fee_reminders_push?: boolean | null
          fee_reminders_sms?: boolean | null
          grade_releases_email?: boolean | null
          grade_releases_push?: boolean | null
          grade_releases_sms?: boolean | null
          id?: string
          messages_email?: boolean | null
          messages_push?: boolean | null
          messages_sms?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assignment_deadlines_email?: boolean | null
          assignment_deadlines_push?: boolean | null
          assignment_deadlines_sms?: boolean | null
          attendance_warnings_email?: boolean | null
          attendance_warnings_push?: boolean | null
          attendance_warnings_sms?: boolean | null
          class_changes_email?: boolean | null
          class_changes_push?: boolean | null
          class_changes_sms?: boolean | null
          created_at?: string | null
          fee_reminders_email?: boolean | null
          fee_reminders_push?: boolean | null
          fee_reminders_sms?: boolean | null
          grade_releases_email?: boolean | null
          grade_releases_push?: boolean | null
          grade_releases_sms?: boolean | null
          id?: string
          messages_email?: boolean | null
          messages_push?: boolean | null
          messages_sms?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          severity: string
          tenant_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          severity?: string
          tenant_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          severity?: string
          tenant_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_student_links: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          relationship: string
          student_id: string
          tenant_id: string | null
          verification_reference: string | null
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          relationship?: string
          student_id: string
          tenant_id?: string | null
          verification_reference?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          relationship?: string
          student_id?: string
          tenant_id?: string | null
          verification_reference?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_universities: {
        Row: {
          commission: string | null
          country: string
          created_at: string
          fee: string | null
          flag: string
          id: string
          ielts: string | null
          intake: string | null
          name: string
          programme: string
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          commission?: string | null
          country: string
          created_at?: string
          fee?: string | null
          flag?: string
          id?: string
          ielts?: string | null
          intake?: string | null
          name: string
          programme: string
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          commission?: string | null
          country?: string
          created_at?: string
          fee?: string | null
          flag?: string
          id?: string
          ielts?: string | null
          intake?: string | null
          name?: string
          programme?: string
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          bank_name: string | null
          created_at: string
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          receipt_url: string | null
          reference_number: string | null
          sender_account: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount?: number
          bank_name?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          sender_account?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          bank_name?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          sender_account?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      plagiarism_reports: {
        Row: {
          ai_generated_score: number
          analyzed_at: string | null
          created_at: string
          flagged_passages: Json | null
          id: string
          overall_score: number
          similarity_sources: Json | null
          status: string
          submission_id: string
          tenant_id: string
        }
        Insert: {
          ai_generated_score?: number
          analyzed_at?: string | null
          created_at?: string
          flagged_passages?: Json | null
          id?: string
          overall_score?: number
          similarity_sources?: Json | null
          status?: string
          submission_id: string
          tenant_id: string
        }
        Update: {
          ai_generated_score?: number
          analyzed_at?: string | null
          created_at?: string
          flagged_passages?: Json | null
          id?: string
          overall_score?: number
          similarity_sources?: Json | null
          status?: string
          submission_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plagiarism_reports_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plagiarism_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plagiarism_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      production_integrations: {
        Row: {
          category: string
          id: string
          integration_key: string
          last_error: string | null
          last_health_at: string | null
          metadata: Json
          required_for_launch: boolean
          status: string
          tenant_id: string
        }
        Insert: {
          category: string
          id?: string
          integration_key: string
          last_error?: string | null
          last_health_at?: string | null
          metadata?: Json
          required_for_launch?: boolean
          status?: string
          tenant_id: string
        }
        Update: {
          category?: string
          id?: string
          integration_key?: string
          last_error?: string | null
          last_health_at?: string | null
          metadata?: Json
          required_for_launch?: boolean
          status?: string
          tenant_id?: string
        }
        Relationships: []
      }
      production_readiness_checks: {
        Row: {
          category: string
          check_key: string
          checked_at: string | null
          checked_by: string | null
          evidence_reference: string | null
          id: string
          notes: string | null
          revision: number
          status: string
          tenant_id: string
          valid_until: string | null
        }
        Insert: {
          category: string
          check_key: string
          checked_at?: string | null
          checked_by?: string | null
          evidence_reference?: string | null
          id?: string
          notes?: string | null
          revision?: number
          status?: string
          tenant_id: string
          valid_until?: string | null
        }
        Update: {
          category?: string
          check_key?: string
          checked_at?: string | null
          checked_by?: string | null
          evidence_reference?: string | null
          id?: string
          notes?: string | null
          revision?: number
          status?: string
          tenant_id?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      production_readiness_reviews: {
        Row: {
          check_id: string
          created_at: string
          evidence_reference: string | null
          id: string
          new_status: string
          notes: string | null
          old_status: string
          reviewed_by: string
          revision: number
          tenant_id: string
          valid_until: string | null
        }
        Insert: {
          check_id: string
          created_at?: string
          evidence_reference?: string | null
          id?: string
          new_status: string
          notes?: string | null
          old_status: string
          reviewed_by: string
          revision: number
          tenant_id: string
          valid_until?: string | null
        }
        Update: {
          check_id?: string
          created_at?: string
          evidence_reference?: string | null
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string
          reviewed_by?: string
          revision?: number
          tenant_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_readiness_reviews_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "production_readiness_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      programmes: {
        Row: {
          awarding_body: Database["public"]["Enums"]["awarding_body"]
          course_number: string | null
          created_at: string
          credits: number | null
          duration: string | null
          enrolled: number | null
          entry_requirements: Json | null
          id: string
          launch_phase: number | null
          level: string
          modules_count: number | null
          progression_pathway: Json | null
          status: Database["public"]["Enums"]["programme_status"]
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          awarding_body: Database["public"]["Enums"]["awarding_body"]
          course_number?: string | null
          created_at?: string
          credits?: number | null
          duration?: string | null
          enrolled?: number | null
          entry_requirements?: Json | null
          id?: string
          launch_phase?: number | null
          level: string
          modules_count?: number | null
          progression_pathway?: Json | null
          status?: Database["public"]["Enums"]["programme_status"]
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          awarding_body?: Database["public"]["Enums"]["awarding_body"]
          course_number?: string | null
          created_at?: string
          credits?: number | null
          duration?: string | null
          enrolled?: number | null
          entry_requirements?: Json | null
          id?: string
          launch_phase?: number | null
          level?: string
          modules_count?: number | null
          progression_pathway?: Json | null
          status?: Database["public"]["Enums"]["programme_status"]
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programmes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programmes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          id: string
          passed: boolean | null
          percentage: number | null
          quiz_id: string
          score: number | null
          started_at: string | null
          student_id: string
          tenant_id: string
          time_spent_seconds: number | null
          total_points: number | null
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          percentage?: number | null
          quiz_id: string
          score?: number | null
          started_at?: string | null
          student_id: string
          tenant_id: string
          time_spent_seconds?: number | null
          total_points?: number | null
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          percentage?: number | null
          quiz_id?: string
          score?: number | null
          started_at?: string | null
          student_id?: string
          tenant_id?: string
          time_spent_seconds?: number | null
          total_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          explanation: string | null
          id: string
          options: Json | null
          points: number | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"] | null
          quiz_id: string
          sort_order: number | null
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          options?: Json | null
          points?: number | null
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"] | null
          quiz_id: string
          sort_order?: number | null
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          options?: Json | null
          points?: number | null
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"] | null
          quiz_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          max_attempts: number | null
          module_id: string | null
          pass_percentage: number | null
          show_results: boolean | null
          shuffle_questions: boolean | null
          status: Database["public"]["Enums"]["quiz_status"] | null
          tenant_id: string
          time_limit_minutes: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          max_attempts?: number | null
          module_id?: string | null
          pass_percentage?: number | null
          show_results?: boolean | null
          shuffle_questions?: boolean | null
          status?: Database["public"]["Enums"]["quiz_status"] | null
          tenant_id: string
          time_limit_minutes?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          max_attempts?: number | null
          module_id?: string | null
          pass_percentage?: number | null
          show_results?: boolean | null
          shuffle_questions?: boolean | null
          status?: Database["public"]["Enums"]["quiz_status"] | null
          tenant_id?: string
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_income: {
        Row: {
          academic_year: string | null
          commission_amount: number
          commission_rate: number | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          intake: string | null
          notes: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          programme: string
          received_amount: number | null
          received_date: string | null
          referral_date: string
          student_id: string | null
          student_name: string
          tenant_id: string | null
          university_id: string | null
          university_name: string
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          commission_amount?: number
          commission_rate?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          intake?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          programme: string
          received_amount?: number | null
          received_date?: string | null
          referral_date?: string
          student_id?: string | null
          student_name: string
          tenant_id?: string | null
          university_id?: string | null
          university_name: string
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          commission_amount?: number
          commission_rate?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          intake?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          programme?: string
          received_amount?: number | null
          received_date?: string | null
          referral_date?: string
          student_id?: string | null
          student_name?: string
          tenant_id?: string | null
          university_id?: string | null
          university_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_income_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_income_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_income_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "partner_universities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_income_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "partner_universities_public"
            referencedColumns: ["id"]
          },
        ]
      }
      residential_bookings: {
        Row: {
          check_in_at: string | null
          check_out_at: string | null
          created_at: string
          dietary_requirements: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          id: string
          meal_plan: string
          residential_week_id: string
          room_type: string
          special_needs: string | null
          status: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          check_in_at?: string | null
          check_out_at?: string | null
          created_at?: string
          dietary_requirements?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          meal_plan?: string
          residential_week_id: string
          room_type?: string
          special_needs?: string | null
          status?: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          check_in_at?: string | null
          check_out_at?: string | null
          created_at?: string
          dietary_requirements?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          meal_plan?: string
          residential_week_id?: string
          room_type?: string
          special_needs?: string | null
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "residential_bookings_residential_week_id_fkey"
            columns: ["residential_week_id"]
            isOneToOne: false
            referencedRelation: "residential_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residential_bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residential_bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      residential_sessions: {
        Row: {
          created_at: string
          description: string | null
          end_time: string
          id: string
          lecturer_id: string | null
          location: string | null
          max_attendees: number | null
          module_id: string | null
          residential_week_id: string
          session_type: string
          start_time: string
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          lecturer_id?: string | null
          location?: string | null
          max_attendees?: number | null
          module_id?: string | null
          residential_week_id: string
          session_type?: string
          start_time: string
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          lecturer_id?: string | null
          location?: string | null
          max_attendees?: number | null
          module_id?: string | null
          residential_week_id?: string
          session_type?: string
          start_time?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "residential_sessions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residential_sessions_residential_week_id_fkey"
            columns: ["residential_week_id"]
            isOneToOne: false
            referencedRelation: "residential_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residential_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residential_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      residential_weeks: {
        Row: {
          created_at: string
          end_date: string
          id: string
          location: string | null
          max_capacity: number | null
          semester: number
          start_date: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          location?: string | null
          max_capacity?: number | null
          semester?: number
          start_date: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          location?: string | null
          max_capacity?: number | null
          semester?: number
          start_date?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "residential_weeks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residential_weeks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_view_logs: {
        Row: {
          completed: boolean | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          module_name: string | null
          resource_title: string
          resource_type: string
          started_at: string
          student_id: string
          tenant_id: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          module_name?: string | null
          resource_title: string
          resource_type?: string
          started_at?: string
          student_id: string
          tenant_id?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          module_name?: string | null
          resource_title?: string
          resource_type?: string
          started_at?: string
          student_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_view_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_view_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_lectures: {
        Row: {
          academic_year: string
          change_reason: string
          cohort_reference: string | null
          color: string | null
          created_at: string
          day_of_week: number
          effective_from: string
          effective_until: string | null
          end_time: string
          id: string
          is_active: boolean
          lecturer_id: string
          module_id: string
          notes: string | null
          recurrence: string
          room: string | null
          semester: number
          start_time: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          academic_year?: string
          change_reason?: string
          cohort_reference?: string | null
          color?: string | null
          created_at?: string
          day_of_week: number
          effective_from?: string
          effective_until?: string | null
          end_time: string
          id?: string
          is_active?: boolean
          lecturer_id: string
          module_id: string
          notes?: string | null
          recurrence?: string
          room?: string | null
          semester?: number
          start_time: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          change_reason?: string
          cohort_reference?: string | null
          color?: string | null
          created_at?: string
          day_of_week?: number
          effective_from?: string
          effective_until?: string | null
          end_time?: string
          id?: string
          is_active?: boolean
          lecturer_id?: string
          module_id?: string
          notes?: string | null
          recurrence?: string
          room?: string | null
          semester?: number
          start_time?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_lectures_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_lectures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_lectures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      school_tuition_subjects: {
        Row: {
          active: boolean
          exam_board: string | null
          id: string
          practical_required: boolean
          subject: string
          subject_group: string | null
          syllabus_version: string | null
          tenant_id: string
          track_id: string
        }
        Insert: {
          active?: boolean
          exam_board?: string | null
          id?: string
          practical_required?: boolean
          subject: string
          subject_group?: string | null
          syllabus_version?: string | null
          tenant_id: string
          track_id: string
        }
        Update: {
          active?: boolean
          exam_board?: string | null
          id?: string
          practical_required?: boolean
          subject?: string
          subject_group?: string | null
          syllabus_version?: string | null
          tenant_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_tuition_subjects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_tuition_subjects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_tuition_subjects_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "school_tuition_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      school_tuition_tracks: {
        Row: {
          active: boolean
          city: string | null
          created_at: string
          curriculum_route: string
          delivery_modes: string[]
          grade: number
          id: string
          launch_phase: number
          stream: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          active?: boolean
          city?: string | null
          created_at?: string
          curriculum_route: string
          delivery_modes?: string[]
          grade: number
          id?: string
          launch_phase?: number
          stream?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          active?: boolean
          city?: string | null
          created_at?: string
          curriculum_route?: string
          delivery_modes?: string[]
          grade?: number
          id?: string
          launch_phase?: number
          stream?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_tuition_tracks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_tuition_tracks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      student_enrolments: {
        Row: {
          application_id: string | null
          completed_at: string | null
          created_at: string
          enrolled_at: string
          id: string
          programme_id: string
          status: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          completed_at?: string | null
          created_at?: string
          enrolled_at?: string
          id?: string
          programme_id: string
          status?: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          completed_at?: string | null
          created_at?: string
          enrolled_at?: string
          id?: string
          programme_id?: string
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_enrolments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrolments_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrolments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrolments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      study_tutor_usage: {
        Row: {
          daily_count: number
          minute_bucket: string
          minute_count: number
          usage_day: string
          user_id: string
        }
        Insert: {
          daily_count?: number
          minute_bucket: string
          minute_count?: number
          usage_day: string
          user_id: string
        }
        Update: {
          daily_count?: number
          minute_bucket?: string
          minute_count?: number
          usage_day?: string
          user_id?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          assignment_id: string
          created_at: string
          feedback: string | null
          file_url: string | null
          grade: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          plagiarism_score: number | null
          status: string
          student_id: string
          student_name: string
          submitted_at: string
          tenant_id: string
          updated_at: string
          word_count: number | null
        }
        Insert: {
          assignment_id: string
          created_at?: string
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          plagiarism_score?: number | null
          status?: string
          student_id: string
          student_name: string
          submitted_at?: string
          tenant_id: string
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          assignment_id?: string
          created_at?: string
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          plagiarism_score?: number | null
          status?: string
          student_id?: string
          student_name?: string
          submitted_at?: string
          tenant_id?: string
          updated_at?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_domains: {
        Row: {
          created_at: string
          dns_records: Json | null
          domain: string
          domain_type: string
          id: string
          status: string
          tenant_id: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          dns_records?: Json | null
          domain: string
          domain_type: string
          id?: string
          status?: string
          tenant_id: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          dns_records?: Json | null
          domain?: string
          domain_type?: string
          id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_page_content: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_visible: boolean
          section_key: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          section_key: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          section_key?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_page_content_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_page_content_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          accent_color: string | null
          brand_name: string | null
          created_at: string
          custom_domain: string | null
          id: string
          logo_url: string | null
          monthly_revenue: number | null
          name: string
          plan: Database["public"]["Enums"]["tenant_plan"]
          primary_color: string | null
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          students_count: number | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          brand_name?: string | null
          created_at?: string
          custom_domain?: string | null
          id?: string
          logo_url?: string | null
          monthly_revenue?: number | null
          name: string
          plan?: Database["public"]["Enums"]["tenant_plan"]
          primary_color?: string | null
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          students_count?: number | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          brand_name?: string | null
          created_at?: string
          custom_domain?: string | null
          id?: string
          logo_url?: string | null
          monthly_revenue?: number | null
          name?: string
          plan?: Database["public"]["Enums"]["tenant_plan"]
          primary_color?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          students_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      transport_assignments: {
        Row: {
          created_at: string
          dropoff_stop: string | null
          id: string
          pickup_stop: string | null
          route_id: string
          status: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          dropoff_stop?: string | null
          id?: string
          pickup_stop?: string | null
          route_id: string
          status?: string
          student_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          dropoff_stop?: string | null
          id?: string
          pickup_stop?: string | null
          route_id?: string
          status?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_assignments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "transport_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_routes: {
        Row: {
          created_at: string
          id: string
          route_name: string
          status: string
          stops: Json | null
          tenant_id: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          route_name: string
          status?: string
          stops?: Json | null
          tenant_id: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          route_name?: string
          status?: string
          stops?: Json | null
          tenant_id?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_routes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_routes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_routes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "transport_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_routes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "transport_vehicles_student"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_vehicles: {
        Row: {
          capacity: number
          created_at: string
          current_lat: number | null
          current_lng: number | null
          driver_name: string | null
          driver_phone: string | null
          id: string
          last_location_update: string | null
          status: string
          tenant_id: string
          updated_at: string
          vehicle_number: string
          vehicle_type: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          last_location_update?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          vehicle_number: string
          vehicle_type?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          last_location_update?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          vehicle_number?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tuition_enrolments: {
        Row: {
          created_at: string
          ends_on: string | null
          fee_pkr: number | null
          guardian_user_id: string | null
          id: string
          package_type: string
          starts_on: string | null
          status: string
          student_id: string
          subject_ids: string[]
          tenant_id: string
          track_id: string
        }
        Insert: {
          created_at?: string
          ends_on?: string | null
          fee_pkr?: number | null
          guardian_user_id?: string | null
          id?: string
          package_type?: string
          starts_on?: string | null
          status?: string
          student_id: string
          subject_ids?: string[]
          tenant_id: string
          track_id: string
        }
        Update: {
          created_at?: string
          ends_on?: string | null
          fee_pkr?: number | null
          guardian_user_id?: string | null
          id?: string
          package_type?: string
          starts_on?: string | null
          status?: string
          student_id?: string
          subject_ids?: string[]
          tenant_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tuition_enrolments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tuition_enrolments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tuition_enrolments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "school_tuition_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tuition_mock_exams: {
        Row: {
          delivery_mode: string
          duration_minutes: number | null
          id: string
          scheduled_at: string | null
          status: string
          subject_id: string
          tenant_id: string
          title: string
          total_marks: number | null
        }
        Insert: {
          delivery_mode?: string
          duration_minutes?: number | null
          id?: string
          scheduled_at?: string | null
          status?: string
          subject_id: string
          tenant_id: string
          title: string
          total_marks?: number | null
        }
        Update: {
          delivery_mode?: string
          duration_minutes?: number | null
          id?: string
          scheduled_at?: string | null
          status?: string
          subject_id?: string
          tenant_id?: string
          title?: string
          total_marks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tuition_mock_exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "school_tuition_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tuition_mock_exams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tuition_mock_exams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tuition_progress_snapshots: {
        Row: {
          attendance_pct: number | null
          created_at: string
          homework_pct: number | null
          id: string
          mock_pct: number | null
          period_end: string
          period_start: string
          quiz_pct: number | null
          strengths: Json
          student_id: string
          subject_id: string
          teacher_comment: string | null
          tenant_id: string
          track_id: string
          weak_topics: Json
        }
        Insert: {
          attendance_pct?: number | null
          created_at?: string
          homework_pct?: number | null
          id?: string
          mock_pct?: number | null
          period_end: string
          period_start: string
          quiz_pct?: number | null
          strengths?: Json
          student_id: string
          subject_id: string
          teacher_comment?: string | null
          tenant_id: string
          track_id: string
          weak_topics?: Json
        }
        Update: {
          attendance_pct?: number | null
          created_at?: string
          homework_pct?: number | null
          id?: string
          mock_pct?: number | null
          period_end?: string
          period_start?: string
          quiz_pct?: number | null
          strengths?: Json
          student_id?: string
          subject_id?: string
          teacher_comment?: string | null
          tenant_id?: string
          track_id?: string
          weak_topics?: Json
        }
        Relationships: [
          {
            foreignKeyName: "tuition_progress_snapshots_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "school_tuition_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tuition_progress_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tuition_progress_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tuition_progress_snapshots_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "school_tuition_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      uni_calendar_audit: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          details: Json
          id: string
          session_id: string
          tenant_id: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          details?: Json
          id?: string
          session_id: string
          tenant_id: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          details?: Json
          id?: string
          session_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uni_calendar_audit_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      uni_calendar_jobs: {
        Row: {
          error_code: string | null
          lease: string | null
          refresh_requested: boolean
          requested_by: string
          revision: number
          session_id: string
          started_at: string | null
          status: string
          tenant_id: string
          updated_at: string
          verify_only: boolean
        }
        Insert: {
          error_code?: string | null
          lease?: string | null
          refresh_requested?: boolean
          requested_by: string
          revision?: number
          session_id: string
          started_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          verify_only?: boolean
        }
        Update: {
          error_code?: string | null
          lease?: string | null
          refresh_requested?: boolean
          requested_by?: string
          revision?: number
          session_id?: string
          started_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          verify_only?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "uni_calendar_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      uni_feedback_snippets: {
        Row: {
          body: string
          created_at: string
          id: string
          owner_id: string
          tenant_id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          owner_id?: string
          tenant_id?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          owner_id?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "uni_feedback_snippets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uni_feedback_snippets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      uni_mail_alerts: {
        Row: {
          created_at: string
          id: string
          read_at: string | null
          thread_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          read_at?: string | null
          thread_id: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          read_at?: string | null
          thread_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uni_mail_alerts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "uni_mail_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      uni_mail_cursors: {
        Row: {
          cursor_url: string | null
          folder: string
          last_synced_at: string | null
          mailbox_id: string
        }
        Insert: {
          cursor_url?: string | null
          folder: string
          last_synced_at?: string | null
          mailbox_id: string
        }
        Update: {
          cursor_url?: string | null
          folder?: string
          last_synced_at?: string | null
          mailbox_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uni_mail_cursors_mailbox_id_fkey"
            columns: ["mailbox_id"]
            isOneToOne: false
            referencedRelation: "uni_mailboxes"
            referencedColumns: ["id"]
          },
        ]
      }
      uni_mail_documents: {
        Row: {
          created_at: string
          id: string
          name: string
          object_path: string
          thread_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          object_path: string
          thread_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          object_path?: string
          thread_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uni_mail_documents_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "uni_mail_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      uni_mail_events: {
        Row: {
          actor_id: string | null
          created_at: string
          details: Json
          event_type: string
          id: number
          thread_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          event_type: string
          id?: never
          thread_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          id?: never
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uni_mail_events_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "uni_mail_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      uni_mail_members: {
        Row: {
          can_send: boolean
          mailbox_id: string
          user_id: string
        }
        Insert: {
          can_send?: boolean
          mailbox_id: string
          user_id: string
        }
        Update: {
          can_send?: boolean
          mailbox_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uni_mail_members_mailbox_id_fkey"
            columns: ["mailbox_id"]
            isOneToOne: false
            referencedRelation: "uni_mailboxes"
            referencedColumns: ["id"]
          },
        ]
      }
      uni_mail_messages: {
        Row: {
          body_text: string
          cc_addresses: string[]
          created_at: string
          created_by: string | null
          direction: string
          from_address: string
          has_attachments: boolean
          id: string
          provider_at: string | null
          provider_id: string | null
          state: string
          thread_id: string
          to_addresses: string[]
        }
        Insert: {
          body_text: string
          cc_addresses?: string[]
          created_at?: string
          created_by?: string | null
          direction: string
          from_address: string
          has_attachments?: boolean
          id?: string
          provider_at?: string | null
          provider_id?: string | null
          state: string
          thread_id: string
          to_addresses: string[]
        }
        Update: {
          body_text?: string
          cc_addresses?: string[]
          created_at?: string
          created_by?: string | null
          direction?: string
          from_address?: string
          has_attachments?: boolean
          id?: string
          provider_at?: string | null
          provider_id?: string | null
          state?: string
          thread_id?: string
          to_addresses?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "uni_mail_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "uni_mail_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      uni_mail_tasks: {
        Row: {
          assigned_to: string
          created_at: string
          due_at: string | null
          id: string
          status: string
          thread_id: string
          title: string
        }
        Insert: {
          assigned_to: string
          created_at?: string
          due_at?: string | null
          id?: string
          status?: string
          thread_id: string
          title: string
        }
        Update: {
          assigned_to?: string
          created_at?: string
          due_at?: string | null
          id?: string
          status?: string
          thread_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "uni_mail_tasks_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "uni_mail_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      uni_mail_threads: {
        Row: {
          assigned_to: string | null
          created_at: string
          due_at: string | null
          id: string
          mailbox_id: string
          priority: string
          provider_conversation: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          mailbox_id: string
          priority?: string
          provider_conversation?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          mailbox_id?: string
          priority?: string
          provider_conversation?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "uni_mail_threads_mailbox_id_fkey"
            columns: ["mailbox_id"]
            isOneToOne: false
            referencedRelation: "uni_mailboxes"
            referencedColumns: ["id"]
          },
        ]
      }
      uni_mailbox_events: {
        Row: {
          actor_id: string | null
          created_at: string
          details: Json
          event_type: string
          id: number
          mailbox_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          details: Json
          event_type: string
          id?: never
          mailbox_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          id?: never
          mailbox_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uni_mailbox_events_mailbox_id_fkey"
            columns: ["mailbox_id"]
            isOneToOne: false
            referencedRelation: "uni_mailboxes"
            referencedColumns: ["id"]
          },
        ]
      }
      uni_mailboxes: {
        Row: {
          address: string
          created_at: string
          enabled: boolean
          graph_user_id: string | null
          id: string
          provider: string
          tenant_id: string
        }
        Insert: {
          address: string
          created_at?: string
          enabled?: boolean
          graph_user_id?: string | null
          id?: string
          provider?: string
          tenant_id: string
        }
        Update: {
          address?: string
          created_at?: string
          enabled?: boolean
          graph_user_id?: string | null
          id?: string
          provider?: string
          tenant_id?: string
        }
        Relationships: []
      }
      uni_marking_draft_events: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          marker_id: string
          revision: number
          tenant_id: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          marker_id: string
          revision: number
          tenant_id: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          marker_id?: string
          revision?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uni_marking_draft_events_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "unipathway_assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uni_marking_draft_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uni_marking_draft_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      uni_marking_drafts: {
        Row: {
          attempt_id: string
          criteria: Json
          feedback: string
          guidance: string
          marker_id: string
          revision: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attempt_id: string
          criteria?: Json
          feedback?: string
          guidance?: string
          marker_id: string
          revision?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attempt_id?: string
          criteria?: Json
          feedback?: string
          guidance?: string
          marker_id?: string
          revision?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "uni_marking_drafts_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "unipathway_assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uni_marking_drafts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uni_marking_drafts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_admission_handovers: {
        Row: {
          application_id: string
          approved_at: string
          approved_by: string
          decision_note: string
          enrolment_id: string
          programme_id: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          application_id: string
          approved_at?: string
          approved_by: string
          decision_note: string
          enrolment_id: string
          programme_id: string
          student_id: string
          tenant_id: string
        }
        Update: {
          application_id?: string
          approved_at?: string
          approved_by?: string
          decision_note?: string
          enrolment_id?: string
          programme_id?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_admission_handovers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_admission_handovers_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: true
            referencedRelation: "student_enrolments"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_approved_tech_modules: {
        Row: {
          approved_at: string
          approved_by: string
          enabled: boolean
          evidence_reference: string
          module_id: string
          tenant_id: string
        }
        Insert: {
          approved_at?: string
          approved_by: string
          enabled?: boolean
          evidence_reference: string
          module_id: string
          tenant_id: string
        }
        Update: {
          approved_at?: string
          approved_by?: string
          enabled?: boolean
          evidence_reference?: string
          module_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_approved_tech_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: true
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_approved_tech_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_approved_tech_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_assessment_ai_drafts: {
        Row: {
          attempt_id: string
          created_at: string
          criteria_results: Json
          feedback: string
          id: string
          missing_work: string
          model_name: string
          prompt_version: string
          requested_by: string
          rubric_version: string
          strengths: string
          suggested_raw_score: number | null
          tenant_id: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          criteria_results: Json
          feedback?: string
          id?: string
          missing_work?: string
          model_name: string
          prompt_version: string
          requested_by: string
          rubric_version: string
          strengths?: string
          suggested_raw_score?: number | null
          tenant_id: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          criteria_results?: Json
          feedback?: string
          id?: string
          missing_work?: string
          model_name?: string
          prompt_version?: string
          requested_by?: string
          rubric_version?: string
          strengths?: string
          suggested_raw_score?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_assessment_ai_drafts_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "unipathway_assessment_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_assessment_allocations: {
        Row: {
          assigned_at: string
          assigned_by: string
          attempt_id: string
          marker_id: string
          qa_reviewer_id: string
          tenant_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          attempt_id: string
          marker_id: string
          qa_reviewer_id: string
          tenant_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          attempt_id?: string
          marker_id?: string
          qa_reviewer_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_assessment_allocations_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "unipathway_assessment_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_assessment_appeal_outcomes: {
        Row: {
          appeal_id: string
          approved: boolean
          approved_by: string
          decided_at: string
          final_outcome: string
          final_reasoning: string
          tenant_id: string
        }
        Insert: {
          appeal_id: string
          approved: boolean
          approved_by: string
          decided_at?: string
          final_outcome: string
          final_reasoning: string
          tenant_id: string
        }
        Update: {
          appeal_id?: string
          approved?: boolean
          approved_by?: string
          decided_at?: string
          final_outcome?: string
          final_reasoning?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_assessment_appeal_outcomes_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: true
            referencedRelation: "unipathway_assessment_appeals"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_assessment_appeal_policies: {
        Row: {
          approved_at: string
          approved_by: string
          brief_id: string
          policy_reference: string
          tenant_id: string
          window_days: number
        }
        Insert: {
          approved_at?: string
          approved_by: string
          brief_id: string
          policy_reference: string
          tenant_id: string
          window_days: number
        }
        Update: {
          approved_at?: string
          approved_by?: string
          brief_id?: string
          policy_reference?: string
          tenant_id?: string
          window_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_assessment_appeal_policies_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: true
            referencedRelation: "unipathway_assessment_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_assessment_appeal_reviews: {
        Row: {
          appeal_id: string
          proposed_feedback: string | null
          proposed_raw_score: number | null
          reasoning: string
          recommendation: string
          reviewed_at: string
          reviewer_id: string
          tenant_id: string
        }
        Insert: {
          appeal_id: string
          proposed_feedback?: string | null
          proposed_raw_score?: number | null
          reasoning: string
          recommendation: string
          reviewed_at?: string
          reviewer_id: string
          tenant_id: string
        }
        Update: {
          appeal_id?: string
          proposed_feedback?: string | null
          proposed_raw_score?: number | null
          reasoning?: string
          recommendation?: string
          reviewed_at?: string
          reviewer_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_assessment_appeal_reviews_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: true
            referencedRelation: "unipathway_assessment_appeals"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_assessment_appeals: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          attempt_id: string
          brief_id: string
          details: string
          grounds: string
          id: string
          requested_at: string
          reviewer_id: string | null
          status: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          attempt_id: string
          brief_id: string
          details: string
          grounds: string
          id?: string
          requested_at?: string
          reviewer_id?: string | null
          status?: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          attempt_id?: string
          brief_id?: string
          details?: string
          grounds?: string
          id?: string
          requested_at?: string
          reviewer_id?: string | null
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_assessment_appeals_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "unipathway_assessment_released_results"
            referencedColumns: ["attempt_id"]
          },
          {
            foreignKeyName: "unipathway_assessment_appeals_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "unipathway_assessment_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_assessment_attempts: {
        Row: {
          attempt_no: number
          brief_id: string
          evidence_text: string
          guidance_at: string | null
          id: string
          resubmission_guidance: string | null
          status: string
          student_id: string
          submission_request_id: string | null
          submitted_at: string
          tenant_id: string
        }
        Insert: {
          attempt_no: number
          brief_id: string
          evidence_text: string
          guidance_at?: string | null
          id?: string
          resubmission_guidance?: string | null
          status?: string
          student_id: string
          submission_request_id?: string | null
          submitted_at?: string
          tenant_id: string
        }
        Update: {
          attempt_no?: number
          brief_id?: string
          evidence_text?: string
          guidance_at?: string | null
          id?: string
          resubmission_guidance?: string | null
          status?: string
          student_id?: string
          submission_request_id?: string | null
          submitted_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_assessment_attempts_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "unipathway_assessment_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_assessment_briefs: {
        Row: {
          assessment_type: string
          created_at: string
          due_at: string
          id: string
          learning_outcomes: string
          lecturer_id: string
          max_attempts: number
          module_id: string
          penalty_points_per_resubmission: number
          policy_reference: string
          published_at: string | null
          published_by: string | null
          required_evidence: string
          rubric_version: string
          status: string
          student_expectations: string
          submission_cutoff: string
          teaching_date: string | null
          teaching_summary: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assessment_type: string
          created_at?: string
          due_at: string
          id?: string
          learning_outcomes: string
          lecturer_id: string
          max_attempts?: number
          module_id: string
          penalty_points_per_resubmission?: number
          policy_reference: string
          published_at?: string | null
          published_by?: string | null
          required_evidence: string
          rubric_version?: string
          status?: string
          student_expectations: string
          submission_cutoff: string
          teaching_date?: string | null
          teaching_summary: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assessment_type?: string
          created_at?: string
          due_at?: string
          id?: string
          learning_outcomes?: string
          lecturer_id?: string
          max_attempts?: number
          module_id?: string
          penalty_points_per_resubmission?: number
          policy_reference?: string
          published_at?: string | null
          published_by?: string | null
          required_evidence?: string
          rubric_version?: string
          status?: string
          student_expectations?: string
          submission_cutoff?: string
          teaching_date?: string | null
          teaching_summary?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_assessment_briefs_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_assessment_criteria: {
        Row: {
          brief_id: string
          criterion_code: string
          criterion_description: string
          display_order: number
          id: string
          learning_outcome: string
          max_points: number
          scoring_guidance: string
          tenant_id: string
        }
        Insert: {
          brief_id: string
          criterion_code: string
          criterion_description: string
          display_order: number
          id?: string
          learning_outcome: string
          max_points: number
          scoring_guidance: string
          tenant_id: string
        }
        Update: {
          brief_id?: string
          criterion_code?: string
          criterion_description?: string
          display_order?: number
          id?: string
          learning_outcome?: string
          max_points?: number
          scoring_guidance?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_assessment_criteria_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "unipathway_assessment_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_assessment_events: {
        Row: {
          actor_id: string
          attempt_id: string | null
          brief_id: string
          created_at: string
          detail: string | null
          event_type: string
          id: string
          tenant_id: string
        }
        Insert: {
          actor_id: string
          attempt_id?: string | null
          brief_id: string
          created_at?: string
          detail?: string | null
          event_type: string
          id?: string
          tenant_id: string
        }
        Update: {
          actor_id?: string
          attempt_id?: string | null
          brief_id?: string
          created_at?: string
          detail?: string | null
          event_type?: string
          id?: string
          tenant_id?: string
        }
        Relationships: []
      }
      unipathway_assessment_grade_amendments: {
        Row: {
          appeal_id: string
          approved_by: string
          attempt_id: string
          brief_id: string
          corrected_feedback: string
          corrected_final_score: number
          corrected_raw_score: number
          original_final_score: number
          original_raw_score: number
          recorded_at: string
          retained_penalty_points: number
          reviewer_id: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          appeal_id: string
          approved_by: string
          attempt_id: string
          brief_id: string
          corrected_feedback: string
          corrected_final_score: number
          corrected_raw_score: number
          original_final_score: number
          original_raw_score: number
          recorded_at?: string
          retained_penalty_points: number
          reviewer_id: string
          student_id: string
          tenant_id: string
        }
        Update: {
          appeal_id?: string
          approved_by?: string
          attempt_id?: string
          brief_id?: string
          corrected_feedback?: string
          corrected_final_score?: number
          corrected_raw_score?: number
          original_final_score?: number
          original_raw_score?: number
          recorded_at?: string
          retained_penalty_points?: number
          reviewer_id?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_assessment_grade_amendments_appeal_id_fkey"
            columns: ["appeal_id"]
            isOneToOne: true
            referencedRelation: "unipathway_assessment_appeals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_assessment_grade_amendments_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "unipathway_assessment_released_results"
            referencedColumns: ["attempt_id"]
          },
        ]
      }
      unipathway_assessment_human_marks: {
        Row: {
          adjusted_score: number
          attempt_id: string
          criteria_scores: Json
          feedback: string
          marked_at: string
          marker_id: string
          penalty_points: number
          raw_score: number
          revision: number
          tenant_id: string
        }
        Insert: {
          adjusted_score: number
          attempt_id: string
          criteria_scores: Json
          feedback: string
          marked_at?: string
          marker_id: string
          penalty_points: number
          raw_score: number
          revision?: number
          tenant_id: string
        }
        Update: {
          adjusted_score?: number
          attempt_id?: string
          criteria_scores?: Json
          feedback?: string
          marked_at?: string
          marker_id?: string
          penalty_points?: number
          raw_score?: number
          revision?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_assessment_human_marks_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "unipathway_assessment_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_assessment_mark_history: {
        Row: {
          adjusted_score: number
          attempt_id: string
          criteria_scores: Json | null
          feedback: string | null
          id: string
          marked_at: string | null
          marker_id: string
          penalty_points: number
          raw_score: number
          recorded_at: string
          revision: number
          tenant_id: string
        }
        Insert: {
          adjusted_score: number
          attempt_id: string
          criteria_scores?: Json | null
          feedback?: string | null
          id?: string
          marked_at?: string | null
          marker_id: string
          penalty_points: number
          raw_score: number
          recorded_at?: string
          revision: number
          tenant_id: string
        }
        Update: {
          adjusted_score?: number
          attempt_id?: string
          criteria_scores?: Json | null
          feedback?: string | null
          id?: string
          marked_at?: string | null
          marker_id?: string
          penalty_points?: number
          raw_score?: number
          recorded_at?: string
          revision?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_assessment_mark_history_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "unipathway_assessment_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_assessment_quality_decisions: {
        Row: {
          attempt_id: string
          decided_at: string
          decision: string
          id: string
          mark_revision: number
          rationale: string
          reviewer_id: string
          tenant_id: string
        }
        Insert: {
          attempt_id: string
          decided_at?: string
          decision: string
          id?: string
          mark_revision: number
          rationale: string
          reviewer_id: string
          tenant_id: string
        }
        Update: {
          attempt_id?: string
          decided_at?: string
          decision?: string
          id?: string
          mark_revision?: number
          rationale?: string
          reviewer_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_assessment_quality_decisions_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "unipathway_assessment_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_assessment_released_results: {
        Row: {
          approved_mark_revision: number
          attempt_id: string
          brief_id: string
          final_score: number
          penalty_points: number
          published_feedback: string
          raw_score: number
          released_at: string
          released_by: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          approved_mark_revision: number
          attempt_id: string
          brief_id: string
          final_score: number
          penalty_points: number
          published_feedback: string
          raw_score: number
          released_at?: string
          released_by: string
          student_id: string
          tenant_id: string
        }
        Update: {
          approved_mark_revision?: number
          attempt_id?: string
          brief_id?: string
          final_score?: number
          penalty_points?: number
          published_feedback?: string
          raw_score?: number
          released_at?: string
          released_by?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_assessment_released_results_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "unipathway_assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_assessment_released_results_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "unipathway_assessment_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_cctv_cameras: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          location: string
          name: string
          provider_camera_id: string
          security_live: boolean
          security_playback: boolean
          tenant_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          location: string
          name: string
          provider_camera_id: string
          security_live?: boolean
          security_playback?: boolean
          tenant_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          location?: string
          name?: string
          provider_camera_id?: string
          security_live?: boolean
          security_playback?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_cctv_cameras_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_cctv_cameras_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_class_release_decisions: {
        Row: {
          approved_at: string
          approved_by: string
          session_id: string
          tenant_id: string
          urgent: boolean
          urgent_reason: string
        }
        Insert: {
          approved_at?: string
          approved_by: string
          session_id: string
          tenant_id: string
          urgent?: boolean
          urgent_reason: string
        }
        Update: {
          approved_at?: string
          approved_by?: string
          session_id?: string
          tenant_id?: string
          urgent?: boolean
          urgent_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_class_release_decisions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_class_release_decisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_class_release_decisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_course_offer_reviews: {
        Row: {
          course_key: string
          created_at: string
          evidence_reference: string
          id: string
          reviewed_by: string
          revision: number
          snapshot: Json
        }
        Insert: {
          course_key: string
          created_at?: string
          evidence_reference: string
          id?: string
          reviewed_by: string
          revision: number
          snapshot: Json
        }
        Update: {
          course_key?: string
          created_at?: string
          evidence_reference?: string
          id?: string
          reviewed_by?: string
          revision?: number
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_course_offer_reviews_course_key_fkey"
            columns: ["course_key"]
            isOneToOne: false
            referencedRelation: "unipathway_public_course_offers"
            referencedColumns: ["course_key"]
          },
        ]
      }
      unipathway_coursework_uploads: {
        Row: {
          attempt_id: string | null
          brief_id: string
          byte_size: number
          created_at: string
          file_name: string
          id: string
          mime_type: string
          storage_path: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          attempt_id?: string | null
          brief_id: string
          byte_size: number
          created_at?: string
          file_name: string
          id?: string
          mime_type: string
          storage_path: string
          student_id: string
          tenant_id: string
        }
        Update: {
          attempt_id?: string | null
          brief_id?: string
          byte_size?: number
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string
          storage_path?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_coursework_uploads_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "unipathway_assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_coursework_uploads_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "unipathway_assessment_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_coursework_uploads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_coursework_uploads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_employer_applications: {
        Row: {
          applicant_consent_at: string
          created_at: string
          id: string
          opportunity_id: string
          statement: string | null
          status: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          applicant_consent_at: string
          created_at?: string
          id?: string
          opportunity_id: string
          statement?: string | null
          status?: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          applicant_consent_at?: string
          created_at?: string
          id?: string
          opportunity_id?: string
          statement?: string | null
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_employer_applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "unipathway_employer_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_employer_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_employer_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_employer_memberships: {
        Row: {
          created_at: string
          id: string
          organisation_id: string
          role: string
          status: string
          tenant_id: string
          user_id: string
          verification_reference: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          organisation_id: string
          role?: string
          status?: string
          tenant_id: string
          user_id: string
          verification_reference?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          organisation_id?: string
          role?: string
          status?: string
          tenant_id?: string
          user_id?: string
          verification_reference?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_employer_memberships_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "unipathway_employer_organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_employer_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_employer_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_employer_opportunities: {
        Row: {
          application_deadline: string | null
          approved_at: string | null
          approved_by: string | null
          city: string | null
          country: string
          created_at: string
          created_by: string | null
          employer_display_name: string
          id: string
          opportunity_type: string
          organisation_id: string
          remote: boolean
          role_description: string
          safety_requirements: string | null
          status: string
          stipend_details: string | null
          tenant_id: string
          title: string
          updated_at: string
          verification_reference: string | null
        }
        Insert: {
          application_deadline?: string | null
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          employer_display_name?: string
          id?: string
          opportunity_type: string
          organisation_id: string
          remote?: boolean
          role_description: string
          safety_requirements?: string | null
          status?: string
          stipend_details?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          verification_reference?: string | null
        }
        Update: {
          application_deadline?: string | null
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          employer_display_name?: string
          id?: string
          opportunity_type?: string
          organisation_id?: string
          remote?: boolean
          role_description?: string
          safety_requirements?: string | null
          status?: string
          stipend_details?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          verification_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_employer_opportunities_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "unipathway_employer_organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_employer_opportunities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_employer_opportunities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_employer_organisations: {
        Row: {
          city: string | null
          contact_reference: string | null
          created_at: string
          id: string
          name: string
          sector: string
          status: string
          tenant_id: string
          updated_at: string
          verification_reference: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          city?: string | null
          contact_reference?: string | null
          created_at?: string
          id?: string
          name: string
          sector: string
          status?: string
          tenant_id: string
          updated_at?: string
          verification_reference?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          city?: string | null
          contact_reference?: string | null
          created_at?: string
          id?: string
          name?: string
          sector?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          verification_reference?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_employer_organisations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_employer_organisations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_exam_syllabuses: {
        Row: {
          academic_session: string | null
          authorisation_evidence_reference: string | null
          authorisation_status: string
          authorised_at: string | null
          authorised_by: string | null
          awarding_body: string
          course_delivery_status: string
          created_at: string
          created_by: string | null
          curriculum_reviewed_at: string | null
          curriculum_reviewed_by: string | null
          exam_delivery: string
          examination: string
          family: string
          grading_model: string
          id: string
          internal_notes: string | null
          jurisdiction: string
          mock_exam_support: boolean
          module_id: string | null
          official_exam_registration_enabled: boolean
          qualification_level: string | null
          specification_source: string
          specification_version: string
          stream: string | null
          subject: string
          syllabus_code: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          academic_session?: string | null
          authorisation_evidence_reference?: string | null
          authorisation_status?: string
          authorised_at?: string | null
          authorised_by?: string | null
          awarding_body: string
          course_delivery_status?: string
          created_at?: string
          created_by?: string | null
          curriculum_reviewed_at?: string | null
          curriculum_reviewed_by?: string | null
          exam_delivery?: string
          examination: string
          family: string
          grading_model: string
          id?: string
          internal_notes?: string | null
          jurisdiction?: string
          mock_exam_support?: boolean
          module_id?: string | null
          official_exam_registration_enabled?: boolean
          qualification_level?: string | null
          specification_source: string
          specification_version: string
          stream?: string | null
          subject: string
          syllabus_code?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          academic_session?: string | null
          authorisation_evidence_reference?: string | null
          authorisation_status?: string
          authorised_at?: string | null
          authorised_by?: string | null
          awarding_body?: string
          course_delivery_status?: string
          created_at?: string
          created_by?: string | null
          curriculum_reviewed_at?: string | null
          curriculum_reviewed_by?: string | null
          exam_delivery?: string
          examination?: string
          family?: string
          grading_model?: string
          id?: string
          internal_notes?: string | null
          jurisdiction?: string
          mock_exam_support?: boolean
          module_id?: string | null
          official_exam_registration_enabled?: boolean
          qualification_level?: string | null
          specification_source?: string
          specification_version?: string
          stream?: string | null
          subject?: string
          syllabus_code?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_exam_syllabuses_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_funding_events: {
        Row: {
          changed_by: string
          created_at: string
          current: Json
          id: string
          invoice_id: string
          note: string
          previous: Json | null
          tenant_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          current: Json
          id?: string
          invoice_id: string
          note: string
          previous?: Json | null
          tenant_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          current?: Json
          id?: string
          invoice_id?: string
          note?: string
          previous?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_funding_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_guardian_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          link_id: string
          request_id: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          link_id: string
          request_id?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          link_id?: string
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_guardian_messages_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "parent_student_links"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_guardian_result_consents: {
        Row: {
          granted_at: string
          link_id: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          granted_at?: string
          link_id: string
          student_id: string
          tenant_id: string
        }
        Update: {
          granted_at?: string
          link_id?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_guardian_result_consents_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: true
            referencedRelation: "parent_student_links"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_guardian_scope_consents: {
        Row: {
          granted_at: string
          link_id: string
          scope: string
        }
        Insert: {
          granted_at?: string
          link_id: string
          scope: string
        }
        Update: {
          granted_at?: string
          link_id?: string
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_guardian_scope_consents_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "parent_student_links"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_guided_audio: {
        Row: {
          playing: boolean
          position_seconds: number
          revision: number
          session_id: string
          storage_path: string
          title: string
          updated_at: string
        }
        Insert: {
          playing?: boolean
          position_seconds?: number
          revision?: number
          session_id: string
          storage_path: string
          title: string
          updated_at?: string
        }
        Update: {
          playing?: boolean
          position_seconds?: number
          revision?: number
          session_id?: string
          storage_path?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_guided_audio_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_lab_code_activity: {
        Row: {
          action: string
          actor_id: string
          id: string
          occurred_at: string
          revision: number
          student_id: string
          task_id: string
          template_id: string
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id: string
          id?: string
          occurred_at?: string
          revision: number
          student_id: string
          task_id: string
          template_id: string
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          id?: string
          occurred_at?: string
          revision?: number
          student_id?: string
          task_id?: string
          template_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_lab_code_activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "lab_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_lab_code_activity_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "lab_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_lab_code_workspaces: {
        Row: {
          code: string
          reviewed_at: string | null
          reviewer_feedback: string | null
          reviewer_id: string | null
          revision: number
          status: string
          student_id: string
          submitted_at: string | null
          task_id: string
          template_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code?: string
          reviewed_at?: string | null
          reviewer_feedback?: string | null
          reviewer_id?: string | null
          revision?: number
          status?: string
          student_id: string
          submitted_at?: string | null
          task_id: string
          template_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          reviewed_at?: string | null
          reviewer_feedback?: string | null
          reviewer_id?: string | null
          revision?: number
          status?: string
          student_id?: string
          submitted_at?: string | null
          task_id?: string
          template_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_lab_code_workspaces_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "lab_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_lab_code_workspaces_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "lab_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_lab_launch_requests: {
        Row: {
          approved_at: string | null
          class_run_id: string | null
          error_code: string | null
          estimated_cost_gbp: number
          expires_at: string | null
          id: string
          mode: string
          provider_resource_reference: string | null
          requested_at: string
          started_at: string | null
          status: string
          stopped_at: string | null
          student_id: string
          template_id: string
          tenant_id: string
        }
        Insert: {
          approved_at?: string | null
          class_run_id?: string | null
          error_code?: string | null
          estimated_cost_gbp?: number
          expires_at?: string | null
          id?: string
          mode: string
          provider_resource_reference?: string | null
          requested_at?: string
          started_at?: string | null
          status?: string
          stopped_at?: string | null
          student_id: string
          template_id: string
          tenant_id: string
        }
        Update: {
          approved_at?: string | null
          class_run_id?: string | null
          error_code?: string | null
          estimated_cost_gbp?: number
          expires_at?: string | null
          id?: string
          mode?: string
          provider_resource_reference?: string | null
          requested_at?: string
          started_at?: string | null
          status?: string
          stopped_at?: string | null
          student_id?: string
          template_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_lab_launch_requests_class_run_id_fkey"
            columns: ["class_run_id"]
            isOneToOne: false
            referencedRelation: "lab_class_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_lab_launch_requests_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "lab_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_lab_run_invitations: {
        Row: {
          class_run_id: string
          created_at: string
          invited_by: string
          status: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          class_run_id: string
          created_at?: string
          invited_by: string
          status?: string
          student_id: string
          tenant_id: string
        }
        Update: {
          class_run_id?: string
          created_at?: string
          invited_by?: string
          status?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_lab_run_invitations_class_run_id_fkey"
            columns: ["class_run_id"]
            isOneToOne: false
            referencedRelation: "lab_class_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_lab_support_requests: {
        Row: {
          answered_at: string | null
          assigned_lecturer_id: string | null
          id: string
          launch_request_id: string
          message: string
          requested_at: string
          response: string | null
          status: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          answered_at?: string | null
          assigned_lecturer_id?: string | null
          id?: string
          launch_request_id: string
          message: string
          requested_at?: string
          response?: string | null
          status?: string
          student_id: string
          tenant_id: string
        }
        Update: {
          answered_at?: string | null
          assigned_lecturer_id?: string | null
          id?: string
          launch_request_id?: string
          message?: string
          requested_at?: string
          response?: string | null
          status?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_lab_support_requests_launch_request_id_fkey"
            columns: ["launch_request_id"]
            isOneToOne: false
            referencedRelation: "unipathway_lab_launch_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_lab_task_notes: {
        Row: {
          id: string
          notes: string
          reviewer_feedback: string | null
          reviewer_id: string | null
          status: string
          student_id: string
          submitted_at: string | null
          task_id: string
          template_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          notes?: string
          reviewer_feedback?: string | null
          reviewer_id?: string | null
          status?: string
          student_id: string
          submitted_at?: string | null
          task_id: string
          template_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          notes?: string
          reviewer_feedback?: string | null
          reviewer_id?: string | null
          status?: string
          student_id?: string
          submitted_at?: string | null
          task_id?: string
          template_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_lab_task_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "lab_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_lab_task_notes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "lab_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_learning_attempts: {
        Row: {
          feedback: string | null
          help_requested: boolean
          id: string
          outcome: string | null
          response: string
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string
          task_id: string
        }
        Insert: {
          feedback?: string | null
          help_requested?: boolean
          id: string
          outcome?: string | null
          response: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string
          task_id: string
        }
        Update: {
          feedback?: string | null
          help_requested?: boolean
          id?: string
          outcome?: string | null
          response?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_learning_attempts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "unipathway_learning_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_learning_plans: {
        Row: {
          created_at: string
          created_by: string
          goal: string
          id: string
          module_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          goal: string
          id?: string
          module_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          goal?: string
          id?: string
          module_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_learning_plans_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_learning_shares: {
        Row: {
          link_id: string
          plan_id: string
        }
        Insert: {
          link_id: string
          plan_id: string
        }
        Update: {
          link_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_learning_shares_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "parent_student_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_learning_shares_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "unipathway_learning_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_learning_tasks: {
        Row: {
          baseline: string
          created_at: string
          created_by: string
          diagnostic_evidence: string
          id: string
          instruction: string
          plan_id: string
          position: number
          skill: string
        }
        Insert: {
          baseline: string
          created_at?: string
          created_by: string
          diagnostic_evidence: string
          id: string
          instruction: string
          plan_id: string
          position: number
          skill: string
        }
        Update: {
          baseline?: string
          created_at?: string
          created_by?: string
          diagnostic_evidence?: string
          id?: string
          instruction?: string
          plan_id?: string
          position?: number
          skill?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_learning_tasks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "unipathway_learning_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_lesson_progress: {
        Row: {
          completed: boolean
          lesson_id: string
          position_seconds: number
          revision: number
          student_id: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          lesson_id: string
          position_seconds?: number
          revision: number
          student_id?: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          lesson_id?: string
          position_seconds?: number
          revision?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "unipathway_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_lesson_progress_lesson_id_revision_fkey"
            columns: ["lesson_id", "revision"]
            isOneToOne: false
            referencedRelation: "unipathway_lesson_revisions"
            referencedColumns: ["lesson_id", "revision"]
          },
        ]
      }
      unipathway_lesson_revisions: {
        Row: {
          changed_by: string | null
          created_at: string
          lesson_id: string
          module_id: string
          revision: number
          snapshot: Json
          tenant_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          lesson_id: string
          module_id: string
          revision: number
          snapshot: Json
          tenant_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          lesson_id?: string
          module_id?: string
          revision?: number
          snapshot?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_lesson_revisions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "unipathway_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_lessons: {
        Row: {
          body: string
          id: string
          module_id: string
          position: number
          resource_url: string | null
          revision: number
          status: string
          tenant_id: string
          title: string
          transcript: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          body?: string
          id?: string
          module_id: string
          position?: number
          resource_url?: string | null
          revision?: number
          status?: string
          tenant_id: string
          title: string
          transcript?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          body?: string
          id?: string
          module_id?: string
          position?: number
          resource_url?: string | null
          revision?: number
          status?: string
          tenant_id?: string
          title?: string
          transcript?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_lessons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_lessons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_microsoft_jobs: {
        Row: {
          attempts: number
          created_at: string
          error_code: string | null
          id: string
          lease_token: string | null
          lease_until: string | null
          requested_by: string
          role_type: string
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_code?: string | null
          id?: string
          lease_token?: string | null
          lease_until?: string | null
          requested_by: string
          role_type: string
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_code?: string | null
          id?: string
          lease_token?: string | null
          lease_until?: string | null
          requested_by?: string
          role_type?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      unipathway_mock_exam_events: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string
          duration_minutes: number | null
          exam_component: string | null
          id: string
          paper_reference: string | null
          published_at: string | null
          registration_url: string | null
          starts_at: string | null
          status: string
          syllabus_id: string
          tenant_id: string
          title: string
          total_marks: number | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by: string
          duration_minutes?: number | null
          exam_component?: string | null
          id?: string
          paper_reference?: string | null
          published_at?: string | null
          registration_url?: string | null
          starts_at?: string | null
          status?: string
          syllabus_id: string
          tenant_id: string
          title: string
          total_marks?: number | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string
          duration_minutes?: number | null
          exam_component?: string | null
          id?: string
          paper_reference?: string | null
          published_at?: string | null
          registration_url?: string | null
          starts_at?: string | null
          status?: string
          syllabus_id?: string
          tenant_id?: string
          title?: string
          total_marks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_mock_exam_events_syllabus_id_fkey"
            columns: ["syllabus_id"]
            isOneToOne: false
            referencedRelation: "unipathway_exam_syllabuses"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_module_materials: {
        Row: {
          available_at: string | null
          class_session_id: string | null
          created_at: string
          created_by: string
          id: string
          kind: string
          module_id: string
          object_path: string
          publication_status: string
          tenant_id: string
          title: string
        }
        Insert: {
          available_at?: string | null
          class_session_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          kind: string
          module_id: string
          object_path: string
          publication_status?: string
          tenant_id: string
          title: string
        }
        Update: {
          available_at?: string | null
          class_session_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          module_id?: string
          object_path?: string
          publication_status?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_module_materials_class_session_id_fkey"
            columns: ["class_session_id"]
            isOneToOne: false
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_module_materials_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_placement_actions: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          payload: Json
          placement_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id: string
          payload: Json
          placement_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          payload?: Json
          placement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_placement_actions_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "unipathway_placements"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_placement_logs: {
        Row: {
          created_at: string
          id: string
          minutes: number
          notes: string
          placement_id: string
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
          worked_on: string
        }
        Insert: {
          created_at?: string
          id: string
          minutes: number
          notes: string
          placement_id: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
          worked_on: string
        }
        Update: {
          created_at?: string
          id?: string
          minutes?: number
          notes?: string
          placement_id?: string
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
          worked_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_placement_logs_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "unipathway_placements"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_placements: {
        Row: {
          created_at: string
          created_by: string
          employer_name: string
          ends_on: string
          id: string
          learning_goals: string
          organisation_id: string
          programme_id: string
          programme_title: string
          required: boolean
          required_minutes: number
          starts_on: string
          status: string
          student_id: string
          student_name: string
          supervisor_id: string
          supervisor_name: string
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          employer_name: string
          ends_on: string
          id: string
          learning_goals: string
          organisation_id: string
          programme_id: string
          programme_title: string
          required: boolean
          required_minutes: number
          starts_on: string
          status?: string
          student_id: string
          student_name: string
          supervisor_id: string
          supervisor_name: string
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          employer_name?: string
          ends_on?: string
          id?: string
          learning_goals?: string
          organisation_id?: string
          programme_id?: string
          programme_title?: string
          required?: boolean
          required_minutes?: number
          starts_on?: string
          status?: string
          student_id?: string
          student_name?: string
          supervisor_id?: string
          supervisor_name?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_placements_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "unipathway_employer_organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_placements_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_placements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_placements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_public_course_offers: {
        Row: {
          availability: string
          course_key: string
          entry_requirements: string
          fees: string
          intake_date: string
          published: boolean
          revision: number
          valid_until: string
          verified_at: string
        }
        Insert: {
          availability: string
          course_key: string
          entry_requirements: string
          fees: string
          intake_date: string
          published?: boolean
          revision?: number
          valid_until: string
          verified_at?: string
        }
        Update: {
          availability?: string
          course_key?: string
          entry_requirements?: string
          fees?: string
          intake_date?: string
          published?: boolean
          revision?: number
          valid_until?: string
          verified_at?: string
        }
        Relationships: []
      }
      unipathway_recording_jobs: {
        Row: {
          attempts: number
          error_code: string | null
          finished_at: string | null
          lease_id: string | null
          lease_until: string | null
          requested_at: string
          requested_by: string | null
          result_count: number
          session_id: string
          status: string
        }
        Insert: {
          attempts?: number
          error_code?: string | null
          finished_at?: string | null
          lease_id?: string | null
          lease_until?: string | null
          requested_at?: string
          requested_by?: string | null
          result_count?: number
          session_id: string
          status?: string
        }
        Update: {
          attempts?: number
          error_code?: string | null
          finished_at?: string | null
          lease_id?: string | null
          lease_until?: string | null
          requested_at?: string
          requested_by?: string | null
          result_count?: number
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_recording_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_recording_reviews: {
        Row: {
          artifact_id: string
          id: string
          new_status: string
          previous_status: string
          reviewed_at: string
          reviewer_id: string
          session_id: string
        }
        Insert: {
          artifact_id: string
          id?: string
          new_status: string
          previous_status: string
          reviewed_at?: string
          reviewer_id: string
          session_id: string
        }
        Update: {
          artifact_id?: string
          id?: string
          new_status?: string
          previous_status?: string
          reviewed_at?: string
          reviewer_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_recording_reviews_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "live_class_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_recording_reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_schedule_changes: {
        Row: {
          action: string
          changed_by: string
          created_at: string
          current: Json
          id: string
          module_id: string
          previous: Json | null
          reason: string
          schedule_id: string
          tenant_id: string
        }
        Insert: {
          action: string
          changed_by: string
          created_at?: string
          current: Json
          id?: string
          module_id: string
          previous?: Json | null
          reason: string
          schedule_id: string
          tenant_id: string
        }
        Update: {
          action?: string
          changed_by?: string
          created_at?: string
          current?: Json
          id?: string
          module_id?: string
          previous?: Json | null
          reason?: string
          schedule_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_schedule_changes_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "scheduled_lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_staff_tasks: {
        Row: {
          assigned_to: string
          created_at: string
          created_by: string
          detail: string
          due_on: string
          id: string
          outcome: string
          priority: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          assigned_to: string
          created_at?: string
          created_by?: string
          detail?: string
          due_on: string
          id?: string
          outcome?: string
          priority?: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          assigned_to?: string
          created_at?: string
          created_by?: string
          detail?: string
          due_on?: string
          id?: string
          outcome?: string
          priority?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_staff_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_staff_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_student_lab_entitlements: {
        Row: {
          issued_at: string
          issued_by: string
          module_id: string
          revoked_at: string | null
          student_id: string
          tenant_id: string
          valid_until: string
        }
        Insert: {
          issued_at?: string
          issued_by: string
          module_id: string
          revoked_at?: string | null
          student_id: string
          tenant_id: string
          valid_until: string
        }
        Update: {
          issued_at?: string
          issued_by?: string
          module_id?: string
          revoked_at?: string | null
          student_id?: string
          tenant_id?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_student_lab_entitlements_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_student_lab_entitlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unipathway_student_lab_entitlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_syllabus_objectives: {
        Row: {
          display_order: number
          exam_component: string | null
          id: string
          learning_evidence: string | null
          objective_code: string
          objective_text: string
          requires_supervised_practical: boolean
          syllabus_id: string
          tenant_id: string
          topic: string
        }
        Insert: {
          display_order: number
          exam_component?: string | null
          id?: string
          learning_evidence?: string | null
          objective_code: string
          objective_text: string
          requires_supervised_practical?: boolean
          syllabus_id: string
          tenant_id: string
          topic: string
        }
        Update: {
          display_order?: number
          exam_component?: string | null
          id?: string
          learning_evidence?: string | null
          objective_code?: string
          objective_text?: string
          requires_supervised_practical?: boolean
          syllabus_id?: string
          tenant_id?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_syllabus_objectives_syllabus_id_fkey"
            columns: ["syllabus_id"]
            isOneToOne: false
            referencedRelation: "unipathway_exam_syllabuses"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_task_history: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          snapshot: Json
          task_id: string
          version: number
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          snapshot: Json
          task_id: string
          version: number
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          snapshot?: Json
          task_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "unipathway_staff_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      unipathway_teams_teaching_plans: {
        Row: {
          duration_minutes: number
          groups: Json
          instructions: string
          revision: number
          session_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          duration_minutes?: number
          groups?: Json
          instructions?: string
          revision?: number
          session_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          duration_minutes?: number
          groups?: Json
          instructions?: string
          revision?: number
          session_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "unipathway_teams_teaching_plans_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "live_class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          last_seen: string
          status: string
          typing_in: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          last_seen?: string
          status?: string
          typing_in?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          last_seen?: string
          status?: string
          typing_in?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      partner_universities_public: {
        Row: {
          country: string | null
          fee: string | null
          flag: string | null
          id: string | null
          ielts: string | null
          intake: string | null
          name: string | null
          programme: string | null
          status: string | null
          url: string | null
        }
        Insert: {
          country?: string | null
          fee?: string | null
          flag?: string | null
          id?: string | null
          ielts?: string | null
          intake?: string | null
          name?: string | null
          programme?: string | null
          status?: string | null
          url?: string | null
        }
        Update: {
          country?: string | null
          fee?: string | null
          flag?: string | null
          id?: string | null
          ielts?: string | null
          intake?: string | null
          name?: string | null
          programme?: string | null
          status?: string | null
          url?: string | null
        }
        Relationships: []
      }
      quiz_questions_safe: {
        Row: {
          created_at: string | null
          id: string | null
          options: Json | null
          points: number | null
          question_text: string | null
          question_type: Database["public"]["Enums"]["question_type"] | null
          quiz_id: string | null
          sort_order: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions_student: {
        Row: {
          created_at: string | null
          id: string | null
          options: Json | null
          points: number | null
          question_text: string | null
          question_type: Database["public"]["Enums"]["question_type"] | null
          quiz_id: string | null
          sort_order: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants_public: {
        Row: {
          accent_color: string | null
          brand_name: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          primary_color: string | null
          slug: string | null
          status: Database["public"]["Enums"]["tenant_status"] | null
        }
        Insert: {
          accent_color?: string | null
          brand_name?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          primary_color?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["tenant_status"] | null
        }
        Update: {
          accent_color?: string | null
          brand_name?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          primary_color?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["tenant_status"] | null
        }
        Relationships: []
      }
      transport_vehicles_student: {
        Row: {
          capacity: number | null
          created_at: string | null
          id: string | null
          status: string | null
          tenant_id: string | null
          vehicle_number: string | null
          vehicle_type: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          id?: string | null
          status?: string | null
          tenant_id?: string | null
          vehicle_number?: string | null
          vehicle_type?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          id?: string | null
          status?: string | null
          tenant_id?: string | null
          vehicle_number?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      activate_international_service_from_lead: {
        Args: { p_billing_mode?: string; p_enquiry: string; p_student: string }
        Returns: string
      }
      add_unipathway_learning_task: {
        Args: {
          p_baseline: string
          p_diagnostic: string
          p_id: string
          p_instruction: string
          p_plan: string
          p_skill: string
        }
        Returns: string
      }
      allocate_unipathway_independent_marker: {
        Args: {
          p_attempt: string
          p_marker: string
          p_quality_reviewer: string
        }
        Returns: undefined
      }
      answer_unipathway_class_question: {
        Args: { p_answer: string; p_publish?: boolean; p_question: string }
        Returns: undefined
      }
      answer_unipathway_lab_support: {
        Args: { p_response: string; p_support: string }
        Returns: undefined
      }
      append_unipathway_whiteboard_operation: {
        Args: { p_board: string; p_operation: Json }
        Returns: {
          created_at: string
          sequence: number
        }[]
      }
      approve_unipathway_appeal_policy: {
        Args: { p_brief: string; p_days: number; p_policy: string }
        Returns: undefined
      }
      approve_unipathway_teaching_syllabus: {
        Args: { p_syllabus: string }
        Returns: undefined
      }
      approve_unipathway_urgent_class_release: {
        Args: { p_reason: string; p_session: string }
        Returns: Json
      }
      assign_unipathway_appeal_reviewer: {
        Args: { p_appeal: string; p_reviewer: string }
        Returns: undefined
      }
      audit_uni_mail_ai: { Args: { p_thread: string }; Returns: undefined }
      auto_schedule_module: {
        Args: {
          _academic_year?: string
          _color?: string
          _lecturer_id: string
          _module_id: string
          _semester?: number
          _tenant_id: string
        }
        Returns: Json
      }
      can_access_ielts_speaking: {
        Args: { p_path: string; p_write?: boolean }
        Returns: boolean
      }
      can_access_my_unipathway_class_resource: {
        Args: { p_session: string; p_tenant: string }
        Returns: boolean
      }
      can_access_partner_file: {
        Args: { p_name: string; p_write?: boolean }
        Returns: boolean
      }
      can_access_uni_lab_run: { Args: { p_run: string }; Returns: boolean }
      can_access_uni_lab_template: {
        Args: { p_template: string }
        Returns: boolean
      }
      can_author_uni_assessment: {
        Args: { p_module: string; p_tenant: string }
        Returns: boolean
      }
      can_create_uni_lab_in_module: {
        Args: { p_module: string; p_tenant: string }
        Returns: boolean
      }
      can_join_unipathway_class: {
        Args: { p_session: string }
        Returns: boolean
      }
      can_manage_uni_assessment: { Args: { p_brief: string }; Returns: boolean }
      can_manage_uni_lab_request: {
        Args: { p_request: string }
        Returns: boolean
      }
      can_manage_uni_lab_run: { Args: { p_run: string }; Returns: boolean }
      can_manage_uni_lab_template: {
        Args: { p_template: string }
        Returns: boolean
      }
      can_manage_uni_syllabus: { Args: { p_tenant: string }; Returns: boolean }
      can_manage_unipathway_class: {
        Args: { p_session: string }
        Returns: boolean
      }
      can_manage_unipathway_microsoft: {
        Args: { p_tenant: string }
        Returns: boolean
      }
      can_manage_unipathway_module: {
        Args: { p_module: string }
        Returns: boolean
      }
      can_mark_uni_attempt: { Args: { p_attempt: string }; Returns: boolean }
      can_open_my_unipathway_class_media: {
        Args: { p_path: string }
        Returns: boolean
      }
      can_open_my_unipathway_material: {
        Args: { p_path: string }
        Returns: boolean
      }
      can_quality_uni_attempt: { Args: { p_attempt: string }; Returns: boolean }
      can_read_language_recording: { Args: { _name: string }; Returns: boolean }
      can_read_uni_appeal_attempt: {
        Args: { p_attempt: string }
        Returns: boolean
      }
      can_read_uni_appeal_brief: { Args: { p_brief: string }; Returns: boolean }
      can_read_unipathway_class_media: {
        Args: { p_path: string }
        Returns: boolean
      }
      can_read_unipathway_coursework_file: {
        Args: { p_path: string }
        Returns: boolean
      }
      can_read_unipathway_learning_plan: {
        Args: { p_plan: string }
        Returns: boolean
      }
      can_read_unipathway_learning_task: {
        Args: { p_task: string }
        Returns: boolean
      }
      can_read_unipathway_module_asset: {
        Args: { p_path: string }
        Returns: boolean
      }
      can_review_uni_assessment_brief: {
        Args: { p_brief: string }
        Returns: boolean
      }
      can_review_unipathway_class: {
        Args: { p_session: string }
        Returns: boolean
      }
      can_study_uni_assessment: { Args: { p_brief: string }; Returns: boolean }
      can_upload_unipathway_module_asset: {
        Args: { p_path: string }
        Returns: boolean
      }
      can_view_uni_syllabus: { Args: { p_syllabus: string }; Returns: boolean }
      can_view_unipathway_module: {
        Args: { p_module: string }
        Returns: boolean
      }
      can_write_unipathway_coursework_file: {
        Args: { p_path: string }
        Returns: boolean
      }
      cancel_uni_calendar_class: {
        Args: { p_session: string }
        Returns: undefined
      }
      cancel_uni_mail_draft: { Args: { p_message: string }; Returns: undefined }
      change_unipathway_placement: {
        Args: { p_action: string; p_data: Json; p_request: string }
        Returns: string
      }
      check_my_unipathway_tech_lab: {
        Args: { p_module: string }
        Returns: boolean
      }
      claim_uni_calendar_job: { Args: { p_tenant: string }; Returns: Json }
      claim_uni_mail_send: {
        Args: { p_provider?: string; p_tenant: string }
        Returns: Json
      }
      claim_unipathway_lab_help: {
        Args: { p_request: string; p_resolved?: boolean }
        Returns: undefined
      }
      claim_unipathway_microsoft_job: {
        Args: { p_tenant: string }
        Returns: Json
      }
      claim_unipathway_recording_job: {
        Args: { p_tenant: string }
        Returns: Json
      }
      complete_unipathway_admission: {
        Args: {
          p_application: string
          p_expected_stage: string
          p_note: string
          p_programme: string
          p_student: string
        }
        Returns: string
      }
      configure_uni_mailbox: {
        Args: {
          p_address: string
          p_enabled?: boolean
          p_graph: string
          p_member: string
          p_send?: boolean
        }
        Returns: string
      }
      confirm_unipathway_actual_class_end: {
        Args: { p_evidence: string; p_session: string }
        Returns: Json
      }
      consume_interactive_lab_ai: {
        Args: { p_daily_limit: number }
        Returns: boolean
      }
      consume_study_tutor_quota: { Args: { p_user: string }; Returns: Json }
      create_pathway_application: {
        Args: { p_intake?: string; p_route: string; p_student: string }
        Returns: string
      }
      create_unipathway_learning_plan: {
        Args: { p_goal: string; p_module: string; p_student: string }
        Returns: string
      }
      create_unipathway_private_conversation: {
        Args: { p_name: string }
        Returns: string
      }
      decide_unipathway_quality_mark: {
        Args: { p_approve: boolean; p_attempt: string; p_rationale: string }
        Returns: undefined
      }
      delete_user_account: { Args: { _user_id: string }; Returns: undefined }
      discard_unipathway_coursework_file: {
        Args: { p_upload: string }
        Returns: undefined
      }
      ensure_my_account: { Args: never; Returns: undefined }
      export_user_data: { Args: { _user_id: string }; Returns: Json }
      finalise_unipathway_grade_appeal: {
        Args: { p_accept: boolean; p_appeal: string; p_reasoning: string }
        Returns: undefined
      }
      finish_uni_calendar_job: {
        Args: {
          p_error?: string
          p_event?: string
          p_join?: string
          p_lease: string
          p_session: string
        }
        Returns: undefined
      }
      finish_uni_mail_send: {
        Args: { p_accepted: boolean; p_message: string }
        Returns: undefined
      }
      finish_unipathway_microsoft_job: {
        Args: {
          p_error?: string
          p_job: string
          p_lease: string
          p_object?: string
          p_sku?: string
          p_upn?: string
        }
        Returns: undefined
      }
      get_unipathway_admission_options: {
        Args: { p_application: string }
        Returns: Json
      }
      get_unipathway_daily_register: {
        Args: { p_date: string; p_module: string }
        Returns: Json
      }
      get_unipathway_guardian_activity: { Args: never; Returns: Json }
      get_unipathway_guardian_learning: { Args: never; Returns: Json }
      get_unipathway_guardian_results: { Args: never; Returns: Json }
      get_unipathway_guardian_scopes: { Args: never; Returns: Json }
      get_unipathway_guardian_sharing: { Args: never; Returns: Json }
      get_unipathway_guardian_staff_queue: { Args: never; Returns: Json }
      get_unipathway_guided_audio: {
        Args: { p_session: string }
        Returns: Json
      }
      get_unipathway_learning_share_options: {
        Args: { p_plan: string }
        Returns: Json
      }
      get_unipathway_my_fee_invoices: {
        Args: never
        Returns: {
          amount: number
          created_at: string
          due_date: string
          id: string
          paid: number
          sponsor_amount: number
          sponsor_name: string
          sponsor_paid: number
          status: string
          type: string
        }[]
      }
      get_unipathway_placement_options: { Args: never; Returns: Json }
      get_unipathway_teams_plan: { Args: { p_session: string }; Returns: Json }
      get_unipathway_tuition_roster: { Args: never; Returns: Json }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      global_partner_authorised: {
        Args: { p_partner: string; p_tenant: string }
        Returns: boolean
      }
      grant_unipathway_tech_lab_to_student: {
        Args: { p_module: string; p_student: string; p_until: string }
        Returns: boolean
      }
      guardian_learner_allowed: { Args: { p_link: string }; Returns: boolean }
      guardian_scope_allowed: {
        Args: { p_link: string; p_scope: string }
        Returns: boolean
      }
      guardian_staff_allowed: { Args: { p_link: string }; Returns: boolean }
      guided_audio_session: { Args: { p_path: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      ingest_uni_mail: {
        Args: {
          p_at: string
          p_body: string
          p_box: string
          p_cc: string[]
          p_conversation: string
          p_direction: string
          p_from: string
          p_has_documents?: boolean
          p_provider: string
          p_subject: string
          p_to: string[]
        }
        Returns: string
      }
      invite_enrolled_unipathway_lab_class: {
        Args: { p_run: string }
        Returns: number
      }
      invite_enrolled_unipathway_lab_run: {
        Args: { p_run: string }
        Returns: number
      }
      invite_enrolled_unipathway_lecture: {
        Args: { p_session: string }
        Returns: number
      }
      is_academic_manager: { Args: never; Returns: boolean }
      is_lab_participant: { Args: { _session: string }; Returns: boolean }
      is_lab_teacher: { Args: { _user: string }; Returns: boolean }
      join_interactive_lab: {
        Args: { p_code: string; p_location: string }
        Returns: string
      }
      list_attendance_corrections: { Args: { p_after?: string }; Returns: Json }
      my_quiz_attempts: { Args: never; Returns: Json }
      my_unipathway_tech_lab_modules: {
        Args: never
        Returns: {
          module_id: string
        }[]
      }
      note_unipathway_whiteboard_view: {
        Args: { p_board: string }
        Returns: undefined
      }
      open_interactive_lab: {
        Args: { p_kind: string; p_title: string }
        Returns: {
          activity_id: string | null
          activity_revision: number
          broadcast: Json
          created_at: string
          created_by: string
          ended_at: string | null
          id: string
          join_code: string
          kind: string
          locked: boolean
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "interactive_lab_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_unipathway_assessment_brief: {
        Args: { p_brief: string }
        Returns: undefined
      }
      publish_unipathway_course_material: {
        Args: { p_material: string }
        Returns: Json
      }
      publish_unipathway_mock: { Args: { p_mock: string }; Returns: undefined }
      queue_uni_mail: { Args: { p_message: string }; Returns: undefined }
      read_uni_mail_alert: { Args: { p_id: string }; Returns: undefined }
      record_unipathway_appeal_review: {
        Args: {
          p_appeal: string
          p_feedback?: string
          p_raw_score: number
          p_reasoning: string
          p_recommendation: string
        }
        Returns: undefined
      }
      record_unipathway_human_mark: {
        Args: { p_attempt: string; p_criteria: Json; p_feedback: string }
        Returns: number
      }
      register_partner_document: {
        Args: { p_name: string; p_partner: string; p_path: string }
        Returns: string
      }
      register_uni_mail_document: {
        Args: { p_name: string; p_path: string; p_thread: string }
        Returns: string
      }
      release_unipathway_assessment_mark: {
        Args: { p_attempt: string }
        Returns: undefined
      }
      remind_uni_mail_tasks: { Args: { p_tenant: string }; Returns: number }
      remove_uni_mail_member: {
        Args: { p_box: string; p_member: string }
        Returns: undefined
      }
      request_attendance_correction: {
        Args: {
          p_id: string
          p_reason: string
          p_record: string
          p_status: Database["public"]["Enums"]["attendance_status"]
        }
        Returns: string
      }
      request_unipathway_assessment_resubmission: {
        Args: { p_attempt: string; p_guidance: string }
        Returns: undefined
      }
      request_unipathway_grade_appeal: {
        Args: { p_attempt: string; p_details: string; p_grounds: string }
        Returns: string
      }
      request_unipathway_lab_help: {
        Args: { p_message: string; p_session: string }
        Returns: string
      }
      request_unipathway_lab_support: {
        Args: { p_message: string; p_request: string }
        Returns: string
      }
      request_unipathway_lms_lab: {
        Args: { p_class_run?: string; p_mode: string; p_template: string }
        Returns: string
      }
      request_unipathway_managed_lab: {
        Args: { p_class_run?: string; p_mode: string; p_offering: string }
        Returns: string
      }
      request_unipathway_microsoft_account: {
        Args: { p_user: string }
        Returns: string
      }
      request_unipathway_recordings: {
        Args: { p_session: string }
        Returns: undefined
      }
      reserve_unipathway_coursework_file: {
        Args: {
          p_brief: string
          p_mime: string
          p_name: string
          p_size: number
        }
        Returns: {
          attempt_id: string | null
          brief_id: string
          byte_size: number
          created_at: string
          file_name: string
          id: string
          mime_type: string
          storage_path: string
          student_id: string
          tenant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "unipathway_coursework_uploads"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      respond_unipathway_hand_raise: {
        Args: { p_action: string; p_session: string; p_student: string }
        Returns: undefined
      }
      review_attendance_correction: {
        Args: { p_decision: string; p_id: string; p_reason: string }
        Returns: string
      }
      review_production_check: {
        Args: {
          p_check: string
          p_evidence?: string
          p_notes?: string
          p_revision: number
          p_status: string
          p_valid_until?: string
        }
        Returns: number
      }
      review_uni_calendar_delivery: {
        Args: { p_session: string }
        Returns: undefined
      }
      review_uni_mark_revision: {
        Args: {
          p_action: string
          p_attempt: string
          p_rationale?: string
          p_revision: number
        }
        Returns: undefined
      }
      review_unipathway_course_offer: {
        Args: {
          p_availability: string
          p_entry: string
          p_evidence: string
          p_fees: string
          p_intake: string
          p_key: string
          p_publish: boolean
          p_revision: number
          p_until: string
        }
        Returns: number
      }
      review_unipathway_lab_code: {
        Args: { p_feedback: string; p_student: string; p_task: string }
        Returns: undefined
      }
      review_unipathway_lab_practice_note: {
        Args: { p_feedback: string; p_note: string }
        Returns: undefined
      }
      review_unipathway_lab_task: {
        Args: {
          p_approved: boolean
          p_feedback: string
          p_session: string
          p_task: string
        }
        Returns: undefined
      }
      review_unipathway_learning_attempt: {
        Args: { p_attempt: string; p_feedback: string; p_outcome: string }
        Returns: undefined
      }
      review_unipathway_recording: {
        Args: { p_artifact: string; p_expected: string; p_status: string }
        Returns: undefined
      }
      review_unipathway_tech_lab_module: {
        Args: { p_enabled: boolean; p_module: string; p_reference: string }
        Returns: boolean
      }
      revoke_unipathway_tech_lab: {
        Args: { p_module: string; p_student: string }
        Returns: boolean
      }
      same_tenant: { Args: { t: string }; Returns: boolean }
      save_quiz_answers: {
        Args: { p_answers: Json; p_attempt_id: string }
        Returns: Json
      }
      save_uni_calendar_class: {
        Args: {
          p_cancel?: boolean
          p_end: string
          p_id: string
          p_module: string
          p_organiser: string
          p_revision?: number
          p_start: string
          p_students: string[]
          p_title: string
        }
        Returns: string
      }
      save_uni_mail_draft: {
        Args: {
          p_body: string
          p_box: string
          p_request?: string
          p_subject: string
          p_thread?: string
          p_to: string[]
        }
        Returns: string
      }
      save_uni_mail_task: {
        Args: {
          p_assignee: string
          p_due?: string
          p_status?: string
          p_task?: string
          p_thread: string
          p_title: string
        }
        Returns: string
      }
      save_uni_marking_draft: {
        Args: {
          p_attempt: string
          p_criteria: Json
          p_feedback: string
          p_guidance: string
          p_revision: number
        }
        Returns: {
          attempt_id: string
          criteria: Json
          feedback: string
          guidance: string
          marker_id: string
          revision: number
          tenant_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "uni_marking_drafts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_unipathway_daily_mark: {
        Args: {
          p_date: string
          p_module: string
          p_status: Database["public"]["Enums"]["attendance_status"]
          p_student: string
        }
        Returns: string
      }
      save_unipathway_lab_code: {
        Args: { p_code: string; p_submit?: boolean; p_task: string }
        Returns: {
          saved_revision: number
          saved_status: string
        }[]
      }
      save_unipathway_lab_practice_note: {
        Args: { p_notes: string; p_submit?: boolean; p_task: string }
        Returns: string
      }
      save_unipathway_teams_plan: {
        Args: {
          p_duration: number
          p_groups: Json
          p_instructions: string
          p_revision: number
          p_session: string
        }
        Returns: number
      }
      save_unipathway_whiteboard_snapshot: {
        Args: { p_board: string; p_shapes: Json; p_through_sequence: number }
        Returns: undefined
      }
      seed_uni_remaining_launch_checks: {
        Args: { p_tenant: string }
        Returns: undefined
      }
      seed_unipathway_launch_gates: {
        Args: { p_tenant: string }
        Returns: undefined
      }
      send_unipathway_guardian_message: {
        Args: { p_body: string; p_link: string }
        Returns: undefined
      }
      send_unipathway_guardian_message_once: {
        Args: { p_body: string; p_link: string; p_request: string }
        Returns: string
      }
      set_unipathway_guardian_result_sharing: {
        Args: { p_link: string; p_share: boolean }
        Returns: undefined
      }
      set_unipathway_guardian_scope: {
        Args: { p_link: string; p_scope: string; p_share: boolean }
        Returns: undefined
      }
      set_unipathway_guided_audio: {
        Args: {
          p_path: string
          p_playing: boolean
          p_position: number
          p_revision: number
          p_session: string
          p_title: string
        }
        Returns: Json
      }
      set_unipathway_hand_raise: {
        Args: { p_action: string; p_session: string }
        Returns: string
      }
      set_unipathway_learning_share: {
        Args: { p_link: string; p_plan: string; p_share: boolean }
        Returns: undefined
      }
      start_quiz_attempt: { Args: { p_quiz_id: string }; Returns: Json }
      start_unipathway_direct_conversation: {
        Args: { p_recipient: string }
        Returns: string
      }
      submit_quiz_attempt: {
        Args: { p_answers: Json; p_attempt_id: string }
        Returns: Json
      }
      submit_unipathway_assessment: {
        Args: { p_brief: string; p_evidence: string }
        Returns: string
      }
      submit_unipathway_class_question: {
        Args: { p_body: string; p_session: string }
        Returns: string
      }
      submit_unipathway_coursework: {
        Args: {
          p_brief: string
          p_evidence: string
          p_request: string
          p_uploads: string[]
        }
        Returns: string
      }
      submit_unipathway_lab_task: {
        Args: { p_note: string; p_session: string; p_task: string }
        Returns: undefined
      }
      submit_unipathway_learning_attempt: {
        Args: {
          p_help: boolean
          p_id: string
          p_response: string
          p_task: string
        }
        Returns: string
      }
      touch_interactive_lab: {
        Args: {
          p_activity: string
          p_hand: boolean
          p_session: string
          p_status: string
        }
        Returns: undefined
      }
      uni_calendar_candidates: { Args: { p_module: string }; Returns: Json }
      uni_calendar_manage: { Args: { p_session: string }; Returns: boolean }
      uni_calendar_read: { Args: { p_session: string }; Returns: boolean }
      uni_mail_access: {
        Args: { p_box: string; p_send?: boolean }
        Returns: boolean
      }
      uni_mail_member_directory: {
        Args: never
        Returns: {
          can_send: boolean
          full_name: string
          mailbox_id: string
          user_id: string
        }[]
      }
      uni_mail_storage_access: {
        Args: { p_name: string; p_write?: boolean }
        Returns: boolean
      }
      uni_mail_thread_access: {
        Args: { p_send?: boolean; p_thread: string }
        Returns: boolean
      }
      unipathway_conversation_members: {
        Args: { p_conversation: string }
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      unipathway_guardian_can_read_results: {
        Args: { p_student: string; p_tenant: string }
        Returns: boolean
      }
      unipathway_guardian_link_scope: {
        Args: {
          p_parent: string
          p_staff: boolean
          p_student: string
          p_tenant: string
        }
        Returns: boolean
      }
      unipathway_is_messaging_staff: {
        Args: { p_user: string }
        Returns: boolean
      }
      unipathway_lab_can_view_session: {
        Args: { p_session: string }
        Returns: boolean
      }
      unipathway_lab_staff_can_manage: {
        Args: { p_module: string }
        Returns: boolean
      }
      unipathway_lab_student_enrolled: {
        Args: { p_module: string }
        Returns: boolean
      }
      unipathway_message_directory: {
        Args: { p_search?: string }
        Returns: {
          full_name: string
          role_label: string
          user_id: string
        }[]
      }
      unipathway_module_organisers: {
        Args: { p_module: string }
        Returns: {
          display_name: string
          user_id: string
        }[]
      }
      unipathway_placement_access: { Args: { p_id: string }; Returns: boolean }
      unipathway_placement_manager: { Args: never; Returns: boolean }
      unipathway_private_attachment_allowed: {
        Args: { p_path: string }
        Returns: boolean
      }
      unipathway_student_verified_employer: {
        Args: { _org: string; _tenant: string }
        Returns: boolean
      }
      unipathway_task_assignees: {
        Args: never
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      unipathway_verified_employer_member: {
        Args: { _org: string; _user: string }
        Returns: boolean
      }
      update_uni_mail_thread: {
        Args: {
          p_assignee: string
          p_due?: string
          p_priority: string
          p_status: string
          p_thread: string
        }
        Returns: undefined
      }
      verify_certificate: {
        Args: { _cert_number: string }
        Returns: {
          awarding_body: string
          certificate_number: string
          created_at: string
          expiry_date: string | null
          grade: string | null
          id: string
          issue_date: string
          level: string
          programme_title: string
          status: string
          student_name: string
          tenant_id: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "certificate_verifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      verify_unipathway_guardian_link: {
        Args: {
          p_parent_email: string
          p_reference: string
          p_student_email: string
        }
        Returns: undefined
      }
      withdraw_unipathway_course_offer: {
        Args: { p_evidence: string; p_key: string; p_revision: number }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "superadmin"
        | "centre_director"
        | "admissions_admin"
        | "lecturer"
        | "programme_leader"
        | "iqa_officer"
        | "exams_officer"
        | "finance_officer"
        | "marketing_officer"
        | "agent"
        | "student"
        | "university_partner"
        | "employer_partner"
        | "parent_guardian"
        | "assessor"
        | "awarding_body_eqa"
        | "welfare_officer"
      application_stage:
        | "lead"
        | "contacted"
        | "qualified"
        | "applied"
        | "under_review"
        | "conditional_offer"
        | "unconditional_offer"
        | "deposit_paid"
        | "enrolled"
        | "lost"
        | "deferred"
      attendance_status: "present" | "absent" | "late" | "excused"
      awarding_body: "OTHM" | "QUALIFI" | "IAB"
      expense_category:
        | "cloud_hosting"
        | "api_services"
        | "development"
        | "staff_salary"
        | "staff_bonus"
        | "marketing"
        | "advertising"
        | "utility"
        | "rent"
        | "internet"
        | "phone"
        | "fuel"
        | "travel"
        | "office_supplies"
        | "software_licenses"
        | "insurance"
        | "legal"
        | "accounting"
        | "agent_commission"
        | "maintenance"
        | "equipment"
        | "training"
        | "subscriptions"
        | "bank_charges"
        | "taxes"
        | "miscellaneous"
        | "university_referral_income"
      expense_payment_method:
        | "cash"
        | "bank_transfer"
        | "credit_card"
        | "debit_card"
        | "cheque"
        | "raast"
        | "nayapay"
        | "sadapay"
        | "jazzcash"
        | "easypaisa"
        | "petty_cash"
        | "other"
      invoice_status: "paid" | "partial" | "overdue" | "pending" | "refunded"
      invoice_type: "tuition" | "exam" | "deposit" | "commission"
      payment_method:
        | "bank_transfer"
        | "raast"
        | "nayapay"
        | "sadapay"
        | "bank_alfalah"
        | "stripe"
        | "other"
      programme_status: "active" | "draft" | "archived"
      question_type: "mcq" | "true_false" | "short_answer"
      quiz_status: "draft" | "published" | "archived"
      tenant_plan: "starter" | "professional" | "enterprise"
      tenant_status: "active" | "suspended" | "onboarding"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "superadmin",
        "centre_director",
        "admissions_admin",
        "lecturer",
        "programme_leader",
        "iqa_officer",
        "exams_officer",
        "finance_officer",
        "marketing_officer",
        "agent",
        "student",
        "university_partner",
        "employer_partner",
        "parent_guardian",
        "assessor",
        "awarding_body_eqa",
        "welfare_officer",
      ],
      application_stage: [
        "lead",
        "contacted",
        "qualified",
        "applied",
        "under_review",
        "conditional_offer",
        "unconditional_offer",
        "deposit_paid",
        "enrolled",
        "lost",
        "deferred",
      ],
      attendance_status: ["present", "absent", "late", "excused"],
      awarding_body: ["OTHM", "QUALIFI", "IAB"],
      expense_category: [
        "cloud_hosting",
        "api_services",
        "development",
        "staff_salary",
        "staff_bonus",
        "marketing",
        "advertising",
        "utility",
        "rent",
        "internet",
        "phone",
        "fuel",
        "travel",
        "office_supplies",
        "software_licenses",
        "insurance",
        "legal",
        "accounting",
        "agent_commission",
        "maintenance",
        "equipment",
        "training",
        "subscriptions",
        "bank_charges",
        "taxes",
        "miscellaneous",
        "university_referral_income",
      ],
      expense_payment_method: [
        "cash",
        "bank_transfer",
        "credit_card",
        "debit_card",
        "cheque",
        "raast",
        "nayapay",
        "sadapay",
        "jazzcash",
        "easypaisa",
        "petty_cash",
        "other",
      ],
      invoice_status: ["paid", "partial", "overdue", "pending", "refunded"],
      invoice_type: ["tuition", "exam", "deposit", "commission"],
      payment_method: [
        "bank_transfer",
        "raast",
        "nayapay",
        "sadapay",
        "bank_alfalah",
        "stripe",
        "other",
      ],
      programme_status: ["active", "draft", "archived"],
      question_type: ["mcq", "true_false", "short_answer"],
      quiz_status: ["draft", "published", "archived"],
      tenant_plan: ["starter", "professional", "enterprise"],
      tenant_status: ["active", "suspended", "onboarding"],
    },
  },
} as const
