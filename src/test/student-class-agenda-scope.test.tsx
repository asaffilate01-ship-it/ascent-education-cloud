import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import StudentLearningAgenda from '@/components/student/StudentLearningAgenda';

const state=vi.hoisted(()=>({sessions:[] as Record<string,unknown>[],tables:[] as string[],moduleFilters:[] as unknown[][]}));
vi.mock('@/lib/db',()=>({db:{from:(table:string)=>{
 state.tables.push(table);
 let data=table==='live_class_sessions'?[...state.sessions]:[];
 const q:any={
  select:()=>q,
  eq:(field:string,value:unknown)=>{data=data.filter(r=>r[field]===value);return q;},
  in:(field:string,values:unknown[])=>{if(table==='live_class_sessions'&&field==='module_id')state.moduleFilters.push(values);data=data.filter(r=>values.includes(r[field]));return q;},
  gte:(field:string,value:string)=>{data=data.filter(r=>String(r[field])>=value);return q;},
  order:()=>q,
  range:async(start:number,end:number)=>({data:data.slice(start,end+1),error:null}),
  limit:async(limit:number)=>({data:data.slice(0,limit),error:null}),
 };
 return q;
}}}));
beforeEach(()=>{
 state.tables=[];state.moduleFilters=[];
 state.sessions=[
  {id:'enrolled-session',module_id:'mine',tenant_id:'centre',status:'scheduled',title:'My module workshop',starts_at:'2099-01-01T08:00:00Z',ends_at:'2099-01-01T10:00:00Z'},
  {id:'peer-session',module_id:'other-module',tenant_id:'centre',status:'scheduled',title:'Other programme class',starts_at:'2099-01-01T08:00:00Z',ends_at:'2099-01-01T10:00:00Z'},
  {id:'cross-centre',module_id:'mine',tenant_id:'different-centre',status:'scheduled',title:'Another centre class',starts_at:'2099-01-01T08:00:00Z',ends_at:'2099-01-01T10:00:00Z'},
  {id:'unassigned',module_id:null,tenant_id:'centre',status:'live',title:'Unassigned general class',starts_at:'2099-01-01T08:00:00Z',ends_at:'2099-01-01T10:00:00Z'},
 ];
});
afterEach(cleanup);
const show=(modules:string[])=>render(<MemoryRouter><StudentLearningAgenda tenant="centre" student="learner" moduleIds={modules}/></MemoryRouter>);
it('shows only this centre’s active enrolled-module sessions and does not claim an invitation',async()=>{
 show(['mine']);
 expect(await screen.findByText('My module workshop')).toBeInTheDocument();
 expect(screen.queryByText('Other programme class')).toBeNull();
 expect(screen.queryByText('Another centre class')).toBeNull();
 expect(screen.queryByText('Unassigned general class')).toBeNull();
 expect(state.moduleFilters).toEqual([['mine']]);
 expect(screen.getByRole('link',{name:/Check classroom invitation and access/})).toHaveAttribute('href','/student/classroom?module=mine');
 expect(screen.getByText(/separate approved class invitation and classroom permissions/)).toBeInTheDocument();
});
it('does not fetch any centre-wide classes when no active module has been verified',async()=>{
 show([]);
 expect(await screen.findByText('No upcoming sessions are visible for your active enrolled modules.')).toBeInTheDocument();
 expect(state.tables).not.toContain('live_class_sessions');
});
