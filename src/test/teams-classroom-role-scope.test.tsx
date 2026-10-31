import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
const state=vi.hoisted(()=>({
 user:{id:'learner',tenantId:'centre-a',role:'student',roles:['student','lecturer']} as any,
 calls:[] as {table:string;filters:[string,unknown][]}[],
 classes:[
  {id:'s1',tenant_id:'centre-a',module_id:'module-a',title:'My authorised workshop',starts_at:'2099-01-01T10:00:00Z',ends_at:'2099-01-01T11:00:00Z',status:'scheduled',join_url:null,class_mode:'seminar',recording_enabled:false,capacity:15},
  {id:'s2',tenant_id:'centre-b',module_id:'module-b',title:'Private other centre class',starts_at:'2099-01-01T10:00:00Z',ends_at:'2099-01-01T11:00:00Z',status:'scheduled',join_url:null,class_mode:'seminar',recording_enabled:false,capacity:15}
 ] as any[]
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/components/assessment/ModuleJourney',()=>({default:()=>null}));
vi.mock('@/components/native/TeamsLink',()=>({default:()=>null}));
vi.mock('@/lib/db',()=>({db:{from:(table:string)=>{
 const filters:[string,unknown][]=[];
 const q:any={
  select:()=>q,
  eq:(column:string,value:unknown)=>{filters.push([column,value]);return q;},
  order:()=>q,limit:(n:number)=>{
   state.calls.push({table,filters});
   const raw=table==='live_class_sessions'?state.classes:[];
   return Promise.resolve({data:raw.filter(row=>filters.every(([col,val])=>row[col]===val)).slice(0,n),error:null});
  }
 };return q;
}}}));
import TeamsClassroom from '@/pages/classroom/TeamsClassroom';
beforeEach(()=>{state.calls=[];state.user={id:'learner',tenantId:'centre-a',role:'student',roles:['student','lecturer']};});
afterEach(cleanup);
const show=()=>render(<MemoryRouter initialEntries={['/student/classroom']}><TeamsClassroom/></MemoryRouter>);
it('reads only current centre sessions and whiteboards even if provider response includes other records',async()=>{
 show();
 expect(await screen.findByText('My authorised workshop')).toBeInTheDocument();
 expect(screen.queryByText('Private other centre class')).toBeNull();
 expect(state.calls.map(x=>x.table)).toEqual(['live_class_sessions','lesson_whiteboards']);
 expect(state.calls.every(x=>x.filters.some(([key,value])=>key==='tenant_id'&&value==='centre-a'))).toBe(true);
});
it('a secondary lecturer membership never unlocks active student teaching links',async()=>{
 show();await screen.findByText('My authorised workshop');
 expect(screen.queryByRole('link',{name:/Class scheduling/})).toBeNull();
 expect(screen.getByRole('link',{name:/Class resources & recordings/})).toBeInTheDocument();
});
it('a missing assigned centre refuses class queries and shows explicit recovery',async()=>{
 state.user={id:'learner',role:'student',roles:['student'],tenantId:undefined};
 show();
 expect(await screen.findByRole('alert')).toHaveTextContent('verified centre assignment');
 expect(state.calls).toEqual([]);
 expect(screen.queryByText('My authorised workshop')).toBeNull();
});
