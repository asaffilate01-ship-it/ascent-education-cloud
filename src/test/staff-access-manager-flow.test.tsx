import {afterAll,afterEach,beforeAll,beforeEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';

const mock=vi.hoisted(()=>({
 rpc:vi.fn(),centres:vi.fn(),loading:false,
 user:{id:'manager',tenantId:'centre-a',role:'centre_director',roles:['centre_director']},
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user,loading:mock.loading})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/components/modals/AddStaffModal',()=>({default:()=>null}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mock.rpc,from:(table:string)=>{
 if(table!=='tenants')throw Error('Unexpected table');
 const query={select:()=>query,order:()=>query,limit:()=>mock.centres()};return query;
}}}));

let StaffAccessManager:typeof import('@/pages/office/StaffAccessManager')['default'];
beforeAll(async()=>{
 vi.stubEnv('VITE_UNIPATHWAY_OFFICE_ACCESS_ENABLED','true');
 vi.stubEnv('VITE_UNIPATHWAY_STAFF_INVITES_ENABLED','false');
 StaffAccessManager=(await import('@/pages/office/StaffAccessManager')).default;
});
afterAll(()=>vi.unstubAllEnvs());
afterEach(cleanup);
const alice={id:'alice',name:'Alice Rivera',email:'alice@example.test',role:'office_admin'};
const ben={id:'ben',name:'Ben Carter',email:'ben@example.test',role:'secretary'};
const chloe={id:'chloe',name:'Chloe Ahmed',email:'chloe@example.test',role:'hr_officer'};
const directoryMethod='get_unipathway_staff_directory_for_manager';
const readMethod='get_unipathway_staff_access';
const writeMethod='set_unipathway_staff_access';
const success=(data:unknown)=>({data,error:null});
const access=(person=alice,centreId='centre-a',revision=4,overrides:Record<string,string>={})=>
 ({userId:person.id,role:person.role,centreId,revision,overrides});
function deferred(){
 let resolve!:(value:unknown)=>void;
 const promise=new Promise(resolvePromise=>{resolve=resolvePromise;});
 return {promise,resolve};
}
type RpcArgs={p_tenant?:string;p_target?:string;p_role?:string;p_expected_revision?:number;p_overrides?:Record<string,string>};
function defaultRpc(method:string,args:RpcArgs){
 if(method===directoryMethod)return Promise.resolve(success(args.p_tenant==='centre-b'?[chloe]:[alice,ben]));
 if(method===readMethod){
  const person=[alice,ben,chloe].find(person=>person.id===args.p_target)!;
  return Promise.resolve(success(access(person,person===chloe?'centre-b':'centre-a')));
 }
 if(method===writeMethod)return Promise.resolve(success({userId:args.p_target,role:args.p_role,
  centreId:args.p_target===chloe.id?'centre-b':'centre-a',revision:(args.p_expected_revision??0)+1,overrides:args.p_overrides}));
 throw Error('Unexpected RPC '+method);
}
beforeEach(()=>{
 mock.user={id:'manager',tenantId:'centre-a',role:'centre_director',roles:['centre_director']};mock.loading=false;
 mock.centres.mockReset().mockResolvedValue(success([{id:'centre-a',name:'Centre Alpha'},{id:'centre-b',name:'Centre Beta'}]));
 mock.rpc.mockReset().mockImplementation(defaultRpc);
});
const mount=()=>render(<MemoryRouter><StaffAccessManager/></MemoryRouter>);
const managerScope=()=>{mock.user={...mock.user,role:'superadmin',roles:['superadmin']};};
const writes=()=>mock.rpc.mock.calls.filter(([method])=>method===writeMethod);
const reads=()=>mock.rpc.mock.calls.filter(([method])=>method===readMethod);
async function select(person=alice){
 const selector=await screen.findByLabelText('Select an account and role');
 await act(async()=>{fireEvent.change(selector,{target:{value:person.id+':'+person.role}});});
}
async function ready(person=alice){await select(person);await screen.findByText(/Last verified revision 4/);}
function edit(label='Staff directory permission',value='deny'){
 fireEvent.change(screen.getByLabelText(label),{target:{value}});
}
async function review(){
 await act(async()=>{edit();fireEvent.click(screen.getByRole('button',{name:'Review permission changes'}));});
 return screen.findByRole('alertdialog',{name:'Apply permissions for Alice Rivera?'});
}

