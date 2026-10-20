import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LectureInteractions from '@/components/classroom/LectureInteractions';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Eraser, Film, Pen, Play, Pause, RefreshCcw, ShieldCheck, Type, Users } from 'lucide-react';
import {
 WHITEBOARD_WIDTH,WHITEBOARD_HEIGHT,applyWhiteboardOperation,
 isWhiteboardOperation,replayWhiteboard,restoreWhiteboardSnapshot,
 sampleStroke,toCanvasPoint,whiteboardTimelineMs,
 type Point,type WhiteboardOperation,type WhiteboardEvent,type WhiteboardShape
} from '@/lib/whiteboardOperations';

type Board={id:string;tenant_id:string;session_id:string;title:string;prepared_by:string|null;locked_after_class:boolean;current_sequence:number};
type Snapshot={through_sequence:number;shapes:WhiteboardShape[]};
const PAGE=500;
function BoardSurface({shapes,draft,onPointerDown,onPointerMove,onPointerUp,editable}:{
 shapes:WhiteboardShape[];draft:Point[];editable:boolean;
 onPointerDown:(e:ReactPointerEvent<SVGSVGElement>)=>void;
 onPointerMove:(e:ReactPointerEvent<SVGSVGElement>)=>void;
 onPointerUp:(e:ReactPointerEvent<SVGSVGElement>)=>void;
}){
 return <svg aria-label="Interactive UniPathway whiteboard canvas" role="img"
  className={`w-full touch-none rounded-lg border bg-white ${editable?'cursor-crosshair':'cursor-default'}`}
  viewBox={`0 0 ${WHITEBOARD_WIDTH} ${WHITEBOARD_HEIGHT}`}
  onPointerDown={onPointerDown} onPointerMove={onPointerMove}
  onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
  <rect width={WHITEBOARD_WIDTH} height={WHITEBOARD_HEIGHT} fill="white"/>
  {shapes.map((op,i)=>op.type==='stroke'?
   <polyline key={i} points={op.points.map(p=>p.join(',')).join(' ')} stroke={op.color} strokeWidth={op.width}
     fill="none" strokeLinecap="round" strokeLinejoin="round"/>:
   <text key={i} x={op.x} y={op.y} fill={op.color} fontSize={27} fontFamily="sans-serif">{op.text}</text>)}
  {draft.length>0&&<polyline points={draft.map(p=>p.join(',')).join(' ')}
    fill="none" stroke="#0B2D5B" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={0.7}/>}
 </svg>;
}
export default function LiveWhiteboard(){
 const {boardId}=useParams<{boardId:string}>();
 const {user}=useAuth();
 const [board,setBoard]=useState<Board|null>(null);
 const [shapes,setShapes]=useState<WhiteboardShape[]>([]);
 const [draft,setDraft]=useState<Point[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [connection,setConnection]=useState('Connecting to private whiteboard…');
 const [tool,setTool]=useState<'pen'|'text'>('pen');
 const [ink,setInk]=useState('#0B2D5B');
 const [width,setWidth]=useState(4);
 const [note,setNote]=useState('');
 const [writing,setWriting]=useState(false);
 const [mode,setMode]=useState<'live'|'replay'>('live');
 const [history,setHistory]=useState<WhiteboardEvent[]>([]);
 const [replayAt,setReplayAt]=useState(0);
 const [playing,setPlaying]=useState(false);
 const [replayLoading,setReplayLoading]=useState(false);
 const [viewers,setViewers]=useState<number|null>(null);
 const shapesRef=useRef<WhiteboardShape[]>([]);
 const pointerRef=useRef<Point[]>([]);
 const seqRef=useRef(0);
 const refreshingRef=useRef(false);
 const userId=user?.id;
 const manager=!!user?.roles.some(r=>['superadmin','centre_director','programme_leader'].includes(r));
 const editable=!!board&&!board.locked_after_class&&(manager||board.prepared_by===userId);
 const teacher=!!user?.roles.some(r=>['lecturer','programme_leader','centre_director','superadmin'].includes(r));
 const apply=(sh:WhiteboardShape[])=>{shapesRef.current=sh;setShapes(sh);};
 // Idempotent application: each durable operation carries a per-board sequence.
 const absorb=useCallback((event:WhiteboardEvent)=>{
  if(!isWhiteboardOperation(event.operation)||event.sequence<=seqRef.current)return;
  if(event.sequence!==seqRef.current+1)return;
  seqRef.current=event.sequence;
  const next=applyWhiteboardOperation(shapesRef.current,event.operation);
  shapesRef.current=next;setShapes(next);
 },[]);
 const fetchDelta=useCallback(async()=>{
  if(!boardId||refreshingRef.current)return;
  refreshingRef.current=true;
  try{
   let page=0;
   while(page<50){
    const {data,error:e}=await db.from('lesson_whiteboard_operations')
     .select('sequence,operation,created_at').eq('board_id',boardId)
     .gt('sequence',seqRef.current).order('sequence',{ascending:true}).limit(PAGE);
    if(e)throw e;
    const rows=(data||[]) as WhiteboardEvent[];
    if(rows.length===0)break;
    for(const row of rows)absorb(row);
    if(rows.length<PAGE)break;
    page++;
   }
  }catch(e){setConnection('Synchronisation interrupted; reconnecting…');}
  finally{refreshingRef.current=false;}
 },[boardId,absorb]);
 const init=useCallback(async()=>{
  if(!boardId||!userId)return;
  setLoading(true);setError('');
  try{
   const {data:b,error:e}=await db.from('lesson_whiteboards')
    .select('id,tenant_id,session_id,title,prepared_by,locked_after_class,current_sequence')
    .eq('id',boardId).single();
   if(e||!b)throw Error(e?.message||'Whiteboard unavailable or not assigned');
   const selected=b as Board;setBoard(selected);
   const {data:latest,error:snapError}=await db.from('lesson_whiteboard_snapshots')
    .select('through_sequence,shapes').eq('board_id',boardId)
    .order('through_sequence',{ascending:false}).limit(1).maybeSingle();
   if(snapError)throw snapError;
   const snap=(latest||{through_sequence:0,shapes:[]}) as Snapshot;
   const start=Number(snap.through_sequence||0);seqRef.current=start;
   apply(restoreWhiteboardSnapshot(snap.shapes||[],[]));
   let page=0;
   while(page<50){
    const {data,error:opsError}=await db.from('lesson_whiteboard_operations')
     .select('sequence,operation,created_at').eq('board_id',boardId)
     .gt('sequence',seqRef.current).order('sequence',{ascending:true}).limit(PAGE);
    if(opsError)throw opsError;
    for(const row of (data||[]) as WhiteboardEvent[])absorb(row);
    if(!data||data.length<PAGE)break;
    page++;
   }
   setConnection('Live board connected');
  }catch(e){setError(e instanceof Error?e.message:'Whiteboard cannot be loaded');setBoard(null);}
  finally{setLoading(false);}
 },[boardId,userId,absorb]);
 useEffect(()=>{void init();},[init]);
 useEffect(()=>{
  if(!boardId||!board||!userId)return;
  let active=true;
  let channel:ReturnType<typeof supabase.channel>|undefined;
  (async()=>{
   try{
    await supabase.realtime.setAuth();
    if(!active)return;
    channel=supabase.channel(`unipathway:whiteboard:${boardId}`,{config:{private:true}});
    channel.on('broadcast',{event:'operation'},(message)=>{
     const p=message.payload as Record<string,unknown>;
     if(p?.boardId!==boardId)return;
     const next=Number(p.sequence);
     if(!Number.isSafeInteger(next)||next<=seqRef.current)return;
     const op=p.operation;
     if(next===seqRef.current+1&&isWhiteboardOperation(op)){
      absorb({sequence:next,operation:op,created_at:String(p.createdAt||new Date().toISOString())});
     }else{void fetchDelta();}
    }).subscribe(status=>{
     if(!active)return;
     if(status==='SUBSCRIBED'){setConnection('Live updates connected');void fetchDelta();}
     else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')setConnection('Realtime reconnecting; saved changes are safe');
    });
   }catch{if(active)setConnection('Realtime unavailable; using scheduled synchronisation');}
  })();
  const poll=setInterval(()=>void fetchDelta(),30_000);
  const beat=()=>{void db.rpc('note_unipathway_whiteboard_view',{p_board:boardId});};
  beat();
  const heartbeat=setInterval(beat,60_000);
  if(manager){
   const countViewers=async()=>{
    const {count}=await db.from('lesson_whiteboard_view_receipts').select('user_id',{count:'exact',head:true})
      .eq('board_id',boardId);
    if(active)setViewers(count??null);
   };
   void countViewers();
   const viewerPoll=setInterval(()=>void countViewers(),60_000);
   return()=>{active=false;clearInterval(poll);clearInterval(heartbeat);clearInterval(viewerPoll);if(channel)void supabase.removeChannel(channel);};
  }
  return()=>{active=false;clearInterval(poll);clearInterval(heartbeat);if(channel)void supabase.removeChannel(channel);};
 },[boardId,board?.id,userId,manager,absorb,fetchDelta]);
 const submit=async(op:WhiteboardOperation)=>{
  if(!board||!editable||!boardId){toast.error('Presenter permission required');return;}
  if(!isWhiteboardOperation(op)){toast.error('Whiteboard content is invalid');return;}
  setWriting(true);
  const {data,error:e}=await db.rpc('append_unipathway_whiteboard_operation',
   {p_board:boardId,p_operation:op});
  setWriting(false);
  if(e){toast.error('Whiteboard was not saved: '+e.message);return;}
  const row=Array.isArray(data)?data[0]:data;
  const next=Number(row?.sequence);
  if(next===seqRef.current+1){
   absorb({sequence:next,operation:op,created_at:String(row.created_at)});
  }else void fetchDelta();
  // A checkpoint removes the need to replay hundreds of operations on late join.
  if(next>0&&next%25===0&&next===seqRef.current){
   const {error:snapError}=await db.rpc('save_unipathway_whiteboard_snapshot',{
    p_board:boardId,p_through_sequence:next,p_shapes:shapesRef.current
   });
   if(snapError)toast.error('Checkpoint delayed; full whiteboard history remains saved.');
  }
 };
 const startStroke=(e:ReactPointerEvent<SVGSVGElement>)=>{
  if(!editable||mode!=='live'||writing)return;
  const rect=e.currentTarget.getBoundingClientRect();
  const pt=toCanvasPoint(e.clientX,e.clientY,rect);
  if(tool==='text'){
   if(note.trim())void submit({type:'text',x:pt[0],y:pt[1],text:note.trim(),color:ink});
   else toast.error('Enter annotation text before placing a note');
   return;
  }
  e.currentTarget.setPointerCapture(e.pointerId);
  pointerRef.current=[pt];setDraft([pt]);
 };
 const moveStroke=(e:ReactPointerEvent<SVGSVGElement>)=>{
  if(!editable||mode!=='live'||tool!=='pen'||!pointerRef.current.length)return;
  const pt=toCanvasPoint(e.clientX,e.clientY,e.currentTarget.getBoundingClientRect());
  const prev=pointerRef.current[pointerRef.current.length-1];
  if(Math.hypot(pt[0]-prev[0],pt[1]-prev[1])<2)return;
  pointerRef.current.push(pt);
  setDraft(sampleStroke(pointerRef.current));
 };
 const finishStroke=()=>{
  if(!pointerRef.current.length)return;
  const raw=pointerRef.current;pointerRef.current=[];setDraft([]);
  const points=sampleStroke(raw.length===1?[raw[0],[Math.min(WHITEBOARD_WIDTH,raw[0][0]+1),raw[0][1]]]:raw);
  void submit({type:'stroke',points,color:ink,width});
 };
 const clearBoard=()=>{if(editable&&window.confirm('Clear the current board for all class participants? This will remain in the replay timeline.'))void submit({type:'clear'});};
 const startReplay=async()=>{
  if(!boardId)return;
  setReplayLoading(true);setError('');
  try{
   let cursor=0;const all:WhiteboardEvent[]=[];
   for(let page=0;page<100;page++){
    const {data,error:e}=await db.from('lesson_whiteboard_operations')
     .select('sequence,operation,created_at').eq('board_id',boardId)
     .gt('sequence',cursor).order('sequence',{ascending:true}).limit(PAGE);
    if(e)throw e;
    const rows=(data||[]) as WhiteboardEvent[];
    all.push(...rows.filter(x=>isWhiteboardOperation(x.operation)));
    if(rows.length<PAGE)break;
    cursor=rows[rows.length-1].sequence;
    if(page===99)throw Error('This recording exceeds the supported replay window');
   }
   setHistory(all);setReplayAt(0);setMode('replay');setPlaying(false);
  }catch(e){toast.error(e instanceof Error?e.message:'Replay unavailable');}
  finally{setReplayLoading(false);}
 };
 const duration=useMemo(()=>whiteboardTimelineMs(history),[history]);
 useEffect(()=>{
  if(mode!=='replay'||!playing)return;
  const timer=setInterval(()=>setReplayAt(t=>{
   if(t>=duration){setPlaying(false);return duration;}
   return Math.min(duration,t+250);
  }),250);
  return()=>clearInterval(timer);
 },[playing,mode,duration]);
 const shown=useMemo(()=>mode==='replay'?replayWhiteboard(history,replayAt):shapes,[mode,history,replayAt,shapes]);
 return <DashboardLayout title="UniPathway Live Whiteboard" subtitle="One presenter, many invited learners, secure live updates and durable lesson replay">
  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
   <Link className="inline-flex items-center gap-2 text-sm font-semibold underline" to={teacher?"/lecturer/classroom":"/student/classroom"}><ArrowLeft className="size-4"/>My classes</Link>
   <span className="text-xs text-muted-foreground" role="status">{connection}</span>
  </div>
  {loading&&<p role="status">Checking your classroom invitation and whiteboard access…</p>}
  {error&&<p className="rounded-xl border border-destructive p-5" role="alert">{error}. Access requires an active enrolment and class invitation, or assignment as an authorised educator.</p>}
  {board&&!loading&&<div className="space-y-4">
   <div className="flex flex-wrap items-center justify-between gap-3"><div>
    <h2 className="text-2xl font-bold">{board.title}</h2>
    <p className="mt-1 text-xs text-muted-foreground">Saved events: {seqRef.current} · {editable?'Presenter access':'Read-only classroom view'} · {board.locked_after_class?'Board locked':''}</p>
   </div><div className="flex items-center gap-2">
    {manager&&viewers!==null&&<span className="flex items-center gap-1 text-xs"><Users className="size-4"/>{viewers} unique board viewers (not verified Teams attendance)</span>}
    <Button variant="outline" size="sm" onClick={()=>void fetchDelta()}><RefreshCcw className="mr-1 size-4"/>Sync</Button>
   </div></div>
   <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs">
    <ShieldCheck className="mr-1 inline size-4"/>Presenter drawing is synchronised to one private board for the full class. A 100+ learner lecture stays viewer-only by default; teaching staff retain editorial control. To include the board in a Teams video recording, the presenter must share this tab in Teams and enable permitted Teams recording separately.
   </div>
   {editable&&mode==='live'&&<div className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
    <Button size="sm" variant={tool==='pen'?'default':'outline'} onClick={()=>setTool('pen')}><Pen className="mr-1 size-4"/>Draw</Button>
    <Button size="sm" variant={tool==='text'?'default':'outline'} onClick={()=>setTool('text')}><Type className="mr-1 size-4"/>Text</Button>
    <label className="flex items-center gap-2 text-sm">Ink <input type="color" value={ink} onChange={e=>setInk(e.target.value)} aria-label="Ink colour"/></label>
    <label className="text-sm">Width <select aria-label="Pen width" className="rounded-md border px-2 py-1" value={width} onChange={e=>setWidth(Number(e.target.value))}><option value="2">Fine</option><option value="4">Medium</option><option value="8">Bold</option><option value="16">Marker</option></select></label>
    {tool==='text'&&<Input aria-label="Text annotation" className="max-w-60" maxLength={180} value={note} placeholder="Enter text, then tap canvas" onChange={e=>setNote(e.target.value)}/>}
    <Button variant="outline" size="sm" disabled={writing} onClick={clearBoard}><Eraser className="mr-1 size-4"/>Clear page</Button>
   </div>}
   <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
   <div className="space-y-3 min-w-0">
   <BoardSurface shapes={shown} draft={mode==='live'?draft:[]} editable={editable&&mode==='live'} onPointerDown={startStroke} onPointerMove={moveStroke} onPointerUp={finishStroke}/>
   <div className="flex flex-wrap items-center gap-2">
    {mode==='live'?<Button variant="outline" disabled={replayLoading} onClick={()=>void startReplay()}><Film className="mr-2 size-4"/>Replay saved whiteboard</Button>:
      <Button variant="outline" onClick={()=>{setMode('live');setPlaying(false);}}><Pen className="mr-2 size-4"/>Back to live board</Button>}
    {mode==='replay'&&<><Button disabled={duration===0} size="sm" onClick={()=>setPlaying(p=>!p)}>{playing?<Pause className="mr-1 size-4"/>:<Play className="mr-1 size-4"/>}{playing?'Pause':'Play'}</Button>
     <label className="flex flex-1 items-center gap-2 text-sm"><span>Timeline</span><input aria-label="Whiteboard replay timeline" className="min-w-36 flex-1" type="range" min={0} max={Math.max(duration,1)} step={250} value={replayAt} onChange={e=>setReplayAt(Number(e.target.value))}/><span>{Math.round(replayAt/1000)}s / {Math.round(duration/1000)}s</span></label></>}
   </div>
   <p className="text-xs text-muted-foreground">Whiteboard replay saves drawing and annotation order, not microphone, camera or Teams chat. Students need a valid class invitation to access it. Video/audio recording requires a separate Teams recording workflow and provider authorisation.</p>
   </div>
   <LectureInteractions sessionId={board.session_id} compact />
   </div>
  </div>}
 </DashboardLayout>;
}
