import DashboardLayout from '@/components/layout/DashboardLayout';
import { Video, FileText, BookOpen, Download, Play, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useAuth } from '@/contexts/AuthContext';

type FilterType = 'all' | 'recording' | 'slides' | 'ebook' | 'document';

const TYPE_ICONS: Record<string, React.ElementType> = {
  recording: Video,
  slides: FileText,
  ebook: BookOpen,
  document: FileText,
};

// Static resources as fallback + supplement
const STATIC_RESOURCES = [
  { id: 's1', title: 'Strategic Management — Week 8 Lecture', type: 'recording', module: 'Strategic Management', date: '2025-03-14', duration: '1h 23m', size: '480MB' },
  { id: 's2', title: "Porter's Five Forces Framework", type: 'slides', module: 'Strategic Management', date: '2025-03-14', pages: 32 },
  { id: 's3', title: 'Financial Ratio Analysis Guide', type: 'ebook', module: 'Financial Analysis', date: '2025-03-10', pages: 145 },
  { id: 's4', title: 'Business Environment — Week 7 Lecture', type: 'recording', module: 'Business Environment', date: '2025-03-07', duration: '1h 15m', size: '420MB' },
  { id: 's5', title: 'PESTLE Analysis Template', type: 'document', module: 'Business Environment', date: '2025-03-05', pages: 8 },
  { id: 's6', title: 'Accounting Fundamentals Workbook', type: 'ebook', module: 'IAB Accounting', date: '2025-02-28', pages: 200 },
  { id: 's7', title: 'Research Methods Handbook', type: 'ebook', module: 'Research Methods', date: '2025-02-15', pages: 180 },
];

export default function StudentLibrary() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  // Fetch modules to enrich resources with module names
  const { data: modules } = useSupabaseQuery('modules');

  const resources = useMemo(() => {
    // Combine module names from DB with static resources
    const moduleNames = modules.map(m => m.title);
    return STATIC_RESOURCES.map(r => ({
      ...r,
      // Keep existing module names
    }));
  }, [modules]);

  const filtered = resources
    .filter(r => filter === 'all' || r.type === filter)
    .filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.module.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout title="Learning Library" subtitle="Lecture recordings, ebooks, slides, and study materials — available 24/7">
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
          { label: 'E-Books', value: resources.filter(r => r.type === 'ebook').length, color: 'text-success' },
          { label: 'Documents', value: resources.filter(r => r.type === 'document' || r.type === 'slides').length, color: 'text-muted-foreground' },
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
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-default">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.module}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                    <span>{new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                    {(r as any).duration && <span>{(r as any).duration}</span>}
                    {(r as any).pages && <span>{(r as any).pages} pages</span>}
                    {(r as any).size && <span>{(r as any).size}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {r.type === 'recording' ? (
                  <Button variant="outline" size="sm" className="w-full text-xs">
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
    </DashboardLayout>
  );
}
