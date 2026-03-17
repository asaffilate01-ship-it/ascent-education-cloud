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
    PostgrestVersion: "14.4"
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
      applications: {
        Row: {
          agent_id: string | null
          counsellor: string | null
          created_at: string
          email: string
          id: string
          level: string | null
          notes: string | null
          phone: string | null
          programme_id: string | null
          programme_name: string | null
          source: string | null
          stage: Database["public"]["Enums"]["application_stage"]
          student_name: string
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          counsellor?: string | null
          created_at?: string
          email: string
          id?: string
          level?: string | null
          notes?: string | null
          phone?: string | null
          programme_id?: string | null
          programme_name?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["application_stage"]
          student_name: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          counsellor?: string | null
          created_at?: string
          email?: string
          id?: string
          level?: string | null
          notes?: string | null
          phone?: string | null
          programme_id?: string | null
          programme_name?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["application_stage"]
          student_name?: string
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
      attendance_records: {
        Row: {
          created_at: string
          date: string
          id: string
          method: string | null
          module_id: string | null
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
      classroom_recordings: {
        Row: {
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
      invoices: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          instalments: number | null
          issued_date: string
          paid: number
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
          id?: string
          instalments?: number | null
          issued_date?: string
          paid?: number
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
          id?: string
          instalments?: number | null
          issued_date?: string
          paid?: number
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
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
          sender_name: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
          sender_name: string
        }
        Update: {
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
          verified: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          relationship?: string
          student_id: string
          tenant_id?: string | null
          verified?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          relationship?: string
          student_id?: string
          tenant_id?: string | null
          verified?: boolean
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
          id: string
          level: string
          modules_count: number | null
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
          id?: string
          level: string
          modules_count?: number | null
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
          id?: string
          level?: string
          modules_count?: number | null
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
    }
    Functions: {
      delete_user_account: { Args: { _user_id: string }; Returns: undefined }
      export_user_data: { Args: { _user_id: string }; Returns: Json }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      invoice_status: "paid" | "partial" | "overdue" | "pending" | "refunded"
      invoice_type: "tuition" | "exam" | "deposit" | "commission"
      programme_status: "active" | "draft" | "archived"
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
      invoice_status: ["paid", "partial", "overdue", "pending", "refunded"],
      invoice_type: ["tuition", "exam", "deposit", "commission"],
      programme_status: ["active", "draft", "archived"],
      tenant_plan: ["starter", "professional", "enterprise"],
      tenant_status: ["active", "suspended", "onboarding"],
    },
  },
} as const
