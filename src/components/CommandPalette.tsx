import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '@/contexts/AuthContext';
import { NAV_CONFIG } from '@/components/layout/DashboardSidebar';
import { Search, ArrowRight } from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  // Keyboard shortcut
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

  // Build searchable items from all nav configs
  const items = useMemo(() => {
    const result: { label: string; path: string; section: string; role: string }[] = [];
    for (const [role, sections] of Object.entries(NAV_CONFIG)) {
      for (const section of sections) {
        for (const item of section.items) {
          result.push({
            label: item.label,
            path: item.path,
            section: section.title || ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role,
            role: ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role,
          });
        }
      }
    }
    return result;
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) {
      // Show current role items first
      if (!user) return items.slice(0, 10);
      const roleItems = items.filter(i => i.role === ROLE_LABELS[user.role]);
      return roleItems.length > 0 ? roleItems : items.slice(0, 10);
    }
    const q = query.toLowerCase();
    return items.filter(
      (i) => i.label.toLowerCase().includes(q) || i.section.toLowerCase().includes(q) || i.role.toLowerCase().includes(q)
    ).slice(0, 12);
  }, [query, items, user]);

  const go = (path: string) => {
    navigate(path);
    onOpenChange(false);
    setQuery('');
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[60]" onClick={() => onOpenChange(false)} />
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg z-[61]">
        <div className="surface-elevated overflow-hidden mx-4">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 h-12 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, modules, roles..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filtered.length > 0) go(filtered[0].path);
              }}
            />
            <kbd className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-mono">ESC</kbd>
          </div>

          {/* Results */}
          <div className="max-h-72 overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No results found</p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.path + item.role}
                  onClick={() => go(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/80 transition-default text-left"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.role} · {item.section}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
