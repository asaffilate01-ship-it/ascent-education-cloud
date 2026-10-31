import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {readFileSync} from 'node:fs';
const state=vi.hoisted(()=>({
 user:{id:'user',role:'finance_officer',roles:['finance_officer'],tenantId:'centre-a'} as any,
 error:'',calls:[] as {table:string;options:any}[],
 sources:{
  invoices:[
   {id:'invoice-a',tenant_id:'centre-a',amount:5000,paid:2000,status:'partial'},
   {id:'invoice-b',tenant_id:'centre-b',amount:1000,paid:1000,status:'paid'}
  ],
  applications:[
   {id:'app-a',tenant_id:'centre-a',stage:'applied'},
   {id:'app-b',tenant_id:'centre-b',stage:'enrolled'}
  ],
  programmes:[{id:'p-a',tenant_id:'centre-a',title:'Business'}],
  attendance_records:[{id:'mark-a',tenant_id:'centre-a',status:'present'}],
  modules:[
   {id:'my-module',tenant_id:'centre-a',lecturer_id:'user'},
   {id:'peer-module',tenant_id:'centre-a',lecturer_id:'peer'}],
 } as Record<string,Record<string,unknown>[]>,
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children,title}:{children:React.ReactNode;title:string})=><main><h1>{title}</h1>{children}</main>}));
vi.mock('@/hooks/useSupabaseQuery',()=>({useSupabaseQuery:(table:string,options:any)=>{
 state.calls.push({table,options});
 const rows=options.enabled===false?[]:(state.sources[table]||[]).filter(r=>(options.filters||[]).every((f:any)=>f.operator!=='eq'||r[f.column]===f.value));
 return {data:rows,loading:false,error:state.error===table?'unavailable':null,refetch:vi.fn()};
}}));
import RoleAnalyticsDashboard from '@/pages/analytics/RoleAnalyticsDashboard';
beforeEach(()=>{state.calls=[];state.error='';state.user={id:'user',role:'finance_officer',roles:['finance_officer'],tenantId:'centre-a'};});
afterEach(cleanup);
const show=()=>render(<MemoryRouter><RoleAnalyticsDashboard/></MemoryRouter>);
it('finance only requests own centre invoices and never another role’s admissions, attendance or grades',()=>{
 show();
 expect(state.calls.filter(x=>x.options.enabled).map(x=>x.table)).toEqual(['invoices']);
 expect(state.calls.find(x=>x.table==='invoices')?.options.filters).toEqual([{column:'tenant_id',operator:'eq',value:'centre-a'}]);
 expect(screen.getByText('Unpaid invoice balances')).toBeInTheDocument();
 expect(screen.queryByText('Recorded applications')).toBeNull();
 expect(state.calls.map(x=>x.table)).not.toContain('submissions');
});
it('marketing sees admissions status counts but does not request private invoices or grade data',()=>{
 state.user={id:'marketer',role:'marketing_officer',roles:['marketing_officer'],tenantId:'centre-a'};
 show();expect(state.calls.filter(x=>x.options.enabled).map(x=>x.table)).toEqual(['applications']);
 expect(screen.getByText('Recorded applications')).toBeInTheDocument();
 expect(screen.queryByText('Recorded invoices')).toBeNull();
});
it('lecturer reports are restricted to explicitly assigned modules',()=>{
 state.user={id:'user',role:'lecturer',roles:['lecturer'],tenantId:'centre-a'};
 show();
 expect(state.calls.filter(x=>x.options.enabled).map(x=>x.table)).toEqual(['modules']);
 expect(state.calls.find(x=>x.table==='modules')?.options.filters).toEqual([
  {column:'tenant_id',operator:'eq',value:'centre-a'},
  {column:'lecturer_id',operator:'eq',value:'user'}
 ]);
 expect(screen.getByText('My assigned modules')).toBeInTheDocument();
 expect(screen.getByText('1')).toBeInTheDocument();
});
it('a secondary assigned finance role cannot unlock finance while acting as a learner',()=>{
 state.user={id:'student',role:'student',roles:['student','finance_officer'],tenantId:'centre-a'};
 show();expect(state.calls.every(c=>c.options.enabled===false)).toBe(true);
 expect(screen.getByRole('alert')).toHaveTextContent('verified reporting role');
});
it('one denied report source blocks the entire affected report, rather than showing misleading figures',()=>{
 state.error='invoices';show();
 expect(screen.getByRole('alert')).toHaveTextContent('No partial statistics are displayed');
 expect(screen.queryByText('Recorded invoices')).toBeNull();
});
it('all six role-specific reporting routes use scoped reporting and the former shared dashboard is not used for internal routes',()=>{
 const app=readFileSync('src/App.tsx','utf8');
 for(const path of ['/director/reports','/admissions/reports','/lecturer/analytics','/programme/analytics','/finance/reports','/marketing/analytics']){
  const line=app.split('\n').find(x=>x.includes('path="'+path+'"'))||'';
  expect(line).toContain('<RoleAnalyticsDashboard />');
 }
});
