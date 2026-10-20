import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '@/integrations/supabase/client';
import {db} from '@/lib/db';
import {useAuth} from '@/contexts/AuthContext';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {toast} from 'sonner';
import {BookOpen,Hand,Headphones,MessageCircle,MessagesSquare,ShieldCheck,Volume2} from 'lucide-react';

type Session={id:string;title:string;starts_at:string;ends_at:string;status:string};
type HandRequest={session_id:string;student_id:string;status:'raised'|'called'|'dismissed'|'lowered';raised_at:string};
type Question={id:string;student_id:string;body:string;status:'submitted'|'answered'|'hidden';answer:string|null;created_at:string;answered_at:string|null};
type PublishedAnswer={id:string;question_text:string;answer_text:string;published_at:string};
type StudentProfile={user_id:string;full_name:string|null};
const STUDENT_POLL_MS=35_000,STAFF_POLL_MS=10_000;

export default function LectureInteractions({sessionId,compact=false}:{sessionId:string;compact?:boolean}){
 const {user}=useAuth();
 const staff=!!user?.roles.some(r=>['lecturer','programme_leader','centre_director','superadmin'].includes(r));
 const [session,setSession]=useState<Session|null>(null);
 const [hands,setHands]=useState<HandRequest[]>([]);
 const [questions,setQuestions]=useState<Question[]>([]);
 const [published,setPublished]=useState<PublishedAnswer[]>([]);
 const [profiles,setProfiles]=useState<StudentProfile[]>([]);
 const [question,setQuestion]=useState('');
 const [answerDrafts,setAnswerDrafts]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [handLimit,setHandLimit]=useState(100),[questionLimit,setQuestionLimit]=useState(60);
 const ownHand=hands.find(h=>h.student_id===user?.id);
 const ready=!!session&&!error;
 const refresh=useCallback(async()=>{
  if(!sessionId||!user?.id)return;
  try{
   const [s,h,q,a]=await Promise.all([
    db.from('live_class_sessions').select('id,title,starts_at,ends_at,status').eq('id',sessionId).maybeSingle(),
    db.from('live_class_hand_requests').select('session_id,student_id,status,raised_at')
     .eq('session_id',sessionId).in('status',['raised','called'])
     .order('raised_at',{ascending:true}).limit(staff?handLimit:2),
    db.from('live_class_questions').select('id,student_id,body,status,answer,created_at,answered_at')
     .eq('session_id',sessionId).order('created_at',{ascending:false}).limit(staff?questionLimit:40),
    db.from('live_class_published_answers').select('id,question_text,answer_text,published_at')
     .eq('session_id',sessionId).order('published_at',{ascending:false}).limit(40)
   ]);
   const failed=[s,h,q,a].find(x=>x.error);
   if(failed)throw new Error(failed.error.message);
   if(!s.data)throw new Error('Not invited to this lecture or classroom access has been withdrawn');
   setSession(s.data as Session);
   setHands((h.data||[]) as HandRequest[]);
   setQuestions((q.data||[]) as Question[]);
   setPublished((a.data||[]) as PublishedAnswer[]);
   if(staff){
    const ids=[...new Set([...(h.data||[]).map((x:HandRequest)=>x.student_id),...(q.data||[]).map((x:Question)=>x.student_id)])].slice(0,240);
    if(ids.length){
     const p=await db.from('profiles').select('user_id,full_name').in('user_id',ids);
     if(!p.error)setProfiles((p.data||[]) as StudentProfile[]);
    }else setProfiles([]);
   }
   setError('');
  }catch(e){setError(e instanceof Error?e.message:'Lecture interaction service unavailable');
    setSession(null);setQuestions([]);setHands([]);setPublished([]);
  }finally{setLoading(false);}
 },[sessionId,user?.id,staff,handLimit,questionLimit]);
 useEffect(()=>{
  setLoading(true);
  void refresh();
  const poll=setInterval(()=>void refresh(),staff?STAFF_POLL_MS:STUDENT_POLL_MS);
  let channel:ReturnType<typeof supabase.channel>|undefined;
  let active=true;
  const start=async()=>{
   try{
    await supabase.realtime.setAuth();
    if(!active)return;
    channel=supabase.channel('unipathway:classroom:'+sessionId,{config:{private:true}})
     .on('broadcast',{event:'refresh'},()=>{if(active)void refresh();})
     .subscribe();
   }catch{/* reliable polling fallback */}
  };
  if(sessionId&&user?.id)void start();
  return()=>{active=false;clearInterval(poll);if(channel)void supabase.removeChannel(channel);};
 },[refresh,sessionId,user?.id,staff]);
 const speakStatus=ownHand?.status||'lowered';
 const pending=useMemo(()=>questions.filter(x=>x.status==='submitted'),[questions]);
 const display=(studentId:string)=>{
  const name=profiles.find(p=>p.user_id===studentId)?.full_name;
  return name||'Learner '+studentId.slice(0,6);
 };
 const actHand=async(action:'raise'|'lower')=>{
  if(!ready||busy)return;
  setBusy(true);
  const {error:e}=await db.rpc('set_unipathway_hand_raise',{p_session:sessionId,p_action:action});
  setBusy(false);
  if(e){toast.error('Hand request not saved: '+e.message);return;}
  await refresh();
 };
 const callStudent=async(studentId:string,action:'called'|'dismissed')=>{
  if(!ready||busy||!staff)return;
  setBusy(true);
  const {error:e}=await db.rpc('respond_unipathway_hand_raise',{p_session:sessionId,p_student:studentId,p_action:action});
  setBusy(false);
  if(e){toast.error('Request not updated: '+e.message);return;}
  toast.success(action==='called'?'Student invited to speak in Teams':'Hand request dismissed');
  await refresh();
 };
 const sendQuestion=async()=>{
  if(!ready||busy||!question.trim()||staff)return;
  setBusy(true);
  const {error:e}=await db.rpc('submit_unipathway_class_question',{p_session:sessionId,p_body:question.trim()});
  setBusy(false);
  if(e){toast.error('Question not sent: '+e.message);return;}
  setQuestion('');toast.success('Your question was sent privately to the lecturer.');
  await refresh();
 };
 const respond=async(q:Question,share:boolean)=>{
  if(!staff||!ready||busy)return;
  const answer=answerDrafts[q.id]?.trim();
  if(!answer){toast.error('Write a reply first');return;}
  if(share&&!window.confirm('Publish this question and answer to every invited class learner? Remove identifying details before publishing.'))return;
  setBusy(true);
  const {error:e}=await db.rpc('answer_unipathway_class_question',
   {p_question:q.id,p_answer:answer,p_publish:share});
  setBusy(false);
  if(e){toast.error('Answer was not saved: '+e.message);return;}
  setAnswerDrafts(p=>({...p,[q.id]:''}));
  toast.success(share?'Approved answer shared with the class':'Private answer sent to the student');
  await refresh();
 };
 const expired=session?.status==='cancelled'||session?.status==='deleted';
 return <section aria-label="Classroom hand raises and questions" className={compact?'space-y-4':'space-y-6'}>
  <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
   <h2 className="flex items-center gap-2 text-xl font-bold"><MessagesSquare className="size-5"/>Live hand raising and questions</h2>
   <p className="mt-2 text-sm text-muted-foreground">
    {staff?'Manage speaking requests and answer submitted learner questions. For large classes, discussion is presenter-moderated.':
     'Raise your hand to request permission to speak, or send a question privately to your lecturer. You can read approved answers shared with the class.'}
   </p>
   <div className="mt-3 flex flex-wrap gap-3 text-xs">
    <span className="inline-flex items-center gap-1"><ShieldCheck className="size-4"/>Enrolment + invitation required</span>
    <span className="inline-flex items-center gap-1"><Headphones className="size-4"/>Audio remains in Microsoft Teams</span>
    <Link to={staff?'/lecturer/materials':'/student/materials'} className="inline-flex items-center gap-1 font-semibold underline">
      <BookOpen className="size-4"/>Course notes, slides and homework</Link>
   </div>
  </div>
  {loading&&<p role="status">Checking classroom permissions…</p>}
  {error&&<p role="alert" className="rounded-xl border border-destructive p-4">Interaction service unavailable: {error}. This class requires deployed invitation and Q&A security policies.</p>}
  {ready&&!loading&&<>
   {!staff&&<div className="grid gap-4 lg:grid-cols-2">
    <section className="rounded-xl border bg-card p-5">
     <h3 className="flex items-center gap-2 font-semibold"><Hand className="size-5"/>Ask to speak</h3>
     <p className="mt-2 text-sm text-muted-foreground">Your lecturer can call on you; then unmute yourself in Teams if the meeting policy allows it. This request does not remotely unmute your microphone.</p>
     {speakStatus==='called'&&<p role="status" className="mt-3 rounded-lg border border-primary bg-primary/5 p-3 text-sm font-semibold"><Volume2 className="mr-2 inline size-4"/>You have been called upon. Unmute in Teams when permitted.</p>}
     <p className="mt-3 text-xs text-muted-foreground">{speakStatus==='raised'?'Hand raised — waiting for lecturer':
       speakStatus==='called'?'Lecturer has acknowledged your request':'Your hand is currently lowered'}</p>
     <Button className="mt-3" disabled={busy||expired}
       variant={speakStatus==='raised'||speakStatus==='called'?'outline':'default'}
       onClick={()=>void actHand(speakStatus==='raised'||speakStatus==='called'?'lower':'raise')}>
       <Hand className="mr-2 size-4"/>{speakStatus==='raised'||speakStatus==='called'?'Lower hand':'Raise hand'}</Button>
    </section>
    <section className="rounded-xl border bg-card p-5">
     <h3 className="flex items-center gap-2 font-semibold"><MessageCircle className="size-5"/>Message the lecturer</h3>
     <label className="mt-3 block text-sm font-medium">Your question
      <Textarea className="mt-1" rows={3} maxLength={1000} value={question} disabled={expired}
        placeholder="Ask a question about the lecture, coursework or whiteboard…"
        onChange={e=>setQuestion(e.target.value)}/></label>
     <div className="mt-2 flex items-center justify-between"><span className="text-xs text-muted-foreground">{question.length}/1000</span>
      <Button disabled={busy||expired||!question.trim()} onClick={()=>void sendQuestion()}>Send question</Button></div>
    </section>
   </div>}
   {staff&&<div className="grid gap-4 lg:grid-cols-2">
    <section className="rounded-xl border bg-card p-5">
     <h3 className="flex items-center gap-2 font-semibold"><Hand className="size-5"/>Students requesting to speak ({hands.length}{hands.length>=handLimit?'+':''})</h3>
     <p className="mt-1 text-xs text-muted-foreground">Calling someone up records the invitation; they must unmute in Teams themselves. Lecturer queue is private.</p>
     {hands.length===0&&<p className="mt-3 text-sm text-muted-foreground">No raised hands.</p>}
     <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
      {hands.map(h=><div key={h.student_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
       <div><p className="text-sm font-semibold">{display(h.student_id)}</p><p className="text-xs text-muted-foreground">{h.status} · {new Date(h.raised_at).toLocaleTimeString()}</p></div>
       {h.status==='raised'&&<div className="flex gap-2"><Button size="sm" disabled={busy} onClick={()=>void callStudent(h.student_id,'called')}>Call to speak</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={()=>void callStudent(h.student_id,'dismissed')}>Dismiss</Button></div>}
      </div>)}
     </div>
     {hands.length>=handLimit&&<Button variant="outline" className="mt-3" onClick={()=>setHandLimit(n=>n+100)}>Load more hands</Button>}
    </section>
    <section className="rounded-xl border bg-card p-5">
     <h3 className="flex items-center gap-2 font-semibold"><MessageCircle className="size-5"/>Moderate learner questions ({pending.length} pending shown)</h3>
     <p className="mt-1 text-xs text-muted-foreground">A reply is private unless you explicitly publish the answer to the class. Review student identifying details first.</p>
     {pending.length===0&&<p className="mt-3 text-sm text-muted-foreground">No new questions.</p>}
     <div className="mt-3 max-h-[34rem] space-y-3 overflow-y-auto">
      {pending.map(q=><article key={q.id} className="space-y-2 rounded-lg border p-3">
       <p className="text-xs font-semibold text-muted-foreground">{display(q.student_id)} · {new Date(q.created_at).toLocaleTimeString()}</p>
       <p className="whitespace-pre-wrap text-sm">{q.body}</p>
       <label className="block text-xs font-semibold">Lecturer response<textarea className="mt-1 w-full rounded-md border bg-background p-2 text-sm" rows={2} maxLength={2000} value={answerDrafts[q.id]||''}
        placeholder="Give guidance or a short answer…" onChange={e=>setAnswerDrafts(p=>({...p,[q.id]:e.target.value}))}/></label>
       <div className="flex flex-wrap gap-2"><Button size="sm" disabled={busy||!answerDrafts[q.id]?.trim()} onClick={()=>void respond(q,false)}>Reply privately</Button>
        <Button size="sm" variant="outline" disabled={busy||!answerDrafts[q.id]?.trim()} onClick={()=>void respond(q,true)}>Publish Q&A to class</Button></div>
      </article>)}
     </div>
     {questions.length>=questionLimit&&<Button className="mt-3" variant="outline" onClick={()=>setQuestionLimit(n=>n+60)}>Load more questions</Button>}
    </section>
   </div>}
   {!staff&&questions.length>0&&<section className="rounded-xl border bg-card p-5">
    <h3 className="font-semibold">Your private questions</h3>
    <div className="mt-3 space-y-3">{questions.map(q=><article key={q.id} className="rounded-lg border p-3">
     <p className="whitespace-pre-wrap text-sm">{q.body}</p>
     <p className="mt-1 text-xs text-muted-foreground">{new Date(q.created_at).toLocaleString()} · {q.status}</p>
     {q.status==='answered'&&q.answer&&<p className="mt-2 whitespace-pre-wrap border-l-2 border-primary pl-3 text-sm"><strong>Lecturer:</strong> {q.answer}</p>}
    </article>)}</div>
   </section>}
   <section className="rounded-xl border bg-card p-5">
    <h3 className="font-semibold">Approved answers shared with this class</h3>
    {published.length===0?<p className="mt-2 text-sm text-muted-foreground">No questions have been approved for class-wide display.</p>:
     <div className="mt-3 space-y-3">{published.map(a=><article key={a.id} className="rounded-lg border p-3">
      <p className="text-sm font-semibold">Q: {a.question_text}</p><p className="mt-2 whitespace-pre-wrap text-sm">A: {a.answer_text}</p>
      <p className="mt-2 text-xs text-muted-foreground">Shared {new Date(a.published_at).toLocaleString()}</p>
     </article>)}</div>}
   </section>
  </>}
 </section>;
}
