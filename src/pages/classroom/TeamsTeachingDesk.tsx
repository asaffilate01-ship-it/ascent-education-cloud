import {useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {arrangeTeachingGroups,isTeamsMeetingUrl,teachingPlanText,TeachingGroup,TeachingLearner} from '@/lib/teamsTeaching';
import {GuidedSession} from '@/components/ielts/GuidedAudioLab';
import TeamsRecordingStatus from '@/components/classroom/TeamsRecordingStatus';
import LectureInteractions from '@/components/classroom/LectureInteractions';

type Plan={can_manage:boolean;groups:TeachingGroup[];roster:TeachingLearner[];revision:number;instructions:string;duration_minutes:number};
type Session={id:string;title:string;join_url:string|null;starts_at:string;ends_at:string;status:string};
export default function TeamsTeachingDesk(){
 const {sessionId}=useParams();const {user}=useAuth();
 return <DashboardLayout title="Teams teaching desk" subtitle="Whole-class teaching, private tutor support and group work across all subjects">
  <Link className="underline" to={user?.roles.some(r=>['lecturer','programme_leader','centre_director','superadmin'].includes(r))?'/lecturer/classroom':'/student/classroom'}>Back to my classes</Link>
  {sessionId&&user?<TeachingDesk key={`${sessionId}:${user.id}:${user.tenantId}`} sessionId={sessionId}/>:<p role="alert">Select an invited class first.</p>}
 </DashboardLayout>;
}
export function TeachingDesk({sessionId}:{sessionId:string}){
 const [plan,setPlan]=useState<Plan|null>(null),[session,setSession]=useState<Session|null>(null);
 const [groups,setGroups]=useState<TeachingGroup[]>([]),[instructions,setInstructions]=useState(''),[duration,setDuration]=useState(15),[size,setSize]=useState(2);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[refresh,setRefresh]=useState(0),[dirty,setDirty]=useState(false);
 const [boards,setBoards]=useState<{id:string;title:string}[]>([]),[boardError,setBoardError]=useState('');
 useEffect(()=>{
  let active=true;setLoading(true);setError('');setPlan(null);setSession(null);setNotice('');
  void Promise.all([
   db.rpc('get_unipathway_teams_plan',{p_session:sessionId}),
   db.from('live_class_sessions').select('id,title,join_url,starts_at,ends_at,status').eq('id',sessionId).maybeSingle(),
   db.from('lesson_whiteboards').select('id,title').eq('session_id',sessionId).order('created_at',{ascending:false}).limit(20),
  ]).then(([p,s,b])=>{
   if(!active)return;if(p.error||s.error||!p.data||!s.data)throw new Error(p.error?.message||s.error?.message||'Class access unavailable');
   setPlan(p.data);setSession(s.data);setGroups(p.data.groups);setInstructions(p.data.instructions);setDuration(p.data.duration_minutes);setDirty(false);
   setBoards(b.data||[]);setBoardError(b.error?'Saved lesson boards unavailable':'');
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:'Teaching desk unavailable');}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[sessionId,refresh]);
 async function save(){
  if(!plan)return;setSaving(true);setError('');setNotice('');
  try{const r=await db.rpc('save_unipathway_teams_plan',{p_session:sessionId,p_revision:plan.revision,p_groups:groups,p_instructions:instructions,p_duration:duration});
   if(r.error)throw new Error(r.error.message);setPlan({...plan,revision:r.data,groups,instructions,duration_minutes:duration});setDirty(false);
   setNotice('Plan saved in UniPathway. Apply the assignments in Teams Rooms; live rooms have not been changed.');
  }catch(e){setError(e instanceof Error?e.message:'Plan not saved');}finally{setSaving(false);}
 }
 function editGroups(next:TeachingGroup[]){setGroups(next);setDirty(true);setNotice('');}
 function regenerate(){try{editGroups(arrangeTeachingGroups(plan?.roster||[],size));setError('');}catch(e){setError((e as Error).message);}}
 const joinable=session&&['scheduled','live'].includes(session.status)&&Date.now()>=Date.parse(session.starts_at)-20*60_000&&Date.now()<=Date.parse(session.ends_at)+30*60_000;
 const editable=plan?.can_manage&&session&&['scheduled','live'].includes(session.status);
 return <div className="mt-5 space-y-5">
  {loading&&<p role="status">Checking class invitations and teaching plan…</p>}
  {error&&<p role="alert" className="rounded-xl border border-destructive p-4">{error}</p>}
  <Button variant="outline" disabled={saving} onClick={()=>{if(!dirty||window.confirm('Discard unsaved plan changes and refresh?'))setRefresh(n=>n+1);}}>Refresh teaching desk</Button>
  {plan&&session&&!loading&&<>
   <section className="rounded-xl border bg-card p-5 space-y-3">
    <h2 className="text-xl font-semibold">{session.title}</h2>
    <p className="text-sm text-muted-foreground">Microsoft Teams Education / Enterprise is the live classroom. Audio, cameras, screen sharing and room membership are controlled in Teams. This desk prepares the teaching plan and course resources.</p>
    {isTeamsMeetingUrl(session.join_url)&&joinable?<a className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground" target="_blank" rel="noopener noreferrer" href={session.join_url}>Open Teams classroom</a>:<p className="text-sm">{!isTeamsMeetingUrl(session.join_url)?'A verified Teams meeting link is required.':'Joining is available from 20 minutes before the class until 30 minutes after it ends.'}</p>}
    <p className="text-sm">Join with your institutional work or school account. The lecturer appears in the participant list when joining your room. You control when to unmute or share your screen.</p>
   </section>
   <section className="rounded-xl border p-5 space-y-4">
    <h2 className="font-semibold">{plan.can_manage?'Pair and group teaching plan':'My group activity'}</h2>
    {plan.can_manage?<>
     <p className="text-sm text-muted-foreground">Plan assignments here, then create matching rooms and assign learners in the Teams desktop app. These are planned groups, not a live attendance or microphone monitor.</p>
     <label className="block text-sm">Class instructions<textarea aria-label="Class instructions" className="mt-1 w-full rounded border bg-background p-2" maxLength={4000} disabled={!editable||saving} value={instructions} onChange={e=>{setInstructions(e.target.value);setDirty(true);}}/></label>
     <div className="flex flex-wrap items-end gap-3">
      <label>Minutes<input aria-label="Activity minutes" className="ml-2 w-20 rounded border bg-background p-2" type="number" min={1} max={180} disabled={!editable||saving} value={duration} onChange={e=>{setDuration(Number(e.target.value));setDirty(true);}}/></label>
      <label>Learners per group<input aria-label="Learners per group" className="ml-2 w-20 rounded border bg-background p-2" type="number" min={1} max={20} value={size} onChange={e=>setSize(Number(e.target.value))}/></label>
      <Button variant="outline" disabled={!editable||saving||!plan.roster.length} onClick={()=>{if(!groups.length||window.confirm('Replace the current group assignments and group tasks?'))regenerate();}}>Generate {size===1?'one-to-one plan':size===2?'pairs':'groups'}</Button>
     </div>
     <p className="text-sm">{plan.roster.length} currently eligible invited learners. Reassign learners below; use a group of one for tutor support.</p>
     <div className="grid gap-3 md:grid-cols-2">{groups.map((group,index)=><article className="rounded-lg border p-4 space-y-2" key={index}>
      <input aria-label={`Group ${index+1} name`} className="w-full rounded border bg-background p-2" maxLength={80} disabled={!editable||saving} value={group.name} onChange={e=>editGroups(groups.map((g,i)=>i===index?{...g,name:e.target.value}:g))}/>
      <textarea aria-label={`Group ${index+1} task`} className="w-full rounded border bg-background p-2" maxLength={2000} disabled={!editable||saving} placeholder="Activity or discussion task" value={group.task} onChange={e=>editGroups(groups.map((g,i)=>i===index?{...g,task:e.target.value}:g))}/>
      <ul className="space-y-2">{group.members.map(id=><li key={id} className="text-sm flex flex-wrap justify-between gap-2"><span>{plan.roster.find(p=>p.id===id)?.name||'No longer eligible — remove before saving'}</span>
       <select aria-label={`Assign ${id}`} disabled={!editable||saving} className="max-w-40 rounded border bg-background" value={index} onChange={e=>{const target=Number(e.target.value);editGroups(groups.map((g,i)=>({...g,members:i===target?[...g.members,id]:g.members.filter(m=>m!==id)})).filter(g=>g.members.length));}}>
        {groups.map((g,i)=><option key={i} value={i}>{g.name}</option>)}<option value={-1}>Unassign</option>
       </select></li>)}</ul>
     </article>)}</div>
     {plan.roster.filter(p=>!groups.some(g=>g.members.includes(p.id))).map(p=><label key={p.id} className="block text-sm">{p.name} — unassigned <select aria-label={`Assign ${p.id}`} disabled={!editable||saving} className="ml-2 rounded border bg-background p-1" value="" onChange={e=>{const index=Number(e.target.value);editGroups(index===-1?[...groups,{name:`Tutor ${p.id.slice(0,8)}`,task:'',members:[p.id]}]:groups.map((g,i)=>i===index?{...g,members:[...g.members,p.id]}:g));}}><option value="">Choose room…</option>{groups.map((g,i)=><option key={i} value={i}>{g.name}</option>)}<option value={-1}>New tutor room</option></select></label>)}
     <div className="flex flex-wrap gap-3"><Button disabled={!editable||saving||!dirty} onClick={()=>void save()}>{saving?'Saving…':'Save teaching plan'}</Button>
      <Button variant="outline" onClick={()=>void navigator.clipboard.writeText(teachingPlanText(groups,plan.roster,instructions,duration)).then(()=>setNotice('Plan copied for reference while assigning Teams rooms.')).catch(()=>setError('Clipboard unavailable. Select and copy the plan on screen.'))}>Copy plan for Teams setup</Button></div>
     {dirty&&<p className="text-sm">Unsaved plan changes</p>}
    </>:<>
     <p className="whitespace-pre-wrap">{instructions||'Your lecturer has not added class instructions yet.'}</p>
     <p className="text-sm">Planned activity: {duration} minutes</p>
     {groups.length?groups.map((g,i)=><div key={i} className="rounded-lg border p-4"><h3 className="font-semibold">{g.name}</h3><p className="whitespace-pre-wrap">{g.task||'Follow your lecturer’s instructions.'}</p></div>):<p>No group is assigned to you yet. Stay in the main Teams meeting.</p>}
     <p className="text-sm">Your lecturer will open the room in Teams. Refresh this desk after your assignment changes.</p>
    </>}
    {notice&&<p role="status" className="text-sm">{notice}</p>}
   </section>
   <section className="grid gap-4 md:grid-cols-2">
    {[
     ['Private tutor or group conversation','In Teams Rooms, assign one learner or a group to a breakout room. The organiser or designated breakout manager joins that room to listen and talk. Use assigned rooms rather than self-selection for controlled groups.'],
     ['Whole-class discussion and student demonstrations','Close the breakout rooms to return learners to the main meeting. Ask the student or group spokesperson to unmute. Give presenter permission when they need to share their screen, then return them to attendee afterwards.'],
     ['Pairs, group work and timed activities','Create rooms in Teams desktop and apply the saved plan. Set the room timer and open the rooms. Announcements appear in room chat; they are not a live audio broadcast to every room. Only one breakout manager controls the rooms at a time.'],
     ['Screen, slides, sound and work inspection','Use Teams Share to show a screen, window or presentation. For listening exercises, enable Include sound. Students share their own screen for a lecturer to inspect work; this desk does not remotely view or control their computer.'],
     ['Whiteboards and saved lesson work','Use Teams Share → Microsoft Whiteboard for collaboration in the current meeting. Use the saved UniPathway board below for the whole class and share its window into Teams. Keep private group work out of the whole-class board.'],
     ['In-centre and remote audio setup','For 20 individual stations use 20 USB headsets and keep loudspeakers off. Connect the lecturer’s display to the projector. If a room speaker/microphone is used instead, other devices join with audio off. Run a Teams device test and a remote listening check before class.'],
    ].map(([heading,body])=><article key={heading} className="rounded-xl border p-5"><h3 className="font-semibold">{heading}</h3><p className="mt-2 text-sm text-muted-foreground">{body}</p></article>)}
   </section>
   <section className="rounded-xl border p-5 space-y-2"><h2 className="font-semibold">Saved whole-class boards</h2>{boardError&&<p role="alert">{boardError}</p>}
    {boards.map(b=><Link key={b.id} className="block underline" target="_blank" rel="noopener noreferrer" to={`/classroom/whiteboard/${b.id}`}>{b.title}</Link>)}
    {!boards.length&&!boardError&&<p className="text-sm">No saved board created for this lesson.</p>}{plan.can_manage&&<Link className="block underline" to="/lecturer/whiteboards">Create or manage lesson boards</Link>}
   </section>
   <details className="rounded-xl border p-5"><summary className="cursor-pointer font-semibold">Shared practice recording controls</summary><p className="my-3 text-sm">Optional recorded practice for any subject. Use Teams Include sound for shared playback in the meeting, or let each student listen through this player. Avoid playing both audio paths together.</p><GuidedSession session={sessionId}/></details>
   <TeamsRecordingStatus sessionId={sessionId} manager={plan.can_manage}/>
   <LectureInteractions sessionId={sessionId} compact/>
   <p className="text-sm text-muted-foreground">Teams licences, meeting policies, recording notices and institutional sign-in must be configured by your Microsoft administrator. A saved plan does not verify those settings. <a className="underline" href="https://support.microsoft.com/en-gb/teams/meetings/manage-breakout-rooms-in-microsoft-teams" target="_blank" rel="noopener noreferrer">Microsoft breakout room guide</a></p>
  </>}
 </div>;
}
