import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Headphones, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {verifiedLabScope,labPrincipalKey,type LabScope} from '@/lib/labs/labScope';
import { CONVERSATIONS, DRILL_SENTENCES, LAB_LANGUAGES, SPEAKING_PROMPTS, promptById, sentenceById, type LabLanguage } from '@/data/labs/languageLabCatalogue';
import { myAttempts, recordingUrl, useLiveLab, type Attempt } from '@/lib/labs/labApi';
import { speak, speechSupported } from '@/lib/labs/speech';
import LiveLabBar from '@/components/labs/interactive/LiveLabBar';
import { ConversationPartner, Dictation, ListenRepeat, SpeakingTask } from '@/components/labs/interactive/LanguageActivities';

const MODES = [
  { id: 'repeat', label: 'Listen & repeat' },
  { id: 'dictation', label: 'Dictation' },
  { id: 'speaking', label: 'Speaking test' },
  { id: 'conversation', label: 'Conversation partner' },
  { id: 'history', label: 'My work & feedback' },
] as const;
type Mode = typeof MODES[number]['id'];

export default function LanguageLabStudio(){
  const {user,loading}=useAuth();
  const scope=verifiedLabScope(user);
  if(loading||!scope)return <DashboardLayout title="Language Lab"><p role="status">{loading?'Checking lab access…':'A verified account and centre assignment are required.'}</p></DashboardLayout>;
  return <LanguageLabWorkspace key={labPrincipalKey(scope)} scope={scope}/>;
}
function LanguageLabWorkspace({scope}:{scope:LabScope}){
  const [params, setParams] = useSearchParams();
  const mode = (params.get('mode') as Mode) || 'repeat';
  const lang = (params.get('lang') as LabLanguage) || 'en';
  const set = (k: string, v: string) => setParams(prev => { const p = new URLSearchParams(prev); p.set(k, v); return p; });
  const live = useLiveLab('language', scope);

  const sentences = DRILL_SENTENCES.filter(s => s.language === lang);
  const prompts = SPEAKING_PROMPTS.filter(p => p.language === lang);
  const [sentenceId, setSentenceId] = useState(sentences[0]?.id);
  const [promptId, setPromptId] = useState(prompts[0]?.id);
  const [scenarioId, setScenarioId] = useState(CONVERSATIONS[0].id);
  useEffect(() => { setSentenceId(DRILL_SENTENCES.find(s => s.language === lang)?.id); setPromptId(SPEAKING_PROMPTS.find(p => p.language === lang)?.id); }, [lang]);
  const sentence = sentenceById(sentenceId) || sentences[0];
  const prompt = promptById(promptId) || prompts[0];
  const scenario = CONVERSATIONS.find(c => c.id === scenarioId)!;
  const index = sentences.findIndex(s => s.id === sentence?.id);

  return (
    <DashboardLayout title="Language Lab" subtitle="Listen, repeat, write and speak with instant feedback — on your own or in a live class led by your teacher.">
      <LiveLabBar live={live} label="language lab" />
      {live.session?.status === 'live' && <TeacherBroadcast live={live} />}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <fieldset className="flex gap-2" aria-label="Language">
          {LAB_LANGUAGES.map(l => <Button key={l.id} variant={l.id === lang ? 'default' : 'outline'} aria-pressed={l.id === lang} className="min-h-11" onClick={() => set('lang', l.id)}>{l.label}</Button>)}
        </fieldset>
        <p className="flex items-center gap-1 text-sm text-muted-foreground"><Headphones className="size-4" />Use headphones in class so you don’t disturb others.</p>
      </div>
      <nav aria-label="Activities" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {MODES.map(m => <Button key={m.id} variant={m.id === mode ? 'default' : 'outline'} aria-pressed={m.id === mode} className="min-h-11 shrink-0" onClick={() => set('mode', m.id)}>{m.label}</Button>)}
      </nav>

      <section className="rounded-xl border bg-card p-4 sm:p-5">
        {(mode === 'repeat' || mode === 'dictation') && sentence && <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="min-w-0 flex-1 text-sm font-medium">Sentence
              <select className="mt-1 block h-11 w-full rounded-lg border bg-background px-3" value={sentence.id} onChange={e => setSentenceId(e.target.value)}>
                {sentences.map((s, i) => <option key={s.id} value={s.id}>{i + 1}. {s.topic} · {s.level}{mode === 'repeat' ? ` — ${s.text.slice(0, 40)}${s.text.length > 40 ? '…' : ''}` : ''}</option>)}
              </select>
            </label>
            <Button variant="outline" className="min-h-11" disabled={index >= sentences.length - 1} onClick={() => setSentenceId(sentences[index + 1]?.id)}>Next sentence</Button>
          </div>
          {mode === 'repeat' ? <ListenRepeat sentence={sentence} /> : <Dictation sentence={sentence} />}
        </>}
        {mode === 'speaking' && prompt && <>
          <label className="mb-4 block text-sm font-medium">Speaking task
            <select className="mt-1 block h-11 w-full rounded-lg border bg-background px-3" value={prompt.id} onChange={e => setPromptId(e.target.value)}>
              {prompts.map(p => <option key={p.id} value={p.id}>{p.part} — {p.prompt.slice(0, 60)}{p.prompt.length > 60 ? '…' : ''}</option>)}
            </select>
          </label>
          <SpeakingTask prompt={prompt} />
        </>}
        {mode === 'conversation' && <>
          <label className="mb-4 block text-sm font-medium">Role-play
            <select className="mt-1 block h-11 w-full rounded-lg border bg-background px-3" value={scenario.id} onChange={e => setScenarioId(e.target.value)}>
              {CONVERSATIONS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </label>
          <ConversationPartner scenario={scenario} lang={lang} />
        </>}
        {mode === 'history' && <History userId={scope.id} tenantId={scope.tenantId} />}
      </section>
      <p className="mt-4 text-xs text-muted-foreground">Sentences are read by your device’s voice. Speech checking, speaking feedback and the conversation partner use Lovable AI and are limited each day. Speaking-test recordings are private to you and your teachers.</p>
    </DashboardLayout>
  );
}

function TeacherBroadcast({ live }: { live: ReturnType<typeof useLiveLab> }) {
  const b = live.session?.broadcast || {};
  const [audioOn, setAudioOn] = useState(false);
  const lastPlay = useRef<number | undefined>(undefined);
  const sentence = sentenceById(b.item_id), prompt = promptById(b.item_id);
  const text = sentence?.text || prompt?.prompt;
  const lang = LAB_LANGUAGES.find(l => l.id === (sentence?.language || prompt?.language))?.voice || 'en-GB';
  const play = useCallback(() => { if (text) void speak(text, lang, b.rate || 0.95); }, [text, lang, b.rate]);
  useEffect(() => {
    if (lastPlay.current === undefined) { lastPlay.current = b.play_revision; return; }
    if (b.play_revision !== lastPlay.current) { lastPlay.current = b.play_revision; if (audioOn) play(); else toast.info('Your teacher played audio. Turn on class audio to hear it.'); }
  }, [b.play_revision, audioOn, play]);
  useEffect(() => { void live.sendPresence({ activity: b.item_id ? `${b.mode}:${b.item_id}` : null }); }, [b.item_id, b.mode]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!b.mode || !b.item_id || !text) return <p className="mb-5 rounded-xl border bg-card p-4 text-sm text-muted-foreground" role="status">Connected. Waiting for your teacher to send the first activity…</p>;
  return (
    <section aria-label="Activity from your teacher" className="mb-6 rounded-xl border-2 border-primary/40 bg-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="flex-1 text-xs font-semibold uppercase tracking-wide text-primary">From your teacher · {b.mode === 'repeat' ? 'Listen & repeat' : b.mode === 'dictation' ? 'Dictation' : 'Speaking'}</p>
        {speechSupported() && <Button variant={audioOn ? 'default' : 'outline'} className="min-h-11" aria-pressed={audioOn} onClick={() => { const next = !audioOn; setAudioOn(next); if (next) play(); }}>
          <Volume2 className="mr-2 size-4" />{audioOn ? 'Class audio on' : 'Turn on class audio'}
        </Button>}
      </div>
      {b.mode === 'repeat' && sentence && <ListenRepeat key={`${sentence.id}-${b.revision}`} sentence={sentence} sessionId={live.session!.id} />}
      {b.mode === 'dictation' && sentence && <Dictation key={`${sentence.id}-${b.revision}`} sentence={sentence} sessionId={live.session!.id} />}
      {b.mode === 'speaking' && prompt && <SpeakingTask key={`${prompt.id}-${b.revision}`} prompt={prompt} sessionId={live.session!.id} />}
    </section>
  );
}

function label(activity: string) {
  const [mode, id] = activity.split(':');
  const name = sentenceById(id)?.text || promptById(id)?.prompt || CONVERSATIONS.find(c => c.id === id)?.title || id;
  return `${mode === 'repeat' ? 'Listen & repeat' : mode === 'dictation' ? 'Dictation' : mode === 'speaking' ? 'Speaking' : 'Conversation'} — ${name}`;
}

function History({userId,tenantId}:{userId:string;tenantId:string}){
  const [rows, setRows] = useState<Attempt[] | null>(null);
  const [error, setError] = useState('');
  const [audio, setAudio] = useState<Record<string, string>>({});
  const generation=useRef(0);
  useEffect(()=>{
    const token=++generation.current;
    void myAttempts(userId,tenantId,'language',60).then(result=>{if(generation.current===token)setRows(result);}).catch(()=>{if(generation.current===token)setError('Your saved language work could not be verified.');});
    return()=>{generation.current++;};
  },[userId,tenantId]);
  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!rows) return <p role="status">Loading your work…</p>;
  if (!rows.length) return <p>No saved language work yet. Try a speaking test or dictation.</p>;
  return <ul className="divide-y">{rows.map(a => <li key={a.id} className="py-3 text-sm">
    <p className="font-medium">{label(a.activity_id)}</p>
    <p className="text-muted-foreground">{a.score !== null ? `${Number(a.score)}% · ` : ''}{new Date(a.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}{a.session_id ? ' · live class' : ''}</p>
    {a.content && <p className="mt-1 line-clamp-3 whitespace-pre-wrap">{a.content}</p>}
    {a.audio_path && (audio[a.id] ? <audio controls src={audio[a.id]} className="mt-2 max-w-full" aria-label="Your recording" />
      : <Button variant="link" className="h-auto p-0" onClick={async () => { try { const url = await recordingUrl(a.audio_path!); setAudio(m => ({ ...m, [a.id]: url })); } catch { toast.error('Recording unavailable.'); } }}>Play my recording</Button>)}
    {a.teacher_feedback && <p className="mt-2 rounded bg-secondary/60 p-2"><strong>Teacher:</strong> {a.teacher_feedback}</p>}
  </li>)}</ul>;
}
