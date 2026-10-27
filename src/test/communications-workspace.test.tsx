import {render,screen,fireEvent,waitFor} from '@testing-library/react';import {MemoryRouter} from 'react-router-dom';import {describe,it,expect,vi} from 'vitest';
import CommunicationsWorkspace from '@/pages/messaging/CommunicationsWorkspace';
const mock=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'student',tenantId:'centre',roles:['student']}})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:any)=><main>{children}</main>}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:vi.fn()},storage:{from:vi.fn()}}}));
vi.mock('@/lib/db',()=>({db:{rpc:mock.rpc,from:(table:string)=>{
 const data=table==='uni_mailboxes'?[{id:'box',address:'student@unipathway.pk',enabled:false,provider:'imap'}]:[];
 const q:any={select:()=>q,eq:()=>q,in:()=>q,range:async()=>({data,error:null}),is:()=>q,order:()=>q,limit:()=>q,single:async()=>({data:{thread_id:'thread'}}),maybeSingle:async()=>({data:null,error:null}),then:(resolve:any)=>Promise.resolve({data,error:null}).then(resolve)};return q;
}}}));
describe('institutional communications',()=>{
 it('saves a draft through the authorised RPC, without sending from the browser',async()=>{
  mock.rpc.mockImplementation(async(name:string)=>({data:name==='uni_mail_member_directory'?[{mailbox_id:'box',user_id:'student',can_send:true,full_name:'Student'}]:'draft',error:null}));
  render(<MemoryRouter><CommunicationsWorkspace/></MemoryRouter>);
  await screen.findByText('student@unipathway.pk — connection disabled');
  fireEvent.change(screen.getByLabelText('From'),{target:{value:'box'}});
  fireEvent.change(screen.getByLabelText('Email recipients'),{target:{value:'admissions@unipathway.pk'}});
  fireEvent.change(screen.getByLabelText('Email subject'),{target:{value:'Timetable'}});
  fireEvent.change(screen.getByLabelText('Email body'),{target:{value:'Please confirm my class.'}});
  fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
  await waitFor(()=>expect(mock.rpc).toHaveBeenCalledWith('save_uni_mail_draft',expect.objectContaining({p_box:'box',p_body:'Please confirm my class.',p_to:['admissions@unipathway.pk']})));
  expect(mock.rpc).not.toHaveBeenCalledWith('queue_uni_mail',expect.anything());
  expect(screen.queryByText('Mailbox setup and access')).not.toBeInTheDocument();
 });
});
