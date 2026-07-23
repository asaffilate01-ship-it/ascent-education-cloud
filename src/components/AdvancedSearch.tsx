import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Filter, ArrowRight, Users, CreditCard, FileText, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, ROLE_LABELS } from '@/contexts/AuthContext';
import { NAV_CONFIG } from '@/components/layout/DashboardSidebar';
import { Button } from '@/components/ui/button';

type SearchCategory = 'all' | 'pages' | 'students' | 'finance' | 'courses';

interface SearchResult {
  id: string;
  label: string;
  description: string;
  category: SearchCategory;
  path: string;
  icon: React.ElementType;
}

const CATEGORY_CONFIG: Record<SearchCategory, { label: string; icon: React.ElementType }> = {
  all: { label: 'All', icon: Search },
  pages: { label: 'Pages', icon: ArrowRight },
  students: { label: 'Students', icon: Users },
  finance: { label: 'Finance', icon: CreditCard },
  courses: { label: 'Courses', icon: BookOpen },
};

interface AdvancedSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdvancedSearch({ open, onOpenChange }: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  // Build searchable items from nav configs
  const pageResults = useMemo(() => {
    const result: SearchResult[] = [];
    for (const [role, sections] of Object.entries(NAV_CONFIG)) {
      for (const section of sections) {
        for (const item of section.items) {
          result.push({
            id: `${role}-${item.path}`,
            label: item.label,
            description: `${ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role} → ${section.title || 'Navigation'}`,
            category: 'pages',
            path: item.path,
            icon: item.icon as React.ElementType,
          });
        }
      }
    }
    return result;
  }, []);

  const filtered = useMemo(() => {
    let items = pageResults;

    if (category !== 'all') {
      items = items.filter((i) => i.category === category);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      items = items.filter(
        (i) => i.label.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
      );
    } else if (user) {
      // Default: show current role items
      const roleLabel = ROLE_LABELS[user.role];
      const roleItems = items.filter((i) => i.description.includes(roleLabel));
      if (roleItems.length > 0) items = roleItems;
    }

    return items.slice(0, 12);
  }, [query, category, pageResults, user]);

  const go = (path: string) => {
    navigate(path);
    onOpenChange(false);
    setQuery('');
    setCategory('all');
  };

  if (!open) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[60]"
        onClick={() => onOpenChange(false)}
      />
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="fixed top-[12%] left-1/2 -translate-x-1/2 w-full max-w-xl z-[61] mx-4"
      >
        <div className="surface-elevated overflow-hidden mx-4">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 h-12 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, students, courses..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filtered.length > 0) go(filtered[0].path);
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-1 hover:bg-secondary rounded">
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
            <kbd className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-mono">ESC</kbd>
          </div>

          {/* Category filters */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border/50">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <Button
                key={key}
                size="sm"
                variant={category === key ? 'default' : 'ghost'}
                className={`h-6 text-[11px] px-2.5 gap-1 ${category === key ? '' : 'text-muted-foreground'}`}
                onClick={() => setCategory(key as SearchCategory)}
              >
                <config.icon className="w-3 h-3" />
                {config.label}
              </Button>
            ))}
          </div>

          {/* Results */}
          <div className="max-h-72 overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No results found</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Try a different search term</p>
              </div>
            ) : (
              filtered.map((item, i) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => go(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/80 transition-default text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-default">
                    <item.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-default" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                  </div>
                  <ArrowRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary transition-default" />
                </motion.button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border/50 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              <kbd className="bg-secondary px-1 py-0.5 rounded font-mono mr-1">↵</kbd> Select
              <kbd className="bg-secondary px-1 py-0.5 rounded font-mono mx-1">↑↓</kbd> Navigate
            </p>
            <p className="text-[10px] text-muted-foreground">{filtered.length} results</p>
          </div>
        </div>
      </motion.div>
    </>
  );
}
