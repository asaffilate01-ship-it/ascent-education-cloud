import {useState,type FormEvent} from 'react';
import {Link,useLocation,useNavigate,useSearchParams} from 'react-router-dom';
import {ArrowRight,CalendarDays,ClipboardCheck,ShieldCheck} from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import {Button} from '@/components/ui/button';
import {consultationOptions,preparationItems,consultationContactUrl,normaliseConsultation,normalisePreparation,consultationDateBounds,normaliseConsultationDate,consultationAcademicGuidance,type ConsultationChoices,type ConsultationState} from '@/lib/consultationRequest';

const fields:{key:keyof ConsultationChoices;label:string}[]=[
 {key:'destination',label:'Preferred study destination'},
 {key:'education',label:'Highest completed education'},
 {key:'goal',label:'Study goal'},
 {key:'format',label:'Preferred consultation format'},
 {key:'window',label:'Preferred time window'},
];

export default function ConsultationRequest(){
 const navigate=useNavigate();
 const {state}=useLocation();
 const [params]=useSearchParams();
 const [choices,setChoices]=useState<ConsultationChoices>(()=>normaliseConsultation(state?.consultation??{destination:params.get('destination')}));
 const [prepared,setPrepared]=useState<string[]>(()=>normalisePreparation(state?.prepared));
 const [preferredDate,setPreferredDate]=useState(()=>normaliseConsultationDate(state?.preferredDate));
 const [dateError,setDateError]=useState('');
 const bounds=consultationDateBounds();
 const guidance=consultationAcademicGuidance(choices);
 function continueToContact(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const validatedDate=normaliseConsultationDate(preferredDate);
  if(preferredDate&&!validatedDate){setDateError('Choose a date from today to 90 days ahead in Pakistan time, or leave it blank.');return;}
  const state:ConsultationState={consultation:choices,prepared,preferredDate:validatedDate};
  navigate(consultationContactUrl,{state});
 }
 return <div className="public-site min-h-dvh bg-background">
  <Seo canonical="/consultation" title="Request an education consultation | UniPathway" description="Prepare for a UniPathway education consultation in Jhelum or online, compare study goals and request an adviser appointment."/>
  <PublicNav/>
  <div className="mx-auto max-w-6xl min-w-0 space-y-6 px-4 py-8 sm:px-8 sm:py-12">
   <header className="rounded-3xl bg-primary p-6 text-primary-foreground sm:p-10">
    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest"><CalendarDays aria-hidden="true" className="size-5"/> Education consultation</p>
    <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">Plan your next step with an adviser</h1>
    <p className="mt-4 max-w-3xl leading-relaxed">Tell us what you would like to study, how you prefer to meet and what you have already prepared. Our admissions team can review your request and confirm the next steps.</p>
   </header>
   <form onSubmit={continueToContact} className="grid min-w-0 items-start gap-5 lg:grid-cols-2">
    <section className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6" aria-labelledby="consultation-preferences">
     <h2 id="consultation-preferences" className="text-xl font-bold">Your study and meeting preferences</h2>
     <p className="mt-2 text-sm text-muted-foreground">If you are unsure, choose the default option. No personal documents are required.</p>
     <div className="mt-5 grid gap-4 sm:grid-cols-2">{fields.map(field=><label key={field.key} className="block min-w-0 text-sm font-semibold" htmlFor={'consultation-'+field.key}>{field.label}
      <select id={'consultation-'+field.key} value={choices[field.key]} onChange={e=>setChoices(old=>({...old,[field.key]:e.target.value}))} className="mt-2 block min-h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-base font-normal text-foreground focus-visible:ring-2 focus-visible:ring-ring">{consultationOptions[field.key].map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label>)}</div>
     <div className="mt-4"><label className="block text-sm font-semibold" htmlFor="consultation-date">Preferred meeting date (optional)</label><input id="consultation-date" type="date" value={preferredDate} min={bounds.min} max={bounds.max} aria-describedby="consultation-date-help" onChange={e=>{setPreferredDate(e.target.value);setDateError('');}} className="mt-2 block min-h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-base"/><p id="consultation-date-help" className="mt-2 text-xs text-muted-foreground">Pakistan calendar date, up to 90 days ahead. Leave blank if flexible. Dates are not verified available slots.</p>{dateError&&<p role="alert" className="mt-2 text-sm text-destructive">{dateError}</p>}</div>
     <p className="mt-5 rounded-xl border p-4 text-sm text-muted-foreground">Meeting format and time are preferences only. An adviser must confirm availability, any fee and the appointment directly. No booking has been made.</p>
    </section>
    <section className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6" aria-labelledby="readiness-checklist">
     <h2 id="readiness-checklist" className="flex items-center gap-2 text-xl font-bold"><ClipboardCheck aria-hidden="true" className="size-5 shrink-0 text-primary"/> Preparation checklist</h2>
     <p className="mt-2 text-sm text-muted-foreground">Optional self-checks to help prepare for the conversation. This is not a university or visa eligibility score.</p>
     <p role="status" className="mt-4 text-sm font-semibold">{prepared.length} of {preparationItems.length} preparation items considered</p>
     <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-primary transition-all" style={{width:(prepared.length/preparationItems.length*100)+'%'}}/></div>
     <div className="mt-4 space-y-3">{preparationItems.map(item=><label key={item.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3"><input type="checkbox" className="mt-1 size-5 shrink-0 accent-primary" checked={prepared.includes(item.id)} onChange={e=>setPrepared(old=>e.target.checked?[...old,item.id]:old.filter(id=>id!==item.id))}/><span className="min-w-0"><span className="block text-sm font-semibold">{item.label}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{item.help}</span></span></label>)}</div>
    </section>
    <section className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6 lg:col-span-2" aria-labelledby="academic-preparation"><h2 id="academic-preparation" className="text-xl font-bold">Questions to ask your adviser</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{guidance.question}</p>{guidance.additional&&<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{guidance.additional}</p>}{guidance.guide&&<Link to={guidance.guide.url} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4">Read the {guidance.guide.name} study and visa guide <ArrowRight aria-hidden="true" className="ml-2 size-4"/></Link>}<p className="mt-3 text-xs text-muted-foreground">These preparation suggestions are not an eligibility decision or guarantee of admission.</p></section>
    <section className="rounded-2xl border bg-muted/40 p-5 sm:p-6 lg:col-span-2">
     <h2 className="flex items-center gap-2 text-base font-semibold"><ShieldCheck aria-hidden="true" className="size-5 shrink-0"/> Review before sending</h2>
     <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Your choices will be carried into the existing contact form, where you can review and edit the message before sending. This is not an admissions application, visa assessment or confirmed booking. Do not include identity documents, financial statements or medical information.</p>
     <div className="mt-4 flex flex-wrap gap-3"><Button type="submit" className="min-h-12 w-full sm:w-auto">Continue to consultation request <ArrowRight aria-hidden="true" className="ml-2 size-4"/></Button><Button variant="outline" asChild className="min-h-12"><Link to="/international-study">Explore destinations</Link></Button></div>
    </section>
   </form>
  </div>
  <PublicFooter/>
 </div>;
}
