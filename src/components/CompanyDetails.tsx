import { SOCIAL_LINKS, WhatsappGlyph } from '@/components/SocialIcons';
import { WHATSAPP_DISPLAY } from '@/lib/publicContact';

export default function CompanyDetails() {
  return <div className="space-y-4 text-sm leading-relaxed">
    <div><p className="font-semibold">UniPathway Education (Pvt.) Ltd</p>
      <address className="not-italic">10 Civil Lines, Jhelum, 49600, Pakistan</address></div>
    {WHATSAPP_DISPLAY && <p className="flex flex-wrap items-center gap-2"><WhatsappGlyph className="size-4 shrink-0" /><a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">WhatsApp {WHATSAPP_DISPLAY}</a></p>}
    <p>Powered by iTechLounge</p>
    <div><p>A Brand of</p><p className="font-semibold">ITech Education Ltd</p>
      <address className="not-italic">3rd Floor, 45 Albemarle Street, Mayfair, London, W1S 4JL, England</address></div>
  </div>;
}
