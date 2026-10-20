import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {
 applyWhiteboardOperation,isWhiteboardOperation,replayWhiteboard,restoreWhiteboardSnapshot,
 sampleStroke,toCanvasPoint,whiteboardTimelineMs, type WhiteboardEvent,
 type WhiteboardShape,
} from '@/lib/whiteboardOperations';

describe('UniPathway 100+ learner whiteboard event playback',()=>{
 const stroke={type:'stroke' as const,color:'#0B2D5B',width:3,points:[[1,2],[25,30]] as [number,number][]};
 const note={type:'text' as const,color:'#16A34A',text:'Hello class',x:10,y:10};
 it('validates bounded strokes and annotations before sending to the server',()=>{
  expect(isWhiteboardOperation(stroke)).toBe(true);
  expect(isWhiteboardOperation(note)).toBe(true);
  expect(isWhiteboardOperation({type:'stroke',color:'#0B2D5B',width:3,points:[[0,0]]})).toBe(false);
  expect(isWhiteboardOperation({type:'stroke',color:'#0B2D5B',width:3,points:[[0,0],[1001,10]]})).toBe(false);
  expect(isWhiteboardOperation({type:'text',text:'hello',x:5,y:600,color:'#0B2D5B'})).toBe(false);
  expect(isWhiteboardOperation({type:'unknown',color:'#0B2D5B'})).toBe(false);
 });
 it('handles clear and deterministic state restoration',()=>{
  const shapes=[stroke] as WhiteboardShape[];
  expect(applyWhiteboardOperation(shapes,note)).toHaveLength(2);
  expect(applyWhiteboardOperation(shapes,{type:'clear'})).toEqual([]);
  expect(restoreWhiteboardSnapshot([stroke],[{sequence:2,operation:note,created_at:'2026-10-20T08:00:01Z'}])).toHaveLength(2);
 });
 it('replays only events that happened by the requested elapsed time',()=>{
  const ev:WhiteboardEvent[]=[
   {sequence:1,operation:stroke,created_at:'2026-10-20T08:00:00Z'},
   {sequence:2,operation:note,created_at:'2026-10-20T08:00:05Z'},
   {sequence:3,operation:{type:'clear'},created_at:'2026-10-20T08:00:08Z'},
   {sequence:4,operation:stroke,created_at:'2026-10-20T08:00:12Z'},
  ];
  expect(whiteboardTimelineMs(ev)).toBe(12000);
  expect(replayWhiteboard(ev,6000)).toHaveLength(2);
  expect(replayWhiteboard(ev,9000)).toHaveLength(0);
  expect(replayWhiteboard(ev,12000)).toHaveLength(1);
 });
 it('preserves the normalized canvas and caps large strokes at 240 points',()=>{
  expect(toCanvasPoint(150,100,{left:0,top:0,width:300,height:200})[0]).toBe(500);
  const points=Array.from({length:1200},(_,i)=>[i%1000,i%500] as [number,number]);
  const sampled=sampleStroke(points);
  expect(sampled).toHaveLength(240);
  expect(sampled[0]).toEqual(points[0]);
  expect(sampled.at(-1)).toEqual(points.at(-1));
 });
});

describe('large-lecture private whiteboard RLS contracts',()=>{
 const sql=readFileSync('supabase/migrations/20261020110000_large_lecture_whiteboard_realtime.sql','utf8');
 const ui=readFileSync('src/pages/classroom/LiveWhiteboard.tsx','utf8');
 it('stores one operation per completed stroke and prevents direct writes',()=>{
  expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.lesson_whiteboard_operations');
  expect(sql).toContain('UNIQUE(board_id, sequence)');
  expect(sql).toContain('REVOKE INSERT, UPDATE, DELETE ON public.lesson_whiteboard_operations FROM anon, authenticated');
  expect(sql).toContain("IF v_kind='stroke' THEN");
  expect(sql).toContain("ELSIF v_kind='clear' THEN");
  expect(sql).toContain('realtime.send');
 });
 it('requires class invites and uses checkpoint then delta for late joiners',()=>{
  expect(sql).toContain('public.can_join_unipathway_class(session_id)');
  expect(sql).toContain('public.can_manage_unipathway_class(b.session_id)');
  expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.lesson_whiteboard_snapshots');
  expect(ui).toContain("db.from('lesson_whiteboard_snapshots')");
  expect(ui).toContain(".gt('sequence',seqRef.current)");
  expect(ui).toContain("p_board:boardId,p_through_sequence:next");
  expect(ui).toContain('<LectureInteractions sessionId={board.session_id} compact />');
 });
 it('uses one view receipt per student rather than a new database row per frame',()=>{
  expect(sql).toContain('PRIMARY KEY(board_id,user_id)');
  expect(sql).toContain("interval '55 seconds'");
  expect(ui).toContain('setInterval(beat,60_000)');
 });
});
