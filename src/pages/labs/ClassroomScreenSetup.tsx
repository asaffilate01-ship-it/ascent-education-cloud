import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, CheckCircle2, Mic, MonitorSmartphone, PenLine, Radio, Speaker, Video, Wifi } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { describeDisplay, panelSystem } from '@/lib/labs/classroomScreen';

const linkClass = 'inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold hover:bg-accent';

export default function ClassroomScreenSetup() {
  const system = panelSystem(navigator.userAgent);
  return (
    <DashboardLayout title="Classroom screen" subtitle="Set up and check the Hikvision interactive screen for Teams lessons, recordings, live labs and whiteboard teaching">
      <div className="space-y-6">
        <section className="rounded-xl border bg-card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-semibold"><MonitorSmartphone className="size-5" />How one screen covers every kind of lesson</h2>
          <p className="mt-2 text-sm text-muted-foreground">The Hikvision Ultra screen is the teacher’s board in the room. Its built-in camera and microphones bring home learners into the same lesson through Teams. The plug-in Windows computer (OPS) runs Teams and the website. Students in the room use their own phones, laptops or lab computers for labs, and students at home use the same links.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className={linkClass} to="/labs/teach">Run a live lab</Link>
            <Link className={linkClass} to="/lecturer/classroom">Teams classes</Link>
            <Link className={linkClass} to="/lecturer/whiteboards">Whiteboards</Link>
            <Link className={linkClass} to="/lecturer/lesson-archive">Recorded lessons</Link>
          </div>
        </section>

        <section aria-labelledby="check-heading" className="rounded-xl border bg-card p-4 sm:p-5">
          <h2 id="check-heading" className="font-semibold">Check this screen</h2>
          <p className="mt-1 text-sm text-muted-foreground">Open this page in the browser on the classroom screen before the first lesson of the day. Nothing is recorded or saved.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <DisplayCheck system={system} />
            <ConnectionCheck />
            <CameraMicCheck />
            <SpeakerCheck />
          </div>
        </section>

        <section aria-labelledby="guide-heading" className="space-y-4">
          <h2 id="guide-heading" className="font-semibold">Teaching with the screen</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <Guide icon={Video} title="Teams lessons (in class and online together)" steps={[
              'Use the Teams app on the Windows computer (OPS) and sign in with the teacher’s school Microsoft account.',
              'In Teams settings › Devices, choose the Hikvision camera, microphone array and speakers. Turn on the screen’s auto-framing so the whole room is seen.',
              'Open the class from Teams classes in this site and join the meeting. Home learners join the same meeting from their own Teams classes page.',
              'Share the screen in Teams when you write on the board or show a lab, so home learners see exactly what the room sees.',
            ]} />
            <Guide icon={Radio} title="Recording a lesson" steps={[
              'Tell the class before you start, and record only lessons that the class has been told are recorded.',
              'In the Teams meeting, choose More › Record and transcribe › Start recording. Teams saves it to the school’s Microsoft account, not to the screen.',
              'Release it to students from Recorded lessons. Recordings stay private to the invited class.',
              'Do not use the screen’s own screen recorder or USB drives for lessons with students in them.',
            ]} />
            <Guide icon={MonitorSmartphone} title="Live tech and language labs" steps={[
              'Open Run a live lab on the screen, start a session and press Show on classroom screen.',
              'Students scan the QR code or type the code. In the room they choose In class, at home they choose From home.',
              'Send an exercise or a listening activity to every device. The screen shows only class totals, never names or marks.',
              'Watch individual progress and raised hands on your own laptop or tablet with the same session open.',
            ]} />
            <Guide icon={PenLine} title="Whiteboard and casting" steps={[
              'Use the screen’s whiteboard for quick working in the room, or the Whiteboards page when the board should be saved for the class.',
              'Save board work to the school Microsoft account. Do not let students scan the board onto personal phones if it shows names or marks.',
              'Students can cast to the screen wirelessly when you allow it. Stop casting before sharing anything private.',
            ]} />
          </div>
          {system === 'android' && <p role="note" className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">This page is open on the screen’s built-in Android system. Labs and the website work in Chrome here, but Hikvision recommends the Windows computer (OPS) for Teams calls and recording.</p>}
          <section className="rounded-xl border bg-card p-4 sm:p-5">
            <h3 className="font-semibold">Start-of-day checklist</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {['Screen switched to the Windows (OPS) input and signed in to the teacher account', 'Check this screen: camera, microphones, speakers and connection all green', 'Teams meeting open for the timetabled class (online learners)', 'Live lab session opened if the lesson uses the tech or language lab', 'Sign out of Teams and this site at the end of the day'].map(t => <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />{t}</li>)}
            </ul>
          </section>
        </section>
      </div>
    </DashboardLayout>
  );
}

function Guide({ icon: Icon, title, steps }: { icon: typeof Video; title: string; steps: string[] }) {
  return <section className="rounded-xl border bg-card p-4 sm:p-5">
    <h3 className="flex items-center gap-2 font-semibold"><Icon className="size-5" aria-hidden />{title}</h3>
    <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">{steps.map(s => <li key={s}>{s}</li>)}</ol>
  </section>;
}

function CheckCard({ icon: Icon, title, children }: { icon: typeof Video; title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border p-4"><h3 className="flex items-center gap-2 font-semibold"><Icon className="size-5" aria-hidden />{title}</h3><div className="mt-2 space-y-2 text-sm">{children}</div></div>;
}

function DisplayCheck({ system }: { system: ReturnType<typeof panelSystem> }) {
  const [info, setInfo] = useState(() => describeDisplay({ cssWidth: window.screen.width, cssHeight: window.screen.height, pixelRatio: window.devicePixelRatio || 1, touchPoints: navigator.maxTouchPoints || 0 }));
  useEffect(() => {
    const update = () => setInfo(describeDisplay({ cssWidth: window.screen.width, cssHeight: window.screen.height, pixelRatio: window.devicePixelRatio || 1, touchPoints: navigator.maxTouchPoints || 0 }));
    window.addEventListener('resize', update); return () => window.removeEventListener('resize', update);
  }, []);
  return <CheckCard icon={MonitorSmartphone} title="Display and touch">
    <p>Resolution: <strong>{info.pixels}</strong>{info.isUltraHd ? ' (4K)' : ''}</p>
    <p>Touch: <strong>{info.touchLabel}</strong></p>
    <p>System: <strong>{system === 'windows' ? 'Windows computer (OPS)' : system === 'android' ? 'Built-in Android' : 'Other device'}</strong></p>
    <Button variant="outline" className="min-h-11" onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)}>Test full screen</Button>
  </CheckCard>;
}

