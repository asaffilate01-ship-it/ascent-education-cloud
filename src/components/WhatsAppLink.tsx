import { WhatsappGlyph } from '@/components/SocialIcons';
import { OPEN_WHATSAPP_WIDGET } from '@/components/WhatsAppWidget';
export default function WhatsAppLink({className=''}:{className?:string}) {
  return <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_WHATSAPP_WIDGET))} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary hover:bg-success/10 focus-visible:ring-2 focus-visible:ring-ring ${className}`}><WhatsappGlyph className="size-5 shrink-0 text-success" />Message on WhatsApp</button>;
}
