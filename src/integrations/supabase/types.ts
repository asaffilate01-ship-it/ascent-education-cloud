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
          classroom_session_id: string | null
          created_at: string
          description: string | null
          ended_at: string | null
          id: string
          is_lab_mode: boolean
          lecturer_id: string
          module_id: string | null
          scheduled_at: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          classroom_session_id?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          is_lab_mode?: boolean
          lecturer_id: string
          module_id?: string | null
          scheduled_at?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          classroom_session_id?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          is_lab_mode?: boolean
          lecturer_id?: string
          module_id?: string | null
          scheduled_at?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
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
      live_class_sessions: {
        Row: {
          attendee_camera_default: boolean
          attendee_mic_default: boolean
          capacity: number
          class_mode: string
          cohort_reference: string | null
          created_at: string
          ends_at: string
          id: string
          join_url: string | null
          moderator_user_ids: string[]
          module_id: string | null
          organiser_user_id: string
          polls_enabled: boolean
          provider: string
          provider_event_id: string | null
          provider_meeting_id: string | null
          qna_enabled: boolean
          recording_enabled: boolean
          starts_at: string
          status: string
          teams_sync_status: string
          tenant_id: string
          title: string
          transcript_enabled: boolean
          whiteboard_enabled: boolean
        }
        Insert: {
          attendee_camera_default?: boolean
          attendee_mic_default?: boolean
          capacity?: number
          class_mode?: string
          cohort_reference?: string | null
          created_at?: string
          ends_at: string
          id?: string
          join_url?: string | null
          moderator_user_ids?: string[]
          module_id?: string | null
          organiser_user_id: string
          polls_enabled?: boolean
          provider?: string
          provider_event_id?: string | null
          provider_meeting_id?: string | null
          qna_enabled?: boolean
          recording_enabled?: boolean
          starts_at: string
          status?: string
          teams_sync_status?: string
          tenant_id: string
          title: string
          transcript_enabled?: boolean
          whiteboard_enabled?: boolean
        }
        Update: {
          attendee_camera_default?: boolean
          attendee_mic_default?: boolean
          capacity?: number
          class_mode?: string
          cohort_reference?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          join_url?: string | null
          moderator_user_ids?: string[]
          module_id?: string | null
          organiser_user_id?: string
          polls_enabled?: boolean
          provider?: string
          provider_event_id?: string | null
          provider_meeting_id?: string | null
          qna_enabled?: boolean
          recording_enabled?: boolean
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
          id: string
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
          id?: string
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
          id?: string
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
      unipathway_module_materials: {
        Row: {
          available_at: string | null
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
            foreignKeyName: "unipathway_module_materials_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
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
      approve_unipathway_appeal_policy: {
        Args: { p_brief: string; p_days: number; p_policy: string }
        Returns: undefined
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
      can_author_uni_assessment: {
        Args: { p_module: string; p_tenant: string }
        Returns: boolean
      }
      can_manage_uni_assessment: { Args: { p_brief: string }; Returns: boolean }
      can_manage_unipathway_microsoft: {
        Args: { p_tenant: string }
        Returns: boolean
      }
      can_manage_unipathway_module: {
        Args: { p_module: string }
        Returns: boolean
      }
      can_mark_uni_attempt: { Args: { p_attempt: string }; Returns: boolean }
      can_quality_uni_attempt: { Args: { p_attempt: string }; Returns: boolean }
      can_read_uni_appeal_attempt: {
        Args: { p_attempt: string }
        Returns: boolean
      }
      can_read_uni_appeal_brief: { Args: { p_brief: string }; Returns: boolean }
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
      can_study_uni_assessment: { Args: { p_brief: string }; Returns: boolean }
      can_upload_unipathway_module_asset: {
        Args: { p_path: string }
        Returns: boolean
      }
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
      claim_uni_calendar_job: { Args: { p_tenant: string }; Returns: Json }
      claim_uni_mail_send: {
        Args: { p_provider?: string; p_tenant: string }
        Returns: Json
      }
      claim_unipathway_microsoft_job: {
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
      consume_study_tutor_quota: { Args: { p_user: string }; Returns: Json }
      create_unipathway_learning_plan: {
        Args: { p_goal: string; p_module: string; p_student: string }
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
      get_unipathway_guardian_activity: { Args: never; Returns: Json }
      get_unipathway_guardian_learning: { Args: never; Returns: Json }
      get_unipathway_guardian_results: { Args: never; Returns: Json }
      get_unipathway_guardian_scopes: { Args: never; Returns: Json }
      get_unipathway_guardian_sharing: { Args: never; Returns: Json }
      get_unipathway_guardian_staff_queue: { Args: never; Returns: Json }
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
      get_unipathway_tuition_roster: { Args: never; Returns: Json }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      guardian_learner_allowed: { Args: { p_link: string }; Returns: boolean }
      guardian_scope_allowed: {
        Args: { p_link: string; p_scope: string }
        Returns: boolean
      }
      guardian_staff_allowed: { Args: { p_link: string }; Returns: boolean }
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
      publish_unipathway_assessment_brief: {
        Args: { p_brief: string }
        Returns: undefined
      }
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
      request_unipathway_assessment_resubmission: {
        Args: { p_attempt: string; p_guidance: string }
        Returns: undefined
      }
      request_unipathway_grade_appeal: {
        Args: { p_attempt: string; p_details: string; p_grounds: string }
        Returns: string
      }
      request_unipathway_microsoft_account: {
        Args: { p_user: string }
        Returns: string
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
      review_unipathway_learning_attempt: {
        Args: { p_attempt: string; p_feedback: string; p_outcome: string }
        Returns: undefined
      }
      same_tenant: { Args: { t: string }; Returns: boolean }
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
      set_unipathway_learning_share: {
        Args: { p_link: string; p_plan: string; p_share: boolean }
        Returns: undefined
      }
      submit_unipathway_assessment: {
        Args: { p_brief: string; p_evidence: string }
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
      submit_unipathway_learning_attempt: {
        Args: {
          p_help: boolean
          p_id: string
          p_response: string
          p_task: string
        }
        Returns: string
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
      unipathway_task_assignees: {
        Args: never
        Returns: {
          full_name: string
          user_id: string
        }[]
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
