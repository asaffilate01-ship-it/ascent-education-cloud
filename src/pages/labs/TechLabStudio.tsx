import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Bot, Brain, CheckCircle2, Code2, Database, Globe, LineChart, Loader2, ShieldCheck, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { TECH_EXERCISES, TECH_TRACKS, exerciseById, type TrackId } from '@/data/labs/techLabCatalogue';
import { callCoach, myAttempts, saveAttempt, useLiveLab, type Attempt } from '@/lib/labs/labApi';
import LiveLabBar from '@/components/labs/interactive/LiveLabBar';
import ExerciseWorkspace, { type CheckedWork } from '@/components/labs/interactive/ExerciseWorkspace';

const TRACK_ICONS: Record<TrackId, typeof Brain> = { ai: Brain, python: Terminal, web: Globe, javascript: Code2, sql: Database, data: LineChart, cyber: ShieldCheck };

export default function TechLabStudio() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const exerciseId = params.get('exercise');
  const track = (params.get('track') as TrackId) || 'ai';
  const view = params.get('view');
  const exercise = exerciseById(exerciseId);
  const live = useLiveLab('tech', !!user?.id);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loadError, setLoadError] = useState('');
  const lastRevision = useRef<number | null>(null);

  const go = useCallback((next: Record<string, string | null>) => setParams(prev => {
    const p = new URLSearchParams(prev);
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    return p;
  }), [setParams]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try { setAttempts(await myAttempts(user.id, 'tech')); setLoadError(''); } catch (e) { setLoadError(e instanceof Error ? e.message : 'Could not load your progress.'); }
  }, [user?.id]);
  useEffect(() => { void load(); }, [load]);

  // Follow the exercise the teacher pushes to the class.
  useEffect(() => {
    const s = live.session;
    if (!s || s.status !== 'live') return;
    if (lastRevision.current === null) { lastRevision.current = s.activity_revision; if (s.activity_id && !exerciseId) go({ exercise: s.activity_id, view: null }); return; }
    if (s.activity_revision !== lastRevision.current) {
      lastRevision.current = s.activity_revision;
      const target = exerciseById(s.activity_id);
      if (target) { go({ exercise: target.id, track: target.track, view: null }); toast.info(`Your teacher opened “${target.title}”`); }
    }
  }, [live.session, exerciseId, go]);
  useEffect(() => { void live.sendPresence({ activity: exerciseId }); }, [exerciseId, live.sendPresence]); // eslint-disable-line react-hooks/exhaustive-deps

  const passedIds = useMemo(() => new Set(attempts.filter(a => a.passed).map(a => a.activity_id)), [attempts]);
  const best = useCallback((id: string) => Math.max(-1, ...attempts.filter(a => a.activity_id === id).map(a => Number(a.score ?? 0))), [attempts]);

  const onChecked = useCallback(async (work: CheckedWork) => {
    if (!user?.id || !user.tenantId || !exercise) return;
    try {
      await saveAttempt({ userId: user.id, tenantId: user.tenantId, sessionId: live.session?.status === 'live' ? live.session.id : null, kind: 'tech', activityId: exercise.id, content: work.content, score: work.score, passed: work.passed, result: work.result });
      if (work.passed) void live.sendPresence({ status: 'done' });
      void load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save your work.'); }
  }, [user?.id, user?.tenantId, exercise, live, load]);

  const feedback = attempts.filter(a => a.teacher_feedback).slice(0, 5);
  const done = TECH_EXERCISES.filter(e => passedIds.has(e.id)).length;

  return (
    <DashboardLayout title="Tech Lab" subtitle="AI, coding, web, databases, data and cyber security — marked instantly in your browser, in class or at home.">
      <LiveLabBar live={live} label="tech lab" />
      {exercise ? (
        <>
          <Button variant="ghost" className="mb-3 min-h-11" onClick={() => go({ exercise: null, track: exercise.track })}><ArrowLeft className="mr-2 size-4" />All {TECH_TRACKS.find(t => t.id === exercise.track)?.title} exercises</Button>
          <ExerciseWorkspace key={exercise.id} exercise={exercise} onChecked={onChecked} />
          <AttemptHistory attempts={attempts.filter(a => a.activity_id === exercise.id)} />
        </>
      ) : view === 'playground' ? (
        <>
          <Button variant="ghost" className="mb-3 min-h-11" onClick={() => go({ view: null })}><ArrowLeft className="mr-2 size-4" />Back to tracks</Button>
          <AiPlayground />
        </>
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">Exercises passed</p><p className="text-2xl font-bold">{done} <span className="text-base font-normal text-muted-foreground">of {TECH_EXERCISES.length}</span></p></div>
            <button type="button" onClick={() => go({ view: 'playground' })} className="rounded-xl border bg-card p-4 text-left hover:bg-accent sm:col-span-2">
              <p className="flex items-center gap-2 font-semibold"><Bot className="size-5" />AI playground</p>
              <p className="mt-1 text-sm text-muted-foreground">Try your own prompts and instructions with Lovable AI and see how wording changes the answer.</p>
            </button>
          </div>
          {loadError && <p role="alert" className="mb-4 text-sm text-destructive">{loadError}</p>}
          <nav aria-label="Lab tracks" className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {TECH_TRACKS.map(t => { const Icon = TRACK_ICONS[t.id]; return (
              <Button key={t.id} variant={t.id === track ? 'default' : 'outline'} aria-pressed={t.id === track} className="min-h-11 shrink-0" onClick={() => go({ track: t.id })}><Icon className="mr-2 size-4" />{t.title}</Button>
            ); })}
          </nav>
          {(() => { const t = TECH_TRACKS.find(x => x.id === track) || TECH_TRACKS[0]; return (
            <section aria-label={t.title}>
              <p className="text-sm text-muted-foreground">{t.summary} <span className="font-medium text-foreground">{t.skills}</span></p>
              <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {TECH_EXERCISES.filter(e => e.track === t.id).map(e => { const score = best(e.id); return (
                  <li key={e.id}>
                    <button type="button" onClick={() => go({ exercise: e.id })} className="flex h-full w-full flex-col rounded-xl border bg-card p-4 text-left hover:border-primary">
                      <span className="flex w-full items-start justify-between gap-2"><span className="font-semibold">{e.title}</span>{passedIds.has(e.id) && <CheckCircle2 className="size-5 shrink-0 text-success" aria-label="Passed" />}</span>
                      <span className="mt-2 line-clamp-2 text-sm text-muted-foreground">{e.brief}</span>
                      <span className="mt-auto flex flex-wrap gap-2 pt-3"><Badge variant="outline">{e.level}</Badge><Badge variant="outline">{e.runtime === 'prompt' ? 'AI prompt' : e.runtime === 'html' ? 'HTML/CSS' : e.runtime === 'sql' ? 'SQL' : e.runtime === 'python' ? 'Python' : 'JavaScript'}</Badge>{score >= 0 && <Badge variant="secondary">Best {score}%</Badge>}</span>
                    </button>
                  </li>
                ); })}
              </ul>
            </section>
          ); })()}
          {feedback.length > 0 && <section className="mt-6 rounded-xl border bg-card p-4" aria-label="Teacher feedback">
            <h2 className="font-semibold">Latest feedback from your teacher</h2>
            <ul className="mt-2 space-y-2">{feedback.map(a => <li key={a.id} className="rounded-lg bg-secondary/50 p-3 text-sm"><p className="font-medium">{exerciseById(a.activity_id)?.title || a.activity_id}</p><p className="mt-1 whitespace-pre-wrap">{a.teacher_feedback}</p></li>)}</ul>
          </section>}
          <p className="mt-6 text-xs text-muted-foreground">Code runs in a locked-down sandbox on your device. Python downloads once (about 10 MB), then runs without using data. Your checked work is saved so your teacher can see it. AI hints and marking use Lovable AI and are limited each day.</p>
        </>
      )}
    </DashboardLayout>
  );
}

