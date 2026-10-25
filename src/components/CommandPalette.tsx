import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { searchNavigation } from '@/lib/searchNavigation';
import { db } from '@/lib/db';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState('');
  const [term, setTerm] = useState('');
  const navigate = useNavigate(); const { user } = useAuth();
  const pages = useMemo(() => searchNavigation(user?.role), [user?.role]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); onOpenChange(!open); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);
  useEffect(() => { const timer = setTimeout(() => setTerm(query.trim()), 250); return () => clearTimeout(timer); }, [query]);
  useEffect(() => { if (!open) { setQuery(''); setTerm(''); } }, [open, user?.id, user?.role]);
  const canSearchCourses = user?.role === 'student' || user?.role === 'lecturer';
  const records = useQuery({
    queryKey: ['workspace-search', user?.id, user?.tenantId, user?.role, term],
    enabled: open && canSearchCourses && !!user?.tenantId && term.length >= 2,
    queryFn: async () => {
      // Literal matching avoids wildcard queries; database RLS enforces course assignment.
      const escaped = term.replace(/[\\%_]/g, '\\$&');
      let q = db.from('modules').select('id,title,code').eq('tenant_id', user!.tenantId)
        .ilike('title', `%${escaped}%`).order('title').limit(12);
      if (user!.role === 'lecturer') q = q.eq('lecturer_id', user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return data as { id: string; title: string; code: string }[];
    },
  });
  const go = (path: string) => { onOpenChange(false); navigate(path); };
  return <CommandDialog open={open} onOpenChange={onOpenChange}>
    <DialogTitle className="sr-only">Search your workspace</DialogTitle>
    <DialogDescription className="sr-only">Search pages available to your current role. Use arrow keys to choose a result and Enter to open it.</DialogDescription>
    <CommandInput value={query} onValueChange={setQuery} aria-label="Search your workspace" placeholder={canSearchCourses ? 'Search your pages and courses…' : 'Search your workspace pages…'} />
    <CommandList>
      <CommandEmpty>No matching pages or courses. Try a different title.</CommandEmpty>
      {canSearchCourses && term.length >= 2 && <div className="px-3 py-2 text-sm" role={records.isError ? 'alert' : 'status'}>
        {records.isFetching ? 'Searching your courses…' : records.isError ? 'Course search failed. Please try again.' : `${records.data?.length || 0} matching courses`}
        {records.isError && <button className="ml-2 underline" onClick={() => records.refetch()}>Retry</button>}
      </div>}
      {canSearchCourses && records.data && term === query.trim() && <CommandGroup heading="Your courses">
        {records.data.map(m => <CommandItem key={m.id} value={`${m.title} ${m.code}`} onSelect={() => go(`/${user!.role}/module?module=${encodeURIComponent(m.id)}`)}>
          <span>{m.title}<span className="ml-2 text-muted-foreground">{m.code}</span></span>
        </CommandItem>)}
      </CommandGroup>}
      <CommandGroup heading="Your pages">{pages.map(item => <CommandItem key={item.path} value={`${item.label} ${item.section}`} onSelect={() => go(item.path)}>
        <item.icon className="mr-3 h-4 w-4 shrink-0" aria-hidden="true" /><span>{item.label}<span className="block text-xs text-muted-foreground">{item.section}</span></span>
      </CommandItem>)}</CommandGroup>
    </CommandList>
    <p className="border-t px-4 py-3 text-xs text-muted-foreground">↑ ↓ Choose · Enter Open · Esc Close</p>
  </CommandDialog>;
}
