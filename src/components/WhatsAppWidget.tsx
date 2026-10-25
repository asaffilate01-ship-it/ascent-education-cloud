import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowUpRight } from 'lucide-react';
import { WhatsappGlyph } from '@/components/SocialIcons';
import { SOCIAL_LINKS } from '@/lib/publicContact';

export default function WhatsAppWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('Hello UniPathway, I would like advice about courses.');
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const show = () => { returnFocus.current = document.activeElement as HTMLElement; setOpen(true); };
  const close = () => { setOpen(false); returnFocus.current?.focus(); };
  useEffect(() => { if (open) closeRef.current?.focus(); }, [open]);
  const url = SOCIAL_LINKS.whatsapp ? new URL(SOCIAL_LINKS.whatsapp) : null;
  if (url) url.searchParams.set('text', message.trim());
  return <aside aria-label="WhatsApp contact" className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 z-[60] lg:bottom-6">
    {open && <section role="dialog" aria-modal="false" aria-labelledby="whatsapp-title" onKeyDown={e => { if (e.key === 'Escape') close(); }} className="mb-3 flex max-h-[calc(100dvh-12rem)] w-[350px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl">
      <header className="flex items-center gap-3 bg-primary p-4 text-primary-foreground">
        <WhatsappGlyph className="size-8 shrink-0" />
        <div className="flex-1"><h2 id="whatsapp-title" className="font-bold">Chat with UniPathway</h2><p className="text-xs opacity-80">Course advice & admissions</p></div>
        <button ref={closeRef} type="button" aria-label="Close WhatsApp chat" onClick={close} className="grid size-11 place-items-center rounded-lg hover:bg-white/10 focus-visible:outline focus-visible:outline-2"><X className="size-5" /></button>
      </header>
      <div className="space-y-4 overflow-y-auto p-4">
        <p className="rounded-xl bg-secondary p-3 text-sm leading-relaxed">Hi! Tell us what you’d like to study. We can help with online learning across Pakistan and in-class options in Jhelum.</p>
        <div className="flex flex-wrap gap-2">{['Course advice', 'Fees & admissions', 'Online or in class'].map(topic => <button key={topic} type="button" onClick={() => setMessage(`Hello UniPathway, I would like help with ${topic.toLowerCase()}.`)} className="min-h-11 rounded-full border px-3 text-xs font-semibold hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring">{topic}</button>)}</div>
        <label className="block text-sm font-semibold" htmlFor="whatsapp-message">Your message</label>
        <textarea id="whatsapp-message" maxLength={1000} rows={3} value={message} onChange={e => setMessage(e.target.value)} className="w-full resize-y rounded-xl border bg-background p-3 text-base font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        {url && message.trim() ? <a href={url.href} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground hover:opacity-90">Continue in WhatsApp <ArrowUpRight className="size-4" /></a> : <Link to="/contact" onClick={close} className="flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground">Contact admissions</Link>}
        <p className="text-xs leading-relaxed text-muted-foreground">{url ? 'Opens WhatsApp with your draft. Your message is sent only when you send it there.' : 'You can reach our admissions team using the contact form.'}</p>
      </div>
    </section>}
    <button type="button" onClick={open ? close : show} aria-expanded={open} aria-label={open ? 'Close WhatsApp widget' : 'Open WhatsApp chat'} className="flex min-h-14 items-center gap-2 rounded-full border border-success/30 bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2"><WhatsappGlyph className="size-6 text-green-300" /><span>Chat with us</span></button>
  </aside>;
}
