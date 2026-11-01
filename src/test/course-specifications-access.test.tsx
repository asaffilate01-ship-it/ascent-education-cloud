import {cleanup,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
const mock=vi.hoisted(()=>({
 user:{id:'director-a',tenantId:'centre-a',role:'centre_director',roles:['centre_director']} as {
  id:string;tenantId:string;role:string;roles:string[];
 },
 tables:[] as string[],errors:false,
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({
 default:({title,children}:{title:string;children:React.ReactNode})=><main><h1>{title}</h1>{children}</main>
}));
vi.mock('@/lib/db',()=>({db:{
 from:(table:string)=>{
  mock.tables.push(table);
  const query={
   select:()=>query,
   eq:()=>query,
   order:()=>query,
   range:async()=>({data:mock.errors?null:[],error:mock.errors?{message:'denied'}:null})
  };
  return query;
 },rpc:vi.fn()
}}));
import CourseSpecifications from '@/pages/learning/CourseSpecifications';
const mount=()=>render(<MemoryRouter><CourseSpecifications/></MemoryRouter>);
beforeEach(()=>{
 mock.user={id:'director-a',tenantId:'centre-a',role:'centre_director',roles:['centre_director']};
 mock.tables=[];mock.errors=false;vi.stubEnv('VITE_UNIPATHWAY_COURSE_REGISTRY_ENABLED','');
});
afterEach(()=>{cleanup();vi.unstubAllEnvs();});

it('shows an honest source-activation explanation instead of a broken production form',()=>{
 mount();
 expect(screen.getByRole('heading',{name:'Registry activation is pending'})).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Save unverified draft'})).toBeNull();
 expect(mock.tables).toHaveLength(0);
});
it('does not reveal a registry to learners even if assigned a secondary staff role',()=>{
 vi.stubEnv('VITE_UNIPATHWAY_COURSE_REGISTRY_ENABLED','true');
 mock.user={...mock.user,role:'student',roles:['student','centre_director']};
 mount();
 expect(screen.getByRole('alert')).toHaveTextContent('active centre director');
 expect(mock.tables).toHaveLength(0);
});
it('shows board-version registration only for authorised centre managers after activation',async()=>{
 vi.stubEnv('VITE_UNIPATHWAY_COURSE_REGISTRY_ENABLED','true');
 mount();
 await screen.findByRole('heading',{name:'Record a qualification specification'});
 expect(screen.getByRole('option',{name:'ATHE'})).toBeInTheDocument();
 expect(screen.getByRole('option',{name:'Cambridge International'})).toBeInTheDocument();
 expect(screen.getByRole('heading',{name:'Review material distribution rights'})).toBeInTheDocument();
 expect(mock.tables).toEqual(expect.arrayContaining([
  'unipathway_course_specifications','unipathway_material_rights','modules'
 ]));
});
it('hides all partial records when the staging registry rejects a query',async()=>{
 vi.stubEnv('VITE_UNIPATHWAY_COURSE_REGISTRY_ENABLED','true');
 mock.errors=true;mount();
 await screen.findByRole('alert');
 expect(screen.queryByRole('button',{name:'Save unverified draft'})).toBeNull();
});
it('enforces different reviewer and owned rights checks in the SQL source',()=>{
 const sql=readFileSync('scripts/activation/unipathway-course-specifications-and-rights-forward.sql','utf8');
 expect(sql).toContain("v.created_by=auth.uid()");
 expect(sql).toContain("r.created_by=auth.uid()");
 expect(sql).toContain("review_status='approved'");
 expect(sql).toContain("s.review_status='reviewed'");
 expect(sql).toContain('AS RESTRICTIVE');
 expect(sql).toContain("authorisation_status = 'unverified'");
 expect(sql).toContain("rights_basis='official_link_only'");
});
