import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import AccountOperations from '@/components/admin/AccountOperations';
const mock=vi.hoisted(()=>({invoke:vi.fn(),rows:[] as Record<string,unknown>[],fail:false,user:{id:'admin',tenantId:'centre',roles:['centre_director']}}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mock.invoke}}}));
vi.mock('@/lib/db',()=>({db:{from:()=>{let tenant='';const q={select:()=>q,eq:(_key:string,value:string)=>{tenant=value;return q;},order:()=>q,range:async(a:number,b:number)=>({data:mock.rows.filter(r=>r.tenant_id===tenant).slice(a,b+1),error:mock.fail?{message:'offline'}:null})};return q;}}}));
beforeEach(()=>{mock.invoke.mockReset();mock.rows=[];mock.fail=false;mock.user={id:'admin',tenantId:'centre',roles:['centre_director']};});afterEach(cleanup);
const mount=()=>render(<MemoryRouter><AccountOperations/></MemoryRouter>);
async function batch(){const file=new File(['csv'],'accounts.csv',{type:'text/csv'});Object.defineProperty(file,'text',{value:async()=> 'email,full_name,role\none@example.com,Person One,student\ntwo@example.com,Person Two,student\nthree@example.com,Person Three,student'});fireEvent.change(screen.getByLabelText('Account CSV'),{target:{files:[file]}});await screen.findByText('Person Three');}
const success={data:{success:true,status:'invited',emailSent:true},error:null};
it('pauses at failure and retries only unconfirmed rows',async()=>{
 mock.invoke.mockResolvedValueOnce(success).mockResolvedValueOnce({data:null,error:{context:new Response(JSON.stringify({error:'Provider limit reached. Wait before retrying.'}),{status:429})}}).mockResolvedValue(success);
 mount();await batch();fireEvent.click(screen.getByText('Process pending / retry failed rows'));
 await screen.findByText('Provider limit reached. Wait before retrying.');await screen.findByText(/Batch paused/);expect(mock.invoke).toHaveBeenCalledTimes(2);
 fireEvent.click(screen.getByText('Process pending / retry failed rows'));await screen.findByText(/Batch finished/);
 expect(mock.invoke.mock.calls.map(c=>c[1].body.email)).toEqual(['one@example.com','two@example.com','two@example.com','three@example.com']);expect(screen.getByText('3 confirmed · 0 skipped · 0 pending or needing review')).toBeInTheDocument();
});
it('stops after the current request when paused, then resumes pending rows',async()=>{
 let finish!:(v:unknown)=>void;mock.invoke.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;})).mockResolvedValue(success);
 mount();await batch();fireEvent.click(screen.getByText('Process pending / retry failed rows'));fireEvent.click(screen.getByText('Pause after current account'));
 await act(async()=>finish(success));await screen.findByText(/Batch paused/);expect(mock.invoke).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByText('Process pending / retry failed rows'));await screen.findByText(/Batch finished/);expect(mock.invoke).toHaveBeenCalledTimes(3);
});
it('does not continue a batch after the account or centre changes',async()=>{
 let finish!:(v:unknown)=>void;mock.invoke.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 const view=mount();await batch();fireEvent.click(screen.getByText('Process pending / retry failed rows'));
 mock.user={id:'different-admin',tenantId:'different-centre',roles:['centre_director']};view.rerender(<MemoryRouter><AccountOperations/></MemoryRouter>);
 await act(async()=>finish(success));expect(mock.invoke).toHaveBeenCalledTimes(1);expect(mock.invoke.mock.calls[0][1].body.tenantId).toBe('centre');expect(screen.queryByText('Person One')).toBeNull();
});
it('restores a saved request for review without automatically sending an invitation',async()=>{
 mock.fail=true;mock.rows=[{id:'request',tenant_id:'centre',email:'recover@example.com',full_name:'Recovery User',role:'student',status:'prepared',email_sent:false,created_at:'2026-01-01'}];
 mount();await screen.findByRole('alert');mock.fail=false;fireEvent.click(screen.getByText('Refresh account history'));
 fireEvent.click(await screen.findByText('Load recover@example.com for review'));expect(mock.invoke).not.toHaveBeenCalled();expect(screen.getByText('Recovery User',{selector:'td'})).toBeInTheDocument();
 mock.fail=true;fireEvent.click(screen.getByText('Refresh account history'));await screen.findByRole('alert');expect(within(screen.getByRole('region',{name:'Account request history'})).queryByText('Recovery User · recover@example.com')).toBeNull();
});
it('does not treat unknown provider outcomes as confirmed accounts',async()=>{
 mock.invoke.mockResolvedValue({data:{success:true,status:'queued'},error:null});mount();await batch();fireEvent.click(screen.getByText('Process pending / retry failed rows'));
 await screen.findByText(/server did not confirm/);expect(mock.invoke).toHaveBeenCalledTimes(1);expect(screen.getByText('0 confirmed · 0 skipped · 3 pending or needing review')).toBeInTheDocument();
});

it('skips reviewed rows without sending and leaves other rows available',async()=>{
 mock.invoke.mockResolvedValue(success);mount();await batch();expect(mock.invoke).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Skip two@example.com'));fireEvent.click(screen.getByText('Process pending / retry failed rows'));await screen.findByText(/Batch finished/);
 expect(mock.invoke.mock.calls.map(c=>c[1].body.email)).toEqual(['one@example.com','three@example.com']);expect(screen.getByText('2 confirmed · 1 skipped · 0 pending or needing review')).toBeInTheDocument();
});
