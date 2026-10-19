import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Award, Building2, CheckCircle2, HeartHandshake, LockKeyhole, ShieldCheck } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
const db:SupabaseClient=supabase;
type Fund={id:string;tenant_id:string;name:string;academic_year:string;status:string;approved_internal_budget_pkr:number;policy_reference:string|null};
type Sponsor={id:string;tenant_id:string;programme_id:string;sponsor_type:string;sponsor_display_reference:string;pledge_pkr:number;verified_received_pkr:number;receipt_reference:string|null};
type Review={id:string;scholarship_case_id:string;reviewer_id:string;recommendation:string;reviewed_at:string};
type Case={id:string;tenant_id:string;programme_id:string;applicant_reference:string;academic_stage:string;age_category:string;academic_score:number|null;academic_evidence_reference:string|null;financial_need_band:string|null;financial_evidence_reference:string|null;guardian_consent_reference:string|null;applicant_consent_reference:string|null;exceptional_context_reference:string|null;applicant_requested_pkr:number;awarded_pkr:number;status:string;independently_reviewed_by:string|null;selection_policy_reference:string|null};
const fmt=(n:number)=>new Intl.NumberFormat('en-PK',{maximumFractionDigits:0}).format(n||0)+' PKR';
const empty={ref:'',stage:'Intermediate / FSc',age:'adult',score:'',academicEvidence:'',need:'unverified',financialEvidence:'',guardian:'',applicantConsent:'',context:'',request:''};

