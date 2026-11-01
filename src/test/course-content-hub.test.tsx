import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';

const state=vi.hoisted(()=>({
 user:{id:'director',tenantId:'centre-a',role:'centre_director',roles:['centre_director']} as {id:string;tenantId:string;role:string;roles:string[]},
 fail:false,
 tables:{} as Record<string,Record<string,unknown>[]>,
 queries:[] as {table:string;filters:{column:string;value:unknown}[]}[],
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({
 default:({title,children}:{title:string;children:React.ReactNode})=><main><h1>{title}</h1>{children}</main>
}));
vi.mock('@/lib/db',()=>({db:{from:(table:string)=>{
 const filters:{column:string;value:unknown}[]=[];
 const query={
  select:()=>query,
  eq:(column:string,value:unknown)=>{filters.push({column,value});return query;},
  in:(column:string,values:unknown[])=>{filters.push({column,value:values});return query;},
  order:()=>query,
  range:async(start:number,end:number)=>{
   state.queries.push({table,filters:[...filters]});
   if(state.fail)return {data:null,error:{message:'permission denied'}};
   const data=(state.tables[table]||[]).filter(r=>filters.every(f=>Array.isArray(f.value)?f.value.includes(r[f.column]):r[f.column]===f.value));
   return {data:data.slice(start,end+1),error:null};
  },
 };return query;
}}}));
import CourseContentHub from '@/pages/learning/CourseContentHub';
const page=()=>render(<MemoryRouter><CourseContentHub/></MemoryRouter>);
beforeEach(()=>{
 state.user={id:'director',tenantId:'centre-a',role:'centre_director',roles:['centre_director']};
 state.fail=false;state.queries=[];
 state.tables={
  programmes:[
   {id:'p1',tenant_id:'centre-a',title:'Business Diploma',level:'Level 4',awarding_body:'OTHM',status:'active',course_number:'Q-001'},
   {id:'p2',tenant_id:'centre-b',title:'Outside programme',level:'Level 3',awarding_body:'QUALIFI',status:'active'},
  ],
  modules:[
   {id:'m1',tenant_id:'centre-a',programme_id:'p1',title:'Business Foundations',lecturer_id:'teacher'},
   {id:'m2',tenant_id:'centre-a',programme_id:'p1',title:'Operations',lecturer_id:'other-teacher'},
   {id:'m3',tenant_id:'centre-b',programme_id:'p2',title:'Cross-centre',lecturer_id:'teacher'},
  ],
  unipathway_module_materials:[
   {id:'own',tenant_id:'centre-a',module_id:'m1',publication_status:'published'},
   {id:'draft',tenant_id:'centre-a',module_id:'m2',publication_status:'draft'},
   {id:'cross',tenant_id:'centre-b',module_id:'m1',publication_status:'published'}
  ]
 };
});
afterEach(cleanup);

it('shows actual course and resource coverage with direct authorised upload links',async()=>{
 page();
 await screen.findByRole('heading',{name:'Course content library'});
 await screen.findByText('Business Diploma');
 expect(screen.getByRole('heading',{name:'Cambridge International'})).toBeInTheDocument();
 expect(screen.getByText('Business Foundations')).toBeInTheDocument();
 expect(screen.getAllByRole('link',{name:/^Materials$/}).some(x=>x.getAttribute('href')==='/lecturer/materials?module=m1')).toBe(true);
 expect(screen.getByText('1 published resources')).toBeInTheDocument();
 expect(screen.queryByText('Outside programme')).toBeNull();
 expect(state.queries.filter(q=>q.table==='programmes').every(q=>q.filters.some(f=>f.column==='tenant_id'&&f.value==='centre-a'))).toBe(true);
});

it('limits a lecturer to their own allocated modules even within the same centre',async()=>{
 state.user={id:'teacher',tenantId:'centre-a',role:'lecturer',roles:['lecturer']};
 page();
 await screen.findByText('Business Foundations');
 expect(screen.queryByText('Operations')).toBeNull();
 expect(screen.queryByText('Manage programme records')).toBeNull();
 expect(state.queries.find(q=>q.table==='modules')?.filters).toContainEqual({column:'lecturer_id',value:'teacher'});
});

it('denies a student or another unassigned active role without querying catalogue data',async()=>{
 state.user={id:'student',tenantId:'centre-a',role:'student',roles:['student','lecturer']};
 page();
 expect(screen.getByRole('alert')).toHaveTextContent('verified centre assignment');
 expect(state.queries).toHaveLength(0);
});

it('avoids partial counts or material links on an inventory error',async()=>{
 state.fail=true;page();
 await screen.findByRole('alert');
 expect(screen.queryByText('Business Diploma')).toBeNull();
 expect(screen.queryByRole('link',{name:/^Materials$/})).toBeNull();
 state.fail=false;fireEvent.click(screen.getByRole('button',{name:'Retry'}));
 await waitFor(()=>expect(screen.queryByRole('alert')).toBeNull());
});
