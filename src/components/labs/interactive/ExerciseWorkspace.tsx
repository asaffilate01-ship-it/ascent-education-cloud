import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Lightbulb, Loader2, Play, RotateCcw, Send, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isolatedRunner } from '@/lib/coding/isolatedRunner';
import type { TechExercise } from '@/data/labs/techLabCatalogue';
import { buildMarkedRun, parseMarkedOutput, runHtmlChecks, scoreChecks, type CheckResult } from '@/lib/labs/grading';
import { callCoach } from '@/lib/labs/labApi';

const draftKey = (id: string) => `unipathway-techlab-draft-${id}`;
type PromptResult = { output: string; score: number; advice: string; criteria: { criterion: string; met: boolean; comment: string }[] };
export interface CheckedWork { content: string; score: number; passed: boolean; result: Record<string, unknown> }

export default function ExerciseWorkspace({ exercise, onChecked }: { exercise: TechExercise; onChecked: (work: CheckedWork) => Promise<void> | void }) {
  const [code, setCode] = useState(() => localStorage.getItem(draftKey(exercise.id)) ?? exercise.starter);
  const [output, setOutput] = useState('');
  const [checks, setChecks] = useState<CheckResult[] | null>(null);
  const [preview, setPreview] = useState(exercise.runtime === 'html' ? code : '');
  const [running, setRunning] = useState<'' | 'run' | 'check' | 'hint' | 'prompt'>('');
  const [hint, setHint] = useState('');
  const [promptResult, setPromptResult] = useState<PromptResult | null>(null);
  const [script, setScript] = useState('');
  const frame = useRef<HTMLIFrameElement>(null);
  const pending = useRef<{ token: string; marked: boolean } | null>(null);

  useEffect(() => { const t = setTimeout(() => localStorage.setItem(draftKey(exercise.id), code), 400); return () => clearTimeout(t); }, [code, exercise.id]);

  const finishMarked = useCallback(async (results: CheckResult[], content: string, extra: Record<string, unknown> = {}) => {
    setChecks(results);
    const { score, passed } = scoreChecks(results);
    await onChecked({ content, score, passed, result: { checks: results, ...extra } });
    if (passed) toast.success('All checks passed — well done!'); else toast.message(`${results.filter(r => r.passed).length} of ${results.length} checks passed. Keep going!`);
  }, [onChecked]);

  useEffect(() => {
    const receive = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || e.origin !== 'null') return;
      const data = e.data as { kind?: string; token?: string; output?: string; phase?: string } | null;
      const job = pending.current;
      if (!data || data.kind !== 'unipathway-code' || !job || data.token !== job.token) return;
      if (data.phase === 'running') { setOutput(job.marked ? 'Checking your work…' : 'Running…'); return; }
      if (data.phase !== 'done') return;
      pending.current = null; setScript('');
      const raw = String(data.output || '');
      if (!job.marked) { setOutput(parseMarkedOutput(raw, job.token).visible || '(no output)'); setRunning(''); return; }
      const parsed = parseMarkedOutput(raw, job.token);
      setOutput(parsed.visible || '(no output)');
      if (!parsed.results) {
        setChecks([{ label: 'Your code runs without errors', passed: false, detail: 'Your code stopped before the checks could run. Read the error in the output.' }]);
        void onChecked({ content: code, score: 0, passed: false, result: { error: raw.slice(-1500) } });
        setRunning(''); return;
      }
      void finishMarked(parsed.results, code).finally(() => setRunning(''));
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [code, finishMarked, onChecked]);

  const start = (plan: { language: 'python' | 'javascript'; code: string; packages: string[] }, marked: boolean, token: string) => {
    pending.current = { token, marked };
    setOutput(plan.language === 'python' ? 'Loading Python… the first run downloads it (about 10 MB).' : 'Starting…');
    setScript(isolatedRunner(plan.language, plan.code, '', token, plan.packages));
  };

  const run = () => {
    if (running) return;
    setHint(''); setChecks(null);
    if (exercise.runtime === 'html') { setPreview(code); return; }
    const token = crypto.randomUUID();
    setRunning('run');
    if (exercise.runtime === 'sql') { start(buildMarkedRun({ ...exercise, sql: { expected: [], ordered: true } }, code, token)!, false, token); return; }
    start({ language: exercise.runtime as 'python' | 'javascript', code, packages: [] }, false, token);
  };

  const check = async () => {
    if (running) return;
    setHint('');
    if (exercise.runtime === 'html') { setPreview(code); setRunning('check'); await finishMarked(runHtmlChecks(exercise, code), code); setRunning(''); return; }
    if (exercise.runtime === 'prompt') {
      if (code.trim().length < 10) { toast.error('Write a fuller prompt first (at least 10 characters).'); return; }
      setRunning('prompt'); setPromptResult(null);
      try {
        const r = await callCoach<PromptResult>({ action: 'prompt_task', task: exercise.prompt!.task, input: exercise.prompt!.input, rubric: exercise.prompt!.rubric, prompt: code });
        setPromptResult(r);
        const passed = r.score >= 70;
        await onChecked({ content: code, score: r.score, passed, result: { output: r.output, criteria: r.criteria, advice: r.advice } });
        if (passed) toast.success(`Score ${r.score}/100 — great prompt!`); else toast.message(`Score ${r.score}/100. Read the advice and try again.`);
      } catch (e) { toast.error(e instanceof Error ? e.message : 'The AI coach is unavailable.'); }
      finally { setRunning(''); }
      return;
    }
    const token = crypto.randomUUID();
    const plan = buildMarkedRun(exercise, code, token);
    if (!plan) return;
    setRunning('check'); setChecks(null);
    start(plan, true, token);
  };

  const askHint = async () => {
    if (running) return;
    setRunning('hint');
    try {
      const summary = checks ? checks.map(c => `${c.passed ? 'PASS' : 'FAIL'}: ${c.label}${c.detail ? ` (${c.detail})` : ''}`).join('\n') : '';
      const r = await callCoach<{ hint: string }>({ action: 'hint', title: exercise.title, brief: exercise.brief, code, output: `${output}\n${summary}`.slice(-3500) });
      setHint(r.hint);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'The AI coach is unavailable.'); }
    finally { setRunning(''); }
  };

  const stop = () => { pending.current = null; setScript(''); setRunning(''); setOutput('Stopped. Your code is still in the editor.'); };
  const isPrompt = exercise.runtime === 'prompt';
  const editorLabel = isPrompt ? 'Your prompt' : exercise.runtime === 'sql' ? 'Your SQL query' : exercise.runtime === 'html' ? 'Your HTML and CSS' : `Your ${exercise.runtime === 'python' ? 'Python' : 'JavaScript'} code`;

  return (
    <div className="space-y-4">
      {script && <iframe ref={frame} srcDoc={script} title="Isolated code runner" sandbox="allow-scripts" className="hidden" aria-hidden="true" />}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{exercise.level}</Badge><Badge variant="outline">About {exercise.minutes} min</Badge></div>
        <h2 className="mt-2 text-xl font-semibold">{exercise.title}</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{exercise.brief}</p>
        {isPrompt && exercise.prompt?.input && <details className="mt-3 rounded-lg bg-secondary/50 p-3 text-sm" open>
          <summary className="cursor-pointer font-medium">Text that is sent with your prompt</summary>
          <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{exercise.prompt.input}</p>
        </details>}
        {isPrompt && <div className="mt-3 text-sm"><p className="font-medium">Your prompt is marked on:</p><ul className="mt-1 list-disc pl-5 text-muted-foreground">{exercise.prompt?.rubric.map(r => <li key={r}>{r}</li>)}</ul></div>}
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="flex min-h-[320px] min-w-0 flex-col overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b bg-secondary/30 px-4 py-2">
            <span className="text-xs font-semibold">{editorLabel}</span>
            <button type="button" className="ml-auto inline-flex min-h-9 items-center gap-1 rounded px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => { if (confirm('Reset to the starting code? Your changes will be lost.')) { setCode(exercise.starter); setChecks(null); setOutput(''); } }}>
              <RotateCcw className="size-3.5" />Reset
            </button>
          </div>
          <textarea aria-label={editorLabel} value={code} onChange={e => setCode(e.target.value)} spellCheck={isPrompt}
            onKeyDown={e => { if (!isPrompt && e.key === 'Tab') { e.preventDefault(); const t = e.currentTarget, s = t.selectionStart; setCode(code.slice(0, s) + '    ' + code.slice(t.selectionEnd)); requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 4; }); } }}
            placeholder={isPrompt ? 'Write your prompt here…' : ''}
            className={`min-h-[280px] flex-1 resize-y bg-background p-4 text-sm leading-relaxed outline-none ${isPrompt ? '' : 'font-mono text-[13px]'}`} />
        </div>

        <div className="flex min-h-[320px] min-w-0 flex-col overflow-hidden rounded-xl border bg-card">
          <div className="border-b bg-secondary/30 px-4 py-2 text-xs font-semibold">{exercise.runtime === 'html' ? 'Page preview' : isPrompt ? 'What the AI produced' : 'Output'}</div>
          {exercise.runtime === 'html'
            ? <iframe srcDoc={preview} sandbox="allow-scripts" title="Page preview" className="min-h-[280px] flex-1 bg-background" />
            : isPrompt
              ? <div role="status" aria-live="polite" className="flex-1 whitespace-pre-wrap p-4 text-sm">{running === 'prompt' ? 'Sending your prompt to the AI and marking it…' : promptResult?.output || 'Press “Check my work” to send your prompt to the AI.'}</div>
              : <pre role="status" aria-live="polite" className="min-h-[280px] flex-1 overflow-auto whitespace-pre-wrap bg-background p-4 font-mono text-xs">{output || 'Press “Run” to try your code, or “Check my work” to mark it.'}</pre>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!isPrompt && <Button variant="outline" className="min-h-11" onClick={run} disabled={!!running}><Play className="mr-2 size-4" />Run</Button>}
        <Button className="min-h-11" onClick={() => void check()} disabled={!!running}>
          {running === 'check' || running === 'prompt' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}Check my work
        </Button>
        {!isPrompt && <Button variant="outline" className="min-h-11" onClick={() => void askHint()} disabled={!!running}>
          {running === 'hint' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Lightbulb className="mr-2 size-4" />}Ask the AI coach for a hint
        </Button>}
        {(running === 'run' || running === 'check') && exercise.runtime !== 'html' && <Button variant="ghost" className="min-h-11" onClick={stop}>Stop</Button>}
      </div>

      {hint && <div role="status" className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm"><p className="font-semibold">AI coach hint</p><p className="mt-1 whitespace-pre-wrap">{hint}</p></div>}

      {checks && <section aria-label="Check results" className="rounded-xl border bg-card p-4">
        <h3 className="font-semibold">Checks: {checks.filter(c => c.passed).length} of {checks.length} passed</h3>
        <ul className="mt-2 space-y-2">{checks.map((c, i) => <li key={i} className="flex gap-2 text-sm">
          {c.passed ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="Passed" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Not yet" />}
          <span>{c.label}{c.detail && <span className="block text-xs text-muted-foreground">{c.detail}</span>}</span></li>)}</ul>
      </section>}

      {promptResult && <section aria-label="Prompt marking" className="rounded-xl border bg-card p-4">
        <h3 className="font-semibold">Prompt score: {promptResult.score}/100 {promptResult.score >= 70 ? '— passed' : ''}</h3>
        <ul className="mt-2 space-y-2">{promptResult.criteria.map((c, i) => <li key={i} className="flex gap-2 text-sm">
          {c.met ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="Met" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Not met" />}
          <span><strong>{c.criterion}.</strong> {c.comment}</span></li>)}</ul>
        {promptResult.advice && <p className="mt-3 rounded-lg bg-secondary/60 p-3 text-sm"><strong>Next step:</strong> {promptResult.advice}</p>}
        <p className="mt-2 text-xs text-muted-foreground">Marked by Lovable AI as practice feedback. Your teacher can review it.</p>
      </section>}
    </div>
  );
}
