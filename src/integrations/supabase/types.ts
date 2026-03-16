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
        ]
      }
      programmes: {
        Row: {
          awarding_body: Database["public"]["Enums"]["awarding_body"]
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
        ]
      }
    }
    Views: {
      [_ in never]: never
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
