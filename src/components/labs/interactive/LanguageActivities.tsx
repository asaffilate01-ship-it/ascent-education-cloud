import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Mic, Send, Square, Turtle, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { LAB_LANGUAGES, type ConversationScenario, type DrillSentence, type LabLanguage, type SpeakingPrompt } from '@/data/labs/languageLabCatalogue';
import { wordAccuracy } from '@/lib/labs/grading';
import { callCoach, saveAttempt, transcribe, uploadRecording } from '@/lib/labs/labApi';
import { speak, speechSupported, stopSpeaking, useRecorder } from '@/lib/labs/speech';

const voiceOf = (lang: LabLanguage) => LAB_LANGUAGES.find(l => l.id === lang)!;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function PlayButtons({ text, lang }: { text: string; lang: LabLanguage }) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  if (!speechSupported()) return <p className="text-sm text-destructive">This browser cannot speak text aloud. Try Chrome or Edge, or ask your teacher to read it.</p>;
  const play = async (rate: number) => { setPlaying(true); await speak(text, voiceOf(lang).voice, rate); setPlaying(false); };
  return <div className="flex flex-wrap gap-2">
    <Button type="button" className="min-h-11" onClick={() => void play(0.95)} disabled={playing}><Volume2 className="mr-2 size-4" />{playing ? 'Playing…' : 'Listen'}</Button>
    <Button type="button" variant="outline" className="min-h-11" onClick={() => void play(0.65)} disabled={playing}><Turtle className="mr-2 size-4" />Listen slowly</Button>
  </div>;
}

function RecordControls({ rec, max }: { rec: ReturnType<typeof useRecorder>; max: number }) {
  return <div className="flex flex-wrap items-center gap-2">
    {rec.state === 'recording'
      ? <Button type="button" variant="destructive" className="min-h-11" onClick={rec.stop}><Square className="mr-2 size-4" />Stop recording ({fmt(rec.elapsed)} / {fmt(max)})</Button>
      : <Button type="button" variant="outline" className="min-h-11" onClick={() => void rec.start()} disabled={rec.state === 'requesting'}><Mic className="mr-2 size-4" />{rec.state === 'requesting' ? 'Allow the microphone…' : rec.url ? 'Record again' : 'Record yourself'}</Button>}
    {rec.url && rec.state === 'idle' && <audio controls src={rec.url} className="h-11 max-w-full" aria-label="Your recording" />}
    {rec.error && <p role="alert" className="w-full text-sm text-destructive">{rec.error}</p>}
  </div>;
}

function WordFeedback({ target, attempt }: { target: string; attempt: string }) {
  const r = wordAccuracy(target, attempt);
  return <div className="rounded-lg border bg-secondary/40 p-3 text-sm" role="status">
    <p className="font-semibold">{r.score >= 90 ? 'Excellent!' : r.score >= 70 ? 'Good — nearly there.' : 'Keep practising.'} Accuracy {r.score}%</p>
    <p className="mt-1"><span className="text-muted-foreground">We heard:</span> “{attempt || '—'}”</p>
    {r.missing.length > 0 && <p className="mt-1"><span className="text-muted-foreground">Missing or unclear:</span> <strong>{r.missing.join(', ')}</strong></p>}
  </div>;
}

interface Ctx { sessionId?: string | null }

export function ListenRepeat({ sentence, sessionId }: { sentence: DrillSentence } & Ctx) {
  const { user } = useAuth();
  const rec = useRecorder(25);
  const [heard, setHeard] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setHeard(null); rec.clear(); }, [sentence.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const check = async () => {
    if (!rec.blob || !user?.id || !user.tenantId) return;
    setBusy(true);
    try {
      const text = await transcribe(rec.blob, sentence.language);
      setHeard(text);
      const { score } = wordAccuracy(sentence.text, text);
      const audioPath = sessionId ? await uploadRecording(user.id, rec.blob) : null;
      await saveAttempt({ userId: user.id, tenantId: user.tenantId, sessionId, kind: 'language', activityId: `repeat:${sentence.id}`, content: text, score, passed: score >= 80, result: { target: sentence.text }, audioPath });
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not check your speech.'); }
    finally { setBusy(false); }
  };
  return <div className="space-y-3">
    <p className="text-xl font-semibold leading-relaxed" lang={voiceOf(sentence.language).voice}>{sentence.text}</p>
    {sentence.translation && <p className="text-sm text-muted-foreground">{sentence.translation}</p>}
    <PlayButtons text={sentence.text} lang={sentence.language} />
    <RecordControls rec={rec} max={25} />
    {rec.blob && <Button className="min-h-11" onClick={() => void check()} disabled={busy}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}Check my pronunciation</Button>}
    {heard !== null && <WordFeedback target={sentence.text} attempt={heard} />}
  </div>;
}

