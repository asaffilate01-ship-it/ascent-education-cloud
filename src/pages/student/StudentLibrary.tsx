import DashboardLayout from '@/components/layout/DashboardLayout';
import { Library, Video, FileText, BookOpen, Download, Play, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const RESOURCES = [
  { id: '1', title: 'Strategic Management — Week 8 Lecture', type: 'recording', module: 'Strategic Management', date: '2025-03-14', duration: '1h 23m', size: '480MB' },
  { id: '2', title: 'Porter\'s Five Forces Framework', type: 'slides', module: 'Strategic Management', date: '2025-03-14', pages: 32 },
  { id: '3', title: 'Financial Ratio Analysis Guide', type: 'ebook', module: 'Financial Analysis', date: '2025-03-10', pages: 145 },
  { id: '4', title: 'Business Environment — Week 7 Lecture', type: 'recording', module: 'Business Environment', date: '2025-03-07', duration: '1h 15m', size: '420MB' },
  { id: '5', title: 'PESTLE Analysis Template', type: 'document', module: 'Business Environment', date: '2025-03-05', pages: 8 },
  { id: '6', title: 'Accounting Fundamentals Workbook', type: 'ebook', module: 'IAB Accounting', date: '2025-02-28', pages: 200 },
  { id: '7', title: 'Strategic Management — Week 7 Lecture', type: 'recording', module: 'Strategic Management', date: '2025-03-07', duration: '1h 18m', size: '450MB' },
  { id: '8', title: 'Research Methods Handbook', type: 'ebook', module: 'Research Methods', date: '2025-02-15', pages: 180 },
];

type FilterType = 'all' | 'recording' | 'slides' | 'ebook' | 'document';

const TYPE_ICONS: Record<string, React.ElementType> = {
  recording: Video,
  slides: FileText,
  ebook: BookOpen,
  document: FileText,
};

export default function StudentLibrary() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  const filtered = RESOURCES
    .filter(r => filter === 'all' || r.type === filter)
    .filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.module.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout title="Learning Library" subtitle="Lecture recordings, ebooks, slides, and study materials — available 24/7">
      {/* Search & Filter */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources..."
            className="w-full bg-secondary text-sm pl-9 pr-4 py-2.5 rounded-lg outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-1">
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
    </DashboardLayout>
  );
}
