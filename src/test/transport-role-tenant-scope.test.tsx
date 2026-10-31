import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {readFileSync} from 'node:fs';
const mock=vi.hoisted(()=>({
 user:{id:'student-a',tenantId:'centre-a',role:'student'} as any,
 fail:'',calls:[] as {table:string;options:any}[],
 rows:{
  transport_assignments:[
   {id:'a1',tenant_id:'centre-a',student_id:'student-a',route_id:'r1',status:'active'},
   {id:'a2',tenant_id:'centre-a',student_id:'student-b',route_id:'r2',status:'active'},
   {id:'a3',tenant_id:'centre-b',student_id:'student-a',route_id:'r3',status:'active'}],
  transport_routes:[
   {id:'r1',tenant_id:'centre-a',route_name:'Own route',vehicle_id:'v1',stops:[],status:'active'},
   {id:'r2',tenant_id:'centre-a',route_name:'Peer private route',vehicle_id:'v2',stops:[],status:'active'},
   {id:'r3',tenant_id:'centre-b',route_name:'Cross centre route',vehicle_id:'v3',stops:[],status:'active'}],
  transport_vehicles:[
   {id:'v1',tenant_id:'centre-a',vehicle_number:'LHR-001',driver_name:'Driver',driver_phone:'PRIVATE-001',vehicle_type:'van',capacity:10,status:'active'},
   {id:'v2',tenant_id:'centre-a',vehicle_number:'LHR-002',driver_name:'Peer driver',driver_phone:'PRIVATE-002',vehicle_type:'bus',capacity:20,status:'active'},
   {id:'v3',tenant_id:'centre-b',vehicle_number:'OTHER-CENTRE',driver_name:'Other',driver_phone:'PRIVATE-003',vehicle_type:'bus',capacity:20,status:'active'},
  ],
 } as Record<string,Record<string,unknown>[]>,
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/hooks/useSupabaseQuery',()=>({useSupabaseQuery:(table:string,options:any)=>{
 mock.calls.push({table,options});
 const data=options.enabled===false?[]:(mock.rows[table]||[]).filter(row=>(options.filters||[]).every((f:any)=>f.operator==='eq'?row[f.column]===f.value:f.operator==='in'?f.value.includes(row[f.column]):true));
 return {data,loading:false,error:mock.fail===table?'offline':null,refetch:vi.fn()};
}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>({})}}));
vi.mock('sonner',()=>({toast:{error:vi.fn(),success:vi.fn()}}));
import TransportTracking from '@/pages/transport/TransportTracking';
beforeEach(()=>{mock.user={id:'student-a',tenantId:'centre-a',role:'student'};mock.fail='';mock.calls=[];});
afterEach(cleanup);
const show=()=>render(<MemoryRouter><TransportTracking/></MemoryRouter>);
it('only reads assigned routes and vehicles for student within their current centre',()=>{
 show();
 expect(mock.calls.find(x=>x.table==='transport_assignments')?.options.filters).toEqual([
  {column:'tenant_id',operator:'eq',value:'centre-a'},
  {column:'student_id',operator:'eq',value:'student-a'}
 ]);
 expect(mock.calls.find(x=>x.table==='transport_routes')?.options.filters).toEqual([
  {column:'tenant_id',operator:'eq',value:'centre-a'},
  {column:'id',operator:'in',value:['r1']}
 ]);
 expect(mock.calls.find(x=>x.table==='transport_vehicles')?.options.filters).toEqual([
  {column:'tenant_id',operator:'eq',value:'centre-a'},
  {column:'id',operator:'in',value:['v1']}
 ]);
 expect(screen.getByText('Own route')).toBeInTheDocument();
 expect(screen.queryByText('Peer private route')).toBeNull();
 expect(screen.queryByText('Cross centre route')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Vehicles'}));
 expect(screen.queryByText(/PRIVATE-001/)).toBeNull();
 expect(screen.getByText('LHR-001')).toBeInTheDocument();
});
it('management sees only the assigned centre and may register vehicles, but not another centre',()=>{
 mock.user={id:'manager',tenantId:'centre-a',role:'centre_director'};
 show();
 expect(mock.calls.every(q=>q.options.filters.some((f:any)=>f.column==='tenant_id'&&f.value==='centre-a'))).toBe(true);
 expect(screen.getByText('Own route')).toBeInTheDocument();
 expect(screen.getByText('Peer private route')).toBeInTheDocument();
 expect(screen.queryByText('Cross centre route')).toBeNull();
 expect(screen.getByRole('button',{name:'Register vehicle'})).toBeInTheDocument();
});
it('a user without an authorised role does not query transport or receive student assignment data',()=>{
 mock.user={id:'agent',tenantId:'centre-a',role:'agent'};
 show();
 expect(mock.calls.every(q=>q.options.enabled===false)).toBe(true);
 expect(screen.getByRole('alert')).toHaveTextContent('transport-authorised centre staff');
 expect(screen.queryByText('Own route')).toBeNull();
});
it('failed route reads do not appear as empty successful routes',()=>{
 mock.fail='transport_routes';show();
 expect(screen.getByRole('alert')).toHaveTextContent('could not be verified');
 expect(screen.queryByText('Own route')).toBeNull();
});
it('transport route is not generic to any signed-in account',()=>{
 const app=readFileSync('src/App.tsx','utf8');
 expect(app).toContain('path="/transport" element={<RoleGuard allowed=');
 expect(app).not.toContain('path="/transport" element={<P><TransportTracking');
});
