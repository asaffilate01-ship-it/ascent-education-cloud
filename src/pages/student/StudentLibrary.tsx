import DashboardLayout from '@/components/layout/DashboardLayout';
import { Video, FileText, BookOpen, Download, Play, Search, Clock, Eye, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

type FilterType = 'all' | 'recording' | 'slides' | 'ebook' | 'document';

const TYPE_ICONS: Record<string, React.ElementType> = {
  recording: Video,
  slides: FileText,
  ebook: BookOpen,
  document: FileText,
};

const STATIC_RESOURCES = [
  { id: 's1', title: 'Strategic Management — Week 8 Lecture', type: 'recording', module: 'Strategic Management', date: '2025-03-14', duration: '1h 23m', size: '480MB', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
  { id: 's2', title: "Porter's Five Forces Framework", type: 'slides', module: 'Strategic Management', date: '2025-03-14', pages: 32 },
  { id: 's3', title: 'Financial Ratio Analysis Guide', type: 'ebook', module: 'Financial Analysis', date: '2025-03-10', pages: 145 },
  { id: 's4', title: 'Business Environment — Week 7 Lecture', type: 'recording', module: 'Business Environment', date: '2025-03-07', duration: '1h 15m', size: '420MB', videoUrl: 'https://www.w3schools.com/html/movie.mp4' },
  { id: 's5', title: 'PESTLE Analysis Template', type: 'document', module: 'Business Environment', date: '2025-03-05', pages: 8 },
  { id: 's6', title: 'Accounting Fundamentals Workbook', type: 'ebook', module: 'IAB Accounting', date: '2025-02-28', pages: 200 },
  { id: 's7', title: 'Research Methods Handbook', type: 'ebook', module: 'Research Methods', date: '2025-02-15', pages: 180 },
  { id: 's8', title: 'HR Management — Recruitment Strategies', type: 'recording', module: 'Human Resource Management', date: '2025-03-12', duration: '55m', size: '310MB', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
];

export default function StudentLibrary() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [playingResource, setPlayingResource] = useState<any>(null);
  const [viewLogId, setViewLogId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: modules } = useSupabaseQuery('modules');

  // Fetch view logs for current user
  const { data: viewLogs, refetch: refetchLogs } = useSupabaseQuery('resource_view_logs' as any, {
    filters: user ? [{ column: 'student_id', operator: 'eq', value: user.id }] : [],
    orderBy: { column: 'created_at', ascending: false },
    enabled: !!user,
  });

  const resources = useMemo(() => STATIC_RESOURCES, []);

  const filtered = resources
    .filter(r => filter === 'all' || r.type === filter)
    .filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.module.toLowerCase().includes(search.toLowerCase()));

  // Get view history for a resource
  const getViewHistory = useCallback((resourceId: string) => {
    return (viewLogs as any[])?.filter(l => l.resource_title === resources.find(r => r.id === resourceId)?.title) || [];
  }, [viewLogs, resources]);

  // Start watching a video — create a log entry
  const startWatching = async (resource: any) => {
    setPlayingResource(resource);
    setElapsed(0);

    if (!user) return;
    try {
      const profile = await supabase.from('profiles').select('tenant_id').eq('user_id', user.id).single();
      const { data, error } = await supabase.from('resource_view_logs' as any).insert({
        student_id: user.id,
        resource_title: resource.title,
        resource_type: resource.type,
        module_name: resource.module,
        tenant_id: (profile.data as any)?.tenant_id,
      } as any).select().single();
      if (error) throw error;
      setViewLogId((data as any)?.id || null);
    } catch (e: any) {
      console.error('Failed to create view log:', e.message);
    }
  };

  // Track elapsed time while video plays
  useEffect(() => {
    if (!playingResource) return;
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playingResource]);

  // Stop watching — update log with duration
  const stopWatching = async (completed = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (viewLogId && user) {
      try {
        await supabase.from('resource_view_logs' as any).update({
          ended_at: new Date().toISOString(),
          duration_seconds: elapsed,
          completed,
        } as any).eq('id', viewLogId);
      } catch (e: any) {
        console.error('Failed to update view log:', e.message);
      }
    }

    setPlayingResource(null);
    setViewLogId(null);
    setElapsed(0);
    refetchLogs();
  };

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <DashboardLayout
      title="Learning Library"
      subtitle="Lecture recordings, ebooks, slides, and study materials — available 24/7"
      actions={
        <Button size="sm" variant="outline" onClick={() => setShowHistory(true)}>
          <Clock className="w-3.5 h-3.5 mr-1" /> View History
        </Button>
      }
    >
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources..."
            className="w-full bg-secondary text-sm pl-9 pr-4 py-2.5 rounded-lg outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['all', 'recording', 'slides', 'ebook', 'document'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-default capitalize ${
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-accent'
              }`}
            >
              {f === 'all' ? 'All' : f + 's'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Resources', value: resources.length, color: 'text-primary' },
          { label: 'Recordings', value: resources.filter(r => r.type === 'recording').length, color: 'text-primary' },
          { label: 'Videos Watched', value: (viewLogs as any[])?.filter(l => l.resource_type === 'recording').length || 0, color: 'text-success' },
          { label: 'Total Watch Time', value: formatDuration((viewLogs as any[])?.reduce((s, l) => s + (l.duration_seconds || 0), 0) || 0), color: 'text-muted-foreground' },
        ].map(s => (
          <div key={s.label} className="surface-card p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Resources Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((r) => {
          const Icon = TYPE_ICONS[r.type] || FileText;
          const views = getViewHistory(r.id);
          const hasWatched = views.length > 0;
          return (
            <div key={r.id} className="surface-card p-4 hover:shadow-lg transition-default cursor-pointer group">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  r.type === 'recording' ? 'bg-primary/10' :
                  r.type === 'ebook' ? 'bg-success/10' : 'bg-secondary'
                }`}>
                  <Icon className={`w-4 h-4 ${
                    r.type === 'recording' ? 'text-primary' :
                    r.type === 'ebook' ? 'text-success' : 'text-muted-foreground'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-default">{r.title}</p>
                    {hasWatched && <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.module}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                    <span>{new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                    {(r as any).duration && <span>{(r as any).duration}</span>}
                    {(r as any).pages && <span>{(r as any).pages} pages</span>}
                    {(r as any).size && <span>{(r as any).size}</span>}
                    {hasWatched && <span className="text-success font-medium"><Eye className="w-2.5 h-2.5 inline mr-0.5" />{views.length}×</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {r.type === 'recording' ? (
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => startWatching(r)}>
                    <Play className="w-3 h-3 mr-1" /> Watch
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" size="sm" className="flex-1 text-xs">
                      <BookOpen className="w-3 h-3 mr-1" /> Open
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs">
                      <Download className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">No resources found</p>
        </div>
      )}

      {/* Video Player Modal */}
      <Dialog open={!!playingResource} onOpenChange={(open) => { if (!open) stopWatching(false); }}>
        <DialogContent className="max-w-3xl">
          {playingResource && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">{playingResource.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    src={playingResource.videoUrl}
                    controls
                    autoPlay
                    className="w-full h-full"
                    onEnded={() => stopWatching(true)}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Watching: <span className="font-bold text-foreground">{formatDuration(elapsed)}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]">{playingResource.module}</span>
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-[10px] text-success font-medium">Recording</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* View History Modal */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Viewing History</DialogTitle>
          </DialogHeader>
          {(viewLogs as any[])?.length === 0 ? (
            <div className="text-center py-8">
              <Eye className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No viewing history yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(viewLogs as any[])?.map((log: any) => (
                <div key={log.id} className="surface-card p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Video className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{log.resource_title}</p>
                    <p className="text-[10px] text-muted-foreground">{log.module_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold">{formatDuration(log.duration_seconds || 0)}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(log.started_at).toLocaleDateString()}</p>
                  </div>
                  {log.completed && <CheckCircle className="w-4 h-4 text-success shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
