import { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Hand, Maximize2, Play, School, Users, Wifi, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { classCounts } from '@/lib/labs/classroomScreen';
import type { Attempt, LiveSession, Participant } from '@/lib/labs/labApi';

interface Props {
  session: LiveSession; people: Participant[]; attempts: Attempt[]; joinUrl: string; joinPath: string;
  activityName: string | null; canPlay: boolean; busy: boolean; onPlay: () => void; onClose: () => void;
}

/** Full-screen view for a classroom touchscreen: big code, QR to join, class-wide counts only (no names or scores). */
export default function ClassroomScreenView({ session, people, attempts, joinUrl, joinPath, activityName, canPlay, busy, onPlay, onClose }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const counts = classCounts(people, attempts, session.activity_id);

  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const wake = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    wake?.request('screen').then(l => { lock = l; }).catch(() => undefined);
    root.current?.requestFullscreen?.().catch(() => undefined);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      void lock?.release().catch(() => undefined);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, [onClose]);

  const stat = (Icon: typeof Users, value: number, label: string) => (
    <div className="rounded-2xl border bg-card p-[clamp(0.75rem,1.4vw,1.5rem)]">
      <p className="flex items-center gap-2 text-[clamp(0.9rem,1.3vw,1.4rem)] text-muted-foreground"><Icon className="size-[1.2em]" aria-hidden />{label}</p>
      <p className="[font-family:Sora,sans-serif] text-[clamp(2rem,4.5vw,5rem)] font-bold leading-none">{value}</p>
    </div>
  );

  return (
    <div ref={root} role="dialog" aria-modal="true" aria-label="Classroom screen" className="fixed inset-0 z-50 flex flex-col overflow-auto bg-background p-[clamp(1rem,2.5vw,3rem)] text-foreground">
      <header className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 [font-family:Sora,sans-serif] text-[clamp(1.25rem,2.2vw,2.5rem)] font-semibold">{session.title}</p>
        <span className="rounded-full border px-4 py-2 text-[clamp(0.9rem,1.2vw,1.3rem)] font-semibold">{session.kind === 'tech' ? 'Tech lab' : 'Language lab'} · {session.status === 'ended' ? 'ended' : session.locked ? 'joining closed' : 'open to join'}</span>
        {!document.fullscreenElement && <Button variant="outline" className="min-h-14 px-5 text-base" onClick={() => root.current?.requestFullscreen?.().catch(() => undefined)}><Maximize2 className="mr-2 size-5" />Full screen</Button>}
        <Button variant="outline" className="min-h-14 px-5 text-base" onClick={onClose}><X className="mr-2 size-5" />Close</Button>
      </header>

      <main className="mt-[clamp(1rem,2.5vw,3rem)] grid flex-1 items-center gap-[clamp(1rem,3vw,4rem)] lg:grid-cols-[auto_minmax(0,1fr)]">
        <div className="mx-auto rounded-3xl border bg-card p-[clamp(1rem,1.8vw,2rem)] text-center">
          <QRCodeSVG value={joinUrl} size={512} marginSize={2} fgColor="currentColor" bgColor="transparent" className="h-auto w-[clamp(12rem,24vw,30rem)]" title="Scan to join this lab" />
          <p className="mt-3 text-[clamp(1rem,1.3vw,1.4rem)] text-muted-foreground">Scan with your phone camera to join</p>
        </div>
        <div className="min-w-0 space-y-[clamp(1rem,2vw,2.5rem)] text-center lg:text-left">
          <p className="text-[clamp(1.1rem,1.8vw,2rem)]">Or go to <strong className="break-all">{window.location.host}{joinPath}</strong> and enter</p>
          <p className="font-mono text-[clamp(4rem,11vw,13rem)] font-bold leading-none tracking-[0.15em]" aria-label={`Join code ${session.join_code.split('').join(' ')}`}>{session.join_code}</p>
          <p className="text-[clamp(1rem,1.5vw,1.7rem)] text-muted-foreground">In the room, choose <strong className="text-foreground">In class</strong>. At home, choose <strong className="text-foreground">From home</strong>.</p>
          {activityName && <div className="rounded-2xl border border-primary/40 bg-primary/5 p-[clamp(0.75rem,1.4vw,1.5rem)]">
            <p className="text-[clamp(0.9rem,1.2vw,1.3rem)] font-semibold uppercase tracking-wide text-primary">Now on every screen</p>
            <p className="text-[clamp(1.25rem,2.2vw,2.6rem)] font-semibold">{activityName}</p>
            <p className="text-[clamp(1rem,1.4vw,1.6rem)] text-muted-foreground" role="status">{counts.tried} tried · {counts.passed} passed</p>
          </div>}
          {canPlay && <Button className="min-h-16 px-8 text-lg" disabled={busy} onClick={onPlay}><Play className="mr-2 size-6" />Play on every device</Button>}
        </div>
      </main>

      <footer className="mt-[clamp(1rem,2.5vw,3rem)] grid grid-cols-2 gap-[clamp(0.5rem,1.2vw,1.5rem)] md:grid-cols-4" aria-label="Class summary">
        {stat(Users, counts.joined, 'Joined')}
        {stat(School, counts.inClass, 'In class')}
        {stat(Wifi, counts.remote, 'From home')}
        {stat(Hand, counts.hands, 'Hands up')}
      </footer>
    </div>
  );
}