function AttemptHistory({ attempts }: { attempts: Attempt[] }) {
  if (!attempts.length) return null;
  return (
    <section className="mt-6 rounded-xl border bg-card p-4" aria-label="Your attempts">
      <h3 className="font-semibold">Your saved attempts</h3>
      <ul className="mt-2 divide-y">{attempts.slice(0, 8).map(a => <li key={a.id} className="py-2 text-sm">
        <span className="font-medium">{a.passed ? 'Passed' : 'Not yet'} · {Number(a.score ?? 0)}%</span>
        <span className="ml-2 text-muted-foreground">{new Date(a.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}{a.session_id ? ' · live class' : ''}</span>
        {a.teacher_feedback && <p className="mt-1 rounded bg-secondary/60 p-2"><strong>Teacher:</strong> {a.teacher_feedback}</p>}
      </li>)}</ul>
    </section>
  );
}

function AiPlayground() {
  const [system, setSystem] = useState('You are a friendly tutor for students in Pakistan. Use UK English.');
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <section className="space-y-4" aria-label="AI playground">
      <div className="rounded-xl border bg-card p-4">
        <h2 className="text-xl font-semibold">AI playground</h2>
        <p className="mt-1 text-sm text-muted-foreground">Change the instructions and the prompt to see how an AI model responds. Don’t share personal information.</p>
        <label className="mt-4 block text-sm font-medium">Instructions (how the AI should behave)
          <Textarea className="mt-1" rows={3} maxLength={2000} value={system} onChange={e => setSystem(e.target.value)} />
        </label>
        <label className="mt-3 block text-sm font-medium">Your prompt
          <Textarea className="mt-1" rows={5} maxLength={4000} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g. Explain what a neural network is using a cricket example." />
        </label>
        <Button className="mt-3 min-h-11" disabled={busy || prompt.trim().length < 3} onClick={async () => {
          setBusy(true); setOutput('');
          try { setOutput((await callCoach<{ output: string }>({ action: 'playground', system, prompt })).output); }
          catch (e) { toast.error(e instanceof Error ? e.message : 'The AI is unavailable.'); }
          finally { setBusy(false); }
        }}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Bot className="mr-2 size-4" />}Send to AI</Button>
      </div>
      {output && <div role="status" className="whitespace-pre-wrap rounded-xl border bg-card p-4 text-sm">{output}</div>}
    </section>
  );
}
