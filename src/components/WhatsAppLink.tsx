import { SOCIAL_LINKS } from '@/lib/publicContact';
import { WhatsappGlyph } from '@/components/SocialIcons';

export default function WhatsAppLink({ className = '' }: { className?: string }) {
  if (!SOCIAL_LINKS.whatsapp) return null;
  return <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer"
    aria-label="Message UniPathway on WhatsApp (opens in a new tab)"
    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-success/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${className}`}>
    <WhatsappGlyph className="size-5 shrink-0 text-success" />Message on WhatsApp
  </a>;
}
