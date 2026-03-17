import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ScheduledLecture {
  id: string;
  module_id: string;
  lecturer_id: string;
  tenant_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string;
  color: string;
  is_active: boolean;
  academic_year: string;
  semester: number;
  recurrence: string;
  effective_from: string;
  effective_until: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LectureWithModule extends ScheduledLecture {
  module_title: string;
  module_code: string | null;
  programme_title: string;
  lecturer_name?: string;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  { start: '09:00', end: '10:30', label: '09:00–10:30' },
  { start: '10:30', end: '12:00', label: '10:30–12:00' },
  { start: '14:00', end: '15:30', label: '14:00–15:30' },
  { start: '15:30', end: '17:00', label: '15:30–17:00' },
  { start: '18:00', end: '19:30', label: '18:00–19:30' },
  { start: '19:30', end: '21:00', label: '19:30–21:00' },
];

export { DAY_NAMES, TIME_SLOTS };

export function useScheduledLectures() {
  const { user } = useAuth();
  const [lectures, setLectures] = useState<LectureWithModule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLectures = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_lectures')
        .select(`
          *,
          modules!inner(title, code, programme_id, programmes!inner(title))
        `)
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;

      const enriched: LectureWithModule[] = (data || []).map((row: any) => ({
        ...row,
        module_title: row.modules?.title || '',
        module_code: row.modules?.code || null,
        programme_title: row.modules?.programmes?.title || '',
      }));

      setLectures(enriched);
    } catch (e: any) {
      console.error('Failed to fetch lectures:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLectures();

    // Realtime subscription
    const channel = supabase
      .channel('scheduled_lectures_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_lectures' }, () => {
        fetchLectures();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchLectures]);

  // Group by day for timetable view
  const timetable = useMemo(() => {
    return DAY_NAMES.map((day, i) => ({
      day,
      dayIndex: i + 1,
      lectures: lectures.filter(l => l.day_of_week === i + 1).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    }));
  }, [lectures]);

  // My lectures (for current user)
  const myLectures = useMemo(() => {
    if (!user) return [];
    if (user.roles.includes('lecturer') || user.roles.includes('programme_leader')) {
      return lectures.filter(l => l.lecturer_id === user.id);
    }
    return lectures;
  }, [lectures, user]);

  // Detect conflicts (same lecturer, same slot)
  const conflicts = useMemo(() => {
    const seen = new Map<string, LectureWithModule[]>();
    lectures.forEach(l => {
      const key = `${l.lecturer_id}-${l.day_of_week}-${l.start_time}`;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(l);
    });
    return Array.from(seen.entries())
      .filter(([_, v]) => v.length > 1)
      .map(([key, items]) => ({ key, lectures: items }));
  }, [lectures]);

  // Auto-schedule a module
  const autoSchedule = async (moduleId: string, lecturerId: string, tenantId: string, color?: string) => {
    try {
      const { data, error } = await supabase.rpc('auto_schedule_module', {
        _module_id: moduleId,
        _lecturer_id: lecturerId,
        _tenant_id: tenantId,
        _color: color || '#3b82f6',
      });
      if (error) throw error;
      toast.success(`Scheduled ${(data as any)?.slots_assigned || 0} of 8 lecture slots`);
      await fetchLectures();
      return data;
    } catch (e: any) {
      toast.error('Scheduling failed: ' + e.message);
      return null;
    }
  };

  // Manual add
  const addLecture = async (lecture: Partial<ScheduledLecture>) => {
    try {
      const { error } = await supabase.from('scheduled_lectures').insert(lecture as any);
      if (error) {
        if (error.message.includes('idx_no_lecturer_conflict')) {
          toast.error('Conflict: Lecturer already has a class at this time');
        } else if (error.message.includes('idx_no_room_conflict')) {
          toast.error('Conflict: Room already booked at this time');
        } else {
          toast.error(error.message);
        }
        return false;
      }
      toast.success('Lecture scheduled');
      await fetchLectures();
      return true;
    } catch (e: any) {
      toast.error(e.message);
      return false;
    }
  };

  // Remove lecture
  const removeLecture = async (id: string) => {
    const { error } = await supabase.from('scheduled_lectures').update({ is_active: false } as any).eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Lecture removed');
      await fetchLectures();
    }
  };

  return { lectures, myLectures, timetable, conflicts, loading, autoSchedule, addLecture, removeLecture, refetch: fetchLectures };
}
