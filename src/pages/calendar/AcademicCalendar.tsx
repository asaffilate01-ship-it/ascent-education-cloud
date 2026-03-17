import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, ChevronLeft, ChevronRight, MapPin, Clock, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const EVENT_TYPES = [
  { value: 'event', label: 'Event', color: 'bg-primary' },
  { value: 'holiday', label: 'Holiday', color: 'bg-destructive' },
  { value: 'exam', label: 'Exam', color: 'bg-warning' },
  { value: 'deadline', label: 'Deadline', color: 'bg-accent' },
  { value: 'residential', label: 'Residential', color: 'bg-success' },
  { value: 'meeting', label: 'Meeting', color: 'bg-secondary' },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AcademicCalendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ title: '', description: '', event_type: 'event', start_date: '', end_date: '', all_day: true, location: '', color: '#3b82f6' });

  const { data: events, refetch } = useSupabaseQuery('academic_events' as any);
  const isDirector = user?.role === 'centre_director' || user?.role === 'programme_leader' || user?.role === 'superadmin';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0

  const calendarDays = useMemo(() => {
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    // Previous month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    }
    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(year, month, d), isCurrentMonth: true });
    }
    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return days;
  }, [year, month, startDayOfWeek, lastDay]);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    return (events as any[]).filter(e => filter === 'all' || e.event_type === filter);
  }, [events, filter]);

  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter(e => {
      const start = new Date(e.start_date);
      const end = e.end_date ? new Date(e.end_date) : start;
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return d >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) && d <= new Date(end.getFullYear(), end.getMonth(), end.getDate());
    });
  };

  const getTypeColor = (type: string) => EVENT_TYPES.find(t => t.value === type)?.color || 'bg-primary';
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const handleSubmit = async () => {
    if (!form.title || !form.start_date) { toast.error('Title and start date required'); return; }
    const profile = await supabase.from('profiles').select('tenant_id').eq('user_id', user!.id).single();
    const { error } = await supabase.from('academic_events' as any).insert({
      ...form,
      tenant_id: (profile.data as any)?.tenant_id,
      created_by: user!.id,
      end_date: form.end_date || form.start_date,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Event added');
    setShowAdd(false);
    setForm({ title: '', description: '', event_type: 'event', start_date: '', end_date: '', all_day: true, location: '', color: '#3b82f6' });
    refetch();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('academic_events' as any).delete().eq('id', id);
    toast.success('Event deleted');
    refetch();
  };

  // Upcoming events list
  const upcoming = useMemo(() => {
    const now = new Date();
    return filteredEvents.filter(e => new Date(e.start_date) >= now).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()).slice(0, 8);
  }, [filteredEvents]);

  return (
    <DashboardLayout
      title="Academic Calendar"
      subtitle="Events, holidays, exams and deadlines"
      actions={
        isDirector && (
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> Add Event</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Calendar Event</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
                <div><Label>Type</Label>
                  <Select value={form.event_type} onValueChange={v => setForm(f => ({ ...f, event_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start Date *</Label><Input type="datetime-local" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                  <div><Label>End Date</Label><Input type="datetime-local" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                </div>
                <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
                <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <Button className="w-full" onClick={handleSubmit}>Save Event</Button>
              </div>
            </DialogContent>
          </Dialog>
        )
      }
    >
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3">
          <div className="surface-card p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 rounded-lg hover:bg-secondary transition-all"><ChevronLeft className="w-4 h-4" /></button>
              <h2 className="text-lg font-bold">{MONTHS[month]} {year}</h2>
              <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 rounded-lg hover:bg-secondary transition-all"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {DAYS.map(d => <div key={d} className="bg-secondary/50 p-2 text-center text-[10px] font-bold uppercase text-muted-foreground">{d}</div>)}
              {calendarDays.map((day, i) => {
                const dayEvents = getEventsForDate(day.date);
                return (
                  <div key={i} className={`bg-background min-h-[80px] p-1.5 ${!day.isCurrentMonth ? 'opacity-30' : ''} ${isToday(day.date) ? 'ring-2 ring-primary ring-inset' : ''}`}>
                    <span className={`text-xs font-semibold ${isToday(day.date) ? 'text-primary' : 'text-foreground'}`}>{day.date.getDate()}</span>
                    <div className="space-y-0.5 mt-1">
                      {dayEvents.slice(0, 3).map((ev: any) => (
                        <div key={ev.id} className={`${getTypeColor(ev.event_type)} text-primary-foreground text-[9px] font-medium px-1 py-0.5 rounded truncate cursor-pointer`} title={ev.title}>
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 3} more</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="surface-card p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Filter</h3>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="surface-card p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Upcoming</h3>
            {upcoming.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No upcoming events</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((ev: any) => (
                  <div key={ev.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-all group">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getTypeColor(ev.event_type)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{ev.title}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {new Date(ev.start_date).toLocaleDateString()}</p>
                      {ev.location && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> {ev.location}</p>}
                    </div>
                    {isDirector && (
                      <button onClick={() => handleDelete(ev.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all">
                        <X className="w-3 h-3 text-destructive" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface-card p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Legend</h3>
            <div className="space-y-2">
              {EVENT_TYPES.map(t => (
                <div key={t.value} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${t.color}`} />
                  <span className="text-xs">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
