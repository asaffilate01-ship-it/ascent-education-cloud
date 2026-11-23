import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Calculator, FlaskConical, Laptop, Landmark } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import LaunchPhaseBadge from '@/components/launch/LaunchPhaseBadge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { tuitionBoardLabel, tuitionBoardOrder } from '@/lib/tuitionBoards';

type Track = { id: string; title: string; curriculum_route: string; grade: number; stream: string | null; delivery_modes: string[]; launch_phase: number; city: string | null };
type Subject = { id: string; track_id: string; subject: string; subject_group: string | null };

export default function TuitionAcademy() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [board, setBoard] = useState('All');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from('school_tuition_tracks').select('id,title,curriculum_route,grade,stream,delivery_modes,launch_phase,city').eq('active', true).order('grade'),
      supabase.from('school_tuition_subjects').select('id,track_id,subject,subject_group').eq('active', true),
    ]).then(([t, s]) => {
      if (!active) return;
      if (t.error || s.error) { setState('error'); return; }
      setTracks((t.data || []) as Track[]); setSubjects((s.data || []) as Subject[]); setState('ready');
    });
    return () => { active = false; };
  }, []);
  const boards = useMemo(() => tuitionBoardOrder.filter(b => tracks.some(t => t.curriculum_route === b)), [tracks]);
  const shown = tracks.filter(t => board === 'All' || t.curriculum_route === board)
    .sort((a, b) => tuitionBoardOrder.indexOf(a.curriculum_route) - tuitionBoardOrder.indexOf(b.curriculum_route) || a.grade - b.grade || String(a.stream).localeCompare(String(b.stream)));
  const groupCount = (group: string) => new Set(subjects.filter(s => s.subject_group === group).map(s => s.subject)).size;
  return <DashboardLayout title="Classes 9–12 Tuition Academy" subtitle="Phase 1 boards, classes and subjects for live online and in-centre tuition">
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard label="Tracks" value={tracks.length} icon={BookOpen} />
      <StatCard label="Sciences" value={groupCount('Sciences')} icon={FlaskConical} />
      <StatCard label="Maths" value={groupCount('Mathematics')} icon={Calculator} />
      <StatCard label="Technology" value={groupCount('Technology')} icon={Laptop} />
      <StatCard label="Commerce" value={groupCount('Commerce')} icon={Landmark} />
    </div>
    {state === 'loading' && <p role="status" className="text-sm text-muted-foreground">Loading tuition tracks…</p>}
    {state === 'error' && <p role="alert" className="rounded-xl border p-4 text-sm">Tuition tracks could not be loaded. Please refresh the page or try again shortly.</p>}
    {state === 'ready' && tracks.length === 0 && <p className="rounded-xl border p-4 text-sm">No tuition tracks are published yet.</p>}
    {boards.length > 1 && <div role="group" aria-label="Filter by board" className="mb-4 flex flex-wrap gap-2">
      {['All', ...boards].map(b => <Button key={b} size="sm" variant={board === b ? 'default' : 'outline'} aria-pressed={board === b} onClick={() => setBoard(b)}>{b === 'All' ? 'All boards' : tuitionBoardLabel(b)}</Button>)}
    </div>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{shown.map(t => <article key={t.id} className="surface-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="text-label">{tuitionBoardLabel(t.curriculum_route)}</p><h3 className="mt-1 font-bold">Class {t.grade}{t.stream ? ' · ' + t.stream : ''}</h3></div><LaunchPhaseBadge phase={t.launch_phase === 2 ? 2 : 1} /></div>
      <p className="mt-3 text-xs text-muted-foreground">{t.delivery_modes.map(m => m === 'centre' ? 'In centre' : m === 'online' ? 'Live online' : m).join(' + ')}{t.city ? ' · ' + t.city : ''}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">{subjects.filter(s => s.track_id === t.id).map(s => <span key={s.id} className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{s.subject}</span>)}</div>
    </article>)}</div>
  </DashboardLayout>;
}
