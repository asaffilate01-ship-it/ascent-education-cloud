import { useState } from 'react';
import { Hand, LogOut, Radio, School, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { useLiveLab } from '@/lib/labs/labApi';

type Live = ReturnType<typeof useLiveLab>;

export default function LiveLabBar({ live, label }: { live: Live; label: string }) {
  const [code, setCode] = useState(() => new URLSearchParams(window.location.search).get('code')?.toUpperCase().slice(0, 6) || '');
  const [location, setLocation] = useState<'in_class' | 'remote'>('remote');
  const [busy, setBusy] = useState(false);
  const [hand, setHand] = useState(false);

  if (live.session) {
    const ended = live.session.status === 'ended';
    return (
      <section aria-label="Live class session" className="mb-5 rounded-xl border border-primary/40 bg-primary/5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Radio className="size-5 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{ended ? 'Session ended' : 'Live with your teacher'}</p>
            <p className="font-semibold">{live.session.title}</p>
            {ended && <p className="text-sm text-muted-foreground">Your teacher has ended this session. Your saved work stays in your history.</p>}
          </div>
          {!ended && <Button variant={hand ? 'default' : 'outline'} aria-pressed={hand} className="min-h-11" onClick={() => { const next = !hand; setHand(next); void live.sendPresence({ hand: next, status: next ? 'stuck' : 'working' }); }}>
            <Hand className="mr-2 size-4" />{hand ? 'Hand raised — lower' : 'Raise hand for help'}
          </Button>}
          <Button variant="ghost" className="min-h-11" onClick={live.leave}><LogOut className="mr-2 size-4" />Leave</Button>
        </div>
        {live.error && <p role="status" className="mt-2 text-sm text-muted-foreground">{live.error}</p>}
      </section>
    );
  }

  return (
    <section aria-label="Join a live class" className="mb-5 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">Join your teacher’s live {label}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Enter the 6-character code on the board or in your class message. It works the same in the classroom or at home. You can also practise on your own below without a code.</p>
      <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={async e => { e.preventDefault(); if (code.length !== 6 || busy) return; setBusy(true); await live.join(code, location); setBusy(false); }}>
        <label className="text-sm font-medium">Class code
          <Input value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="e.g. K7M2QP" autoComplete="off" inputMode="text"
            className="mt-1 h-11 w-40 font-mono text-lg tracking-widest" aria-describedby="join-help" />
        </label>
        <fieldset className="flex gap-2" aria-label="Where are you joining from?">
          {([['in_class', 'In class', School], ['remote', 'From home', Wifi]] as const).map(([value, text, Icon]) => (
            <Button key={value} type="button" variant={location === value ? 'default' : 'outline'} aria-pressed={location === value} className="min-h-11" onClick={() => setLocation(value)}>
              <Icon className="mr-2 size-4" />{text}
            </Button>
          ))}
        </fieldset>
        <Button type="submit" className="min-h-11" disabled={code.length !== 6 || busy}>{busy ? 'Joining…' : 'Join session'}</Button>
      </form>
      <p id="join-help" className="sr-only">Codes have six letters or numbers.</p>
      {live.error && <p role="alert" className="mt-2 text-sm text-destructive">{live.error}</p>}
    </section>
  );
}