function ConnectionCheck() {
  const [state, setState] = useState<{ ms?: number; error?: string; busy?: boolean }>({});
  const run = async () => {
    setState({ busy: true });
    const start = performance.now();
    const { error } = await supabase.from('interactive_lab_sessions').select('id', { head: true, count: 'exact' }).limit(1);
    const ms = Math.round(performance.now() - start);
    setState(error ? { error: 'The site could not be reached. Check the screen’s network cable or Wi-Fi.' } : { ms });
  };
  useEffect(() => { void run(); }, []);
  return <CheckCard icon={Wifi} title="Connection">
    {state.busy && <p role="status">Checking…</p>}
    {state.error && <p role="alert" className="text-destructive">{state.error}</p>}
    {state.ms !== undefined && <p role="status">Site responded in <strong>{state.ms} ms</strong> — {state.ms < 400 ? 'good for live lessons' : state.ms < 1200 ? 'usable; video may drop quality' : 'slow; prefer the network cable for Teams'}.</p>}
    <Button variant="outline" className="min-h-11" disabled={state.busy} onClick={() => void run()}>Check again</Button>
  </CheckCard>;
}

function CameraMicCheck() {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const frame = useRef(0);
  const audioCtx = useRef<AudioContext | null>(null);
  const [level, setLevel] = useState(0);
  const [devices, setDevices] = useState<{ cameras: string[]; mics: string[] }>({ cameras: [], mics: [] });
  const [error, setError] = useState('');
  const [on, setOn] = useState(false);
  const stop = () => {
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
    void audioCtx.current?.close().catch(() => undefined); audioCtx.current = null;
    setOn(false); setLevel(0);
  };
  useEffect(() => stop, []);
  const start = async () => {
    setError('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.current = s; setOn(true);
      if (video.current) { video.current.srcObject = s; void video.current.play().catch(() => undefined); }
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices({ cameras: list.filter(d => d.kind === 'videoinput').map(d => d.label || 'Camera'), mics: list.filter(d => d.kind === 'audioinput').map(d => d.label || 'Microphone') });
      const ctx = new AudioContext(); audioCtx.current = ctx;
      const analyser = ctx.createAnalyser(); analyser.fftSize = 512;
      ctx.createMediaStreamSource(s).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => { analyser.getByteTimeDomainData(data); let peak = 0; for (const v of data) peak = Math.max(peak, Math.abs(v - 128)); setLevel(Math.min(100, Math.round(peak / 1.28))); frame.current = requestAnimationFrame(tick); };
      tick();
    } catch {
      setError('The camera or microphones could not be opened. Allow access in the browser, and close Teams if it is using them.');
    }
  };
  return <CheckCard icon={Camera} title="Camera and microphones">
    <video ref={video} muted playsInline className={on ? 'aspect-video max-h-72 w-full rounded-lg border bg-muted object-cover' : 'hidden'} aria-label="Camera preview" />
    {on && <>
      <p className="flex items-center gap-2"><Mic className="size-4" aria-hidden />Speak from the back of the room:</p>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted" role="meter" aria-label="Microphone level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level}><div className="h-full bg-primary transition-[width]" style={{ width: `${level}%` }} /></div>
      <p className="text-muted-foreground">Cameras: {devices.cameras.join(', ') || 'none'}<br />Microphones: {devices.mics.join(', ') || 'none'}</p>
    </>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Button variant="outline" className="min-h-11" onClick={() => (on ? stop() : void start())}>{on ? 'Stop test' : 'Test camera and microphones'}</Button>
  </CheckCard>;
}

function SpeakerCheck() {
  const [played, setPlayed] = useState(false);
  const play = () => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance('This is the classroom speaker test. Students at the back of the room should hear this clearly.');
      u.lang = 'en-GB'; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
    }
    setPlayed(true);
  };
  return <CheckCard icon={Speaker} title="Speakers">
    <p className="text-muted-foreground">Plays a short spoken sentence through the screen’s speakers.</p>
    {played && <p role="status">If the back row heard it clearly, the speakers are ready for Teams and listening activities.</p>}
    <Button variant="outline" className="min-h-11" onClick={play}>Play speaker test</Button>
  </CheckCard>;
}
