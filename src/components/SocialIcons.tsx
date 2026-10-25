import { SOCIAL_LINKS } from '@/lib/publicContact';
import SocialBrandIcon, { type SocialBrand } from '@/components/SocialBrandIcon';
export { SOCIAL_LINKS } from '@/lib/publicContact';
export const WhatsappGlyph = ({className=''}:{className?:string}) => <SocialBrandIcon brand="WhatsApp" className={className}/>;
interface Props {className?:string;iconClassName?:string;variant?:'light'|'dark'}
export default function SocialIcons({className='',iconClassName='size-5',variant='light'}:Props){
 const items: {href:string;label:SocialBrand}[] = [
  {href:SOCIAL_LINKS.facebook,label:'Facebook'}, {href:SOCIAL_LINKS.instagram,label:'Instagram'},
  {href:SOCIAL_LINKS.twitter,label:'X'}, {href:SOCIAL_LINKS.linkedin,label:'LinkedIn'},
  {href:SOCIAL_LINKS.youtube,label:'YouTube'}, {href:SOCIAL_LINKS.tiktok,label:'TikTok'},
  {href:SOCIAL_LINKS.google,label:'Google'},
 ];
 const base='flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors';
 const colours=variant==='dark'?'border-white/20 bg-white/10 text-white':'border-primary/15 bg-primary/5 text-primary';
 return <div className={className}><div aria-label="UniPathway social channels" className="flex flex-wrap gap-2">{items.map(({href,label})=>href?
  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens in a new tab)`} title={label} className={`${base} ${colours} hover:border-success hover:bg-success/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2`}><SocialBrandIcon brand={label} className={iconClassName}/></a>:
  <span key={label} role="img" aria-label={label} title={label} className={`${base} ${colours}`}><SocialBrandIcon brand={label} className={iconClassName}/></span>
 )}</div></div>;
}