it.each([
 ['an unverified active director','centre_director',['lecturer'],false],
 ['a director membership while the active role is lecturer','lecturer',['centre_director','lecturer'],false],
 ['an account still loading','centre_director',['centre_director'],true],
] as const)('does not read staff records for %s',(_label,role,roles,loading)=>{
 mock.user={...mock.user,role,roles:[...roles]};mock.loading=loading;mount();
 expect(screen.getByRole(loading?'status':'alert')).toHaveTextContent(loading?'Verifying your active management role':'active, verified');
 expect(mock.rpc).not.toHaveBeenCalled();expect(mock.centres).not.toHaveBeenCalled();
});

it('distinguishes a failed directory from an empty directory and retries that read',async()=>{
 mock.rpc.mockResolvedValueOnce({data:null,error:{code:'42501'}}).mockResolvedValueOnce(success([]));
 mount();expect(await screen.findByRole('alert')).toHaveTextContent('Authorised office-staff records are unavailable');
 expect(screen.queryByText(/No verified office-role memberships/)).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Retry staff directory'}));
 expect(await screen.findByText(/No verified office-role memberships/)).toBeInTheDocument();
 expect(mock.rpc.mock.calls.map(([method])=>method)).toEqual([directoryMethod,directoryMethod]);
});

it('waits for a verified centre list and offers a targeted retry when it fails',async()=>{
 managerScope();mock.centres.mockResolvedValueOnce({data:null,error:{message:'offline'}});
 mount();expect(await screen.findByRole('alert')).toHaveTextContent('The centre list could not be verified');
 expect(mock.rpc).not.toHaveBeenCalled();expect(screen.getByLabelText('Centre')).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Retry centre list'}));
 await screen.findByLabelText('Select an account and role');
 expect(mock.centres).toHaveBeenCalledTimes(2);expect(mock.rpc).toHaveBeenCalledWith(directoryMethod,{p_tenant:'centre-a'});
});

it('ignores an old centre directory when the selected centre changes',async()=>{
 managerScope();const old=deferred();
 mock.rpc.mockImplementation((method,args)=>method===directoryMethod&&args.p_tenant==='centre-a'?old.promise:defaultRpc(method,args));
 mount();await waitFor(()=>expect(mock.rpc).toHaveBeenCalledWith(directoryMethod,{p_tenant:'centre-a'}));
 fireEvent.change(screen.getByLabelText('Centre'),{target:{value:'centre-b'}});
 await screen.findByRole('option',{name:'Chloe Ahmed · HR Officer'});
 await act(async()=>old.resolve(success([alice])));
 expect(screen.queryByRole('option',{name:'Alice Rivera · Office Administrator'})).toBeNull();
 expect(screen.getByLabelText('Centre')).toHaveValue('centre-b');
});

it('ignores a centre-list response from a superseded manager identity',async()=>{
 managerScope();const old=deferred();mock.centres.mockReturnValueOnce(old.promise);
 const view=mount();mock.user={...mock.user,id:'other-manager',tenantId:'centre-b'};
 view.rerender(<MemoryRouter><StaffAccessManager/></MemoryRouter>);
 await screen.findByRole('option',{name:'Chloe Ahmed · HR Officer'});
 await act(async()=>old.resolve(success([{id:'centre-old',name:'Stale centre'}])));
 expect(screen.queryByRole('option',{name:'Stale centre'})).toBeNull();
 expect(screen.getByLabelText('Centre')).toHaveValue('centre-b');
});

