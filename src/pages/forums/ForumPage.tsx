import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MessageSquare, Plus, Pin, Lock, ArrowLeft, ThumbsUp, CheckCircle2, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Thread {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_name: string;
  module_id: string | null;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  last_activity_at: string;
  created_at: string;
}

interface Reply {
  id: string;
  thread_id: string;
  author_id: string;
  author_name: string;
  content: string;
  is_solution: boolean;
  upvotes: number;
  created_at: string;
}

export default function ForumPage() {
  const { user } = useAuth();
  const isStaff = ['lecturer', 'centre_director', 'programme_leader', 'superadmin'].includes(user?.role || '');

  const [threads, setThreads] = useState<Thread[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('all');

  const [form, setForm] = useState({ title: '', content: '', module_id: '' });

  useEffect(() => {
    fetchThreads();
    supabase.from('modules').select('*').order('title').then(({ data }) => { if (data) setModules(data); });
  }, [user]);

  const fetchThreads = async () => {
    const { data } = await supabase.from('forum_threads').select('*').order('is_pinned', { ascending: false }).order('last_activity_at', { ascending: false });
    if (data) setThreads(data as any);
  };

  const createThread = async () => {
    if (!form.title || !form.content) { toast.error('Title and content required'); return; }
    const profile = await supabase.from('profiles').select('tenant_id').eq('user_id', user!.id).single();
    const { error } = await supabase.from('forum_threads').insert({
      title: form.title,
      content: form.content,
      module_id: form.module_id || null,
      author_id: user!.id,
      author_name: user!.name,
      tenant_id: profile.data?.tenant_id,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Thread created');
    setShowCreate(false);
    setForm({ title: '', content: '', module_id: '' });
    fetchThreads();
  };

  const openThread = async (thread: Thread) => {
    setActiveThread(thread);
    const { data } = await supabase.from('forum_replies').select('*').eq('thread_id', thread.id).order('created_at');
    setReplies((data as any) || []);
  };

  const postReply = async () => {
    if (!replyContent.trim() || !activeThread) return;
    const { error } = await supabase.from('forum_replies').insert({
      thread_id: activeThread.id,
      author_id: user!.id,
      author_name: user!.name,
      content: replyContent,
    } as any);
    if (error) { toast.error(error.message); return; }
    setReplyContent('');
    openThread(activeThread);
  };

  const togglePin = async (thread: Thread) => {
    await supabase.from('forum_threads').update({ is_pinned: !thread.is_pinned } as any).eq('id', thread.id);
    fetchThreads();
  };

  const toggleLock = async (thread: Thread) => {
    await supabase.from('forum_threads').update({ is_locked: !thread.is_locked } as any).eq('id', thread.id);
    setActiveThread({ ...thread, is_locked: !thread.is_locked });
    fetchThreads();
  };

  const markSolution = async (reply: Reply) => {
    await supabase.from('forum_replies').update({ is_solution: !reply.is_solution } as any).eq('id', reply.id);
    if (activeThread) openThread(activeThread);
  };

  const modMap: Record<string, any> = {};
  modules.forEach(m => { modMap[m.id] = m; });

  const filtered = threads.filter(t => {
    if (filterModule !== 'all' && t.module_id !== filterModule) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  // Thread detail view
  if (activeThread) {
    return (
      <DashboardLayout title="Discussion" subtitle={activeThread.title}>
        <div className="max-w-3xl mx-auto space-y-4">
          <Button variant="outline" size="sm" onClick={() => setActiveThread(null)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>

          <div className="surface-card p-5">
            <div className="flex items-center gap-2 mb-2">
              {activeThread.is_pinned && <Pin className="w-3.5 h-3.5 text-primary" />}
              {activeThread.is_locked && <Lock className="w-3.5 h-3.5 text-warning" />}
              {activeThread.module_id && (
                <span className="text-[10px] font-bold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {modMap[activeThread.module_id]?.title || ''}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold mb-2">{activeThread.title}</h2>
            <p className="text-sm text-foreground whitespace-pre-wrap">{activeThread.content}</p>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">{activeThread.author_name} · {timeAgo(activeThread.created_at)}</p>
              {isStaff && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => togglePin(activeThread)}>
                    <Pin className="w-3.5 h-3.5 mr-1" /> {activeThread.is_pinned ? 'Unpin' : 'Pin'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleLock(activeThread)}>
                    <Lock className="w-3.5 h-3.5 mr-1" /> {activeThread.is_locked ? 'Unlock' : 'Lock'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <h3 className="text-sm font-semibold">{replies.length} Replies</h3>

          {replies.map(r => (
            <div key={r.id} className={`surface-card p-4 ${r.is_solution ? 'border-success/30 bg-success/5' : ''}`}>
              {r.is_solution && (
                <div className="flex items-center gap-1 text-success text-xs font-medium mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Marked as solution
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{r.content}</p>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">{r.author_name} · {timeAgo(r.created_at)}</p>
                {isStaff && (
                  <Button variant="ghost" size="sm" onClick={() => markSolution(r)}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {r.is_solution ? 'Unmark' : 'Solution'}
                  </Button>
                )}
              </div>
            </div>
          ))}

          {!activeThread.is_locked ? (
            <div className="surface-card p-4 space-y-3">
              <Textarea value={replyContent} onChange={e => setReplyContent(e.target.value)} placeholder="Write your reply..." rows={3} />
              <Button onClick={postReply} disabled={!replyContent.trim()}>Post Reply</Button>
            </div>
          ) : (
            <div className="surface-card p-4 text-center text-muted-foreground text-sm">
              <Lock className="w-4 h-4 inline mr-1" /> This thread is locked
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Discussion Forums" subtitle="Ask questions and collaborate with peers">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-1 w-full sm:w-auto">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search threads..." className="pl-9" />
            </div>
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All modules" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {modules.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Thread</Button>
        </div>

        {filtered.length === 0 ? (
          <div className="surface-card p-12 text-center">
            <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold mb-1">No discussions yet</p>
            <p className="text-xs text-muted-foreground">Start the first discussion thread</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(thread => (
              <div key={thread.id} onClick={() => openThread(thread)}
                className="surface-card p-4 hover:shadow-md transition-all cursor-pointer flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {thread.is_pinned && <Pin className="w-3 h-3 text-primary shrink-0" />}
                    {thread.is_locked && <Lock className="w-3 h-3 text-warning shrink-0" />}
                    <h3 className="text-sm font-semibold truncate">{thread.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{thread.author_name}</span>
                    <span>·</span>
                    {thread.module_id && <span className="text-primary">{modMap[thread.module_id]?.title}</span>}
                    {thread.module_id && <span>·</span>}
                    <span>{timeAgo(thread.last_activity_at)}</span>
                  </div>
                </div>
                <div className="text-center shrink-0">
                  <p className="text-sm font-bold">{thread.reply_count}</p>
                  <p className="text-[10px] text-muted-foreground">replies</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Discussion Thread</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="What's your question?" /></div>
            <div>
              <Label>Module (optional)</Label>
              <Select value={form.module_id} onValueChange={v => setForm(p => ({ ...p, module_id: v }))}>
                <SelectTrigger><SelectValue placeholder="General discussion" /></SelectTrigger>
                <SelectContent>
                  {modules.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Content *</Label><Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={5} placeholder="Describe your question or topic..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createThread}>Create Thread</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
