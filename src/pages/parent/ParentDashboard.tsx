import ParentWeeklyOverview from '@/components/guardian/ParentWeeklyOverview';
import {validResults,type Student} from '@/lib/guardianResults';
import ParentNavigation from '@/components/guardian/ParentNavigation';
import {parentPages} from '@/lib/parentNavigation';
import {Link,useLocation,useSearchParams} from 'react-router-dom';
import {GuardianActivity} from '@/components/guardian/GuardianAccess';
import {useEffect,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {ShieldCheck,Users} from 'lucide-react';
export default function ParentDashboard(){
 const {user}=useAuth();const {pathname}=useLocation();const identity=`${user?.id}:${user?.tenantId}:${user?.roles?.join(',')||user?.role}`;
 if(pathname==='/parent/progress')return <ParentResults key={identity}/>;
 const view=pathname==='/parent/messages'?'communication':pathname==='/parent/attendance'?'attendance':pathname==='/parent/schedule'?'schedule':'all';
 return <DashboardLayout title={parentPages.find(p=>p[1]===pathname)?.[0]||'Parent portal'} subtitle="Your learner’s shared updates"><ParentNavigation/>
 {view==='all'?<ParentWeeklyOverview key={identity}/>:<GuardianActivity key={`${identity}:${view}`} view={view}/>}
 </DashboardLayout>;
}
function ParentResults(){
 const {user}=useAuth();const [params,setParams]=useSearchParams();const [students,setStudents]=useState<Student[]>([]),[selected,setSelected]=useState('');
 const [search,setSearch]=useState(''),[page,setPage]=useState(0);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');setStudents([]);setSelected('');setPage(0);
  if(!user?.id){setLoading(false);setError('Sign in to view shared results.');return;}
  void (async()=>{try{const r=await db.rpc('get_unipathway_guardian_results');if(r.error||!validResults(r.data))throw Error('Unverified results');
   if(active){const list:Student[]=r.data;setStudents(list);setSelected(list.some(s=>s.id===params.get('learner'))?params.get('learner')!:list[0]?.id||'');}
  }catch{if(active)setError('Shared results could not be verified. No results are shown until verification succeeds.');}finally{if(active)setLoading(false);}})();
  return()=>{active=false;};
 },[user?.id,refresh]);
 const current=students.find(s=>s.id===selected);
 const results=current?.results.filter(r=>r.title.toLowerCase().includes(search.toLowerCase()))||[];
 return <DashboardLayout title="Parent & Guardian Portal" subtitle="Released coursework results shared by your linked learner">
  <section className="mb-5 rounded-xl border bg-primary/5 p-4">
   <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5"/>Verified, learner-approved access</h2>
   <p className="mt-2 text-sm text-muted-foreground">Your centre must verify the link and the learner must choose to share. Only independently marked, quality-approved released coursework results appear here. These are internal assessment points, not external examination grades or certificates.</p>
  </section>
  <ParentNavigation />
  <Button variant="outline" disabled={loading} onClick={()=>setRefresh(x=>x+1)}>Refresh results</Button>
  {loading&&<p role="status" className="mt-5">Checking shared results…</p>}
  {error&&<p role="alert" className="mt-5 rounded-xl border border-destructive p-4">{error}</p>}
  {!loading&&!error&&!students.length&&<div className="mt-5 rounded-xl border p-8 text-center"><Users className="mx-auto size-8 text-muted-foreground"/><h2 className="mt-3 font-semibold">No linked learners</h2><p className="mt-2 text-sm text-muted-foreground">Contact admissions to arrange a verified parent or guardian link.</p></div>}
  {!loading&&!error&&students.length>0&&<>
   <div className="my-5 flex flex-wrap gap-2" aria-label="Linked learners">{students.map((s,i)=><Button key={s.id} variant={s.id===selected?'default':'outline'} aria-pressed={s.id===selected} onClick={()=>{setSelected(s.id);setParams({learner:s.id});setSearch('');setPage(0);}}>{s.student_name||`Pending link ${i+1}`}</Button>)}</div>
   {current&&!current.sharing&&<section className="rounded-xl border p-6"><h2 className="font-semibold">{current.verified?'Awaiting learner permission':'Awaiting centre verification'}</h2><p className="mt-2 text-sm text-muted-foreground">Results remain private until centre verification and learner permission are both in place.</p></section>}
   {current?.sharing&&<section><h2 className="text-xl font-semibold">{current.student_name}</h2><p className="mt-1 text-sm text-muted-foreground">Showing {current.results.length} of up to 250 latest released results · each scored out of 100</p>
    {!current.results.length&&<p className="mt-4 rounded-xl border p-6">No released coursework results yet. Pending marking is not a zero score.</p>}
    <label className="mt-4 block">Search released results<input className="block rounded border bg-background p-2" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></label>{search&&!results.length&&<p>No released results match this search.</p>}<div className="mt-4 space-y-4">{results.slice(page*20,page*20+20).map(r=><article key={r.attempt_id} className="rounded-xl border bg-card p-5">
     <h3 className="font-semibold">{r.title}</h3><p className="mt-2 text-2xl font-bold">{r.final_score}/100</p>
     <p className="mt-1 text-xs text-muted-foreground">Released {new Date(r.released_at).toLocaleDateString()}{r.amended?' · Includes an approved correction':''}</p>
     <h4 className="mt-4 text-sm font-semibold">Approved feedback</h4><p className="mt-2 whitespace-pre-wrap text-sm">{r.feedback}</p>
    </article>)}</div>{results.length>20&&<nav aria-label="Shared results pages" className="mt-4 flex items-center gap-3"><Button disabled={!page} onClick={()=>setPage(p=>p-1)}>Previous results</Button><span>Page {page+1} of {Math.ceil(results.length/20)}</span><Button disabled={(page+1)*20>=results.length} onClick={()=>setPage(p=>p+1)}>Next results</Button></nav>}
   </section>}
  </>}
 </DashboardLayout>;
}
