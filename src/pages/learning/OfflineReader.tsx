import {useEffect,useState} from 'react';
import SavedLearning from '@/components/learning/SavedLearning';
import {restoreOfflineReader,type LearningAccount} from '@/lib/learning/offlineLessons';
export default function OfflineReader(){
 const [account,setAccount]=useState<LearningAccount|null>(null),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;const check=async()=>{const next=await restoreOfflineReader();if(active){setAccount(previous=>previous?.id===next?.id&&previous?.tenantId===next?.tenantId?previous:next);setLoading(false);}};void check();const timer=setInterval(()=>void check(),1000);return()=>{active=false;clearInterval(timer);};},[]);
 return <main className="min-h-dvh bg-background text-foreground"><div className="mx-auto max-w-4xl p-4 sm:p-8 space-y-6"><header className="space-y-3"><p className="font-semibold text-primary">UniPathway</p><h1 className="text-3xl font-bold">Saved learning</h1><p>Continue with the lessons and files you saved on this device. Dashboards, live classes and assessed submissions require an online sign-in.</p></header>
 {loading?<p role="status">Opening saved learning…</p>:account?<SavedLearning key={`${account.tenantId}:${account.id}`} account={account}/>:<section className="rounded-xl border p-5 space-y-3"><p>No current offline access is saved. Connect, sign in and save learning for this device. Saved copies expire after 24 hours.</p><a className="inline-flex min-h-11 items-center underline" href="/student/downloads">Return to online learning</a></section>}
 </div></main>;
}
