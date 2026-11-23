import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Hand, Lock, Maximize2, Play, Radio, Send, Square, Unlock, X } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { TECH_EXERCISES, TECH_TRACKS, exerciseById } from '@/data/labs/techLabCatalogue';
import { DRILL_SENTENCES, SPEAKING_PROMPTS, promptById, sentenceById } from '@/data/labs/languageLabCatalogue';
import { recordingUrl, type Attempt, type Broadcast, type LabKind, type LiveSession, type Participant } from '@/lib/labs/labApi';
import type { Json } from '@/integrations/supabase/types';

const SESSION_COLUMNS = 'id,kind,title,join_code,status,activity_id,activity_revision,broadcast,locked,created_at,created_by';
const studentPath = (kind: LabKind) => (kind === 'tech' ? '/labs/tech' : '/labs/language');
const online = (iso: string) => Date.now() - Date.parse(iso) < 45000;
const activityName = (id: string | null) => {
  if (!id) return '—';
  const [mode, item] = id.includes(':') ? id.split(':') : ['', id];
  return exerciseById(id)?.title || sentenceById(item)?.text || promptById(item)?.prompt?.slice(0, 60) || (mode ? `${mode}: ${item}` : id);
};

export default function LabTeachingConsole() {
  const { sessionId } = useParams();
  return sessionId ? <SessionMonitor sessionId={sessionId} /> : <SessionList />;
}

function SessionList() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<LiveSession[] | null>(null);
  const [error, setError] = useState('');
  const [kind, setKind] = useState<LabKind>('tech');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.from('interactive_lab_sessions').select(SESSION_COLUMNS).order('created_at', { ascending: false }).limit(30)
      .then(({ data, error: e }) => { if (e) setError('Lab sessions could not be loaded.'); else setSessions((data || []) as unknown as LiveSession[]); });
  }, []);
  const open = async () => {
    if (title.trim().length < 3 || busy) return;
    setBusy(true);
    const { data, error: e } = await supabase.rpc('open_interactive_lab', { p_kind: kind, p_title: title.trim() });
    setBusy(false);
    if (e || !data) { toast.error(e?.message || 'Could not open the session.'); return; }
    navigate(`/labs/teach/${(data as { id: string }).id}`);
  };
  const liveRows = sessions?.filter(s => s.status === 'live') || [];
  const past = sessions?.filter(s => s.status === 'ended').slice(0, 10) || [];
  return (
    <DashboardLayout title="Run a live lab" subtitle="Open a tech or language lab for your class. Students join with a code from the classroom or from home, and you see everyone’s progress here.">
      <section className="mb-6 rounded-xl border bg-card p-4 sm:p-5" aria-label="Open a new session">
        <h2 className="font-semibold">Open a new session</h2>
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); void open(); }}>
          <fieldset className="flex gap-2" aria-label="Lab type">
            {(['tech', 'language'] as const).map(k => <Button key={k} type="button" variant={kind === k ? 'default' : 'outline'} aria-pressed={kind === k} className="min-h-11" onClick={() => setKind(k)}>{k === 'tech' ? 'Tech lab' : 'Language lab'}</Button>)}
          </fieldset>
          <label className="min-w-0 flex-1 basis-64 text-sm font-medium">Session title
            <Input className="mt-1 h-11" maxLength={140} value={title} onChange={e => setTitle(e.target.value)} placeholder={kind === 'tech' ? 'e.g. L4 Computing — Python loops' : 'e.g. IELTS group B — speaking Part 2'} />
          </label>
          <Button type="submit" className="min-h-11" disabled={busy || title.trim().length < 3}><Radio className="mr-2 size-4" />{busy ? 'Opening…' : 'Open session'}</Button>
        </form>
      </section>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!sessions && !error && <p role="status">Loading sessions…</p>}
      {sessions && <>
        <h2 className="mb-2 font-semibold">Live now</h2>
        {liveRows.length ? <ul className="mb-6 grid gap-3 md:grid-cols-2">{liveRows.map(s => <li key={s.id}><Link to={`/labs/teach/${s.id}`} className="block rounded-xl border bg-card p-4 hover:border-primary">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{s.kind === 'tech' ? 'Tech lab' : 'Language lab'} · code {s.join_code}</p>
          <p className="mt-1 font-semibold">{s.title}</p>
          <p className="text-sm text-muted-foreground">Opened {new Date(s.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </Link></li>)}</ul> : <p className="mb-6 text-sm text-muted-foreground">No live sessions at your centre.</p>}
        {past.length > 0 && <><h2 className="mb-2 font-semibold">Recent sessions</h2>
          <ul className="divide-y rounded-xl border bg-card">{past.map(s => <li key={s.id}><Link to={`/labs/teach/${s.id}`} className="flex flex-wrap justify-between gap-2 p-3 text-sm hover:bg-accent"><span className="font-medium">{s.title}</span><span className="text-muted-foreground">{s.kind === 'tech' ? 'Tech' : 'Language'} · {new Date(s.created_at).toLocaleDateString('en-GB')}</span></Link></li>)}</ul></>}
      </>}
    </DashboardLayout>
  );
}

