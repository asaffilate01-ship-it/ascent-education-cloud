import {afterAll,afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
const mock=vi.hoisted(()=>({rpc:vi.fn(),user:{id:'00000000-0000-4000-8000-000000000003',tenantId:'00000000-0000-4000-8000-000000000001',role:'security_officer',roles:['security_officer']}}));
vi.mock('@/components/security/SecurityCentrePicker',()=>({useSecurityPrincipal:()=>({user:mock.user,loading:false})}));
vi.mock('@/lib/db',()=>({db:{rpc:mock.rpc}}));
let WitnessedMuster:typeof import('@/components/security/WitnessedMuster')['default'];
beforeAll(async()=>{vi.stubEnv('VITE_UNIPATHWAY_SITE_OPERATIONS_ENABLED','true');vi.stubEnv('VITE_UNIPATHWAY_WITNESSED_MUSTER_ENABLED','true');WitnessedMuster=(await import('@/components/security/WitnessedMuster')).default;});
afterAll(()=>vi.unstubAllEnvs());afterEach(cleanup);
const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),tenant=id(1),event=id(2),uid=id(3),time='2026-11-25T06:00:00Z';
const incident={id:event,tenant_id:tenant,event_type:'drill',incident_reference:'Physical drill reference',started_by:uid,started_at:time};
const person={id:id(4),tenant_id:tenant,incident_id:event,label:'Example learner',person_type:'student',status:'unaccounted',revision:0,point:null,observed_at:null};
const base={tenant_id:tenant,incident,people:[person],history:[],audit:[],manager:false,officer:true,writes_enabled:true};
const success=(data:unknown)=>({data,error:null});
beforeEach(()=>{mock.rpc.mockReset();mock.user={id:uid,tenantId:tenant,role:'security_officer',roles:['security_officer']};});
it('requires an actual witness and explicit assembly point before recording safe',async()=>{
 mock.rpc.mockImplementation(async(method:string,args:any)=>method==='get_unipathway_witnessed_muster'?success(base):success({id:args.p_request,tenant_id:tenant,incident_id:event,person_id:person.id,status:'safe',revision:1}));
 render(<WitnessedMuster/>);fireEvent.click(await screen.findByRole('button',{name:/Record witnessed roll-call Example learner/}));
 fireEvent.change(screen.getByLabelText('Actual assembly point'),{target:{value:'Surveyed point A'}});
 fireEvent.change(screen.getByLabelText('Observation / correction reference'),{target:{value:'Physical roll-call reference'}});
 expect(screen.getByRole('button',{name:'Confirm witnessed safe'})).toBeDisabled();
 fireEvent.click(screen.getByRole('checkbox',{name:/I personally verified/}));fireEvent.click(screen.getByRole('button',{name:'Confirm witnessed safe'}));
 await screen.findByText(/Witnessed observation recorded/);
 expect(mock.rpc.mock.calls.filter(c=>c[0]==='observe_unipathway_witnessed_muster')).toHaveLength(1);
});
it('shows missing snapshot warning rather than an all-clear',async()=>{
 mock.rpc.mockResolvedValue(success({...base,people:[]}));render(<WitnessedMuster/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('No occupancy records were captured');expect(screen.queryByRole('button',{name:'Confirm witnessed safe'})).toBeNull();
});
it('fails closed on mixed-centre data and hides mutation forms',async()=>{
 mock.rpc.mockResolvedValue(success({...base,people:[{...person,tenant_id:id(9)}]}));render(<WitnessedMuster/>);expect(await screen.findByRole('alert')).toHaveTextContent('could not be verified');expect(screen.queryByText('Example learner')).toBeNull();
});
