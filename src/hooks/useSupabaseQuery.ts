import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  const {user} = useAuth();
  const key = JSON.stringify([table, options, user?.id, user?.tenantId, user?.role, user?.roles]);
  const currentKey = useRef(key);
  currentKey.current = key;
  const generation = useRef(0);
  const [state, setState] = useState<{key: string; data: Tables<T>[]; loading: boolean; error: string | null}>({key, data: [], loading: options?.enabled !== false, error: null});

  const fetchData = useCallback(async () => {
    // A retained callback from an earlier account, role or query must not cancel the current read.
    if (currentKey.current !== key) return;
    const token = ++generation.current;
    const current = () => token === generation.current && currentKey.current === key;
    if (options?.enabled === false || options?.filters?.some(f => f.operator === 'in' && Array.isArray(f.value) && f.value.length === 0)) {
      setState({key, data: [], loading: false, error: null});
      return;
    }
    setState({key, data: [], loading: true, error: null});
    try {
      const rows: Tables<T>[] = [];
      for (let offset = 0; current(); offset += 250) {
        let query = supabase.from(table).select(options?.select || '*');
        for (const f of options?.filters || []) {
          if (f.operator === 'in') {
            if (!Array.isArray(f.value)) throw new Error('List filters require an array of values.');
            query = (query as any).in(f.column, f.value);
          } else query = (query as any).filter(f.column, f.operator, f.value);
        }
        if (options?.orderBy) query = query.order(options.orderBy.column, {ascending: options.orderBy.ascending ?? false});
        // RLS still controls visibility. The unique ID order makes pagination stable.
        if (options?.orderBy?.column !== 'id') query = query.order('id', {ascending: true});
        const {data, error} = await query.range(offset, offset + 249);
        if (!current()) return;
        if (error) throw error;
        if (!data) throw new Error('No data returned');
        rows.push(...(data as Tables<T>[]));
        if (data.length < 250) break;
      }
      if (current()) setState({key, data: rows, loading: false, error: null});
    } catch (error) {
      if (current()) setState({key, data: [], loading: false, error: error instanceof Error ? error.message : 'Data could not be loaded. Please retry.'});
    }
  // The serialized key includes all query options and account scope.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    void fetchData();
    return () => { generation.current++; };
  }, [fetchData]);

  const visible: {data: Tables<T>[]; loading: boolean; error: string | null} = state.key === key ? state : {data: [], loading: options?.enabled !== false, error: null};
  return {...visible, refetch: fetchData};
}