function SessionMonitor({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [people, setPeople] = useState<Participant[]>([]);
  const [attempts, setAttempts] = useState<(Attempt & { tenant_id?: string })[]>([]);
  const [error, setError] = useState('');
  const [projector, setProjector] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exercise, setExercise] = useState(TECH_EXERCISES[0].id);
  const [mode, setMode] = useState<'repeat' | 'dictation' | 'speaking'>('repeat');
  const [item, setItem] = useState(DRILL_SENTENCES[0].id);
  const [rate, setRate] = useState(0.95);

  const load = useCallback(async () => {
    const [s, p, a] = await Promise.all([
      supabase.from('interactive_lab_sessions').select(SESSION_COLUMNS).eq('id', sessionId).maybeSingle(),
      supabase.from('interactive_lab_participants').select('*').eq('session_id', sessionId).order('display_name'),
      supabase.from('interactive_lab_attempts').select('id,user_id,session_id,lab_kind,activity_id,content,score,passed,result,audio_path,teacher_feedback,feedback_at,created_at').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(200),
    ]);
    if (s.error || !s.data) { setError(s.error ? 'Session could not be loaded.' : 'Session not found or not at your centre.'); return; }
    setError(''); setSession(s.data as unknown as LiveSession);
    if (!p.error) setPeople((p.data || []) as Participant[]);
    if (!a.error) setAttempts((a.data || []) as unknown as Attempt[]);
  }, [sessionId]);
  useEffect(() => { void load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [load]);

  const update = async (patch: Record<string, unknown>, ok?: string) => {
    if (!session || busy) return;
    setBusy(true);
    const { error: e } = await supabase.from('interactive_lab_sessions').update(patch).eq('id', session.id);
    setBusy(false);
    if (e) { toast.error('That change was not saved. Try again.'); return; }
    if (ok) toast.success(ok);
    void load();
  };
  const b: Broadcast = session?.broadcast || {};
  const sendTech = () => update({ activity_id: exercise, activity_revision: (session?.activity_revision || 0) + 1 }, 'Sent to every student’s screen');
  const sendLanguage = () => update({ broadcast: { mode, item_id: item, revision: (b.revision || 0) + 1, play_revision: b.play_revision || 0, rate } as unknown as Json, activity_id: `${mode}:${item}`, activity_revision: (session?.activity_revision || 0) + 1 }, 'Sent to every student');
  const playAll = () => update({ broadcast: { ...b, rate, play_revision: (b.play_revision || 0) + 1 } as unknown as Json }, 'Playing on every device with class audio on');
  const lowerHand = async (p: Participant) => { const { error: e } = await supabase.from('interactive_lab_participants').update({ hand_raised: false, status: 'working' }).eq('id', p.id); if (e) toast.error('Could not lower the hand.'); else void load(); };

  const names = useMemo(() => new Map(people.map(p => [p.user_id, p.display_name])), [people]);
  const currentId = session?.activity_id || null;
  const currentStats = useMemo(() => {
    if (!currentId) return null;
    const rows = attempts.filter(a => a.activity_id === currentId);
    const users = new Set(rows.map(r => r.user_id));
    const passed = new Set(rows.filter(r => r.passed).map(r => r.user_id));
    return { tried: users.size, passed: passed.size };
  }, [attempts, currentId]);

  if (error) return <DashboardLayout title="Live lab"><p role="alert">{error}</p><Button asChild variant="outline" className="mt-3"><Link to="/labs/teach">All sessions</Link></Button></DashboardLayout>;
  if (!session) return <DashboardLayout title="Live lab"><p role="status">Loading session…</p></DashboardLayout>;
  const joinUrl = `${window.location.origin}${studentPath(session.kind)}?code=${session.join_code}`;
  const ended = session.status === 'ended';
  const hands = people.filter(p => p.hand_raised);

  return (
    <DashboardLayout title={session.title} subtitle={`${session.kind === 'tech' ? 'Tech lab' : 'Language lab'} · ${ended ? 'ended' : 'live'} · ${people.length} joined`}
      actions={<Button asChild variant="ghost" className="min-h-11"><Link to="/labs/teach"><ArrowLeft className="mr-2 size-4" />All sessions</Link></Button>}>
      {projector && <div role="dialog" aria-label="Join code" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background p-6 text-center">
        <p className="text-2xl">Go to <strong>{window.location.host}{studentPath(session.kind)}</strong> and enter</p>
        <p className="font-mono text-[18vw] font-bold leading-none tracking-widest sm:text-[12vw]">{session.join_code}</p>
        <Button variant="outline" className="min-h-11" onClick={() => setProjector(false)}><X className="mr-2 size-4" />Close</Button>
      </div>}

      <section className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Join code</p>
          <p className="font-mono text-4xl font-bold tracking-widest">{session.join_code}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" className="min-h-11" onClick={() => setProjector(true)}><Maximize2 className="mr-2 size-4" />Show on projector</Button>
            <Button variant="outline" className="min-h-11" onClick={() => navigator.clipboard.writeText(joinUrl).then(() => toast.success('Join link copied — share it with remote students'), () => toast.error('Copy failed'))}><Copy className="mr-2 size-4" />Copy join link</Button>
          </div>
          {!ended && <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => void update({ locked: !session.locked }, session.locked ? 'Joining reopened' : 'Joining closed')}>{session.locked ? <><Unlock className="mr-2 size-4" />Allow joining</> : <><Lock className="mr-2 size-4" />Close joining</>}</Button>
            <Button variant="destructive" className="min-h-11" disabled={busy} onClick={() => { if (confirm('End this session for everyone? Saved work is kept.')) void update({ status: 'ended' }, 'Session ended'); }}><Square className="mr-2 size-4" />End session</Button>
          </div>}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Send an activity to the class</h2>
          {session.kind === 'tech' ? <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="min-w-0 flex-1 basis-64 text-sm font-medium">Exercise
              <select className="mt-1 block h-11 w-full rounded-lg border bg-background px-3" value={exercise} onChange={e => setExercise(e.target.value)} disabled={ended}>
                {TECH_TRACKS.map(t => <optgroup key={t.id} label={t.title}>{TECH_EXERCISES.filter(e => e.track === t.id).map(e => <option key={e.id} value={e.id}>{e.title} ({e.level})</option>)}</optgroup>)}
              </select>
            </label>
            <Button className="min-h-11" disabled={busy || ended} onClick={() => void sendTech()}><Send className="mr-2 size-4" />Send to all screens</Button>
          </div> : <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm font-medium">Activity
                <select className="mt-1 block h-11 rounded-lg border bg-background px-3" value={mode} disabled={ended} onChange={e => { const m = e.target.value as typeof mode; setMode(m); setItem(m === 'speaking' ? SPEAKING_PROMPTS[0].id : DRILL_SENTENCES[0].id); }}>
                  <option value="repeat">Listen & repeat</option><option value="dictation">Dictation</option><option value="speaking">Speaking task</option>
                </select>
              </label>
              <label className="min-w-0 flex-1 basis-64 text-sm font-medium">{mode === 'speaking' ? 'Prompt' : 'Sentence'}
                <select className="mt-1 block h-11 w-full rounded-lg border bg-background px-3" value={item} disabled={ended} onChange={e => setItem(e.target.value)}>
                  {mode === 'speaking' ? SPEAKING_PROMPTS.map(p => <option key={p.id} value={p.id}>{p.language.toUpperCase()} · {p.part} — {p.prompt.slice(0, 70)}</option>)
                    : DRILL_SENTENCES.map(s => <option key={s.id} value={s.id}>{s.language.toUpperCase()} · {s.level} — {s.text}</option>)}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Button className="min-h-11" disabled={busy || ended} onClick={() => void sendLanguage()}><Send className="mr-2 size-4" />Send to all students</Button>
              <label className="text-sm font-medium">Speed
                <select className="mt-1 block h-11 rounded-lg border bg-background px-3" value={rate} onChange={e => setRate(Number(e.target.value))}><option value={0.65}>Slow</option><option value={0.95}>Normal</option><option value={1.1}>Fast</option></select>
              </label>
              <Button variant="outline" className="min-h-11" disabled={busy || ended || !b.item_id} onClick={() => void playAll()}><Play className="mr-2 size-4" />Play on every device</Button>
            </div>
            <p className="text-xs text-muted-foreground">Audio is spoken by each student’s own device and headphones, in the classroom or at home.</p>
          </div>}
          {currentId && <p className="mt-3 text-sm" role="status">Now on screens: <strong>{activityName(currentId)}</strong>{currentStats && <> · {currentStats.tried} tried · {currentStats.passed} passed</>}</p>}
        </div>
      </section>

      {hands.length > 0 && <section className="mb-5 rounded-xl border border-primary/50 bg-primary/5 p-4" aria-label="Raised hands">
        <h2 className="flex items-center gap-2 font-semibold"><Hand className="size-5" />{hands.length} {hands.length === 1 ? 'student needs' : 'students need'} help</h2>
        <ul className="mt-2 flex flex-wrap gap-2">{hands.map(p => <li key={p.id}><Button variant="outline" className="min-h-11" onClick={() => void lowerHand(p)}>{p.display_name} ({p.location === 'in_class' ? 'in class' : 'remote'}) · lower hand</Button></li>)}</ul>
      </section>}

      <section className="mb-5 rounded-xl border bg-card" aria-label="Students">
        <h2 className="border-b p-4 font-semibold">Students ({people.length})</h2>
        {!people.length ? <p className="p-4 text-sm text-muted-foreground">No one has joined yet. Share the code {session.join_code}.</p> : <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-muted-foreground"><tr><th className="p-3 font-medium">Student</th><th className="p-3 font-medium">Joined from</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Working on</th><th className="p-3 font-medium">Best on current</th></tr></thead>
            <tbody>{people.map(p => { const mine = attempts.filter(a => a.user_id === p.user_id && a.activity_id === currentId); const best = mine.length ? Math.max(...mine.map(a => Number(a.score ?? 0))) : null; return (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium"><span className={`mr-2 inline-block size-2 rounded-full ${online(p.last_seen) ? 'bg-success' : 'bg-muted-foreground/40'}`} aria-label={online(p.last_seen) ? 'online' : 'offline'} />{p.display_name}</td>
                <td className="p-3">{p.location === 'in_class' ? 'Classroom' : 'Remote'}</td>
                <td className="p-3">{p.hand_raised ? <Badge>Hand raised</Badge> : <Badge variant="outline">{p.status === 'done' ? 'Done' : p.status === 'stuck' ? 'Stuck' : online(p.last_seen) ? 'Working' : 'Away'}</Badge>}</td>
                <td className="p-3">{activityName(p.current_activity)}</td>
                <td className="p-3">{best === null ? '—' : `${best}%`}</td>
              </tr>); })}</tbody>
          </table>
        </div>}
      </section>

      <section className="rounded-xl border bg-card" aria-label="Student work">
        <h2 className="border-b p-4 font-semibold">Submitted work ({attempts.length})</h2>
        {!attempts.length ? <p className="p-4 text-sm text-muted-foreground">Checked code, prompts, dictations and recordings appear here as students submit them.</p>
          : <ul className="divide-y">{attempts.map(a => <WorkRow key={a.id} attempt={a} name={names.get(a.user_id) || 'Student'} onSaved={load} />)}</ul>}
      </section>
    </DashboardLayout>
  );
}

