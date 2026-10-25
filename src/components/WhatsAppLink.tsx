import { SOCIAL_LINKS } from '@/lib/publicContact';
import { WhatsappGlyph } from '@/components/SocialIcons';
export default function WhatsAppLink({className=''}:{className?:string}){
 const style=`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary ${className}`;
 const icon=<WhatsappGlyph className="size-5 shrink-0 text-success"/>;
 if(!SOCIAL_LINKS.whatsapp)return <span aria-label="WhatsApp" className={style}>{icon}Message on WhatsApp</span>;
 return <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="Message UniPathway on WhatsApp (opens in a new tab)" className={`${style} transition-colors hover:border-success hover:bg-success/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2`}>{icon}Message on WhatsApp</a>;
}
