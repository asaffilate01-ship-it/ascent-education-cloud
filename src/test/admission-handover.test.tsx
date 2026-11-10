import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import AdmissionHandover from '@/components/admissions/AdmissionHandover';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn(),user:{id:'admissions',tenantId:'centre-a',role:'admissions_admin',roles:['admissions_admin']}}));
vi.mock('@/lib/db',()=>({db:{rpc:mocks.rpc,from:(...args:unknown[])=>mocks.from(...args)}}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mocks.user})}));
afterEach(cleanup);beforeEach(()=>{mocks.rpc.mockReset();mocks.from.mockReset();});
const app={id:'app',student_name:'QA Learner',email:'qa@example.invalid',stage:'unconditional_offer',programme_name:'Approved programme'};
const enrolmentId='11111111-1111-4111-8111-111111111111';
const options={data:{candidates:[{id:'student',name:'QA Learner',email:'qa@example.invalid'}],programmes:[{id:'programme',title:'Approved programme'}]}};
async function choose(){fireEvent.click(screen.getByRole('button',{name:'Review enrolment for QA Learner'}));await screen.findByText('QA Learner · qa@example.invalid',{selector:'option'});fireEvent.change(screen.getByLabelText('Confirmed learner'),{target:{value:'student'}});fireEvent.change(screen.getByLabelText('Active programme'),{target:{value:'programme'}});fireEvent.change(screen.getByLabelText('Admission decision and evidence reference'),{target:{value:'Approved offer and verified identity evidence reviewed'}});}
it('does not offer enrolment for leads without an approved offer',()=>{render(<AdmissionHandover applications={[{...app,stage:'lead'}]} onRefetch={()=>{}}/>);expect(screen.queryByRole('button',{name:/Review enrolment/})).not.toBeInTheDocument();});
it('blocks submission if account/programme verification fails',async()=>{mocks.rpc.mockResolvedValue({error:{message:'Unavailable'}});render(<AdmissionHandover applications={[app]} onRefetch={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:/Review enrolment/}));await screen.findByRole('alert');expect(screen.getByRole('button',{name:'Confirm academic enrolment'})).toBeDisabled();});
it('confirms the chosen account and programme through the transactional RPC',async()=>{mocks.rpc.mockResolvedValueOnce(options).mockResolvedValueOnce({data:enrolmentId,error:null});const refresh=vi.fn();render(<AdmissionHandover applications={[app]} onRefetch={refresh}/>);await choose();fireEvent.click(screen.getByRole('button',{name:'Confirm academic enrolment'}));await waitFor(()=>expect(refresh).toHaveBeenCalledOnce());expect(mocks.rpc).toHaveBeenLastCalledWith('complete_unipathway_admission',{p_application:'app',p_student:'student',p_programme:'programme',p_expected_stage:'unconditional_offer',p_note:'Approved offer and verified identity evidence reviewed'});expect(screen.getByRole('status')).toHaveTextContent('Academic enrolment receipt confirmed');});
it('retains the review and reports rejection without claiming success',async()=>{mocks.rpc.mockResolvedValueOnce(options).mockResolvedValueOnce({error:{message:'Application changed; refresh'}});const refresh=vi.fn();render(<AdmissionHandover applications={[app]} onRefetch={refresh}/>);await choose();fireEvent.click(screen.getByRole('button',{name:'Confirm academic enrolment'}));expect(await screen.findByRole('alert')).toHaveTextContent('Application changed');expect(refresh).not.toHaveBeenCalled();expect(screen.getByLabelText('Admission decision and evidence reference')).toHaveValue('Approved offer and verified identity evidence reviewed');});

it('blocks false-positive success when RPC returns a non-UUID acknowledgement and prevents repeat submission',async()=>{
 mocks.rpc.mockResolvedValueOnce(options).mockResolvedValueOnce({data:{success:true},error:null});
 const onRefetch=vi.fn();render(<AdmissionHandover applications={[app]} onRefetch={onRefetch}/>);
 await choose();
 fireEvent.click(screen.getByRole('button',{name:'Confirm academic enrolment'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('No verifiable enrolment receipt');
 expect(screen.getByRole('button',{name:'Confirm academic enrolment'})).toBeDisabled();
 expect(screen.getByRole('button',{name:'Check recorded enrolment status'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Confirm academic enrolment'}));
 expect(mocks.rpc).toHaveBeenCalledTimes(2);
 expect(onRefetch).not.toHaveBeenCalled();
});
it('checks the exact current-centre enrolment when an RPC result is uncertain',async()=>{
 mocks.rpc.mockResolvedValueOnce(options).mockResolvedValueOnce({data:null,error:{message:'Connection interrupted'}});
 const chain:Record<string,unknown>={};const filters=vi.fn();
 for(const method of ['select','eq','limit'])chain[method]=(...args:unknown[])=>{filters(method,...args);return chain;};
 chain.then=(resolve:(value:unknown)=>unknown)=>Promise.resolve({data:[{
  id:enrolmentId,application_id:'app',student_id:'student',programme_id:'programme',
  tenant_id:'centre-a',status:'active',
 }],error:null}).then(resolve);
 mocks.from.mockReturnValue(chain);
 const onRefetch=vi.fn();render(<AdmissionHandover applications={[app]} onRefetch={onRefetch}/>);
 await choose();
 fireEvent.click(screen.getByRole('button',{name:'Confirm academic enrolment'}));
 await screen.findByRole('alert');
 fireEvent.click(screen.getByRole('button',{name:'Check recorded enrolment status'}));
 await waitFor(()=>expect(onRefetch).toHaveBeenCalledOnce());
 expect(mocks.from).toHaveBeenCalledWith('student_enrolments');
 expect(filters).toHaveBeenCalledWith('eq','application_id','app');
 expect(filters).toHaveBeenCalledWith('eq','student_id','student');
 expect(filters).toHaveBeenCalledWith('eq','programme_id','programme');
 expect(filters).toHaveBeenCalledWith('eq','tenant_id','centre-a');
});
it('does not accept another case, centre or a missing record as an enrolment confirmation',async()=>{
 mocks.rpc.mockResolvedValueOnce(options).mockResolvedValueOnce({data:'unverified',error:null});
 const chain:Record<string,unknown>={};
 for(const method of ['select','eq','limit'])chain[method]=()=>chain;
 chain.then=(resolve:(value:unknown)=>unknown)=>Promise.resolve({data:[{
  id:enrolmentId,application_id:'another-application',student_id:'student',
  programme_id:'programme',tenant_id:'centre-b',status:'active',
 }],error:null}).then(resolve);
 mocks.from.mockReturnValue(chain);
 const saved=vi.fn();render(<AdmissionHandover applications={[app]} onRefetch={saved}/>);
 await choose();fireEvent.click(screen.getByRole('button',{name:'Confirm academic enrolment'}));
 await screen.findByRole('alert');
 fireEvent.click(screen.getByRole('button',{name:'Check recorded enrolment status'}));
 expect(await screen.findByRole('alert')).toHaveTextContent(/No matching active enrolment/);
 expect(saved).not.toHaveBeenCalled();
});
it('rejects malformed admission options and does not let staff choose unverified accounts',async()=>{
 mocks.rpc.mockResolvedValueOnce({data:{candidates:'not-an-array',programmes:[]},error:null});
 render(<AdmissionHandover applications={[app]} onRefetch={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Review enrolment for QA Learner'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('The learner and programme could not be verified');
 expect(screen.getByRole('button',{name:'Confirm academic enrolment'})).toBeDisabled();
});
