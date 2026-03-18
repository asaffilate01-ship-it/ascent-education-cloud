import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type TableName = 'applications' | 'invoices' | 'programmes' | 'modules' | 'profiles' | 'tenants' | 'attendance_records' | 'user_roles' | 'assignments' | 'submissions' | 'notifications' | 'conversations' | 'conversation_participants' | 'messages' | 'leave_requests' | 'lesson_plans' | 'transport_vehicles' | 'transport_routes' | 'transport_assignments' | 'health_records' | 'academic_events' | 'resource_view_logs' | 'scheduled_lectures' | 'lecture_reminders' | 'student_enrolments' | 'kyc_documents' | 'e_signatures' | 'compliance_checklists' | 'certificate_verifications' | 'forum_threads' | 'forum_replies' | 'gradebook_entries' | 'classroom_sessions' | 'classroom_recordings' | 'lab_sessions' | 'lab_vms' | 'payments' | 'audit_logs' | 'consent_records' | 'notification_preferences' | 'job_listings' | 'partner_universities' | 'accreditation_bodies' | 'parent_student_links' | 'plagiarism_reports';

export function useSupabaseQuery<T extends TableName>(
  table: T,
  options?: {
    select?: string;
    orderBy?: { column: string; ascending?: boolean };
    filters?: Array<{ column: string; operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in'; value: any }>;
    enabled?: boolean;
  }
) {
  const [data, setData] = useState<Tables<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from(table).select(options?.select || '*');

      if (options?.filters) {
        for (const f of options.filters) {
          query = (query as any).filter(f.column, f.operator, f.value);
        }
      }

      if (options?.orderBy) {
        query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? false });
      }

      const { data: result, error: err } = await query;
      if (err) throw err;
      setData((result || []) as Tables<T>[]);
    } catch (e: any) {
      setError(e.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [table, JSON.stringify(options)]);

  useEffect(() => {
    if (options?.enabled === false) return;
    fetchData();
  }, [fetchData, options?.enabled]);

  return { data, loading, error, refetch: fetchData };
}
