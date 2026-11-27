import {Link} from 'react-router-dom';
import {ArrowRight,ArrowUpRight} from 'lucide-react';
import {internationalAdviceUrl,type InternationalAdviceId} from '@/lib/internationalAdvice';
export const visaInformationTopics:readonly {id:InternationalAdviceId;title:string;detail:string}[]=[
 {id:'student-visa',title:'Study and training',detail:'Student, study permit and training categories; university admission and immigration approval are separate.'},
 {id:'post-study',title:'Post-study employment',detail:'Graduate and eligible practical-training routes after study; course, institution and residence rules differ.'},
 {id:'work-visa',title:'Work and longer-term employment',detail:'Employer sponsorship, skilled work, business and other employment categories, each with its own criteria.'},
 {id:'family-visa',title:'Marriage, spouse and family',detail:'Partner, spouse, fiancé(e), dependant and family reunification routes; seek qualified advice on individual eligibility.'},
 {id:'visit-visa',title:'Visit, business and transit',detail:'Official short-stay and travel categories, including Schengen travel where applicable.'},
];
export const officialVisaPortals=[
 {country:'United Kingdom',url:'https://www.gov.uk/browse/visas-immigration'},
 {country:'Australia',url:'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing'},
 {country:'Canada',url:'https://www.canada.ca/en/services/immigration-citizenship.html'},
 {country:'Germany',url:'https://www.auswaertiges-amt.de/en/visa-service/visa-navigator-2489244'},
 {country:'United States',url:'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/all-visa-categories.html'},
 {country:'European Union',url:'https://home-affairs.ec.europa.eu/policies/migration-and-asylum/eu-immigration-portal_en'},
] as const;
export default function GlobalVisaGuidance(){
 return <section id="global-visa-guidance" aria-labelledby="global-visa-title" className="scroll-mt-28 space-y-5">
  <header><p className="text-xs font-bold uppercase tracking-widest text-success">Global visa information and referrals</p><h2 id="global-visa-title" className="mt-2 text-2xl font-bold sm:text-3xl">Explore study, work and family routes worldwide</h2><p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Choose the purpose of your enquiry. We can help you find official information and discuss referral to a suitably qualified or authorised immigration professional where required. No destination or visa category is automatically available to every applicant.</p></header>
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visaInformationTopics.map(topic=><article key={topic.id} className="flex min-w-0 flex-col rounded-2xl border bg-card p-5"><h3 className="font-semibold">{topic.title}</h3><p className="mt-2 flex-1 text-sm text-muted-foreground">{topic.detail}</p><Link to={internationalAdviceUrl(topic.id)} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4">Request information <ArrowRight aria-hidden="true" className="size-4 shrink-0"/></Link></article>)}</div>
  <section className="rounded-2xl border bg-card p-5 sm:p-6" aria-label="Official immigration portals"><h3 className="text-lg font-bold">Official immigration portals</h3><p className="mt-2 text-sm text-muted-foreground">Start with the official authority for your destination and current application date. For other countries, use the relevant government's immigration authority or embassy; tell us which destination you are researching in your enquiry. Our detailed study guides are separate.</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{officialVisaPortals.map(entry=><a key={entry.country} href={entry.url} className="flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm font-semibold underline underline-offset-4">{entry.country}<ArrowUpRight aria-hidden="true" className="size-4 shrink-0"/></a>)}</div><p className="mt-4 text-xs text-muted-foreground">Information is not individual legal or immigration advice. Do not send passports, financial records or marriage certificates through a general enquiry. No admission, visa, job, sponsorship or settlement is guaranteed.</p></section>
 </section>;
}