function WorkRow({ attempt: a, name, onSaved }: { attempt: Attempt; name: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(a.teacher_feedback || '');
  const [audio, setAudio] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('interactive_lab_attempts').update({ teacher_feedback: note.trim() || null }).eq('id', a.id);
    setSaving(false);
    if (error) toast.error('Feedback not saved.'); else { toast.success(`Feedback sent to ${name}`); onSaved(); }
  };
  return <li className="p-4 text-sm">
    <button type="button" className="flex w-full flex-wrap items-center gap-2 text-left" aria-expanded={open} onClick={() => setOpen(o => !o)}>
      <span className="font-semibold">{name}</span><span className="text-muted-foreground">{activityName(a.activity_id)}</span>
      <span className="ml-auto flex gap-2">{a.score !== null && <Badge variant={a.passed ? 'default' : 'outline'}>{Number(a.score)}%</Badge>}{a.teacher_feedback && <Badge variant="secondary">Feedback given</Badge>}<span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span></span>
    </button>
    {open && <div className="mt-3 space-y-3">
      {a.content && <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-secondary/50 p-3 font-mono text-xs">{a.content}</pre>}
      {typeof a.result?.target === 'string' && <p><span className="text-muted-foreground">Target:</span> {a.result.target}</p>}
      {typeof a.result?.overall === 'number' && <p><span className="text-muted-foreground">AI practice estimate:</span> overall {a.result.overall as number}</p>}
      {a.audio_path && (audio ? <audio controls src={audio} className="max-w-full" aria-label={`${name}'s recording`} />
        : <Button variant="outline" className="min-h-11" onClick={async () => { try { setAudio(await recordingUrl(a.audio_path!)); } catch { toast.error('Recording unavailable.'); } }}><Play className="mr-2 size-4" />Play recording</Button>)}
      <label className="block font-medium">Feedback to {name}
        <Textarea className="mt-1" rows={2} maxLength={3000} value={note} onChange={e => setNote(e.target.value)} placeholder="Short, specific feedback the student will see in their lab history" />
      </label>
      <Button className="min-h-11" disabled={saving || note.trim() === (a.teacher_feedback || '')} onClick={() => void save()}>{saving ? 'Saving…' : 'Send feedback'}</Button>
    </div>}
  </li>;
}