it('keeps a later same-centre selection when an older permission read finishes',async()=>{
 const old=deferred();mock.rpc.mockImplementation((method,args)=>method===readMethod&&args.p_target===alice.id?old.promise:defaultRpc(method,args));
 mount();await select();await ready(ben);
 await act(async()=>old.resolve(success(access(alice,'centre-a',31,{staff_directory:'allow'}))));
 expect(screen.getByLabelText('Select an account and role')).toHaveValue('ben:secretary');
 expect(screen.getByLabelText('Staff directory permission')).toHaveValue('default');
 expect(screen.getByText(/Last verified revision 4/)).toBeInTheDocument();
 edit('Staff directory permission','allow');fireEvent.click(screen.getByRole('button',{name:'Review permission changes'}));
 expect(await screen.findByRole('alertdialog',{name:'Apply permissions for Ben Carter?'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Apply and audit permissions'}));
 await screen.findByText(/Personal permissions updated.*Ben Carter/);expect(writes()).toHaveLength(1);
 expect(writes()[0][1]).toEqual({p_target:'ben',p_role:'secretary',p_expected_revision:4,p_overrides:{staff_directory:'allow'}});
});

it('does not allow a late permission response to cross the selected centre',async()=>{
 managerScope();const old=deferred();mock.rpc.mockImplementation((method,args)=>method===readMethod&&args.p_target===alice.id?old.promise:defaultRpc(method,args));
 mount();await select();fireEvent.change(screen.getByLabelText('Centre'),{target:{value:'centre-b'}});
 await ready(chloe);await act(async()=>old.resolve(success(access(alice,'centre-a',31,{staff_directory:'deny'}))));
 expect(screen.getByLabelText('Select an account and role')).toHaveValue('chloe:hr_officer');
 expect(screen.getByLabelText('Staff directory permission')).toHaveValue('default');
 expect(screen.getByText(/Last verified revision 4/)).toBeInTheDocument();expect(writes()).toHaveLength(0);
});

it('clears the permission form when the empty staff option is chosen, including a pending read',async()=>{
 const pending=deferred();mock.rpc.mockImplementation((method,args)=>method===readMethod?pending.promise:defaultRpc(method,args));
 mount();await select();fireEvent.change(screen.getByLabelText('Select an account and role'),{target:{value:''}});
 await act(async()=>pending.resolve(success(access())));
 expect(screen.getByLabelText('Select an account and role')).toHaveValue('');
 expect(screen.queryByLabelText('Staff directory permission')).toBeNull();expect(screen.queryByText(/Last verified revision/)).toBeNull();
 expect(writes()).toHaveLength(0);
});

it.each([
 ['a different person',{userId:'ben'}],['a different role',{role:'hr_officer'}],['a different centre',{centreId:'centre-b'}],
 ['a missing revision',{revision:undefined}],['an invalid revision',{revision:-1}],['missing overrides',{overrides:undefined}],
 ['unknown overrides',{overrides:{admin:'allow'}}],
])('rejects a permission read with %s and retries only the selected record',async(_label,patch)=>{
 let first=true;mock.rpc.mockImplementation((method,args)=>{
  if(method===readMethod&&first){first=false;return Promise.resolve(success({...access(),...patch}));}
  return defaultRpc(method,args);
 });
 mount();await select();expect(await screen.findByRole('alert')).toHaveTextContent('permission record could not be verified');
 expect(screen.queryByLabelText('Staff directory permission')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Retry permission record'}));await screen.findByText(/Last verified revision 4/);
 expect(reads().map(([,args])=>args)).toEqual([{p_target:'alice',p_role:'office_admin'},{p_target:'alice',p_role:'office_admin'}]);
 expect(mock.rpc.mock.calls.filter(([method])=>method===directoryMethod)).toHaveLength(1);expect(writes()).toHaveLength(0);
});

it('requires a named review and allows cancellation without changing permissions',async()=>{
 mount();await ready();const dialog=await review();
 expect(within(dialog).getByText(/Office Administrator at centre-a/)).toBeInTheDocument();
 expect(within(dialog).getByLabelText('Reviewed permission changes')).toHaveTextContent('Staff directoryRole default → Less access');
 expect(writes()).toHaveLength(0);
 fireEvent.click(within(dialog).getByRole('button',{name:'Keep editing'}));
 await waitFor(()=>expect(screen.queryByRole('alertdialog')).toBeNull());
 expect(screen.getByLabelText('Staff directory permission')).toHaveValue('deny');expect(writes()).toHaveLength(0);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Review permission changes'})).toHaveFocus());
});

it('freezes the selected target and draft and synchronously prevents duplicate saves',async()=>{
 managerScope();const pending=deferred();mock.rpc.mockImplementation((method,args)=>method===writeMethod?pending.promise:defaultRpc(method,args));
 mount();await ready();await review();
 const confirm=screen.getByRole('button',{name:'Apply and audit permissions'});
 act(()=>{fireEvent.click(confirm);fireEvent.click(confirm);});
 expect(writes()).toHaveLength(1);expect(screen.getByLabelText('Centre')).toBeDisabled();
 expect(screen.getByLabelText('Select an account and role')).toBeDisabled();expect(screen.getByLabelText('Staff directory permission')).toBeDisabled();
 expect(screen.getByRole('button',{name:'Keep editing'})).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Select an account and role'),{target:{value:'ben:secretary'}});
 fireEvent.change(screen.getByLabelText('Centre'),{target:{value:'centre-b'}});
 edit('Staff directory permission','allow');
 expect(reads()).toHaveLength(1);
 await act(async()=>pending.resolve(success(access(alice,'centre-a',5,{staff_directory:'deny'}))));
 expect(await screen.findByText(/Personal permissions updated.*Alice Rivera/)).toBeInTheDocument();
 expect(screen.getByLabelText('Centre')).toHaveValue('centre-a');expect(screen.getByLabelText('Select an account and role')).toHaveValue('alice:office_admin');
 expect(screen.getByLabelText('Staff directory permission')).toHaveValue('deny');expect(screen.getByText(/Last verified revision 5/)).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Review permission changes'})).toBeDisabled();
});

it.each([
 ['no receipt',null],['another person',{userId:'ben'}],['another role',{role:'secretary'}],['another centre',{centreId:'centre-b'}],
 ['the old revision',{revision:4}],['a skipped revision',{revision:6}],['different overrides',{overrides:{staff_directory:'allow'}}],
 ['missing overrides',{overrides:undefined}],['an extra unapproved override',{overrides:{staff_directory:'deny',admin:'allow'}}],
])('requires a fresh read after a save returns %s',async(_label,patch)=>{
 let readRevision=4;
 mock.rpc.mockImplementation((method,args)=>{
  if(method===readMethod)return Promise.resolve(success(access(alice,'centre-a',readRevision)));
  if(method===writeMethod)return Promise.resolve(success(patch===null?null:{...access(alice,'centre-a',5,{staff_directory:'deny'}),...patch}));
  return defaultRpc(method,args);
 });
 mount();await ready();await review();fireEvent.click(screen.getByRole('button',{name:'Apply and audit permissions'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Permission changes could not be confirmed');
 expect(screen.getByRole('button',{name:'Apply and audit permissions'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Apply and audit permissions'}));expect(writes()).toHaveLength(1);
 readRevision=8;fireEvent.click(screen.getByRole('button',{name:'Recheck this staff member'}));
 await screen.findByText(/Last verified revision 8/);expect(screen.getByLabelText('Staff directory permission')).toHaveValue('deny');
 expect(screen.getByText(/Your unsent draft is kept for review/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Review permission changes'}));
 expect(await screen.findByRole('alertdialog')).toHaveTextContent('verified revision 8');
 expect(reads()).toHaveLength(2);expect(writes()).toHaveLength(1);
});

it.each([
 ['a lost network response',{message:'Failed to fetch'}],['a stale revision',{code:'40001'}],
])('blocks further writes after %s, including after closing the review',async(_label,error)=>{
 mock.rpc.mockImplementation((method,args)=>method===writeMethod?Promise.resolve({data:null,error}):defaultRpc(method,args));
 mount();await ready();await review();fireEvent.click(screen.getByRole('button',{name:'Apply and audit permissions'}));
 await screen.findByText(/Permission changes could not be confirmed/);fireEvent.click(screen.getByRole('button',{name:'Keep editing'}));
 expect(screen.getByRole('button',{name:'Review permission changes'})).toBeDisabled();
 expect(screen.getByLabelText('Staff directory permission')).toBeDisabled();expect(screen.getByLabelText('Staff directory permission')).toHaveValue('deny');
 expect(screen.getByRole('button',{name:'Recheck this staff member'})).toBeEnabled();expect(writes()).toHaveLength(1);
});

it('keeps a draft editable after a definite server rejection without claiming it was saved',async()=>{
 mock.rpc.mockImplementation((method,args)=>method===writeMethod?Promise.resolve({data:null,error:{code:'42501'}}):defaultRpc(method,args));
 mount();await ready();await review();fireEvent.click(screen.getByRole('button',{name:'Apply and audit permissions'}));
 await screen.findByText(/The server rejected these permission changes/);
 expect(screen.getByRole('button',{name:'Apply and audit permissions'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Keep editing'}));
 expect(screen.getByLabelText('Staff directory permission')).toBeEnabled();expect(screen.getByLabelText('Staff directory permission')).toHaveValue('deny');
 expect(screen.getByText(/Last verified revision 4/)).toBeInTheDocument();expect(screen.queryByText(/Personal permissions updated/)).toBeNull();
});

it('accepts the exact normalized overrides regardless of object key order',async()=>{
 mock.rpc.mockImplementation((method,args)=>method===writeMethod?
  Promise.resolve(success(access(alice,'centre-a',5,{view_schedule:'deny',staff_directory:'deny'}))):defaultRpc(method,args));
 mount();await ready();edit('Read classroom schedule permission');await review();
 fireEvent.click(screen.getByRole('button',{name:'Apply and audit permissions'}));
 expect(await screen.findByText(/Personal permissions updated.*Alice Rivera/)).toBeInTheDocument();
 expect(writes()[0][1].p_overrides).toEqual({staff_directory:'deny',view_schedule:'deny'});
 expect(screen.getByRole('button',{name:'Review permission changes'})).toBeDisabled();
});

it('recognizes a previously uncertain write already present in the refreshed record',async()=>{
 let hasWritten=false;
 mock.rpc.mockImplementation((method,args)=>{
  if(method===writeMethod){hasWritten=true;return Promise.resolve(success(null));}
  if(method===readMethod&&hasWritten)return Promise.resolve(success(access(alice,'centre-a',5,{staff_directory:'deny'})));
  return defaultRpc(method,args);
 });
 mount();await ready();await review();fireEvent.click(screen.getByRole('button',{name:'Apply and audit permissions'}));
 await screen.findByText(/Permission changes could not be confirmed/);fireEvent.click(screen.getByRole('button',{name:'Recheck this staff member'}));
 expect(await screen.findByText(/The reviewed permission values are already recorded/)).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Review permission changes'})).toBeDisabled();expect(writes()).toHaveLength(1);
});

it.each(['lecturer','auth-loading'] as const)('does not show a stale save receipt after the active scope changes to %s',async(next)=>{
 const pending=deferred();mock.user.roles=['centre_director','lecturer'];
 mock.rpc.mockImplementation((method,args)=>method===writeMethod?pending.promise:defaultRpc(method,args));
 const view=mount();await ready();await review();fireEvent.click(screen.getByRole('button',{name:'Apply and audit permissions'}));
 if(next==='auth-loading')mock.loading=true;else mock.user={...mock.user,role:next};
 view.rerender(<MemoryRouter><StaffAccessManager/></MemoryRouter>);
 await act(async()=>pending.resolve(success(access(alice,'centre-a',5,{staff_directory:'deny'}))));
 expect(screen.queryByText(/Personal permissions updated/)).toBeNull();expect(screen.queryByRole('alertdialog')).toBeNull();expect(writes()).toHaveLength(1);
});

it('requires another manager to edit their own office role',async()=>{
 mock.user={...mock.user,id:alice.id};mount();await ready();
 expect(screen.getByText(/Ask another authorised manager/)).toBeInTheDocument();
 expect(screen.getByLabelText('Staff directory permission')).toBeDisabled();expect(screen.getByRole('button',{name:'Review permission changes'})).toBeDisabled();
 expect(writes()).toHaveLength(0);
});
