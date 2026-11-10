import {useEffect,useState,type FormEvent} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import {courseInterestEnquiryUrl,courseInterestFromParams,STUDY_AREAS,STUDY_MODES,STUDY_LEVELS} from '@/lib/courseInterest';

const selectClass='mt-2 block min-h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3 py-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
export default function ApplyStart(){
 const navigate=useNavigate();
 const [params]=useSearchParams();
 const paramKey=params.toString();
 const [area,setArea]=useState(()=>courseInterestFromParams(params).area);
 const [mode,setMode]=useState(()=>courseInterestFromParams(params).mode||'undecided');
 const [level,setLevel]=useState(()=>courseInterestFromParams(params).level||'unsure');
 const [course,setCourse]=useState(()=>courseInterestFromParams(params).course||'');
 useEffect(()=>{
  const next=courseInterestFromParams(new URLSearchParams(paramKey));
  setArea(next.area);setMode(next.mode||'undecided');setLevel(next.level||'unsure');setCourse(next.course||'');
 },[paramKey]);
 const selected=STUDY_AREAS.find(option=>option.id===area);
 const continueEnquiry=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  if(!selected)return;
  navigate(courseInterestEnquiryUrl({area,mode,level,course}));
 };
 return <div className="public-site min-h-dvh bg-background">
  <Seo title="Start your application | UniPathway" description="Choose a Pakistan course enquiry or a UK or Germany study-abroad application." canonical="/apply"/>
  <PublicNav/>
  <main className="mx-auto max-w-5xl px-4 py-10 sm:px-8 sm:py-14">
   <p className="text-label text-success">Start here</p>
   <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">Start with the right study route</h1>
   <p className="mt-4 max-w-3xl text-muted-foreground">Choose how you would like to study. For courses in Pakistan, we'll first send your interests to admissions so they can check eligibility, availability and fees. No documents are needed for this first enquiry.</p>
   <ol className="mt-7 grid gap-3 text-sm sm:grid-cols-3" aria-label="How a Pakistan course enquiry works">
    {[
     ['1. Choose','Select a course and study preferences.'],
     ['2. Enquire','Review and send your details securely.'],
     ['3. Admissions review','Our team confirms eligibility, approval, fees and intake.'],
    ].map(([title,detail])=><li key={title} className="rounded-xl border bg-card px-4 py-3"><strong className="block text-foreground">{title}</strong><span className="mt-1 block text-muted-foreground">{detail}</span></li>)}
   </ol>
   <div className="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
    <section className="min-w-0 rounded-2xl border bg-card p-4 sm:p-6" aria-labelledby="pakistan-enquiry-heading">
     <p className="text-label text-success">Study with UniPathway in Pakistan</p>
     <h2 id="pakistan-enquiry-heading" className="mt-2 text-xl font-bold">Find the right course</h2>
     <p className="mt-2 text-sm text-muted-foreground">Online learning across Pakistan, with centre-based options in Jhelum where available.</p>
     {course&&<div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4" role="status">
      <p className="text-sm font-semibold">Selected qualification</p>
      <p className="mt-1 break-words text-sm">{course}</p>
      <p className="mt-2 text-xs text-muted-foreground">This is a catalogue choice, not proof of approval or an available place. Admissions will verify it.</p>
      <button type="button" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4" onClick={()=>{setCourse('');setLevel('unsure');}}>Clear this course choice</button>
     </div>}
     <form className="mt-5 space-y-4" onSubmit={continueEnquiry}>
      <div>
       <label className="block text-sm font-semibold" htmlFor="study-interest-area">What would you like to study? <span aria-hidden="true">*</span></label>
       <select required id="study-interest-area" value={area} onChange={e=>{setArea(e.target.value);setCourse('');setLevel('unsure');}} className={selectClass}>
        <option value="">Choose a learning area</option>
        {STUDY_AREAS.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}
       </select>
       {selected&&<p role="status" className="mt-2 text-sm text-muted-foreground">{selected.detail}</p>}
      </div>
      <div>
       <label className="block text-sm font-semibold" htmlFor="study-interest-level">Preferred level</label>
       <select id="study-interest-level" value={level} onChange={e=>setLevel(e.target.value)} disabled={!!course} aria-describedby={course?'selected-course-level-note':undefined} className={selectClass}>
        {STUDY_LEVELS.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}
       </select>
       {course&&<p id="selected-course-level-note" className="mt-2 text-xs text-muted-foreground">The level comes from your selected qualification. Clear that choice to change the level.</p>}
      </div>
      <div>
       <label className="block text-sm font-semibold" htmlFor="study-interest-mode">Preferred study format</label>
       <select id="study-interest-mode" value={mode} onChange={e=>setMode(e.target.value)} className={selectClass}>
        {STUDY_MODES.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}
       </select>
      </div>
      <p id="study-enquiry-boundary" className="text-sm leading-relaxed text-muted-foreground">This creates a course enquiry, not an enrolment or accepted application. Qualifications, vocational training and practical classes are subject to current authorisation, entry requirements and availability.</p>
      <button type="submit" disabled={!selected} aria-describedby="study-enquiry-boundary" className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">Continue to course enquiry</button>
     </form>
     <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
      <Link className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4" to="/study">Browse all study options</Link>
      <Link className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4" to="/qualifications">Compare qualification pathways</Link>
     </div>
    </section>
    <section className="min-w-0 space-y-4" aria-labelledby="international-applications-heading">
     <h2 id="international-applications-heading" className="text-lg font-bold">Study abroad applications</h2>
     <p className="text-sm text-muted-foreground">Choose a destination to complete the existing step-by-step consultancy application. Admission and visa outcomes are decided by the relevant institutions and authorities.</p>
     {[
      {title:'Study in the United Kingdom',description:'Academic history, documents and university consultancy support.',to:'/tenant/unipathway/apply/uk',label:'Start UK application'},
      {title:'Study in Germany',description:'Language preparation, academic history and destination guidance.',to:'/tenant/unipathway/apply/germany',label:'Start Germany application'},
     ].map(option=><article key={option.to} className="rounded-2xl border bg-card p-5 sm:p-6">
      <h3 className="text-lg font-bold">{option.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{option.description}</p>
      <Link className="mt-4 inline-flex min-h-12 items-center rounded-xl border border-primary px-4 py-3 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to={option.to}>{option.label}</Link>
     </article>)}
    </section>
   </div>
   <p className="mt-8 text-sm text-muted-foreground">Already enrolled? <Link to="/login" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">Sign in to your student portal</Link>.</p>
  </main>
  <PublicFooter/>
 </div>;
}