export default function OpportunityFundDashboard(){
 const {user}=useAuth();
 const superadmin=Boolean(user?.roles.includes('superadmin'));
 const director=Boolean(user?.roles.includes('centre_director'));
 const allowed=Boolean(user?.roles.some(r=>['superadmin','centre_director','admissions_admin','finance_officer'].includes(r)));
 const canCreateCase=superadmin||director;
 const canSignReview=director||Boolean(user?.roles.includes('finance_officer'));
 const [tenants,setTenants]=useState<{id:string;name:string}[]>([]),[chosenTenant,setChosenTenant]=useState('');
 const tenant=superadmin?(chosenTenant||user?.tenantId):user?.tenantId;
 const [funds,setFunds]=useState<Fund[]>([]),[sponsors,setSponsors]=useState<Sponsor[]>([]),[cases,setCases]=useState<Case[]>([]),[reviews,setReviews]=useState<Review[]>([]);
 const [selected,setSelected]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0);
 const [fundName,setFundName]=useState(''),[academicYear,setAcademicYear]=useState('2026–2027'),[budget,setBudget]=useState('0'),[fundPolicy,setFundPolicy]=useState('');
 const [sponsorType,setSponsorType]=useState('employer'),[sponsorRef,setSponsorRef]=useState(''),[pledge,setPledge]=useState(''),[received,setReceived]=useState('0'),[receipt,setReceipt]=useState(''),[privacyTerms,setPrivacyTerms]=useState('');
 const [draft,setDraft]=useState(empty),[approve,setApprove]=useState<Record<string,{amount:string;reviewer:string;policy:string;reason:string}>>({});
 const [reviewDraft,setReviewDraft]=useState<Record<string,{merit:string;need:string;evidence:string}>>({});
 useEffect(()=>{if(!superadmin)return;let active=true;void db.from('tenants').select('id,name').order('name').then(({data})=>{if(active)setTenants((data||[]) as {id:string;name:string}[])});return()=>{active=false}},[superadmin]);
 const load=useCallback(async()=>{
   setLoading(true);setError('');setFunds([]);setSponsors([]);setCases([]);setReviews([]);
   if(!allowed||!tenant){setError('A valid UniPathway centre assignment and authorised staff role are required.');setLoading(false);return;}
   try{
     const results=await Promise.all([
       db.from('unipathway_foundation_programmes').select('*').eq('tenant_id',tenant).order('created_at',{ascending:false}),
       db.from('unipathway_foundation_sponsorships').select('*').eq('tenant_id',tenant),
       db.from('unipathway_foundation_scholarship_cases').select('*').eq('tenant_id',tenant).order('created_at',{ascending:false}),
       db.from('unipathway_foundation_case_reviews').select('id,scholarship_case_id,reviewer_id,recommendation,reviewed_at').eq('tenant_id',tenant),
     ]);
     if(results.some(x=>x.error))throw new Error('The Opportunity Fund database is not deployed or tenant permissions have not passed review. No scholarships can be awarded until the existing Lovable Supabase migration is reconciled.');
     const p=(results[0].data||[]) as Fund[],s=(results[1].data||[]) as Sponsor[],c=(results[2].data||[]) as Case[];
     setFunds(p);setSponsors(s);setCases(c);setReviews((results[3].data||[]) as Review[]);setSelected(v=>p.some(x=>x.id===v)?v:p[0]?.id||'');
   }catch(e){setError(e instanceof Error?e.message:'The Opportunity Fund could not be loaded.');}
   finally{setLoading(false);}
 },[allowed,tenant,refresh]);
 useEffect(()=>{void load()},[load]);
 async function run(task:()=>Promise<void>){
   if(busy)return;setError('');setNotice('');setBusy(true);
   try{await task();setNotice('Recorded in the centre-controlled Opportunity Fund. No award, collection or payout is automatic.');setRefresh(n=>n+1);}
   catch(e){setError(e instanceof Error?e.message:'The operation was not saved.');}
   finally{setBusy(false);}
 }
 const fund=funds.find(x=>x.id===selected);
 const fundSpons=sponsors.filter(x=>x.programme_id===selected);
 const fundCases=cases.filter(x=>x.programme_id===selected);
 async function openFund(){
   if(!superadmin||!fund||!tenant)return;
   await run(async()=>{
     const r=await db.from('unipathway_foundation_programmes').update({status:'open'}).eq('id',fund.id).eq('tenant_id',tenant).select('id');
     if(r.error)throw r.error;if(!r.data?.length)throw new Error('Could not authorise this fund for applications.');
   });
 }
 async function sendForReview(c:Case){
   if(!director||!tenant)return;
   if(c.status!=='draft'&&c.status!=='evidence_review')return;
   if(c.academic_score===null||!c.academic_evidence_reference||!c.financial_evidence_reference||!c.applicant_consent_reference||(c.age_category==='minor'&&!c.guardian_consent_reference)){
     setError('Academic and financial evidence, applicant consent and guardian consent when applicable must be verified before panel review.');return;
   }
   await run(async()=>{
     const r=await db.from('unipathway_foundation_scholarship_cases').update({status:'panel_review'}).eq('id',c.id).eq('tenant_id',tenant).select('id');
     if(r.error)throw r.error;if(!r.data?.length)throw new Error('Case review stage could not be changed.');
   });
 }
 async function signIndependentReview(c:Case){
   if(!canSignReview||!user||!tenant||c.status!=='panel_review')return;
   const review=reviewDraft[c.id];
   if(!review||review.merit.trim().length<10||review.need.trim().length<10||!review.evidence.trim()){
     setError('Independent review requires a documented academic assessment, financial-need assessment and a private evidence reference.');return;
   }
   await run(async()=>{
     const r=await db.from('unipathway_foundation_case_reviews').insert({
       tenant_id:tenant,scholarship_case_id:c.id,reviewer_id:user.id,recommendation:'eligible',
       merit_assessment:review.merit.trim(),financial_need_assessment:review.need.trim(),
       review_evidence_reference:review.evidence.trim(),
     });
     if(r.error)throw r.error;
   });
 }
 const totals=useMemo(()=>{
   const committed= fundSpons.reduce((sum,s)=>sum+Number(s.pledge_pkr),0);
   const received= fundSpons.reduce((sum,s)=>sum+Number(s.verified_received_pkr),0);
   const authorised=Number(fund?.approved_internal_budget_pkr||0);
   const awarded=fundCases.filter(c=>c.status==='approved').reduce((sum,c)=>sum+Number(c.awarded_pkr),0);
   return {committed,received,authorised,awarded,remaining:Math.max(0,authorised+received-awarded)};
 },[fundSpons,fundCases,fund]);
 async function addFund(){
   if(!superadmin||!tenant||fundName.trim().length<4||!academicYear.trim()||!Number.isFinite(Number(budget))||Number(budget)<0||!fundPolicy.trim()){
     setError('Superadmin must specify a programme name, academic year, authorised internal budget and selection policy reference.');return;
   }
   await run(async()=>{
     const q=await db.from('unipathway_foundation_programmes').insert({tenant_id:tenant,name:fundName.trim(),academic_year:academicYear.trim(),approved_internal_budget_pkr:Number(budget),policy_reference:fundPolicy.trim(),status:'planning'});
     if(q.error)throw q.error;setFundName('');setBudget('0');
   });
 }
 async function addSponsor(){
   if(!superadmin||!tenant||!selected||!sponsorRef.trim()||Number(pledge)<=0||Number(received)<0||Number(received)>Number(pledge)|| (Number(received)>0&&!receipt.trim())){
     setError('Enter a verified sponsorship reference and a valid pledge. Actual money received requires its bank/accounting receipt reference.');return;
   }
   await run(async()=>{
     const q=await db.from('unipathway_foundation_sponsorships').insert({tenant_id:tenant,programme_id:selected,sponsor_type:sponsorType,
       sponsor_display_reference:sponsorRef.trim(),pledge_pkr:Number(pledge),verified_received_pkr:Number(received),
       receipt_reference:receipt.trim()||null,verified_by:Number(received)>0?user?.id:null,
       verified_at:Number(received)>0?new Date().toISOString():null,
       privacy_terms_reference:privacyTerms.trim()||null});
     if(q.error)throw q.error;setPledge('');setReceived('0');setReceipt('');
   });
 }
 async function createCase(){
   if(!canCreateCase||!tenant||!selected||draft.ref.trim().length<8||Number(draft.request)<=0||
    (draft.age==='minor'&&!draft.guardian.trim())){
      setError('Use an opaque applicant reference, requested fee support, and guardian consent evidence when the learner is under 18.');return;
   }
   await run(async()=>{
     const q=await db.from('unipathway_foundation_scholarship_cases').insert({
       tenant_id:tenant,programme_id:selected,applicant_reference:draft.ref.trim(),academic_stage:draft.stage,
       age_category:draft.age,academic_score:draft.score?Number(draft.score):null,
       academic_evidence_reference:draft.academicEvidence.trim()||null,
       financial_need_band:draft.need,
       financial_evidence_reference:draft.financialEvidence.trim()||null,
       guardian_consent_reference:draft.guardian.trim()||null,
       applicant_consent_reference:draft.applicantConsent.trim()||null,
       exceptional_context_reference:draft.context.trim()||null,
       applicant_requested_pkr:Number(draft.request),status:'draft',awarded_pkr:0,
     });
     if(q.error)throw q.error;setDraft(empty);
   });
 }
 async function approveCase(c:Case){
   if(!superadmin||!user||!tenant)return;
   const a=approve[c.id];
   if(!a||Number(a.amount)<=0||Number(a.amount)>Number(c.applicant_requested_pkr)||
    !reviews.some(r=>r.scholarship_case_id===c.id&&r.recommendation==='eligible'&&r.reviewer_id===a.reviewer&&r.reviewer_id!==user.id)||!a.policy.trim()||!a.reason.trim()||
    !c.academic_evidence_reference||!c.financial_evidence_reference||!c.applicant_consent_reference){
    setError('An independently reviewed, documented merit-and-need decision, verified applicant consent, sufficient funding and a second approver are required.');return;
   }
   await run(async()=>{
     const q=await db.from('unipathway_foundation_scholarship_cases').update({
       status:'approved',awarded_pkr:Number(a.amount),independently_reviewed_by:a.reviewer.trim(),
       selection_policy_reference:a.policy.trim(),selection_notes:a.reason.trim(),
       approved_by:user.id,approved_at:new Date().toISOString(),
     }).eq('id',c.id).eq('tenant_id',tenant).select('id');
     if(q.error)throw q.error;if(!q.data?.length)throw new Error('Approval was denied by scholarship authorisation controls.');
   });
 }
 return <DashboardLayout title="UniPathway Foundation / Opportunity Fund" subtitle="Human-reviewed merit and financial-need scholarships, confirmed funding and private student evidence">
  <div className="space-y-6">
   {superadmin&&tenants.length>0&&<label className="block rounded-xl border bg-card p-4 text-sm font-semibold">Centre
      <select value={tenant||''} onChange={e=>{setChosenTenant(e.target.value);setSelected('')}} className="mt-2 block h-10 w-full max-w-md rounded-md border bg-background px-3">
      {tenants.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
   <section className="rounded-xl border bg-card p-6"><ShieldCheck className="size-7 text-success"/><h2 className="mt-3 text-xl font-bold">Merit, financial need and safeguarding</h2><p className="mt-2 text-sm text-muted-foreground">The fund is not an automated grant engine. Verified academic achievement and financial barriers are reviewed by authorised staff. Support for rural communities, disabled learners and other access needs is considered contextually, not via discriminatory automated rankings. Employers sponsor funding programmes—not access to children's financial or school records. The Foundation's charitable status is not assumed.</p><Button className="mt-4" variant="outline" disabled={busy} onClick={()=>setRefresh(v=>v+1)}>Refresh evidence</Button>
     {loading&&<p role="status" className="mt-3 text-sm">Loading protected fund information…</p>}{error&&<p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}{notice&&<p role="status" className="mt-3 text-sm text-success">{notice}</p>}
   </section>
   {!loading&&!error&&<>
    {superadmin&&<section className="rounded-xl border bg-card p-5"><h2 className="text-lg font-bold">Create an internally authorised fund</h2><div className="mt-4 grid gap-3 md:grid-cols-2">
      <label className="text-sm font-medium">Programme name<Input className="mt-1" value={fundName} onChange={e=>setFundName(e.target.value)}/></label>
      <label className="text-sm font-medium">Academic year<Input className="mt-1" value={academicYear} onChange={e=>setAcademicYear(e.target.value)}/></label>
      <label className="text-sm font-medium">Authorised internal budget (PKR)<Input className="mt-1" type="number" min="0" value={budget} onChange={e=>setBudget(e.target.value)}/></label>
      <label className="text-sm font-medium">Selection-policy document reference<Input className="mt-1" value={fundPolicy} onChange={e=>setFundPolicy(e.target.value)}/></label></div><Button className="mt-4" disabled={busy} onClick={()=>void addFund()}>Save planning fund</Button></section>}
    <section className="rounded-xl border bg-card p-5"><h2 className="text-lg font-bold">Choose funding programme</h2><select value={selected} onChange={e=>setSelected(e.target.value)} className="mt-3 block h-10 w-full max-w-2xl rounded-md border bg-background px-3">
     <option value="">Select a fund</option>{funds.map(x=><option value={x.id} key={x.id}>{x.name} · {x.academic_year} · {x.status}</option>)}</select>
     {!funds.length&&<p className="mt-3 text-sm text-muted-foreground">No approved or proposed Opportunity Fund programmes are recorded.</p>}
    </section>
    {fund&&<>
      {superadmin&&fund.status==='planning'&&<div className="rounded-xl border bg-secondary/40 p-5"><p className="text-sm font-semibold">This fund is still in planning and cannot make awards.</p><Button variant="outline" className="mt-3" disabled={busy} onClick={()=>void openFund()}>Open fund for independent scholarship reviews</Button></div>}
      <section className="grid gap-3 md:grid-cols-4">{[
       {title:'Authorised budget',value:fmt(totals.authorised)},{title:'Employer and donor pledges',value:fmt(totals.committed)},
       {title:'Verified donations received',value:fmt(totals.received)},{title:'Unallocated verified funds',value:fmt(totals.remaining)},
      ].map(x=><article key={x.title} className="rounded-xl border p-5"><p className="text-xs text-muted-foreground">{x.title}</p><p className="mt-2 text-xl font-bold">{x.value}</p></article>)}</section>
      <p className="text-xs text-muted-foreground">Approved commitments total {fmt(totals.awarded)}. Pledged but unreceived money does not increase funds available for awards. Approval does not establish payment or charitable tax relief.</p>
      {superadmin&&<section className="rounded-xl border bg-card p-5"><h2 className="text-lg font-bold">Record an employer or community sponsorship</h2><p className="mt-2 text-sm text-muted-foreground">Employer identity and donation receipts remain visible only to authorised funding staff. Sponsorship never grants candidate-case access.</p>
       <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm">Funder type<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={sponsorType} onChange={e=>setSponsorType(e.target.value)}>{['employer','organisation','private_donor','institution'].map(x=><option key={x} value={x}>{x.replace('_',' ')}</option>)}</select></label>
        <label className="text-sm">Private funder reference<Input className="mt-1" value={sponsorRef} onChange={e=>setSponsorRef(e.target.value)} placeholder="Internal approved organisation identifier"/></label>
        <label className="text-sm">Pledged amount PKR<Input className="mt-1" type="number" min="1" value={pledge} onChange={e=>setPledge(e.target.value)}/></label>
        <label className="text-sm">Verified actual received PKR<Input className="mt-1" type="number" min="0" value={received} onChange={e=>setReceived(e.target.value)}/></label>
        <label className="text-sm">Bank/accounting receipt reference<Input className="mt-1" value={receipt} onChange={e=>setReceipt(e.target.value)}/></label>
        <label className="text-sm">Privacy and funding agreement reference<Input className="mt-1" value={privacyTerms} onChange={e=>setPrivacyTerms(e.target.value)}/></label>
       </div><Button className="mt-4" disabled={busy} onClick={()=>void addSponsor()}>Record sponsor commitment</Button></section>}
      {canCreateCase&&<section className="rounded-xl border bg-card p-5"><h2 className="text-lg font-bold">Create a confidential scholarship assessment</h2>
       <p className="mt-2 text-sm text-muted-foreground">Use a random internal applicant reference. Keep raw income evidence, identity information, disability documentation and guardian verification in private controlled records, not here or in employer portals.</p>
       <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm">Opaque applicant reference<Input className="mt-1" value={draft.ref} onChange={e=>setDraft(p=>({...p,ref:e.target.value}))}/></label>
        <label className="text-sm">Academic stage<Input className="mt-1" value={draft.stage} onChange={e=>setDraft(p=>({...p,stage:e.target.value}))}/></label>
        <label className="text-sm">Age/consent category<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={draft.age} onChange={e=>setDraft(p=>({...p,age:e.target.value}))}><option value="adult">18 or over</option><option value="minor">Under 18 (guardian consent mandatory)</option></select></label>
        <label className="text-sm">Verified academic merit measure (0–100)<Input className="mt-1" type="number" min="0" max="100" value={draft.score} onChange={e=>setDraft(p=>({...p,score:e.target.value}))}/></label>
        <label className="text-sm">Academic evidence reference<Input className="mt-1" value={draft.academicEvidence} onChange={e=>setDraft(p=>({...p,academicEvidence:e.target.value}))}/></label>
        <label className="text-sm">Financial need assessment<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={draft.need} onChange={e=>setDraft(p=>({...p,need:e.target.value}))}><option value="unverified">Not yet verified</option><option value="critical">Critical barrier</option><option value="high">High need</option><option value="moderate">Moderate need</option></select></label>
        <label className="text-sm">Private financial evidence reference<Input className="mt-1" value={draft.financialEvidence} onChange={e=>setDraft(p=>({...p,financialEvidence:e.target.value}))}/></label>
        <label className="text-sm">Guardian consent reference<Input className="mt-1" value={draft.guardian} onChange={e=>setDraft(p=>({...p,guardian:e.target.value}))}/></label>
        <label className="text-sm">Student/applicant consent reference<Input className="mt-1" value={draft.applicantConsent} onChange={e=>setDraft(p=>({...p,applicantConsent:e.target.value}))}/></label>
        <label className="text-sm">Funding sought PKR<Input className="mt-1" type="number" min="1" value={draft.request} onChange={e=>setDraft(p=>({...p,request:e.target.value}))}/></label>
        <label className="text-sm md:col-span-2">Exceptional access needs (restricted reference only)<Input className="mt-1" value={draft.context} onChange={e=>setDraft(p=>({...p,context:e.target.value}))}/></label>
       </div><Button className="mt-4" disabled={busy} onClick={()=>void createCase()}>Create private draft case</Button></section>}
      <section className="rounded-xl border bg-card p-5"><h2 className="text-lg font-bold">Confidential review register</h2><p className="mt-2 text-sm text-muted-foreground">Cases below use opaque references. Financial files are never provided to external employers or schools. The fund administrator must record merit and need evidence, independent review and verified funding before an award.</p>
       <div className="mt-4 space-y-3">{fundCases.map(c=><article key={c.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold">{c.applicant_reference}</p><span className="text-xs text-muted-foreground">{c.status.replace(/_/g,' ')}</span></div><p className="mt-2 text-xs text-muted-foreground">{c.academic_stage} · academic review {c.academic_score===null?'pending':c.academic_score+'/100'} · financial assessment {c.financial_need_band||'pending'}</p><p className="mt-1 text-xs text-muted-foreground">Requested {fmt(c.applicant_requested_pkr)} · approved {fmt(c.awarded_pkr)}</p>
        {director&&['draft','evidence_review'].includes(c.status)&&<Button size="sm" variant="outline" className="mt-3" disabled={busy} onClick={()=>void sendForReview(c)}>Send evidence to independent panel</Button>}
        {canSignReview&&c.status==='panel_review'&&!reviews.some(r=>r.scholarship_case_id===c.id&&r.reviewer_id===user?.id)&&
          <div className="mt-4 space-y-3 rounded-lg border p-4"><h4 className="font-semibold">Sign an independent merit-and-need assessment</h4>
          <p className="text-xs text-muted-foreground">You cannot review a case you created; only authorised staff may sign independent assessments. Enter references, not detailed family financial records.</p>
          <label className="block text-sm">Academic assessment<Textarea className="mt-1" value={reviewDraft[c.id]?.merit||''} onChange={e=>setReviewDraft(v=>({...v,[c.id]:{...v[c.id],merit:e.target.value,need:v[c.id]?.need||'',evidence:v[c.id]?.evidence||''}}))}/></label>
          <label className="block text-sm">Financial-need assessment<Textarea className="mt-1" value={reviewDraft[c.id]?.need||''} onChange={e=>setReviewDraft(v=>({...v,[c.id]:{...v[c.id],need:e.target.value,merit:v[c.id]?.merit||'',evidence:v[c.id]?.evidence||''}}))}/></label>
          <label className="block text-sm">Private review reference<Input className="mt-1" value={reviewDraft[c.id]?.evidence||''} onChange={e=>setReviewDraft(v=>({...v,[c.id]:{...v[c.id],evidence:e.target.value,merit:v[c.id]?.merit||'',need:v[c.id]?.need||''}}))}/></label>
          <Button size="sm" disabled={busy} onClick={()=>void signIndependentReview(c)}>Sign independent assessment</Button>
          </div>}
        {reviews.filter(r=>r.scholarship_case_id===c.id).length>0&&<p className="mt-2 text-xs text-success">Signed independent reviews: {reviews.filter(r=>r.scholarship_case_id===c.id).length}. Only a separate authorised approver may award funding.</p>}
        {superadmin&&c.status!=='approved'&&<div className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-2"><label className="text-sm">Approved amount PKR<Input className="mt-1" type="number" min="1" max={c.applicant_requested_pkr} value={approve[c.id]?.amount||''} onChange={e=>setApprove(p=>({...p,[c.id]:{...p[c.id],amount:e.target.value,reviewer:p[c.id]?.reviewer||'',policy:p[c.id]?.policy||'',reason:p[c.id]?.reason||''}}))}/></label><label className="text-sm">Verified independent reviewer<select className="mt-1 block h-10 w-full rounded-md border bg-background px-3" value={approve[c.id]?.reviewer||''} onChange={e=>setApprove(p=>({...p,[c.id]:{...p[c.id],amount:p[c.id]?.amount||'',reviewer:e.target.value,policy:p[c.id]?.policy||'',reason:p[c.id]?.reason||''}}))}><option value="">Select signed review</option>{reviews.filter(r=>r.scholarship_case_id===c.id&&r.recommendation==='eligible'&&r.reviewer_id!==user?.id).map(r=><option key={r.id} value={r.reviewer_id}>Reviewer {r.reviewer_id.slice(0,8)} · {r.reviewed_at.slice(0,10)}</option>)}</select></label><label className="text-sm">Selection policy reference<Input className="mt-1" value={approve[c.id]?.policy||''} onChange={e=>setApprove(p=>({...p,[c.id]:{...p[c.id],amount:p[c.id]?.amount||'',reviewer:p[c.id]?.reviewer||'',policy:e.target.value,reason:p[c.id]?.reason||''}}))}/></label><label className="text-sm">Human decision explanation<Textarea className="mt-1" value={approve[c.id]?.reason||''} onChange={e=>setApprove(p=>({...p,[c.id]:{...p[c.id],amount:p[c.id]?.amount||'',reviewer:p[c.id]?.reviewer||'',policy:p[c.id]?.policy||'',reason:e.target.value}}))}/></label><Button disabled={busy} onClick={()=>void approveCase(c)}>Authorise award subject to budget gate</Button></div>}
       </article>)}{!fundCases.length&&<p className="text-sm text-muted-foreground">No scholarship cases recorded.</p>}</div>
      </section>
    </>}
   </>}
  </div>
 </DashboardLayout>;
}
