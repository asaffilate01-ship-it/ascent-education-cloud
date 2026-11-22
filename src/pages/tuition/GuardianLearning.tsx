import {useSearchParams} from 'react-router-dom';
import ParentNavigation from '@/components/guardian/ParentNavigation';
import {useCallback,useEffect,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import TuitionReports from '@/components/tuition/TuitionReports';
import {learningLabels} from '@/lib/tuitionLearning';
import {tuitionReportsEnabled} from '@/lib/tuitionReports';
type Summary={link_id?:string;id:string;student_name:string;module_title:string;goal:string;skills:Array<{skill:string;baseline:string;outcome:string|null;reviewed_at:string|null}>};
export default function GuardianLearning(){const {user,loading}=useAuth();return <Workspace key={JSON.stringify([user?.id,user?.tenantId,user?.role,user?.roles,loading])}/>;}
function Workspace(){const [params]=useSearchParams();const learner=params.get('learner');const [rows,setRows]=useState<Summary[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
 const reload=useCallback(()=>{setRows([]);setLoading(true);setError('');setRefresh(v=>v+1);},[]);
 useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==='visible')reload();},60000);return()=>clearInterval(timer);},[reload]);
 useEffect(()=>{let active=true;setRows([]);setLoading(true);setError('');void Promise.resolve(db.rpc('get_unipathway_guardian_learning')).then(r=>{if(!active)return;if(r.error)throw r.error;setRows(r.data||[]);}).catch(()=>{if(active)setError('Shared learning progress could not be verified. Please retry.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[refresh]);
 const visible=[...new Map(rows.filter(p=>!learner||p.link_id===learner).map(p=>[p.id,p])).values()];
 return <DashboardLayout title="Shared learning progress" subtitle="Tutor-reviewed practice shared by your linked learner"><ParentNavigation/><p className="mb-4 text-sm">Each learning plan needs the learner's separate permission and a verified guardian link. Practice progress is not an official grade.</p><Button variant="outline" disabled={loading} onClick={reload}>Refresh shared progress</Button>{loading&&<p role="status">Checking sharing permissions…</p>}{error&&<p role="alert">{error}</p>}{!loading&&!error&&!visible.length&&<p className="mt-4">No learning plans are currently shared with you.</p>}{!loading&&!error&&visible.map(p=><section key={`${p.id}:${p.link_id||''}`} className="my-4 rounded-xl border p-5"><h2 className="font-bold">{p.student_name} · {p.module_title}</h2><p className="my-3 whitespace-pre-wrap">{p.goal}</p><ul className="space-y-3">{p.skills.map((s,i)=><li key={i}><strong>{s.skill}</strong><p className="text-sm">Starting point: {learningLabels[s.baseline]} · Last reviewed: {s.outcome?learningLabels[s.outcome]:'Not reviewed yet'}</p>{s.reviewed_at&&<p className="text-xs">{new Date(s.reviewed_at).toLocaleString()}</p>}</li>)}</ul>{tuitionReportsEnabled()&&<TuitionReports plan={p.id} view="guardian"/>}</section>)}</DashboardLayout>;
}