export function Dictation({ sentence, sessionId }: { sentence: DrillSentence } & Ctx) {
  const { user } = useAuth();
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  useEffect(() => { setAnswer(''); setChecked(false); }, [sentence.id]);
  const check = async () => {
    setChecked(true);
    if (!user?.id || !user.tenantId) return;
    const { score } = wordAccuracy(sentence.text, answer);
    try { await saveAttempt({ userId: user.id, tenantId: user.tenantId, sessionId, kind: 'language', activityId: `dictation:${sentence.id}`, content: answer, score, passed: score >= 90, result: { target: sentence.text } }); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save.'); }
  };
  const r = checked ? wordAccuracy(sentence.text, answer) : null;
  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">Listen, then type exactly what you hear. You can listen as many times as you like.</p>
    <PlayButtons text={sentence.text} lang={sentence.language} />
    <label className="block text-sm font-medium">What did you hear?
      <Input className="mt-1 h-11" value={answer} onChange={e => { setAnswer(e.target.value); setChecked(false); }} lang={voiceOf(sentence.language).voice} autoComplete="off" spellCheck={false} />
    </label>
    <Button className="min-h-11" disabled={!answer.trim()} onClick={() => void check()}><CheckCircle2 className="mr-2 size-4" />Check my answer</Button>
    {r && <div role="status" className="rounded-lg border bg-secondary/40 p-3 text-sm">
      <p className="font-semibold">Accuracy {r.score}%</p>
      <p className="mt-1"><span className="text-muted-foreground">Correct sentence:</span> {sentence.text}</p>
      {r.missing.length > 0 && <p className="mt-1"><span className="text-muted-foreground">Words to check:</span> <strong>{r.missing.join(', ')}</strong></p>}
    </div>}
  </div>;
}

type SpeakingFeedback = { overall: number; fluency_coherence: number; lexical_resource: number; grammar: number; strengths: string[]; improvements: string[]; model_answer: string };

export function SpeakingTask({ prompt, sessionId }: { prompt: SpeakingPrompt } & Ctx) {
  const { user } = useAuth();
  const rec = useRecorder(prompt.speakSeconds);
  const [prep, setPrep] = useState<number | null>(null);
  const [busy, setBusy] = useState('');
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<SpeakingFeedback | null>(null);
  const timer = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => { setFeedback(null); setTranscript(''); setPrep(null); rec.clear(); clearInterval(timer.current); }, [prompt.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearInterval(timer.current), []);
  const startPrep = () => {
    setPrep(prompt.prepSeconds); setFeedback(null); setTranscript('');
    timer.current = setInterval(() => setPrep(p => { if (p === null) return null; if (p <= 1) { clearInterval(timer.current); void rec.start(); return null; } return p - 1; }), 1000);
  };
  const submit = async () => {
    if (!rec.blob || !user?.id || !user.tenantId) return;
    try {
      setBusy('Uploading your answer…');
      const audioPath = await uploadRecording(user.id, rec.blob);
      setBusy('Listening to your answer…');
      const text = await transcribe(rec.blob, prompt.language); setTranscript(text);
      setBusy('Preparing feedback…');
      const fb = await callCoach<SpeakingFeedback>({ action: 'speaking_feedback', prompt: prompt.prompt, transcript: text, language: voiceOf(prompt.language).aiName });
      setFeedback(fb);
      await saveAttempt({ userId: user.id, tenantId: user.tenantId, sessionId, kind: 'language', activityId: `speaking:${prompt.id}`, content: text, score: Math.round((fb.overall / 9) * 100), passed: fb.overall >= 6, result: { ...fb, prompt: prompt.prompt }, audioPath });
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not get feedback.'); }
    finally { setBusy(''); }
  };
  return <div className="space-y-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-primary">{prompt.part}</p>
    <p className="text-lg font-semibold leading-relaxed">{prompt.prompt}</p>
    <PlayButtons text={prompt.prompt} lang={prompt.language} />
    <p className="text-sm text-muted-foreground">Preparation {prompt.prepSeconds}s · speak for up to {fmt(prompt.speakSeconds)}. Recording starts automatically after preparation.</p>
    {prep !== null ? <p role="timer" className="text-2xl font-bold">Prepare… {prep}s <Button variant="outline" className="ml-2 min-h-11" onClick={() => { clearInterval(timer.current); setPrep(null); void rec.start(); }}>Start speaking now</Button></p>
      : rec.state === 'idle' && !rec.url ? <Button className="min-h-11" onClick={startPrep}><Mic className="mr-2 size-4" />Start the task</Button>
      : <RecordControls rec={rec} max={prompt.speakSeconds} />}
    {rec.blob && rec.state === 'idle' && <Button className="min-h-11" onClick={() => void submit()} disabled={!!busy}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}{busy || 'Submit for feedback'}</Button>}
    {transcript && <p className="rounded-lg bg-secondary/40 p-3 text-sm"><span className="text-muted-foreground">Transcript:</span> {transcript}</p>}
    {feedback && <section className="rounded-xl border bg-card p-4" aria-label="Speaking feedback">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[['Overall', feedback.overall], ['Fluency & coherence', feedback.fluency_coherence], ['Vocabulary', feedback.lexical_resource], ['Grammar', feedback.grammar]].map(([k, v]) => (
          <div key={String(k)} className="rounded-lg bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="text-2xl font-bold">{Number(v).toFixed(1)}</p></div>))}
      </div>
      <h4 className="mt-4 font-semibold">What went well</h4><ul className="mt-1 list-disc pl-5 text-sm">{feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
      <h4 className="mt-3 font-semibold">How to improve</h4><ul className="mt-1 list-disc pl-5 text-sm">{feedback.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
      <h4 className="mt-3 font-semibold">A stronger answer</h4><p className="mt-1 whitespace-pre-wrap text-sm">{feedback.model_answer}</p>
      <p className="mt-3 text-xs text-muted-foreground">Practice estimates from Lovable AI, not official scores. Your recording is private to you and your teachers.</p>
    </section>}
  </div>;
}

type Turn = { role: 'user' | 'assistant'; content: string; tip?: string };
export function ConversationPartner({ scenario, lang }: { scenario: ConversationScenario; lang: LabLanguage }) {
  const { user } = useAuth();
  const [turns, setTurns] = useState<Turn[]>([{ role: 'assistant', content: scenario.opener[lang] }]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState('');
  const [voiceOn, setVoiceOn] = useState(true);
  const rec = useRecorder(45);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { setTurns([{ role: 'assistant', content: scenario.opener[lang] }]); setDraft(''); }, [scenario.id, lang]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [turns.length]);
  useEffect(() => { if (rec.blob) void (async () => { setBusy('Listening…'); try { setDraft(await transcribe(rec.blob!, lang)); } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not hear that.'); } finally { setBusy(''); rec.clear(); } })(); }, [rec.blob]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = async () => {
    const text = draft.trim(); if (!text || busy) return;
    const next: Turn[] = [...turns, { role: 'user', content: text }]; setTurns(next); setDraft(''); setBusy('Thinking…');
    try {
      const r = await callCoach<{ reply: string; tip: string }>({ action: 'conversation', scenario: scenario.scenario, language: voiceOf(lang).aiName, messages: next.slice(-20).map(({ role, content }) => ({ role, content })) });
      setTurns(t => { const copy = [...t]; copy[copy.length - 1] = { ...copy[copy.length - 1], tip: r.tip }; return [...copy, { role: 'assistant', content: r.reply }]; });
      if (voiceOn) void speak(r.reply, voiceOf(lang).voice, 0.95);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'The partner is unavailable.'); setTurns(turns); setDraft(text); }
    finally { setBusy(''); }
  };
  const save = async () => {
    if (!user?.id || !user.tenantId) return;
    const learnerTurns = turns.filter(t => t.role === 'user').length;
    if (!learnerTurns) { toast.error('Say something first.'); return; }
    try {
      await saveAttempt({ userId: user.id, tenantId: user.tenantId, kind: 'language', activityId: `conversation:${scenario.id}`, content: turns.map(t => `${t.role === 'user' ? 'Me' : 'Partner'}: ${t.content}${t.tip ? `\n  Tip: ${t.tip}` : ''}`).join('\n'), result: { turns: learnerTurns, language: lang } });
      toast.success('Conversation saved to your history.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save.'); }
  };
  return <div className="space-y-3">
    <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-xl border bg-background p-3" aria-live="polite">
      {turns.map((t, i) => <div key={i} className={t.role === 'user' ? 'ml-auto max-w-[85%]' : 'max-w-[85%]'}>
        <div className={`rounded-xl px-3 py-2 text-sm ${t.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>{t.content}</div>
        {t.role === 'assistant' && speechSupported() && <button type="button" className="mt-1 text-xs underline" onClick={() => void speak(t.content, voiceOf(lang).voice)}>Hear again</button>}
        {t.tip && <p className="mt-1 text-xs text-muted-foreground">Tip: {t.tip}</p>}
      </div>)}
      {busy && <p role="status" className="text-sm text-muted-foreground">{busy}</p>}
      <div ref={end} />
    </div>
    <div className="flex flex-wrap items-end gap-2">
      <Textarea aria-label="Your reply" rows={2} className="min-w-0 flex-1 basis-60" value={draft} onChange={e => setDraft(e.target.value)} maxLength={1500} placeholder="Type or record your reply…"
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} />
      {rec.state === 'recording' ? <Button variant="destructive" className="min-h-11" onClick={rec.stop}><Square className="mr-2 size-4" />Stop ({fmt(rec.elapsed)})</Button>
        : <Button variant="outline" className="min-h-11" onClick={() => void rec.start()} disabled={!!busy}><Mic className="mr-2 size-4" />Speak</Button>}
      <Button className="min-h-11" onClick={() => void send()} disabled={!draft.trim() || !!busy}><Send className="mr-2 size-4" />Send</Button>
    </div>
    {rec.error && <p role="alert" className="text-sm text-destructive">{rec.error}</p>}
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="min-h-11" aria-pressed={voiceOn} onClick={() => { setVoiceOn(v => !v); stopSpeaking(); }}>{voiceOn ? 'Partner voice on' : 'Partner voice off'}</Button>
      <Button variant="outline" className="min-h-11" onClick={() => void save()}>Save conversation</Button>
      <Button variant="ghost" className="min-h-11" onClick={() => { stopSpeaking(); setTurns([{ role: 'assistant', content: scenario.opener[lang] }]); }}>Start again</Button>
    </div>
  </div>;
}
