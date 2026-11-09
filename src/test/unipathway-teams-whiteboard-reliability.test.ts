import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {
 activeClassroomCentre,activeClassroomTeacher,activeWhiteboardManager,
 mayEditWhiteboard,verifyClassroomRows
} from '@/lib/classroomScope';
import {
 whiteboardSvg,isWhiteboardOperation,replayWhiteboard,
 whiteboardTimelineMs,toCanvasPoint,type WhiteboardEvent
} from '@/lib/whiteboardOperations';

const person={id:'teacher-a',tenantId:'centre-a',role:'lecturer',roles:['lecturer']};
const board={tenant_id:'centre-a',prepared_by:'teacher-a',locked_after_class:false};
const pen={type:'stroke' as const,color:'#0B2D5B',width:3,
 points:[[0,0],[100,200]] as [number,number][]};
const annotation={type:'text' as const,x:140,y:210,color:'#16A34A',
 text:'X <y> & "measure" \'single\'\nTeam'};
describe('classroom role switching and tenant boundary',()=>{
 it('requires the explicitly selected active role and centre for every teaching surface',()=>{
  expect(activeClassroomCentre(person)).toBe('centre-a');
  expect(activeClassroomTeacher(person)).toBe(true);
  expect(activeClassroomCentre({...person,role:'student',roles:['lecturer','student']})).toBe('centre-a');
  expect(activeClassroomTeacher({...person,role:'student',roles:['lecturer','student']})).toBe(false);
  expect(activeClassroomCentre({...person,role:'student',roles:['lecturer']})).toBeNull();
  expect(activeClassroomCentre({...person,tenantId:undefined})).toBeNull();
  expect(activeClassroomCentre({...person,role:'agent',roles:['agent']})).toBeNull();
 });
 it('never elevates a secondary manager role for whiteboard editing',()=>{
  expect(mayEditWhiteboard(person,board)).toBe(true);
  expect(mayEditWhiteboard({...person,role:'student',roles:['student','lecturer']},board)).toBe(false);
  expect(mayEditWhiteboard({...person,role:'programme_leader',roles:['student','lecturer']},board)).toBe(false);
  expect(mayEditWhiteboard({...person,role:'programme_leader',roles:['programme_leader']},board)).toBe(true);
  expect(activeWhiteboardManager({...person,role:'superadmin',roles:['superadmin'],tenantId:undefined})).toBe(false);
  expect(mayEditWhiteboard(person,{...board,tenant_id:'centre-b'})).toBe(false);
  expect(mayEditWhiteboard(person,{...board,locked_after_class:true})).toBe(false);
  expect(mayEditWhiteboard({...person,id:'another-teacher'},board)).toBe(false);
 });
 it('rejects a mixed-centre response rather than showing a partial roster',()=>{
  expect(verifyClassroomRows([{tenant_id:'centre-a',id:'one'}],'centre-a')).toHaveLength(1);
  expect(()=>verifyClassroomRows([{tenant_id:'centre-a'},{tenant_id:'centre-b'}],'centre-a')).toThrow();
  expect(()=>verifyClassroomRows(null,'centre-a')).toThrow();
 });
 it('classroom components are remounted on role and centre changes and do not query private rows without scope',()=>{
  const paths=['src/pages/classroom/WhiteboardStudio.tsx','src/pages/classroom/LiveWhiteboard.tsx','src/pages/classroom/TeamsClassroom.tsx'];
  const sources=paths.map(path=>readFileSync(path,'utf8'));
  expect(sources.slice(0,2).every(s=>s.includes('activeClassroomCentre'))).toBe(true);
  expect(sources.slice(0,2).every(s=>s.includes("user?.roles?.join(',')"))).toBe(true);
  expect(sources[0]).toContain("data.tenant_id!==centre");
  expect(sources[1]).toContain("selected.tenant_id!==centre");
  // The newer main-branch classroom keeps paginated session-first reads,
  // selected-session deep links, and a verified active role/centre boundary.
  expect(sources[2]).toContain('user.roles?.includes(user.role)');
  expect(sources[2]).toContain('const scoped = rows.filter(row => row.tenant_id === tenant');
  expect(sources[2]).toContain('board.tenant_id === tenant && allowed.has(board.session_id)');
  const desk=readFileSync('src/pages/classroom/TeamsTeachingDesk.tsx','utf8');
  expect(desk.indexOf("db.rpc('get_unipathway_teams_plan'")).toBeLessThan(desk.indexOf("db.from('live_class_sessions')"));
  expect(desk).toContain("if(!centre||!user?.id)");
 });
});
describe('whiteboard replay and private educator export',()=>{
 it('exports only validated SVG drawing content with escaped text, not arbitrary HTML',()=>{
  expect(isWhiteboardOperation(annotation)).toBe(true);
  const svg=whiteboardSvg([pen,annotation]);
  expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
  expect(svg).toContain('&lt;y&gt; &amp; &quot;measure&quot; &apos;single&apos;');
  expect(svg).not.toContain('<y>');
  expect(svg).not.toContain('<script>');
  expect(svg).not.toContain('teacher-a');
  expect(svg).not.toContain('centre-a');
  expect(()=>whiteboardSvg([{...annotation,x:NaN}])).toThrow();
 });
 it('replays strokes by sequence even if a cached provider response is out of order',()=>{
  const t='2026-11-04T09:00:00Z';
  const events:WhiteboardEvent[]=[
   {sequence:3,operation:{type:'clear'},created_at:'2026-11-04T09:00:04Z'},
   {sequence:1,operation:pen,created_at:t},
   {sequence:2,operation:annotation,created_at:'2026-11-04T09:00:02Z'},
   {sequence:4,operation:pen,created_at:'2026-11-04T09:00:05Z'}
  ];
  expect(whiteboardTimelineMs(events)).toBe(5000);
  expect(replayWhiteboard(events,2500)).toHaveLength(2);
  expect(replayWhiteboard(events,4500)).toHaveLength(0);
  expect(replayWhiteboard(events,5000)).toHaveLength(1);
  expect(replayWhiteboard(events,-1)).toHaveLength(0);
 });
 it('handles invisible/zero-size canvas measurements without emitting NaN operations',()=>{
  expect(toCanvasPoint(100,100,{left:0,top:0,width:0,height:100})).toEqual([0,0]);
  expect(toCanvasPoint(100,100,{left:0,top:0,width:100,height:0})).toEqual([0,0]);
 });
 it('shows instructor-only export and keyboard text controls without replacing Microsoft Teams',()=>{
  const ui=readFileSync('src/pages/classroom/LiveWhiteboard.tsx','utf8');
  expect(ui).toContain('Place text at centre (keyboard)');
  expect(ui).toContain('Export drawing (SVG)');
  expect(ui).toContain('if(!editable||mode');
  expect(ui).toContain('aria-live="polite"');
  const teams=readFileSync('src/pages/classroom/TeamsTeachingDesk.tsx','utf8');
  expect(teams).toContain('Audio, cameras, screen sharing and room membership are controlled in Teams.');
 });
});
